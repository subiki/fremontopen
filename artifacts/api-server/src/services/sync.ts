import { db } from "@workspace/db";
import {
  tournamentsTable,
  matchesTable,
  playersTable,
  syncMetaTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  fetchTournaments,
  fetchTournamentDetail,
  resetSyncCallCounter,
  getSyncCallCount,
  MONTHLY_CALL_LIMIT,
} from "./challonge";
import { logger } from "../lib/logger";

const BUDGET_META_KEY = () => {
  const now = new Date();
  return `api_budget_${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
};

async function getMonthlyUsage(): Promise<number> {
  const [row] = await db
    .select()
    .from(syncMetaTable)
    .where(eq(syncMetaTable.key, BUDGET_META_KEY()));
  if (!row) return 0;
  const v = row.value as { calls_used?: number };
  return v.calls_used ?? 0;
}

async function incrementMonthlyUsage(callsMade: number): Promise<number> {
  const key = BUDGET_META_KEY();
  const current = await getMonthlyUsage();
  const newTotal = current + callsMade;
  await db
    .insert(syncMetaTable)
    .values({ key, value: { calls_used: newTotal } })
    .onConflictDoUpdate({
      target: syncMetaTable.key,
      set: { value: { calls_used: newTotal }, updatedAt: new Date() },
    });
  return newTotal;
}

export interface SyncResult {
  status: string;
  last_synced_at: string;
  tournaments_synced: number;
  matches_synced: number;
  players_rebuilt: number;
  api_calls_used: number;
  api_calls_remaining: number;
  errors: string[];
}

export async function syncFromChallonge(opts: {
  force?: boolean;
  tournamentId?: number | null;
}): Promise<SyncResult> {
  const errors: string[] = [];
  let tournamentsSynced = 0;
  let matchesSynced = 0;

  resetSyncCallCounter();

  const currentUsage = await getMonthlyUsage();
  const remaining = MONTHLY_CALL_LIMIT - currentUsage;

  // Each sync needs at minimum: 1 list call (unless single-tournament) + 1 detail call per changed tournament.
  // Conservatively require at least 2 calls of headroom before starting.
  if (remaining < 2) {
    throw new Error(
      `Monthly Challonge API budget exhausted (${currentUsage}/${MONTHLY_CALL_LIMIT} calls used). Budget resets on the 1st of next month.`
    );
  }

  // For a single-tournament sync we skip the list call and go straight to detail.
  let tournaments: Array<{ id: number; name: string; game_name: string | null; state: string; started_at: string | null; updated_at: string }> = [];

  if (opts.tournamentId) {
    // Optimised path: 0 list call, 1 detail call per tournament
    // We still need to check if it changed, so fetch detail directly.
    // Skip any list call entirely.
    tournaments = [{ id: opts.tournamentId, name: "", game_name: null, state: "", started_at: null, updated_at: "" }];
  } else {
    // 1 API call for the list
    if (remaining < 2) {
      throw new Error(`Not enough API budget to list tournaments (${remaining} calls left).`);
    }
    const fetched = await fetchTournaments();
    tournaments = fetched;
  }

  for (const t of tournaments) {
    // Check if we have budget for a detail call
    const callsUsedSoFar = getSyncCallCount();
    const remainingNow = remaining - callsUsedSoFar;
    if (remainingNow < 1) {
      errors.push(`Budget limit reached mid-sync — stopped before tournament ${t.id}`);
      break;
    }

    try {
      let shouldSync = opts.force ?? false;

      if (!opts.tournamentId) {
        // For list-based sync, compare updated_at to skip unchanged
        const existing = await db
          .select({ updatedAt: tournamentsTable.updatedAtChallonge })
          .from(tournamentsTable)
          .where(eq(tournamentsTable.id, t.id));

        const alreadyCurrent =
          !opts.force &&
          existing.length > 0 &&
          existing[0]!.updatedAt === t.updated_at;

        if (alreadyCurrent) {
          logger.info({ tournamentId: t.id }, "Tournament unchanged, skipping");
          continue;
        }
        shouldSync = true;
      } else {
        shouldSync = true;
      }

      if (!shouldSync) continue;

      // 1 API call: detail with participants + matches bundled
      const { tournament: detail, participants, matches } = await fetchTournamentDetail(t.id);

      await db
        .insert(tournamentsTable)
        .values({
          id: detail.id,
          name: detail.name,
          game: detail.game_name ?? null,
          state: detail.state,
          startedAt: detail.started_at ?? null,
          updatedAtChallonge: detail.updated_at,
        })
        .onConflictDoUpdate({
          target: tournamentsTable.id,
          set: {
            name: detail.name,
            game: detail.game_name ?? null,
            state: detail.state,
            startedAt: detail.started_at ?? null,
            updatedAtChallonge: detail.updated_at,
          },
        });

      const participantMap = new Map<number, string>();
      for (const p of participants) {
        participantMap.set(p.id, p.display_name || p.name);
      }

      for (const m of matches) {
        const winnerName = m.winner_id
          ? (participantMap.get(m.winner_id) ?? null)
          : null;
        const loserName = m.loser_id
          ? (participantMap.get(m.loser_id) ?? null)
          : null;

        await db
          .insert(matchesTable)
          .values({
            id: `${detail.id}-${m.id}`,
            tournamentId: detail.id,
            tournamentName: detail.name,
            round: m.round,
            state: m.state,
            scores: m.scores_csv || null,
            winnerId: m.winner_id ?? null,
            loserId: m.loser_id ?? null,
            winnerName,
            loserName,
            completedAt: m.completed_at ?? null,
          })
          .onConflictDoUpdate({
            target: matchesTable.id,
            set: {
              state: m.state,
              scores: m.scores_csv || null,
              winnerId: m.winner_id ?? null,
              loserId: m.loser_id ?? null,
              winnerName,
              loserName,
              completedAt: m.completed_at ?? null,
            },
          });

        matchesSynced++;
      }

      tournamentsSynced++;
      logger.info(
        { tournamentId: detail.id, matches: matches.length },
        "Tournament synced"
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err, tournamentId: t.id }, "Failed to sync tournament");
      errors.push(`Tournament ${t.id}: ${msg}`);
    }
  }

  const playersRebuilt = await rebuildPlayerStats();

  const callsMade = getSyncCallCount();
  const newMonthlyTotal = await incrementMonthlyUsage(callsMade);
  const callsRemaining = Math.max(0, MONTHLY_CALL_LIMIT - newMonthlyTotal);

  const now = new Date().toISOString();
  await db
    .insert(syncMetaTable)
    .values({
      key: "last_sync",
      value: {
        synced_at: now,
        tournaments_synced: tournamentsSynced,
        matches_synced: matchesSynced,
        players_rebuilt: playersRebuilt,
        api_calls_used: callsMade,
        api_calls_remaining: callsRemaining,
        errors,
      },
    })
    .onConflictDoUpdate({
      target: syncMetaTable.key,
      set: {
        value: {
          synced_at: now,
          tournaments_synced: tournamentsSynced,
          matches_synced: matchesSynced,
          players_rebuilt: playersRebuilt,
          api_calls_used: callsMade,
          api_calls_remaining: callsRemaining,
          errors,
        },
        updatedAt: new Date(),
      },
    });

  logger.info(
    { callsMade, newMonthlyTotal, callsRemaining },
    "Sync complete"
  );

  return {
    status: errors.length === 0 ? "ok" : "partial",
    last_synced_at: now,
    tournaments_synced: tournamentsSynced,
    matches_synced: matchesSynced,
    players_rebuilt: playersRebuilt,
    api_calls_used: callsMade,
    api_calls_remaining: callsRemaining,
    errors,
  };
}

async function rebuildPlayerStats(): Promise<number> {
  const allMatches = await db.select().from(matchesTable);

  const stats = new Map<
    string,
    { name: string; wins: number; losses: number }
  >();

  for (const m of allMatches) {
    if (m.winnerName) {
      const key = m.winnerName.toLowerCase();
      const entry = stats.get(key) ?? {
        name: m.winnerName,
        wins: 0,
        losses: 0,
      };
      entry.wins++;
      stats.set(key, entry);
    }
    if (m.loserName) {
      const key = m.loserName.toLowerCase();
      const entry = stats.get(key) ?? {
        name: m.loserName,
        wins: 0,
        losses: 0,
      };
      entry.losses++;
      stats.set(key, entry);
    }
  }

  let rebuilt = 0;
  for (const [key, s] of stats) {
    const total = s.wins + s.losses;
    const winRate = total > 0 ? s.wins / total : 0;
    const playerId = key.replace(/\s+/g, "-");

    const existing = await db
      .select({ fargo: playersTable.fargo })
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    const fargo = existing[0]?.fargo ?? null;

    await db
      .insert(playersTable)
      .values({
        id: playerId,
        name: s.name,
        wins: s.wins,
        losses: s.losses,
        winRate,
        fargo,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: playersTable.id,
        set: {
          wins: s.wins,
          losses: s.losses,
          winRate,
          updatedAt: new Date(),
        },
      });

    rebuilt++;
  }

  return rebuilt;
}

export async function getSyncStatus(): Promise<{
  status: string;
  last_synced_at: string | null;
  tournaments_synced: number | null;
  matches_synced: number | null;
  players_rebuilt: number | null;
  api_calls_month_used: number;
  api_calls_month_remaining: number;
}> {
  const [lastSync] = await db
    .select()
    .from(syncMetaTable)
    .where(eq(syncMetaTable.key, "last_sync"));

  const monthlyUsed = await getMonthlyUsage();
  const monthlyRemaining = Math.max(0, MONTHLY_CALL_LIMIT - monthlyUsed);

  if (!lastSync) {
    return {
      status: "never",
      last_synced_at: null,
      tournaments_synced: null,
      matches_synced: null,
      players_rebuilt: null,
      api_calls_month_used: monthlyUsed,
      api_calls_month_remaining: monthlyRemaining,
    };
  }

  const v = lastSync.value as {
    synced_at?: string;
    tournaments_synced?: number;
    matches_synced?: number;
    players_rebuilt?: number;
    errors?: string[];
  };

  return {
    status: (v.errors?.length ?? 0) > 0 ? "partial" : "ok",
    last_synced_at: v.synced_at ?? null,
    tournaments_synced: v.tournaments_synced ?? null,
    matches_synced: v.matches_synced ?? null,
    players_rebuilt: v.players_rebuilt ?? null,
    api_calls_month_used: monthlyUsed,
    api_calls_month_remaining: monthlyRemaining,
  };
}

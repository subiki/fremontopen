import { db } from "@workspace/db";
import {
  tournamentsTable,
  matchesTable,
  playersTable,
  syncMetaTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  fetchTournaments,
  fetchTournamentDetail,
  type ChallongeParticipant,
  type ChallongeMatch,
} from "./challonge";
import { logger } from "../lib/logger";

export interface SyncResult {
  status: string;
  last_synced_at: string;
  tournaments_synced: number;
  matches_synced: number;
  players_rebuilt: number;
  errors: string[];
}

export async function syncFromChallonge(opts: {
  force?: boolean;
  tournamentId?: number | null;
}): Promise<SyncResult> {
  const errors: string[] = [];
  let tournamentsSynced = 0;
  let matchesSynced = 0;

  const tournaments = opts.tournamentId
    ? await fetchTournaments().then((ts) =>
        ts.filter((t) => t.id === opts.tournamentId)
      )
    : await fetchTournaments();

  for (const t of tournaments) {
    try {
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

      await db
        .insert(tournamentsTable)
        .values({
          id: t.id,
          name: t.name,
          game: t.game_name ?? null,
          state: t.state,
          startedAt: t.started_at ?? null,
          updatedAtChallonge: t.updated_at,
        })
        .onConflictDoUpdate({
          target: tournamentsTable.id,
          set: {
            name: t.name,
            game: t.game_name ?? null,
            state: t.state,
            startedAt: t.started_at ?? null,
            updatedAtChallonge: t.updated_at,
          },
        });

      const { participants, matches } = await fetchTournamentDetail(t.id);

      const participantMap = new Map<number, string>();
      for (const p of participants) {
        participantMap.set(p.id, p.display_name || p.name);
      }

      for (const m of matches) {
        const winnerName = m.winner_id ? (participantMap.get(m.winner_id) ?? null) : null;
        const loserName = m.loser_id ? (participantMap.get(m.loser_id) ?? null) : null;

        await db
          .insert(matchesTable)
          .values({
            id: `${t.id}-${m.id}`,
            tournamentId: t.id,
            tournamentName: t.name,
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
        { tournamentId: t.id, matches: matches.length },
        "Tournament synced"
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err, tournamentId: t.id }, "Failed to sync tournament");
      errors.push(`Tournament ${t.id}: ${msg}`);
    }
  }

  const playersRebuilt = await rebuildPlayerStats();

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
          errors,
        },
        updatedAt: new Date(),
      },
    });

  return {
    status: errors.length === 0 ? "ok" : "partial",
    last_synced_at: now,
    tournaments_synced: tournamentsSynced,
    matches_synced: matchesSynced,
    players_rebuilt: playersRebuilt,
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
      const entry = stats.get(key) ?? { name: m.winnerName, wins: 0, losses: 0 };
      entry.wins++;
      stats.set(key, entry);
    }
    if (m.loserName) {
      const key = m.loserName.toLowerCase();
      const entry = stats.get(key) ?? { name: m.loserName, wins: 0, losses: 0 };
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
}> {
  const [row] = await db
    .select()
    .from(syncMetaTable)
    .where(eq(syncMetaTable.key, "last_sync"));

  if (!row) {
    return {
      status: "never",
      last_synced_at: null,
      tournaments_synced: null,
      matches_synced: null,
      players_rebuilt: null,
    };
  }

  const v = row.value as {
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
  };
}

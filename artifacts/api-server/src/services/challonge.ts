const BASE = "https://api.challonge.com/v1";

export const MONTHLY_CALL_LIMIT = 500;

function apiKey(): string {
  const key = process.env["CHALLONGE_API_KEY"];
  if (!key) throw new Error("CHALLONGE_API_KEY is not set");
  return key;
}

let _callsThisSync = 0;

export function resetSyncCallCounter() {
  _callsThisSync = 0;
}

export function getSyncCallCount() {
  return _callsThisSync;
}

async function challongeGet<T>(path: string): Promise<T> {
  _callsThisSync++;
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}api_key=${apiKey()}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Challonge API ${path} → HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface ChallongeTournament {
  id: number;
  name: string;
  game_name: string | null;
  state: string;
  started_at: string | null;
  updated_at: string;
  url: string;
  subdomain: string | null;
}

export interface ChallongeParticipant {
  id: number;
  name: string;
  display_name: string;
}

export interface ChallongeMatch {
  id: number;
  tournament_id: number;
  state: string;
  round: number;
  scores_csv: string;
  winner_id: number | null;
  loser_id: number | null;
  player1_id: number | null;
  player2_id: number | null;
  completed_at: string | null;
  updated_at: string;
}

interface TournamentDetailWrapper {
  tournament: ChallongeTournament & {
    participants?: Array<{ participant: ChallongeParticipant }>;
    matches?: Array<{ match: ChallongeMatch }>;
  };
}

export async function fetchTournaments(): Promise<ChallongeTournament[]> {
  const raw = await challongeGet<Array<{ tournament: ChallongeTournament }>>(
    "/tournaments.json"
  );
  return raw.map((r) => r.tournament);
}

export async function fetchTournamentDetail(id: number): Promise<{
  tournament: ChallongeTournament;
  participants: ChallongeParticipant[];
  matches: ChallongeMatch[];
}> {
  const raw = await challongeGet<TournamentDetailWrapper>(
    `/tournaments/${id}.json?include_participants=1&include_matches=1`
  );
  const t = raw.tournament;
  const participants = (t.participants ?? []).map(
    (p: { participant: ChallongeParticipant }) => p.participant
  );
  const matches = (t.matches ?? []).map(
    (m: { match: ChallongeMatch }) => m.match
  );
  return { tournament: t, participants, matches };
}

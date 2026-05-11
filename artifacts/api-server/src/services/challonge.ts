const BASE = "https://api.challonge.com/v1";

function apiKey(): string {
  const key = process.env["CHALLONGE_API_KEY"];
  if (!key) throw new Error("CHALLONGE_API_KEY is not set");
  return key;
}

async function challongeGet<T>(path: string): Promise<T> {
  const url = `${BASE}${path}?api_key=${apiKey()}`;
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

interface TournamentWrapper {
  tournament: ChallongeTournament & {
    participants?: Array<{ participant: ChallongeParticipant }>;
    matches?: Array<{ match: ChallongeMatch }>;
  };
}

interface ParticipantWrapper {
  participant: ChallongeParticipant;
}

interface MatchWrapper {
  match: ChallongeMatch;
}

export async function fetchTournaments(): Promise<ChallongeTournament[]> {
  const raw = await challongeGet<Array<{ tournament: ChallongeTournament }>>("/tournaments.json");
  return raw.map((r) => r.tournament);
}

export async function fetchTournamentDetail(
  id: number
): Promise<{
  tournament: ChallongeTournament;
  participants: ChallongeParticipant[];
  matches: ChallongeMatch[];
}> {
  const raw = await challongeGet<TournamentWrapper>(
    `/tournaments/${id}.json?include_participants=1&include_matches=1`
  );
  const t = raw.tournament;
  const participants = (t.participants ?? []).map((p: { participant: ChallongeParticipant }) => p.participant);
  const matches = (t.matches ?? []).map((m: { match: ChallongeMatch }) => m.match);
  return { tournament: t, participants, matches };
}

export async function fetchParticipants(
  tournamentId: number
): Promise<ChallongeParticipant[]> {
  const raw = await challongeGet<ParticipantWrapper[]>(
    `/tournaments/${tournamentId}/participants.json`
  );
  return raw.map((r) => r.participant);
}

export async function fetchMatches(
  tournamentId: number
): Promise<ChallongeMatch[]> {
  const raw = await challongeGet<MatchWrapper[]>(
    `/tournaments/${tournamentId}/matches.json`
  );
  return raw.map((r) => r.match);
}

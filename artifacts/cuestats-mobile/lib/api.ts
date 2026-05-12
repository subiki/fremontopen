/**
 * API client for the CueStats backend.
 *
 * URL resolution order (matches REACT_APP_BACKEND_URL convention from web app):
 *   1. EXPO_PUBLIC_BACKEND_URL  — explicit full base URL, e.g. https://fremontopen.com
 *   2. EXPO_PUBLIC_DOMAIN       — Replit dev domain (added https:// prefix automatically)
 *   3. Relative "/api"          — Replit shared proxy fallback (dev only)
 *
 * For production / VPS: set EXPO_PUBLIC_BACKEND_URL=https://fremontopen.com in eas.json
 * or your CI environment.  The "/api" prefix is appended here so the env var matches
 * the bare-domain value used by REACT_APP_BACKEND_URL on the web side.
 */
const getBaseUrl = (): string => {
  const explicit = process.env["EXPO_PUBLIC_BACKEND_URL"];
  if (explicit) {
    return explicit.replace(/\/$/, "") + "/api";
  }
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  if (domain) {
    return `https://${domain}/api`;
  }
  return "/api";
};

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }
  return res.json() as Promise<T>;
}

export function getStreamUrl(path: string): string {
  return `${getBaseUrl()}${path}`;
}

export interface Player {
  id: string;
  name: string;
  wins: number;
  losses: number;
  win_rate: number;
  fargo?: number | null;
}

export interface Match {
  id: string;
  tournament_id: number;
  tournament_name?: string | null;
  round?: number | null;
  state?: string | null;
  scores?: string | null;
  winner_name?: string | null;
  loser_name?: string | null;
  completed_at?: string | null;
}

export interface Stats {
  total_tournaments: number;
  total_matches: number;
  total_players: number;
  last_synced_at?: string | null;
  players: Player[];
  recent_matches: Match[];
}

export interface H2HRecord {
  opponent: string;
  wins: number;
  losses: number;
}

export interface PlayerDetail {
  player: Player;
  matches: Match[];
  head_to_head: H2HRecord[];
}

export interface Conversation {
  id: number;
  title: string;
  created_at?: string;
}

export interface ChatMessage {
  id?: number;
  conversation_id?: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

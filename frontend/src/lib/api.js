import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const STATIC_DATA = process.env.REACT_APP_STATIC_DATA === "true";
export const API = STATIC_DATA ? "" : `${BACKEND_URL}/api`;

let cachePromise = null;

const loadCache = () => {
  if (!cachePromise) {
    const base = process.env.PUBLIC_URL || "";
    cachePromise = fetch(`${base}/data/cache.json`, { cache: "no-cache" }).then((response) => {
      if (!response.ok) throw new Error("Static data cache is missing");
      return response.json();
    });
  }
  return cachePromise;
};

const notFound = (detail = "Not found") => {
  const error = new Error(detail);
  error.response = { status: 404, data: { detail } };
  throw error;
};

const decodePathPart = (value = "") => decodeURIComponent(value.replace(/\+/g, "%20"));

const comparePlayers = (cache, a, b) => {
  const pa = cache.players.find((p) => p.name === a);
  const pb = cache.players.find((p) => p.name === b);
  if (!pa || !pb) notFound("One or both players not found");

  const h2hMatches = cache.matches
    .filter(
      (m) =>
        (m.winner_name === a && m.loser_name === b) ||
        (m.winner_name === b && m.loser_name === a)
    )
    .reverse();
  const aWins = h2hMatches.filter((m) => m.winner_name === a).length;
  const bWins = h2hMatches.filter((m) => m.winner_name === b).length;

  const opponentRecord = (name) => {
    const record = {};
    (cache.player_details[name]?.matches || []).forEach((match) => {
      const opponent = match.winner_name === name ? match.loser_name : match.winner_name;
      if (!opponent) return;
      record[opponent] ||= { w: 0, l: 0 };
      if (match.winner_name === name) record[opponent].w += 1;
      else record[opponent].l += 1;
    });
    return record;
  };

  const recA = opponentRecord(a);
  const recB = opponentRecord(b);
  const common = Object.keys(recA)
    .filter((opponent) => opponent !== a && opponent !== b && recB[opponent])
    .sort();

  return {
    a: pa,
    b: pb,
    h2h: { a_wins: aWins, b_wins: bWins, matches: h2hMatches },
    common_opponents: common.map((opponent) => ({
      opponent,
      a: recA[opponent],
      b: recB[opponent],
    })),
  };
};

const staticGet = async (path, config = {}) => {
  const cache = await loadCache();
  const params = config.params || {};

  if (path === "/sync/status") return { data: cache.sync_status };
  if (path === "/stats") return { data: cache.stats };
  if (path === "/tournaments") return { data: cache.tournaments };
  if (path.startsWith("/tournaments/")) {
    const id = decodePathPart(path.split("/")[2]);
    return { data: cache.tournament_details[id] || notFound("Tournament not found") };
  }
  if (path === "/players") {
    const q = (params.q || "").toLowerCase();
    const players = q
      ? cache.players.filter((p) => p.name.toLowerCase().includes(q))
      : cache.players;
    return { data: players };
  }
  if (path.startsWith("/players/") && path.endsWith("/extras")) {
    const name = decodePathPart(path.slice("/players/".length, -"/extras".length));
    return { data: cache.player_extras[name] || notFound("Player not found") };
  }
  if (path.startsWith("/players/") && path.endsWith("/claim-info")) {
    return { data: { claimed: false } };
  }
  if (path.startsWith("/players/")) {
    const name = decodePathPart(path.slice("/players/".length));
    return { data: cache.player_details[name] || notFound("Player not found") };
  }
  if (path === "/leaderboard") {
    return { data: cache.players.slice(0, params.limit || 25) };
  }
  if (path === "/search") {
    const q = (params.q || "").trim().toLowerCase();
    const limit = params.limit || 10;
    if (!q) return { data: { players: [], tournaments: [] } };
    return {
      data: {
        players: cache.players
          .filter((p) => p.name.toLowerCase().includes(q))
          .slice(0, limit)
          .map(({ name, wins, losses, fargo }) => ({ name, wins, losses, fargo })),
        tournaments: cache.tournaments
          .filter((t) => (t.name || "").toLowerCase().includes(q))
          .slice(0, limit)
          .map(({ id, name, game, state }) => ({ id, name, game, state })),
      },
    };
  }
  if (path.startsWith("/compare/")) {
    const [, , a, b] = path.split("/");
    return { data: comparePlayers(cache, decodePathPart(a), decodePathPart(b)) };
  }
  notFound();
};

const staticMutation = async () => {
  throw new Error("This static demo build does not support writes");
};

export const api = STATIC_DATA
  ? { get: staticGet, post: staticMutation, put: staticMutation, delete: staticMutation }
  : axios.create({ baseURL: API });

export const fetchStats = () => api.get("/stats").then((r) => r.data);
export const fetchTournaments = () => api.get("/tournaments").then((r) => r.data);
export const fetchTournament = (id) => api.get(`/tournaments/${id}`).then((r) => r.data);
export const fetchPlayers = (q = "") =>
  api.get("/players", { params: q ? { q } : {} }).then((r) => r.data);
export const fetchPlayer = (name) =>
  api.get(`/players/${encodeURIComponent(name)}`).then((r) => r.data);
export const fetchLeaderboard = (limit = 25) =>
  api.get("/leaderboard", { params: { limit } }).then((r) => r.data);
export const fetchSyncStatus = () => api.get("/sync/status").then((r) => r.data);
export const sendChat = (session_id, message) =>
  api.post("/chat", { session_id, message }).then((r) => r.data);
export const fetchChatHistory = (session_id) =>
  api.get(`/chat/history/${session_id}`).then((r) => r.data);

import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const STATIC_DATA = process.env.REACT_APP_STATIC_DATA === "true";
export const API = STATIC_DATA ? "" : `${BACKEND_URL}/api`;

let cachePromise = null;
const filePromises = new Map();

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

const loadDataFile = (path) => {
  if (!path) return Promise.resolve(null);
  if (!filePromises.has(path)) {
    const base = process.env.PUBLIC_URL || "";
    filePromises.set(
      path,
      fetch(`${base}/${path}`, { cache: "no-cache" }).then((response) => {
        if (!response.ok) throw new Error(`Static data file is missing: ${path}`);
        return response.json();
      })
    );
  }
  return filePromises.get(path);
};

const notFound = (detail = "Not found") => {
  const error = new Error(detail);
  error.response = { status: 404, data: { detail } };
  throw error;
};

const decodePathPart = (value = "") => decodeURIComponent(value.replace(/\+/g, "%20"));
const nameKey = (value = "") => String(value).trim().toLocaleLowerCase();

const resolvePlayerName = (cache, name) => {
  const key = nameKey(name);
  if (cache.player_details?.[name] || cache.data_files?.players?.[name]) return name;
  return cache.players.find((player) => nameKey(player.name) === key)?.name || null;
};

const expectedElo = (ratingA = 1500, ratingB = 1500) =>
  1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

const compareOdds = (pa, pb) => {
  const ratingA = pa.elo_rating || 1500;
  const ratingB = pb.elo_rating || 1500;
  const aOdds = expectedElo(ratingA, ratingB);
  const aProbability = Math.round(aOdds * 1000) / 10;
  const bProbability = Math.round((1 - aOdds) * 1000) / 10;
  return {
    a_win_probability: aProbability,
    b_win_probability: bProbability,
    a_rating: ratingA,
    b_rating: ratingB,
    rating_gap: ratingA - ratingB,
    favorite: aProbability >= bProbability ? pa.name : pb.name,
    basis: "ELO",
  };
};

const parseRackScore = (score = "") => {
  const numbers = String(score).match(/\d+/g)?.map(Number).filter((value) => Number.isFinite(value)) || [];
  if (numbers.length < 2) return null;
  const [left, right] = numbers;
  if (left === 0 && right === 0) return null;
  return {
    winner_racks: Math.max(left, right),
    loser_racks: Math.min(left, right),
  };
};

const loadTournamentDetail = async (cache, id) => {
  if (cache.tournament_details?.[id]) return cache.tournament_details[id];
  const file = cache.data_files?.tournaments?.[id];
  return (file && await loadDataFile(file)) || null;
};

const loadPlayerBundle = async (cache, name) => {
  const canonicalName = resolvePlayerName(cache, name);
  if (!canonicalName) return null;
  if (cache.player_details?.[canonicalName] || cache.player_extras?.[canonicalName]) {
    return {
      detail: cache.player_details?.[canonicalName],
      extras: cache.player_extras?.[canonicalName],
    };
  }
  const file = cache.data_files?.players?.[canonicalName];
  return file ? loadDataFile(file) : null;
};

const comparePlayers = async (cache, a, b) => {
  const canonicalA = resolvePlayerName(cache, a);
  const canonicalB = resolvePlayerName(cache, b);
  const pa = canonicalA ? cache.players.find((p) => p.name === canonicalA) : null;
  const pb = canonicalB ? cache.players.find((p) => p.name === canonicalB) : null;
  if (!pa || !pb) notFound("One or both players not found");
  const [bundleA, bundleB] = await Promise.all([
    loadPlayerBundle(cache, canonicalA),
    loadPlayerBundle(cache, canonicalB),
  ]);
  const detailA = bundleA?.detail;
  const detailB = bundleB?.detail;
  if (!detailA || !detailB) notFound("One or both players not found");

  const h2hMatches = (detailA.matches || [])
    .filter(
      (m) =>
        (m.winner_name === canonicalA && m.loser_name === canonicalB) ||
        (m.winner_name === canonicalB && m.loser_name === canonicalA)
    );
  const aWins = h2hMatches.filter((m) => m.winner_name === canonicalA).length;
  const bWins = h2hMatches.filter((m) => m.winner_name === canonicalB).length;
  const rackStats = h2hMatches.reduce(
    (acc, match) => {
      const parsed = parseRackScore(match.scores);
      if (!parsed) return acc;
      acc.scored_races += 1;
      if (match.winner_name === canonicalA) {
        acc.a_racks_won += parsed.winner_racks;
        acc.a_racks_lost += parsed.loser_racks;
        acc.b_racks_won += parsed.loser_racks;
        acc.b_racks_lost += parsed.winner_racks;
      } else {
        acc.b_racks_won += parsed.winner_racks;
        acc.b_racks_lost += parsed.loser_racks;
        acc.a_racks_won += parsed.loser_racks;
        acc.a_racks_lost += parsed.winner_racks;
      }
      return acc;
    },
    { scored_races: 0, a_racks_won: 0, a_racks_lost: 0, b_racks_won: 0, b_racks_lost: 0 }
  );
  const odds = compareOdds(pa, pb);

  const opponentRecord = (name, detail) => {
    const record = {};
    (detail?.matches || []).forEach((match) => {
      const opponent = match.winner_name === name ? match.loser_name : match.winner_name;
      if (!opponent) return;
      record[opponent] ||= { w: 0, l: 0 };
      if (match.winner_name === name) record[opponent].w += 1;
      else record[opponent].l += 1;
    });
    return record;
  };

  const recA = opponentRecord(canonicalA, detailA);
  const recB = opponentRecord(canonicalB, detailB);
  const common = Object.keys(recA)
    .filter((opponent) => opponent !== canonicalA && opponent !== canonicalB && recB[opponent])
    .sort();

  return {
    a: pa,
    b: pb,
    h2h: { a_wins: aWins, b_wins: bWins, matches: h2hMatches, odds },
    race_stats: {
      races_played: h2hMatches.length,
      scored_races: rackStats.scored_races,
      a_race_wins: aWins,
      b_race_wins: bWins,
      a_racks_won: rackStats.a_racks_won,
      a_racks_lost: rackStats.a_racks_lost,
      b_racks_won: rackStats.b_racks_won,
      b_racks_lost: rackStats.b_racks_lost,
      elo_odds: odds,
    },
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
    return { data: (await loadTournamentDetail(cache, id)) || notFound("Tournament not found") };
  }
  if (path === "/players") {
    const q = (params.q || "").toLowerCase();
    const players = q
      ? cache.players.filter((p) =>
          p.name.toLowerCase().includes(q)
          || (p.nickname || "").toLowerCase().includes(q)
        )
      : cache.players;
    return { data: players };
  }
  if (path.startsWith("/players/") && path.endsWith("/extras")) {
    const name = decodePathPart(path.slice("/players/".length, -"/extras".length));
    const bundle = await loadPlayerBundle(cache, name);
    return { data: bundle?.extras || notFound("Player not found") };
  }
  if (path.startsWith("/players/") && path.endsWith("/claim-info")) {
    return { data: { claimed: false } };
  }
  if (path.startsWith("/players/")) {
    const name = decodePathPart(path.slice("/players/".length));
    const bundle = await loadPlayerBundle(cache, name);
    return { data: bundle?.detail || notFound("Player not found") };
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
          .filter((p) =>
            p.name.toLowerCase().includes(q)
            || (p.nickname || "").toLowerCase().includes(q)
          )
          .slice(0, limit)
          .map(({ name, nickname, wins, losses, fargo }) => ({ name, nickname, wins, losses, fargo })),
        tournaments: cache.tournaments
          .filter((t) => (t.name || "").toLowerCase().includes(q))
          .slice(0, limit)
          .map(({ id, name, game, state }) => ({ id, name, game, state })),
      },
    };
  }
  if (path.startsWith("/compare/")) {
    const [, , a, b] = path.split("/");
    return { data: await comparePlayers(cache, decodePathPart(a), decodePathPart(b)) };
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

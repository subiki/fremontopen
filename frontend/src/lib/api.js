import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

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

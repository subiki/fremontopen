// Auth state management — token in localStorage, axios interceptor
import axios from "axios";
import { api } from "./api";

const KEY = "cuestats_admin_token";

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => {
  if (t) localStorage.setItem(KEY, t);
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("cuestats:auth-changed"));
};
export const isLoggedIn = () => !!getToken();

// Attach Bearer header to every request
api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

// 401 → clear token
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) setToken(null);
    return Promise.reject(err);
  }
);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const login = async (email, password) => {
  const { data } = await axios.post(`${API}/auth/login`, { email, password });
  setToken(data.token);
  return data;
};

export const logout = () => setToken(null);

export const verifyToken = async () => {
  if (!getToken()) return null;
  try {
    const { data } = await api.get("/auth/me");
    return data;
  } catch {
    setToken(null);
    return null;
  }
};

export const onAuthChange = (cb) => {
  const handler = () => cb(isLoggedIn());
  window.addEventListener("cuestats:auth-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("cuestats:auth-changed", handler);
    window.removeEventListener("storage", handler);
  };
};

// admin endpoints
export const adminMergePlayers = (canonical_name, alias_names) =>
  api.post("/admin/players/merge", { canonical_name, alias_names }).then((r) => r.data);

export const adminRenamePlayer = (name, new_name) =>
  api.post(`/admin/players/rename/${encodeURIComponent(name)}`, { new_name }).then((r) => r.data);

export const adminUpdateMatch = (id, body) =>
  api.patch(`/admin/matches/${id}`, body).then((r) => r.data);

export const adminDeleteMatch = (id) =>
  api.delete(`/admin/matches/${id}`).then((r) => r.data);

export const adminTriggerSync = (force = false, tournament_id = null) =>
  api.post("/admin/sync", { force, tournament_id }).then((r) => r.data);

export const adminFetchAudit = (limit = 50) =>
  api.get("/admin/audit", { params: { limit } }).then((r) => r.data);

// formatter for API error detail (FastAPI 422 returns array of objects)
export const formatApiError = (detail) => {
  if (detail == null) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
};

// User SSO session (separate from admin auth). Token stored in localStorage.
import { api } from "./api";

const KEY = "cuestats_user_token";

export const getUserToken = () => localStorage.getItem(KEY);
export const setUserToken = (t) => {
  if (t) localStorage.setItem(KEY, t);
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("cuestats:user-auth-changed"));
};
export const isUserLoggedIn = () => !!getUserToken();

// Hook all api calls to send the user token if present and not an admin call.
// The existing admin auth.js interceptor sets Authorization to admin token if
// admin-logged-in. To avoid conflict, the admin interceptor wins for /admin
// routes. For user routes we attach the user token manually via api helpers.

const userAuthHeader = () => {
  const t = getUserToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export const startOauth = async (provider) => {
  const { data } = await api.get(`/auth/${provider}/start`);
  localStorage.setItem("cuestats_oauth_state", data.state);
  localStorage.setItem("cuestats_oauth_provider", provider);
  window.location.href = data.auth_url;
};

export const finishOauth = async (provider, code) => {
  const { data } = await api.post(`/auth/${provider}/callback`, null, {
    params: { code },
  });
  setUserToken(data.token);
  localStorage.removeItem("cuestats_oauth_state");
  localStorage.removeItem("cuestats_oauth_provider");
  return data.user;
};

export const fetchMe = async () => {
  const { data } = await api.get("/me", { headers: userAuthHeader() });
  return data;
};

export const claimPlayer = async (player_name) => {
  const { data } = await api.post("/me/claim", { player_name }, { headers: userAuthHeader() });
  return data;
};

export const unclaimPlayer = async () => {
  const { data } = await api.delete("/me/claim", { headers: userAuthHeader() });
  return data;
};

export const followPlayerApi = async (player_name) => {
  const { data } = await api.post("/me/follow", { player_name }, { headers: userAuthHeader() });
  return data.followed_players;
};

export const unfollowPlayerApi = async (player_name) => {
  const { data } = await api.delete(`/me/follow/${encodeURIComponent(player_name)}`, {
    headers: userAuthHeader(),
  });
  return data.followed_players;
};

export const fetchClaimInfo = async (player_name) => {
  const { data } = await api.get(`/players/${encodeURIComponent(player_name)}/claim-info`);
  return data; // { claimed: bool }
};

export const logoutUser = () => setUserToken(null);

export const onUserAuthChange = (cb) => {
  const handler = () => cb(isUserLoggedIn());
  window.addEventListener("cuestats:user-auth-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("cuestats:user-auth-changed", handler);
    window.removeEventListener("storage", handler);
  };
};

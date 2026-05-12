// Account-aware follow: uses backend when logged in, falls back to localStorage.
import {
  followPlayerApi,
  unfollowPlayerApi,
  fetchMe,
  isUserLoggedIn,
  onUserAuthChange,
} from "./user_auth";

const KEY = "cuestats_following";
const readLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
const writeLocal = (list) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("cuestats:following-changed"));
};

// Synchronous list (for initial render). When logged in, refreshed by useEffect on mount.
export const getFollowing = () => readLocal();
export const isFollowing = (name) => readLocal().includes(name);

export const toggleFollow = async (name) => {
  if (isUserLoggedIn()) {
    try {
      let newList;
      const cur = readLocal();
      if (cur.includes(name)) newList = await unfollowPlayerApi(name);
      else newList = await followPlayerApi(name);
      writeLocal(newList);
      return newList.includes(name);
    } catch (e) {
      // fall through to local
    }
  }
  const list = readLocal();
  const idx = list.indexOf(name);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(name);
  writeLocal(list);
  return list.includes(name);
};

// On login, pull the server-side list as the source of truth.
let _initialized = false;
export const initFollowSync = () => {
  if (_initialized) return;
  _initialized = true;
  const sync = async () => {
    if (!isUserLoggedIn()) return;
    try {
      const me = await fetchMe();
      writeLocal(me.followed_players || []);
    } catch {
      /* token invalid → ignore */
    }
  };
  sync();
  onUserAuthChange(() => sync());
};

export const onFollowingChange = (cb) => {
  const handler = () => cb(readLocal());
  window.addEventListener("cuestats:following-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("cuestats:following-changed", handler);
    window.removeEventListener("storage", handler);
  };
};

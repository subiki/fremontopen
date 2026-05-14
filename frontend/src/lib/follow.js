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

export const getFollowing = () => readLocal();
export const isFollowing = (name) => readLocal().includes(name);

export const toggleFollow = async (name) => {
  const list = readLocal();
  const idx = list.indexOf(name);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(name);
  writeLocal(list);
  return list.includes(name);
};

export const initFollowSync = () => {};

export const onFollowingChange = (cb) => {
  const handler = () => cb(readLocal());
  window.addEventListener("cuestats:following-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("cuestats:following-changed", handler);
    window.removeEventListener("storage", handler);
  };
};

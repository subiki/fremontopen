const KEY = "cuestats_theme";
const THEMES = new Set(["dark", "light"]);

export const getTheme = () => {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(KEY);
  return THEMES.has(saved) ? saved : "dark";
};

export const applyTheme = (theme) => {
  if (typeof document === "undefined") return theme;
  const next = THEMES.has(theme) ? theme : "dark";
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  return next;
};

export const setTheme = (theme) => {
  const next = applyTheme(theme);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, next);
    window.dispatchEvent(new CustomEvent("cuestats:theme-changed", { detail: next }));
  }
  return next;
};

export const toggleTheme = () => setTheme(getTheme() === "dark" ? "light" : "dark");

export const initTheme = () => applyTheme(getTheme());

export const onThemeChange = (handler) => {
  if (typeof window === "undefined") return () => {};
  const wrapped = (event) => handler(event.detail || getTheme());
  window.addEventListener("cuestats:theme-changed", wrapped);
  return () => window.removeEventListener("cuestats:theme-changed", wrapped);
};

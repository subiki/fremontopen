const KEY = "cuestats_theme";
export const THEME_ORDER = ["dark", "light", "weird", "classic"];
export const THEME_LABELS = {
  dark: "Dark",
  light: "Light",
  weird: "Weird",
  classic: "1993",
};

const THEMES = new Set(THEME_ORDER);

export const normalizeTheme = (theme) => (THEMES.has(theme) ? theme : "dark");

export const getTheme = () => {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(KEY);
  return normalizeTheme(saved);
};

export const getNextTheme = (theme = getTheme()) => {
  const current = normalizeTheme(theme);
  const index = THEME_ORDER.indexOf(current);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length];
};

export const applyTheme = (theme) => {
  if (typeof document === "undefined") return theme;
  const next = normalizeTheme(theme);
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next === "light" || next === "classic" ? "light" : "dark";
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

export const toggleTheme = () => setTheme(getNextTheme());

export const initTheme = () => applyTheme(getTheme());

export const onThemeChange = (handler) => {
  if (typeof window === "undefined") return () => {};
  const wrapped = (event) => handler(event.detail || getTheme());
  window.addEventListener("cuestats:theme-changed", wrapped);
  return () => window.removeEventListener("cuestats:theme-changed", wrapped);
};

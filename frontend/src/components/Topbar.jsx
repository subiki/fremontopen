import { useEffect, useState } from "react";
import { CheckCircle, DesktopTower, MagnifyingGlass, Moon, Sparkle, Sun, WarningCircle, X } from "@phosphor-icons/react";
import { fetchSyncStatus } from "../lib/api";
import { assessCacheFreshness, formatRelativeTime } from "../lib/cacheFreshness";
import { SearchBar } from "./SearchBar";
import { getNextTheme, getTheme, onThemeChange, THEME_LABELS, toggleTheme } from "../lib/theme";

const themeIcons = {
  dark: Moon,
  light: Sun,
  weird: Sparkle,
  classic: DesktopTower,
};

export const Topbar = ({ title, subtitle, actions }) => {
  const [status, setStatus] = useState(null);
  const [theme, setTheme] = useState(getTheme());
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const s = await fetchSyncStatus();
        if (alive) setStatus(s);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => onThemeChange(setTheme), []);

  const ok = status?.status === "ok";
  const err = status?.status === "error";
  const never = !status || status?.status === "never_synced";
  const freshness = assessCacheFreshness({
    generated_at: status?.generated_at,
    last_synced_at: status?.last_synced_at,
    sync_status: status?.status,
  });
  const nextTheme = getNextTheme(theme);
  const ThemeIcon = themeIcons[theme] || Moon;

  return (
    <header
      className="weird-portal-header sticky top-0 z-40"
      data-testid="app-topbar"
    >
      <div className="weird-portal-shell">
        <div className="weird-route-sigil" aria-hidden="true">
          <span />
          <strong>{String(title || "FO").slice(0, 2).toUpperCase()}</strong>
        </div>

        <div className="weird-portal-copy min-w-0">
          <div className="weird-portal-kicker">Fremont Open static signal</div>
          <h1 className="weird-title weird-portal-title">
            {title}
          </h1>
          {subtitle ? <p className="weird-portal-subtitle">{subtitle}</p> : null}
        </div>

        <div className="weird-portal-actions">
          <div className="weird-portal-search hidden lg:block">
            <SearchBar />
          </div>
          {actions}
          <button
            type="button"
            onClick={() => setMobileSearchOpen((value) => !value)}
            className="weird-icon-button lg:hidden"
            aria-label={mobileSearchOpen ? "Close search" : "Open search"}
            aria-expanded={mobileSearchOpen}
            aria-controls="mobile-search-panel"
            data-testid="mobile-search-toggle"
          >
            {mobileSearchOpen ? <X size={18} weight="duotone" /> : <MagnifyingGlass size={18} weight="duotone" />}
          </button>
          <button
            type="button"
            onClick={() => setTheme(toggleTheme())}
            className="weird-icon-button weird-theme-toggle"
            aria-label={`Switch to ${THEME_LABELS[nextTheme]} mode`}
            title={`Switch to ${THEME_LABELS[nextTheme]} mode`}
            data-testid="theme-toggle"
          >
            <ThemeIcon size={18} weight="duotone" />
            <span>{THEME_LABELS[theme]}</span>
          </button>
          <div
            className="weird-pill weird-sync-chip hidden sm:flex"
            data-testid="sync-status"
            title="The dataset is refreshed by a scheduled background job"
          >
            {err ? (
              <WarningCircle size={14} className="text-[#EF4444]" weight="fill" />
            ) : (
              <CheckCircle
                size={14}
                weight="fill"
                className={ok ? "text-[#10B981] pulse-dot" : "text-[#6B7280]"}
              />
            )}
            <span className="text-[#9CA3AF] font-mono">
              {err
                ? "stale data"
                : never
                ? "no data yet"
                : `data updated ${formatRelativeTime(status?.last_synced_at)}`}
            </span>
          </div>
          {freshness.tone === "aging" || freshness.tone === "stale" || freshness.tone === "error" ? (
            <div
              className={`hidden xl:flex items-center gap-2 px-3 py-2 rounded-md border text-xs ${
                freshness.tone === "stale" || freshness.tone === "error"
                  ? "bg-[#2A1313] border-[#7F1D1D] text-[#FCA5A5]"
                  : "bg-[#2A2112] border-[#7C5A14] text-[#FCD34D]"
              }`}
              title={freshness.detail}
            >
              <WarningCircle size={14} weight="fill" />
              <span className="font-mono">{freshness.label.toLowerCase()}</span>
            </div>
          ) : null}
        </div>
      </div>
      {mobileSearchOpen ? (
        <div
          id="mobile-search-panel"
          className="weird-mobile-search lg:hidden"
          data-testid="mobile-search-panel"
        >
          <SearchBar />
        </div>
      ) : null}
    </header>
  );
};

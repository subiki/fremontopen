import { useEffect, useState } from "react";
import { CheckCircle, Moon, Sun, WarningCircle } from "@phosphor-icons/react";
import { fetchSyncStatus } from "../lib/api";
import { assessCacheFreshness, formatRelativeTime } from "../lib/cacheFreshness";
import { SearchBar } from "./SearchBar";
import { getTheme, onThemeChange, toggleTheme } from "../lib/theme";

export const Topbar = ({ title, subtitle, actions }) => {
  const [status, setStatus] = useState(null);
  const [theme, setTheme] = useState(getTheme());

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

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl bg-[#0B0E14]/80 border-b border-[#273041]"
      data-testid="app-topbar"
    >
      <div className="px-6 sm:px-8 py-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-[Outfit] text-2xl sm:text-3xl font-semibold tracking-tight text-[#F3F4F6] truncate">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-[#9CA3AF] mt-1 truncate">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:block">
            <SearchBar />
          </div>
          {actions}
          <button
            type="button"
            onClick={() => setTheme(toggleTheme())}
            className="w-10 h-10 rounded-md border border-[#273041] bg-[#141923] text-[#9CA3AF] flex items-center justify-center hover:text-[#F3F4F6] hover:border-[#10B981]/50 transition-colors"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            data-testid="theme-toggle"
          >
            {theme === "dark" ? <Sun size={18} weight="duotone" /> : <Moon size={18} weight="duotone" />}
          </button>
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-md bg-[#141923] border border-[#273041] text-xs"
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
    </header>
  );
};

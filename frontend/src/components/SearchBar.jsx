import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, X, Trophy, User } from "@phosphor-icons/react";
import { api } from "../lib/api";

export const SearchBar = () => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState({ players: [], tournaments: [] });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setResults({ players: [], tournaments: [] });
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/search", { params: { q, limit: 8 } });
        setResults(data);
        setOpen(true);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const go = (path) => {
    setOpen(false);
    setQ("");
    nav(path);
  };

  const onKey = (e) => {
    if (e.key === "Escape") {
      setQ("");
      setOpen(false);
    }
    if (e.key === "Enter" && results.players[0]) {
      go(`/players/${encodeURIComponent(results.players[0].name)}`);
    }
  };

  const total = results.players.length + results.tournaments.length;

  return (
    <div ref={wrapRef} className="weird-search relative w-full max-w-sm" data-testid="search-bar">
      <label htmlFor="site-search" className="sr-only">
        Search players or tournaments
      </label>
      <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
      <input
        id="site-search"
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        onFocus={() => q && setOpen(true)}
        placeholder="Search players or tournaments..."
        data-testid="search-input"
        aria-label="Search players or tournaments"
        aria-expanded={open}
        aria-controls="search-results-panel"
        className="weird-input w-full bg-[#141923] border border-[#273041] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none rounded-md pl-9 pr-9 py-2 text-sm text-[#F3F4F6] placeholder-[#6B7280]"
      />
      {q && (
        <button
          type="button"
          onClick={() => { setQ(""); setOpen(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#F3F4F6]"
          data-testid="search-clear"
        >
          <X size={12} />
        </button>
      )}

      {open && q && (
        <div
          id="search-results-panel"
          className="weird-search-panel absolute z-50 mt-2 w-full bg-[#141923] border border-[#273041] rounded-md shadow-xl max-h-96 overflow-y-auto"
          data-testid="search-results"
          role="listbox"
          aria-label="Search results"
        >
          {loading && <div className="px-4 py-3 text-xs text-[#6B7280]">Searching...</div>}
          {!loading && total === 0 && (
            <div className="px-4 py-3 text-xs text-[#6B7280]">No results</div>
          )}
          {results.players.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#6B7280] border-b border-[#273041]">
                Players
              </div>
              {results.players.map((p) => (
                <button
                  type="button"
                  key={`p-${p.name}`}
                  onClick={() => go(`/players/${encodeURIComponent(p.name)}`)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-[#1E2532]/60 text-left"
                  data-testid={`search-player-${p.name}`}
                >
                  <span className="flex items-center gap-2 text-sm text-[#F3F4F6] truncate">
                    <User size={12} className="text-[#10B981]" />
                    {p.name}
                  </span>
                  <span className="font-mono text-xs text-[#9CA3AF] shrink-0">
                    <span className="text-[#10B981]">{p.wins}W</span>
                    <span className="text-[#6B7280] mx-1">.</span>
                    <span className="text-[#EF4444]">{p.losses}L</span>
                    {p.fargo ? <span className="ml-2 text-[#F59E0B]">FR {p.fargo}</span> : null}
                  </span>
                </button>
              ))}
            </div>
          )}
          {results.tournaments.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#6B7280] border-b border-t border-[#273041]">
                Tournaments
              </div>
              {results.tournaments.map((t) => (
                <button
                  type="button"
                  key={`t-${t.id}`}
                  onClick={() => go(`/tournaments/${t.id}`)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#1E2532]/60 text-left text-sm text-[#F3F4F6]"
                  data-testid={`search-tournament-${t.id}`}
                >
                  <Trophy size={12} className="text-[#F59E0B]" />
                  <span className="truncate">{t.name}</span>
                  <span className="text-xs text-[#6B7280] ml-auto shrink-0">{t.game || "?"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { fetchTournaments } from "../lib/api";
import { Trophy, ArrowSquareOut, CalendarDots, Medal } from "@phosphor-icons/react";

const stateColor = (s) => {
  if (s === "complete" || s === "ended") return "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20";
  if (s === "underway" || s === "in_progress")
    return "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20";
  return "bg-[#273041] text-[#9CA3AF] border-[#273041]";
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const monthLabel = (value) => {
  if (!value) return "Undated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Undated";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

const formatDifficultySummary = (difficulty) => {
  if (!difficulty) return "Unknown field";
  if (difficulty.average_elo) return `${difficulty.average_elo} avg ELO`;
  return difficulty.label ? `${difficulty.label} field` : "Unknown field";
};

export default function Tournaments() {
  const [list, setList] = useState([]);
  const [sort, setSort] = useState("date");
  const [game, setGame] = useState("all");
  const [winner, setWinner] = useState("all");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [view, setView] = useState("cards");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setList(await fetchTournaments());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const gameOptions = useMemo(() => {
    const counts = new Map();
    list.forEach((t) => {
      const label = t.game || "Unknown";
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [list]);

  const winnerOptions = useMemo(() => {
    const counts = new Map();
    list.forEach((t) => {
      if (!t.winner) return;
      counts.set(t.winner, (counts.get(t.winner) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [list]);

  const sortedList = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    const rows = list.filter((t) => {
      const eventDate = new Date(t.started_at || t.completed_at || 0).getTime();
      const matchesQuery = !needle
        || (t.name || "").toLowerCase().includes(needle)
        || (t.winner || "").toLowerCase().includes(needle);
      return (
        (game === "all" || (t.game || "Unknown") === game)
        && (winner === "all" || t.winner === winner)
        && matchesQuery
        && (!fromTime || eventDate >= fromTime)
        && (!toTime || eventDate <= toTime)
      );
    });
    if (sort === "name") return rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (sort === "players") return rows.sort((a, b) => (b.player_count || b.participants_count || 0) - (a.player_count || a.participants_count || 0));
    if (sort === "duration") return rows.sort((a, b) => (b.normalized_duration_minutes || 0) - (a.normalized_duration_minutes || 0));
    return rows.sort((a, b) => new Date(b.started_at || b.completed_at || 0) - new Date(a.started_at || a.completed_at || 0));
  }, [list, sort, game, winner, query, dateFrom, dateTo]);

  const timelineGroups = useMemo(() => {
    const groups = new Map();
    sortedList.forEach((t) => {
      const label = monthLabel(t.started_at || t.completed_at);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(t);
    });
    return Array.from(groups.entries()).map(([label, tournaments]) => ({ label, tournaments }));
  }, [sortedList]);

  return (
    <>
      <Topbar
        title="Tournaments"
        subtitle={`${sortedList.length} of ${list.length} tournaments synced from Challonge`}
        onSyncDone={load}
      />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="tournaments-page">
        <div className="mb-5 flex flex-col gap-3">
          <div className="inline-flex w-fit rounded-md border border-[#273041] bg-[#0B0E14] p-1">
            <button
              type="button"
              onClick={() => setView("cards")}
              className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors ${
                view === "cards" ? "bg-[#10B981]/10 text-[#10B981]" : "text-[#9CA3AF] hover:text-[#F3F4F6]"
              }`}
              data-testid="tournament-cards-view"
            >
              <Trophy size={14} /> Cards
            </button>
            <button
              type="button"
              onClick={() => setView("timeline")}
              className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors ${
                view === "timeline" ? "bg-[#10B981]/10 text-[#10B981]" : "text-[#9CA3AF] hover:text-[#F3F4F6]"
              }`}
              data-testid="tournament-timeline-view"
            >
              <CalendarDots size={14} /> Timeline
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or winner"
              data-testid="tournament-search-input"
              className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981] xl:col-span-2"
            />
            <select
              value={game}
              onChange={(e) => setGame(e.target.value)}
              data-testid="tournament-game-filter-select"
              className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
            >
              <option value="all">All games</option>
              {gameOptions.map((option) => (
                <option key={option.label} value={option.label}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
            <select
              value={winner}
              onChange={(e) => setWinner(e.target.value)}
              data-testid="tournament-winner-filter-select"
              className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
            >
              <option value="all">All winners</option>
              {winnerOptions.map((option) => (
                <option key={option.label} value={option.label}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Tournament date from"
              data-testid="tournament-date-from-input"
              className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Tournament date to"
              data-testid="tournament-date-to-input"
              className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              data-testid="tournament-sort-select"
              className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
            >
              <option value="date">Sort by date</option>
              <option value="players">Sort by players</option>
              <option value="duration">Sort by duration</option>
              <option value="name">Sort by name</option>
            </select>
          </div>
        </div>
        {loading && !list.length ? (
          <div className="text-[#6B7280]">Loading...</div>
        ) : list.length === 0 ? (
          <div className="text-[#6B7280]">No tournaments yet. Try Sync Now.</div>
        ) : sortedList.length === 0 ? (
          <div className="text-[#6B7280]">No tournaments match the current filters.</div>
        ) : view === "timeline" ? (
          <div className="space-y-8" data-testid="tournament-timeline">
            {timelineGroups.map((group) => (
              <section key={group.label}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#273041]" />
                  <h2 className="font-[Outfit] text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    {group.label}
                  </h2>
                  <div className="h-px flex-1 bg-[#273041]" />
                </div>
                <div className="space-y-3">
                  {group.tournaments.map((t, index) => (
                    <Link
                      key={`${t.id}-${t.started_at || t.completed_at || index}`}
                      to={`/tournaments/${t.id}`}
                      className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_auto] gap-3 lg:items-center rounded-lg border border-[#273041] bg-[#141923] px-4 py-3 hover:border-[#10B981]/50 transition-colors"
                      data-testid={`tournament-timeline-row-${t.id}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-[Outfit] font-semibold text-[#F3F4F6] truncate">
                            {t.name}
                          </span>
                          <span className={`shrink-0 text-xs uppercase tracking-wider border px-2 py-0.5 rounded ${stateColor(t.state)}`}>
                            {t.state || "?"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B7280] font-mono">
                          <span>{t.game || "-"}</span>
                          <span>{formatDifficultySummary(t.difficulty)}</span>
                          <span>{t.player_count || t.participants_count || 0} players</span>
                          <span>{t.duration_outlier ? "outlier" : t.normalized_duration_label || "-"}</span>
                        </div>
                      </div>
                      <div className="inline-flex w-fit items-center gap-2 rounded-md border border-[#F59E0B]/20 bg-[#F59E0B]/10 px-3 py-1.5 text-sm text-[#F59E0B]">
                        <Medal size={14} weight="duotone" />
                        <span className="font-medium">{t.winner || "No winner"}</span>
                      </div>
                      <span className="text-xs font-mono text-[#6B7280]">
                        {formatDate(t.started_at || t.completed_at)}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            data-testid="tournaments-grid"
          >
            {sortedList.map((t, index) => (
              <Link
                key={`${t.id}-${t.started_at || t.completed_at || index}`}
                to={`/tournaments/${t.id}`}
                className="bg-[#141923] border border-[#273041] rounded-lg p-5 hover:border-[#10B981]/50 hover:-translate-y-0.5 transition-all duration-200 group"
                data-testid={`tournament-card-${t.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-md bg-[#0B0E14] border border-[#273041] flex items-center justify-center shrink-0">
                    <Trophy size={18} weight="duotone" className="text-[#F59E0B]" />
                  </div>
                  <span
                    className={`text-xs uppercase tracking-wider border px-2 py-0.5 rounded ${stateColor(
                      t.state
                    )}`}
                  >
                    {t.state || "?"}
                  </span>
                </div>
                <h3 className="mt-4 font-[Outfit] font-semibold text-[#F3F4F6] text-lg leading-snug group-hover:text-[#10B981] transition-colors">
                  {t.name}
                </h3>
                <div className="mt-3 flex items-center justify-between text-xs text-[#6B7280]">
                  <span className="font-mono">{t.game || "-"}</span>
                  <span className="font-mono">{t.player_count || t.participants_count || 0} players</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#6B7280]">
                  <span className="font-mono">Field strength</span>
                  <span className="font-mono text-[#F59E0B]">{formatDifficultySummary(t.difficulty)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#6B7280]">
                  <span className="font-mono">Duration</span>
                  <span className="font-mono">{t.duration_outlier ? "outlier" : t.normalized_duration_label || "-"}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#6B7280]">
                  <span className="font-mono">Winner</span>
                  <span className="font-mono text-[#F59E0B] truncate">{t.winner || "-"}</span>
                </div>
                {t.url ? (
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-[#9CA3AF] group-hover:text-[#10B981]">
                    <ArrowSquareOut size={12} /> Challonge
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

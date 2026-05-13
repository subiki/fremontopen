import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { fetchLeaderboard } from "../lib/api";
import { Crown } from "@phosphor-icons/react";

export default function Leaderboard() {
  const [list, setList] = useState([]);
  const [sort, setSort] = useState("wins");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setList(await fetchLeaderboard(1000));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const sortedList = useMemo(() => {
    const rows = [...list];
    const byNumberDesc = (key) => (a, b) => (b[key] ?? -Infinity) - (a[key] ?? -Infinity);
    if (sort === "elo") return rows.sort(byNumberDesc("elo_rating"));
    if (sort === "win_rate") return rows.sort(byNumberDesc("win_rate"));
    if (sort === "average_placement") {
      return rows.sort((a, b) => (a.average_placement ?? Infinity) - (b.average_placement ?? Infinity));
    }
    if (sort === "top_4") return rows.sort(byNumberDesc("top_4_finishes"));
    return rows.sort(byNumberDesc("wins"));
  }, [list, sort]);

  const max = Math.max(1, ...sortedList.map((p) => p.wins + p.losses));

  return (
    <>
      <Topbar title="Leaderboard" subtitle="Players ranked by total wins and top finishes" onSyncDone={load} />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="leaderboard-page">
        <div className="mb-5 flex justify-end">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            data-testid="leaderboard-sort-select"
            className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
          >
            <option value="wins">Sort by wins</option>
            <option value="elo">Sort by ELO</option>
            <option value="win_rate">Sort by win rate</option>
            <option value="average_placement">Sort by avg place</option>
            <option value="top_4">Sort by top 4s</option>
          </select>
        </div>
        {loading && !list.length ? (
          <div className="text-[#6B7280]">Loading…</div>
        ) : list.length === 0 ? (
          <div className="text-[#6B7280]">No data yet.</div>
        ) : (
          <div className="bg-[#141923] border border-[#273041] rounded-lg p-2 overflow-x-auto">
            <ul>
              {sortedList.map((p, i) => {
                const total = p.wins + p.losses;
                const winPct = total ? (p.wins / total) * 100 : 0;
                const widthPct = (total / max) * 100;
                return (
                  <li
                    key={p.name}
                    className="min-w-[1080px] flex items-center gap-4 px-4 py-3 hover:bg-[#1E2532]/50 rounded-md transition-colors"
                    data-testid={`leaderboard-row-${i}`}
                  >
                    <div className="w-7 shrink-0 flex items-center justify-center">
                      {i === 0 ? (
                        <Crown size={18} weight="fill" className="text-[#F59E0B]" />
                      ) : (
                        <span className="font-mono text-xs text-[#6B7280]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      )}
                    </div>
                    <div className="w-44 shrink-0 truncate">
                      <Link
                        to={`/players/${encodeURIComponent(p.name)}`}
                        className="text-[#F3F4F6] hover:text-[#10B981] font-medium"
                      >
                        {p.name}
                      </Link>
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-[#0B0E14] overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${widthPct}%`,
                          background: `linear-gradient(90deg, #10B981 0%, #10B981 ${winPct}%, #EF4444 ${winPct}%, #EF4444 100%)`,
                        }}
                      />
                    </div>
                    <div className="w-44 shrink-0 text-right font-mono text-sm">
                      <span className="text-[#10B981]">{p.wins}W</span>
                      <span className="text-[#6B7280] mx-1">·</span>
                      <span className="text-[#EF4444]">{p.losses}L</span>
                      <span className="text-[#9CA3AF] ml-2">{p.win_rate}%</span>
                    </div>
                    <div className="w-44 shrink-0 text-right font-mono text-xs">
                      <span className="text-[#F59E0B]">
                        ELO {p.elo_rating ?? "—"}
                      </span>
                      <span className="text-[#6B7280] ml-2">
                        Peak {p.elo_peak ?? "—"}
                      </span>
                    </div>
                    <div className="w-44 shrink-0 text-right font-mono text-xs">
                      <span className="text-[#F59E0B]">
                        Avg {p.average_placement ?? "—"}
                      </span>
                      <span className="text-[#6B7280] ml-2">
                        T4 {p.top_4_finishes ?? 0}
                      </span>
                    </div>
                    <div className="w-52 shrink-0 flex justify-end gap-2 text-[11px] font-mono">
                      <Chip label="Cur" value={p.attendance_streak ?? 0} />
                      <Chip label="Best" value={p.best_attendance_streak ?? 0} />
                      <Chip label="Titles" value={p.top_1_finishes ?? 0} accent />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
    </>
  );
}

const Chip = ({ label, value, accent = false }) => (
  <span
    className={`rounded border px-2 py-1 ${
      accent
        ? "border-[#F59E0B]/20 bg-[#F59E0B]/10 text-[#F59E0B]"
        : "border-[#273041] bg-[#0B0E14] text-[#9CA3AF]"
    }`}
  >
    {label} {value}
  </span>
);

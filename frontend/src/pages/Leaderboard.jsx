import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { fetchLeaderboard } from "../lib/api";
import { Crown } from "@phosphor-icons/react";

export default function Leaderboard() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setList(await fetchLeaderboard(50));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const max = Math.max(1, ...list.map((p) => p.wins + p.losses));

  return (
    <>
      <Topbar title="Leaderboard" subtitle="Players ranked by total wins" onSyncDone={load} />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="leaderboard-page">
        {loading && !list.length ? (
          <div className="text-[#6B7280]">Loading…</div>
        ) : list.length === 0 ? (
          <div className="text-[#6B7280]">No data yet.</div>
        ) : (
          <div className="bg-[#141923] border border-[#273041] rounded-lg p-2">
            <ul>
              {list.map((p, i) => {
                const total = p.wins + p.losses;
                const winPct = total ? (p.wins / total) * 100 : 0;
                const widthPct = (total / max) * 100;
                return (
                  <li
                    key={p.name}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-[#1E2532]/50 rounded-md transition-colors"
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

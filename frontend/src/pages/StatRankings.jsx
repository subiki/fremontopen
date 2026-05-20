import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { fetchLeaderboard } from "../lib/api";
import { compareLeaderboardPlayers, getLeaderboardMetric } from "../lib/leaderboardMetrics";
import { CaretLeft, Crown } from "@phosphor-icons/react";

export const rankingPath = (metric) => `/rankings/${metric}`;

export default function StatRankings() {
  const { stat } = useParams();
  const config = getLeaderboardMetric(stat);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setPlayers(await fetchLeaderboard(1000));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo(() => {
    return [...players]
      .map((player) => ({ player, value: config.value(player) }))
      .filter((row) => row.value !== null && row.value !== undefined)
      .sort((a, b) => compareLeaderboardPlayers(config, a.player, b.player));
  }, [players, config]);

  return (
    <>
      <Topbar title={`${config.label} Rankings`} subtitle={`Players ranked by ${config.label.toLowerCase()}`} />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="stat-rankings-page">
        <Link to="/leaderboard" className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-[#10B981] mb-5">
          <CaretLeft size={14} /> Back to leaderboard
        </Link>
        {loading && !rows.length ? (
          <div className="text-[#6B7280]">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-[#6B7280]">No players have this stat yet.</div>
        ) : (
          <div className="bg-[#141923] border border-[#273041] rounded-lg p-2 overflow-x-auto">
            <ul className="min-w-[640px]">
              {rows.map((row, index) => (
                <li
                  key={row.player.name}
                  className="flex items-center justify-between gap-4 rounded-md px-4 py-3 hover:bg-[#1E2532]/50 transition-colors"
                  data-testid={`stat-ranking-row-${index}`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 shrink-0 text-center">
                      {index === 0 ? (
                        <Crown size={18} weight="fill" className="mx-auto text-[#F59E0B]" />
                      ) : (
                        <span className="font-mono text-xs text-[#6B7280]">{String(index + 1).padStart(2, "0")}</span>
                      )}
                    </div>
                    <Link
                      to={`/players/${encodeURIComponent(row.player.name)}`}
                      className="truncate font-medium text-[#F3F4F6] hover:text-[#10B981]"
                    >
                      {row.player.name}
                    </Link>
                  </div>
                  <div className="shrink-0 font-mono text-lg text-[#F59E0B]">
                    {config.format(row.value)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </>
  );
}

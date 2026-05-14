import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { fetchLeaderboard } from "../lib/api";
import { CaretLeft, Crown } from "@phosphor-icons/react";

const metricConfigs = {
  wins: { label: "Wins", value: (p) => p.wins || 0, format: number, desc: true },
  losses: { label: "Losses", value: (p) => p.losses || 0, format: number, desc: true },
  total_matches: { label: "Total Matches", value: (p) => (p.wins || 0) + (p.losses || 0), format: number, desc: true },
  win_rate: { label: "Win Rate", value: (p) => p.win_rate || 0, format: percent, desc: true },
  tournaments_played: { label: "Tournaments Played", value: (p) => p.tournaments_played || 0, format: number, desc: true },
  attendance_streak: { label: "Attendance Streak", value: (p) => p.attendance_streak || 0, format: number, desc: true },
  elo_rating: { label: "ELO", value: (p) => p.elo_rating || 0, format: number, desc: true },
  elo_peak: { label: "ELO Peak", value: (p) => p.elo_peak || 0, format: number, desc: true },
  strength_of_schedule: { label: "Strength of Schedule", value: (p) => p.strength_of_schedule, format: number, desc: true },
  opponent_win_rate: { label: "Opponent Win Rate", value: (p) => p.opponent_win_rate, format: percent, desc: true },
  opponent_count: { label: "Unique Opponents", value: (p) => p.opponent_count || 0, format: number, desc: true },
  average_placement: { label: "Average Placement", value: (p) => p.average_placement, format: decimal, desc: false },
  cash_won: { label: "Cash Won", value: (p) => p.cash_won || 0, format: money, desc: true },
  top_1_finishes: { label: "1st Place Finishes", value: (p) => p.top_1_finishes || 0, format: number, desc: true },
  second_place_finishes: { label: "2nd Place Finishes", value: (p) => p.second_place_finishes || 0, format: number, desc: true },
  third_place_finishes: { label: "3rd Place Finishes", value: (p) => p.third_place_finishes || 0, format: number, desc: true },
  fourth_place_finishes: { label: "4th Place Finishes", value: (p) => p.fourth_place_finishes || 0, format: number, desc: true },
  top_4_finishes: { label: "Top 4 Total", value: (p) => p.top_4_finishes || 0, format: number, desc: true },
};

export const rankingPath = (metric) => `/rankings/${metric}`;

export default function StatRankings() {
  const { stat } = useParams();
  const config = metricConfigs[stat] || metricConfigs.wins;
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
      .sort((a, b) => {
        const left = Number(a.value);
        const right = Number(b.value);
        if (left !== right) return config.desc ? right - left : left - right;
        return a.player.name.localeCompare(b.player.name);
      });
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

function number(value) {
  return Number(value || 0).toLocaleString();
}

function decimal(value) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

function percent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

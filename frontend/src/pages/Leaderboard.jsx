import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { fetchLeaderboard } from "../lib/api";
import { compareLeaderboardPlayers, getLeaderboardMetric, leaderboardMetricGroups } from "../lib/leaderboardMetrics";
import { Crown } from "@phosphor-icons/react";

export default function Leaderboard() {
  const [list, setList] = useState([]);
  const [sort, setSort] = useState("wins");
  const [minMatches, setMinMatches] = useState(10);
  const [minTournaments, setMinTournaments] = useState(0);
  const [minRacks, setMinRacks] = useState(0);
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
    const rows = [...list].filter((player) =>
      ((player.wins || 0) + (player.losses || 0)) >= minMatches
      && (player.tournaments_played || 0) >= minTournaments
      && (player.racks_played || 0) >= minRacks
    );
    const metric = getLeaderboardMetric(sort);
    return rows.sort((left, right) => compareLeaderboardPlayers(metric, left, right));
  }, [list, sort, minMatches, minTournaments, minRacks]);

  const max = Math.max(1, ...sortedList.map((player) => player.wins + player.losses));
  const selectedMetric = getLeaderboardMetric(sort);

  return (
    <>
      <Topbar title="Leaderboard" subtitle={`Players ranked by ${selectedMetric.label.toLowerCase()}`} onSyncDone={load} />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="leaderboard-page">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-[#9CA3AF]">
            Showing players with at least <span className="font-mono text-[#F3F4F6]">{minMatches}</span> matches,
            <span className="font-mono text-[#F3F4F6]"> {minTournaments}</span> tournaments, and
            <span className="font-mono text-[#F3F4F6]"> {minRacks}</span> racks. Current and best attendance streaks count consecutive tournament appearances.
          </div>
          <div className="flex flex-col xl:flex-row gap-3">
            <select
              value={minMatches}
              onChange={(event) => setMinMatches(Number(event.target.value))}
              aria-label="Minimum matches"
              data-testid="leaderboard-min-matches-select"
              className="min-h-11 bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
            >
              <option value={0}>All players</option>
              <option value={5}>Min 5 matches</option>
              <option value={10}>Min 10 matches</option>
              <option value={25}>Min 25 matches</option>
            </select>
            <select
              value={minTournaments}
              onChange={(event) => setMinTournaments(Number(event.target.value))}
              aria-label="Minimum tournaments"
              data-testid="leaderboard-min-tournaments-select"
              className="min-h-11 bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
            >
              <option value={0}>All tournament counts</option>
              <option value={3}>Min 3 tournaments</option>
              <option value={5}>Min 5 tournaments</option>
              <option value={10}>Min 10 tournaments</option>
            </select>
            <select
              value={minRacks}
              onChange={(event) => setMinRacks(Number(event.target.value))}
              aria-label="Minimum racks"
              data-testid="leaderboard-min-racks-select"
              className="min-h-11 bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
            >
              <option value={0}>All rack totals</option>
              <option value={25}>Min 25 racks</option>
              <option value={50}>Min 50 racks</option>
              <option value={100}>Min 100 racks</option>
            </select>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Sort leaderboard"
              data-testid="leaderboard-sort-select"
              className="min-h-11 bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981] min-w-[240px]"
            >
              {leaderboardMetricGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.metrics.map((metricKey) => {
                    const metric = getLeaderboardMetric(metricKey);
                    return (
                      <option key={metricKey} value={metricKey}>
                        Sort by {metric.label.toLowerCase()}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        {loading && !list.length ? (
          <div className="text-[#6B7280]">Loading...</div>
        ) : sortedList.length === 0 ? (
          <div className="text-[#6B7280]">No players match the current minimums.</div>
        ) : (
          <div className="bg-[#141923] border border-[#273041] rounded-lg p-2 overflow-x-auto">
            <ul>
              {sortedList.map((player, index) => {
                const total = player.wins + player.losses;
                const winPct = total ? (player.wins / total) * 100 : 0;
                const widthPct = (total / max) * 100;
                return (
                  <li
                    key={player.name}
                    className="min-w-[1340px] flex items-center gap-4 px-4 py-3 hover:bg-[#1E2532]/50 rounded-md transition-colors"
                    data-testid={`leaderboard-row-${index}`}
                  >
                    <div className="w-7 shrink-0 flex items-center justify-center">
                      {index === 0 ? (
                        <Crown size={18} weight="fill" className="text-[#F59E0B]" />
                      ) : (
                        <span className="font-mono text-xs text-[#6B7280]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      )}
                    </div>
                    <div className="w-44 shrink-0 truncate">
                      <Link
                        to={`/players/${encodeURIComponent(player.name)}`}
                        className="text-[#F3F4F6] hover:text-[#10B981] font-medium"
                      >
                        {player.name}
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
                      <span className="text-[#10B981]">{player.wins}W</span>
                      <span className="text-[#6B7280] mx-1">.</span>
                      <span className="text-[#EF4444]">{player.losses}L</span>
                      <span className="text-[#9CA3AF] ml-2">{player.win_rate}%</span>
                    </div>
                    <div className="w-44 shrink-0 text-right">
                      <div className="text-[10px] uppercase text-[#6B7280]">{selectedMetric.label}</div>
                      <Link
                        to={`/rankings/${sort}`}
                        className="font-mono text-sm text-[#F59E0B] hover:text-[#FBBF24]"
                      >
                        {selectedMetric.format(selectedMetric.value(player))}
                      </Link>
                    </div>
                    <div className="w-44 shrink-0 text-right font-mono text-xs">
                      <span className="text-[#F59E0B]">ELO {player.elo_rating ?? "-"}</span>
                      <span className="text-[#6B7280] ml-2">Peak {player.elo_peak ?? "-"}</span>
                    </div>
                    <div className="w-44 shrink-0 text-right font-mono text-xs">
                      <span className="text-[#F59E0B]">Avg {player.average_placement ?? "-"}</span>
                      <span className="text-[#6B7280] ml-2">T4 {player.top_4_finishes ?? 0}</span>
                    </div>
                    <div className="w-40 shrink-0 text-right font-mono text-xs text-[#9CA3AF]">
                      <span>{player.tournaments_played ?? 0} tourn.</span>
                      <span className="ml-2">{player.racks_played ?? 0} racks</span>
                    </div>
                    <div className="w-52 shrink-0 flex justify-end gap-2 text-xs font-mono">
                      <Chip label="Rivalries" value={player.rivalry_wins ?? 0} />
                      <Chip label="Current Attend." value={player.attendance_streak ?? 0} />
                      <Chip label="Best Attend." value={player.best_attendance_streak ?? 0} />
                      <Chip label="Titles" value={player.top_1_finishes ?? 0} accent />
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

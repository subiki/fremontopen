import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { fetchLeaderboard } from "../lib/api";
import { compareLeaderboardPlayers, getLeaderboardMetric } from "../lib/leaderboardMetrics";
import { CaretLeft, Crown } from "@phosphor-icons/react";

export const rankingPath = (metric) => `/rankings/${metric}`;

const placementMetricKeys = new Set([
  "average_placement",
  "placements_counted",
  "top_1_finishes",
  "second_place_finishes",
  "third_place_finishes",
  "fourth_place_finishes",
  "top_2_finishes",
  "top_3_finishes",
  "top_4_finishes",
]);

export default function StatRankings() {
  const { stat } = useParams();
  const config = getLeaderboardMetric(stat);
  const isPlacementMetric = placementMetricKeys.has(stat);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minMatches, setMinMatches] = useState(0);
  const [minTournaments, setMinTournaments] = useState(0);
  const [minPlacements, setMinPlacements] = useState(isPlacementMetric ? 3 : 0);

  useEffect(() => {
    setMinPlacements(isPlacementMetric ? 3 : 0);
  }, [isPlacementMetric]);

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
      .filter((row) => ((row.player.wins || 0) + (row.player.losses || 0)) >= minMatches)
      .filter((row) => (row.player.tournaments_played || 0) >= minTournaments)
      .filter((row) => (row.player.placements_counted || 0) >= minPlacements)
      .sort((a, b) => compareLeaderboardPlayers(config, a.player, b.player));
  }, [players, config, minMatches, minTournaments, minPlacements]);

  const subtitle = isPlacementMetric
    ? `Players ranked by ${config.label.toLowerCase()}. Lower average placement is better.`
    : `Players ranked by ${config.label.toLowerCase()}`;

  return (
    <>
      <Topbar title={`${config.label} Rankings`} subtitle={subtitle} />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="stat-rankings-page">
        <Link to="/leaderboard" className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-[#10B981] mb-5">
          <CaretLeft size={14} /> Back to leaderboard
        </Link>
        <div className="mb-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="text-sm text-[#9CA3AF]">
            Showing players with at least <span className="font-mono text-[#F3F4F6]">{minMatches}</span> matches and
            <span className="font-mono text-[#F3F4F6]"> {minTournaments}</span> tournaments.
            {isPlacementMetric ? (
              <>
                {" "}Placement views also require
                <span className="font-mono text-[#F3F4F6]"> {minPlacements}</span> counted placements.
              </>
            ) : null}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={minMatches}
              onChange={(event) => setMinMatches(Number(event.target.value))}
              aria-label="Minimum matches"
              data-testid="stat-rankings-min-matches-select"
              className="min-h-11 bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
            >
              <option value={0}>All match totals</option>
              <option value={5}>Min 5 matches</option>
              <option value={10}>Min 10 matches</option>
              <option value={25}>Min 25 matches</option>
            </select>
            <select
              value={minTournaments}
              onChange={(event) => setMinTournaments(Number(event.target.value))}
              aria-label="Minimum tournaments"
              data-testid="stat-rankings-min-tournaments-select"
              className="min-h-11 bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
            >
              <option value={0}>All tournament totals</option>
              <option value={3}>Min 3 tournaments</option>
              <option value={5}>Min 5 tournaments</option>
              <option value={10}>Min 10 tournaments</option>
            </select>
            {isPlacementMetric ? (
              <select
                value={minPlacements}
                onChange={(event) => setMinPlacements(Number(event.target.value))}
                aria-label="Minimum placement samples"
                data-testid="stat-rankings-min-placements-select"
                className="min-h-11 bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
              >
                <option value={0}>All placement samples</option>
                <option value={1}>Min 1 placement</option>
                <option value={3}>Min 3 placements</option>
                <option value={5}>Min 5 placements</option>
                <option value={10}>Min 10 placements</option>
              </select>
            ) : null}
          </div>
        </div>
        {loading && !rows.length ? (
          <div className="text-[#6B7280]">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-[#6B7280]">No players match the current minimums for this stat.</div>
        ) : (
          <div className="bg-[#141923] border border-[#273041] rounded-lg p-2 overflow-x-auto">
            <ul className="min-w-[760px]">
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
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-lg text-[#F59E0B]">
                      {config.format(row.value)}
                    </div>
                    <div className="mt-1 font-mono text-xs text-[#6B7280]">
                      {isPlacementMetric
                        ? `${row.player.placements_counted || 0} placements . ${row.player.top_4_finishes || 0} top-4`
                        : `${row.player.wins || 0}-${row.player.losses || 0} . ${row.player.tournaments_played || 0} tourn.`}
                    </div>
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

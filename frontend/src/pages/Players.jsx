import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { PlayerArtCard } from "../components/PlayerArtCard";
import { fetchPlayers } from "../lib/api";
import { compareLeaderboardPlayers, getLeaderboardMetric, leaderboardMetricGroups } from "../lib/leaderboardMetrics";
import { MagnifyingGlass } from "@phosphor-icons/react";

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

export default function Players() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("wins");
  const [minMatches, setMinMatches] = useState(0);
  const [minTournaments, setMinTournaments] = useState(0);
  const [minRacks, setMinRacks] = useState(0);
  const [minPlacements, setMinPlacements] = useState(0);
  const [loading, setLoading] = useState(true);
  const isPlacementMetric = placementMetricKeys.has(sort);
  const selectedMetric = useMemo(
    () => (
      sort === "name"
        ? { label: "Name", value: (player) => player.name, format: (value) => value }
        : getLeaderboardMetric(sort)
    ),
    [sort],
  );
  const hasActiveFilters = minMatches > 0 || minTournaments > 0 || minRacks > 0 || minPlacements > 0 || sort !== "wins";

  const load = async (term = "") => {
    setLoading(true);
    try {
      setList(await fetchPlayers(term));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setMinPlacements(isPlacementMetric ? 3 : 0);
  }, [isPlacementMetric]);

  const sortedList = useMemo(() => {
    const rows = [...list]
      .filter((player) => (player.wins || 0) + (player.losses || 0) >= minMatches)
      .filter((player) => (player.tournaments_played || 0) >= minTournaments)
      .filter((player) => (player.racks_played || 0) >= minRacks)
      .filter((player) => (player.placements_counted || 0) >= minPlacements);
    if (sort === "name") {
      return rows.sort((left, right) => left.name.localeCompare(right.name));
    }
    return rows.sort((left, right) => compareLeaderboardPlayers(selectedMetric, left, right));
  }, [list, minMatches, minPlacements, minRacks, minTournaments, selectedMetric, sort]);

  const subtitle = `Showing ${sortedList.length} of ${list.length} players with current filters`;

  const resetFilters = () => {
    setSort("wins");
    setMinMatches(0);
    setMinTournaments(0);
    setMinRacks(0);
    setMinPlacements(0);
  };

  return (
    <>
      <Topbar title="Players" subtitle={subtitle} onSyncDone={() => load(q)} />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8 space-y-5" data-testid="players-page">
        <div className="flex flex-col gap-3">
          <div className="relative max-w-md flex-1">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search players... (try 'Jimmy')"
              data-testid="player-search-input"
              className="w-full bg-[#0B0E14] border border-[#273041] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none rounded-md pl-9 pr-4 py-2.5 text-sm text-[#F3F4F6] placeholder-[#6B7280]"
            />
          </div>
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
            <div className="text-sm text-[#9CA3AF]">
              Sorting by <span className="font-mono text-[#F3F4F6]">{selectedMetric.label}</span> with at least
              <span className="font-mono text-[#F3F4F6]"> {minMatches}</span> matches,
              <span className="font-mono text-[#F3F4F6]"> {minTournaments}</span> tournaments, and
              <span className="font-mono text-[#F3F4F6]"> {minRacks}</span> racks.
              {isPlacementMetric ? (
                <>
                  {" "}Placement sorts also require
                  <span className="font-mono text-[#F3F4F6]"> {minPlacements}</span> counted placements.
                </>
              ) : null}
            </div>
            <div className="flex flex-col sm:flex-row xl:flex-wrap gap-3">
              <select
                value={minMatches}
                onChange={(e) => setMinMatches(Number(e.target.value))}
                data-testid="player-min-matches-select"
                className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
              >
                <option value={0}>All match totals</option>
                <option value={5}>Min 5 matches</option>
                <option value={10}>Min 10 matches</option>
                <option value={25}>Min 25 matches</option>
              </select>
              <select
                value={minTournaments}
                onChange={(e) => setMinTournaments(Number(e.target.value))}
                data-testid="player-min-tournaments-select"
                className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
              >
                <option value={0}>All tournament totals</option>
                <option value={3}>Min 3 tournaments</option>
                <option value={5}>Min 5 tournaments</option>
                <option value={10}>Min 10 tournaments</option>
              </select>
              <select
                value={minRacks}
                onChange={(e) => setMinRacks(Number(e.target.value))}
                data-testid="player-min-racks-select"
                className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
              >
                <option value={0}>All rack totals</option>
                <option value={25}>Min 25 racks</option>
                <option value={50}>Min 50 racks</option>
                <option value={100}>Min 100 racks</option>
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                data-testid="player-sort-select"
                className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981] min-w-[240px]"
              >
                <option value="name">Sort by name</option>
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
              {isPlacementMetric ? (
                <select
                  value={minPlacements}
                  onChange={(e) => setMinPlacements(Number(e.target.value))}
                  data-testid="player-min-placements-select"
                  className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
                >
                  <option value={0}>All placement samples</option>
                  <option value={1}>Min 1 placement</option>
                  <option value={3}>Min 3 placements</option>
                  <option value={5}>Min 5 placements</option>
                  <option value={10}>Min 10 placements</option>
                </select>
              ) : null}
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="px-3 py-2.5 rounded-md border border-[#273041] text-sm text-[#F3F4F6] bg-[#111827] hover:bg-[#1F2937] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#111827]"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#141923] border border-[#273041] rounded-lg overflow-x-auto">
          <table className="w-full text-left" data-testid="players-table">
            <thead>
              <tr>
                <Th>Rank</Th>
                <Th>Card</Th>
                <Th>Player</Th>
                <Th className="text-right">Record</Th>
                <Th className="text-right">ELO</Th>
                <Th className="text-right">Tourn.</Th>
                <Th className="text-right">Racks</Th>
                <Th className="text-right">{selectedMetric.label}</Th>
              </tr>
            </thead>
            <tbody>
              {loading && !list.length ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[#6B7280]">
                    Loading...
                  </td>
                </tr>
              ) : sortedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[#6B7280]">
                    No players found.
                  </td>
                </tr>
              ) : (
                sortedList.map((p, i) => (
                  <tr
                    key={p.name}
                    className="border-t border-[#273041]/60 hover:bg-[#1E2532]/40 transition-colors"
                    data-testid={`player-row-${i}`}
                  >
                    <Td className="font-mono text-xs text-[#6B7280]">
                      {String(i + 1).padStart(2, "0")}
                    </Td>
                    <Td className="w-[220px] min-w-[220px]">
                      <PlayerArtCard
                        player={p}
                        compact
                        linkTo={`/players/${encodeURIComponent(p.name)}`}
                        subtitle={`${p.tournaments_played ?? 0} tournaments . ${p.win_rate}%`}
                      />
                    </Td>
                    <Td>
                      <Link
                        to={`/players/${encodeURIComponent(p.name)}`}
                        className="text-[#F3F4F6] hover:text-[#10B981] font-medium"
                      >
                        {p.name}
                      </Link>
                      {p.nickname ? (
                        <div className="mt-1 text-xs text-[#6B7280]">{p.nickname}</div>
                      ) : null}
                    </Td>
                    <Td className="text-right font-mono">
                      <span className="text-[#10B981]">{p.wins}</span>
                      <span className="mx-1 text-[#6B7280]">-</span>
                      <span className="text-[#EF4444]">{p.losses}</span>
                      <div className="mt-1 text-xs text-[#9CA3AF]">{p.win_rate}%</div>
                    </Td>
                    <Td className="text-right font-mono text-[#F59E0B]">{p.elo_rating ?? "-"}</Td>
                    <Td className="text-right font-mono">{p.tournaments_played ?? 0}</Td>
                    <Td className="text-right font-mono">
                      {p.racks_played ?? 0}
                      <div className="mt-1 text-xs text-[#9CA3AF]">
                        {p.racks_won ?? 0}-{p.racks_lost ?? 0}
                      </div>
                    </Td>
                    <Td className="text-right font-mono">
                      <span className="text-[#F59E0B]">
                        {selectedMetric.format(selectedMetric.value(p))}
                      </span>
                      <div className="mt-1 text-xs text-[#9CA3AF]">
                        {isPlacementMetric
                          ? `${p.placements_counted ?? 0} placements`
                          : `${p.top_1_finishes ?? 0} titles . ${p.top_4_finishes ?? 0} top-4`}
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

const Th = ({ children, className = "" }) => (
  <th className={`text-xs font-semibold uppercase tracking-wider text-[#6B7280] px-5 py-3 ${className}`}>
    {children}
  </th>
);
const Td = ({ children, className = "" }) => (
  <td className={`px-5 py-3 text-sm text-[#F3F4F6] ${className}`}>{children}</td>
);

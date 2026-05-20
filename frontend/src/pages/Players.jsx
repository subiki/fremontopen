import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { PlayerArtCard } from "../components/PlayerArtCard";
import { fetchPlayers } from "../lib/api";
import { MagnifyingGlass } from "@phosphor-icons/react";

export default function Players() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("wins");
  const [minMatches, setMinMatches] = useState(0);
  const [loading, setLoading] = useState(true);

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

  const sortedList = useMemo(() => {
    const rows = [...list].filter((p) => (p.wins || 0) + (p.losses || 0) >= minMatches);
    const byNumberDesc = (key) => (a, b) => (b[key] ?? -Infinity) - (a[key] ?? -Infinity);
    if (sort === "name") return rows.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "elo") return rows.sort(byNumberDesc("elo_rating"));
    if (sort === "tournaments") return rows.sort(byNumberDesc("tournaments_played"));
    if (sort === "win_rate") return rows.sort(byNumberDesc("win_rate"));
    if (sort === "average_placement") {
      return rows.sort((a, b) => (a.average_placement ?? Infinity) - (b.average_placement ?? Infinity));
    }
    if (sort === "top_4") return rows.sort(byNumberDesc("top_4_finishes"));
    return rows.sort(byNumberDesc("wins"));
  }, [list, sort, minMatches]);

  return (
    <>
      <Topbar title="Players" subtitle="Aggregated W-L records across all synced tournaments" onSyncDone={() => load(q)} />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8 space-y-5" data-testid="players-page">
        <div className="flex flex-col sm:flex-row gap-3">
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
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={minMatches}
              onChange={(e) => setMinMatches(Number(e.target.value))}
              data-testid="player-min-matches-select"
              className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
            >
              <option value={0}>All players</option>
              <option value={5}>Min 5 matches</option>
              <option value={10}>Min 10 matches</option>
              <option value={25}>Min 25 matches</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              data-testid="player-sort-select"
              className="bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6] outline-none focus:border-[#10B981]"
            >
              <option value="wins">Sort by wins</option>
              <option value="elo">Sort by ELO</option>
              <option value="tournaments">Sort by tournaments</option>
              <option value="win_rate">Sort by win rate</option>
              <option value="average_placement">Sort by avg place</option>
              <option value="top_4">Sort by top 4s</option>
              <option value="name">Sort by name</option>
            </select>
          </div>
        </div>

        <div className="bg-[#141923] border border-[#273041] rounded-lg overflow-x-auto">
          <table className="w-full text-left" data-testid="players-table">
            <thead>
              <tr>
                <Th>Rank</Th>
                <Th>Card</Th>
                <Th>Player</Th>
                <Th className="text-right">Wins</Th>
                <Th className="text-right">Losses</Th>
                <Th className="text-right">ELO</Th>
                <Th className="text-right">Tourn.</Th>
                <Th className="text-right">Win Rate</Th>
                <Th className="text-right">Avg Place</Th>
                <Th className="text-right">Top 4</Th>
              </tr>
            </thead>
            <tbody>
              {loading && !list.length ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-[#6B7280]">
                    Loading...
                  </td>
                </tr>
              ) : sortedList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-[#6B7280]">
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
                    <Td className="text-right font-mono text-[#10B981]">{p.wins}</Td>
                    <Td className="text-right font-mono text-[#EF4444]">{p.losses}</Td>
                    <Td className="text-right font-mono text-[#F59E0B]">{p.elo_rating ?? "-"}</Td>
                    <Td className="text-right font-mono">{p.tournaments_played ?? 0}</Td>
                    <Td className="text-right font-mono">{p.win_rate}%</Td>
                    <Td className="text-right font-mono">{p.average_placement ?? "-"}</Td>
                    <Td className="text-right font-mono">{p.top_4_finishes ?? 0}</Td>
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

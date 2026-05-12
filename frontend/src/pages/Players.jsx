import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { fetchPlayers } from "../lib/api";
import { MagnifyingGlass } from "@phosphor-icons/react";

export default function Players() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
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

  return (
    <>
      <Topbar title="Players" subtitle="Aggregated W-L records across all synced tournaments" onSyncDone={() => load(q)} />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8 space-y-5" data-testid="players-page">
        <div className="relative max-w-md">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search players… (try 'Jimmy')"
            data-testid="player-search-input"
            className="w-full bg-[#0B0E14] border border-[#273041] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none rounded-md pl-9 pr-4 py-2.5 text-sm text-[#F3F4F6] placeholder-[#6B7280]"
          />
        </div>

        <div className="bg-[#141923] border border-[#273041] rounded-lg overflow-x-auto">
          <table className="w-full text-left" data-testid="players-table">
            <thead>
              <tr>
                <Th>Rank</Th>
                <Th>Player</Th>
                <Th className="text-right">Wins</Th>
                <Th className="text-right">Losses</Th>
                <Th className="text-right">Win Rate</Th>
              </tr>
            </thead>
            <tbody>
              {loading && !list.length ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#6B7280]">
                    Loading…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#6B7280]">
                    No players found.
                  </td>
                </tr>
              ) : (
                list.map((p, i) => (
                  <tr
                    key={p.name}
                    className="border-t border-[#273041]/60 hover:bg-[#1E2532]/40 transition-colors"
                    data-testid={`player-row-${i}`}
                  >
                    <Td className="font-mono text-xs text-[#6B7280]">
                      {String(i + 1).padStart(2, "0")}
                    </Td>
                    <Td>
                      <Link
                        to={`/players/${encodeURIComponent(p.name)}`}
                        className="text-[#F3F4F6] hover:text-[#10B981] font-medium"
                      >
                        {p.name}
                      </Link>
                    </Td>
                    <Td className="text-right font-mono text-[#10B981]">{p.wins}</Td>
                    <Td className="text-right font-mono text-[#EF4444]">{p.losses}</Td>
                    <Td className="text-right font-mono">{p.win_rate}%</Td>
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

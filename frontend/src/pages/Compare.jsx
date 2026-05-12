import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { fetchPlayer } from "../lib/api";
import { api } from "../lib/api";
import { CaretLeft, Scales } from "@phosphor-icons/react";

export default function Compare() {
  const { a, b } = useParams();
  const A = decodeURIComponent(a);
  const B = decodeURIComponent(b);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/compare/${encodeURIComponent(A)}/${encodeURIComponent(B)}`);
        setData(data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [A, B]);

  return (
    <>
      <Topbar title={`${A} vs ${B}`} subtitle="Head-to-head comparison" />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="compare-page">
        <Link to="/players" className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-[#10B981] mb-5">
          <CaretLeft size={14} /> Back to players
        </Link>

        {loading ? (
          <div className="text-[#6B7280]">Loading…</div>
        ) : !data ? (
          <div className="text-[#EF4444]">One or both players not found.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:gap-6 mb-6">
              <PlayerColumn player={data.a} />
              <PlayerColumn player={data.b} />
            </div>

            <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6" data-testid="h2h-card">
              <div className="flex items-center gap-2 mb-4">
                <Scales size={18} weight="duotone" className="text-[#10B981]" />
                <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">Head-to-head</h2>
              </div>
              {data.h2h.matches.length === 0 ? (
                <div className="text-[#6B7280] text-sm">They've never played each other.</div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-8 mb-5">
                    <BigScore name={A} score={data.h2h.a_wins} winning={data.h2h.a_wins >= data.h2h.b_wins} />
                    <span className="text-[#6B7280] text-2xl">·</span>
                    <BigScore name={B} score={data.h2h.b_wins} winning={data.h2h.b_wins >= data.h2h.a_wins} />
                  </div>
                  <ul className="divide-y divide-[#273041]/60">
                    {data.h2h.matches.slice(-10).reverse().map((m) => (
                      <li key={m.id} className="py-2 text-sm flex items-center justify-between">
                        <span>
                          <span className={`font-medium ${m.winner_name === A ? "text-[#10B981]" : "text-[#EF4444]"}`}>{m.winner_name}</span>
                          <span className="text-[#6B7280] mx-2">def.</span>
                          <span className="text-[#9CA3AF]">{m.loser_name}</span>
                        </span>
                        <span className="font-mono text-xs text-[#9CA3AF]">{m.scores || "—"}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className="bg-[#141923] border border-[#273041] rounded-lg p-6" data-testid="common-opponents-card">
              <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-4">Common opponents</h2>
              {data.common_opponents.length === 0 ? (
                <div className="text-[#6B7280] text-sm">No common opponents yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-[#6B7280]">
                        <th className="text-left py-2">Opponent</th>
                        <th className="text-right py-2">{A}</th>
                        <th className="text-right py-2">{B}</th>
                        <th className="text-right py-2">Edge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.common_opponents.map((row) => {
                        const aWr = row.a.w + row.a.l ? row.a.w / (row.a.w + row.a.l) : 0;
                        const bWr = row.b.w + row.b.l ? row.b.w / (row.b.w + row.b.l) : 0;
                        const edge = aWr > bWr ? A : bWr > aWr ? B : "tie";
                        return (
                          <tr key={row.opponent} className="border-t border-[#273041]/60">
                            <td className="py-2">
                              <Link
                                to={`/players/${encodeURIComponent(row.opponent)}`}
                                className="text-[#F3F4F6] hover:text-[#10B981]"
                              >
                                {row.opponent}
                              </Link>
                            </td>
                            <td className="py-2 text-right font-mono text-xs">
                              <span className="text-[#10B981]">{row.a.w}</span>-<span className="text-[#EF4444]">{row.a.l}</span>
                            </td>
                            <td className="py-2 text-right font-mono text-xs">
                              <span className="text-[#10B981]">{row.b.w}</span>-<span className="text-[#EF4444]">{row.b.l}</span>
                            </td>
                            <td className={`py-2 text-right text-xs font-medium ${edge === "tie" ? "text-[#9CA3AF]" : edge === A ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                              {edge}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}

const PlayerColumn = ({ player }) => (
  <Link
    to={`/players/${encodeURIComponent(player.name)}`}
    className="bg-[#141923] border border-[#273041] rounded-lg p-5 hover:border-[#10B981]/40 transition-colors block"
  >
    <h3 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] truncate">{player.name}</h3>
    <div className="mt-3 font-mono text-sm text-[#9CA3AF]">
      <span className="text-[#10B981]">{player.wins}W</span>
      <span className="text-[#6B7280] mx-1">·</span>
      <span className="text-[#EF4444]">{player.losses}L</span>
      <span className="text-[#9CA3AF] ml-2">{player.win_rate}%</span>
      {player.fargo ? <span className="text-[#F59E0B] ml-3">Fargo {player.fargo}</span> : null}
    </div>
  </Link>
);

const BigScore = ({ name, score, winning }) => (
  <div className={`text-center ${winning ? "" : "opacity-60"}`}>
    <div className="font-mono text-5xl font-semibold text-[#F3F4F6]">{score}</div>
    <div className="text-xs text-[#9CA3AF] truncate max-w-[180px] mt-1">{name}</div>
  </div>
);

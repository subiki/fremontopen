import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { api, fetchPlayers } from "../lib/api";
import { CaretLeft, Scales, MagnifyingGlass, ArrowsLeftRight } from "@phosphor-icons/react";

export default function Compare() {
  const { a, b } = useParams();
  const navigate = useNavigate();
  const A = a ? decodeURIComponent(a) : "";
  const B = b ? decodeURIComponent(b) : "";
  const [players, setPlayers] = useState([]);
  const [left, setLeft] = useState(A);
  const [right, setRight] = useState(B);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(A && B));
  const [playerLoading, setPlayerLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPlayerLoading(true);
      try {
        const rows = await fetchPlayers();
        if (!cancelled) setPlayers(rows);
      } finally {
        if (!cancelled) setPlayerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLeft(A);
    setRight(B);
  }, [A, B]);

  useEffect(() => {
    if (!A || !B) {
      setData(null);
      setLoading(false);
      return;
    }
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

  const playerNames = useMemo(() => players.map((p) => p.name), [players]);
  const canCompare = left && right && left !== right && playerNames.includes(left) && playerNames.includes(right);

  const submitCompare = (event) => {
    event.preventDefault();
    if (!canCompare) return;
    navigate(`/compare/${encodeURIComponent(left)}/${encodeURIComponent(right)}`);
  };

  const swapPlayers = () => {
    setLeft(right);
    setRight(left);
  };

  return (
    <>
      <Topbar
        title={A && B ? `${A} vs ${B}` : "Compare Players"}
        subtitle="Head-to-head records and common-opponent edges"
      />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="compare-page">
        <Link to="/players" className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-[#10B981] mb-5">
          <CaretLeft size={14} /> Back to players
        </Link>

        <ComparePicker
          left={left}
          right={right}
          setLeft={setLeft}
          setRight={setRight}
          playerNames={playerNames}
          loading={playerLoading}
          canCompare={canCompare}
          onSubmit={submitCompare}
          onSwap={swapPlayers}
        />

        {!A || !B ? null : loading ? (
          <div className="text-[#6B7280]">Loading...</div>
        ) : !data ? (
          <div className="text-[#EF4444]">One or both players not found.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6">
              <PlayerColumn player={data.a} />
              <PlayerColumn player={data.b} />
            </div>

            <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6" data-testid="h2h-card">
              <div className="flex items-center gap-2 mb-4">
                <Scales size={18} weight="duotone" className="text-[#10B981]" />
                <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">Head-to-head</h2>
              </div>
              {data.h2h.matches.length === 0 ? (
                <div className="text-[#6B7280] text-sm">They have not played each other.</div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-8 mb-5">
                    <BigScore name={A} score={data.h2h.a_wins} winning={data.h2h.a_wins >= data.h2h.b_wins} />
                    <span className="text-[#6B7280] text-2xl">/</span>
                    <BigScore name={B} score={data.h2h.b_wins} winning={data.h2h.b_wins >= data.h2h.a_wins} />
                  </div>
                  <ul className="divide-y divide-[#273041]/60">
                    {data.h2h.matches.slice(-10).reverse().map((m) => (
                      <li key={m.id} className="py-2 text-sm flex items-center justify-between gap-4">
                        <span className="min-w-0">
                          <span className={`font-medium ${m.winner_name === A ? "text-[#10B981]" : "text-[#EF4444]"}`}>{m.winner_name}</span>
                          <span className="text-[#6B7280] mx-2">def.</span>
                          <span className="text-[#9CA3AF]">{m.loser_name}</span>
                        </span>
                        <span className="font-mono text-xs text-[#9CA3AF] shrink-0">{m.scores || "-"}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6" data-testid="race-rack-card">
              <div className="flex items-center gap-2 mb-4">
                <ArrowsLeftRight size={18} weight="duotone" className="text-[#10B981]" />
                <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">Race versus rack</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CompareMetric
                  label="Races"
                  leftName={A}
                  rightName={B}
                  left={`${data.race_stats.a_race_wins}W`}
                  right={`${data.race_stats.b_race_wins}W`}
                  detail={`${data.race_stats.races_played} played`}
                />
                <CompareMetric
                  label="Racks"
                  leftName={A}
                  rightName={B}
                  left={`${data.race_stats.a_racks_won}-${data.race_stats.a_racks_lost}`}
                  right={`${data.race_stats.b_racks_won}-${data.race_stats.b_racks_lost}`}
                  detail={`${data.race_stats.scored_races} scored races`}
                />
                <CompareMetric
                  label="ELO odds"
                  leftName={A}
                  rightName={B}
                  left={`${data.race_stats.elo_odds.a_win_probability}%`}
                  right={`${data.race_stats.elo_odds.b_win_probability}%`}
                  detail={`${data.race_stats.elo_odds.a_rating} vs ${data.race_stats.elo_odds.b_rating}`}
                />
              </div>
            </section>

            <section className="bg-[#141923] border border-[#273041] rounded-lg p-6" data-testid="common-opponents-card">
              <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-4">Common opponents</h2>
              {data.common_opponents.length === 0 ? (
                <div className="text-[#6B7280] text-sm">No common opponents yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[620px]">
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

const ComparePicker = ({
  left,
  right,
  setLeft,
  setRight,
  playerNames,
  loading,
  canCompare,
  onSubmit,
  onSwap,
}) => (
  <form
    onSubmit={onSubmit}
    className="bg-[#141923] border border-[#273041] rounded-lg p-4 sm:p-5 mb-6"
    data-testid="compare-picker"
  >
    <datalist id="compare-player-options">
      {playerNames.map((name) => (
        <option value={name} key={name} />
      ))}
    </datalist>
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] gap-3 lg:items-end">
      <PlayerInput label="Player A" value={left} onChange={setLeft} loading={loading} testid="compare-player-a" />
      <button
        type="button"
        onClick={onSwap}
        disabled={!left && !right}
        className="h-11 w-11 justify-self-center rounded-md border border-[#273041] bg-[#0B0E14] text-[#9CA3AF] hover:text-[#F3F4F6] hover:border-[#10B981]/40 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Swap players"
        data-testid="compare-swap"
      >
        <ArrowsLeftRight size={18} className="mx-auto" />
      </button>
      <PlayerInput label="Player B" value={right} onChange={setRight} loading={loading} testid="compare-player-b" />
      <button
        type="submit"
        disabled={!canCompare}
        className="h-11 rounded-md bg-[#10B981] px-5 text-sm font-semibold text-[#0B0E14] hover:bg-[#34D399] disabled:bg-[#273041] disabled:text-[#6B7280] disabled:cursor-not-allowed"
        data-testid="compare-submit"
      >
        Compare
      </button>
    </div>
    {left && right && left === right ? (
      <div className="mt-3 text-sm text-[#F59E0B]">Choose two different players.</div>
    ) : null}
  </form>
);

const PlayerInput = ({ label, value, onChange, loading, testid }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#6B7280]">{label}</span>
    <span className="relative block">
      <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list="compare-player-options"
        placeholder={loading ? "Loading players..." : "Search player"}
        className="w-full rounded-md border border-[#273041] bg-[#0B0E14] py-2.5 pl-9 pr-3 text-sm text-[#F3F4F6] outline-none placeholder-[#6B7280] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
        data-testid={testid}
      />
    </span>
  </label>
);

const CompareMetric = ({ label, leftName, rightName, left, right, detail }) => (
  <div className="rounded-md border border-[#273041] bg-[#0B0E14] p-4">
    <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">{label}</div>
    <div className="mt-3 grid grid-cols-2 gap-3">
      <div className="min-w-0">
        <div className="truncate text-xs text-[#9CA3AF]">{leftName}</div>
        <div className="mt-1 font-mono text-2xl text-[#10B981]">{left}</div>
      </div>
      <div className="min-w-0 text-right">
        <div className="truncate text-xs text-[#9CA3AF]">{rightName}</div>
        <div className="mt-1 font-mono text-2xl text-[#F59E0B]">{right}</div>
      </div>
    </div>
    <div className="mt-3 text-xs text-[#6B7280]">{detail}</div>
  </div>
);

const PlayerColumn = ({ player }) => (
  <Link
    to={`/players/${encodeURIComponent(player.name)}`}
    className="bg-[#141923] border border-[#273041] rounded-lg p-5 hover:border-[#10B981]/40 transition-colors block"
  >
    <h3 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] truncate">{player.name}</h3>
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm text-[#9CA3AF]">
      <span className="text-[#10B981]">{player.wins}W</span>
      <span className="text-[#EF4444]">{player.losses}L</span>
      <span>{player.win_rate}%</span>
      {player.elo_rating ? <span className="text-[#F59E0B]">ELO {player.elo_rating}</span> : null}
      {player.fargo ? <span className="text-[#F59E0B]">Fargo {player.fargo}</span> : null}
    </div>
  </Link>
);

const BigScore = ({ name, score, winning }) => (
  <div className={`text-center min-w-0 ${winning ? "" : "opacity-60"}`}>
    <div className="font-mono text-5xl font-semibold text-[#F3F4F6]">{score}</div>
    <div className="text-xs text-[#9CA3AF] truncate max-w-[180px] mt-1">{name}</div>
  </div>
);

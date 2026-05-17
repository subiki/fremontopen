import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarBlank, Trophy } from "@phosphor-icons/react";
import { Topbar } from "../components/Topbar";
import { fetchStats } from "../lib/api";

export default function Seasons() {
  const [stats, setStats] = useState(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchStats();
        if (cancelled) return;
        setStats(data);
        setSelectedKey((current) => current || data.season_standings?.[0]?.season_key || "");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const seasons = useMemo(() => stats?.season_standings || [], [stats?.season_standings]);
  const selected = useMemo(
    () => seasons.find((season) => season.season_key === selectedKey) || seasons[0],
    [seasons, selectedKey]
  );

  return (
    <>
      <Topbar title="Seasons" subtitle="Spring, summer, fall, and winter cumulative standings" />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="seasons-page">
        {loading ? (
          <div className="text-[#6B7280]">Loading...</div>
        ) : seasons.length === 0 ? (
          <div className="text-[#6B7280]">No season standings are available yet.</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
            <aside className="bg-[#141923] border border-[#273041] rounded-lg p-4 h-fit">
              <h2 className="font-[Outfit] text-lg font-semibold text-[#F3F4F6] px-2 mb-3">
                Season Groups
              </h2>
              <div className="space-y-2">
                {seasons.map((season) => (
                  <button
                    key={season.season_key}
                    type="button"
                    onClick={() => setSelectedKey(season.season_key)}
                    className={`w-full rounded-md border px-3 py-3 text-left transition-colors ${
                      selected?.season_key === season.season_key
                        ? "border-[#10B981]/40 bg-[#10B981]/10"
                        : "border-[#273041] bg-[#0B0E14] hover:border-[#10B981]/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-[#F3F4F6]">{season.season}</span>
                      <CalendarBlank size={15} className="text-[#9CA3AF]" />
                    </div>
                    <div className="mt-1 font-mono text-xs text-[#6B7280]">
                      {season.tournaments} tournaments / {season.matches} matches
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <section className="bg-[#141923] border border-[#273041] rounded-lg overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-[#273041] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6]">
                    {selected?.season}
                  </h1>
                  <div className="mt-1 text-sm text-[#9CA3AF]">
                    {seasonScoringLabel(selected?.points_config)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <SeasonMeta label="Tournaments" value={selected?.tournaments} />
                  <SeasonMeta label="Matches" value={selected?.matches} />
                  <SeasonMeta label="Players" value={selected?.players?.length} />
                </div>
              </div>

              {selected?.attendance_leaders?.length ? (
                <div className="border-b border-[#273041] p-5 sm:p-6" data-testid="season-attendance-panel">
                  <h2 className="font-[Outfit] text-lg font-semibold text-[#F3F4F6] mb-3">
                    Attendance Leaders
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                    {selected.attendance_leaders.slice(0, 5).map((player) => (
                      <Link
                        key={player.player}
                        to={`/players/${encodeURIComponent(player.player)}`}
                        className="rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-3 hover:border-[#10B981]/40 transition-colors"
                      >
                        <div className="truncate font-medium text-[#F3F4F6]">{player.player}</div>
                        <div className="mt-1 font-mono text-xs text-[#9CA3AF]">
                          {player.attendance} event{player.attendance === 1 ? "" : "s"} / {player.matches} matches
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-left" data-testid="season-standings-table">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-[#6B7280]">
                      <Th>Rank</Th>
                      <Th>Player</Th>
                      <Th className="text-right">Points</Th>
                      <Th className="text-right">W-L</Th>
                      <Th className="text-right">Win %</Th>
                      <Th className="text-right">Attend.</Th>
                      <Th className="text-right">Matches</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected?.players || []).map((player, index) => (
                      <tr key={player.player} className="border-t border-[#273041]/60 hover:bg-[#1E2532]/40">
                        <Td className="font-mono text-xs text-[#6B7280]">{String(index + 1).padStart(2, "0")}</Td>
                        <Td>
                          <Link
                            to={`/players/${encodeURIComponent(player.player)}`}
                            className="inline-flex items-center gap-2 text-[#F3F4F6] hover:text-[#10B981] font-medium"
                          >
                            {index === 0 ? <Trophy size={14} className="text-[#F59E0B]" /> : null}
                            {player.player}
                          </Link>
                        </Td>
                        <Td className="text-right font-mono text-[#F59E0B]">{player.points}</Td>
                        <Td className="text-right font-mono">
                          <span className="text-[#10B981]">{player.wins}</span>
                          <span className="text-[#6B7280] mx-1">-</span>
                          <span className="text-[#EF4444]">{player.losses}</span>
                        </Td>
                        <Td className="text-right font-mono text-[#9CA3AF]">{player.win_rate}%</Td>
                        <Td className="text-right font-mono text-[#9CA3AF]">{player.attendance ?? 0}</Td>
                        <Td className="text-right font-mono text-[#9CA3AF]">{player.matches}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

const seasonScoringLabel = (config = {}) => {
  const win = config?.win_points ?? 3;
  const loss = config?.loss_points ?? 1;
  return `${win} points per win, ${loss} per loss`;
};

const SeasonMeta = ({ label, value }) => (
  <div className="rounded-md border border-[#273041] bg-[#0B0E14] px-3 py-2 min-w-24">
    <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</div>
    <div className="mt-1 font-mono text-sm text-[#F3F4F6]">{value ?? "-"}</div>
  </div>
);

const Th = ({ children, className = "" }) => (
  <th className={`px-5 py-3 font-semibold ${className}`}>{children}</th>
);

const Td = ({ children, className = "" }) => (
  <td className={`px-5 py-3 text-sm text-[#F3F4F6] ${className}`}>{children}</td>
);

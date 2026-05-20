import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { StatCard } from "../components/StatCard";
import { PlayerArtCard } from "../components/PlayerArtCard";
import { WinsOverTimeChart } from "../components/charts/WinsOverTimeChart";
import { EloRatingChart } from "../components/charts/EloRatingChart";
import { PlayerFormChart } from "../components/charts/PlayerFormChart";
import { FargoEditor } from "../components/FargoEditor";
import { fetchPlayer, fetchLeaderboard, api } from "../lib/api";
import { isFollowing, toggleFollow, onFollowingChange } from "../lib/follow";
import { rankingPath } from "./StatRankings";
import { toast } from "sonner";
import {
  CaretLeft,
  Trophy,
  Target,
  Star,
  Sword,
  Crosshair,
  ShareNetwork,
  Fire,
  Scales,
  TrendUp,
  TrendDown,
  Medal,
  MagnifyingGlass,
} from "@phosphor-icons/react";

export default function PlayerDetail() {
  const { name } = useParams();
  const decoded = decodeURIComponent(name);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [following, setFollowing] = useState(isFollowing(decoded));
  const [extras, setExtras] = useState(null);

  useEffect(() => {
    setFollowing(isFollowing(decoded));
    return onFollowingChange(() => setFollowing(isFollowing(decoded)));
  }, [decoded]);

  // Load extras (streaks, titles, perf, wins-over-time)
  useEffect(() => {
    api.get(`/players/${encodeURIComponent(decoded)}/extras`)
      .then((r) => setExtras(r.data))
      .catch(() => setExtras(null));
  }, [decoded]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setData(await fetchPlayer(decoded));
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [decoded]);

  useEffect(() => {
    (async () => {
      try {
        const lb = await fetchLeaderboard(1000);
        setLeaderboard(lb);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const position = useMemo(() => {
    if (!leaderboard.length) return null;
    const idx = leaderboard.findIndex((player) => player.name === decoded);
    if (idx === -1) return null;
    return { idx: idx + 1, total: leaderboard.length };
  }, [leaderboard, decoded]);

  const p = data?.player;
  const canonicalName = p?.name || decoded;
  const matches = useMemo(() => data?.matches || [], [data?.matches]);
  const h2h = useMemo(() => data?.head_to_head || [], [data?.head_to_head]);
  const placements = extras?.placements;
  const topFinishes = placements?.top_finishes || {};
  const elo = extras?.elo || {};
  const attendance = extras?.attendance || {};
  const cash = extras?.cash || {};
  const biggestCashWin = cash?.biggest_win || null;
  const bestEventAboveElo = extras?.best_event_above_elo || null;
  const form = extras?.form || {};
  const coreResults = useMemo(() => summarizeCoreResults(matches, canonicalName), [matches, canonicalName]);
  const rankSummary = useMemo(() => summarizePlayerRanks(leaderboard, canonicalName), [leaderboard, canonicalName]);

  useEffect(() => {
    if (p?.name && p.name !== decoded) {
      navigate(`/players/${encodeURIComponent(p.name)}`, { replace: true });
    }
  }, [p?.name, decoded, navigate]);

  const rivals = useMemo(
    () => [...h2h].filter((r) => r.losses > 0).sort((a, b) => b.losses - a.losses),
    [h2h]
  );
  const victims = useMemo(
    () => [...h2h].filter((r) => r.wins > 0).sort((a, b) => b.wins - a.wins),
    [h2h]
  );

  const handleFollow = async () => {
    const now = await toggleFollow(canonicalName);
    setFollowing(now);
  };

  const sharePath = `${window.location.origin}/players/${encodeURIComponent(canonicalName)}`;
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(sharePath);
      toast.success("Share link copied to clipboard");
    } catch {
      window.prompt("Share link:", sharePath);
    }
  };

  const navActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        data-testid="share-button"
        title="Copy share link"
        className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-[#141923] border border-[#273041] text-[#9CA3AF] hover:text-[#F3F4F6] hover:border-[#10B981]/40 transition-colors"
      >
        <ShareNetwork size={14} />
        <span className="hidden sm:inline">Share</span>
      </button>
      <button
        type="button"
        onClick={handleFollow}
        data-testid="follow-button"
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
          following
            ? "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/20"
            : "bg-[#141923] border-[#273041] text-[#9CA3AF] hover:text-[#F3F4F6] hover:border-[#F59E0B]/40"
        }`}
        aria-pressed={following}
      >
        <Star size={14} weight={following ? "fill" : "regular"} />
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );

  return (
    <>
      <Topbar
        title={p?.name || decoded}
        subtitle={
          p
            ? `${p.wins}W - ${p.losses}L . ${p.win_rate}% win rate${
                position ? ` . #${position.idx} of ${position.total}` : ""
              }`
            : ""
        }
        actions={navActions}
      />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="player-detail-page">
        <Link
          to="/players"
          className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-[#10B981] mb-5"
        >
          <CaretLeft size={14} /> Back to players
        </Link>

        {loading ? (
          <div className="text-[#6B7280]">Loading...</div>
        ) : !p ? (
          <MissingPlayer name={decoded} />
        ) : (
          <>
            {p.nickname ? (
              <div className="mb-5 inline-flex rounded-md border border-[#273041] bg-[#141923] px-4 py-2 text-sm text-[#F59E0B]">
                {p.nickname}
              </div>
            ) : null}

            <section className="mb-6" data-testid="player-art-card">
              <PlayerArtCard
                player={p}
                subtitle={`${attendance.tournaments_played ?? p.tournaments_played ?? 0} tournaments . ${topFinishes.first ?? p.top_1_finishes ?? 0} titles . ELO ${elo.rating ?? p.elo_rating ?? "-"}`}
              />
            </section>

            <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6" data-testid="core-results-summary">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
                    Core Results
                  </h2>
                  <p className="mt-1 text-sm text-[#9CA3AF]">
                    Quick read on races, racks, tournament volume, and current ranking context.
                  </p>
                </div>
                <div className="text-xs font-mono text-[#6B7280]">
                  {coreResults.scoredRaces} scored race{coreResults.scoredRaces === 1 ? "" : "s"} in cache
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <SummaryCard
                  label="Races"
                  primary={`${coreResults.racesWon}-${coreResults.racesLost}`}
                  secondary={`${coreResults.racesPlayed} played`}
                  detail={`${p.win_rate}% win rate`}
                />
                <SummaryCard
                  label="Racks"
                  primary={`${coreResults.racksWon}-${coreResults.racksLost}`}
                  secondary={`${coreResults.racksPlayed} total`}
                  detail={coreResults.scoredRaces ? `${coreResults.rackDiff >= 0 ? "+" : ""}${coreResults.rackDiff} diff` : "Waiting on scored matches"}
                />
                <SummaryCard
                  label="Tournaments"
                  primary={String(attendance.tournaments_played ?? p.tournaments_played ?? 0)}
                  secondary={`${placements?.tournaments_counted ?? 0} with placement data`}
                  detail={`${topFinishes.top_4 ?? 0} top-4 finishes`}
                />
                <SummaryCard
                  label="Rank Context"
                  primary={rankSummary.overall}
                  secondary={`ELO ${rankSummary.elo}`}
                  detail={`Avg place ${rankSummary.averagePlacement}`}
                />
              </div>
            </section>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
              <StatCard label="Wins" value={p.wins} accent="text-[#10B981]" icon={Trophy} testid="pd-wins" to={rankingPath("wins")} />
              <StatCard label="Losses" value={p.losses} accent="text-[#EF4444]" icon={Target} testid="pd-losses" to={rankingPath("losses")} />
              <StatCard label="Total" value={p.wins + p.losses} testid="pd-total" to={rankingPath("total_matches")} />
              <StatCard label="Win Rate" value={`${p.win_rate}%`} accent="text-[#10B981]" testid="pd-win-rate" to={rankingPath("win_rate")} />
              <StatCard
                label="Tournaments"
                value={attendance.tournaments_played ?? p.tournaments_played ?? 0}
                icon={Trophy}
                testid="pd-tournaments-played"
                to={rankingPath("tournaments_played")}
              />
              <StatCard
                label="Attend. Streak"
                value={attendance.current_streak ?? p.attendance_streak ?? 0}
                accent="text-[#10B981]"
                icon={Fire}
                testid="pd-attendance-streak"
                to={rankingPath("attendance_streak")}
              />
              <StatCard
                label="ELO"
                value={elo.rating ?? p.elo_rating ?? "-"}
                accent="text-[#F59E0B]"
                icon={TrendUp}
                testid="pd-elo-rating"
                to={rankingPath("elo_rating")}
              />
              <StatCard
                label="ELO Peak"
                value={elo.peak ?? p.elo_peak ?? "-"}
                accent="text-[#F59E0B]"
                icon={Fire}
                testid="pd-elo-peak"
                to={rankingPath("elo_peak")}
              />
              <StatCard
                label="Schedule"
                value={p.strength_of_schedule ?? "-"}
                accent="text-[#F59E0B]"
                icon={Scales}
                testid="pd-strength-of-schedule"
                to={rankingPath("strength_of_schedule")}
              />
              <StatCard
                label="Avg Place"
                value={placements?.average ?? "-"}
                accent="text-[#F59E0B]"
                icon={Medal}
                testid="pd-average-placement"
                to={rankingPath("average_placement")}
              />
              <StatCard
                label="Cash Won"
                value={formatMoney(cash.total ?? p.cash_won)}
                accent="text-[#F59E0B]"
                icon={Medal}
                testid="pd-cash-won"
                to={rankingPath("cash_won")}
              />
              <StatCard
                label="Biggest Payout"
                value={formatMoney(biggestCashWin?.amount ?? p.biggest_tournament_cash)}
                accent="text-[#F59E0B]"
                icon={Medal}
                testid="pd-biggest-payout"
                to={rankingPath("biggest_tournament_cash")}
              />
              <StatCard
                label="1st Place"
                value={topFinishes.first ?? "-"}
                accent="text-[#F59E0B]"
                icon={Trophy}
                testid="pd-first-place"
                to={rankingPath("top_1_finishes")}
              />
              <StatCard
                label="2nd Place"
                value={topFinishes.second ?? "-"}
                icon={Medal}
                testid="pd-second-place"
                to={rankingPath("second_place_finishes")}
              />
              <StatCard
                label="3rd Place"
                value={topFinishes.third ?? "-"}
                icon={Medal}
                testid="pd-third-place"
                to={rankingPath("third_place_finishes")}
              />
              <StatCard
                label="4th Place"
                value={topFinishes.fourth ?? "-"}
                icon={Medal}
                testid="pd-fourth-place"
                to={rankingPath("fourth_place_finishes")}
              />
              <StatCard
                label="Top 4 Total"
                value={topFinishes.top_4 ?? "-"}
                icon={Medal}
                testid="pd-top-four"
                to={rankingPath("top_4_finishes")}
              />
            </div>

            <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
                  Placement Analytics
                </h2>
                <span className="text-xs text-[#6B7280]">
                  Lower average placement is better
                </span>
              </div>
              {!placements || !placements.tournaments_counted ? (
                <div className="text-[#6B7280] text-sm">
                  Placement data is not available for this player yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <PlacementStat label="Avg" value={placements.average} to={rankingPath("average_placement")} />
                  <PlacementStat label="1st" value={topFinishes.first} to={rankingPath("top_1_finishes")} />
                  <PlacementStat label="2nd" value={topFinishes.second} to={rankingPath("second_place_finishes")} />
                  <PlacementStat label="3rd" value={topFinishes.third} to={rankingPath("third_place_finishes")} />
                  <PlacementStat label="4th" value={topFinishes.fourth} to={rankingPath("fourth_place_finishes")} />
                  <PlacementStat label="Top 4" value={topFinishes.top_4} to={rankingPath("top_4_finishes")} />
                </div>
              )}
            </section>

            {(bestEventAboveElo || biggestCashWin) ? (
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {bestEventAboveElo ? (
                  <InsightCard
                    title="Best Event Above ELO"
                    value={`${bestEventAboveElo.above_expectation >= 0 ? "+" : ""}${Number(bestEventAboveElo.above_expectation || 0).toFixed(2)} wins`}
                    detail={`${bestEventAboveElo.wins}-${bestEventAboveElo.losses} in ${bestEventAboveElo.tournament_name}`}
                    meta={`Expected ${Number(bestEventAboveElo.expected_wins || 0).toFixed(2)} wins${bestEventAboveElo.place ? ` . Place ${ordinal(bestEventAboveElo.place)}` : ""}`}
                    to={`/tournaments/${bestEventAboveElo.tournament_id}`}
                  />
                ) : null}
                {biggestCashWin ? (
                  <InsightCard
                    title="Biggest Single Payout"
                    value={formatMoney(biggestCashWin.amount)}
                    detail={`${ordinal(biggestCashWin.place)} place in ${biggestCashWin.tournament_name}`}
                    meta="Estimated from tournament payout rules"
                    to={`/tournaments/${biggestCashWin.tournament_id}`}
                  />
                ) : null}
              </section>
            ) : null}

            {/* Streaks + Titles + Fargo + Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
              <StreakCard streaks={extras?.streaks} />
              <TitlesCard titles={extras?.titles} />
              <FargoEditor
                playerName={decoded}
                currentFargo={extras?.fargo}
                source={extras?.fargo_source}
                updatedAt={extras?.fargo_updated_at}
                robustness={extras?.fargo_robustness}
                onSaved={(newVal) => setExtras((e) => ({ ...(e || {}), fargo: newVal }))}
              />
              <PerfCard perf={extras?.perf_vs_fargo} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
              <section className="bg-[#141923] border border-[#273041] rounded-lg p-6" data-testid="chart-card">
                <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-4">Wins over time</h2>
                <WinsOverTimeChart data={extras?.wins_over_time || []} />
              </section>
              <section className="bg-[#141923] border border-[#273041] rounded-lg p-6" data-testid="elo-chart-card">
                <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-4">ELO rating history</h2>
                <EloRatingChart data={elo.history || []} />
              </section>
              <section className="bg-[#141923] border border-[#273041] rounded-lg p-6" data-testid="player-form-chart-card">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">Last-10 form</h2>
                  {form.latest ? (
                    <div className="text-right font-mono text-xs text-[#9CA3AF]">
                      <div className="text-[#10B981] text-sm font-semibold">{form.latest.win_rate}%</div>
                      <div>{form.latest.wins}-{form.latest.losses}</div>
                    </div>
                  ) : null}
                </div>
                <PlayerFormChart data={form.history || []} />
              </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <RivalryCard
                title="Toughest Opponents"
                subtitle={`Players who beat ${p.name} the most`}
                icon={Sword}
                accent="text-[#F59E0B]"
                rows={rivals}
                metricKey="losses"
                metricLabel="beat"
                metricColor="text-[#F59E0B]"
                playerName={p.name}
                direction="opponent-beat-player"
                emptyText="No defeats recorded."
                testid="rivals-card"
              />
              <RivalryCard
                title="Most Defeated"
                subtitle={`Players ${p.name} beat the most`}
                icon={Crosshair}
                accent="text-[#10B981]"
                rows={victims}
                metricKey="wins"
                metricLabel="beat"
                metricColor="text-[#10B981]"
                playerName={p.name}
                direction="player-beat-opponent"
                emptyText="No wins recorded."
                testid="victims-card"
              />
            </div>

            <section
              className="bg-[#141923] border border-[#273041] rounded-lg p-6"
              data-testid="match-history-card"
            >
              <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-4">
                Match History
              </h2>
              {matches.length === 0 ? (
                <div className="text-[#6B7280] text-sm">No matches.</div>
              ) : (
                <ul className="space-y-3">
                  {matches.slice(0, 50).map((m) => {
                    const won = m.winner_name === p.name;
                    const opponent = won ? m.loser_name : m.winner_name;
                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded border ${
                              won
                                ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20"
                                : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20"
                            }`}
                          >
                            {won ? "W" : "L"}
                          </span>
                          <span className="text-[#9CA3AF]">vs</span>
                          <Link
                            to={`/players/${encodeURIComponent(opponent || "")}`}
                            className="text-[#F3F4F6] hover:text-[#10B981] truncate"
                          >
                            {opponent || "-"}
                          </Link>
                          {m.tournament_name ? (
                            <Link
                              to={`/tournaments/${m.tournament_id}`}
                              className="hidden sm:inline text-xs uppercase tracking-wider text-[#6B7280] hover:text-[#9CA3AF] truncate"
                            >
                              . {m.tournament_name}
                            </Link>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-3 font-mono text-xs text-[#9CA3AF]">
                          <MatchOdds odds={m.elo_odds} />
                          {m.scores || "-"}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}

const RivalryCard = ({
  title,
  subtitle,
  icon: Icon,
  accent,
  rows,
  metricKey,
  metricLabel,
  metricColor,
  playerName,
  direction,
  emptyText,
  testid,
}) => (
  <section
    className="bg-[#141923] border border-[#273041] rounded-lg p-6"
    data-testid={testid}
  >
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">{title}</h2>
        <p className="text-xs text-[#6B7280] mt-1">{subtitle}</p>
      </div>
      <div className="w-9 h-9 rounded-md bg-[#0B0E14] border border-[#273041] flex items-center justify-center">
        <Icon size={18} weight="duotone" className={accent} />
      </div>
    </div>
    {rows.length === 0 ? (
      <div className="text-[#6B7280] text-sm">{emptyText}</div>
    ) : (
      <ul className="divide-y divide-[#273041]/60">
        {rows.slice(0, 10).map((row, i) => (
          <li
            key={row.opponent}
            className="py-3 flex items-start justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-xs text-[#6B7280] w-6 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Link
                to={`/players/${encodeURIComponent(row.opponent)}`}
                className="text-[#F3F4F6] hover:text-[#10B981] font-medium truncate"
              >
                {row.opponent}
              </Link>
            </div>
            <div className="font-mono text-sm shrink-0 max-w-[58%]">
              <div className={`${metricColor} font-semibold text-right`}>
                {row[metricKey]}x
              </div>
              <div className="text-[#6B7280] text-xs mt-1 text-right">
                {formatRivalryRecord(row, playerName, direction, metricLabel)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const formatRivalryRecord = (row, playerName, direction, verb) => {
  if (direction === "opponent-beat-player") {
    return `${row.opponent} ${verb} ${playerName} ${row.losses} times; ${playerName} beat ${row.opponent} ${row.wins} times`;
  }
  return `${playerName} ${verb} ${row.opponent} ${row.wins} times; ${row.opponent} beat ${playerName} ${row.losses} times`;
};

const PlacementStat = ({ label, value, to }) => {
  const content = (
    <>
    <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">
      {label}
    </div>
    <div className="mt-2 font-mono text-2xl font-semibold text-[#F3F4F6]">
      {value ?? "-"}
    </div>
    </>
  );
  const className = "bg-[#0B0E14] border border-[#273041] rounded-md px-4 py-3 hover:border-[#10B981]/40 transition-colors";
  return to ? (
    <Link to={to} className={className} title={`View ${label} rankings`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
};

const SummaryCard = ({ label, primary, secondary, detail }) => (
  <div className="rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-4">
    <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</div>
    <div className="mt-2 font-mono text-2xl font-semibold text-[#F3F4F6]">{primary}</div>
    <div className="mt-2 text-sm text-[#9CA3AF]">{secondary}</div>
    <div className="mt-1 text-xs text-[#6B7280]">{detail}</div>
  </div>
);

const InsightCard = ({ title, value, detail, meta, to }) => {
  const content = (
    <>
      <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">{title}</div>
      <div className="mt-3 font-mono text-2xl font-semibold text-[#F59E0B]">{value}</div>
      <div className="mt-3 text-sm text-[#F3F4F6]">{detail}</div>
      <div className="mt-1 text-xs text-[#6B7280]">{meta}</div>
    </>
  );
  const className = "bg-[#141923] border border-[#273041] rounded-lg p-6 hover:border-[#10B981]/30 transition-colors";
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
};

const summarizeCoreResults = (matches, playerName) => {
  const summary = {
    racesWon: 0,
    racesLost: 0,
    racesPlayed: 0,
    racksWon: 0,
    racksLost: 0,
    racksPlayed: 0,
    scoredRaces: 0,
    rackDiff: 0,
  };

  (matches || []).forEach((match) => {
    const won = match.winner_name === playerName;
    const lost = match.loser_name === playerName;
    if (!won && !lost) return;

    summary.racesPlayed += 1;
    if (won) summary.racesWon += 1;
    if (lost) summary.racesLost += 1;

    const parsed = parseScore(match.scores);
    if (!parsed) return;

    summary.scoredRaces += 1;
    const playerRacksWon = won ? parsed.winner : parsed.loser;
    const playerRacksLost = won ? parsed.loser : parsed.winner;
    summary.racksWon += playerRacksWon;
    summary.racksLost += playerRacksLost;
  });

  summary.racksPlayed = summary.racksWon + summary.racksLost;
  summary.rackDiff = summary.racksWon - summary.racksLost;
  return summary;
};

const summarizePlayerRanks = (leaderboard, playerName) => {
  const defaultRanks = { overall: "-", elo: "-", averagePlacement: "-" };
  if (!leaderboard?.length) return defaultRanks;

  const overallIndex = leaderboard.findIndex((player) => player.name === playerName);
  const eloRankings = [...leaderboard]
    .filter((player) => player.elo_rating !== null && player.elo_rating !== undefined)
    .sort((a, b) => (b.elo_rating ?? -Infinity) - (a.elo_rating ?? -Infinity) || a.name.localeCompare(b.name));
  const avgPlaceRankings = [...leaderboard]
    .filter((player) => player.average_placement !== null && player.average_placement !== undefined)
    .sort((a, b) => (a.average_placement ?? Infinity) - (b.average_placement ?? Infinity) || a.name.localeCompare(b.name));

  const formatRank = (index, total) => (index === -1 || !total ? "-" : `#${index + 1}/${total}`);
  return {
    overall: formatRank(overallIndex, leaderboard.length),
    elo: formatRank(eloRankings.findIndex((player) => player.name === playerName), eloRankings.length),
    averagePlacement: formatRank(avgPlaceRankings.findIndex((player) => player.name === playerName), avgPlaceRankings.length),
  };
};

const parseScore = (score) => {
  const numbers = String(score || "").match(/\d+/g)?.map(Number) || [];
  if (numbers.length < 2) return null;
  return {
    winner: numbers[0],
    loser: numbers[1],
  };
};

const MatchOdds = ({ odds }) => {
  if (!odds) return null;
  return (
    <span className="hidden md:inline text-[#F59E0B]">
      {odds.favorite} {Math.max(odds.winner_probability || 0, odds.loser_probability || 0)}% ELO
    </span>
  );
};

const ordinal = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  const mod100 = number % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  const mod10 = number % 10;
  if (mod10 === 1) return `${number}st`;
  if (mod10 === 2) return `${number}nd`;
  if (mod10 === 3) return `${number}rd`;
  return `${number}th`;
};

const formatMoney = (value) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "-";


const MissingPlayer = ({ name }) => (
  <section className="max-w-2xl bg-[#141923] border border-[#273041] rounded-lg p-6" data-testid="missing-player">
    <div className="w-12 h-12 rounded-md bg-[#0B0E14] border border-[#273041] flex items-center justify-center">
      <MagnifyingGlass size={22} weight="duotone" className="text-[#F59E0B]" />
    </div>
    <h1 className="mt-5 font-[Outfit] text-2xl font-semibold text-[#F3F4F6]">
      Player not found.
    </h1>
    <p className="mt-2 text-sm text-[#9CA3AF]">
      No cached player matches `{name}`. Try the player directory or global search.
    </p>
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        to="/players"
        className="inline-flex items-center justify-center rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-3 text-sm font-medium text-[#F3F4F6] hover:border-[#10B981]/50 hover:text-[#10B981] transition-colors"
      >
        Browse players
      </Link>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-3 text-sm font-medium text-[#F3F4F6] hover:border-[#10B981]/50 hover:text-[#10B981] transition-colors"
      >
        Dashboard search
      </Link>
    </div>
  </section>
);

const StreakCard = ({ streaks }) => {
  if (!streaks) {
    return (
      <div className="bg-[#141923] border border-[#273041] rounded-lg p-5">
        <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Streak</div>
        <div className="mt-2 font-mono text-3xl text-[#6B7280]">-</div>
      </div>
    );
  }
  const cur = streaks.current || {};
  const isW = cur.type === "W";
  const isL = cur.type === "L";
  return (
    <div className="bg-[#141923] border border-[#273041] rounded-lg p-5" data-testid="streak-card">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Current streak</div>
        <Fire size={14} weight="duotone" className="text-[#F59E0B]" />
      </div>
      <div
        className={`mt-2 font-mono text-3xl font-semibold ${
          isW ? "text-[#10B981]" : isL ? "text-[#EF4444]" : "text-[#F3F4F6]"
        }`}
      >
        {cur.length ? `${cur.length}${cur.type}` : "-"}
      </div>
      <div className="text-xs text-[#6B7280] mt-2 font-mono">
        Longest <span className="text-[#10B981]">W{streaks.longest_w}</span> . <span className="text-[#EF4444]">L{streaks.longest_l}</span>
      </div>
    </div>
  );
};

const TitlesCard = ({ titles }) => {
  if (!titles) {
    return (
      <div className="bg-[#141923] border border-[#273041] rounded-lg p-5">
        <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Tourney titles</div>
        <div className="mt-2 font-mono text-3xl text-[#6B7280]">-</div>
      </div>
    );
  }
  const items = Object.entries(titles.by_game || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="bg-[#141923] border border-[#273041] rounded-lg p-5" data-testid="titles-card">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Tourney titles</div>
        <Trophy size={14} weight="duotone" className="text-[#F59E0B]" />
      </div>
      <div className="mt-2 font-mono text-3xl font-semibold text-[#10B981]">{titles.total ?? 0}</div>
      {items.length === 0 ? (
        <div className="text-xs text-[#6B7280] mt-2">No championships yet</div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1">
          {items.map(([game, count]) => (
            <span
              key={game}
              className="text-xs font-mono px-2 py-0.5 rounded bg-[#0B0E14] border border-[#273041] text-[#9CA3AF]"
            >
              {game}: {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const PerfCard = ({ perf }) => {
  if (!perf || !perf.has_fargo) {
    return (
      <div className="bg-[#141923] border border-[#273041] rounded-lg p-5" data-testid="perf-card">
        <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Performance vs Fargo</div>
        <div className="mt-2 font-mono text-sm text-[#6B7280]">Set a Fargo rating to enable</div>
      </div>
    );
  }
  const above = perf.label === "above rating";
  const below = perf.label === "below rating";
  const Icon = above ? TrendUp : below ? TrendDown : Scales;
  const color = above ? "text-[#10B981]" : below ? "text-[#EF4444]" : "text-[#9CA3AF]";
  const score = perf.performance_score;
  const display = perf.rated_matches ? `${score >= 0 ? "+" : ""}${score.toFixed(2)}` : "-";
  return (
    <div className="bg-[#141923] border border-[#273041] rounded-lg p-5" data-testid="perf-card">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Vs Fargo</div>
        <Icon size={14} weight="duotone" className={color} />
      </div>
      <div className={`mt-2 font-mono text-3xl font-semibold ${color}`}>{display}</div>
      <div className={`text-xs mt-2 font-medium ${color}`}>
        {perf.label} <span className="text-[#6B7280] font-mono">({perf.rated_matches} rated)</span>
      </div>
    </div>
  );
};

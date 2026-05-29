import { startTransition, useEffect, useMemo, useState } from "react";
import { Topbar } from "../components/Topbar";
import { StatCard } from "../components/StatCard";
import { Trophy, Users, Target, ChartLineUp, Star, Clock, Medal, Fire, Scales, CurrencyDollar } from "@phosphor-icons/react";
import {
  fetchStats,
  fetchPlayerLookup,
  fetchLeaderboard,
  fetchH2HHeatmap,
  fetchRecentMatches,
  fetchRivalryIndex,
  fetchTournamentDurationGroups,
  fetchSingleTournamentOverperformers,
} from "../lib/api";
import { assessCacheFreshness, formatRelativeTime } from "../lib/cacheFreshness";
import { Link } from "react-router-dom";
import { getFollowing, onFollowingChange } from "../lib/follow";
import { rankingPath } from "./StatRankings";

const EMPTY_SEASON_STANDINGS = [];
const EMPTY_DASHBOARD_ARRAY = [];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);
  const [h2hHeatmap, setH2HHeatmap] = useState({ players: [], matrix: [], top_pairs: [] });
  const [recentMatches, setRecentMatches] = useState([]);
  const [rivalryIndex, setRivalryIndex] = useState([]);
  const [durationGroups, setDurationGroups] = useState([]);
  const [singleTournamentOverperformers, setSingleTournamentOverperformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [following, setFollowing] = useState(getFollowing());
  const [followedPlayers, setFollowedPlayers] = useState([]);
  const [selectedSeasonKey, setSelectedSeasonKey] = useState(null);

  const loadCore = async () => {
    setLoading(true);
    try {
      const [statsData, topPlayersData] = await Promise.all([
        fetchStats(),
        fetchLeaderboard(1000),
      ]);
      setStats(statsData);
      setTopPlayers(topPlayersData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCore();
  }, []);

  useEffect(() => {
    if (!stats) return undefined;

    let cancelled = false;
    setAnalyticsLoading(true);

    const loadDeferred = async () => {
      try {
        const [
          heatmapData,
          recentMatchesData,
          rivalryIndexData,
          durationGroupsData,
          overperformersData,
        ] = await Promise.all([
          fetchH2HHeatmap(),
          fetchRecentMatches(),
          fetchRivalryIndex(),
          fetchTournamentDurationGroups(),
          fetchSingleTournamentOverperformers(),
        ]);
        if (cancelled) return;
        startTransition(() => {
          setH2HHeatmap(heatmapData || { players: [], matrix: [], top_pairs: [] });
          setRecentMatches(recentMatchesData || []);
          setRivalryIndex(rivalryIndexData || []);
          setDurationGroups(durationGroupsData || []);
          setSingleTournamentOverperformers(overperformersData || []);
          setAnalyticsLoading(false);
        });
      } catch {
        if (!cancelled) {
          startTransition(() => setAnalyticsLoading(false));
        }
      }
    };

    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(() => {
        void loadDeferred();
      }, { timeout: 1200 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(handle);
      };
    }

    const timeout = window.setTimeout(() => {
      void loadDeferred();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [stats]);

  useEffect(() => {
    return onFollowingChange((list) => setFollowing(list));
  }, []);

  // resolve followed names to player records
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (following.length === 0) {
        setFollowedPlayers([]);
        return;
      }
      try {
        const all = await fetchPlayerLookup();
        if (cancelled) return;
        const map = new Map(all.map((p) => [p.name, p]));
        setFollowedPlayers(
          following
            .map((n) => map.get(n) || { name: n, wins: 0, losses: 0, win_rate: 0, missing: true })
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [following, stats]);

  const topTournamentWinners = stats?.top_tournament_winners || EMPTY_DASHBOARD_ARRAY;
  const upsetTracker = stats?.upset_tracker || EMPTY_DASHBOARD_ARRAY;
  const anniversary = stats?.anniversary_matches || {};
  const fieldDurationTrend = stats?.tournament_field_duration_trend || [];
  const durationExtremes = stats?.tournament_duration_extremes;
  const dashboardTrends = stats?.dashboard_trends || {};
  const cacheMetadata = stats?.cache_metadata || {};
  const seasonStandings = stats?.season_standings || EMPTY_SEASON_STANDINGS;
  const latestSeason = seasonStandings[0];
  const selectedSeason = useMemo(() => {
    if (!seasonStandings.length) return null;
    return seasonStandings.find((season) => season.season_key === selectedSeasonKey) || latestSeason;
  }, [latestSeason, seasonStandings, selectedSeasonKey]);
  const eventSeriesSummary = stats?.event_series_summary || EMPTY_DASHBOARD_ARRAY;
  const freshness = assessCacheFreshness(cacheMetadata);
  const currentAttendanceLeader = useMemo(
    () => leaderByMetric(topPlayers, "attendance_streak"),
    [topPlayers],
  );
  const bestAttendanceLeader = useMemo(
    () => leaderByMetric(topPlayers, "best_attendance_streak"),
    [topPlayers],
  );
  const weirdSignals = useMemo(
    () => buildWeirdSignals({
      recentMatches,
      topPlayers,
      rivalryIndex,
      upsetTracker,
      stats,
    }),
    [recentMatches, rivalryIndex, stats, topPlayers, upsetTracker],
  );

  useEffect(() => {
    if (!seasonStandings.length) {
      setSelectedSeasonKey(null);
      return;
    }
    if (!seasonStandings.some((season) => season.season_key === selectedSeasonKey)) {
      setSelectedSeasonKey(latestSeason?.season_key || null);
    }
  }, [latestSeason, seasonStandings, selectedSeasonKey]);

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Cached billiards intelligence - Fremont Open"
        actions={
          <a href="#weird-rift-panel" className="weird-jump-chip hidden md:inline-flex">
            Rift {weirdSignals?.rift?.feverScore ?? 0}
          </a>
        }
      />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8 space-y-8" data-testid="dashboard-page">
        <SurrealMeltPanel
          stats={stats}
          rift={weirdSignals?.rift}
          topPlayers={topPlayers}
          dashboardTrends={dashboardTrends}
        />
        <TripPrismPanel
          stats={stats}
          rift={weirdSignals?.rift}
          topPlayers={topPlayers}
          rivalryIndex={rivalryIndex}
        />

        <section
          className="weird-stats-grid grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 animate-fade-up"
          data-testid="stats-grid"
        >
          <StatCard
            label="Tournaments"
            value={stats?.total_tournaments ?? "-"}
            icon={Trophy}
            testid="stat-tournaments"
            to="/tournaments"
          />
          <StatCard
            label="Matches"
            value={stats?.total_matches ?? "-"}
            icon={Target}
            testid="stat-matches"
            to={rankingPath("total_matches")}
          />
          <StatCard
            label="Players"
            value={stats?.total_players ?? "-"}
            icon={Users}
            testid="stat-players"
            to="/players"
          />
          <StatCard
            label="Top W-L"
            value={topPlayers[0] ? `${topPlayers[0].wins}-${topPlayers[0].losses}` : "-"}
            accent="text-[#10B981]"
            icon={ChartLineUp}
            testid="stat-top-wl"
            to={rankingPath("wins")}
          />
          <StatCard
            label="Avg Field"
            value={stats?.average_tournament_players ?? "-"}
            icon={Users}
            testid="stat-avg-field"
            to="/tournaments"
          />
          <StatCard
            label="Avg Duration"
            value={stats?.average_tournament_duration_label ?? "-"}
            icon={Clock}
            testid="stat-avg-duration"
            to="/tournaments"
          />
          <StatCard
            label="Qualified Players"
            value={stats?.qualified_player_count ?? "-"}
            icon={Users}
            testid="stat-qualified-players"
            to="/leaderboard"
          />
          <StatCard
            label="Most Titles"
            value={topTournamentWinners[0] ? `${topTournamentWinners[0].wins}` : "-"}
            accent="text-[#F59E0B]"
            icon={Medal}
            testid="stat-most-titles"
            to={rankingPath("top_1_finishes")}
          />
          <StatCard
            label="Prize Pool"
            value={formatMoney(stats?.total_prize_pool)}
            accent="text-[#F59E0B]"
            icon={CurrencyDollar}
            testid="stat-prize-pool"
            to={rankingPath("cash_won")}
          />
          <StatCard
            label="Current Attend."
            value={currentAttendanceLeader ? `${currentAttendanceLeader.attendance_streak}` : "-"}
            accent="text-[#10B981]"
            icon={Fire}
            testid="stat-current-attendance-streak"
            to={rankingPath("attendance_streak")}
          />
          <StatCard
            label="Best Attend."
            value={bestAttendanceLeader ? `${bestAttendanceLeader.best_attendance_streak}` : "-"}
            accent="text-[#10B981]"
            icon={Fire}
            testid="stat-best-attendance-streak"
            to={rankingPath("best_attendance_streak")}
          />
        </section>

        <section
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6"
          data-testid="dashboard-trend-cards"
        >
          <TrendCard
            label="Latest Sync"
            value={formatDateTime(dashboardTrends.latest_sync)}
            detail={`${stats?.total_tournaments ?? "-"} tournaments cached`}
            icon={Clock}
            to="/info"
          />
          <TrendCard
            label="Active Players"
            value={dashboardTrends.active_players ?? "-"}
            detail={`${dashboardTrends.activity_match_count ?? 0} recent matches`}
            icon={Users}
            to="/players"
          />
          <TrendCard
            label="Hottest Player"
            value={dashboardTrends.hottest_player?.player || "-"}
            detail={
              dashboardTrends.hottest_player
                ? `${dashboardTrends.hottest_player.wins}-${dashboardTrends.hottest_player.losses} last ${dashboardTrends.hottest_player.matches}`
                : "No recent record"
            }
            icon={Fire}
            to={dashboardTrends.hottest_player ? `/players/${encodeURIComponent(dashboardTrends.hottest_player.player)}` : null}
          />
          <TrendCard
            label="Rivalry of the Week"
            value={dashboardTrends.closest_rivalry?.label || "-"}
            detail={
              dashboardTrends.closest_rivalry
                ? `${dashboardTrends.closest_rivalry.matches} matches, split ${dashboardTrends.closest_rivalry.a_wins}-${dashboardTrends.closest_rivalry.b_wins}`
                : "No rivalry yet"
            }
            icon={Scales}
            to={
              dashboardTrends.closest_rivalry
                ? `/compare/${encodeURIComponent(dashboardTrends.closest_rivalry.player_a)}/${encodeURIComponent(dashboardTrends.closest_rivalry.player_b)}`
                : null
            }
          />
        </section>

        <WeirdSignalsPanel signals={weirdSignals} loading={analyticsLoading && recentMatches.length === 0} />
        <WeirdRiftPanel rift={weirdSignals?.rift} loading={analyticsLoading && recentMatches.length === 0} />

        <section
          className="bg-[#141923] border border-[#273041] rounded-lg p-5 sm:p-6"
          data-testid="tournament-timing-panel"
        >
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="lg:w-72 shrink-0">
              <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
                Tourney Timing
              </h2>
              <div className="mt-1 text-sm text-[#9CA3AF]">
                Shortest and longest baseline events by game and field size
              </div>
            </div>
            <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <TimingExtremeCard label="Fastest Overall" row={durationExtremes?.shortest} />
              <TimingExtremeCard label="Slowest Overall" row={durationExtremes?.longest} />
              {durationGroups.slice(0, 2).map((group) => (
                <TimingGroupCard
                  key={`${group.game}-${group.player_count}`}
                  group={group}
                  to={tournamentArchivePath({ game: group.game, sort: "duration" })}
                />
              ))}
              {analyticsLoading && durationGroups.length === 0 ? (
                <>
                  <TimingGroupCard loading />
                  <TimingGroupCard loading />
                </>
              ) : null}
            </div>
          </div>
        </section>

        <section
          className="bg-[#141923] border border-[#273041] rounded-lg p-5 sm:p-6"
          data-testid="season-standings-panel"
        >
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="lg:w-72 shrink-0">
              <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
                Season Standings
              </h2>
              <div className="mt-1 text-sm text-[#9CA3AF]">
                {selectedSeason
                  ? `${selectedSeason.season} - ${seasonScoringLabel(selectedSeason.points_config)}`
                  : "No season data yet"}
              </div>
              <div className="mt-4 space-y-2">
                {seasonStandings.slice(0, 4).map((season) => {
                  const active = season.season_key === selectedSeason?.season_key;
                  return (
                    <button
                      type="button"
                      key={season.season_key}
                      onClick={() => setSelectedSeasonKey(season.season_key)}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? "border-[#10B981]/70 bg-[#063B32] text-[#F3F4F6]"
                          : "border-[#273041] bg-[#0B0E14] hover:border-[#10B981]/50"
                      }`}
                      aria-pressed={active}
                      data-testid={`season-selector-${season.season_key}`}
                    >
                      <span className="text-[#F3F4F6]">{season.season}</span>
                      <span className="font-mono text-xs text-[#9CA3AF]">{season.matches} matches</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <SeasonStandingsChart season={selectedSeason} />
            </div>
          </div>
        </section>

        <H2HHeatmap heatmap={h2hHeatmap} loading={analyticsLoading} />

        <section
          className="bg-[#141923] border border-[#273041] rounded-lg p-5 sm:p-6"
          data-testid="cache-metadata-panel"
        >
          <div className="flex flex-col gap-5">
            <CacheFreshnessBanner freshness={freshness} cacheMetadata={cacheMetadata} />
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div>
                <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
                  Data Cache
                </h2>
                <div className="mt-1 text-sm text-[#9CA3AF]">
                  Static Challonge snapshot for this build
                </div>
              </div>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:min-w-[680px]">
                <MetadataStat label="Generated" value={formatDateTime(cacheMetadata.generated_at)} to="/info" />
                <MetadataStat label="Last Sync" value={formatDateTime(cacheMetadata.last_synced_at)} to="/info" />
                <MetadataStat label="Tournaments" value={cacheMetadata.tournament_count ?? stats?.total_tournaments ?? "-"} to="/tournaments" />
                <MetadataStat label="Players" value={cacheMetadata.player_count ?? stats?.total_players ?? "-"} to="/players" />
              </dl>
            </div>
          </div>
        </section>

        {eventSeriesSummary.length ? (
          <section
            className="bg-[#141923] border border-[#273041] rounded-lg p-5 sm:p-6"
            data-testid="event-series-panel"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div>
                <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
                  Event Series
                </h2>
                <div className="mt-1 text-sm text-[#9CA3AF]">
                  Static grouping across Fremont Open, 4Bs, Talarico&apos;s, and other local events
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:min-w-[620px]">
                {eventSeriesSummary.map((row) => (
                  <Link
                    key={row.series}
                    to={tournamentArchivePath({ series: row.series })}
                    className="rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-3 hover:border-[#10B981]/40 transition-colors"
                  >
                    <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">
                      {row.series}
                    </div>
                    <div className="mt-2 font-mono text-2xl text-[#F3F4F6]">
                      {row.count}
                    </div>
                    <div className="mt-1 text-xs text-[#6B7280]">tournaments</div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {following.length > 0 ? (
          <section
            className="bg-[#141923] border border-[#273041] rounded-lg p-6"
            data-testid="following-card"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Star size={18} weight="fill" className="text-[#F59E0B]" />
                <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
                  Following
                </h2>
                <span className="text-xs text-[#6B7280] font-mono">
                  ({following.length})
                </span>
              </div>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {followedPlayers.map((p) => (
                <li
                  key={p.name}
                  className="bg-[#0B0E14] border border-[#273041] rounded-md px-4 py-3 hover:border-[#F59E0B]/40 transition-colors"
                  data-testid={`following-${p.name}`}
                >
                  <Link
                    to={`/players/${encodeURIComponent(p.name)}`}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[#F3F4F6] font-medium truncate">{p.name}</span>
                    {p.missing ? (
                      <span className="text-xs text-[#6B7280] font-mono">no data</span>
                    ) : (
                      <span className="font-mono text-xs">
                        <span className="text-[#10B981]">{p.wins}W</span>
                        <span className="text-[#6B7280] mx-1">.</span>
                        <span className="text-[#EF4444]">{p.losses}L</span>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          <AnalyticsList
            title="Tournament Winners"
            rows={topTournamentWinners}
            empty="No tournament winners yet."
            renderRow={(row) => (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-[#6B7280] w-6">
                    {ordinal(row.rank)}
                  </span>
                  <Link
                    to={`/players/${encodeURIComponent(row.player)}`}
                    className="text-[#F3F4F6] hover:text-[#10B981] font-medium truncate"
                  >
                    {row.player}
                  </Link>
                </div>
                <Link to={rankingPath("top_1_finishes")} className="font-mono text-sm text-[#F59E0B] hover:text-[#FBBF24]">
                  {row.wins} titles
                </Link>
              </>
            )}
          />
          <AnalyticsList
            title="Rivalry Index"
            rows={rivalryIndex.slice(0, 6)}
            loading={analyticsLoading}
            empty="No rivalry index yet."
            renderRow={(row) => (
              <>
                <Link
                  to={`/compare/${encodeURIComponent(row.player_a)}/${encodeURIComponent(row.player_b)}`}
                  className="text-[#F3F4F6] hover:text-[#10B981] font-medium truncate"
                >
                  {row.label}
                </Link>
                <Link
                  to={`/compare/${encodeURIComponent(row.player_a)}/${encodeURIComponent(row.player_b)}`}
                  className="font-mono text-xs text-[#9CA3AF] shrink-0 hover:text-[#F3F4F6]"
                >
                  {row.matches} / {row.a_wins}-{row.b_wins}
                </Link>
              </>
            )}
          />
          <AnalyticsList
            title="Above ELO in One Event"
            rows={singleTournamentOverperformers.slice(0, 6)}
            loading={analyticsLoading}
            empty="No event overperformers yet."
            renderRow={(row) => (
              <>
                <div className="min-w-0">
                  <Link
                    to={`/players/${encodeURIComponent(row.player)}`}
                    className="text-[#F3F4F6] hover:text-[#10B981] font-medium truncate"
                  >
                    {row.player}
                  </Link>
                  <div className="mt-1 text-xs text-[#6B7280] truncate">
                    <Link to={`/tournaments/${row.tournament_id}`} className="hover:text-[#9CA3AF]">
                      {row.tournament_name}
                    </Link>
                    <span className="ml-1">
                      . {row.wins}-{row.losses}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/tournaments/${row.tournament_id}`}
                  className="font-mono text-xs text-[#10B981] shrink-0 hover:text-[#34D399]"
                >
                  {row.above_expectation >= 0 ? "+" : ""}{Number(row.above_expectation || 0).toFixed(2)}
                </Link>
              </>
            )}
          />
          <AnalyticsList
            title="Upset Tracker"
            rows={upsetTracker.slice(0, 6)}
            empty="No ELO upsets yet."
            renderRow={(row) => (
              <>
                <div className="min-w-0">
                  <Link
                    to={matchDetailPath(row)}
                    className="text-[#F3F4F6] hover:text-[#10B981] font-medium truncate"
                  >
                    {row.winner}
                  </Link>
                  <div className="mt-1 text-xs text-[#6B7280] truncate">
                    def. {row.loser}
                  </div>
                </div>
                <Link
                  to={matchDetailPath(row)}
                  className="font-mono text-xs text-[#F59E0B] shrink-0 hover:text-[#FBBF24]"
                >
                  {row.winner_probability}% odds
                </Link>
              </>
            )}
          />
          <AnalyticsList
            title={anniversary.mode === "previous_season" ? "Previous Season" : "On This Week"}
            rows={anniversary.matches || []}
            empty="No anniversary matches yet."
            renderRow={(row) => (
              <>
                <div className="min-w-0">
                  <Link
                    to={matchDetailPath(row)}
                    className="text-[#F3F4F6] hover:text-[#10B981] font-medium truncate"
                  >
                    {row.winner}
                  </Link>
                  <div className="mt-1 text-xs text-[#6B7280] truncate">
                    def. {row.loser}
                  </div>
                  {row.tournament_id && row.tournament_name ? (
                    <div className="mt-1 text-xs text-[#6B7280] truncate">
                      <Link
                        to={`/tournaments/${row.tournament_id}`}
                        className="hover:text-[#9CA3AF]"
                      >
                        {row.tournament_name}
                      </Link>
                    </div>
                  ) : null}
                </div>
                <Link
                  to={matchDetailPath(row)}
                  className="font-mono text-xs text-[#9CA3AF] shrink-0 hover:text-[#F3F4F6]"
                >
                  {formatDateTimeWithYear(row.date)}
                </Link>
              </>
            )}
          />
          <AnalyticsList
            title="Field and Pace Trend"
            rows={fieldDurationTrend}
            empty="No field-vs-duration trend yet."
            renderRow={(row) => (
              <>
                <div className="min-w-0">
                  <Link
                    to={`/tournaments/${row.tournament_id}`}
                    className="text-[#F3F4F6] hover:text-[#10B981] font-medium truncate"
                  >
                    {row.tournament_name}
                  </Link>
                  <div className="mt-1 text-xs text-[#6B7280] truncate">
                    {row.game || "Unknown"} . {row.players ?? "-"} players . {row.duration_label || "-"}
                  </div>
                </div>
                <Link
                  to={`/tournaments/${row.tournament_id}`}
                  className={`font-mono text-xs shrink-0 hover:underline ${durationPaceTone(row.duration_vs_average?.status)}`}
                >
                  {row.duration_vs_average?.label || "No avg"}
                </Link>
              </>
            )}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section
            className="bg-[#141923] border border-[#273041] rounded-lg p-6"
            data-testid="top-players-card"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
                Top Players
              </h2>
              <Link
                to="/leaderboard"
                className="text-xs uppercase tracking-[0.18em] text-[#10B981] hover:underline"
              >
                Full leaderboard ->
              </Link>
            </div>
            {loading && !topPlayers.length ? (
              <div className="text-[#6B7280] text-sm">Loading...</div>
            ) : topPlayers.length === 0 ? (
              <div className="text-[#6B7280] text-sm">
                No data yet. The cache will populate after the next scheduled sync.
              </div>
            ) : (
              <ul className="divide-y divide-[#273041]/60">
                {topPlayers.slice(0, 5).map((p, i) => (
                  <li
                    key={p.name}
                    className="py-3 flex items-start justify-between gap-4"
                    data-testid={`top-player-${i}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[#6B7280] w-6">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Link
                        to={`/players/${encodeURIComponent(p.name)}`}
                        className="text-[#F3F4F6] hover:text-[#10B981] font-medium"
                      >
                        {p.name}
                      </Link>
                    </div>
                    <div className="text-right">
                      <Link to={rankingPath("wins")} className="block font-mono text-sm hover:text-[#F3F4F6]">
                        <span className="text-[#10B981]">{p.races_won ?? p.wins}W</span>
                        <span className="text-[#6B7280] mx-1">.</span>
                        <span className="text-[#EF4444]">{p.races_lost ?? p.losses}L</span>
                        <span className="text-[#6B7280] ml-2">races</span>
                      </Link>
                      <Link to={rankingPath("racks_won")} className="mt-1 block font-mono text-xs text-[#9CA3AF] hover:text-[#F3F4F6]">
                        <span className="text-[#10B981]">{p.racks_won ?? "-"}</span>
                        <span className="text-[#6B7280] mx-1">.</span>
                        <span className="text-[#EF4444]">{p.racks_lost ?? "-"}</span>
                        <span className="text-[#6B7280] ml-2">racks</span>
                      </Link>
                      <Link to={rankingPath("average_placement")} className="mt-1 block font-mono text-xs text-[#9CA3AF] hover:text-[#F3F4F6]">
                        Avg place {p.average_placement ?? "-"}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="bg-[#141923] border border-[#273041] rounded-lg p-6"
            data-testid="recent-matches-card"
          >
            <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-5">
              Recent Matches
            </h2>
            {analyticsLoading && recentMatches.length === 0 ? (
              <div className="text-[#6B7280] text-sm">Loading deferred analytics...</div>
            ) : recentMatches.length === 0 ? (
              <div className="text-[#6B7280] text-sm">No matches yet.</div>
            ) : (
              <ul className="space-y-3">
                {recentMatches.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start justify-between gap-4 text-sm"
                    data-testid={`recent-match-${m.id}`}
                  >
                    <div className="min-w-0">
                      <div className="truncate">
                        <RecentMatchName name={m.winner_name} entryType={m.winner_entry_type} tone="winner" />
                        <span className="text-[#6B7280] mx-2">def.</span>
                        <RecentMatchName name={m.loser_name} entryType={m.loser_entry_type} tone="loser" />
                      </div>
                      <div className="mt-1 font-mono text-xs text-[#6B7280]">
                        {formatDateTimeWithYear(m.completed_at)} . {formatWinnerOdds(m)} odds
                      </div>
                    </div>
                    <Link to={matchDetailPath(m)} className="font-mono text-xs text-[#9CA3AF] shrink-0 text-right hover:text-[#F3F4F6]">
                      <div className="text-[#6B7280]">
                        {m.tournament_game || "Game TBD"}
                      </div>
                      <div className="mt-1">{m.scores || "-"}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

const ordinal = (rank) => {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
};

const leaderByMetric = (players, metric) => {
  return [...players]
    .filter((player) => Number(player?.[metric] || 0) > 0)
    .sort((a, b) => {
      const diff = Number(b?.[metric] || 0) - Number(a?.[metric] || 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    })[0];
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatDateTimeWithYear = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const formatWinnerOdds = (match) => {
  const value = match?.elo_odds?.winner_probability;
  return typeof value === "number" ? `${value}%` : "-%";
};

const formatMoney = (value) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "-";

const WEIRD_COLORS = [
  "#33F4C7",
  "#FFE156",
  "#FF4FD8",
  "#7C5CFF",
  "#00E0FF",
  "#FF8A4C",
  "#9DFF57",
  "#FF3D71",
  "#4D7CFF",
  "#F7B2FF",
  "#7DFFCB",
  "#FFB000",
];

const buildWeirdSignals = ({ recentMatches, topPlayers, rivalryIndex, upsetTracker, stats }) => {
  const matches = recentMatches || [];
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdayCounts = weekdayNames.map((name) => ({ name, matches: 0 }));
  const oddsBins = [
    { name: "0-35", matches: 0 },
    { name: "36-45", matches: 0 },
    { name: "46-55", matches: 0 },
    { name: "56-70", matches: 0 },
    { name: "71+", matches: 0 },
  ];
  const rackBins = [
    { name: "tiny", matches: 0 },
    { name: "normal", matches: 0 },
    { name: "long", matches: 0 },
    { name: "marathon", matches: 0 },
  ];
  const pairCounts = new Map();

  let afterDark = 0;
  let coinFlip = 0;
  let lowOddsWins = 0;
  let longestNameMatch = null;
  let weirdestScore = null;

  matches.forEach((match) => {
    const date = new Date(match.completed_at);
    if (!Number.isNaN(date.getTime())) {
      weekdayCounts[date.getDay()].matches += 1;
      if (date.getHours() >= 21 || date.getHours() < 4) afterDark += 1;
    }

    const odds = Number(match?.elo_odds?.winner_probability);
    if (Number.isFinite(odds)) {
      if (odds <= 35) {
        oddsBins[0].matches += 1;
        lowOddsWins += 1;
      } else if (odds <= 45) {
        oddsBins[1].matches += 1;
      } else if (odds <= 55) {
        oddsBins[2].matches += 1;
        coinFlip += 1;
      } else if (odds <= 70) {
        oddsBins[3].matches += 1;
      } else {
        oddsBins[4].matches += 1;
      }
    }

    const scoreShape = scoreWeirdness(match.scores);
    if (scoreShape.racks > 0) {
      if (scoreShape.racks <= 4) rackBins[0].matches += 1;
      else if (scoreShape.racks <= 8) rackBins[1].matches += 1;
      else if (scoreShape.racks <= 12) rackBins[2].matches += 1;
      else rackBins[3].matches += 1;
      if (!weirdestScore || scoreShape.weirdness > weirdestScore.weirdness) {
        weirdestScore = { ...scoreShape, match };
      }
    }

    const names = [match.winner_name, match.loser_name].filter(Boolean);
    if (names.length === 2) {
      const key = names.map((name) => name.toLowerCase()).sort().join("::");
      pairCounts.set(key, {
        count: (pairCounts.get(key)?.count || 0) + 1,
        players: names,
      });
      const letters = names.join("").replace(/[^a-z]/gi, "").length;
      if (!longestNameMatch || letters > longestNameMatch.letters) {
        longestNameMatch = { letters, match, players: names };
      }
    }
  });

  const busiestWeekday = [...weekdayCounts].sort((a, b) => b.matches - a.matches)[0];
  const repeatPair = [...pairCounts.values()].sort((a, b) => b.count - a.count)[0];
  const bestStreak = [...topPlayers]
    .filter((player) => Number(player.attendance_streak || 0) > 0)
    .sort((a, b) => Number(b.attendance_streak || 0) - Number(a.attendance_streak || 0))[0];
  const topUpset = upsetTracker?.[0];
  const topRivalry = rivalryIndex?.[0];

  const cards = [
    {
      label: "Coin-Flip Victories",
      value: coinFlip || "-",
      detail: "Winner odds landed between 46% and 55%.",
      tone: "cyan",
      to: "/compare",
    },
    {
      label: "Low-Odds Escapes",
      value: lowOddsWins || "-",
      detail: topUpset ? `${topUpset.winner || topUpset.player || "Someone"} broke the model hardest.` : "Upset tracker is quiet.",
      tone: "pink",
      to: "/leaderboard",
    },
    {
      label: "After-Dark Matches",
      value: afterDark || "-",
      detail: "Completed after 9 PM or before 4 AM.",
      tone: "gold",
      to: "/tournaments",
    },
    {
      label: "Repeat Gravity",
      value: repeatPair?.count || "-",
      detail: repeatPair ? `${repeatPair.players[0]} vs ${repeatPair.players[1]}` : "No repeated pair in the recent slice.",
      tone: "violet",
      to: repeatPair ? `/compare/${encodeURIComponent(repeatPair.players[0])}/${encodeURIComponent(repeatPair.players[1])}` : "/compare",
    },
    {
      label: "Name-Length Collision",
      value: longestNameMatch?.letters || "-",
      detail: longestNameMatch ? `${longestNameMatch.players[0]} vs ${longestNameMatch.players[1]}` : "No name collision found.",
      tone: "blue",
      to: longestNameMatch ? matchDetailPath(longestNameMatch.match) : "/players",
    },
    {
      label: "Attendance Ritual",
      value: bestStreak?.attendance_streak || "-",
      detail: bestStreak ? `${bestStreak.name} keeps showing up.` : "No streak leader found.",
      tone: "green",
      to: bestStreak ? `/players/${encodeURIComponent(bestStreak.name)}` : "/players",
    },
    {
      label: "Score Distortion",
      value: weirdestScore?.scores || "-",
      detail: weirdestScore ? `${weirdestScore.racks} racks, spread ${weirdestScore.spread}` : "Scores are too normal right now.",
      tone: "pink",
      to: weirdestScore ? matchDetailPath(weirdestScore.match) : "/tournaments",
    },
    {
      label: "Rivalry Static",
      value: topRivalry?.matches || "-",
      detail: topRivalry?.label || "No rivalry frequency spike.",
      tone: "cyan",
      to: topRivalry ? `/compare/${encodeURIComponent(topRivalry.player_a)}/${encodeURIComponent(topRivalry.player_b)}` : "/compare",
    },
  ];

  const feverScore = clampNumber(
    Math.round(
      (coinFlip * 2.7)
        + (lowOddsWins * 4.5)
        + (afterDark * 1.9)
        + ((repeatPair?.count || 0) * 9)
        + ((topRivalry?.matches || 0) * 0.85)
        + ((weirdestScore?.weirdness || 0) * 1.15)
        + ((bestStreak?.attendance_streak || 0) * 2.2),
    ),
    0,
    999,
  );
  const maxRivalryMatches = Math.max(1, ...rivalryIndex.map((row) => Number(row.matches || 0)));
  const maxPlayerWins = Math.max(1, ...topPlayers.slice(0, 16).map((player) => Number(player.wins || 0)));
  const riftFields = [
    {
      label: "Chalk Entropy",
      value: `${clampNumber(Math.round((coinFlip / Math.max(1, matches.length)) * 300), 0, 100)}%`,
      score: clampNumber(Math.round((coinFlip / Math.max(1, matches.length)) * 300), 0, 100),
      detail: `${coinFlip || 0} recent matches lived near coin-flip odds.`,
      tone: "cyan",
      to: "/compare",
    },
    {
      label: "Table Gravity",
      value: repeatPair?.count ? `${repeatPair.count}x` : "-",
      score: clampNumber((repeatPair?.count || 0) * 18, 0, 100),
      detail: repeatPair ? `${repeatPair.players[0]} and ${repeatPair.players[1]} keep bending back together.` : "No pair is stuck in orbit.",
      tone: "violet",
      to: repeatPair ? `/compare/${encodeURIComponent(repeatPair.players[0])}/${encodeURIComponent(repeatPair.players[1])}` : "/compare",
    },
    {
      label: "Ghost Rack Index",
      value: weirdestScore?.racks || "-",
      score: clampNumber((weirdestScore?.weirdness || 0) * 4, 0, 100),
      detail: weirdestScore ? `${weirdestScore.scores} is the current score distortion.` : "Scores are not haunted enough yet.",
      tone: "pink",
      to: weirdestScore ? matchDetailPath(weirdestScore.match) : "/tournaments",
    },
    {
      label: "Bracket Fever",
      value: topUpset?.winner_probability ? `${topUpset.winner_probability}%` : `${lowOddsWins || 0}`,
      score: clampNumber(lowOddsWins * 14 + (topUpset ? 18 : 0), 0, 100),
      detail: topUpset ? `${topUpset.winner || "An underdog"} punctured the expected line.` : "The upset field is quiet.",
      tone: "gold",
      to: topUpset ? matchDetailPath(topUpset) : "/leaderboard",
    },
    {
      label: "Calendar Static",
      value: afterDark || "-",
      score: clampNumber(Math.round((afterDark / Math.max(1, matches.length)) * 420), 0, 100),
      detail: `${afterDark || 0} matches crossed the late-night rail.`,
      tone: "blue",
      to: "/tournaments",
    },
    {
      label: "Ritual Attendance",
      value: bestStreak?.attendance_streak || "-",
      score: clampNumber((bestStreak?.attendance_streak || 0) * 9, 0, 100),
      detail: bestStreak ? `${bestStreak.name} is the current return-to-table signal.` : "No active ritual has enough signal.",
      tone: "green",
      to: bestStreak ? `/players/${encodeURIComponent(bestStreak.name)}` : "/players",
    },
  ];
  const riftGlyphs = [
    ...riftFields.map((field) => ({
      label: field.label,
      value: field.value,
      score: field.score,
      tone: field.tone,
      to: field.to,
    })),
    ...topPlayers.slice(0, 4).map((player, index) => ({
      label: player.name,
      value: `${player.wins || 0}W`,
      score: clampNumber(Math.round((Number(player.wins || 0) / maxPlayerWins) * 100), 0, 100),
      tone: ["cyan", "pink", "gold", "violet"][index % 4],
      to: `/players/${encodeURIComponent(player.name)}`,
    })),
    ...rivalryIndex.slice(0, 2).map((row, index) => ({
      label: row.label,
      value: `${row.matches || 0}`,
      score: clampNumber(Math.round((Number(row.matches || 0) / maxRivalryMatches) * 100), 0, 100),
      tone: ["blue", "green"][index % 2],
      to: `/compare/${encodeURIComponent(row.player_a)}/${encodeURIComponent(row.player_b)}`,
    })),
  ].slice(0, 12);
  const riftQuestions = [
    {
      label: "What would a table whisper first?",
      answer: [...riftFields].sort((a, b) => b.score - a.score)[0]?.detail || "The cache has not formed a sentence yet.",
    },
    {
      label: "Where is the bracket least normal?",
      answer: topUpset
        ? `${topUpset.winner || "The winner"} beat the odds at ${topUpset.winner_probability ?? "-"}%.`
        : `${lowOddsWins || 0} recent winners came from the low-odds side.`,
    },
    {
      label: "Which stat is pretending to be weather?",
      answer: `${busiestWeekday?.name || "No day"} has the strongest weekday pressure with ${busiestWeekday?.matches || 0} recent matches.`,
    },
  ];

  return {
    cards,
    questions: buildWeirdQuestions({
      afterDark,
      bestStreak,
      busiestWeekday,
      coinFlip,
      lowOddsWins,
      repeatPair,
      topRivalry,
      weirdestScore,
    }),
    constellation: cards.slice(0, 6).map((card, index) => ({
      label: card.label,
      value: card.value,
      tone: card.tone,
      orbit: index + 1,
    })),
    weekdayCounts,
    oddsBins,
    rackBins,
    busiestWeekday,
    rift: {
      feverScore,
      fields: riftFields,
      glyphs: riftGlyphs,
      questions: riftQuestions,
      headline: feverScore >= 420
        ? "The room has entered full neon drift."
        : feverScore >= 180
          ? "The table is loudly suspicious."
          : "The weird signal is warming up.",
    },
    totalMatches: matches.length || stats?.total_matches || 0,
  };
};

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const scoreWeirdness = (score) => {
  const numbers = String(score || "")
    .match(/\d+/g)
    ?.map((value) => Number(value))
    .filter((value) => Number.isFinite(value)) || [];
  if (numbers.length === 0) {
    return { scores: score || "-", racks: 0, spread: 0, weirdness: 0 };
  }
  const racks = numbers.reduce((sum, value) => sum + value, 0);
  const spread = Math.max(...numbers) - Math.min(...numbers);
  const repeated = new Set(numbers).size < numbers.length ? 4 : 0;
  const close = spread <= 1 ? 5 : 0;
  const weirdness = racks + repeated + close;
  return { scores: score || "-", racks, spread, weirdness };
};

const buildWeirdQuestions = ({
  afterDark,
  bestStreak,
  busiestWeekday,
  coinFlip,
  lowOddsWins,
  repeatPair,
  topRivalry,
  weirdestScore,
}) => [
  {
    question: "Which matches felt like the table decided?",
    answer: `${coinFlip || 0} recent wins lived in the 46-55% odds fog.`,
  },
  {
    question: "Who keeps bending the calendar?",
    answer: bestStreak
      ? `${bestStreak.name} has the active attendance ritual at ${bestStreak.attendance_streak}.`
      : "No active ritual has enough signal yet.",
  },
  {
    question: "When does the room get strange?",
    answer: `${busiestWeekday?.name || "No day"} is the current weekday vortex, with ${busiestWeekday?.matches || 0} recent matches.`,
  },
  {
    question: "Which rivalry refuses to cool down?",
    answer: topRivalry?.label
      ? `${topRivalry.label} has ${topRivalry.matches} logged collisions.`
      : "No rivalry is making enough noise yet.",
  },
  {
    question: "How many outcomes ignored the script?",
    answer: `${lowOddsWins || 0} winners came from 35% odds or lower.`,
  },
  {
    question: "Which score looks least normal?",
    answer: weirdestScore
      ? `${weirdestScore.scores} carried ${weirdestScore.racks} racks and a ${weirdestScore.spread}-rack spread.`
      : "No score has distorted enough to earn a label.",
  },
  {
    question: "Who got pulled back into the same orbit?",
    answer: repeatPair
      ? `${repeatPair.players[0]} and ${repeatPair.players[1]} repeated ${repeatPair.count} times recently.`
      : "No pair is caught in repeat gravity.",
  },
  {
    question: "Did the late-night table speak?",
    answer: `${afterDark || 0} recent matches finished after 9 PM or before 4 AM.`,
  },
];

const tournamentArchivePath = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value || value === "all") return;
    query.set(key, String(value));
  });
  const suffix = query.toString();
  return suffix ? `/tournaments?${suffix}` : "/tournaments";
};

const matchAnchorId = (matchId) => `match-${encodeURIComponent(String(matchId || ""))}`;

const matchDetailPath = (row) =>
  row?.tournament_id && row?.match_id
    ? `/tournaments/${row.tournament_id}#${matchAnchorId(row.match_id)}`
    : row?.tournament_id
      ? `/tournaments/${row.tournament_id}`
      : "#";

const SurrealMeltPanel = ({ stats, rift, topPlayers, dashboardTrends }) => {
  const leadPlayer = topPlayers?.[0];
  const hotPlayer = dashboardTrends?.hottest_player;
  const fever = rift?.feverScore ?? 0;
  const meltStats = [
    {
      label: "Tables",
      value: stats?.total_tournaments ?? "-",
      detail: "events bending",
      to: "/tournaments",
      tone: "cyan",
    },
    {
      label: "Racks",
      value: stats?.total_matches ?? "-",
      detail: "matches dripping",
      to: rankingPath("total_matches"),
      tone: "gold",
    },
    {
      label: "Faces",
      value: stats?.total_players ?? "-",
      detail: "players floating",
      to: "/players",
      tone: "pink",
    },
    {
      label: "Fever",
      value: fever,
      detail: rift?.headline || "rift warming",
      to: "#weird-rift-panel",
      tone: "violet",
    },
  ];

  return (
    <section className="surreal-melt-panel" data-testid="surreal-melt-panel">
      <div className="surreal-sky" aria-hidden="true">
        <div className="surreal-sun">
          <span>8</span>
        </div>
        <div className="surreal-cue surreal-cue-a" />
        <div className="surreal-cue surreal-cue-b" />
        <div className="surreal-liquid-table">
          <span />
        </div>
        <div className="surreal-melt-ball surreal-ball-one">
          <span>{stats?.total_tournaments ?? "-"}</span>
        </div>
        <div className="surreal-melt-ball surreal-ball-two">
          <span>{stats?.total_players ?? "-"}</span>
        </div>
        <div className="surreal-melt-ball surreal-ball-three">
          <span>{fever}</span>
        </div>
      </div>

      <div className="surreal-melt-copy">
        <div className="surreal-kicker">Surreal Rack State</div>
        <h2>Stats are melting into the rails.</h2>
        <p>
          {leadPlayer
            ? `${leadPlayer.name} floats at ${leadPlayer.wins}-${leadPlayer.losses}; the table refuses to stay flat.`
            : "The cache is still warming the felt."}
        </p>
      </div>

      <div className="surreal-clock-grid">
        {meltStats.map((item, index) => (
          <Link
            key={item.label}
            to={item.to}
            className={`surreal-clock-card weird-signal-${item.tone}`}
            style={{
              "--clock-tilt": `${index % 2 === 0 ? -4 : 5}deg`,
              "--clock-color": WEIRD_COLORS[index % WEIRD_COLORS.length],
            }}
          >
            <div className="surreal-clock-face">
              <span>{item.value}</span>
            </div>
            <div>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </div>
          </Link>
        ))}
      </div>

      <div className="surreal-melt-footer">
        <Link to={hotPlayer ? `/players/${encodeURIComponent(hotPlayer.player)}` : "/leaderboard"}>
          {hotPlayer ? `${hotPlayer.player} is currently melting the form chart` : "Leaderboard liquefies here"}
        </Link>
        <Link to="/compare">Compare warped matchups</Link>
      </div>
    </section>
  );
};

const TripPrismPanel = ({ stats, rift, topPlayers, rivalryIndex }) => {
  const leadPlayer = topPlayers?.[0];
  const rivalry = rivalryIndex?.[0];
  const prismStats = [
    {
      label: "Felt Echo",
      value: stats?.total_matches ?? "-",
      detail: "match trails",
      to: rankingPath("total_matches"),
    },
    {
      label: "Prism Field",
      value: stats?.average_tournament_players ?? "-",
      detail: "avg bodies",
      to: "/tournaments",
    },
    {
      label: "Rift Heat",
      value: rift?.feverScore ?? 0,
      detail: "weird pressure",
      to: "#weird-rift-panel",
    },
    {
      label: "Orbit King",
      value: leadPlayer ? `${leadPlayer.wins}W` : "-",
      detail: leadPlayer?.name || "leaderboard",
      to: leadPlayer ? `/players/${encodeURIComponent(leadPlayer.name)}` : "/leaderboard",
    },
    {
      label: "Twin Flame",
      value: rivalry?.matches || "-",
      detail: rivalry?.label || "compare path",
      to: rivalry ? `/compare/${encodeURIComponent(rivalry.player_a)}/${encodeURIComponent(rivalry.player_b)}` : "/compare",
    },
  ];

  return (
    <section className="trip-prism-panel" data-testid="trip-prism-panel">
      <div className="trip-color-fog" aria-hidden="true" />
      <div className="trip-sparkle-field" aria-hidden="true">
        {Array.from({ length: 36 }).map((_, index) => (
          <i
            key={`trip-sparkle-${index}`}
            style={{
              "--spark-x": `${(index * 37 + 11) % 100}%`,
              "--spark-y": `${(index * 61 + 7) % 96}%`,
              "--spark-size": `${4 + (index % 4) * 2}px`,
              "--spark-color": WEIRD_COLORS[(index * 5) % WEIRD_COLORS.length],
              "--spark-delay": `${(index % 12) * -0.18}s`,
              "--spark-drift-x": `${(index % 7) * 3 - 9}px`,
              "--spark-drift-y": `${(index % 5) * -4 + 8}px`,
              "--spark-speed": `${2.2 + (index % 6) * 0.22}s`,
            }}
          />
        ))}
      </div>
      <div className="trip-fractal-field" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, clusterIndex) => (
          <div
            key={`trip-fractal-${clusterIndex}`}
            className="trip-fractal-seed"
            style={{
              "--fractal-x": `${(clusterIndex * 19 + 8) % 96}%`,
              "--fractal-y": `${(clusterIndex * 31 + 12) % 88}%`,
              "--fractal-size": `${5.8 + (clusterIndex % 3) * 1.35}rem`,
              "--fractal-mobile-size": `${(5.8 + (clusterIndex % 3) * 1.35) * 0.72}rem`,
              "--fractal-rotate": `${clusterIndex * 29 - 34}deg`,
              "--fractal-color": WEIRD_COLORS[(clusterIndex * 4) % WEIRD_COLORS.length],
              "--fractal-delay": `${clusterIndex * -0.42}s`,
            }}
          >
            {Array.from({ length: 9 }).map((_, branchIndex) => (
              <span
                key={`trip-fractal-${clusterIndex}-${branchIndex}`}
                style={{
                  "--branch-index": branchIndex + 1,
                  "--branch-angle": `${branchIndex * 40 + clusterIndex * 6}deg`,
                  "--branch-delay": `${(branchIndex + 1) * -0.09}s`,
                  "--branch-width": `${1.25 + (branchIndex + 1) * 0.16}rem`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="trip-vortex" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, index) => (
          <span
            key={`trip-ray-${index}`}
            style={{
              "--trip-angle": `${index * 12}deg`,
              "--trip-color": WEIRD_COLORS[index % WEIRD_COLORS.length],
            }}
          />
        ))}
        <div className="trip-swirl-orbits">
          {Array.from({ length: 5 }).map((_, index) => (
            <i
              key={`trip-swirl-${index}`}
              style={{
                "--swirl-index": index + 1,
                "--swirl-color": WEIRD_COLORS[(index * 3) % WEIRD_COLORS.length],
              }}
            />
          ))}
        </div>
        <div className="trip-vortex-core">
          <span>8</span>
        </div>
      </div>

      <div className="trip-prism-copy">
        <div className="trip-prism-kicker">Kaleidoscope Break</div>
        <h2>The bracket is seeing trails.</h2>
        <p>
          Mirrored cache signals, bent through pool-ball color and leaderboard gravity.
        </p>
      </div>

      <div className="trip-spectrum-strip" aria-hidden="true">
        {WEIRD_COLORS.map((color, index) => (
          <span
            key={`trip-spectrum-${color}`}
            style={{
              "--spectrum-color": color,
              "--spectrum-delay": `${index * 0.08}s`,
            }}
          />
        ))}
      </div>

      <div className="trip-prism-stat-ring">
        {prismStats.map((item, index) => (
          <Link
            key={item.label}
            to={item.to}
            className="trip-prism-card"
            style={{
              "--trip-card-color": WEIRD_COLORS[(index * 2) % WEIRD_COLORS.length],
              "--trip-card-tilt": `${index % 2 === 0 ? -3 : 3}deg`,
              "--trip-card-index": index,
            }}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </Link>
        ))}
      </div>
    </section>
  );
};

const RecentMatchName = ({ name, entryType, tone }) => {
  const isWinner = tone === "winner";
  if (entryType !== "singles_player") {
    return <span className={isWinner ? "text-[#10B981] font-medium" : "text-[#9CA3AF]"}>{name}</span>;
  }
  return (
    <Link
      to={`/players/${encodeURIComponent(name)}`}
      className={isWinner ? "text-[#10B981] hover:underline font-medium" : "text-[#9CA3AF] hover:text-[#F3F4F6]"}
    >
      {name}
    </Link>
  );
};

const WeirdSignalsPanel = ({ signals, loading }) => {
  const cards = signals?.cards || [];
  return (
    <section
      className="weird-oracle bg-[#141923] border border-[#273041] rounded-lg p-5 sm:p-6"
      data-testid="weird-signals-panel"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#F59E0B]">
              Weird Signal Lab
            </div>
            <h2 className="mt-2 font-[Outfit] text-2xl sm:text-3xl font-semibold text-[#F3F4F6]">
              Questions Nobody Asked, Until Now
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#C9C1F4]">
              Derived from cached matches: odds weather, score distortion, name collisions, late-night completions, and other useful nonsense.
            </p>
          </div>
          <div className="rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-3 font-mono text-xs text-[#9CA3AF]">
            {loading ? "warming up" : `${signals?.totalMatches || 0} matches in the signal pool`}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {cards.map((card) => (
            <WeirdSignalCard key={card.label} card={card} />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <WeirdMiniChart
            title="Weekday Vortex"
            subtitle={`Busiest recent day: ${signals?.busiestWeekday?.name || "-"}`}
            data={signals?.weekdayCounts || []}
            dataKey="matches"
          />
          <WeirdMiniChart
            title="Odds Weather"
            subtitle="How often the model was barely sure"
            data={signals?.oddsBins || []}
            dataKey="matches"
          />
          <WeirdMiniChart
            title="Score Distortion"
            subtitle="Tiny, normal, long, and marathon rack shapes"
            data={signals?.rackBins || []}
            dataKey="matches"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-4">
          <WeirdQuestionDeck questions={signals?.questions || []} />
          <WeirdConstellation nodes={signals?.constellation || []} />
        </div>
      </div>
    </section>
  );
};

const WeirdSignalCard = ({ card }) => {
  const body = (
    <div className={`weird-signal-card weird-signal-${card.tone || "cyan"} h-full rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-4`}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9C1F4]">
        {card.label}
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold text-[#F3F4F6]">
        {card.value}
      </div>
      <div className="mt-2 text-xs leading-5 text-[#C9C1F4]">
        {card.detail}
      </div>
    </div>
  );
  return card.to ? <Link to={card.to} className="block h-full">{body}</Link> : body;
};

const WeirdMiniChart = ({ title, subtitle, data, dataKey }) => {
  const maxValue = Math.max(1, ...data.map((entry) => Number(entry[dataKey] || 0)));
  return (
    <div className="weird-mini-chart rounded-md border border-[#273041] bg-[#0B0E14] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-[Outfit] text-lg font-semibold text-[#F3F4F6]">{title}</h3>
          <p className="mt-1 text-xs text-[#C9C1F4]">{subtitle}</p>
        </div>
      </div>
      <div className="weird-color-ribbon mt-4">
        {data.map((entry, index) => {
          const value = Number(entry[dataKey] || 0);
          return (
            <div key={`ribbon-${entry.name}`} className="weird-ribbon-item">
              <div
                className="weird-ribbon-fill"
                style={{
                  "--ribbon-color": WEIRD_COLORS[index % WEIRD_COLORS.length],
                  "--ribbon-power": `${Math.max(10, Math.round((value / maxValue) * 100))}%`,
                }}
              />
              <span>{entry.name}</span>
            </div>
          );
        })}
      </div>
      <div className="weird-native-bars mt-4" role="img" aria-label={`${title} bar chart`}>
        {data.map((entry, index) => {
          const value = Number(entry[dataKey] || 0);
          return (
            <div key={`native-bar-${entry.name}`} className="weird-native-bar-row">
              <span>{entry.name}</span>
              <div className="weird-native-bar-track">
                <i
                  style={{
                    "--bar-color": WEIRD_COLORS[index % WEIRD_COLORS.length],
                    width: `${Math.max(3, Math.round((value / maxValue) * 100))}%`,
                  }}
                />
              </div>
              <strong>{value}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const WeirdQuestionDeck = ({ questions }) => (
  <div className="weird-question-deck rounded-md border border-[#273041] bg-[#0B0E14] p-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="font-[Outfit] text-lg font-semibold text-[#F3F4F6]">Question Engine</h3>
        <p className="mt-1 text-xs text-[#C9C1F4]">The cache asks itself suspiciously specific things.</p>
      </div>
      <div className="weird-oracle-eye" aria-hidden="true" />
    </div>
    <div className="mt-4 grid grid-cols-1 gap-3">
      {questions.slice(0, 5).map((item) => (
        <div key={item.question} className="weird-question-row rounded-md border border-[#273041] bg-[#141923] px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFE156]">
            {item.question}
          </div>
          <div className="mt-2 text-sm leading-6 text-[#F3F4F6]">
            {item.answer}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const WeirdConstellation = ({ nodes }) => (
  <div className="weird-constellation rounded-md border border-[#273041] bg-[#0B0E14] p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-[Outfit] text-lg font-semibold text-[#F3F4F6]">Signal Constellation</h3>
        <p className="mt-1 text-xs text-[#C9C1F4]">Not scientific. Still strangely useful.</p>
      </div>
      <div className="font-mono text-xs text-[#9CA3AF]">{nodes.length} nodes</div>
    </div>
    <div className="weird-orbit-map mt-4" aria-label="Weird signal constellation">
      <div className="weird-orbit-core">
        <span>FO</span>
      </div>
      {nodes.map((node, index) => (
        <div
          key={node.label}
          className={`weird-orbit-node weird-signal-${node.tone || "cyan"}`}
          style={{
            "--orbit-angle": `${index * 58 + 12}deg`,
            "--orbit-radius": `${7.5 + (index % 3) * 2.9}rem`,
          }}
        >
          <span className="font-mono text-sm">{node.value}</span>
          <span>{node.label.replace(/-/g, " ")}</span>
        </div>
      ))}
    </div>
  </div>
);

const WeirdRiftPanel = ({ rift, loading }) => {
  const fields = rift?.fields || [];
  const glyphs = rift?.glyphs || [];
  const score = rift?.feverScore ?? 0;
  const meterScore = clampNumber(score, 0, 100);

  return (
    <section
      id="weird-rift-panel"
      className="weird-rift-panel"
      data-testid="weird-rift-panel"
    >
      <div className="weird-rift-header">
        <div>
          <div className="weird-rift-kicker">Extreme Weird Mode</div>
          <h2>Static Cache Rift</h2>
          <p>{loading ? "The rift is waiting on deferred analytics." : rift?.headline}</p>
        </div>
        <div className="weird-rift-badge">
          <span>Rift</span>
          <strong>{score}</strong>
        </div>
      </div>

      <div className="weird-rift-grid">
        <div className="weird-rift-meter" style={{ "--rift-score": `${meterScore}%` }}>
          <div className="weird-eight-ball">
            <span>8</span>
          </div>
          <div>
            <div className="weird-rift-meter-label">Weirdness Pressure</div>
            <div className="weird-rift-meter-value">{score}</div>
          </div>
        </div>

        <div className="weird-rift-wheel" aria-label="Static cache rift glyphs">
          <div className="weird-rift-core">
            <span>FO</span>
            <strong>cache</strong>
          </div>
          {glyphs.map((glyph, index) => {
            const angle = index * 30 - 88;
            const node = (
              <>
                <span>{glyph.value}</span>
                <strong>{shortCompactLabel(glyph.label)}</strong>
              </>
            );
            const className = `weird-rift-glyph weird-signal-${glyph.tone || "cyan"}`;
            const style = {
              "--rift-angle": `${angle}deg`,
              "--rift-angle-inverse": `${-angle}deg`,
              "--rift-color": WEIRD_COLORS[index % WEIRD_COLORS.length],
              "--rift-power": `${clampNumber(glyph.score || 0, 8, 100)}%`,
            };
            return glyph.to ? (
              <Link
                key={`${glyph.label}-${index}`}
                to={glyph.to}
                className={className}
                style={style}
              >
                {node}
              </Link>
            ) : (
              <div key={`${glyph.label}-${index}`} className={className} style={style}>
                {node}
              </div>
            );
          })}
        </div>

        <div className="weird-rift-lanes">
          {fields.map((field) => (
            <Link key={field.label} to={field.to} className={`weird-rift-lane weird-signal-${field.tone || "cyan"}`}>
              <div className="weird-rift-lane-top">
                <span>{field.label}</span>
                <strong>{field.value}</strong>
              </div>
              <div className="weird-rift-lane-bar">
                <span style={{ width: `${clampNumber(field.score, 3, 100)}%` }} />
              </div>
              <p>{field.detail}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="weird-rift-questions">
        {(rift?.questions || []).map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.answer}</strong>
          </div>
        ))}
      </div>
    </section>
  );
};

const TrendCard = ({ label, value, detail, icon: Icon, to }) => {
  const body = (
    <div className="weird-card weird-trend-card bg-[#141923] border border-[#273041] rounded-lg p-5 hover:border-[#10B981]/40 transition-colors h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
            {label}
          </div>
          <div className="mt-3 truncate font-[Outfit] text-2xl font-semibold text-[#F3F4F6]">
            {value}
          </div>
          <div className="mt-2 text-sm text-[#9CA3AF] truncate">
            {detail}
          </div>
        </div>
        <div className="w-10 h-10 rounded-md bg-[#0B0E14] border border-[#273041] flex items-center justify-center shrink-0">
          <Icon size={18} weight="duotone" className="text-[#10B981]" />
        </div>
      </div>
    </div>
  );

  return to ? <Link to={to} className="block h-full">{body}</Link> : body;
};

const durationPaceTone = (status) => {
  if (status === "ahead") return "text-[#10B981]";
  if (status === "behind") return "text-[#F59E0B]";
  return "text-[#9CA3AF]";
};

const MetadataStat = ({ label, value, to }) => {
  const content = (
    <>
      <dt className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-sm text-[#F3F4F6]">
        {value}
      </dd>
    </>
  );
  return to ? (
    <Link to={to} className="block rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-[#0B0E14] transition-colors">
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  );
};

const CacheFreshnessBanner = ({ freshness, cacheMetadata }) => {
  const toneClasses = {
    fresh: "border-[#14532D] bg-[#0F2218] text-[#D1FAE5]",
    aging: "border-[#7C5A14] bg-[#2A2112] text-[#FDE68A]",
    stale: "border-[#7F1D1D] bg-[#2A1313] text-[#FECACA]",
    error: "border-[#7F1D1D] bg-[#2A1313] text-[#FECACA]",
    empty: "border-[#273041] bg-[#0B0E14] text-[#D1D5DB]",
  };
  const badgeTone = toneClasses[freshness.tone] || toneClasses.empty;
  const statusLabel = cacheMetadata.sync_status || "unknown";

  return (
    <div
      className={`rounded-lg border px-4 py-4 sm:px-5 ${badgeTone}`}
      data-testid="cache-freshness-banner"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
            {freshness.label}
          </div>
          <div className="mt-2 font-[Outfit] text-xl font-semibold">
            {freshness.summary}
          </div>
          <div className="mt-1 text-sm opacity-90">
            {freshness.detail}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm lg:min-w-[280px]">
          <MetadataChip label="Sync status" value={statusLabel} to="/info" />
          <MetadataChip
            label="Export lag"
            value={formatExportLag(cacheMetadata.generated_at, cacheMetadata.last_synced_at)}
            to="/info"
          />
        </dl>
      </div>
    </div>
  );
};

const MetadataChip = ({ label, value, to }) => {
  const className = "rounded-md border border-current/20 bg-black/10 px-3 py-2";
  const content = (
    <>
      <dt className="text-[11px] uppercase tracking-[0.14em] opacity-70">{label}</dt>
      <dd className="mt-1 font-mono text-sm">{value}</dd>
    </>
  );
  return to ? (
    <Link to={to} className={`${className} block hover:bg-black/20 transition-colors`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
};

const TimingExtremeCard = ({ label, row }) => {
  const body = (
    <div className="bg-[#0B0E14] border border-[#273041] rounded-md px-4 py-3 h-full">
      <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</div>
      <div className="mt-2 font-mono text-lg text-[#F3F4F6]">
        {row?.duration_label || "-"}
      </div>
      <div className="mt-1 text-xs text-[#9CA3AF] truncate">
        {row?.tournament_name || "No timing data"}
      </div>
    </div>
  );

  return row?.tournament_id ? <Link to={`/tournaments/${row.tournament_id}`}>{body}</Link> : body;
};

const TimingGroupCard = ({ group, loading = false, to }) => {
  const body = (
    <div className="bg-[#0B0E14] border border-[#273041] rounded-md px-4 py-3 h-full">
      <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">
        {loading ? "Loading..." : `${group.game} / ${group.player_count} players`}
      </div>
      <div className="mt-2 font-mono text-sm text-[#F3F4F6]">
        {loading ? "Deferred panel" : `${group.shortest?.duration_label || "-"} - ${group.longest?.duration_label || "-"}`}
      </div>
      <div className="mt-1 text-xs text-[#9CA3AF]">
        {loading
          ? "Loads after the dashboard core cards."
          : `Avg ${group.average_label || "-"} across ${group.sample_count} event${group.sample_count === 1 ? "" : "s"}`}
      </div>
    </div>
  );
  return to && !loading ? <Link to={to} className="block h-full">{body}</Link> : body;
};

const SeasonStandingsChart = ({ season }) => {
  const data = (season?.players || []).slice(0, 6);
  if (data.length === 0) {
    return <div className="text-[#6B7280] text-sm">No season standings available.</div>;
  }
  const maxPoints = Math.max(1, ...data.map((player) => Number(player.points || 0)));

  return (
    <div className="weird-season-bars" data-testid="season-standings-chart" role="img" aria-label="Season standings bar chart">
      {data.map((player, index) => (
        <Link
          key={player.player}
          to={`/players/${encodeURIComponent(player.player)}`}
          className="weird-season-bar-row"
          style={{
            "--season-color": WEIRD_COLORS[index % WEIRD_COLORS.length],
            "--season-power": `${Math.max(4, Math.round((Number(player.points || 0) / maxPoints) * 100))}%`,
          }}
          title={`${player.player}: ${player.points} points, ${player.wins}-${player.losses}`}
        >
          <div className="weird-season-player">
            <span>{player.player}</span>
            <small>{player.wins}-{player.losses} races</small>
          </div>
          <div className="weird-season-track">
            <span />
          </div>
          <strong>{player.points}</strong>
        </Link>
      ))}
    </div>
  );
};

const H2HHeatmap = ({ heatmap, loading = false }) => {
  const players = (heatmap?.players || []).map((row) => row.player);
  const matrix = heatmap?.matrix || [];
  const activeWindowDays = heatmap?.active_window_days || 90;

  return (
    <section
      className="bg-[#141923] border border-[#273041] rounded-lg p-5 sm:p-6"
      data-testid="h2h-heatmap-panel"
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="lg:w-72 shrink-0">
          <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
            H2H Heatmap
          </h2>
          <div className="mt-1 text-sm text-[#9CA3AF]">
            Players active in the last {activeWindowDays} days by cached head-to-head volume
          </div>
        </div>
        <div className="min-w-0 flex-1">
          {loading && players.length === 0 ? (
            <div className="text-[#6B7280] text-sm">Loading deferred analytics...</div>
          ) : players.length === 0 ? (
            <div className="text-[#6B7280] text-sm">No head-to-head matrix yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-[#273041]">
              <table className="min-w-[720px] w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0B0E14]">
                    <th className="sticky left-0 z-10 bg-[#0B0E14] px-3 py-2 text-left font-semibold text-[#9CA3AF]">
                      Player
                    </th>
                    {players.map((player) => (
                      <th key={player} className="px-2 py-2 text-center font-semibold text-[#9CA3AF]">
                        <Link to={`/players/${encodeURIComponent(player)}`} className="hover:text-[#10B981]">
                          {shortName(player)}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr key={row.player} className="border-t border-[#273041]/70">
                      <th className="sticky left-0 z-10 bg-[#141923] px-3 py-2 text-left font-medium text-[#F3F4F6]">
                        <Link to={`/players/${encodeURIComponent(row.player)}`} className="hover:text-[#10B981]">
                          {row.player}
                        </Link>
                      </th>
                      {row.cells.map((cell) => (
                        <HeatmapCell key={`${row.player}-${cell.opponent}`} player={row.player} cell={cell} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const HeatmapCell = ({ player, cell }) => {
  if (!cell.matches) {
    return (
      <td className="px-2 py-2 text-center font-mono text-[#374151]">
        -
      </td>
    );
  }

  const tone = cell.win_rate >= 60
    ? "bg-[#064E3B]/75 text-[#D1FAE5]"
    : cell.win_rate <= 40
      ? "bg-[#7F1D1D]/70 text-[#FEE2E2]"
      : "bg-[#1F2937] text-[#F3F4F6]";

  return (
    <td className="p-1 text-center">
      <Link
        to={`/compare/${encodeURIComponent(player)}/${encodeURIComponent(cell.opponent)}`}
        className={`block rounded-md px-2 py-2 font-mono transition-colors hover:ring-1 hover:ring-[#10B981]/50 ${tone}`}
        title={`${player} vs ${cell.opponent}: ${cell.wins}-${cell.losses}`}
      >
        <span className="block text-sm">{cell.win_rate}%</span>
        <span className="block text-xs opacity-80">{cell.wins}-{cell.losses}</span>
      </Link>
    </td>
  );
};

const seasonScoringLabel = (config = {}) => {
  const win = config.win_points ?? 3;
  const loss = config.loss_points ?? 1;
  return `${win} pts per win, ${loss} per loss`;
};

const formatExportLag = (generatedAt, lastSyncedAt) => {
  if (!generatedAt || !lastSyncedAt) return "-";
  const generated = new Date(generatedAt);
  const synced = new Date(lastSyncedAt);
  if (Number.isNaN(generated.getTime()) || Number.isNaN(synced.getTime())) return "-";
  if (generated.getTime() < synced.getTime()) return "-";
  return formatRelativeTime(lastSyncedAt, generated.getTime());
};

const shortName = (value = "") => {
  const parts = String(value).split(" ").filter(Boolean);
  if (parts.length < 2) return value;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

const shortCompactLabel = (value = "") => {
  const words = String(value).split(/\s+/).filter(Boolean);
  if (words.length <= 2) return value;
  return words.slice(0, 2).join(" ");
};

const AnalyticsList = ({ title, rows, empty, loading = false, renderRow }) => (
  <section className="bg-[#141923] border border-[#273041] rounded-lg p-6">
    <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-4">
      {title}
    </h2>
    {loading && rows.length === 0 ? (
      <div className="text-[#6B7280] text-sm">Loading deferred analytics...</div>
    ) : rows.length === 0 ? (
      <div className="text-[#6B7280] text-sm">{empty}</div>
    ) : (
      <ul className="divide-y divide-[#273041]/60">
        {rows.map((row, index) => (
          <li
            key={row.player || row.tournament_id || index}
            className="py-3 flex items-center justify-between gap-4 text-sm"
          >
            {renderRow(row)}
          </li>
        ))}
      </ul>
    )}
  </section>
);

import { useEffect, useState } from "react";
import { Topbar } from "../components/Topbar";
import { StatCard } from "../components/StatCard";
import { Trophy, Users, Target, ChartLineUp, Star, Clock, Medal, Fire, Scales, CurrencyDollar } from "@phosphor-icons/react";
import { fetchStats, fetchPlayers } from "../lib/api";
import { Link } from "react-router-dom";
import { getFollowing, onFollowingChange } from "../lib/follow";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(getFollowing());
  const [followedPlayers, setFollowedPlayers] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      setStats(await fetchStats());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
        const all = await fetchPlayers();
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

  const topPlayers = (stats?.players || []).slice(0, 5);
  const recent = stats?.recent_matches || [];
  const topTournamentWinners = stats?.top_tournament_winners || [];
  const rivalryIndex = stats?.rivalry_index || [];
  const upsetTracker = stats?.upset_tracker || [];
  const singleTournamentOverperformers = stats?.single_tournament_overperformers || [];
  const anniversary = stats?.anniversary_matches || {};
  const fieldDurationTrend = stats?.tournament_field_duration_trend || [];
  const durationExtremes = stats?.tournament_duration_extremes;
  const durationGroups = stats?.tournament_duration_groups || [];
  const dashboardTrends = stats?.dashboard_trends || {};
  const cacheMetadata = stats?.cache_metadata || {};
  const seasonStandings = stats?.season_standings || [];
  const latestSeason = seasonStandings[0];
  const h2hHeatmap = stats?.h2h_heatmap || {};
  const eventSeriesSummary = stats?.event_series_summary || [];

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Cached billiards intelligence - Fremont Open"
      />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8 space-y-8" data-testid="dashboard-page">
        <section
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 animate-fade-up"
          data-testid="stats-grid"
        >
          <StatCard
            label="Tournaments"
            value={stats?.total_tournaments ?? "—"}
            icon={Trophy}
            testid="stat-tournaments"
          />
          <StatCard
            label="Matches"
            value={stats?.total_matches ?? "—"}
            icon={Target}
            testid="stat-matches"
          />
          <StatCard
            label="Players"
            value={stats?.total_players ?? "—"}
            icon={Users}
            testid="stat-players"
          />
          <StatCard
            label="Top W-L"
            value={topPlayers[0] ? `${topPlayers[0].wins}-${topPlayers[0].losses}` : "—"}
            accent="text-[#10B981]"
            icon={ChartLineUp}
            testid="stat-top-wl"
          />
          <StatCard
            label="Avg Field"
            value={stats?.average_tournament_players ?? "—"}
            icon={Users}
            testid="stat-avg-field"
          />
          <StatCard
            label="Avg Duration"
            value={stats?.average_tournament_duration_label ?? "—"}
            icon={Clock}
            testid="stat-avg-duration"
          />
          <StatCard
            label="Qualified Players"
            value={stats?.qualified_player_count ?? "—"}
            icon={Users}
            testid="stat-qualified-players"
          />
          <StatCard
            label="Most Titles"
            value={topTournamentWinners[0] ? `${topTournamentWinners[0].wins}` : "—"}
            accent="text-[#F59E0B]"
            icon={Medal}
            testid="stat-most-titles"
          />
          <StatCard
            label="Prize Pool"
            value={formatMoney(stats?.total_prize_pool)}
            accent="text-[#F59E0B]"
            icon={CurrencyDollar}
            testid="stat-prize-pool"
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
          />
          <TrendCard
            label="Active Players"
            value={dashboardTrends.active_players ?? "-"}
            detail={`${dashboardTrends.activity_match_count ?? 0} recent matches`}
            icon={Users}
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
                <TimingGroupCard key={`${group.game}-${group.player_count}`} group={group} />
              ))}
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
                {latestSeason
                  ? `${latestSeason.season} - ${seasonScoringLabel(latestSeason.points_config)}`
                  : "No season data yet"}
              </div>
              <div className="mt-4 space-y-2">
                {seasonStandings.slice(0, 4).map((season) => (
                  <div
                    key={season.season_key}
                    className="flex items-center justify-between rounded-md border border-[#273041] bg-[#0B0E14] px-3 py-2 text-sm"
                  >
                    <span className="text-[#F3F4F6]">{season.season}</span>
                    <span className="font-mono text-xs text-[#9CA3AF]">{season.matches} matches</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <SeasonStandingsChart season={latestSeason} />
            </div>
          </div>
        </section>

        <H2HHeatmap heatmap={h2hHeatmap} />

        <section
          className="bg-[#141923] border border-[#273041] rounded-lg p-5 sm:p-6"
          data-testid="cache-metadata-panel"
        >
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
              <MetadataStat label="Generated" value={formatDateTime(cacheMetadata.generated_at)} />
              <MetadataStat label="Last Sync" value={formatDateTime(cacheMetadata.last_synced_at)} />
              <MetadataStat label="Tournaments" value={cacheMetadata.tournament_count ?? stats?.total_tournaments ?? "-"} />
              <MetadataStat label="Players" value={cacheMetadata.player_count ?? stats?.total_players ?? "-"} />
            </dl>
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
                  <div
                    key={row.series}
                    className="rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-3"
                  >
                    <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">
                      {row.series}
                    </div>
                    <div className="mt-2 font-mono text-2xl text-[#F3F4F6]">
                      {row.count}
                    </div>
                    <div className="mt-1 text-xs text-[#6B7280]">tournaments</div>
                  </div>
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
                        <span className="text-[#6B7280] mx-1">·</span>
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
                <span className="font-mono text-sm text-[#F59E0B]">{row.wins} titles</span>
              </>
            )}
          />
          <AnalyticsList
            title="Rivalry Index"
            rows={rivalryIndex.slice(0, 6)}
            empty="No rivalry index yet."
            renderRow={(row) => (
              <>
                <Link
                  to={`/compare/${encodeURIComponent(row.player_a)}/${encodeURIComponent(row.player_b)}`}
                  className="text-[#F3F4F6] hover:text-[#10B981] font-medium truncate"
                >
                  {row.label}
                </Link>
                <span className="font-mono text-xs text-[#9CA3AF] shrink-0">
                  {row.matches} / {row.a_wins}-{row.b_wins}
                </span>
              </>
            )}
          />
          <AnalyticsList
            title="Above ELO in One Event"
            rows={singleTournamentOverperformers.slice(0, 6)}
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
                      · {row.wins}-{row.losses}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#10B981] shrink-0">
                  {row.above_expectation >= 0 ? "+" : ""}{Number(row.above_expectation || 0).toFixed(2)}
                </span>
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
                <span className="font-mono text-xs text-[#F59E0B] shrink-0">
                  {row.winner_probability}% odds
                </span>
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
                </div>
                <span className="font-mono text-xs text-[#9CA3AF] shrink-0">
                  {formatDateTime(row.date)}
                </span>
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
                    {row.game || "Unknown"} · {row.players ?? "—"} players · {row.duration_label || "—"}
                  </div>
                </div>
                <span className={`font-mono text-xs shrink-0 ${durationPaceTone(row.duration_vs_average?.status)}`}>
                  {row.duration_vs_average?.label || "No avg"}
                </span>
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
                Full leaderboard →
              </Link>
            </div>
            {loading && !topPlayers.length ? (
              <div className="text-[#6B7280] text-sm">Loading…</div>
            ) : topPlayers.length === 0 ? (
              <div className="text-[#6B7280] text-sm">
                No data yet. The cache will populate after the next scheduled sync.
              </div>
            ) : (
              <ul className="divide-y divide-[#273041]/60">
                {topPlayers.map((p, i) => (
                  <li
                    key={p.name}
                    className="py-3 flex items-center justify-between"
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
                    <div className="font-mono text-sm">
                      <span className="text-[#10B981]">{p.wins}W</span>
                      <span className="text-[#6B7280] mx-1">·</span>
                      <span className="text-[#EF4444]">{p.losses}L</span>
                      <span className="text-[#6B7280] ml-2">{p.win_rate}%</span>
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
            {recent.length === 0 ? (
              <div className="text-[#6B7280] text-sm">No matches yet.</div>
            ) : (
              <ul className="space-y-3">
                {recent.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between text-sm"
                    data-testid={`recent-match-${m.id}`}
                  >
                    <div className="min-w-0 truncate pr-3">
                      <RecentMatchName name={m.winner_name} entryType={m.winner_entry_type} tone="winner" />
                      <span className="text-[#6B7280] mx-2">def.</span>
                      <RecentMatchName name={m.loser_name} entryType={m.loser_entry_type} tone="loser" />
                    </div>
                    <div className="font-mono text-xs text-[#9CA3AF] shrink-0">
                      <span className="hidden sm:inline text-[#6B7280] mr-2">
                        {m.tournament_game || "Game TBD"}
                      </span>
                      {m.scores || "—"}
                    </div>
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

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatMoney = (value) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "-";

const matchAnchorId = (matchId) => `match-${encodeURIComponent(String(matchId || ""))}`;

const matchDetailPath = (row) =>
  row?.tournament_id && row?.match_id
    ? `/tournaments/${row.tournament_id}#${matchAnchorId(row.match_id)}`
    : row?.tournament_id
      ? `/tournaments/${row.tournament_id}`
      : "#";

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

const TrendCard = ({ label, value, detail, icon: Icon, to }) => {
  const body = (
    <div className="bg-[#141923] border border-[#273041] rounded-lg p-5 hover:border-[#10B981]/40 transition-colors h-full">
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

  return to ? <Link to={to}>{body}</Link> : body;
};

const durationPaceTone = (status) => {
  if (status === "ahead") return "text-[#10B981]";
  if (status === "behind") return "text-[#F59E0B]";
  return "text-[#9CA3AF]";
};

const MetadataStat = ({ label, value }) => (
  <div>
    <dt className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
      {label}
    </dt>
    <dd className="mt-1 font-mono text-sm text-[#F3F4F6]">
      {value}
    </dd>
  </div>
);

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

const TimingGroupCard = ({ group }) => (
  <div className="bg-[#0B0E14] border border-[#273041] rounded-md px-4 py-3 h-full">
    <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">
      {group.game} / {group.player_count} players
    </div>
    <div className="mt-2 font-mono text-sm text-[#F3F4F6]">
      {group.shortest?.duration_label || "-"} - {group.longest?.duration_label || "-"}
    </div>
    <div className="mt-1 text-xs text-[#9CA3AF]">
      Avg {group.average_label || "-"} across {group.sample_count} event{group.sample_count === 1 ? "" : "s"}
    </div>
  </div>
);

const SeasonStandingsChart = ({ season }) => {
  const data = (season?.players || []).slice(0, 6);
  if (data.length === 0) {
    return <div className="text-[#6B7280] text-sm">No season standings available.</div>;
  }

  return (
    <div className="h-72 w-full" data-testid="season-standings-chart">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#273041" strokeDasharray="3 3" />
          <XAxis
            dataKey="player"
            stroke="#6B7280"
            tick={{ fontSize: 11 }}
            interval={0}
            tickFormatter={(value) => shortName(value)}
          />
          <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#141923",
              border: "1px solid #273041",
              borderRadius: 6,
              fontSize: 12,
              color: "#F3F4F6",
            }}
            formatter={(value, name, row) => {
              if (name === "points") return [`${value} points`, row.payload.player];
              if (name === "wins") return [`${value} wins`, row.payload.player];
              return [`${value} losses`, row.payload.player];
            }}
          />
          <Bar dataKey="points" fill="#10B981" radius={[4, 4, 0, 0]} name="points" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const H2HHeatmap = ({ heatmap }) => {
  const players = (heatmap?.players || []).map((row) => row.player);
  const matrix = heatmap?.matrix || [];

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
            Top active players by cached head-to-head volume
          </div>
        </div>
        <div className="min-w-0 flex-1">
          {players.length === 0 ? (
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

const shortName = (value = "") => {
  const parts = String(value).split(" ").filter(Boolean);
  if (parts.length < 2) return value;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

const AnalyticsList = ({ title, rows, empty, renderRow }) => (
  <section className="bg-[#141923] border border-[#273041] rounded-lg p-6">
    <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-4">
      {title}
    </h2>
    {rows.length === 0 ? (
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

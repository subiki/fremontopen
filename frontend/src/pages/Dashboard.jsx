import { useEffect, useState } from "react";
import { Topbar } from "../components/Topbar";
import { StatCard } from "../components/StatCard";
import { Trophy, Users, Target, ChartLineUp, Star } from "@phosphor-icons/react";
import { fetchStats, fetchPlayers } from "../lib/api";
import { Link } from "react-router-dom";
import { getFollowing, onFollowingChange } from "../lib/follow";

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

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Live billiards intelligence — Fremont Open"
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
        </section>

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
                      <Link
                        to={`/players/${encodeURIComponent(m.winner_name)}`}
                        className="text-[#10B981] hover:underline font-medium"
                      >
                        {m.winner_name}
                      </Link>
                      <span className="text-[#6B7280] mx-2">def.</span>
                      <Link
                        to={`/players/${encodeURIComponent(m.loser_name)}`}
                        className="text-[#9CA3AF] hover:text-[#F3F4F6]"
                      >
                        {m.loser_name}
                      </Link>
                    </div>
                    <div className="font-mono text-xs text-[#9CA3AF] shrink-0">
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

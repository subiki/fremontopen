import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { Star, UserCircle, SignOut, X } from "@phosphor-icons/react";
import { fetchMe, logoutUser, unclaimPlayer } from "../lib/user_auth";
import { toast } from "sonner";

export default function MyAccount() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      setUser(await fetchMe());
    } catch {
      nav("/login", { replace: true });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const handleSignOut = () => {
    logoutUser();
    toast.success("Signed out");
    nav("/", { replace: true });
  };

  const handleUnclaim = async () => {
    if (!window.confirm("Unclaim your player profile?")) return;
    await unclaimPlayer();
    toast.success("Profile unclaimed");
    load();
  };

  return (
    <>
      <Topbar
        title="My Account"
        subtitle="Privacy-first — your identity is never shown to other players"
        actions={
          <button
            type="button"
            onClick={handleSignOut}
            data-testid="user-signout-button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-[#141923] border border-[#273041] text-[#9CA3AF] hover:text-[#F3F4F6] hover:border-[#EF4444]/40 transition-colors"
          >
            <SignOut size={14} />
            Sign out
          </button>
        }
      />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8 space-y-6" data-testid="me-page">
        {loading || !user ? (
          <div className="text-[#6B7280]">Loading…</div>
        ) : (
          <>
            <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 flex items-center gap-4">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <UserCircle size={64} weight="duotone" className="text-[#10B981]" />
              )}
              <div className="min-w-0">
                <div className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] truncate">
                  {user.display_name}
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280] mt-1">
                  Signed in via {user.provider}
                </div>
              </div>
            </section>

            <section className="bg-[#141923] border border-[#273041] rounded-lg p-6" data-testid="claimed-player-card">
              <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-3">Claimed player profile</h2>
              {user.claimed_player ? (
                <div className="flex items-center justify-between">
                  <Link
                    to={`/players/${encodeURIComponent(user.claimed_player)}`}
                    className="text-[#10B981] hover:underline font-medium"
                  >
                    {user.claimed_player}
                  </Link>
                  <button
                    type="button"
                    onClick={handleUnclaim}
                    data-testid="unclaim-button"
                    className="inline-flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#EF4444]"
                  >
                    <X size={12} /> Unclaim
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[#9CA3AF]">
                  You haven't claimed a player profile yet. Find yourself in the{" "}
                  <Link to="/players" className="text-[#10B981] hover:underline">Players list</Link> and click "This is me".
                </p>
              )}
            </section>

            <section className="bg-[#141923] border border-[#273041] rounded-lg p-6" data-testid="my-following-card">
              <div className="flex items-center gap-2 mb-4">
                <Star size={18} weight="fill" className="text-[#F59E0B]" />
                <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">Following</h2>
                <span className="text-xs text-[#6B7280] font-mono">({(user.followed_players || []).length})</span>
              </div>
              {(user.followed_players || []).length === 0 ? (
                <p className="text-sm text-[#9CA3AF]">
                  No players followed yet. Click the ★ Follow button on any player profile.
                </p>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {user.followed_players.map((name) => (
                    <li key={name}>
                      <Link
                        to={`/players/${encodeURIComponent(name)}`}
                        className="block bg-[#0B0E14] border border-[#273041] rounded-md px-4 py-3 text-sm text-[#F3F4F6] hover:border-[#F59E0B]/40 hover:text-[#F59E0B] transition-colors"
                      >
                        {name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}

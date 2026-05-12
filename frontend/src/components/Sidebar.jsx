import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  ChartLineUp,
  Trophy,
  Users,
  Ranking,
  Robot,
  Target,
  Wrench,
  UserCircle,
  SignIn,
} from "@phosphor-icons/react";
import { isLoggedIn, onAuthChange } from "../lib/auth";
import { isUserLoggedIn, onUserAuthChange, fetchMe } from "../lib/user_auth";

const baseLinks = [
  { to: "/", label: "Dashboard", icon: ChartLineUp, testid: "nav-dashboard" },
  { to: "/tournaments", label: "Tournaments", icon: Trophy, testid: "nav-tournaments" },
  { to: "/players", label: "Players", icon: Users, testid: "nav-players" },
  { to: "/leaderboard", label: "Leaderboard", icon: Ranking, testid: "nav-leaderboard" },
  { to: "/chat", label: "AI Chat", icon: Robot, testid: "nav-chat" },
];

export const Sidebar = () => {
  const [showAdmin, setShowAdmin] = useState(isLoggedIn());
  const [userLoggedIn, setUserLoggedIn] = useState(isUserLoggedIn());
  const [me, setMe] = useState(null);

  useEffect(() => onAuthChange(setShowAdmin), []);
  useEffect(() => onUserAuthChange(setUserLoggedIn), []);
  useEffect(() => {
    if (userLoggedIn) {
      fetchMe().then(setMe).catch(() => setMe(null));
    } else {
      setMe(null);
    }
  }, [userLoggedIn]);

  return (
    <aside
      className="w-64 shrink-0 border-r border-[#273041] bg-[#0B0E14] hidden md:flex md:flex-col"
      data-testid="app-sidebar"
    >
      <div className="px-6 py-7 border-b border-[#273041] flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center">
          <Target size={20} weight="duotone" className="text-[#10B981]" />
        </div>
        <div>
          <div className="font-[Outfit] font-bold text-[#F3F4F6] text-lg leading-none">CueStats</div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#6B7280] mt-1">Billiards Intel</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {baseLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            data-testid={l.testid}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
                  : "text-[#9CA3AF] hover:bg-[#141923] hover:text-[#F3F4F6] border border-transparent"
              }`
            }
          >
            <l.icon size={18} weight="duotone" />
            <span>{l.label}</span>
          </NavLink>
        ))}

        {showAdmin ? (
          <NavLink
            to="/admin"
            data-testid="nav-admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors mt-4 ${
                isActive
                  ? "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20"
                  : "text-[#9CA3AF] hover:bg-[#141923] hover:text-[#F3F4F6] border border-transparent"
              }`
            }
          >
            <Wrench size={18} weight="duotone" />
            <span>Admin</span>
          </NavLink>
        ) : null}
      </nav>

      <div className="px-3 py-3 border-t border-[#273041]">
        {userLoggedIn ? (
          <NavLink
            to="/me"
            data-testid="nav-me"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-[#10B981]/10 text-[#10B981]"
                  : "text-[#9CA3AF] hover:bg-[#141923] hover:text-[#F3F4F6]"
              }`
            }
          >
            {me?.avatar_url ? (
              <img src={me.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <UserCircle size={20} weight="duotone" />
            )}
            <span className="truncate">{me?.display_name || "My Account"}</span>
          </NavLink>
        ) : (
          <Link
            to="/login"
            data-testid="nav-signin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-[#9CA3AF] hover:bg-[#141923] hover:text-[#F3F4F6] transition-colors"
          >
            <SignIn size={18} weight="duotone" />
            <span>Sign in</span>
          </Link>
        )}
      </div>
    </aside>
  );
};

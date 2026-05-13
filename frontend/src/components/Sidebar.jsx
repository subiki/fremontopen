import { NavLink } from "react-router-dom";
import {
  ChartLineUp,
  Trophy,
  Users,
  Ranking,
  Target,
} from "@phosphor-icons/react";

const baseLinks = [
  { to: "/", label: "Dashboard", icon: ChartLineUp, testid: "nav-dashboard" },
  { to: "/tournaments", label: "Tournaments", icon: Trophy, testid: "nav-tournaments" },
  { to: "/players", label: "Players", icon: Users, testid: "nav-players" },
  { to: "/leaderboard", label: "Leaderboard", icon: Ranking, testid: "nav-leaderboard" },
];

export const Sidebar = () => {
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
      </nav>

      <div className="px-6 py-4 border-t border-[#273041] text-[11px] leading-5 text-[#6B7280]">
        Static demo cache. Refresh data by exporting a new Challonge snapshot.
      </div>
    </aside>
  );
};

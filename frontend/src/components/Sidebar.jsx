import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ChartLineUp,
  CalendarBlank,
  Trophy,
  Users,
  Ranking,
  Target,
  Scales,
  Info,
  List,
  X,
} from "@phosphor-icons/react";

const baseLinks = [
  { to: "/", label: "Dashboard", icon: ChartLineUp, testid: "nav-dashboard" },
  { to: "/tournaments", label: "Tournaments", icon: Trophy, testid: "nav-tournaments" },
  { to: "/players", label: "Players", icon: Users, testid: "nav-players" },
  { to: "/leaderboard", label: "Leaderboard", icon: Ranking, testid: "nav-leaderboard" },
  { to: "/seasons", label: "Seasons", icon: CalendarBlank, testid: "nav-seasons" },
  { to: "/compare", label: "Compare", icon: Scales, testid: "nav-compare" },
  { to: "/info", label: "Info", icon: Info, testid: "nav-info" },
];

export const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const quickLinks = baseLinks.slice(0, 4);
  const location = useLocation();
  const menuButtonRef = useRef(null);
  const drawerCloseButtonRef = useRef(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      if (wasOpenRef.current) {
        menuButtonRef.current?.focus();
      }
      wasOpenRef.current = false;
      return undefined;
    }

    wasOpenRef.current = true;
    document.body.style.overflow = "hidden";
    drawerCloseButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <aside
        className="w-64 shrink-0 border-r border-[#273041] bg-[#0B0E14] hidden md:sticky md:top-0 md:flex md:h-screen md:flex-col md:self-start"
        data-testid="app-sidebar"
      >
        <div className="px-6 py-7 border-b border-[#273041] flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center">
            <Target size={20} weight="duotone" className="text-[#10B981]" />
          </div>
          <div>
            <div className="font-[Outfit] font-bold text-[#F3F4F6] text-lg leading-none">CueStats</div>
            <div className="text-xs tracking-[0.16em] uppercase text-[#6B7280] mt-1">Billiards Intel</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Primary">
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

        <div className="px-6 py-4 border-t border-[#273041] text-xs leading-5 text-[#6B7280]">
          Static demo cache. Refresh data by exporting a new Challonge snapshot.
        </div>
      </aside>

      {open ? (
        <div id="mobile-nav-drawer" className="md:hidden fixed inset-0 z-[60]" data-testid="mobile-nav-drawer">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside
            className="absolute bottom-0 left-0 right-0 rounded-t-lg border-t border-[#273041] bg-[#0B0E14] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-nav-title"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#273041] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center">
                  <Target size={20} weight="duotone" className="text-[#10B981]" />
                </div>
                <div>
                  <div className="font-[Outfit] font-bold text-[#F3F4F6] text-lg leading-none">CueStats</div>
                  <div id="mobile-nav-title" className="text-xs tracking-[0.16em] uppercase text-[#6B7280] mt-1">Menu</div>
                </div>
              </div>
              <button
                ref={drawerCloseButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                className="w-10 h-10 rounded-md border border-[#273041] bg-[#141923] text-[#9CA3AF] flex items-center justify-center hover:text-[#F3F4F6]"
                aria-label="Close menu"
                data-testid="mobile-nav-close"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="grid grid-cols-1 gap-1 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+5.25rem)]" aria-label="Mobile primary">
              {baseLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  onClick={() => setOpen(false)}
                  data-testid={`drawer-${l.testid}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors ${
                      isActive
                        ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
                        : "text-[#9CA3AF] hover:bg-[#141923] hover:text-[#F3F4F6] border border-transparent"
                    }`
                  }
                >
                  <l.icon size={19} weight="duotone" />
                  <span>{l.label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}

      <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-[#273041] bg-[#0B0E14]/95 backdrop-blur-xl px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2"
        data-testid="mobile-bottom-nav"
        aria-label="Mobile quick navigation"
      >
        <div className="grid grid-cols-5 gap-1">
        {quickLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            data-testid={`mobile-${l.testid}`}
            className={({ isActive }) =>
              `min-h-14 flex flex-col items-center justify-center gap-1 rounded-md text-xs transition-colors ${
                isActive
                  ? "bg-[#10B981]/10 text-[#10B981]"
                  : "text-[#9CA3AF] hover:bg-[#141923] hover:text-[#F3F4F6]"
              }`
            }
          >
            <l.icon size={20} weight="duotone" />
            <span className="leading-none">{l.label}</span>
          </NavLink>
        ))}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-14 flex flex-col items-center justify-center gap-1 rounded-md text-xs text-[#9CA3AF] transition-colors hover:bg-[#141923] hover:text-[#F3F4F6]"
            aria-expanded={open}
            aria-controls="mobile-nav-drawer"
            data-testid="mobile-nav-menu-button"
          >
            <List size={20} weight="duotone" />
            <span className="leading-none">Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
};

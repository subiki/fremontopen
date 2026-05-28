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

const navColors = ["#33F4C7", "#FFE156", "#FF4FD8", "#7C5CFF", "#00E0FF", "#FF8A4C", "#9DFF57"];

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
        className="weird-command-deck hidden md:block"
        data-testid="app-sidebar"
      >
        <div className="weird-command-brand">
          <div className="weird-logo">
            <Target size={22} weight="duotone" className="text-[#10B981]" />
          </div>
          <div className="min-w-0">
            <div className="weird-brand-title">CueStats</div>
            <div className="weird-brand-subtitle">Fremont signal board</div>
          </div>
        </div>

        <nav className="weird-orbit-nav" aria-label="Primary">
          <div className="weird-orbit-center">
            <Target size={24} weight="duotone" />
            <span>OPEN</span>
          </div>
          {baseLinks.map((l, index) => {
            const angle = index * 51 - 92;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                data-testid={l.testid}
                style={{
                  "--nav-angle": `${angle}deg`,
                  "--nav-angle-inverse": `${-angle}deg`,
                  "--nav-color": navColors[index % navColors.length],
                }}
                className={({ isActive }) =>
                  `weird-nav-link weird-orbit-nav-node ${
                    isActive
                      ? "is-active"
                      : ""
                  }`
                }
              >
                <l.icon size={21} weight="duotone" />
                <span>{l.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="weird-command-readout">
          <span>Static cache</span>
          <strong>export-fed</strong>
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
            className="weird-mobile-drawer absolute bottom-0 left-0 right-0 rounded-t-lg border-t border-[#273041] bg-[#0B0E14] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-nav-title"
          >
            <div className="weird-drawer-head flex items-center justify-between gap-3 border-b border-[#273041] px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="weird-logo">
                  <Target size={20} weight="duotone" className="text-[#10B981]" />
                </div>
                <div className="min-w-0">
                  <div className="font-[Outfit] font-bold text-[#F3F4F6] text-lg leading-none">Signal Index</div>
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
            <nav className="weird-drawer-grid grid grid-cols-2 gap-2 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+5.25rem)]" aria-label="Mobile primary">
              {baseLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  onClick={() => setOpen(false)}
                  data-testid={`drawer-${l.testid}`}
                  className={({ isActive }) =>
                    `weird-nav-link weird-drawer-tile flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors ${
                      isActive
                        ? "is-active bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
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
        className="weird-bottom-nav md:hidden fixed inset-x-0 bottom-0 z-50"
        data-testid="mobile-bottom-nav"
        aria-label="Mobile quick navigation"
      >
        <div className="weird-mobile-signal-remote grid grid-cols-5 gap-1">
        {quickLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            data-testid={`mobile-${l.testid}`}
            className={({ isActive }) =>
              `weird-mobile-node min-h-14 flex flex-col items-center justify-center gap-1 rounded-md text-xs transition-colors ${
                isActive
                  ? "is-active bg-[#10B981]/10 text-[#10B981]"
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
            className="weird-mobile-node min-h-14 flex flex-col items-center justify-center gap-1 rounded-md text-xs text-[#9CA3AF] transition-colors hover:bg-[#141923] hover:text-[#F3F4F6]"
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

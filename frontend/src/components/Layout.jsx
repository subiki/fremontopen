import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { JoinBanner } from "./JoinBanner";
import { getTheme, onThemeChange } from "../lib/theme";

export const Layout = () => {
  const [theme, setTheme] = useState(getTheme());
  const location = useLocation();

  useEffect(() => onThemeChange(setTheme), []);

  return (
    <div
      className={`min-h-screen bg-[#0B0E14] flex felt-grain${theme === "weird" ? " weird-mode" : ""}`}
      data-testid="app-layout"
    >
      <a
        href="#main-content"
        className="skip-link"
        data-testid="skip-link"
      >
        Skip to main content
      </a>
      <Sidebar />
      <div
        id="main-content"
        tabIndex={-1}
        className="flex-1 min-w-0 flex flex-col pb-20 md:pb-0 focus:outline-none"
      >
        {location.pathname === "/" ? <JoinBanner /> : null}
        <Outlet />
      </div>
    </div>
  );
};

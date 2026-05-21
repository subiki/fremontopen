import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export const Layout = () => {
  return (
    <div className="min-h-screen bg-[#0B0E14] flex felt-grain" data-testid="app-layout">
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
        <Outlet />
      </div>
    </div>
  );
};

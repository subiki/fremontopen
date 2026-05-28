import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

const RouteLoading = () => (
  <div className="weird-route-loader" role="status" aria-live="polite">
    <div className="weird-route-loader-core">8</div>
    <div>
      <div className="weird-route-loader-title">Racking static signal</div>
      <div className="weird-route-loader-copy">Loading the next cache-fed view</div>
    </div>
  </div>
);

export const Layout = () => {
  return (
    <div className="weird-mode min-h-screen bg-[#0B0E14] felt-grain" data-testid="app-layout">
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
        className="weird-main min-w-0 flex flex-col pb-24 md:pb-10 focus:outline-none"
      >
        <Suspense fallback={<RouteLoading />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
};

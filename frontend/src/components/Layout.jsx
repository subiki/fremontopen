import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export const Layout = () => {
  return (
    <div className="min-h-screen bg-[#0B0E14] flex felt-grain" data-testid="app-layout">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col pb-20 md:pb-0">
        <Outlet />
      </div>
    </div>
  );
};

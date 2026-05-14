import { Link, useLocation } from "react-router-dom";
import { House, MagnifyingGlass, Trophy, Users } from "@phosphor-icons/react";
import { Topbar } from "../components/Topbar";

export default function NotFound() {
  const location = useLocation();

  return (
    <>
      <Topbar title="Page Not Found" subtitle="Static route fallback" />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="not-found-page">
        <section className="max-w-2xl bg-[#141923] border border-[#273041] rounded-lg p-6">
          <div className="w-12 h-12 rounded-md bg-[#0B0E14] border border-[#273041] flex items-center justify-center">
            <MagnifyingGlass size={22} weight="duotone" className="text-[#F59E0B]" />
          </div>
          <h1 className="mt-5 font-[Outfit] text-2xl font-semibold text-[#F3F4F6]">
            Nothing matched this route.
          </h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            The static site loaded correctly, but `{location.pathname}` is not a known Fremont Open page.
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FallbackLink to="/" icon={House} label="Dashboard" />
            <FallbackLink to="/players" icon={Users} label="Players" />
            <FallbackLink to="/tournaments" icon={Trophy} label="Tournaments" />
          </div>
        </section>
      </main>
    </>
  );
}

const FallbackLink = ({ to, icon: Icon, label }) => (
  <Link
    to={to}
    className="inline-flex items-center justify-center gap-2 rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-3 text-sm font-medium text-[#F3F4F6] hover:border-[#10B981]/50 hover:text-[#10B981] transition-colors"
  >
    <Icon size={16} />
    {label}
  </Link>
);

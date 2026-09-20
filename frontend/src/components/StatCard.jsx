import { useState } from "react";
import { Link } from "react-router-dom";
import { CashWonDetails } from "./CashWonDetails";

export const StatCard = ({ label, value, accent, icon: Icon, testid, to }) => {
  const [cashDetailsOpen, setCashDetailsOpen] = useState(false);
  const className =
    "bg-[#141923] border border-[#273041] rounded-lg p-5 sm:p-6 hover:border-[#10B981]/40 transition-all duration-300 hover:-translate-y-0.5";
  const content = (
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
          {label}
        </div>
        <div
          className={`mt-3 font-mono text-3xl sm:text-4xl font-semibold tracking-tight ${
            accent || "text-[#F3F4F6]"
          }`}
        >
          {value}
        </div>
      </div>
      {Icon ? (
        <div className="w-10 h-10 rounded-md bg-[#0B0E14] border border-[#273041] flex items-center justify-center">
          <Icon size={18} weight="duotone" className="text-[#10B981]" />
        </div>
      ) : null}
    </div>
  );

  const cashPlayerName = label === "Cash Won" ? playerNameFromPath() : null;
  if (cashPlayerName) {
    return (
      <>
        <button
          type="button"
          className={`${className} block w-full text-left`}
          data-testid={testid}
          title="View the tournaments where this player won money"
          aria-haspopup="dialog"
          onClick={() => setCashDetailsOpen(true)}
        >
          {content}
        </button>
        {cashDetailsOpen ? (
          <CashWonDetails
            playerName={cashPlayerName}
            onClose={() => setCashDetailsOpen(false)}
          />
        ) : null}
      </>
    );
  }

  if (to) {
    return (
      <Link to={to} className={`${className} block`} data-testid={testid} title={`View ${label} rankings`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className} data-testid={testid}>
      {content}
    </div>
  );
};

const playerNameFromPath = () => {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(/^\/players\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

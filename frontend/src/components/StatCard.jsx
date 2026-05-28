import { Link } from "react-router-dom";

export const StatCard = ({ label, value, accent, icon: Icon, testid, to }) => {
  const className =
    "weird-card weird-stat-card bg-[#141923] border border-[#273041] rounded-lg p-5 sm:p-6 hover:border-[#10B981]/40 transition-all duration-300 hover:-translate-y-0.5";
  const content = (
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
            {label}
          </div>
          {Icon ? (
            <div className="weird-card-icon w-10 h-10 rounded-md bg-[#0B0E14] border border-[#273041] flex items-center justify-center shrink-0">
              <Icon size={18} weight="duotone" className="text-[#10B981]" />
            </div>
          ) : null}
        </div>
        <div
          className={`mt-3 font-mono text-3xl sm:text-4xl font-semibold tracking-tight leading-tight ${
            accent || "text-[#F3F4F6]"
          }`}
        >
          {value}
        </div>
      </div>
  );

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

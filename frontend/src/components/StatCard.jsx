export const StatCard = ({ label, value, accent, icon: Icon, testid }) => {
  return (
    <div
      className="bg-[#141923] border border-[#273041] rounded-lg p-5 sm:p-6 hover:border-[#10B981]/40 transition-all duration-300 hover:-translate-y-0.5"
      data-testid={testid}
    >
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
    </div>
  );
};

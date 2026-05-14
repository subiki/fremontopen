export const FargoEditor = ({ currentFargo, source, updatedAt, robustness }) => {
  return (
    <div
      className="bg-[#141923] border border-[#273041] rounded-lg p-5 flex items-center justify-between"
      data-testid="fargo-card"
    >
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Fargo rating</div>
        <div className="mt-2 font-mono text-3xl font-semibold text-[#F59E0B]" data-testid="fargo-value">
          {currentFargo ?? "-"}
        </div>
        {!currentFargo ? (
          <div className="text-xs text-[#6B7280] mt-1">Not set</div>
        ) : (
          <div className="text-xs text-[#6B7280] mt-1 space-y-0.5">
            {robustness ? <div>{robustness} robustness</div> : null}
            {updatedAt ? <div>Updated {formatDate(updatedAt)}</div> : null}
            {source ? <div>{source}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export const FargoEditor = ({ currentFargo }) => {
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
        {!currentFargo ? <div className="text-xs text-[#6B7280] mt-1">Not set</div> : null}
      </div>
    </div>
  );
};

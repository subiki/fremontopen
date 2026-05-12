import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { fetchTournaments } from "../lib/api";
import { Trophy, ArrowSquareOut } from "@phosphor-icons/react";

const stateColor = (s) => {
  if (s === "complete" || s === "ended") return "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20";
  if (s === "underway" || s === "in_progress")
    return "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20";
  return "bg-[#273041] text-[#9CA3AF] border-[#273041]";
};

export default function Tournaments() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setList(await fetchTournaments());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Topbar
        title="Tournaments"
        subtitle={`${list.length} tournaments synced from Challonge`}
        onSyncDone={load}
      />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="tournaments-page">
        {loading && !list.length ? (
          <div className="text-[#6B7280]">Loading…</div>
        ) : list.length === 0 ? (
          <div className="text-[#6B7280]">No tournaments yet. Try Sync Now.</div>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            data-testid="tournaments-grid"
          >
            {list.map((t) => (
              <Link
                key={t.id}
                to={`/tournaments/${t.id}`}
                className="bg-[#141923] border border-[#273041] rounded-lg p-5 hover:border-[#10B981]/50 hover:-translate-y-0.5 transition-all duration-200 group"
                data-testid={`tournament-card-${t.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-md bg-[#0B0E14] border border-[#273041] flex items-center justify-center shrink-0">
                    <Trophy size={18} weight="duotone" className="text-[#F59E0B]" />
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 rounded ${stateColor(
                      t.state
                    )}`}
                  >
                    {t.state || "?"}
                  </span>
                </div>
                <h3 className="mt-4 font-[Outfit] font-semibold text-[#F3F4F6] text-lg leading-snug group-hover:text-[#10B981] transition-colors">
                  {t.name}
                </h3>
                <div className="mt-3 flex items-center justify-between text-xs text-[#6B7280]">
                  <span className="font-mono">{t.game || "—"}</span>
                  <span className="font-mono">{t.participants_count} players</span>
                </div>
                {t.url ? (
                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-[#9CA3AF] group-hover:text-[#10B981]">
                    <ArrowSquareOut size={12} /> Challonge
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

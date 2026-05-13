import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { fetchTournament } from "../lib/api";
import { CaretLeft } from "@phosphor-icons/react";

export default function TournamentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setData(await fetchTournament(id));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const t = data?.tournament;
  const matches = data?.matches || [];
  const analytics = data?.analytics || {};
  const placements = analytics.placements || [];
  const payoutsByPlace = new Map((analytics.prize_payouts || []).map((row) => [row.place, row]));

  return (
    <>
      <Topbar title={t?.name || "Tournament"} subtitle={t?.game || ""} />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="tournament-detail-page">
        <Link
          to="/tournaments"
          className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-[#10B981] mb-5"
        >
          <CaretLeft size={14} /> Back to tournaments
        </Link>

        {loading ? (
          <div className="text-[#6B7280]">Loading...</div>
        ) : !t ? (
          <div className="text-[#EF4444]">Tournament not found.</div>
        ) : (
          <>
            <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6 grid grid-cols-2 md:grid-cols-6 gap-4">
              <Info label="State" value={t.state || "-"} />
              <Info label="Game" value={t.game || "-"} />
              <Info label="Participants" value={analytics.player_count || t.participants_count || "-"} />
              <Info label="Pot" value={formatMoney(analytics.prize_pool)} />
              <Info label="Duration" value={analytics.duration_label || t.duration_label || "-"} />
              <Info label="Started" value={t.started_at ? new Date(t.started_at).toLocaleDateString() : "-"} />
            </div>

            <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
                  Top Finishers
                </h2>
                <span className="text-xs text-[#6B7280]">
                  Ties share the same placement
                </span>
              </div>
              {placements.length === 0 ? (
                <div className="text-[#6B7280] text-sm">
                  Placement data is not available for this tournament.
                </div>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {placements.slice(0, 4).map((row) => (
                    <PlacementCard
                      key={`${row.place}-${row.player}`}
                      row={row}
                      payout={payoutsByPlace.get(row.place)}
                    />
                  ))}
                </ul>
              )}
              {analytics.prize_rules ? (
                <div className="mt-4 text-xs leading-5 text-[#6B7280]">
                  {analytics.prize_rules}
                </div>
              ) : null}
            </section>

            <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-3">Matches</h2>
            <div className="bg-[#141923] border border-[#273041] rounded-lg overflow-x-auto">
              <table className="w-full text-left" data-testid="matches-table">
                <thead>
                  <tr>
                    <Th>Round</Th>
                    <Th>Winner</Th>
                    <Th>Loser</Th>
                    <Th>Score</Th>
                    <Th>State</Th>
                  </tr>
                </thead>
                <tbody>
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[#6B7280]">
                        No matches yet.
                      </td>
                    </tr>
                  ) : (
                    matches.map((m) => (
                      <tr key={m.id} className="border-t border-[#273041]/60">
                        <Td className="font-mono text-xs text-[#6B7280]">{m.round ?? "-"}</Td>
                        <Td>
                          {m.winner_name ? (
                            <Link
                              to={`/players/${encodeURIComponent(m.winner_name)}`}
                              className="text-[#10B981] hover:underline font-medium"
                            >
                              {m.winner_name}
                            </Link>
                          ) : (
                            <span className="text-[#6B7280]">TBD</span>
                          )}
                        </Td>
                        <Td>
                          {m.loser_name ? (
                            <Link
                              to={`/players/${encodeURIComponent(m.loser_name)}`}
                              className="text-[#9CA3AF] hover:text-[#F3F4F6]"
                            >
                              {m.loser_name}
                            </Link>
                          ) : (
                            <span className="text-[#6B7280]">TBD</span>
                          )}
                        </Td>
                        <Td className="font-mono text-sm">{m.scores || "-"}</Td>
                        <Td>
                          <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">
                            {m.state || "-"}
                          </span>
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}

const Info = ({ label, value }) => (
  <div>
    <div className="text-[10px] uppercase tracking-[0.2em] text-[#6B7280]">{label}</div>
    <div className="mt-1 font-mono text-[#F3F4F6]">{value}</div>
  </div>
);

const PlacementCard = ({ row, payout }) => (
  <li className="bg-[#0B0E14] border border-[#273041] rounded-md px-4 py-3">
    <div className="flex items-center justify-between gap-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#6B7280]">
        {ordinal(row.place)}
      </div>
      {payout ? (
        <div className="font-mono text-sm text-[#F59E0B]">
          {payout.split ? `Split ${formatMoney(payout.amount)}` : formatMoney(payout.amount)}
        </div>
      ) : null}
    </div>
    <Link
      to={`/players/${encodeURIComponent(row.player)}`}
      className="mt-1 block text-[#F3F4F6] hover:text-[#10B981] font-medium truncate"
    >
      {row.player}
    </Link>
  </li>
);

const formatMoney = (value) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "-";

const ordinal = (place) => {
  if (place === 1) return "1st";
  if (place === 2) return "2nd";
  if (place === 3) return "3rd";
  return `${place}th`;
};

const Th = ({ children }) => (
  <th className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] px-5 py-3">
    {children}
  </th>
);
const Td = ({ children, className = "" }) => (
  <td className={`px-5 py-3 text-sm text-[#F3F4F6] ${className}`}>{children}</td>
);

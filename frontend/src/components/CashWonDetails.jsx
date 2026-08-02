import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "@phosphor-icons/react";
import { api, fetchTournaments } from "../lib/api";
import { rankingPath } from "../pages/StatRankings";

export const CashWonDetails = ({ playerName, onClose }) => {
  const [cash, setCash] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([
      api.get(`/players/${encodeURIComponent(playerName)}/extras`),
      fetchTournaments(),
    ])
      .then(([extrasResponse, tournamentRows]) => {
        if (cancelled) return;
        setCash(extrasResponse.data?.cash || null);
        setTournaments(tournamentRows || []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerName]);

  const cashByTournament = cash?.by_tournament;
  const winnings = useMemo(() => {
    const tournamentById = new Map(
      tournaments.map((tournament) => [String(tournament.id), tournament])
    );

    return [...(cashByTournament || [])]
      .map((row) => {
        const tournament = tournamentById.get(String(row.tournament_id));
        return {
          ...row,
          player_count:
            row.player_count
            ?? tournament?.player_count
            ?? tournament?.participants_count
            ?? null,
        };
      })
      .sort((left, right) => {
        const dateCompare = String(right.date || "").localeCompare(String(left.date || ""));
        if (dateCompare !== 0) return dateCompare;
        return Number(right.amount || 0) - Number(left.amount || 0);
      });
  }, [cashByTournament, tournaments]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      data-testid="cash-won-dialog-backdrop"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-won-dialog-title"
        className="max-h-[88vh] w-full overflow-hidden rounded-t-xl border border-[#273041] bg-[#141923] shadow-2xl sm:max-w-4xl sm:rounded-xl"
        data-testid="cash-won-dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#273041] px-5 py-4 sm:px-6">
          <div>
            <h2
              id="cash-won-dialog-title"
              className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] sm:text-2xl"
            >
              How {playerName} won the money
            </h2>
            <p className="mt-1 text-sm text-[#9CA3AF]">
              Paid tournament finishes, newest first.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#273041] bg-[#0B0E14] text-[#9CA3AF] hover:border-[#10B981]/40 hover:text-[#F3F4F6]"
            aria-label="Close cash won details"
            data-testid="cash-won-dialog-close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div className="py-10 text-center text-sm text-[#9CA3AF]">
              Loading tournament winnings...
            </div>
          ) : error ? (
            <div className="rounded-md border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">
              Cash details could not be loaded. Try again after refreshing the page.
            </div>
          ) : winnings.length === 0 ? (
            <div className="rounded-md border border-[#273041] bg-[#0B0E14] p-5 text-sm text-[#9CA3AF]">
              No paid tournament finishes are available for this player.
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                    Total cash won
                  </div>
                  <div className="mt-1 font-mono text-2xl font-semibold text-[#F59E0B]">
                    {formatMoney(cash?.total)}
                  </div>
                </div>
                <div className="text-right text-sm text-[#9CA3AF]">
                  {winnings.length} paid finish{winnings.length === 1 ? "" : "es"}
                </div>
              </div>

              <div className="hidden grid-cols-[110px_minmax(0,1fr)_90px_90px_100px] gap-4 border-b border-[#273041] px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] sm:grid">
                <div>Date</div>
                <div>Tournament</div>
                <div>Place</div>
                <div>Players</div>
                <div className="text-right">Prize</div>
              </div>

              <ul className="divide-y divide-[#273041]">
                {winnings.map((row) => (
                  <li
                    key={`${row.tournament_id}-${row.place}-${row.amount}`}
                    className="grid gap-3 px-3 py-4 sm:grid-cols-[110px_minmax(0,1fr)_90px_90px_100px] sm:items-center sm:gap-4"
                  >
                    <DetailCell label="Date" value={formatDate(row.date)} />
                    <div className="min-w-0">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] sm:hidden">
                        Tournament
                      </div>
                      <Link
                        to={`/tournaments/${row.tournament_id}`}
                        className="font-medium text-[#F3F4F6] hover:text-[#10B981]"
                        onClick={onClose}
                      >
                        {row.tournament_name || `Tournament ${row.tournament_id}`}
                      </Link>
                    </div>
                    <DetailCell label="Place" value={ordinal(row.place)} />
                    <DetailCell
                      label="Players"
                      value={row.player_count == null ? "-" : String(row.player_count)}
                    />
                    <div className="sm:text-right">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] sm:hidden">
                        Prize
                      </div>
                      <div className="font-mono font-semibold text-[#F59E0B]">
                        {formatMoney(row.amount)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-col gap-3 border-t border-[#273041] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[#6B7280]">
                  {cash?.note || "Prize values are estimated from recorded tournament payout rules."}
                </p>
                <Link
                  to={rankingPath("cash_won")}
                  onClick={onClose}
                  className="text-sm font-medium text-[#10B981] hover:text-[#34D399]"
                >
                  View cash won rankings
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

const DetailCell = ({ label, value }) => (
  <div>
    <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] sm:hidden">
      {label}
    </div>
    <div className="font-mono text-sm text-[#D1D5DB]">{value}</div>
  </div>
);

const formatMoney = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const ordinal = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  const remainder100 = numeric % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${numeric}th`;
  if (numeric % 10 === 1) return `${numeric}st`;
  if (numeric % 10 === 2) return `${numeric}nd`;
  if (numeric % 10 === 3) return `${numeric}rd`;
  return `${numeric}th`;
};

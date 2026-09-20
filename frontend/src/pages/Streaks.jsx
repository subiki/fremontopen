import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarBlank,
  CaretRight,
  Clock,
  CurrencyDollar,
  Fire,
  Trophy,
} from "@phosphor-icons/react";
import { Topbar } from "../components/Topbar";

const EMPTY_RANKINGS = {
  consecutive_titles: [],
  consecutive_in_the_money: [],
};

export default function Streaks() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const base = process.env.PUBLIC_URL || "";

    fetch(`${base}/data/streak-leaders.json`, { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) throw new Error("Tournament streak data is not available yet.");
        return response.json();
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason?.message || "Unable to load tournament streaks.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rankings = data?.rankings || EMPTY_RANKINGS;
  const titleLeader = rankings.consecutive_titles?.[0];
  const moneyLeader = rankings.consecutive_in_the_money?.[0];
  const generatedLabel = useMemo(() => formatGeneratedAt(data?.generated_at), [data?.generated_at]);

  return (
    <>
      <Topbar
        title="Tournament Streaks"
        subtitle="Best consecutive title and in-the-money runs"
      />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8 space-y-8" data-testid="streaks-page">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Streak leaders summary">
          <SummaryCard
            label="Consecutive Titles"
            player={titleLeader?.player}
            value={titleLeader?.streak}
            icon={Trophy}
            accent="text-[#F59E0B]"
          />
          <SummaryCard
            label="In the Money"
            player={moneyLeader?.player}
            value={moneyLeader?.streak}
            icon={CurrencyDollar}
            accent="text-[#10B981]"
          />
          <div className="rounded-lg border border-[#273041] bg-[#141923] p-5">
            <Clock size={22} weight="duotone" className="text-[#9CA3AF]" />
            <div className="mt-4 text-xs uppercase tracking-[0.16em] text-[#6B7280]">Updated</div>
            <div className="mt-2 font-[Outfit] text-lg font-semibold text-[#F3F4F6]">
              {generatedLabel || (error ? "Unavailable" : "Loading...")}
            </div>
            <div className="mt-1 text-sm text-[#9CA3AF]">
              {data?.source?.tournament_files
                ? `${data.source.tournament_files} tournament exports analyzed`
                : "Generated from tournament history"}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#273041] bg-[#10151F] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Fire size={24} weight="duotone" className="mt-0.5 shrink-0 text-[#10B981]" />
            <div>
              <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">How streaks work</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-[#CBD5E1]">
                Streaks follow each player&apos;s consecutive appearances. Skipping a tournament does not
                break or extend a run. A title streak ends with any non-win appearance; an in-the-money
                streak ends with an appearance that has no recorded payout or paid placement.
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-lg border border-[#7F1D1D] bg-[#450A0A]/40 p-6" role="alert">
            <h2 className="font-[Outfit] text-xl font-semibold text-[#FCA5A5]">Streak data unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-[#FECACA]">{error}</p>
          </section>
        ) : null}

        {!data && !error ? <LoadingState /> : null}

        {data ? (
          <section className="grid grid-cols-1 2xl:grid-cols-2 gap-6" aria-label="Top tournament streaks">
            <StreakRanking
              title="Most Consecutive Tournament Wins"
              description="Best title runs across consecutive appearances"
              rows={rankings.consecutive_titles || []}
              icon={Trophy}
              testid="consecutive-title-rankings"
            />
            <StreakRanking
              title="Most Consecutive In-the-Money Finishes"
              description="Best paid runs across consecutive appearances"
              rows={rankings.consecutive_in_the_money || []}
              icon={CurrencyDollar}
              testid="consecutive-money-rankings"
            />
          </section>
        ) : null}
      </main>
    </>
  );
}

function SummaryCard({ label, player, value, icon: Icon, accent }) {
  return (
    <div className="rounded-lg border border-[#273041] bg-[#141923] p-5">
      <Icon size={22} weight="duotone" className={accent} />
      <div className="mt-4 text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</div>
      <div className={`mt-2 font-mono text-3xl font-bold ${accent}`}>{value ?? "-"}</div>
      <div className="mt-1 min-h-6 text-sm text-[#CBD5E1]">
        {player ? (
          <Link className="hover:text-[#10B981]" to={`/players/${encodeURIComponent(player)}`}>
            {player}
          </Link>
        ) : (
          "Loading leader"
        )}
      </div>
    </div>
  );
}

function StreakRanking({ title, description, rows, icon: Icon, testid }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#273041] bg-[#141923]" data-testid={testid}>
      <div className="border-b border-[#273041] px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#10B981]/30 bg-[#10B981]/10">
            <Icon size={21} weight="duotone" className="text-[#10B981]" />
          </div>
          <div>
            <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">{title}</h2>
            <p className="mt-1 text-sm text-[#9CA3AF]">{description}</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#273041]">
        {rows.length ? (
          rows.map((row) => <StreakRow key={`${row.player}-${row.rank}`} row={row} />)
        ) : (
          <div className="px-6 py-10 text-center text-sm text-[#9CA3AF]">No qualifying streaks found.</div>
        )}
      </div>
    </div>
  );
}

function StreakRow({ row }) {
  return (
    <article className="px-5 py-5 sm:px-6" data-testid={`streak-row-${row.rank}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#273041] bg-[#0B0E14] font-mono text-sm font-bold text-[#9CA3AF]">
            {row.rank}
          </div>
          <div className="min-w-0">
            <Link
              to={`/players/${encodeURIComponent(row.player)}`}
              className="font-[Outfit] text-lg font-semibold text-[#F3F4F6] hover:text-[#10B981]"
            >
              {row.player}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
              <span>{formatDate(row.start_date)} - {formatDate(row.end_date)}</span>
              {row.current ? (
                <span className="rounded-full border border-[#10B981]/40 bg-[#10B981]/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-[#6EE7B7]">
                  Current run
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <div className="font-mono text-3xl font-bold text-[#10B981]">{row.streak}</div>
          <div className="text-xs uppercase tracking-[0.14em] text-[#6B7280]">
            {row.streak === 1 ? "Tournament" : "Tournaments"}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label={`${row.player} streak events`}>
        {(row.events || []).map((event, index) => (
          <div key={`${event.tournament_id}-${index}`} className="contents">
            {index > 0 ? <CaretRight size={15} className="text-[#4B5563]" aria-hidden="true" /> : null}
            <EventChip event={event} />
          </div>
        ))}
      </div>
    </article>
  );
}

function EventChip({ event }) {
  return (
    <Link
      to={`/tournaments/${event.tournament_id}`}
      className="group min-w-[9.5rem] rounded-md border border-[#273041] bg-[#0B0E14] px-3 py-2.5 transition-colors hover:border-[#10B981]/50 hover:bg-[#10151F]"
      title={event.tournament_name}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm font-bold text-[#F59E0B]">{ordinal(event.place)}</span>
        {event.amount != null ? (
          <span className="font-mono text-xs text-[#10B981]">{formatMoney(event.amount)}</span>
        ) : null}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-[#9CA3AF] group-hover:text-[#CBD5E1]">
        <CalendarBlank size={14} weight="duotone" />
        <span>{formatDate(event.date)}</span>
      </div>
      <div className="mt-1 truncate text-xs text-[#6B7280]">{event.game || "Pool"}</div>
    </Link>
  );
}

function LoadingState() {
  return (
    <section className="grid grid-cols-1 2xl:grid-cols-2 gap-6" aria-label="Loading tournament streaks">
      {[0, 1].map((panel) => (
        <div key={panel} className="overflow-hidden rounded-lg border border-[#273041] bg-[#141923]">
          <div className="border-b border-[#273041] px-6 py-6">
            <div className="h-6 w-64 animate-pulse rounded bg-[#273041]" />
            <div className="mt-3 h-4 w-48 animate-pulse rounded bg-[#1F2937]" />
          </div>
          {[0, 1, 2].map((row) => (
            <div key={row} className="border-b border-[#273041] px-6 py-6 last:border-0">
              <div className="h-5 w-40 animate-pulse rounded bg-[#273041]" />
              <div className="mt-4 h-16 animate-pulse rounded bg-[#0B0E14]" />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function ordinal(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "Paid";
  const mod100 = number % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  const suffix = number % 10 === 1 ? "st" : number % 10 === 2 ? "nd" : number % 10 === 3 ? "rd" : "th";
  return `${number}${suffix}`;
}

function formatDate(value) {
  if (!value) return "Date unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unknown";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatGeneratedAt(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

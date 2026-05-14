import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { fetchTournament } from "../lib/api";
import { ArrowsClockwise, CaretLeft, MagnifyingGlass, Minus, Plus, Printer } from "@phosphor-icons/react";

const MIN_BRACKET_ZOOM = 0.65;
const MAX_BRACKET_ZOOM = 1.45;
const BRACKET_ZOOM_STEP = 0.1;

const clampBracketZoom = (value) =>
  Math.min(MAX_BRACKET_ZOOM, Math.max(MIN_BRACKET_ZOOM, Number(value.toFixed(2))));

export default function TournamentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bracketZoom, setBracketZoom] = useState(1);
  const pinchDistanceRef = useRef(null);

  const adjustBracketZoom = useCallback((delta) => {
    setBracketZoom((value) => clampBracketZoom(value + delta));
  }, []);

  const resetBracketZoom = useCallback(() => {
    setBracketZoom(1);
    pinchDistanceRef.current = null;
  }, []);

  const handleBracketWheel = useCallback((event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    adjustBracketZoom(event.deltaY < 0 ? BRACKET_ZOOM_STEP : -BRACKET_ZOOM_STEP);
  }, [adjustBracketZoom]);

  const handleBracketTouchStart = useCallback((event) => {
    if (event.touches.length !== 2) {
      pinchDistanceRef.current = null;
      return;
    }
    pinchDistanceRef.current = getTouchDistance(event.touches);
  }, []);

  const handleBracketTouchMove = useCallback((event) => {
    if (event.touches.length !== 2 || pinchDistanceRef.current === null) return;
    event.preventDefault();
    const nextDistance = getTouchDistance(event.touches);
    const delta = nextDistance - pinchDistanceRef.current;
    if (Math.abs(delta) >= 12) {
      adjustBracketZoom(delta > 0 ? BRACKET_ZOOM_STEP : -BRACKET_ZOOM_STEP);
      pinchDistanceRef.current = nextDistance;
    }
  }, [adjustBracketZoom]);

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
  const matches = useMemo(() => data?.matches || [], [data?.matches]);
  const analytics = data?.analytics || {};
  const placements = analytics.placements || [];
  const cinderellaRuns = analytics.cinderella_runs || [];
  const payoutsByPlace = new Map((analytics.prize_payouts || []).map((row) => [row.place, row]));
  const baseline = analytics.duration_baseline;
  const bracketSections = useMemo(() => buildBracketSections(matches), [matches]);
  const printActions = t ? <PrintButton /> : null;

  return (
    <>
      <Topbar title={t?.name || "Tournament"} subtitle={t?.game || ""} actions={printActions} />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="tournament-detail-page">
        <Link
          to="/tournaments"
          className="print-hide inline-flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-[#10B981] mb-5"
        >
          <CaretLeft size={14} /> Back to tournaments
        </Link>

        {loading ? (
          <div className="text-[#6B7280]">Loading...</div>
        ) : !t ? (
          <MissingTournament id={id} />
        ) : (
          <>
            <PrintHeader tournament={t} analytics={analytics} />

            <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6 grid grid-cols-2 md:grid-cols-6 gap-4">
              <Info label="State" value={t.state || "-"} />
              <Info label="Game" value={t.game || "-"} />
              <Info label="Participants" value={analytics.player_count || t.participants_count || "-"} />
              <Info label="Pot" value={formatMoney(analytics.prize_pool)} />
              <Info label="Difficulty" value={analytics.difficulty?.label || t.difficulty?.label || "-"} />
              <Info label="Duration" value={analytics.duration_label || t.duration_label || "-"} />
              <Info label="Started" value={t.started_at ? new Date(t.started_at).toLocaleDateString() : "-"} />
            </div>

            {baseline ? (
              <section
                className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6"
                data-testid="tournament-duration-baseline"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
                      Timing Baseline
                    </h2>
                    <div className="mt-1 text-sm text-[#9CA3AF]">
                      {baseline.game} with {baseline.player_count} players, excluding timing outliers
                    </div>
                  </div>
                  <span className="font-mono text-xs text-[#6B7280]">
                    {baseline.sample_count} baseline event{baseline.sample_count === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <BaselineStat label="Average" value={baseline.average_label} />
                  <BaselineStat
                    label="Shortest"
                    value={baseline.shortest?.duration_label}
                    to={baseline.shortest?.tournament_id}
                    title={baseline.shortest?.tournament_name}
                  />
                  <BaselineStat
                    label="Longest"
                    value={baseline.longest?.duration_label}
                    to={baseline.longest?.tournament_id}
                    title={baseline.longest?.tournament_name}
                  />
                </div>
              </section>
            ) : null}

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

            {cinderellaRuns.length ? (
              <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6" data-testid="cinderella-runs-card">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
                    Cinderella Runs
                  </h2>
                  <span className="text-xs text-[#6B7280]">ELO underdog wins</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {cinderellaRuns.map((run) => (
                    <CinderellaCard key={run.player} run={run} />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6" data-testid="bracket-visualization">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
                    Bracket
                  </h2>
                  <div className="mt-1 text-xs text-[#6B7280]">
                    Grouped by Challonge round
                  </div>
                </div>
                {bracketSections.length ? (
                  <div className="print-hide flex items-center gap-2" data-testid="bracket-zoom-controls">
                    <ZoomButton
                      label="Zoom out"
                      icon={Minus}
                      onClick={() => adjustBracketZoom(-BRACKET_ZOOM_STEP)}
                      disabled={bracketZoom <= MIN_BRACKET_ZOOM}
                    />
                    <div className="min-w-16 rounded-md border border-[#273041] bg-[#0B0E14] px-3 py-2 text-center font-mono text-xs text-[#F3F4F6]">
                      {Math.round(bracketZoom * 100)}%
                    </div>
                    <ZoomButton
                      label="Zoom in"
                      icon={Plus}
                      onClick={() => adjustBracketZoom(BRACKET_ZOOM_STEP)}
                      disabled={bracketZoom >= MAX_BRACKET_ZOOM}
                    />
                    <ZoomButton
                      label="Reset zoom"
                      icon={ArrowsClockwise}
                      onClick={resetBracketZoom}
                      disabled={bracketZoom === 1}
                    />
                  </div>
                ) : null}
              </div>
              {bracketSections.length === 0 ? (
                <div className="text-[#6B7280] text-sm">No bracket matches available.</div>
              ) : (
                <div
                  className="overflow-auto overscroll-contain rounded-md border border-[#273041] bg-[#0B0E14] p-3"
                  data-testid="bracket-zoom-viewport"
                  onWheel={handleBracketWheel}
                  onTouchStart={handleBracketTouchStart}
                  onTouchMove={handleBracketTouchMove}
                  onTouchEnd={() => {
                    pinchDistanceRef.current = null;
                  }}
                  style={{ touchAction: "pan-x pan-y" }}
                >
                <div className="space-y-6 min-w-max" style={{ zoom: bracketZoom }}>
                  {bracketSections.map((section) => (
                    <div key={section.key}>
                      <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6B7280]">
                        {section.label}
                      </div>
                      <div className="flex gap-4">
                        {section.rounds.map((round) => (
                          <div key={round.key} className="w-72 shrink-0">
                            <div className="mb-2 font-mono text-xs text-[#9CA3AF]">
                              {round.label}
                            </div>
                            <div className="space-y-3">
                              {round.matches.map((match) => (
                                <BracketMatch key={match.id} match={match} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              )}
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
                        <Td className="font-mono text-sm">
                          <div className="flex flex-col gap-1">
                            <span>{m.scores || "-"}</span>
                            <MatchOdds odds={m.elo_odds} />
                          </div>
                        </Td>
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

const MissingTournament = ({ id }) => (
  <section className="max-w-2xl bg-[#141923] border border-[#273041] rounded-lg p-6" data-testid="missing-tournament">
    <div className="w-12 h-12 rounded-md bg-[#0B0E14] border border-[#273041] flex items-center justify-center">
      <MagnifyingGlass size={22} weight="duotone" className="text-[#F59E0B]" />
    </div>
    <h1 className="mt-5 font-[Outfit] text-2xl font-semibold text-[#F3F4F6]">
      Tournament not found.
    </h1>
    <p className="mt-2 text-sm text-[#9CA3AF]">
      No cached tournament matches `{id}`. Try the tournament archive or global search.
    </p>
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        to="/tournaments"
        className="inline-flex items-center justify-center rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-3 text-sm font-medium text-[#F3F4F6] hover:border-[#10B981]/50 hover:text-[#10B981] transition-colors"
      >
        Browse tournaments
      </Link>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-3 text-sm font-medium text-[#F3F4F6] hover:border-[#10B981]/50 hover:text-[#10B981] transition-colors"
      >
        Dashboard search
      </Link>
    </div>
  </section>
);

const PrintButton = () => (
  <button
    type="button"
    onClick={() => window.print()}
    className="print-hide inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#273041] bg-[#141923] px-3 text-sm font-medium text-[#F3F4F6] transition-colors hover:border-[#10B981]/50 hover:text-[#10B981]"
    data-testid="print-tournament-button"
  >
    <Printer size={17} weight="duotone" />
    <span className="hidden sm:inline">Print</span>
  </button>
);

const PrintHeader = ({ tournament, analytics }) => (
  <section className="print-only mb-6 border-b border-[#273041] pb-4">
    <h1 className="font-[Outfit] text-3xl font-semibold text-[#F3F4F6]">
      {tournament.name}
    </h1>
    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
      <PrintMeta label="Game" value={tournament.game || "-"} />
      <PrintMeta label="State" value={tournament.state || "-"} />
      <PrintMeta label="Players" value={analytics.player_count || tournament.participants_count || "-"} />
      <PrintMeta label="Duration" value={analytics.duration_label || tournament.duration_label || "-"} />
    </dl>
  </section>
);

const PrintMeta = ({ label, value }) => (
  <div>
    <dt className="font-semibold text-[#6B7280]">{label}</dt>
    <dd className="font-mono text-[#F3F4F6]">{value}</dd>
  </div>
);

const BaselineStat = ({ label, value, to, title }) => {
  const body = (
    <div className="bg-[#0B0E14] border border-[#273041] rounded-md px-4 py-3 h-full">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#6B7280]">{label}</div>
      <div className="mt-1 font-mono text-[#F3F4F6]">{value || "-"}</div>
      {title ? <div className="mt-1 text-xs text-[#9CA3AF] truncate">{title}</div> : null}
    </div>
  );

  return to ? (
    <Link to={`/tournaments/${to}`} className="block hover:border-[#10B981]">
      {body}
    </Link>
  ) : body;
};

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

const CinderellaCard = ({ run }) => (
  <div className="rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-3">
    <div className="flex items-start justify-between gap-3">
      <Link
        to={`/players/${encodeURIComponent(run.player)}`}
        className="min-w-0 truncate font-medium text-[#F3F4F6] hover:text-[#10B981]"
      >
        {run.player}
      </Link>
      <div className="shrink-0 rounded border border-[#F59E0B]/20 bg-[#F59E0B]/10 px-2 py-1 font-mono text-xs text-[#F59E0B]">
        {run.upset_count} upset{run.upset_count === 1 ? "" : "s"}
      </div>
    </div>
    <div className="mt-2 font-mono text-2xl font-semibold text-[#F59E0B]">
      {Number(run.upset_score || 0).toFixed(1)}
    </div>
    {run.biggest_upset ? (
      <div className="mt-1 text-xs text-[#9CA3AF]">
        Biggest: beat {run.biggest_upset.opponent} at {run.biggest_upset.winner_probability}% odds
      </div>
    ) : null}
    <div className="mt-3 flex flex-wrap gap-1">
      {(run.matches || []).slice(0, 4).map((match) => (
        <span
          key={match.match_id}
          className="rounded border border-[#273041] bg-[#141923] px-2 py-1 font-mono text-[10px] text-[#9CA3AF]"
        >
          R{match.round ?? "-"} {match.winner_probability}%
        </span>
      ))}
    </div>
  </div>
);

const ZoomButton = ({ label, icon: Icon, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="w-10 h-10 rounded-md border border-[#273041] bg-[#0B0E14] text-[#9CA3AF] flex items-center justify-center transition-colors hover:border-[#10B981]/50 hover:text-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-40"
    aria-label={label}
    title={label}
  >
    <Icon size={18} weight="duotone" />
  </button>
);

const BracketMatch = ({ match }) => {
  const winner = match.winner_name || "TBD";
  const loser = match.loser_name || "TBD";
  return (
    <div className="rounded-md border border-[#273041] bg-[#0B0E14] overflow-hidden" data-testid="bracket-match">
      <BracketPlayer name={winner} tone="winner" />
      <BracketPlayer name={loser} tone="loser" />
      <div className="flex items-center justify-between gap-3 border-t border-[#273041]/60 px-3 py-2 text-[11px] font-mono text-[#6B7280]">
        <span>{match.scores || "-"}</span>
        <MatchOdds odds={match.elo_odds} />
      </div>
    </div>
  );
};

const BracketPlayer = ({ name, tone }) => {
  const isWinner = tone === "winner";
  const className = `flex items-center justify-between gap-3 px-3 py-2 text-sm ${
    isWinner ? "text-[#F3F4F6]" : "text-[#9CA3AF]"
  }`;
  return (
    <div className={className}>
      {name === "TBD" ? (
        <span className="truncate text-[#6B7280]">TBD</span>
      ) : (
        <Link
          to={`/players/${encodeURIComponent(name)}`}
          className={`truncate ${isWinner ? "hover:text-[#10B981] font-medium" : "hover:text-[#F3F4F6]"}`}
        >
          {name}
        </Link>
      )}
      <span className={`text-[10px] uppercase tracking-wider ${isWinner ? "text-[#10B981]" : "text-[#6B7280]"}`}>
        {isWinner ? "W" : "L"}
      </span>
    </div>
  );
};

const getTouchDistance = (touches) => {
  const [first, second] = touches;
  const deltaX = first.clientX - second.clientX;
  const deltaY = first.clientY - second.clientY;
  return Math.hypot(deltaX, deltaY);
};

const buildBracketSections = (matches) => {
  const playable = (matches || []).filter((match) => match.round !== null && match.round !== undefined);
  const winners = playable.filter((match) => Number(match.round) > 0);
  const losers = playable.filter((match) => Number(match.round) < 0);
  const other = playable.filter((match) => Number(match.round) === 0 || Number.isNaN(Number(match.round)));
  return [
    makeBracketSection("winners", "Winner Bracket", winners, (a, b) => a - b, (round, maxRound) => {
      if (round === maxRound) return "Final";
      if (round === maxRound - 1) return "Winners Final";
      return `Round ${round}`;
    }),
    makeBracketSection("losers", "Loser Bracket", losers, (a, b) => b - a, (round, minRound) => {
      if (round === minRound) return "Losers Final";
      return `Losers ${Math.abs(round)}`;
    }),
    makeBracketSection("other", "Other Matches", other, (a, b) => a - b, (round) => `Round ${round}`),
  ].filter((section) => section.rounds.length > 0);
};

const makeBracketSection = (key, label, matches, sortRounds, labelRound) => {
  const grouped = new Map();
  matches.forEach((match) => {
    const round = Number(match.round);
    grouped.set(round, [...(grouped.get(round) || []), match]);
  });
  const roundNumbers = [...grouped.keys()].sort(sortRounds);
  const edgeRound = key === "losers" ? Math.min(...roundNumbers) : Math.max(...roundNumbers);
  return {
    key,
    label,
    rounds: roundNumbers.map((round) => ({
      key: `${key}-${round}`,
      label: labelRound(round, edgeRound),
      matches: grouped.get(round).sort((a, b) => String(a.id || "").localeCompare(String(b.id || ""))),
    })),
  };
};

const formatMoney = (value) =>
  typeof value === "number"
    ? value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "-";

const MatchOdds = ({ odds }) => {
  if (!odds) return null;
  return (
    <span className="text-[10px] uppercase tracking-wider text-[#F59E0B]">
      {odds.favorite} {Math.max(odds.winner_probability || 0, odds.loser_probability || 0)}% ELO
    </span>
  );
};

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

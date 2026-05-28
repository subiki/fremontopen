import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import { fetchTournament } from "../lib/api";
import { ArrowsClockwise, CaretLeft, MagnifyingGlass, Minus, Plus } from "@phosphor-icons/react";

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
  const [bracketSize, setBracketSize] = useState({ width: 0, height: 0 });
  const [isBracketDragging, setIsBracketDragging] = useState(false);
  const pinchDistanceRef = useRef(null);
  const bracketContentRef = useRef(null);
  const bracketDragRef = useRef(null);

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

  const handleBracketPointerDown = useCallback((event) => {
    if (event.pointerType === "touch" || event.button !== 0) return;

    bracketDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsBracketDragging(true);
  }, []);

  const handleBracketPointerMove = useCallback((event) => {
    const drag = bracketDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      drag.moved = true;
    }

    event.preventDefault();
    event.currentTarget.scrollLeft = drag.scrollLeft - deltaX;
    event.currentTarget.scrollTop = drag.scrollTop - deltaY;
  }, []);

  const finishBracketPointerDrag = useCallback((event) => {
    const drag = bracketDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setIsBracketDragging(false);
    if (!drag.moved) {
      bracketDragRef.current = null;
      return;
    }
    window.setTimeout(() => {
      if (bracketDragRef.current?.pointerId === event.pointerId) {
        bracketDragRef.current = null;
      }
    }, 0);
  }, []);

  const handleBracketClickCapture = useCallback((event) => {
    if (!bracketDragRef.current?.moved) {
      bracketDragRef.current = null;
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    bracketDragRef.current = null;
  }, []);

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

  useEffect(() => {
    if (loading || !data || !window.location.hash) return;
    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [data, loading]);

  const t = data?.tournament;
  const matches = useMemo(() => data?.matches || [], [data?.matches]);
  const analytics = data?.analytics || {};
  const placements = analytics.placements || [];
  const cinderellaRuns = analytics.cinderella_runs || [];
  const performanceAboveElo = analytics.performance_above_elo || [];
  const matchOfTournament = analytics.match_of_tournament;
  const payoutsByPlace = new Map((analytics.prize_payouts || []).map((row) => [row.place, row]));
  const baseline = analytics.duration_baseline;
  const bracketSections = useMemo(() => buildBracketSections(matches), [matches]);

  useLayoutEffect(() => {
    const element = bracketContentRef.current;
    if (!element || !bracketSections.length) {
      setBracketSize({ width: 0, height: 0 });
      return undefined;
    }

    const measure = () => {
      setBracketSize({
        width: element.scrollWidth,
        height: element.scrollHeight,
      });
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [bracketSections]);

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
          <MissingTournament id={id} />
        ) : (
          <>
            <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6 grid grid-cols-2 md:grid-cols-6 gap-4">
              <Info label="Status" value={formatTournamentStatus(t.state)} />
              <Info label="Date" value={formatTournamentDate(t.started_at, t.completed_at)} />
              <Info label="Game" value={t.game || "-"} />
              <Info label="Participants" value={analytics.player_count || t.participants_count || "-"} />
              <Info label="Pot" value={formatMoney(analytics.prize_pool)} />
              <Info label="Field Strength" value={formatDifficultyValue(analytics.difficulty || t.difficulty)} />
              <Info label="Duration" value={analytics.duration_label || t.duration_label || "-"} />
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

            {performanceAboveElo.length ? (
              <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6" data-testid="performance-above-elo-card">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">
                      Beat Expected ELO
                    </h2>
                    <div className="mt-1 text-sm text-[#9CA3AF]">
                      Wins above match-by-match ELO expectation inside this event.
                    </div>
                  </div>
                  <span className="text-xs text-[#6B7280]">Higher is better</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {performanceAboveElo.map((row) => (
                    <PerformanceAboveEloCard key={row.player} row={row} />
                  ))}
                </div>
              </section>
            ) : null}

            {matchOfTournament ? (
              <MatchOfTournamentCard match={matchOfTournament} />
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
                  className={`overflow-auto overscroll-contain rounded-md border border-[#273041] bg-[#0B0E14] p-3 ${
                    isBracketDragging ? "cursor-grabbing select-none" : "cursor-grab"
                  }`}
                  data-testid="bracket-zoom-viewport"
                  onWheel={handleBracketWheel}
                  onPointerDown={handleBracketPointerDown}
                  onPointerMove={handleBracketPointerMove}
                  onPointerUp={finishBracketPointerDrag}
                  onPointerCancel={finishBracketPointerDrag}
                  onClickCapture={handleBracketClickCapture}
                  onTouchStart={handleBracketTouchStart}
                  onTouchMove={handleBracketTouchMove}
                  onTouchEnd={() => {
                    pinchDistanceRef.current = null;
                  }}
                  style={{ touchAction: "pan-x pan-y" }}
                >
                  <div
                    style={{
                      width: bracketSize.width ? `${bracketSize.width * bracketZoom}px` : "max-content",
                      height: bracketSize.height ? `${bracketSize.height * bracketZoom}px` : "auto",
                    }}
                  >
                    <div
                      ref={bracketContentRef}
                      className="space-y-6 min-w-max"
                      style={{
                        transform: `scale(${bracketZoom})`,
                        transformOrigin: "top left",
                      }}
                    >
                      {bracketSections.map((section) => (
                        <div key={section.key}>
                          <div className="mb-3 text-xs uppercase tracking-[0.16em] text-[#6B7280]">
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
                  </tr>
                </thead>
                <tbody>
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[#6B7280]">
                        No matches yet.
                      </td>
                    </tr>
                  ) : (
                    matches.map((m) => (
                      <tr
                        id={matchAnchorId(m.id)}
                        key={m.id}
                        className="border-t border-[#273041]/60 scroll-mt-28 target:bg-[#0B0E14] target:outline target:outline-1 target:outline-[#F59E0B]/60"
                      >
                        <Td className="font-mono text-xs text-[#6B7280]">{m.round ?? "-"}</Td>
                        <Td>
                          {m.winner_name ? (
                            <MatchPlayerName name={m.winner_name} entryType={m.winner_entry_type} tone="winner" />
                          ) : (
                            <span className="text-[#6B7280]">TBD</span>
                          )}
                        </Td>
                        <Td>
                          {m.loser_name ? (
                            <MatchPlayerName name={m.loser_name} entryType={m.loser_entry_type} tone="loser" />
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
    <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</div>
    <div className="mt-1 font-mono text-[#F3F4F6]">{value}</div>
  </div>
);

const matchAnchorId = (matchId) => `match-${encodeURIComponent(String(matchId || ""))}`;

const formatTournamentStatus = (value) => {
  const status = String(value || "").replace(/_/g, " ").trim();
  if (!status) return "-";
  return status.replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatTournamentDate = (startedAt, completedAt) => {
  const value = startedAt || completedAt;
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const formatDifficultyValue = (difficulty) => {
  if (!difficulty) return "-";
  const average = difficulty.average_elo;
  if (!average) return difficulty.label || "-";
  return `${average} avg ELO`;
};

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

const BaselineStat = ({ label, value, to, title }) => {
  const body = (
    <div className="bg-[#0B0E14] border border-[#273041] rounded-md px-4 py-3 h-full">
      <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</div>
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
      <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">
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
          className="rounded border border-[#273041] bg-[#141923] px-2 py-1 font-mono text-xs text-[#9CA3AF]"
        >
          R{match.round ?? "-"} {match.winner_probability}%
        </span>
      ))}
    </div>
  </div>
);

const PerformanceAboveEloCard = ({ row }) => {
  const delta = Number(row.above_expectation || 0);
  return (
    <div className="rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/players/${encodeURIComponent(row.player)}`}
            className="truncate font-medium text-[#F3F4F6] hover:text-[#10B981]"
          >
            {row.player}
          </Link>
          <div className="mt-1 text-xs text-[#6B7280]">
            {row.place ? `Place ${ordinal(row.place)} . ` : ""}
            {row.wins}-{row.losses} across {row.matches} match{row.matches === 1 ? "" : "es"}
          </div>
        </div>
        <div className="text-right font-mono">
          <div className="text-lg font-semibold text-[#10B981]">
            {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
          </div>
          <div className="text-xs text-[#6B7280]">wins above ELO</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono text-[#9CA3AF]">
        <span className="rounded border border-[#273041] px-2 py-1">
          Expected {Number(row.expected_wins || 0).toFixed(2)}
        </span>
        <span className="rounded border border-[#273041] px-2 py-1">
          {row.upset_wins || 0} upset win{row.upset_wins === 1 ? "" : "s"}
        </span>
      </div>
      {row.biggest_upset ? (
        <div className="mt-3 text-xs text-[#6B7280]">
          Biggest upset: beat {row.biggest_upset.opponent} at {row.biggest_upset.winner_probability}% odds.
        </div>
      ) : null}
    </div>
  );
};

const MatchOfTournamentCard = ({ match }) => {
  const isUpset = match.reason === "upset";
  const isRivalry = match.reason === "rivalry";
  const label = isUpset ? "Biggest upset" : isRivalry ? "Heated rivalry" : "Deciding match";
  const oddsLine = isUpset && match.favorite
    ? `${match.favorite} was ${match.loser_probability}% to win by ELO`
    : match.favorite
      ? `ELO favorite: ${match.favorite}`
      : "ELO data unavailable";

  return (
    <section
      className="bg-[#141923] border border-[#273041] rounded-lg p-6 mb-6"
      data-testid="match-of-tournament-card"
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F59E0B]">
            Match of the Tournament
          </div>
          <h2 className="mt-2 font-[Outfit] text-2xl font-semibold text-[#F3F4F6]">
            {match.winner} def. {match.loser}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9CA3AF]">
            {match.detail}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 lg:w-80">
          <StoryStat label="Story" value={label} tone="gold" />
          <StoryStat label="Score" value={match.scores || "-"} />
          <StoryStat label="Round" value={match.round ?? "-"} />
          <StoryStat label="Heat" value={Number(match.score || 0).toFixed(1)} />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded border border-[#273041] bg-[#0B0E14] px-3 py-2 font-mono text-[#9CA3AF]">
          {oddsLine}
        </span>
        {match.rating_gap !== null && match.rating_gap !== undefined ? (
          <span className="rounded border border-[#273041] bg-[#0B0E14] px-3 py-2 font-mono text-[#9CA3AF]">
            Rating gap {Math.abs(match.rating_gap)}
          </span>
        ) : null}
      </div>
    </section>
  );
};

const StoryStat = ({ label, value, tone }) => (
  <div className="rounded-md border border-[#273041] bg-[#0B0E14] px-3 py-2">
    <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">{label}</div>
    <div className={`mt-1 truncate font-mono text-sm ${tone === "gold" ? "text-[#F59E0B]" : "text-[#F3F4F6]"}`}>
      {value}
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
    <div className="weird-bracket-match rounded-md border border-[#273041] bg-[#0B0E14] overflow-hidden" data-testid="bracket-match">
      <BracketPlayer name={winner} entryType={match.winner_entry_type} tone="winner" />
      <BracketPlayer name={loser} entryType={match.loser_entry_type} tone="loser" />
      <div className="flex items-center justify-between gap-3 border-t border-[#273041]/60 px-3 py-2 text-xs font-mono text-[#6B7280]">
        <span>{match.scores || "-"}</span>
        <MatchOdds odds={match.elo_odds} />
      </div>
    </div>
  );
};

const MatchPlayerName = ({ name, entryType, tone }) => {
  const isWinner = tone === "winner";
  const className = isWinner
    ? "text-[#10B981] hover:underline font-medium"
    : "text-[#9CA3AF] hover:text-[#F3F4F6]";
  if (entryType !== "singles_player") {
    return <span className={isWinner ? "font-medium text-[#10B981]" : "text-[#9CA3AF]"}>{name}</span>;
  }
  return (
    <Link to={`/players/${encodeURIComponent(name)}`} className={className}>
      {name}
    </Link>
  );
};

const BracketPlayer = ({ name, entryType, tone }) => {
  const isWinner = tone === "winner";
  const className = `flex items-center justify-between gap-3 px-3 py-2 text-sm ${
    isWinner ? "text-[#F3F4F6]" : "text-[#9CA3AF]"
  }`;
  return (
    <div className={className}>
      {name === "TBD" ? (
        <span className="truncate text-[#6B7280]">TBD</span>
      ) : entryType !== "singles_player" ? (
        <span className={`truncate ${isWinner ? "font-medium" : ""}`}>{name}</span>
      ) : (
        <Link
          to={`/players/${encodeURIComponent(name)}`}
          className={`truncate ${isWinner ? "hover:text-[#10B981] font-medium" : "hover:text-[#F3F4F6]"}`}
        >
          {name}
        </Link>
      )}
      <span className={`text-xs uppercase tracking-wider ${isWinner ? "text-[#10B981]" : "text-[#6B7280]"}`}>
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
    <span className="text-xs uppercase tracking-wider text-[#F59E0B]">
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

export const leaderboardMetrics = {
  wins: { label: "Wins", value: (p) => p.wins || 0, format: number, desc: true },
  losses: { label: "Losses", value: (p) => p.losses || 0, format: number, desc: true },
  total_matches: { label: "Total Matches", value: (p) => (p.wins || 0) + (p.losses || 0), format: number, desc: true },
  win_rate: { label: "Win Rate", value: (p) => p.win_rate || 0, format: percent, desc: true },
  tournaments_played: { label: "Tournaments Played", value: (p) => p.tournaments_played || 0, format: number, desc: true },
  races_played: { label: "Races Played", value: (p) => p.races_played || 0, format: number, desc: true },
  races_won: { label: "Races Won", value: (p) => p.races_won || 0, format: number, desc: true },
  races_lost: { label: "Races Lost", value: (p) => p.races_lost || 0, format: number, desc: true },
  racks_played: { label: "Racks Played", value: (p) => p.racks_played || 0, format: number, desc: true },
  racks_won: { label: "Racks Won", value: (p) => p.racks_won || 0, format: number, desc: true },
  racks_lost: { label: "Racks Lost", value: (p) => p.racks_lost || 0, format: number, desc: true },
  rack_diff: { label: "Rack Differential", value: (p) => (p.racks_won || 0) - (p.racks_lost || 0), format: signedNumber, desc: true },
  scored_races: { label: "Scored Races", value: (p) => p.scored_races || 0, format: number, desc: true },
  attendance_streak: { label: "Current Attendance Streak", value: (p) => p.attendance_streak || 0, format: number, desc: true },
  best_attendance_streak: { label: "Best Attendance Streak", value: (p) => p.best_attendance_streak || 0, format: number, desc: true },
  elo_rating: { label: "ELO", value: (p) => p.elo_rating || 0, format: number, desc: true },
  elo_peak: { label: "ELO Peak", value: (p) => p.elo_peak || 0, format: number, desc: true },
  elo_matches: { label: "ELO Matches", value: (p) => p.elo_matches || 0, format: number, desc: true },
  best_elo_upset_rating_gap: { label: "Best ELO Upset", value: (p) => p.best_elo_upset_rating_gap || 0, format: eloGap, desc: true },
  best_elo_upset_probability: { label: "Lowest Win Odds Upset", value: (p) => positiveOrNull(p.best_elo_upset_probability), format: percent, desc: false },
  worst_elo_loss_rating_gap: { label: "Worst ELO Loss", value: (p) => p.worst_elo_loss_rating_gap || 0, format: eloGap, desc: true },
  worst_elo_loss_probability: { label: "Worst Favorite Loss Odds", value: (p) => p.worst_elo_loss_probability || 0, format: percent, desc: true },
  strength_of_schedule: { label: "Strength of Schedule", value: (p) => p.strength_of_schedule, format: number, desc: true },
  opponent_win_rate: { label: "Opponent Win Rate", value: (p) => p.opponent_win_rate, format: percent, desc: true },
  opponent_count: { label: "Unique Opponents", value: (p) => p.opponent_count || 0, format: number, desc: true },
  average_placement: { label: "Average Placement", value: (p) => p.average_placement, format: decimal, desc: false },
  placements_counted: { label: "Placements Counted", value: (p) => p.placements_counted || 0, format: number, desc: true },
  cash_won: { label: "Cash Won", value: (p) => p.cash_won || 0, format: money, desc: true },
  biggest_tournament_cash: { label: "Biggest Single Payout", value: (p) => p.biggest_tournament_cash || 0, format: money, desc: true },
  top_1_finishes: { label: "1st Place Finishes", value: (p) => p.top_1_finishes || 0, format: number, desc: true },
  second_place_finishes: { label: "2nd Place Finishes", value: (p) => p.second_place_finishes || 0, format: number, desc: true },
  third_place_finishes: { label: "3rd Place Finishes", value: (p) => p.third_place_finishes || 0, format: number, desc: true },
  fourth_place_finishes: { label: "4th Place Finishes", value: (p) => p.fourth_place_finishes || 0, format: number, desc: true },
  top_2_finishes: { label: "Top 2 Total", value: (p) => p.top_2_finishes || 0, format: number, desc: true },
  top_3_finishes: { label: "Top 3 Total", value: (p) => p.top_3_finishes || 0, format: number, desc: true },
  top_4_finishes: { label: "Top 4 Total", value: (p) => p.top_4_finishes || 0, format: number, desc: true },
};

export const leaderboardMetricGroups = [
  {
    label: "Results",
    metrics: ["wins", "losses", "total_matches", "win_rate", "tournaments_played"],
  },
  {
    label: "Races and Racks",
    metrics: ["races_played", "races_won", "races_lost", "racks_played", "racks_won", "racks_lost", "rack_diff", "scored_races"],
  },
  {
    label: "ELO",
    metrics: ["elo_rating", "elo_peak", "elo_matches", "best_elo_upset_rating_gap", "best_elo_upset_probability", "worst_elo_loss_rating_gap", "worst_elo_loss_probability"],
  },
  {
    label: "Tournament Finishes",
    metrics: ["average_placement", "placements_counted", "top_1_finishes", "second_place_finishes", "third_place_finishes", "fourth_place_finishes", "top_2_finishes", "top_3_finishes", "top_4_finishes"],
  },
  {
    label: "Streaks and Schedule",
    metrics: ["attendance_streak", "best_attendance_streak", "strength_of_schedule", "opponent_win_rate", "opponent_count"],
  },
  {
    label: "Cash",
    metrics: ["cash_won", "biggest_tournament_cash"],
  },
];

export function getLeaderboardMetric(metricKey) {
  return leaderboardMetrics[metricKey] || leaderboardMetrics.wins;
}

export function compareLeaderboardPlayers(metric, left, right) {
  const leftValue = metric.value(left);
  const rightValue = metric.value(right);
  const leftNumber = valueForSort(leftValue, metric.desc);
  const rightNumber = valueForSort(rightValue, metric.desc);
  if (leftNumber !== rightNumber) {
    return metric.desc ? rightNumber - leftNumber : leftNumber - rightNumber;
  }
  return left.name.localeCompare(right.name);
}

function valueForSort(value, desc) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return desc ? -Infinity : Infinity;
  }
  return Number(value);
}

function positiveOrNull(value) {
  return Number(value || 0) > 0 ? Number(value) : null;
}

function number(value) {
  return Number(value || 0).toLocaleString();
}

function signedNumber(value) {
  const numeric = Number(value || 0);
  return `${numeric > 0 ? "+" : ""}${numeric.toLocaleString()}`;
}

function decimal(value) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

function percent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function eloGap(value) {
  const numeric = Number(value || 0);
  return numeric ? `${numeric.toLocaleString()} pts` : "-";
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

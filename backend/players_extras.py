"""Extra player analytics: cross-tournament streaks, tourney championships by game type, performance vs Fargo."""
import math
from typing import Dict, List, Any, Optional


def expected_elo_score(rating_a: float, rating_b: float) -> float:
    return 1.0 / (1.0 + math.pow(10, (rating_b - rating_a) / 400.0))


def compute_elo_ratings(
    matches: List[Dict[str, Any]],
    initial_rating: int = 1500,
    k_factor: int = 24,
) -> Dict[str, Any]:
    """Compute cross-tournament ELO ratings from completed cached matches."""
    ratings: Dict[str, float] = {}
    peaks: Dict[str, float] = {}
    history: Dict[str, List[Dict[str, Any]]] = {}
    processed = 0

    ordered_matches = sorted(
        [
            m for m in matches
            if m.get("state") == "complete"
            and m.get("winner_name")
            and m.get("loser_name")
            and m.get("winner_name") != m.get("loser_name")
        ],
        key=lambda m: (m.get("completed_at") or "", str(m.get("id") or "")),
    )

    for match in ordered_matches:
        winner = match["winner_name"]
        loser = match["loser_name"]
        winner_rating = ratings.get(winner, float(initial_rating))
        loser_rating = ratings.get(loser, float(initial_rating))
        expected_winner = expected_elo_score(winner_rating, loser_rating)
        delta = k_factor * (1.0 - expected_winner)

        ratings[winner] = winner_rating + delta
        ratings[loser] = loser_rating - delta
        peaks[winner] = max(peaks.get(winner, float(initial_rating)), ratings[winner])
        peaks[loser] = max(peaks.get(loser, float(initial_rating)), ratings[loser])
        processed += 1

        for player_name, opponent, won, before, after in (
            (winner, loser, True, winner_rating, ratings[winner]),
            (loser, winner, False, loser_rating, ratings[loser]),
        ):
            history.setdefault(player_name, []).append({
                "match_id": match.get("id"),
                "date": match.get("completed_at"),
                "opponent": opponent,
                "won": won,
                "rating_before": round(before),
                "rating_after": round(after),
                "delta": round(after - before, 1),
                "tournament_id": match.get("tournament_id"),
                "tournament_name": match.get("tournament_name"),
            })

    return {
        "initial_rating": initial_rating,
        "k_factor": k_factor,
        "rated_match_count": processed,
        "ratings": {name: round(value) for name, value in ratings.items()},
        "peaks": {name: round(value) for name, value in peaks.items()},
        "history": history,
    }


def _expected_win_rate(rating_a: int, rating_b: int) -> float:
    """Standard logistic expected-win for ELO-style ratings.
    Fargo is a 200-point scale around 500; using the elo 400-spread approximation is close enough for demo.
    """
    return 1.0 / (1.0 + math.pow(10, (rating_b - rating_a) / 200.0))


def compute_streaks(matches: List[Dict[str, Any]], player_name: str) -> Dict[str, Any]:
    """Cross-tournament streaks. Matches must come with completed_at sortable.
    Returns {current_streak: {type:'W'|'L'|None, length:int}, longest_W, longest_L}.
    """
    sorted_m = sorted(
        [m for m in matches if m.get("completed_at")],
        key=lambda m: m["completed_at"],
    )
    longest_w = 0
    longest_l = 0
    cur_w = 0
    cur_l = 0
    for m in sorted_m:
        if m["winner_name"] == player_name:
            cur_w += 1
            cur_l = 0
            longest_w = max(longest_w, cur_w)
        elif m["loser_name"] == player_name:
            cur_l += 1
            cur_w = 0
            longest_l = max(longest_l, cur_l)
    # current = the last run
    if not sorted_m:
        cur_type, cur_len = None, 0
    else:
        last = sorted_m[-1]
        if last["winner_name"] == player_name:
            cur_type, cur_len = "W", cur_w
        else:
            cur_type, cur_len = "L", cur_l
    return {
        "current": {"type": cur_type, "length": cur_len},
        "longest_w": longest_w,
        "longest_l": longest_l,
    }


def compute_perf_vs_fargo(matches: List[Dict[str, Any]], player_name: str, player_fargo: Optional[int], all_fargos: Dict[str, int]) -> Dict[str, Any]:
    """For each completed match where BOTH players have a Fargo rating,
    compute expected win probability and compare to actual.
    Returns aggregate performance_score (sum of actual - expected) and per_match list.
    """
    if not player_fargo:
        return {"has_fargo": False, "performance_score": None, "rated_matches": 0, "per_match": []}
    per_match = []
    total_delta = 0.0
    rated = 0
    for m in matches:
        if not m.get("winner_name") or not m.get("loser_name"):
            continue
        opp = m["loser_name"] if m["winner_name"] == player_name else m["winner_name"]
        opp_fargo = all_fargos.get(opp)
        if not opp_fargo:
            continue
        won = m["winner_name"] == player_name
        expected = _expected_win_rate(player_fargo, opp_fargo)
        actual = 1.0 if won else 0.0
        delta = actual - expected
        total_delta += delta
        rated += 1
        per_match.append({
            "match_id": m.get("id"),
            "opponent": opp,
            "opponent_fargo": opp_fargo,
            "won": won,
            "expected_win_rate": round(expected, 3),
            "delta": round(delta, 3),
        })
    label = "on rating"
    if rated:
        avg = total_delta / rated
        if avg > 0.10:
            label = "above rating"
        elif avg < -0.10:
            label = "below rating"
    return {
        "has_fargo": True,
        "fargo": player_fargo,
        "performance_score": round(total_delta, 2),
        "rated_matches": rated,
        "label": label,
        "per_match": per_match,
    }


def wins_over_time(matches: List[Dict[str, Any]], player_name: str) -> List[Dict[str, Any]]:
    """Cumulative wins per completed match timestamp."""
    sorted_m = sorted(
        [m for m in matches if m.get("completed_at")],
        key=lambda m: m["completed_at"],
    )
    cum_w, cum_l = 0, 0
    out = []
    for m in sorted_m:
        if m["winner_name"] == player_name:
            cum_w += 1
        elif m["loser_name"] == player_name:
            cum_l += 1
        out.append({
            "date": m["completed_at"],
            "wins": cum_w,
            "losses": cum_l,
        })
    return out


def rolling_match_form(
    matches: List[Dict[str, Any]],
    player_name: str,
    window: int = 10,
) -> List[Dict[str, Any]]:
    """Rolling match win rate for the player's most recent completed matches."""
    sorted_m = sorted(
        [
            m for m in matches
            if m.get("completed_at")
            and m.get("state") == "complete"
            and (
                m.get("winner_name") == player_name
                or m.get("loser_name") == player_name
            )
        ],
        key=lambda m: (m.get("completed_at") or "", str(m.get("id") or "")),
    )

    recent_results: List[bool] = []
    out = []
    for m in sorted_m:
        won = m.get("winner_name") == player_name
        opponent = m.get("loser_name") if won else m.get("winner_name")
        recent_results.append(won)
        recent_results = recent_results[-window:]
        wins = sum(1 for result in recent_results if result)
        losses = len(recent_results) - wins
        out.append({
            "date": m.get("completed_at"),
            "match_id": m.get("id"),
            "opponent": opponent,
            "won": won,
            "window": len(recent_results),
            "wins": wins,
            "losses": losses,
            "win_rate": round((wins / len(recent_results)) * 100, 1),
            "tournament_id": m.get("tournament_id"),
            "tournament_name": m.get("tournament_name"),
        })
    return out

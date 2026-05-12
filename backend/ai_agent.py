"""AI agent for answering billiards data questions using Claude via the Anthropic SDK."""
import os
from typing import List, Dict, Any

import anthropic


def _build_context(stats: Dict[str, Any], matches: List[Dict[str, Any]]) -> str:
    """Compact text representation of all data so Claude can reason over it."""
    lines = []
    lines.append("=== BILLIARDS DATABASE SNAPSHOT ===")
    lines.append(f"Total tournaments: {stats.get('total_tournaments', 0)}")
    lines.append(f"Total matches completed: {stats.get('total_matches', 0)}")
    lines.append(f"Total players: {stats.get('total_players', 0)}")
    lines.append("")
    lines.append("=== PLAYER WIN/LOSS RECORDS ===")
    for p in stats.get("players", []):
        lines.append(
            f"- {p['name']}: {p['wins']}W-{p['losses']}L "
            f"(win_rate={p['win_rate']}%)"
        )
    lines.append("")
    lines.append("=== ALL COMPLETED MATCHES (winner vs loser, score, tournament) ===")
    for m in matches:
        score = m.get("scores", "n/a")
        lines.append(
            f"- [{m.get('tournament_name', '?')}] "
            f"{m['winner_name']} def. {m['loser_name']} ({score})"
        )
    return "\n".join(lines)


SYSTEM_PROMPT = """You are CueStats AI, an expert billiards/pool analyst.

You have access to a snapshot of a billiards database (tournaments, players, head-to-head match results) provided in the user message. Use ONLY that data to answer.

Guidelines:
- Be precise and concise. Cite specific numbers from the data.
- For head-to-head questions ("who beat X the most"), count winner vs loser pairs across all matches and return the top opponent(s) with the count.
- For "win rate" or "best player" questions, use the W-L records.
- If the data doesn't contain enough info, say so clearly. Never invent matches.
- Keep answers under 200 words unless a list is requested.
- Use a conversational, sporty tone but stay factual.
"""


async def ask_agent(
    question: str,
    session_id: str,
    stats: Dict[str, Any],
    matches: List[Dict[str, Any]],
) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    context = _build_context(stats, matches)
    full_msg = f"{context}\n\n=== USER QUESTION ===\n{question}"

    client = anthropic.AsyncAnthropic(api_key=api_key)
    message = await client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": full_msg}],
    )
    return message.content[0].text

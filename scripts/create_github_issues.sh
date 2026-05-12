#!/usr/bin/env bash
# =============================================================================
# create_github_issues.sh
# -----------------------------------------------------------------------------
# Reads BACKLOG.md and seeds GitHub Issues for the CueStats / Fremont Open repo.
#
# Prerequisites:
#   - gh CLI installed (https://cli.github.com/) and authenticated (`gh auth login`)
#   - Run from the repo root (or any subdirectory — the script locates the root)
#   - The target repo must be the one that `gh repo view` resolves to
#
# Usage:
#   bash scripts/create_github_issues.sh [--dry-run] [--close-done] [--help]
#
# Flags:
#   --dry-run     Print what would be created/skipped/closed without calling the API
#   --close-done  Close any open GitHub Issue whose title is no longer in the active
#                 backlog (i.e. the item was moved to ✅ Done or deleted from BACKLOG.md)
#   --help        Print this message and exit
#
# What it does:
#   1. Creates one GitHub label per epic slug  (e.g. "epic:tournaments")
#   2. Creates P0 / P1 / P2 / P3 priority labels if they don't already exist
#   3. For each non-Done backlog row, creates a GitHub Issue unless an issue
#      with the same title already exists (idempotent re-runs)
#   4. [--close-done] Closes any open issue that carries one of our epic labels
#      but whose title is no longer present in the active backlog tables
#   5. Prints a summary: N labels created, M issues created, K skipped, J closed
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
DRY_RUN=false
CLOSE_DONE=false
for arg in "$@"; do
  case "$arg" in
    --dry-run)    DRY_RUN=true ;;
    --close-done) CLOSE_DONE=true ;;
    --help|-h)
      sed -n '/^# Usage:/,/^# =/p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: bash scripts/create_github_issues.sh [--dry-run] [--close-done] [--help]" >&2
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Locate repo root (where BACKLOG.md lives)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKLOG="$REPO_ROOT/BACKLOG.md"

if [[ ! -f "$BACKLOG" ]]; then
  echo "ERROR: BACKLOG.md not found at $BACKLOG" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Verify gh CLI is available and authenticated
# ---------------------------------------------------------------------------
if ! command -v gh &>/dev/null; then
  echo "ERROR: 'gh' CLI not found. Install from https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "ERROR: gh CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)"
if [[ -z "$REPO" ]]; then
  echo "ERROR: Could not detect GitHub repo. Run from inside a GitHub-connected git repo." >&2
  exit 1
fi

echo "Target repo: $REPO"
$DRY_RUN && echo "[DRY RUN mode — no API calls will be made]"
echo ""

# ---------------------------------------------------------------------------
# Counters
# ---------------------------------------------------------------------------
LABELS_CREATED=0
ISSUES_CREATED=0
ISSUES_SKIPPED=0
ISSUES_CLOSED=0

# ---------------------------------------------------------------------------
# Helper: create_label <name> <color_hex> <description>
# ---------------------------------------------------------------------------
create_label() {
  local name="$1"
  local color="$2"
  local desc="$3"

  if $DRY_RUN; then
    echo "[DRY RUN] Would create label: '$name' (#$color)"
    LABELS_CREATED=$((LABELS_CREATED + 1))
    return
  fi

  if gh label create "$name" \
      --color "$color" \
      --description "$desc" \
      --repo "$REPO" \
      --force \
      2>/dev/null; then
    echo "  Label created/updated: $name"
    LABELS_CREATED=$((LABELS_CREATED + 1))
  else
    echo "  Label already up-to-date: $name"
  fi
}

# ---------------------------------------------------------------------------
# Helper: issue_exists <title>
# Returns 0 if an open or closed issue with that exact title exists
# ---------------------------------------------------------------------------
issue_exists() {
  local title="$1"
  local count
  count="$(gh issue list \
    --repo "$REPO" \
    --state all \
    --search "\"$title\" in:title" \
    --json title \
    --jq "[.[] | select(.title == \"$title\")] | length" \
    2>/dev/null)"
  [[ "${count:-0}" -gt 0 ]]
}

# ---------------------------------------------------------------------------
# Helper: create_issue <title> <labels_csv> <body>
# ---------------------------------------------------------------------------
create_issue() {
  local title="$1"
  local labels="$2"
  local body="$3"

  if $DRY_RUN; then
    echo "[DRY RUN] Would create issue: '$title'  [labels: $labels]"
    ISSUES_CREATED=$((ISSUES_CREATED + 1))
    return
  fi

  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --label "$labels" \
    --body "$body" \
    >/dev/null

  echo "  Issue created: $title"
  ISSUES_CREATED=$((ISSUES_CREATED + 1))
}

# ---------------------------------------------------------------------------
# Epic definitions: (slug color description epic_number)
# Colors are hex without the '#'
# ---------------------------------------------------------------------------
declare -a EPIC_SLUGS=(
  tournaments
  players
  ai
  community
  admin
  charts
  mobile-ux
  seasons
  integrations
  platform
  business
)

EPIC_LABEL_COLOR="0075ca"

declare -A EPIC_COLORS=(
  [tournaments]="$EPIC_LABEL_COLOR"
  [players]="$EPIC_LABEL_COLOR"
  [ai]="$EPIC_LABEL_COLOR"
  [community]="$EPIC_LABEL_COLOR"
  [admin]="$EPIC_LABEL_COLOR"
  [charts]="$EPIC_LABEL_COLOR"
  [mobile-ux]="$EPIC_LABEL_COLOR"
  [seasons]="$EPIC_LABEL_COLOR"
  [integrations]="$EPIC_LABEL_COLOR"
  [platform]="$EPIC_LABEL_COLOR"
  [business]="$EPIC_LABEL_COLOR"
)

declare -A EPIC_DESCS=(
  [tournaments]="Tournament Visualization & History"
  [players]="Player Profiles, Ratings & Identity"
  [ai]="AI Agent Enhancements"
  [community]="Engagement & Community"
  [admin]="Admin & Data Quality"
  [charts]="Visualizations & Charts"
  [mobile-ux]="Mobile & UX"
  [seasons]="Series, Seasons & League Standings"
  [integrations]="Integrations"
  [platform]="Platform, Scaling & Performance"
  [business]="Monetization & Smart Business"
)

# Map EPIC number → slug (1-indexed)
declare -a EPIC_NUMBER_TO_SLUG=(
  ""             # placeholder so index 1 = first real epic
  "tournaments"  # EPIC 1
  "players"      # EPIC 2
  "ai"           # EPIC 3
  "community"    # EPIC 4
  "admin"        # EPIC 5
  "charts"       # EPIC 6
  "mobile-ux"    # EPIC 7
  "seasons"      # EPIC 8
  "integrations" # EPIC 9
  "platform"     # EPIC 10
  "business"     # EPIC 11
)

# Priority label colours
declare -A PRIORITY_COLORS=(
  [P0]="b60205"
  [P1]="e4680a"
  [P2]="fbca04"
  [P3]="0e8a16"
)
declare -A PRIORITY_DESCS=(
  [P0]="Ship next — blocking"
  [P1]="Near-term"
  [P2]="Nice-to-have"
  [P3]="Someday / maybe"
)

# ---------------------------------------------------------------------------
# Step 1 — Create epic labels
# ---------------------------------------------------------------------------
echo "=== Step 1: Epic labels ==="
for slug in "${EPIC_SLUGS[@]}"; do
  create_label "epic:${slug}" "${EPIC_COLORS[$slug]}" "${EPIC_DESCS[$slug]}"
done
echo ""

# ---------------------------------------------------------------------------
# Step 2 — Create priority labels
# ---------------------------------------------------------------------------
echo "=== Step 2: Priority labels ==="
for p in P0 P1 P2 P3; do
  create_label "$p" "${PRIORITY_COLORS[$p]}" "${PRIORITY_DESCS[$p]}"
done
echo ""

# ---------------------------------------------------------------------------
# Step 3 — Parse BACKLOG.md and create issues
# ---------------------------------------------------------------------------
echo "=== Step 3: Issues ==="

# State machine variables
current_epic_num=0
current_epic_slug=""
in_done_section=false
in_table=false

# Associative array used as a set: active_titles[title]=1
# Populated during parsing so Step 4 can check membership.
declare -A active_titles=()

# Strip CRLF, then process line by line
while IFS= read -r raw_line; do
  line="${raw_line%$'\r'}"

  # Detect the Done section — skip everything inside it
  if [[ "$line" =~ ^##[[:space:]]+✅[[:space:]]Done ]]; then
    in_done_section=true
    in_table=false
    continue
  fi

  # Any new ## heading that is NOT the Done section ends the Done section
  if [[ "$line" =~ ^##[[:space:]] && ! "$line" =~ ✅ ]]; then
    in_done_section=false
  fi

  $in_done_section && continue

  # Detect EPIC heading  e.g. "## EPIC 3 — AI Agent Enhancements"
  if [[ "$line" =~ ^##[[:space:]]+EPIC[[:space:]]+([0-9]+)[[:space:]] ]]; then
    current_epic_num="${BASH_REMATCH[1]}"
    current_epic_slug="${EPIC_NUMBER_TO_SLUG[$current_epic_num]:-}"
    in_table=false
    continue
  fi

  # Any other ## heading (Top 10, Tracking, etc.) resets epic context
  if [[ "$line" =~ ^##[[:space:]] ]]; then
    current_epic_num=0
    current_epic_slug=""
    in_table=false
    continue
  fi

  # Skip if we're not inside a recognised EPIC
  [[ -z "$current_epic_slug" ]] && continue

  # Detect table header / separator rows
  if [[ "$line" =~ ^\|[[:space:]]*#[[:space:]]*\| ]]; then
    in_table=true
    continue
  fi
  if [[ "$line" =~ ^\|[-|[:space:]]+\| ]]; then
    continue
  fi

  # Parse data rows:  | 1.1 | P1 | M | **Title** rest of description |
  if $in_table && [[ "$line" =~ ^\|[[:space:]]*([0-9]+\.[0-9]+)[[:space:]]*\|[[:space:]]*(P[0-3])[[:space:]]*\|[[:space:]]*([SML])[[:space:]]*\|(.+)\|[[:space:]]*$ ]]; then
    item_num="${BASH_REMATCH[1]}"
    priority="${BASH_REMATCH[2]}"
    effort="${BASH_REMATCH[3]}"
    raw_desc="${BASH_REMATCH[4]}"

    # Clean up the description: strip leading/trailing spaces and markdown bold markers
    desc="$(echo "$raw_desc" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/\*\*//g')"

    # Extract the short title from the FIRST **bold** span using POSIX sed.
    # Two-step: strip everything before the first **, then strip from the next ** onward.
    # Falls back to the full trimmed description when no bold span is present.
    if echo "$raw_desc" | grep -q '\*\*'; then
      title_raw="$(echo "$raw_desc" | sed 's/^[^*]*\*\*//;s/\*\*.*//')"
    else
      title_raw="$desc"
    fi
    title="$title_raw"

    # Record this title as active so --close-done can check membership later
    active_titles["$title"]=1

    # Map effort code to human label
    case "$effort" in
      S) effort_label="S (≤ 1 day)" ;;
      M) effort_label="M (1–3 days)" ;;
      L) effort_label="L (> 3 days)" ;;
      *) effort_label="$effort" ;;
    esac

    # Build issue body matching the feature.yml template fields
    body="### Epic
${current_epic_slug}

### Summary
${desc}

### Why
Part of the **${EPIC_DESCS[$current_epic_slug]}** epic (backlog item ${item_num}). Improves the CueStats / Fremont Open experience.

### Acceptance criteria
- [ ] ${desc}

### Estimated effort
${effort_label}"

    labels="epic:${current_epic_slug},${priority},enhancement"

    # Check for duplicates
    if ! $DRY_RUN && issue_exists "$title"; then
      echo "  Skipped (exists): $title"
      ISSUES_SKIPPED=$((ISSUES_SKIPPED + 1))
    else
      create_issue "$title" "$labels" "$body"
    fi
  fi

done < "$BACKLOG"

# ---------------------------------------------------------------------------
# Step 4 — Close issues for completed backlog items (--close-done)
# ---------------------------------------------------------------------------
# Strategy: fetch every OPEN issue that carries at least one "epic:*" label.
# Any such issue whose title is NOT in the active_titles set is no longer in
# the backlog tables — it was moved to ✅ Done or deleted — and should be
# closed with an explanatory comment.
# In --dry-run mode the fetch still happens so we can report exactly which
# issues would be closed; only the actual close call is suppressed.
# ---------------------------------------------------------------------------
if $CLOSE_DONE; then
  echo ""
  echo "=== Step 4: Close completed issues (--close-done) ==="

  # Fetch open issues for each epic label, accumulate unique number→title pairs.
  declare -A seen_issues=()

  for slug in "${EPIC_SLUGS[@]}"; do
    while IFS= read -r entry; do
      num="$(echo "$entry" | sed 's/|.*//')"
      ttl="$(echo "$entry" | sed 's/^[^|]*|//')"
      if [[ -n "$num" && -z "${seen_issues[$num]+_}" ]]; then
        seen_issues["$num"]="$ttl"
      fi
    done < <(
      gh issue list \
        --repo "$REPO" \
        --state open \
        --label "epic:${slug}" \
        --limit 500 \
        --json number,title \
        --jq '.[] | "\(.number)|\(.title)"' \
        2>/dev/null || true
    )
  done

  # Close (or report) any issue whose title is not in the active backlog.
  for num in "${!seen_issues[@]}"; do
    issue_title="${seen_issues[$num]}"
    if [[ -z "${active_titles[$issue_title]+_}" ]]; then
      if $DRY_RUN; then
        echo "[DRY RUN] Would close #${num}: ${issue_title}"
      else
        gh issue close "$num" \
          --repo "$REPO" \
          --comment "Automatically closed by sync script: this backlog item has been marked ✅ Done in BACKLOG.md or was removed from the active backlog." \
          2>/dev/null
        echo "  Closed #${num}: ${issue_title}"
      fi
      ISSUES_CLOSED=$((ISSUES_CLOSED + 1))
    fi
  done

  if [[ $ISSUES_CLOSED -eq 0 ]]; then
    echo "  No open issues to close — all are still in the active backlog."
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== Summary ==="
echo "  Labels created/updated : $LABELS_CREATED"
echo "  Issues created         : $ISSUES_CREATED"
echo "  Issues skipped         : $ISSUES_SKIPPED"
if $CLOSE_DONE; then
  echo "  Issues closed          : $ISSUES_CLOSED"
fi

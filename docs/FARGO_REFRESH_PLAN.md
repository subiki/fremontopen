# Fargo Monthly Refresh Plan

Issue: https://github.com/subiki/fremontopen/issues/68

## Goal

Refresh player Fargo ratings about once per month, store the Fargo number on the player profile, and use it as a future data-quality signal for dedupe review.

## Constraints

- FargoRate does not currently provide a documented public API for this project.
- The site should not bypass access controls, defeat blocking, or depend on fragile scraping as a core data source.
- The current demo is a static React site backed by exported cache data, so refresh work should happen in local or CI tooling before `cache.json` is published.
- Fargo numbers should help humans review possible player merges; they should not automatically merge ambiguous players by themselves.

## Proposed Approach

1. Confirm a permitted source
   - Preferred: official FargoRate API, partner export, CSV, or another source we are allowed to query.
   - Fallback: manual local overrides until a permitted automated source exists.
   - https://fairmatch.fargorate.com/ curl

2. Add a local overrides/source file
   - Track canonical player name, Fargo ID or profile URL, rating, source, confidence, and last checked date.
   - Keep unmatched and ambiguous players in the file/report instead of guessing.
   - Reuse this source later for nicknames and other local profile fields.

3. Build a refresh CLI
   - Input: current cached player list plus the local Fargo source file.
   - Output: updated ratings, unmatched player report, ambiguous match report, and a summary diff.
   - Include `--dry-run`, `--limit`, and `--player` flags for safe testing.
   - Apply conservative rate limiting, request caching, retries, and backoff for any allowed remote source.

4. Run monthly
   - `.github/workflows/data-refresh.yml` includes a monthly Fargo pass.
   - Set `FARGO_SOURCE_URL` to an authorized CSV, JSON, or HTML source URL.
   - Optional `FARGO_SOURCE_LABEL` and `FARGO_FETCH_DELAY_SECONDS` secrets tune metadata and fetch delay.
   - Stop early on authorization errors, 429s, or unexpected source-shape changes.

5. Surface in the app
   - Add Fargo rating to player profiles and ranking tables when present.
   - Show source and last refreshed date where useful.
   - Add dedupe review hints when two records share a confirmed Fargo ID, but leave ambiguous cases for manual action.

## First Implementation Slice

- Add a `backend/player_overrides.json` file for manual Fargo ratings and profile metadata.
- Extend export/static cache generation to include `player.fargo`, `player.fargo_source`, and `player.fargo_updated_at`.
- Display Fargo on player detail pages when present.
- Produce a dedupe hint report for matching Fargo IDs without auto-merging records.
- Wire the monthly scheduled workflow to run only against an authorized source URL.

## Open Questions

- Which FargoRate access path is permitted for Fremont Open use? https://fairmatch.fargorate.com/
- Should Fargo values be public on the static site, or only used internally for dedupe and tournament reporting? public
- Who owns monthly review of unmatched and ambiguous players? try again next month until a fargo number appears

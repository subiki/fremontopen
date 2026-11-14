# Fremont Open — Saturday Challonge bracket runbook

**Updated:** 2026-11-14  
**For:** weekly 4B's Tavern pool tournaments in the `fremontopen` Challonge community.  
**Examples:** [2026-11-14 8-ball publisher](../scripts/publish_challonge_nov14.py), [unit tests](../tests/test_publish_challonge_nov14.py), [one-shot workflow](../.github/workflows/publish-challonge-nov14.yml).

Use these steps when asked to create "today's bracket." Creation is not completion until a **logged-out visitor can see the public registration action**. Do not start the bracket for the organizer.

## Default settings

| Setting | Value |
| --- | --- |
| Challonge community | `fremontopen`; `https://fremontopen.challonge.com` |
| Name | `4Bs 8 ball M/D/YY` or `4Bs 9 ball M/D/YY` |
| Slug | `4bs8ballMMDDYY` or `4bs9ballMMDDYY` (zero-padded month/day), e.g. `4bs8ball111426` |
| Game | Saturday alternation: 2026-11-14 = 8-ball, 2026-11-21 = 9-ball; verify preceding event before proceeding |
| Venue | 4B's Tavern, 4300 Leary Way NW, Seattle, WA 98107 |
| Format | Double elimination; BCA rules; no group stage or split participants |
| Start time | Saturday 1:00 PM `America/Los_Angeles`; DST-aware date |
| In-person registration | Noon–1:00 PM; $10 collected in person |
| Ages | 21+; all skill levels welcome |
| Tournament visibility | **Public**, not excluded from search/index (`private: false` in API) |
| Registration mode | **Host a sign-up page**; API `registration_options.open_signup: true` |
| **Registration link visibility** | **Make your sign-up page publicly visible** — a **separate Challonge UI option**, not verified by `open_signup` |
| Stations | Exactly `Table 1`, `Table 2`, `Table 3`, `Table 4` |
| Station assignment | `station_options.auto_assign: true` |
| Station requirement | `station_options.only_start_matches_with_assigned_stations: true` |
| Players | No fabricated or prefilled participants; preserve existing signups |
| Bracket state | **Pending / unstarted** until the human organizer starts it |

### Critical lesson from 2026-11-14: THREE separate checks

1. **Tournament public:** `private: false`. A public tournament does not necessarily have a publicly visible registration link.
2. **Hosted registration exists:** `registration_options.open_signup: true`. This enables a signup page but **does not establish that the signup action appears on the bracket**.
3. **Registration link publicly visible:** In Challonge **Settings → Registration**, choose **Make your sign-up page publicly visible**; save. Check the public tournament page in a **logged-out/private-browser window** for a visible registration action above the unstarted bracket. If missing, **do not report success**.

Challonge's published v2.1 tournament input schema documents `private` and `registration_options.open_signup`, but **does not document a distinct field for the "Make your sign-up page publicly visible" checkbox**. Treat this as a **manual UI verification/setting**, not something the existing publisher proved. Do not guess an undocumented API field or claim completion from a green workflow.

Challonge references:
- [Hosting a Sign-Up Page — official help](https://kb.challonge.com/en/article/hosting-a-sign-up-page-hsknjd/)
- [TournamentInput — official v2.1 API schema](https://challonge.apidog.io/tournamentinput-10582243d0)

## Workflow: create or repair the weekly bracket

1. **Confirm date, rotation, and no duplicate.** Use Pacific time and check the live `fremontopen` community for an event with the same date, name or slug. If it exists, **repair that event**, preserving tournament ID, player signups and results. If another 4Bs tournament appears on the same date, or the existing bracket has started, stop and inspect with the organizer. **Never create a second tournament for the date.**
2. **Create via server-side tooling.** For a new date, copy the most recent working `scripts/publish_challonge_*.py`, its `tests/test_publish_challonge_*.py`, and the matching `.github/workflows/publish-challonge-*.yml`. Change the complete date, name, slug, 8-/9-ball game, workflow paths, concurrency group, and human-readable job title. Keep creation idempotent (list first; reuse exact existing event; fail closed on conflicts). Prefer a feature branch and PR rather than writing directly to `main`.
3. **Use the existing secret.** Run the publisher from GitHub Actions with `secrets.CHALLONGE_API_KEY` (server side only). Never put credentials in tracked files, PR text, logs, frontend assets, or the browser. The public Fremont Open website remains static and read-only.
4. **API-check the resulting tournament.** GET the actual event after POST/PUT; verify expected local date, name/slug, game, format, `private is false`, `registration_options.open_signup is true`, four **unique** named stations, both station flags enabled, and state still pending/unstarted. Unit-test success **is not remote success**. Preserve participant registrations and do not generate fake names.
5. **Set public signup display in Challonge UI.** Sign into Challonge as the organizer; open the **existing tournament**; select **Settings → Registration**; choose **Host a sign-up page** AND **Make your sign-up page publicly visible**; save. Do not accidentally enable Challonge paid registration: the $10 fee is collected at the venue.
6. **Guest acceptance check (mandatory).** Open the exact tournament URL in a logged-out/private browser window. Verify page loads without organizer credentials; registration action/link is **visible above the bracket** before it starts; opening it leads to signup/login rather than an organizer-only page. A Challonge account may be required to finish registering. If the registration action is invisible, the job is **not done**, regardless of API success.
7. **Handoff.** Give the organizer the real tournament URL plus explicit status: "bracket created, four tables configured, public page verified, signup button verified, bracket unstarted." If the UI/guest check could not be completed, label those checks **unverified** and state the manual action needed. The organizer chooses when to start the bracket.

## Quick validation checklist

- [ ] Correct Pacific-local Saturday, 8-/9-ball type, name, and URL slug
- [ ] No duplicate tournament for the date; existing players/results preserved
- [ ] Public tournament (`private=false`)
- [ ] Hosted signup page (`open_signup=true`)
- [ ] **Make your sign-up page publicly visible** checked in Challonge UI
- [ ] Guest window shows public tournament **and** visible registration link
- [ ] Four tables; automatic assignment and required assigned station
- [ ] BCA double elimination; $10 paid at venue, 1 PM Pacific start
- [ ] Bracket pending/unstarted; no invented players
- [ ] Live API verification, workflow result, and guest/UI check all reported accurately

## Troubleshooting

**"There is a sign-up page but it is not public."** Inspect the **separate public-signup-display checkbox** in Challonge Settings → Registration. `open_signup=true` and `private=false` are necessary API checks but do **not** substitute for this UI setting. Save; re-open as a logged-out visitor.

**"I can view the bracket but don't see Register."** Check that the tournament hasn't already been started or closed, that the hosted sign-up page is enabled, and that **Make your sign-up page publicly visible** is enabled. Do not reset a started event to solve a display issue.

**"API workflow passed but players can't sign up."** Report API success only. Verify real visitor path. Do not infer the public registration UX from server-side flags alone.

**"An event for this date already exists."** Never delete/recreate it merely to reapply settings. Review the event ID, same-day conflicts, state and participant registrations first.

**"Can I automate public-signup-link visibility?"** Not with the documented v2.1 settings used by the current scripts. First validate an officially supported field or a safe authenticated UI automation path, and then test with a guest browser. Until then, the manual UI step is a required gate.

# Ideas — raw brainstorm capture

> Lower bar than `BACKLOG.md`. This is a junk drawer for half-baked thoughts.
> Promote items to `BACKLOG.md` once they're shaped enough to estimate.

---

## Player engagement
- **Rivalry meter** — a single number that captures how heated two players' h2h is (closeness + recency + match count). Surface "rivalry of the week" on dashboard.
- **"Hot hand" indicator** — small flame icon next to players on streaks of 3+ wins this month.
- **Anniversary stats** — "1 year ago today, X beat Y in their first-ever meeting."
- **Bracket-buster of the week** — biggest seed upset across all Saturday matches.
- **Cinderella distance** — for any tournament champion, "you climbed N seeds to win."

## Tournament feel
- **Live bracket pulse on Saturdays** — show "match in progress" markers (would require finer sync on game day only).
- **Estimated tournament length** — based on historical match durations.
- **Heatmap of break / racks won** if we ever collect that granularity.
- **Tournament "twin"** — find the most-similar past tournament by participant overlap and game type.

## Community / social
- **Player "fan" count** — show count of users who follow them on their profile (number only, not identities — keeps privacy).
- **Photo of the week** — admin uploads one shot per Saturday tournament.
- **"What's your handicap?"** quiz that estimates Fargo from a handful of questions, for unrated players.
- **Players-night calendar** — public iCal feed with each Saturday + venue.

## Discord bot (deferred)
- `/whobeat <player>` slash command returns top opponents.
- `/leaderboard` posts the top-10 as a rich embed.
- `/stats <player>` posts the OG card.
- `/random` posts a random stat anecdote ("Did you know — Captain Hook has never lost on a Saturday afternoon").
- Auto-post the weekly recap to the league's #results channel.

## AI-generated content
- **Match recap** — 3-sentence write-up per match (winner, loser, score, notable context).
- **Tournament recap** — 100-word narrative summary, posted as a "story" per tournament.
- **Player profile bio** — auto-generated 50-word bio mentioning streaks, titles, biggest rival.
- **"You did this" notification** — when a claimed player breaks a record, send a templated email/Discord DM.
- **Trash-talk generator** — fun button on profile to roast based on data.

## Analytics features that need more data
- **Time-of-day performance** — does player X win more in early matches vs late?
- **Days-since-last-played decay** — does ring-rust hurt win rate?
- **Pressure-rating** — clutch matches (final round, deciding game) win rate vs overall.
- **Opponent-strength-adjusted W%** — already in the works (perf-vs-Fargo).

## Monetization / sponsorship
- **"Brought to you by Talarico's"** banner — admin configures per week.
- **Pro Shop affiliate links** on player pages — "X plays a Predator Black Widow" → affiliate.
- **Premium tier**: white-label for other leagues.
- **Crowd-funded prize pots** — Stripe Connect; "Sponsor a player" button.
- **Saturday raffle** — claimed users get one entry per Saturday they show up. Admin draws via UI.

## Platform / scale
- **Multi-tenant** — host other leagues. Subdomain routing + tenant scoping.
- **Sync-mode-via-webhooks** — Challonge supports webhooks; subscribe and drop the cron.
- **Edge cache for OG images** — Cloudflare in front for free if domain gets traction.
- **Player picture upload** — S3-compatible object storage.

## Data quality + admin
- **"Suggest a fix"** anonymous link — public visitor flags a typo; admin reviews in queue.
- **Edit history** — show the audit log next to each player profile (admin-only).
- **Tournament-level admin overrides** — flag a bracket as "exhibition / unrated" so it doesn't count toward stats.
- **Match annotations** — admin notes ("Player X forfeit due to injury") visible on match detail.

## Quirky / fun
- **8-ball "magic 8-ball" widget** — type a question, AI gives a billiards-themed answer.
- **Player nickname generator** — AI suggests funny nicknames based on stats.
- **Bracket bingo** — predict the bracket Saturday morning; track accuracy across the season.
- **Card pack metaphor** — claimed players get a "trading card" (stylized OG card) that updates each Saturday.

## Mobile / PWA
- **Saturday-morning push** — "Your tournament starts in 1 hour."
- **Live match notifications** — when a followed player wins.
- **Offline mode** — read-only stats cached in service worker.

## Things explicitly NOT to build
- Direct messaging between users.
- Public who-follows-whom graph.
- Public username display.
- Real-money payments (until/unless legal review).
- Any feature that requires a user-triggered Challonge call.

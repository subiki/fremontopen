import {
  CalendarDots,
  MapPin,
  Money,
  ShieldCheck,
  Users,
} from "@phosphor-icons/react";
import { Topbar } from "../components/Topbar";

const snapshot = [
  { label: "Where", value: "4B's Tavern — all in house, no travel", icon: MapPin },
  { label: "Field", value: "Up to 8 teams, 4 roster spots each", icon: Users },
  { label: "League night", value: "One fixed night each week — announced before signup", icon: CalendarDots },
  { label: "Games", value: "8-ball + 9-ball inside the same match", icon: ShieldCheck },
  { label: "Handicap", value: "Fargo-based races with weekly rating locks", icon: ShieldCheck },
  { label: "Season", value: "12 regular weeks + Final Four + Championship", icon: CalendarDots },
];

const matchFlow = [
  {
    title: "Four individual races",
    body: "Each team matchup has four roster slots. Every completed individual race is worth one team point and also counts toward that player's individual standings.",
  },
  {
    title: "Choose your opening game",
    body: "Lag winner chooses either 8-ball or 9-ball first, or takes the first break. Play a three-rack opening block, carry the score forward, then switch disciplines.",
  },
  {
    title: "Short Fargo-based race",
    body: "The rating difference sets the race. The target is competitive matches that fit a normal league night without APA-style innings or paperwork.",
  },
];

const teamPayouts = [
  ["Playoff champions", "$1,600"],
  ["Runner-up", "$800"],
  ["Regular-season champions", "$800"],
];

const individualPayouts = [
  ["1st", "$1,000"],
  ["2nd", "$700"],
  ["3rd", "$500"],
  ["4th", "$350"],
  ["5th", "$250"],
  ["6th", "$175"],
  ["7th", "$125"],
  ["8th", "$100"],
];

const finale = [
  "Top four teams advance to the Final Four; the regular-season title also pays cash.",
  "Semifinals get more table space and longer races so playoff night feels different from the regular season.",
  "The championship uses all four roster spots and all four tables when possible.",
  "If the championship finishes 2–2, each captain names an anchor player for one deciding handicapped race while the room watches.",
];

const openItems = [
  "The fixed league night, based on 4B's table availability and player turnout.",
  "The final Fargo-to-race chart after a live playtest confirms match length.",
  "Small payout adjustments if the field lands above or below 32 players.",
];

export default function Derby() {
  return (
    <>
      <Topbar
        title="Fremont Derby"
        subtitle="Team pool with individual money on the line"
      />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8 space-y-8" data-testid="derby-page">
        <section className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.75fr] gap-6">
          <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981] mb-3">
              Proposed Season 1 format
            </p>
            <h1 className="font-[Outfit] text-3xl sm:text-4xl font-bold text-[#F3F4F6] leading-tight mb-4">
              Play for your team. Get paid for your own game.
            </h1>
            <p className="text-[#CBD5E1] leading-7 max-w-3xl">
              Fremont Derby is a seasonal 4B's house league built around four tables, no travel, Fargo-based handicaps, and real prize money. Every player competes in two races at the same time: the team championship and the individual standings. A bad team season does not erase a great individual season.
            </p>
            <div className="mt-6 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 p-5">
              <p className="text-[#D1FAE5] font-semibold">The important part: your match still matters.</p>
              <p className="mt-1 text-sm leading-6 text-[#CBD5E1]">
                If your team is short, the missing roster slots are team forfeits. The players who show up still play their races, keep their individual results, and stay eligible for individual prize money. In the extreme, one player could show up, forfeit the other three team slots, win their own race, and keep building toward an individual cash finish.
              </p>
            </div>
          </div>

          <div className="bg-[#10151F] border border-[#273041] rounded-lg p-6">
            <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280] mb-2">32-player example</div>
            <div className="text-4xl font-bold text-[#F3F4F6]">$8,000</div>
            <div className="text-sm text-[#9CA3AF] mt-1">total season entry</div>
            <div className="mt-6 space-y-4 text-sm leading-6 text-[#CBD5E1]">
              <p><strong className="text-[#F3F4F6]">$6,400 prize purse</strong> — $200 from every entry goes back to players.</p>
              <p><strong className="text-[#F3F4F6]">$3,200 team money</strong> — championship, runner-up, and regular-season title.</p>
              <p><strong className="text-[#F3F4F6]">$3,200 individual money</strong> — top eight individual finishes cash.</p>
              <p><strong className="text-[#F3F4F6]">$1,600 administration</strong> — $50 per player to run scheduling, ratings, scoring, disputes, and finals.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="derby-snapshot-title">
          <h2 id="derby-snapshot-title" className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-4">
            The league
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {snapshot.map((item) => (
              <div key={item.label} className="bg-[#141923] border border-[#273041] rounded-lg p-5">
                <item.icon size={22} weight="duotone" className="text-[#10B981] mb-4" />
                <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280] mb-2">{item.label}</div>
                <div className="text-[#F3F4F6] font-semibold leading-6">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981] mb-3">How a league night works</p>
          <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-3">
            Four races decide the team score. Every race also builds your own season.
          </h2>
          <p className="text-sm leading-6 text-[#CBD5E1] max-w-4xl mb-6">
            Teams have four roster spots. Players are matched head-to-head, and every completed match is recorded rack by rack on the Fremont Derby website. A win earns one team point and one individual match win. A 2–2 regular-season team result is a draw; postseason ties go to the anchor race.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {matchFlow.map((step, index) => (
              <div key={step.title} className="border border-[#273041] rounded-lg p-5 bg-[#0B0E14]">
                <div className="w-8 h-8 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] font-semibold mb-4">
                  {index + 1}
                </div>
                <h3 className="font-[Outfit] text-lg font-semibold text-[#F3F4F6]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#CBD5E1]">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-3">Team money — $3,200</h2>
            <p className="text-sm leading-6 text-[#CBD5E1] mb-5">
              Team play matters, but it is only half the purse. Regular-season performance pays, and the playoffs finish with a real championship night.
            </p>
            <div className="space-y-2">
              {teamPayouts.map(([label, amount]) => (
                <div key={label} className="flex items-center justify-between gap-4 border border-[#273041] rounded-lg px-4 py-3 bg-[#0B0E14]">
                  <span className="text-sm text-[#CBD5E1]">{label}</span>
                  <strong className="text-[#D1FAE5]">{amount}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-3">Individual money — $3,200</h2>
            <p className="text-sm leading-6 text-[#CBD5E1] mb-5">
              The top eight individual seasons cash. You can be on the last-place team and still win the $1,000 individual title.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {individualPayouts.map(([place, amount]) => (
                <div key={place} className="flex items-center justify-between gap-3 border border-[#273041] rounded-lg px-4 py-3 bg-[#0B0E14]">
                  <span className="text-sm text-[#9CA3AF]">{place}</span>
                  <strong className="text-[#D1FAE5]">{amount}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-3">Sign up with a team — or sign up alone</h2>
            <div className="space-y-3 text-sm leading-6 text-[#CBD5E1]">
              <p><strong className="text-[#F3F4F6]">Full teams:</strong> bring up to four players and compete for both halves of the purse.</p>
              <p><strong className="text-[#F3F4F6]">Single players:</strong> register as a free agent and we will place you into an open roster where possible.</p>
              <p><strong className="text-[#F3F4F6]">Short-handed teams:</strong> unfilled slots are team forfeits, but every race actually played still counts in full for the individual standings and payouts.</p>
              <p><strong className="text-[#F3F4F6]">No dead season:</strong> being eliminated from the team race does not eliminate you from the individual money race.</p>
            </div>
          </div>

          <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-3">Scoring without paperwork</h2>
            <div className="space-y-3 text-sm leading-6 text-[#CBD5E1]">
              <p><strong className="text-[#F3F4F6]">Fargo is the rating backbone.</strong> Rating difference sets the race instead of APA-style skill levels.</p>
              <p><strong className="text-[#F3F4F6]">Ratings lock before league night.</strong> Nobody's handicap changes in the middle of play.</p>
              <p><strong className="text-[#F3F4F6]">Every rack is recorded.</strong> The score page knows the players, discipline, race, and current score; scorekeeping is designed to be one tap per rack.</p>
              <p><strong className="text-[#F3F4F6]">Standings update automatically.</strong> Team score, individual record, 8-ball record, 9-ball record, streaks, and head-to-head history all come from the same scorecard.</p>
            </div>
          </div>
        </section>

        <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981] mb-3">The payoff</p>
          <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-4">The final weeks should feel like an event</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {finale.map((item, index) => (
              <div key={item} className="flex gap-4 border border-[#273041] rounded-lg p-5 bg-[#0B0E14]">
                <div className="shrink-0 w-8 h-8 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] font-semibold">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-[#CBD5E1]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#10151F] border border-[#10B981]/30 rounded-lg p-6 sm:p-8">
          <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-2">This is the plan. Help us tune it.</h2>
          <p className="text-sm leading-6 text-[#CBD5E1] max-w-4xl mb-5">
            We are not starting from a blank sheet. The team-plus-individual structure, 8/9 block format, Fargo handicap, four-player rosters, transparent entry split, and postseason concept are the starting rules for Season 1. Before registration opens, we only need to pressure-test a few details.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {openItems.map((item) => (
              <div key={item} className="border border-[#273041] rounded-lg p-4 bg-[#0B0E14] text-sm leading-6 text-[#D1FAE5]">
                {item}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-[#9CA3AF]">
            Next step: one live playtest night at 4B's, then lock the race chart, publish the fixed league night, and open Season 1 registration.
          </p>
        </section>
      </main>
    </>
  );
}

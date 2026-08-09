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
  { label: "Teams", value: "Working model: 8 teams, 4 players each", icon: Users },
  { label: "League night", value: "One night each week on four tables — day TBD", icon: CalendarDots },
  { label: "Games", value: "8-ball + 9-ball in the same match", icon: ShieldCheck },
  { label: "Handicap", value: "Fargo-based races, not APA skill levels", icon: ShieldCheck },
  { label: "Season", value: "About 12 regular weeks + playoffs", icon: CalendarDots },
];

const matchFlow = [
  {
    title: "Lag for the choice",
    body: "The lag winner chooses either the opening discipline or the first break. The opponent gets the remaining choice.",
  },
  {
    title: "Play the opening block",
    body: "Working idea: play three racks of the chosen discipline during the regular season. The score carries forward.",
  },
  {
    title: "Switch games and finish the race",
    body: "Move from 8-ball to 9-ball, or vice versa, and continue until one player reaches their handicapped race target.",
  },
];

const finale = [
  "Top four teams advance to the championship bracket.",
  "Semifinals get extra table space so playoff night feels different from a normal league night.",
  "The championship uses all four rostered players, with four head-to-head matches available across the four tables.",
  "If the championship finishes 2–2, each captain names an anchor player for one deciding handicapped match while the room watches.",
];

const workshopQuestions = [
  "Which night of the week works best for the league?",
  "Does an 8-team / 4-player roster format feel right?",
  "Should three players compete each normal league night, or should all four play?",
  "Do you like the 8-ball / 9-ball block format and the choice between discipline or first break?",
  "How long should an individual race feel on a normal league night?",
  "What is the right season fee and how top-heavy should the prize payout be?",
  "What would make championship night something you would stay to watch even after your team is eliminated?",
];

export default function Derby() {
  return (
    <>
      <Topbar
        title="Fremont Derby"
        subtitle="A working proposal for a new in-house league at 4B's"
      />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8 space-y-8" data-testid="derby-page">
        <section className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.75fr] gap-6">
          <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981] mb-3">
              Working proposal — feedback wanted
            </p>
            <h1 className="font-[Outfit] text-3xl sm:text-4xl font-bold text-[#F3F4F6] leading-tight mb-4">
              A better in-house pool league, built at 4B's
            </h1>
            <p className="text-[#CBD5E1] leading-7 max-w-3xl">
              Fremont Derby is a proposed seasonal league built around the things we like about team pool without the travel, paperwork, or rigid league structure. The goal is simple: competitive handicapped matches, useful stats, transparent prize money, and final weeks that feel like an event.
            </p>
            <div className="mt-6 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 p-5">
              <p className="text-[#D1FAE5] font-semibold">The design target</p>
              <p className="mt-1 text-sm leading-6 text-[#CBD5E1]">
                Easy league nights. Serious standings. Awesome playoffs. Nothing on this page is final yet — this is the version to workshop with the players who would actually play it.
              </p>
            </div>
          </div>

          <div className="bg-[#10151F] border border-[#273041] rounded-lg p-6">
            <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-4">
              Current working model
            </h2>
            <div className="space-y-3 text-sm leading-6 text-[#CBD5E1]">
              <p><strong className="text-[#F3F4F6]">32 players</strong> across eight four-person teams.</p>
              <p><strong className="text-[#F3F4F6]">Four tables</strong> at 4B's, with no away matches.</p>
              <p><strong className="text-[#F3F4F6]">Three players</strong> from each team play on a normal league night.</p>
              <p><strong className="text-[#F3F4F6]">Team standings + individual standings</strong> run at the same time.</p>
              <p><strong className="text-[#F3F4F6]">Website scoring</strong> tracks every rack and updates standings automatically.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="derby-snapshot-title">
          <div className="mb-4">
            <h2 id="derby-snapshot-title" className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6]">
              League at a glance
            </h2>
          </div>
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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981] mb-3">The match format</p>
          <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-3">
            Both games matter — and the opening choice matters too
          </h2>
          <p className="text-sm leading-6 text-[#CBD5E1] max-w-4xl mb-6">
            Rather than running separate 8-ball and 9-ball leagues, each individual match contains both games. Players use one Fargo-based rating, which converts to a handicapped race. The opening decision adds strategy without adding much bookkeeping.
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
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-3">Handicap and scoring</h2>
            <div className="space-y-3 text-sm leading-6 text-[#CBD5E1]">
              <p><strong className="text-[#F3F4F6]">Fargo is the rating backbone.</strong> We use the rating difference to set each race instead of maintaining APA-style skill levels.</p>
              <p><strong className="text-[#F3F4F6]">Every rack is recorded.</strong> The website knows the discipline, the race, the players, and the current score; scorekeeping should be roughly one tap per rack.</p>
              <p><strong className="text-[#F3F4F6]">Ratings lock for league night.</strong> Results can affect future weeks, but nobody's race changes in the middle of the night.</p>
              <p><strong className="text-[#F3F4F6]">Playoffs can use longer races.</strong> The same rating system stays in place while postseason matches get a larger format.</p>
            </div>
          </div>

          <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-3">Season money</h2>
            <p className="text-sm leading-6 text-[#CBD5E1] mb-5">
              The money should be simple and visible. A current working example is a <strong className="text-[#F3F4F6]">$250 season fee per player</strong> with a published split before registration opens.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-[#273041] rounded-lg p-5 bg-[#0B0E14]">
                <Money size={22} weight="duotone" className="text-[#10B981] mb-3" />
                <div className="text-2xl font-bold text-[#F3F4F6]">$200</div>
                <div className="text-sm text-[#9CA3AF] mt-1">per player to the prize purse</div>
              </div>
              <div className="border border-[#273041] rounded-lg p-5 bg-[#0B0E14]">
                <Money size={22} weight="duotone" className="text-[#10B981] mb-3" />
                <div className="text-2xl font-bold text-[#F3F4F6]">$50</div>
                <div className="text-sm text-[#9CA3AF] mt-1">per player for league administration</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#9CA3AF]">
              At 32 players, that example creates a $6,400 player-funded prize purse. The exact fee, payout structure, and any 4B's sponsorship are still open for discussion.
            </p>
          </div>
        </section>

        <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981] mb-3">Build toward the ending</p>
          <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-4">The final weeks should be the best part of the season</h2>
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
          <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-2">What should we change?</h2>
          <p className="text-sm leading-6 text-[#CBD5E1] max-w-4xl mb-5">
            Fremont Derby is still a proposal. The point of publishing this now is to pressure-test it with the players before we lock rules, collect money, or build the full league system.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workshopQuestions.map((question) => (
              <div key={question} className="border border-[#273041] rounded-lg p-4 bg-[#0B0E14] text-sm leading-6 text-[#D1FAE5]">
                {question}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-[#9CA3AF]">
            Bring feedback to 4B's or share it with the Fremont Open group. If the format survives the workshop, the next step is a playtest night before Season 1 registration opens.
          </p>
        </section>
      </main>
    </>
  );
}

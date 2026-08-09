import {
  CalendarDots,
  MapPin,
  Money,
  ShieldCheck,
  Users,
} from "@phosphor-icons/react";
import { Topbar } from "../components/Topbar";

const basics = [
  { label: "Where", value: "4B's Tavern — all in house, no travel", icon: MapPin },
  { label: "Teams", value: "8 teams, up to 4 players each", icon: Users },
  { label: "Night", value: "One fixed night each week — day TBD", icon: CalendarDots },
  { label: "Games", value: "8-ball + 9-ball in the same match", icon: ShieldCheck },
  { label: "Handicap", value: "Fargo-based races", icon: ShieldCheck },
  { label: "Season", value: "About 12 weeks + playoffs", icon: CalendarDots },
];

export default function Derby() {
  return (
    <>
      <Topbar
        title="Fremont Derby"
        subtitle="A new in-house pool league at 4B's"
      />

      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8 space-y-8" data-testid="derby-page">
        <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
          <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981] mb-3">
              Proposed Season 1
            </p>
            <h1 className="font-[Outfit] text-3xl sm:text-4xl font-bold text-[#F3F4F6] leading-tight mb-4">
              Team pool, individual competition, real prize money.
            </h1>
            <p className="text-[#CBD5E1] leading-7 max-w-3xl">
              Fremont Derby is a seasonal house league at 4B's. No travel. No APA skill levels. Each week you play a Fargo-handicapped race using both 8-ball and 9-ball, while competing for both your team and yourself.
            </p>
            <p className="mt-4 text-[#CBD5E1] leading-7 max-w-3xl">
              The goal is a simple weekly league that builds toward great playoff and championship nights.
            </p>
          </div>

          <div className="bg-[#10151F] border border-[#273041] rounded-lg p-6">
            <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280] mb-2">Example season</div>
            <div className="text-4xl font-bold text-[#F3F4F6]">$8,000</div>
            <div className="text-sm text-[#9CA3AF] mt-1">32 players × $250</div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-[#CBD5E1]">
              <p><strong className="text-[#F3F4F6]">$6,400</strong> back to players as prize money.</p>
              <p><strong className="text-[#F3F4F6]">Team + individual payouts.</strong> You do not need the best team to have a profitable season.</p>
              <p><strong className="text-[#F3F4F6]">$1,600</strong> for league administration in this example.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-4">The basics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {basics.map((item) => (
              <div key={item.label} className="bg-[#141923] border border-[#273041] rounded-lg p-5">
                <item.icon size={22} weight="duotone" className="text-[#10B981] mb-4" />
                <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280] mb-2">{item.label}</div>
                <div className="text-[#F3F4F6] font-semibold leading-6">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-3">How a match works</h2>
            <div className="space-y-3 text-sm leading-6 text-[#CBD5E1]">
              <p><strong className="text-[#F3F4F6]">1.</strong> Fargo ratings set the handicapped race.</p>
              <p><strong className="text-[#F3F4F6]">2.</strong> Lag winner chooses the opening game or the first break.</p>
              <p><strong className="text-[#F3F4F6]">3.</strong> Play a short block of 8-ball or 9-ball, then switch games and finish the race.</p>
              <p><strong className="text-[#F3F4F6]">4.</strong> Every race counts for your team and your individual season.</p>
            </div>
          </div>

          <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-3">Your season still matters</h2>
            <p className="text-sm leading-6 text-[#CBD5E1]">
              Team standings and individual standings run at the same time. If your team struggles, you can still finish high individually and win money. If your team is short, the players who show up can still play their races and keep building their individual record.
            </p>
            <p className="mt-4 text-sm leading-6 text-[#CBD5E1]">
              You can also sign up as a single player and be placed with a team.
            </p>
          </div>
        </section>

        <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
          <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-3">Finish strong</h2>
          <p className="text-sm leading-6 text-[#CBD5E1] max-w-4xl">
            The regular season leads into a Final Four and championship night. Playoff races get bigger, more tables become available, and a tied championship can come down to one deciding anchor match with the room watching.
          </p>
        </section>

        <section className="bg-[#10151F] border border-[#10B981]/30 rounded-lg p-6 sm:p-8">
          <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-2">Interested?</h2>
          <p className="text-sm leading-6 text-[#CBD5E1] max-w-4xl">
            This is the working plan. We still want input on the best league night, race lengths, and final payout balance before Season 1 opens.
          </p>
        </section>
      </main>
    </>
  );
}

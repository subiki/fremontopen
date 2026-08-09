import {
  CalendarDots,
  MapPin,
  Money,
  ShieldCheck,
  Trophy,
  Users,
} from "@phosphor-icons/react";
import { Topbar } from "../components/Topbar";

const facts = [
  [Users, "8 teams", "Up to 4 players each"],
  [MapPin, "4 tables", "All at 4B's — no travel"],
  [ShieldCheck, "8 + 9 ball", "Both games in every match"],
  [CalendarDots, "~12 weeks", "Then playoffs and a final"],
];

export default function Derby() {
  return (
    <>
      <Topbar title="Fremont Derby" subtitle="A new seasonal pool league at 4B's" />

      <main className="flex-1 px-5 sm:px-8 py-8 sm:py-10" data-testid="derby-page">
        <div className="max-w-6xl mx-auto">
          <section className="border-b border-[#273041] pb-10 sm:pb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#10B981] mb-4">
              Season 1 proposal
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-8 lg:gap-12 items-end">
              <div>
                <h1 className="font-[Outfit] text-4xl sm:text-5xl lg:text-6xl font-bold text-[#F3F4F6] leading-[1.02] max-w-4xl">
                  Every race counts twice.
                </h1>
                <p className="mt-5 text-lg sm:text-xl leading-8 text-[#CBD5E1] max-w-3xl">
                  Play for your team and for yourself. Fremont Derby is an in-house league with Fargo-handicapped races, both 8-ball and 9-ball, real standings, and real prize money.
                </p>
              </div>

              <div className="lg:border-l lg:border-[#273041] lg:pl-8">
                <div className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">Example with 32 players</div>
                <div className="mt-2 text-5xl font-bold text-[#F3F4F6]">$6,400</div>
                <div className="mt-2 text-base text-[#D1FAE5] font-semibold">back to players</div>
                <div className="mt-2 text-sm leading-6 text-[#9CA3AF]">$250 season entry · $200 to prizes · $50 to league administration</div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#273041]">
            {facts.map(([Icon, value, label]) => (
              <div key={value} className="py-7 pr-4 border-b lg:border-b-0 border-[#273041] last:border-b-0 lg:border-r lg:last:border-r-0 lg:px-6 lg:first:pl-0">
                <Icon size={22} weight="duotone" className="text-[#10B981] mb-3" />
                <div className="text-xl font-bold text-[#F3F4F6]">{value}</div>
                <div className="mt-1 text-sm leading-5 text-[#9CA3AF]">{label}</div>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 py-10 sm:py-12 border-b border-[#273041]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981] mb-3">How a match works</p>
              <h2 className="font-[Outfit] text-3xl font-semibold text-[#F3F4F6]">One race. Two games. A little strategy.</h2>
              <div className="mt-7 space-y-6">
                <Step number="1" title="Fargo sets the race" body="Your rating difference determines the handicap." />
                <Step number="2" title="Win the lag, make a choice" body="Choose the opening game — 8-ball or 9-ball — or take the first break." />
                <Step number="3" title="Switch games and finish" body="Play a short opening block, carry the score forward, switch disciplines, and finish the race." />
              </div>
            </div>

            <div className="lg:border-l lg:border-[#273041] lg:pl-12">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981] mb-3">Two ways to win</p>
              <h2 className="font-[Outfit] text-3xl font-semibold text-[#F3F4F6]">Your team can have a bad season. You don't have to.</h2>
              <p className="mt-5 text-base leading-7 text-[#CBD5E1]">
                Every completed race goes into the team standings and your individual record. Team prize money and individual prize money are separate.
              </p>
              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="border-t-2 border-[#10B981] pt-4">
                  <Trophy size={24} weight="duotone" className="text-[#10B981] mb-3" />
                  <div className="font-semibold text-[#F3F4F6]">Team race</div>
                  <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">Win the season, make the playoffs, chase the championship.</p>
                </div>
                <div className="border-t-2 border-[#10B981] pt-4">
                  <Money size={24} weight="duotone" className="text-[#10B981] mb-3" />
                  <div className="font-semibold text-[#F3F4F6]">Individual race</div>
                  <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">Keep winning your matches and you can cash regardless of where your team finishes.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-10 sm:py-12 border-b border-[#273041]">
            <div className="grid grid-cols-1 lg:grid-cols-[0.7fr_1.3fr] gap-8 lg:gap-14">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981] mb-3">The money</p>
                <h2 className="font-[Outfit] text-3xl font-semibold text-[#F3F4F6]">Simple and visible.</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <MoneyStat value="$250" label="season entry" />
                <MoneyStat value="$200" label="per player into prizes" />
                <MoneyStat value="$6,400" label="example prize pool at 32 players" />
              </div>
            </div>
            <p className="mt-7 text-sm leading-6 text-[#9CA3AF] max-w-3xl lg:ml-[calc(35%+1rem)]">
              The prize pool pays both team results and individual finishes. Exact payout percentages can be finalized before registration.
            </p>
          </section>

          <section className="py-10 sm:py-12">
            <div className="bg-[#10151F] border border-[#273041] rounded-xl px-6 py-7 sm:px-8 sm:py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h2 className="font-[Outfit] text-2xl sm:text-3xl font-semibold text-[#F3F4F6]">Bring a team or sign up solo.</h2>
                <p className="mt-2 text-sm sm:text-base leading-7 text-[#CBD5E1] max-w-3xl">
                  We’ll build up to eight teams. Singles can join the player pool and be matched with open roster spots. The league night is still being chosen; everything stays at 4B's.
                </p>
              </div>
              <div className="shrink-0 text-left lg:text-right">
                <div className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">The pitch</div>
                <div className="mt-1 text-lg font-semibold text-[#D1FAE5]">No travel. Fair races. Two chances to cash.</div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function Step({ number, title, body }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full border border-[#10B981]/40 flex items-center justify-center text-sm font-bold text-[#10B981]">
        {number}
      </div>
      <div>
        <div className="font-semibold text-[#F3F4F6]">{title}</div>
        <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">{body}</p>
      </div>
    </div>
  );
}

function MoneyStat({ value, label }) {
  return (
    <div className="border-l border-[#273041] pl-5 first:border-l-0 first:pl-0 sm:first:border-l sm:first:pl-5">
      <div className="text-3xl font-bold text-[#F3F4F6]">{value}</div>
      <div className="mt-1 text-sm leading-5 text-[#9CA3AF]">{label}</div>
    </div>
  );
}

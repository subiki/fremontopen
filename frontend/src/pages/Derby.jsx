import { Topbar } from "../components/Topbar";

const details = [
  ["Location", "4B's Tavern. All matches are in-house; no travel."],
  ["Teams", "Up to 8 teams with up to 4 players each."],
  ["Schedule", "One fixed league night each week. Day still to be selected."],
  ["Season", "About 12 regular-season weeks, followed by playoffs."],
];

export default function Derby() {
  return (
    <>
      <Topbar
        title="Fremont Derby"
        subtitle="Working concept for an in-house seasonal league at 4B's"
      />

      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="derby-page">
        <div className="max-w-4xl space-y-6">
          <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <h1 className="font-[Outfit] text-2xl sm:text-3xl font-semibold text-[#F3F4F6]">
              Proposed league format
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-7 text-[#CBD5E1]">
              Fremont Derby would be a seasonal pool league based entirely at 4B's. The current idea is a small team league with Fargo-based handicaps, both 8-ball and 9-ball in each individual match, team standings, and individual standings.
            </p>
          </section>

          <section className="bg-[#141923] border border-[#273041] rounded-lg overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-[#273041]">
              <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">League basics</h2>
            </div>
            <div>
              {details.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-5 px-5 sm:px-6 py-4 border-b border-[#273041]/70 last:border-b-0"
                >
                  <div className="text-sm font-medium text-[#F3F4F6]">{label}</div>
                  <div className="text-sm leading-6 text-[#9CA3AF]">{value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#141923] border border-[#273041] rounded-lg p-6">
              <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">Individual matches</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[#CBD5E1]">
                <p>Fargo ratings determine the handicapped race.</p>
                <p>The lag winner chooses either the opening game or the first break.</p>
                <p>Players begin with a short block of 8-ball or 9-ball, carry the score forward, then switch games and finish the race.</p>
              </div>
            </div>

            <div className="bg-[#141923] border border-[#273041] rounded-lg p-6">
              <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">Team and individual standings</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[#CBD5E1]">
                <p>Each individual result contributes to the team result and to that player's own season record.</p>
                <p>Individual prize money would be separate from team prize money, so a player can still have a successful season even if their team does not.</p>
                <p>Players could sign up with a team or individually and be placed into an available roster spot.</p>
              </div>
            </div>
          </section>

          <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">Example season money</h2>
            <p className="mt-3 text-sm leading-6 text-[#CBD5E1]">
              One working example is a $250 season fee per player. $200 would go to the prize pool and $50 to league administration. With 32 players, that would create a $6,400 prize pool split between team and individual payouts.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Stat label="Season fee" value="$250" />
              <Stat label="To prize pool" value="$200/player" />
              <Stat label="32-player purse" value="$6,400" />
            </div>
          </section>

          <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">Postseason</h2>
            <p className="mt-3 text-sm leading-6 text-[#CBD5E1]">
              The current plan is for the top teams to advance to a short playoff, with longer races and a championship night. A tied championship could be decided by one final anchor match selected by the teams.
            </p>
          </section>

          <section className="px-1 pb-4">
            <h2 className="font-[Outfit] text-lg font-semibold text-[#F3F4F6]">Still to finalize</h2>
            <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
              The league night, exact Fargo race chart, and final split between team and individual prize money. The rest is the current working structure.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-[#273041] bg-[#0B0E14] px-4 py-3">
      <div className="text-xs uppercase tracking-[0.14em] text-[#6B7280]">{label}</div>
      <div className="mt-1 font-mono text-base text-[#F3F4F6]">{value}</div>
    </div>
  );
}

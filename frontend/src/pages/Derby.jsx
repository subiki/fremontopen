import { Topbar } from "../components/Topbar";

export default function Derby() {
  return (
    <>
      <Topbar title="Fremont Derby" subtitle="Seasonal in-house league at 4B's" />

      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8" data-testid="derby-page">
        <div className="max-w-3xl space-y-5">
          <section className="rounded-xl bg-[#3A281D] p-2 shadow-lg">
            <div className="relative overflow-hidden rounded-lg border border-[#1D241F] bg-[#0D5A43] px-6 py-7 sm:px-8 sm:py-8">
              <div className="absolute right-5 top-5 flex gap-2" aria-hidden="true">
                <Ball number="8" dark />
                <Ball number="9" stripe />
              </div>
              <div className="pr-20">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#BDE7D8]">Season 1</div>
                <h1 className="mt-2 font-[Outfit] text-3xl font-semibold text-white">8 teams. 4 players. 4 tables.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#E4F2ED]">
                  All matches at 4B's on one fixed night each week. About 12 regular-season weeks, then playoffs.
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Fact label="Games" value="8-ball + 9-ball" />
            <Fact label="Handicap" value="Fargo-based" />
            <Fact label="Standings" value="Team + individual" />
            <Fact label="Entry" value="$250 / season" />
          </section>

          <section className="bg-[#141923] border border-[#273041] rounded-lg p-6">
            <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6]">Match format</h2>
            <div className="mt-4 space-y-2 text-sm leading-6 text-[#CBD5E1]">
              <p><strong className="text-[#F3F4F6]">1.</strong> Fargo ratings set the race.</p>
              <p><strong className="text-[#F3F4F6]">2.</strong> Lag winner chooses the opening game or the first break.</p>
              <p><strong className="text-[#F3F4F6]">3.</strong> Play a short opening block, switch between 8-ball and 9-ball, and finish the same race.</p>
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-[#141923] border border-[#273041] rounded-lg p-6">
              <h2 className="font-[Outfit] text-lg font-semibold text-[#F3F4F6]">Two standings</h2>
              <p className="mt-3 text-sm leading-6 text-[#CBD5E1]">
                Every match counts for your team and for you. Team and individual payouts are separate, so your individual season still matters regardless of where your team finishes.
              </p>
            </div>

            <div className="bg-[#141923] border border-[#273041] rounded-lg p-6">
              <h2 className="font-[Outfit] text-lg font-semibold text-[#F3F4F6]">Prize pool</h2>
              <p className="mt-3 text-sm leading-6 text-[#CBD5E1]">
                $200 of each $250 entry goes to prizes; $50 goes to league administration. At 32 players, the prize pool is <strong className="text-[#F3F4F6]">$6,400</strong>.
              </p>
            </div>
          </section>

          <section className="bg-[#141923] border border-[#273041] rounded-lg px-6 py-5 text-sm leading-6 text-[#CBD5E1]">
            <p><strong className="text-[#F3F4F6]">Playoffs:</strong> top four teams, longer races, championship night, and an anchor match if the final ends 2-2.</p>
            <p className="mt-2"><strong className="text-[#F3F4F6]">Signup:</strong> bring a team or join solo and fill an open roster spot.</p>
          </section>

          <p className="px-1 pb-3 text-sm leading-6 text-[#9CA3AF]">
            The format is set. Feedback is welcome before launch on the league night, final race chart, and team/individual payout split.
          </p>
        </div>
      </main>
    </>
  );
}

function Fact({ label, value }) {
  return (
    <div className="rounded-lg border border-[#273041] bg-[#10151F] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[#6B7280]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[#F3F4F6]">{value}</div>
    </div>
  );
}

function Ball({ number, dark = false, stripe = false }) {
  return (
    <div className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-black/30 shadow-md ${dark ? "bg-[#161616]" : "bg-white"}`}>
      {stripe ? <div className="absolute inset-x-0 top-[10px] h-[16px] bg-[#E2B714]" /> : null}
      <div className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-black">
        {number}
      </div>
    </div>
  );
}

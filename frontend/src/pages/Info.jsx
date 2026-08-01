import {
  ArrowSquareOut,
  CalendarDots,
  DiscordLogo,
  MapPin,
  Money,
  ShieldCheck,
  Users,
} from "@phosphor-icons/react";
import { Topbar } from "../components/Topbar";

const actionLinks = [
  {
    label: "See upcoming tournaments",
    href: "https://fremontopen.challonge.com/tournaments",
    icon: ArrowSquareOut,
    testid: "join-tournaments-link",
    primary: true,
  },
  {
    label: "Get directions",
    href: "https://www.google.com/maps/search/?api=1&query=4300+Leary+Way+NW+Seattle+WA+98107",
    icon: MapPin,
    testid: "join-directions-link",
  },
  {
    label: "Join Discord",
    href: "https://discord.gg/EGhCpwHFCe",
    icon: DiscordLogo,
    testid: "join-discord-link",
  },
];

const details = [
  { label: "When", value: "Every Saturday afternoon", icon: CalendarDots },
  { label: "Signups", value: "12:00-1:00 PM", icon: CalendarDots },
  { label: "First break", value: "1:00 PM", icon: CalendarDots },
  { label: "Where", value: "4B's Tavern, 4300 Leary Way NW", icon: MapPin },
  { label: "Buy-in", value: "$10 entry", icon: Money },
  { label: "Format", value: "Double elimination, BCA rules", icon: ShieldCheck },
  { label: "Games", value: "Alternating 8-ball and 9-ball Saturdays", icon: Users },
  { label: "Venue", value: "Adults 21 and over", icon: Users },
];

const joinSteps = [
  {
    title: "Check the upcoming tournament",
    body: "Open the Challonge listing to confirm this Saturday's game and see the latest bracket information.",
  },
  {
    title: "Arrive between noon and 1:00 PM",
    body: "Find the tournament director at 4B's, add your name, and pay the $10 entry fee.",
  },
  {
    title: "Be ready for the 1:00 PM start",
    body: "The tournament is friendly and open to every skill level, including first-time players.",
  },
];

const rules = [
  "Respect the bartender and tip. House rules come first.",
  "Be on time and work with the tournament director. Volunteers and tips are welcome; bribes are not.",
  "Respect fellow players. Keep it friendly and do not be a jerk.",
];

export default function Info() {
  return (
    <>
      <Topbar
        title="Join the Tournament"
        subtitle="Everything you need to play in the Fremont Open this Saturday"
      />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8 space-y-8" data-testid="join-page">
        <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
          <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981] mb-3">
              New players are welcome
            </p>
            <h1 className="font-[Outfit] text-3xl sm:text-4xl font-bold text-[#F3F4F6] leading-tight mb-4">
              Play in the Fremont Open
            </h1>
            <p className="text-[#CBD5E1] leading-7 max-w-3xl">
              The Fremont Open is a friendly weekly pool tournament for every skill and experience
              level. Show up during the signup window, check in with the tournament director, and
              be ready to play at 1:00 PM.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {actionLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={link.testid}
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md border px-4 py-3 text-center text-sm font-semibold transition-colors ${
                    link.primary
                      ? "border-[#10B981] bg-[#10B981] text-[#052E27] hover:bg-[#34D399]"
                      : "border-[#10B981]/30 bg-[#10B981]/10 text-[#D1FAE5] hover:bg-[#10B981]/20"
                  }`}
                >
                  <link.icon size={18} weight="duotone" />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="bg-[#10151F] border border-[#273041] rounded-lg p-6">
            <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-4">
              Saturday at a glance
            </h2>
            <div className="space-y-4">
              <ScheduleRow time="12:00 PM" label="Signups open" />
              <ScheduleRow time="12:00-1:00 PM" label="Check in and pay $10" />
              <ScheduleRow time="1:00 PM" label="Tournament starts" />
            </div>
            <p className="mt-5 text-sm leading-6 text-[#9CA3AF]">
              Please arrive before 1:00 PM. Late entry is not guaranteed once the bracket begins.
            </p>
          </div>
        </section>

        <section aria-labelledby="how-to-join-title">
          <div className="mb-4">
            <h2 id="how-to-join-title" className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6]">
              How to join
            </h2>
            <p className="mt-1 text-sm text-[#9CA3AF]">No team, invitation, or prior tournament experience is required.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {joinSteps.map((step, index) => (
              <div key={step.title} className="bg-[#141923] border border-[#273041] rounded-lg p-6">
                <div className="w-9 h-9 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] font-bold mb-4">
                  {index + 1}
                </div>
                <h3 className="font-[Outfit] text-lg font-semibold text-[#F3F4F6]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#CBD5E1]">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Tournament details">
          {details.map((item) => (
            <div key={item.label} className="bg-[#141923] border border-[#273041] rounded-lg p-5">
              <item.icon size={22} weight="duotone" className="text-[#10B981] mb-4" />
              <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280] mb-2">{item.label}</div>
              <div className="text-[#F3F4F6] font-semibold leading-6">{item.value}</div>
            </div>
          ))}
        </section>

        <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
          <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-2">What to expect</h2>
          <p className="text-sm leading-6 text-[#CBD5E1] max-w-4xl">
            The game alternates between 8-ball and 9-ball each Saturday. Events use a double-elimination
            bracket under BCA rules, and results may support Fargo reporting when a player qualifies for
            other tournaments. Ask the tournament director or Discord community when you are unsure about
            a rule or the current format.
          </p>
        </section>

        <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
          <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-5">House rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rules.map((rule, index) => (
              <div key={rule} className="border border-[#273041] rounded-lg p-5 bg-[#0B0E14]">
                <div className="w-8 h-8 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] font-semibold mb-4">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-[#CBD5E1]">{rule}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function ScheduleRow({ time, label }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#273041] pb-3 last:border-0 last:pb-0">
      <span className="text-[#F3F4F6] font-semibold">{time}</span>
      <span className="text-[#9CA3AF] text-sm text-right">{label}</span>
    </div>
  );
}

import { ArrowSquareOut, CalendarDots, DiscordLogo, GithubLogo, MapPin, Money, ShieldCheck, Users } from "@phosphor-icons/react";
import { Topbar } from "../components/Topbar";

const links = [
  {
    label: "Latest brackets",
    href: "https://fremontopen.challonge.com/tournaments",
    icon: ArrowSquareOut,
    testid: "info-brackets-link",
  },
  {
    label: "GitHub project",
    href: "https://github.com/subiki/fremontopen",
    icon: GithubLogo,
    testid: "info-github-link",
  },
  {
    label: "Discord",
    href: "https://discord.gg/EGhCpwHFCe",
    icon: DiscordLogo,
    testid: "info-discord-link",
  },
];

const details = [
  { label: "When", value: "Every Saturday afternoon", icon: CalendarDots },
  { label: "Where", value: "4B's in Fremont", icon: MapPin },
  { label: "Buy-in", value: "$10 entry", icon: Money },
  { label: "Format", value: "Double elimination, BCA rules", icon: ShieldCheck },
  { label: "Games", value: "Alternating 8-ball and 9-ball Saturdays", icon: Users },
];

const rules = [
  "Respect the bartender and tip. House rules come first.",
  "Do not give the tournament director problems. Volunteers and tips are welcome; bribes are not.",
  "Respect fellow players. Keep it friendly and do not be a jerk.",
];

export default function Info() {
  return (
    <>
      <Topbar
        title="Tournament Info"
        subtitle="Fremont Open schedule, bracket links, and community details"
      />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8 space-y-8" data-testid="info-page">
        <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
          <div className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10B981] mb-3">
              Proud supporters of the Seattle Billiards Community
            </p>
            <h1 className="font-[Outfit] text-3xl sm:text-4xl font-bold text-[#F3F4F6] leading-tight mb-4">
              Fremont Open Pool Tourney
            </h1>
            <p className="text-[#CBD5E1] leading-7 max-w-3xl">
              A friendly weekly tournament open to every skill level and experience level.
              Results can support Fargo reporting when a player qualifies for other tournaments.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  data-testid={link.testid}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3 text-sm font-semibold text-[#D1FAE5] hover:bg-[#10B981]/20 transition-colors"
                >
                  <link.icon size={18} weight="duotone" />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="bg-[#10151F] border border-[#273041] rounded-lg p-6">
            <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-4">Saturday Schedule</h2>
            <div className="space-y-4">
              <ScheduleRow time="12:00 PM" label="Doors open" />
              <ScheduleRow time="12:00-1:00 PM" label="Signups" />
              <ScheduleRow time="1:00 PM" label="First break" />
            </div>
            <p className="mt-5 text-sm leading-6 text-[#9CA3AF]">
              Do not roll in 20 minutes late, and do not give the tournament director a hard time when you are late.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {details.map((item) => (
            <div key={item.label} className="bg-[#141923] border border-[#273041] rounded-lg p-5">
              <item.icon size={22} weight="duotone" className="text-[#10B981] mb-4" />
              <div className="text-xs uppercase tracking-[0.16em] text-[#6B7280] mb-2">{item.label}</div>
              <div className="text-[#F3F4F6] font-semibold leading-6">{item.value}</div>
            </div>
          ))}
        </section>

        <section className="bg-[#141923] border border-[#273041] rounded-lg p-6 sm:p-8">
          <h2 className="font-[Outfit] text-2xl font-semibold text-[#F3F4F6] mb-5">House Rules</h2>
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

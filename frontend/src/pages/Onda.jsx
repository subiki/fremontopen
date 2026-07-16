import { useEffect } from "react";
import { ArrowSquareOut, CalendarBlank, MapPin, TreePalm, UsersThree } from "@phosphor-icons/react";

const FORM_URL = "https://forms.gle/tbyQyPmQgVE5y9Vr5";

const quickFacts = [
  { icon: CalendarBlank, label: "When", value: "Late Nov / early Dec 2026" },
  { icon: MapPin, label: "Where", value: "Hostel Onda, Playa Grande" },
  { icon: UsersThree, label: "Vibe", value: "Group energy when you want it, freedom when you don't" },
  { icon: TreePalm, label: "Plan", value: "Beach, surf, sunsets, wildlife, and open-ended days" },
];

const propertyNotes = [
  "JFL will work with Onda on a group room rate",
  "Everyone books their own flights when the timing makes sense",
  "Join group outings, plan your own days, or mix both",
  "Coordination help and travel options will be shared as plans firm up",
];

export default function Onda() {
  useEffect(() => {
    const previousTitle = document.title;
    const robotsMeta = document.querySelector('meta[name="robots"]') || document.createElement("meta");
    const previousRobots = robotsMeta.getAttribute("content");
    robotsMeta.setAttribute("name", "robots");
    robotsMeta.setAttribute("content", "noindex,nofollow,noarchive");
    document.head.appendChild(robotsMeta);
    document.title = "Pura Vida at Onda 2026";

    return () => {
      document.title = previousTitle;
      if (previousRobots) {
        robotsMeta.setAttribute("content", previousRobots);
      } else {
        robotsMeta.remove();
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f0e7] text-[#15362f]" data-testid="onda-page">
      <section className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-0 px-4 py-5 sm:px-6 lg:grid-cols-[1.03fr_0.97fr] lg:py-8">
        <div className="grid overflow-hidden rounded-t-lg bg-[#123a35] lg:min-h-[calc(100vh-4rem)] lg:rounded-l-lg lg:rounded-tr-none">
          <img
            src="/onda/onda-pool-table.webp"
            alt="Friends around the Onda pool table and bar"
            className="h-[42vh] min-h-80 w-full object-cover sm:h-[52vh] lg:h-full"
          />
          <div className="bg-[#123a35] p-6 text-white sm:p-8 lg:self-end">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#96f0c8]">
              JFL's Onda invite
            </p>
            <h1 className="mt-3 font-[Outfit] text-4xl font-semibold leading-tight sm:text-5xl">
              Costa Rica, good people, and room to make it your own.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#e6fff4]">
              JFL is organizing a flexible trip to Hostel Onda in Playa Grande, loosely
              centered around December 15. Join the group for shared plans, use Onda as a
              home base for your own adventure, or do a little of both.
            </p>
          </div>
        </div>

        <div className="rounded-b-lg border border-[#d8c8ac] bg-[#fffaf0] p-5 shadow-sm sm:p-7 lg:rounded-r-lg lg:rounded-bl-none">
          <div className="flex h-full flex-col justify-between gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b45f27]">
                Interest form
              </p>
              <h2 className="mt-3 font-[Outfit] text-3xl font-semibold text-[#15362f]">
                Low-pressure interest now. Real plans later.
              </h2>
              <p className="mt-3 text-base leading-7 text-[#51645d]">
                If there is enough interest, JFL will negotiate pricing with the hostel.
                You'll book your own flight, and JFL will help coordinate timing, room
                options, airport transfers, activities, and whatever group plans people
                actually want.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {quickFacts.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-md border border-[#eadcc4] bg-[#fffdf7] p-4">
                    <Icon size={20} className="text-[#047857]" weight="duotone" aria-hidden="true" />
                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a6a45]">
                      {label}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#15362f]">{value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-md border border-[#d8c8ac] bg-[#f8eedb] p-4">
                <h3 className="font-[Outfit] text-lg font-semibold">Onda at a glance</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#51645d]">
                  {propertyNotes.map((note) => (
                    <li key={note} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#047857]" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <a
                href={FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#047857] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#065F46] focus:outline-none focus:ring-2 focus:ring-[#047857] focus:ring-offset-2"
                data-testid="onda-form-link"
              >
                Share your interest
                <ArrowSquareOut size={18} weight="duotone" aria-hidden="true" />
              </a>
              <p className="mt-3 text-center text-xs leading-5 text-[#7b8b84]">
                No commitment yet. This just helps shape dates, pricing, rooms, and coordination.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

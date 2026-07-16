import { useEffect } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";

const FORM_URL = "https://forms.gle/tbyQyPmQgVE5y9Vr5";
const GUIDE_URL = "https://chatgpt.com/g/g-6a5933a1daa48191b6b923f2636713fb-pura-vida-at-onda-trip-guide";

const tripNotes = [
  {
    label: "Place",
    text: "Costa Rica, with Onda in Playa Grande as the home base.",
  },
  {
    label: "Window",
    text: "Late November into December 2026, roughly two weeks near my December 15 birthday.",
  },
  {
    label: "Commitment",
    text: "None yet. I am taking a temperature check before anything gets locked in.",
  },
];

const openDays = [
  "Hang with the crew when that sounds fun.",
  "Disappear to the beach, surf, read, nap, or do almost nothing.",
  "Explore nearby towns, nature, food, and whatever catches your eye.",
  "Join a few shared outings if they come together.",
  "Make your own plans and meet back up when you want company.",
];

const coordinationItems = [
  "date window",
  "room options at Onda",
  "airport transportation",
  "rental cars and shared rides",
  "possible activities",
  "any group arrangement that actually makes sense",
];

const questionSections = [
  {
    question: "What is this?",
    answer:
      "A loose Costa Rica trip with friends. I stayed at Onda last year, loved it, and want to go back with people who would enjoy the place without turning the whole thing into a schedule.",
  },
  {
    question: "Why Onda?",
    answer:
      "It had the rare mix I wanted: easy to be social, easy to peel off, close enough to beach days and small adventures, and casual enough that nobody has to perform being on vacation.",
  },
  {
    question: "Do I have to stay the whole time?",
    answer:
      "No. Come for the full stretch, a week, a few days, or whatever fits. My birthday is December 15, but nobody needs to arrive by then, stay through it, or build their trip around it.",
  },
  {
    question: "Is everything a group activity?",
    answer:
      "Definitely not. Onda is the meeting point, not a leash. Some days might be shared dinners, beach time, surf, or an outing. Other days might be you doing your own thing entirely.",
  },
  {
    question: "What does the form commit me to?",
    answer:
      "Nothing. It only tells me who might be interested, what timing could work, and what kind of room or travel help would be useful before I talk with Onda about options.",
  },
];

export default function Onda() {
  useEffect(() => {
    const previousTitle = document.title;
    const root = document.documentElement;
    const previousTheme = root.getAttribute("data-theme");
    const robotsMeta = document.querySelector('meta[name="robots"]') || document.createElement("meta");
    const previousRobots = robotsMeta.getAttribute("content");

    root.setAttribute("data-theme", "onda");
    robotsMeta.setAttribute("name", "robots");
    robotsMeta.setAttribute("content", "noindex,nofollow,noarchive");
    document.head.appendChild(robotsMeta);
    document.title = "Onda Costa Rica Invite";

    return () => {
      document.title = previousTitle;
      if (previousTheme) {
        root.setAttribute("data-theme", previousTheme);
      } else {
        root.removeAttribute("data-theme");
      }
      if (previousRobots) {
        robotsMeta.setAttribute("content", previousRobots);
      } else {
        robotsMeta.remove();
      }
    };
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f0e4] text-[#1f322c]" data-testid="onda-page">
      <header className="relative">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(141, 82, 47, 0.08) 0 1px, transparent 1px 100%)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative mx-auto grid max-w-[88rem] gap-8 px-5 pb-14 pt-7 sm:px-8 lg:min-h-screen lg:grid-cols-[minmax(0,0.86fr)_minmax(32rem,1fr)] lg:items-center lg:gap-14 lg:px-10 lg:py-10">
          <section className="max-w-2xl lg:pl-3" aria-labelledby="onda-hero-title">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9a4d2c]">
              Costa Rica / Onda in Playa Grande
            </p>
            <h1
              id="onda-hero-title"
              className="mt-6 font-[Outfit] text-4xl font-semibold leading-tight text-[#1b312b] sm:text-6xl lg:text-6xl xl:text-7xl"
            >
              I loved Onda last year. I want to go back with friends.
            </h1>
            <div className="mt-7 space-y-5 text-lg leading-8 text-[#445c54] sm:text-xl sm:leading-9">
              <p>
                I stayed there last year and left wanting another round: beach days, surf,
                slow mornings, small adventures, and people I actually want to spend
                unhurried time with.
              </p>
              <p>
                The rough idea is about two weeks near my December 15 birthday. Come for
                all of it, part of it, or the slice that fits your life. Right now I am
                just seeing who might be into it.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-[#0f6f52] px-7 py-4 text-base font-semibold text-white shadow-[0_18px_42px_rgba(15,111,82,0.22)] transition-colors hover:bg-[#0a5e45] focus:outline-none focus:ring-2 focus:ring-[#0f6f52] focus:ring-offset-4 focus:ring-offset-[#f7f0e4]"
                data-testid="onda-form-link"
              >
                Add your name
                <ArrowSquareOut size={20} weight="duotone" aria-hidden="true" />
              </a>
              <a
                href={GUIDE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md border border-[#b99977] bg-[#fff9ec] px-7 py-4 text-base font-semibold text-[#1b312b] transition-colors hover:bg-[#f1e4cf] focus:outline-none focus:ring-2 focus:ring-[#0f6f52] focus:ring-offset-4 focus:ring-offset-[#f7f0e4]"
              >
                Ask the trip guide
                <ArrowSquareOut size={20} weight="duotone" aria-hidden="true" />
              </a>
              <p className="max-w-sm text-sm leading-6 text-[#6f6659]">
                Interest check only. No flight, room, or birthday-week obligation.
              </p>
            </div>
          </section>

          <figure className="relative min-h-[25rem] overflow-hidden rounded-md bg-[#173a33] shadow-[0_28px_80px_rgba(54,44,32,0.22)] sm:min-h-[34rem] lg:h-[calc(100vh-5rem)]">
            <img
              src="/onda/onda-cabo-star.webp"
              alt="JFL and a friend outside the Cabo Star beach bar in Costa Rica"
              className="absolute inset-0 h-full w-full object-cover object-[52%_42%]"
            />
            <figcaption className="absolute bottom-0 left-0 right-0 bg-[#173a33]/88 px-5 py-4 text-sm font-medium leading-6 text-[#f8f0df] backdrop-blur-sm sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-xs sm:rounded-md">
              A real trip, real people, and plenty of room to make your own plan.
            </figcaption>
          </figure>
        </div>
      </header>

      <section aria-label="Trip basics" className="border-y border-[#dfd0b8] bg-[#fff9ec]">
        <div className="mx-auto grid max-w-6xl gap-0 px-5 py-4 sm:px-8 md:grid-cols-3">
          {tripNotes.map((note) => (
            <div key={note.label} className="py-4 md:border-l md:border-[#dfd0b8] md:px-6 first:md:border-l-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a4d2c]">{note.label}</p>
              <p className="mt-2 text-base leading-7 text-[#2c413a]">{note.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.78fr_1fr] lg:gap-16 lg:py-24">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9a4d2c]">The idea</p>
          <h2 className="mt-4 font-[Outfit] text-4xl font-semibold leading-tight text-[#1b312b] sm:text-5xl">
            Enough structure to feel easy. Enough space to make it yours.
          </h2>
        </div>
        <div className="space-y-6 text-lg leading-8 text-[#445c54]">
          <p>
            I will help coordinate the parts that are annoying to solve alone: dates,
            room options, airport transportation, rental cars, shared rides, and a few
            possible activities.
          </p>
          <p>
            You will book your own flights. You will also get to decide how much you want
            to plug into everyone else. This should feel like friends sharing a beautiful
            place, not a prebuilt itinerary with a clipboard.
          </p>
        </div>
      </section>

      <section className="bg-[#173a33] px-5 py-16 text-[#fff7e8] sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f0b16d]">
              What it could feel like
            </p>
            <h2 className="mt-4 font-[Outfit] text-4xl font-semibold leading-tight sm:text-5xl">
              A shared trip with plenty of exits.
            </h2>
          </div>
          <ul className="space-y-5 text-lg leading-8 text-[#f4e5cc]">
            {openDays.map((item) => (
              <li key={item} className="grid grid-cols-[2rem_1fr] gap-4">
                <span className="mt-3 h-px bg-[#f0b16d]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24" aria-labelledby="onda-questions-title">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9a4d2c]">Questions friends ask</p>
          <h2 id="onda-questions-title" className="mt-4 font-[Outfit] text-4xl font-semibold leading-tight text-[#1b312b] sm:text-5xl">
            The useful details, without pretending everything is final.
          </h2>
        </div>

        <div className="mt-12 divide-y divide-[#dccdb5] border-y border-[#dccdb5]">
          {questionSections.map((item) => (
            <article key={item.question} className="grid gap-4 py-8 lg:grid-cols-[0.38fr_1fr] lg:gap-12">
              <h3 className="font-[Outfit] text-2xl font-semibold leading-snug text-[#1b312b]">{item.question}</h3>
              <p className="text-lg leading-8 text-[#445c54]">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#173a33] px-5 py-16 text-[#fff7e8] sm:px-8 lg:py-20" aria-labelledby="onda-guide-title">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f0b16d]">
              Quick questions
            </p>
            <h2 id="onda-guide-title" className="mt-4 font-[Outfit] text-4xl font-semibold leading-tight sm:text-5xl">
              Ask the trip guide before you fill out the form.
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#f4e5cc]">
              I made a quick ChatGPT guide for the trip. Use it for dates, travel flow,
              room questions, Playa Grande basics, or whether this kind of trip fits how
              you like to travel.
            </p>
          </div>
          <a
            href={GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-[#f0b16d] px-8 py-4 text-base font-semibold text-[#173a33] transition-colors hover:bg-[#f6c58e] focus:outline-none focus:ring-2 focus:ring-[#f0b16d] focus:ring-offset-4 focus:ring-offset-[#173a33]"
          >
            Open the trip guide
            <ArrowSquareOut size={20} weight="duotone" aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="bg-[#fff9ec] px-5 py-16 sm:px-8 lg:py-24" aria-labelledby="onda-decisions-title">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1fr] lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9a4d2c]">Where things stand</p>
            <h2 id="onda-decisions-title" className="mt-4 font-[Outfit] text-4xl font-semibold leading-tight text-[#1b312b] sm:text-5xl">
              The shape is real. The specifics are still being worked out.
            </h2>
          </div>
          <div className="space-y-8 text-lg leading-8 text-[#445c54]">
            <div>
              <h3 className="font-[Outfit] text-2xl font-semibold text-[#1b312b]">Already decided</h3>
              <p className="mt-3">
                Costa Rica, Onda in Playa Grande, a loose two-week window near my birthday,
                and a trip where people can move between shared time and independent time.
              </p>
            </div>
            <div>
              <h3 className="font-[Outfit] text-2xl font-semibold text-[#1b312b]">Still open</h3>
              <p className="mt-3">
                I am collecting names before I lock down details or talk with Onda about
                whether a group arrangement makes sense.
              </p>
              <ul className="mt-5 grid gap-x-8 gap-y-3 text-base leading-7 text-[#2c413a] sm:grid-cols-2">
                {coordinationItems.map((item) => (
                  <li key={item} className="border-l-2 border-[#d28c4f] pl-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-24" aria-labelledby="onda-final-title">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9a4d2c]">Interest check</p>
          <h2 id="onda-final-title" className="mt-4 font-[Outfit] text-4xl font-semibold leading-tight text-[#1b312b] sm:text-5xl">
            Think you might be into it? Add your name.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#445c54]">
            The form only helps me understand timing, rooms, transportation needs, and
            general interest. It does not commit you to buying a flight, reserving a room,
            or building your trip around my birthday.
          </p>
          <a
            href={FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-[#0f6f52] px-8 py-4 text-base font-semibold text-white shadow-[0_18px_42px_rgba(15,111,82,0.22)] transition-colors hover:bg-[#0a5e45] focus:outline-none focus:ring-2 focus:ring-[#0f6f52] focus:ring-offset-4 focus:ring-offset-[#f7f0e4]"
          >
            Add your name
            <ArrowSquareOut size={20} weight="duotone" aria-hidden="true" />
          </a>
        </div>
      </section>
    </main>
  );
}

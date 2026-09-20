import { ArrowRight, CalendarDots, MapPin, Money } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export const JoinBanner = () => {
  return (
    <section
      className="border-b border-[#273041] bg-[#10151F] px-6 py-4 sm:px-8"
      data-testid="homepage-join-banner"
      aria-labelledby="homepage-join-title"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-lg border border-[#10B981]/30 bg-[#063B32] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6EE7B7]">
            Want to play?
          </div>
          <h2
            id="homepage-join-title"
            className="font-[Outfit] text-xl font-bold text-[#F3F4F6] sm:text-2xl"
          >
            Join the Fremont Open this Saturday
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#D1FAE5]">
            Open to every skill level. Sign up from noon to 1:00 PM at 4B&apos;s in Fremont;
            the first break is at 1:00 PM.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#D1FAE5]">
            <span className="inline-flex items-center gap-2">
              <CalendarDots size={17} weight="duotone" /> Every Saturday
            </span>
            <span className="inline-flex items-center gap-2">
              <Money size={17} weight="duotone" /> $10 entry
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin size={17} weight="duotone" /> 4B&apos;s Tavern
            </span>
          </div>
        </div>

        <Link
          to="/join"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[#10B981] px-5 py-3 text-sm font-bold text-[#052E27] transition-colors hover:bg-[#34D399] focus:outline-none focus:ring-2 focus:ring-[#6EE7B7] focus:ring-offset-2 focus:ring-offset-[#063B32]"
          data-testid="homepage-join-link"
        >
          How to join
          <ArrowRight size={18} weight="bold" />
        </Link>
      </div>
    </section>
  );
};

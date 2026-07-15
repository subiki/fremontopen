import { ArrowSquareOut } from "@phosphor-icons/react";

const FORM_URL = "https://forms.gle/tbyQyPmQgVE5y9Vr5";

export default function Onda() {
  return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-10 text-[#111827]" data-testid="onda-page">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl flex-col justify-center">
        <div className="rounded-lg border border-[#D7DEE8] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#047857]">
            Onda
          </p>
          <h1 className="mt-3 font-[Outfit] text-3xl font-semibold tracking-tight sm:text-4xl">
            Quick sign-up form
          </h1>
          <p className="mt-3 text-base leading-7 text-[#4B5563]">
            Use the link below to open the form.
          </p>
          <a
            href={FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#047857] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#065F46] focus:outline-none focus:ring-2 focus:ring-[#047857] focus:ring-offset-2 sm:w-auto"
            data-testid="onda-form-link"
          >
            Open Google Form
            <ArrowSquareOut size={18} weight="duotone" aria-hidden="true" />
          </a>
        </div>
      </section>
    </main>
  );
}

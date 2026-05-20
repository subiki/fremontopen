import { Link } from "react-router-dom";

const THEMES = [
  {
    shell: "from-[#1E3A5F] via-[#0F172A] to-[#0B0E14]",
    accent: "from-[#60A5FA] to-[#22D3EE]",
    ring: "border-[#60A5FA]/30",
    chip: "text-[#93C5FD]",
  },
  {
    shell: "from-[#3F2A56] via-[#111827] to-[#0B0E14]",
    accent: "from-[#F472B6] to-[#C084FC]",
    ring: "border-[#F472B6]/30",
    chip: "text-[#F9A8D4]",
  },
  {
    shell: "from-[#3F3A21] via-[#161B22] to-[#0B0E14]",
    accent: "from-[#F59E0B] to-[#FDE68A]",
    ring: "border-[#F59E0B]/30",
    chip: "text-[#FCD34D]",
  },
  {
    shell: "from-[#173B37] via-[#0F172A] to-[#0B0E14]",
    accent: "from-[#34D399] to-[#2DD4BF]",
    ring: "border-[#34D399]/30",
    chip: "text-[#6EE7B7]",
  },
];

const hashName = (value = "") =>
  Array.from(String(value)).reduce((total, char) => total + char.charCodeAt(0), 0);

const initialsFor = (name = "") =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

const statLine = (player) => {
  const total = (player?.wins || 0) + (player?.losses || 0);
  return `${player?.wins || 0}-${player?.losses || 0} . ${total} matches`;
};

export function PlayerArtCard({
  player,
  compact = false,
  linkTo,
  subtitle,
}) {
  const theme = THEMES[hashName(player?.name) % THEMES.length];
  const initials = initialsFor(player?.name);
  const content = (
    <div
      className={`relative overflow-hidden rounded-2xl border ${theme.ring} bg-gradient-to-br ${theme.shell} ${
        compact ? "p-3" : "p-5"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className={`absolute -right-10 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${theme.accent} blur-2xl`} />
        <div className="absolute bottom-0 left-0 h-20 w-full bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_58%)]" />
      </div>
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 font-[Outfit] font-semibold tracking-[0.18em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
              compact ? "h-14 w-14 text-lg" : "h-20 w-20 text-2xl"
            }`}
          >
            {initials}
          </div>
          <div className="text-right">
            <div className={`font-mono text-[#E5E7EB] ${compact ? "text-xs" : "text-sm"}`}>
              ELO {player?.elo_rating ?? "-"}
            </div>
            <div className={`mt-1 font-mono ${theme.chip} ${compact ? "text-[11px]" : "text-xs"}`}>
              {player?.top_1_finishes ?? 0} title{player?.top_1_finishes === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <div className={compact ? "mt-4" : "mt-6"}>
          <div className={`font-[Outfit] font-semibold text-white ${compact ? "text-base" : "text-2xl"}`}>
            {player?.name}
          </div>
          {player?.nickname ? (
            <div className={`mt-1 ${theme.chip} ${compact ? "text-xs" : "text-sm"}`}>
              {player.nickname}
            </div>
          ) : null}
          <div className={`mt-3 text-[#CBD5E1] ${compact ? "text-xs" : "text-sm"}`}>
            {subtitle || statLine(player)}
          </div>
          {!compact ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono text-[#E5E7EB]">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {player?.tournaments_played ?? 0} tournaments
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {player?.win_rate ?? 0}% win rate
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {player?.top_4_finishes ?? 0} top 4s
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!linkTo) return content;
  return (
    <Link to={linkTo} className="block transition-transform duration-300 hover:-translate-y-1">
      {content}
    </Link>
  );
}

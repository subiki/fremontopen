import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Topbar } from "../components/Topbar";
import {
  ArrowsClockwise,
  SignOut,
  GitMerge,
  PencilSimple,
  ClockClockwise,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { fetchPlayers } from "../lib/api";
import {
  logout,
  adminMergePlayers,
  adminRenamePlayer,
  adminTriggerSync,
  adminFetchAudit,
  formatApiError,
} from "../lib/auth";

export default function Admin() {
  const nav = useNavigate();
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [canonical, setCanonical] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState([]);
  const [tab, setTab] = useState("merge"); // merge | rename | sync | audit

  // rename state
  const [renameTarget, setRenameTarget] = useState("");
  const [renameTo, setRenameTo] = useState("");

  const loadPlayers = async () => {
    try {
      setPlayers(await fetchPlayers());
    } catch (e) {
      toast.error("Failed to load players");
    }
  };
  const loadAudit = async () => {
    try {
      setAudit(await adminFetchAudit(100));
    } catch (e) {
      /* ignore */
    }
  };

  useEffect(() => {
    loadPlayers();
    loadAudit();
  }, []);

  const filtered = search
    ? players.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : players;

  const toggleSel = (name) => {
    setSelected((cur) => (cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]));
  };

  const handleMerge = async () => {
    if (!canonical || selected.length === 0) {
      toast.error("Pick a canonical name and at least one alias");
      return;
    }
    if (!window.confirm(`Merge ${selected.length} player(s) into "${canonical}"? Match records will be rewritten.`))
      return;
    setBusy(true);
    try {
      const aliases = selected.filter((n) => n !== canonical);
      const res = await adminMergePlayers(canonical, aliases);
      toast.success(`Merged: ${res.matches_updated} matches updated`);
      setSelected([]);
      setCanonical("");
      await loadPlayers();
      await loadAudit();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async () => {
    if (!renameTarget || !renameTo) {
      toast.error("Pick a player and provide a new name");
      return;
    }
    if (!window.confirm(`Rename "${renameTarget}" to "${renameTo}" everywhere?`)) return;
    setBusy(true);
    try {
      const res = await adminRenamePlayer(renameTarget, renameTo);
      toast.success(`Renamed: ${res.matches_updated} matches updated`);
      setRenameTarget("");
      setRenameTo("");
      await loadPlayers();
      await loadAudit();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async (force = false) => {
    if (force && !window.confirm("Force re-fetch ALL tournaments (uses many Challonge API calls)?"))
      return;
    setBusy(true);
    toast.info(force ? "Force sync starting…" : "Sync starting…");
    try {
      const summary = await adminTriggerSync(force);
      toast.success(
        `Sync ok: ${summary.tournaments_refreshed} refreshed, ${summary.tournaments_skipped_frozen} skipped (frozen), ${summary.challonge_api_calls} API calls`
      );
      await loadPlayers();
      await loadAudit();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const doLogout = () => {
    logout();
    toast.success("Signed out");
    nav("/admin/login");
  };

  return (
    <>
      <Topbar
        title="Admin"
        subtitle="Data corrections, player merging, manual sync"
        actions={
          <button
            type="button"
            onClick={doLogout}
            data-testid="admin-logout-button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-[#141923] border border-[#273041] text-[#9CA3AF] hover:text-[#F3F4F6] hover:border-[#EF4444]/40 transition-colors"
          >
            <SignOut size={14} />
            Sign out
          </button>
        }
      />
      <main className="flex-1 px-6 sm:px-8 py-6 sm:py-8 space-y-6" data-testid="admin-page">
        <nav className="flex flex-wrap gap-2" data-testid="admin-tabs">
          <TabBtn active={tab === "merge"} onClick={() => setTab("merge")} icon={GitMerge} label="Merge Players" testid="tab-merge" />
          <TabBtn active={tab === "rename"} onClick={() => setTab("rename")} icon={PencilSimple} label="Rename Player" testid="tab-rename" />
          <TabBtn active={tab === "sync"} onClick={() => setTab("sync")} icon={ArrowsClockwise} label="Sync" testid="tab-sync" />
          <TabBtn active={tab === "audit"} onClick={() => setTab("audit")} icon={ClockClockwise} label="Audit Log" testid="tab-audit" />
        </nav>

        {tab === "merge" && (
          <section
            className="bg-[#141923] border border-[#273041] rounded-lg p-6"
            data-testid="merge-panel"
          >
            <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-1">Merge duplicate players</h2>
            <p className="text-sm text-[#9CA3AF] mb-5">
              Pick all the variants of the same human, then enter the canonical name. All match records will be rewritten and stats recomputed.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <input
                  type="text"
                  placeholder="Search players…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="merge-search"
                  className="w-full mb-3 bg-[#0B0E14] border border-[#273041] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none rounded-md px-4 py-2 text-sm text-[#F3F4F6] placeholder-[#6B7280]"
                />
                <div className="max-h-96 overflow-y-auto border border-[#273041] rounded-md divide-y divide-[#273041]/60">
                  {filtered.slice(0, 200).map((p) => (
                    <label
                      key={p.name}
                      className="flex items-center justify-between px-3 py-2 hover:bg-[#1E2532]/60 cursor-pointer text-sm"
                      data-testid={`merge-row-${p.name}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(p.name)}
                          onChange={() => toggleSel(p.name)}
                          className="accent-[#10B981]"
                        />
                        <span className="text-[#F3F4F6]">{p.name}</span>
                      </div>
                      <span className="font-mono text-xs text-[#9CA3AF]">
                        {p.wins}W·{p.losses}L
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 text-xs text-[#6B7280]">{selected.length} selected</div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-[#6B7280] mb-2">
                  Canonical name (will be the result)
                </label>
                <input
                  type="text"
                  value={canonical}
                  onChange={(e) => setCanonical(e.target.value)}
                  data-testid="merge-canonical-input"
                  placeholder="e.g. Jim Smith"
                  className="w-full bg-[#0B0E14] border border-[#273041] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none rounded-md px-4 py-2.5 text-sm text-[#F3F4F6]"
                />
                {selected.length > 0 ? (
                  <div className="mt-3 p-3 bg-[#0B0E14] border border-[#273041] rounded-md text-xs">
                    <div className="text-[#6B7280] mb-1">Will merge:</div>
                    <ul className="space-y-1">
                      {selected.map((s) => (
                        <li key={s} className="text-[#F3F4F6] font-mono">
                          {s}
                        </li>
                      ))}
                    </ul>
                    <div className="text-[#6B7280] mt-2">into:</div>
                    <div className="text-[#10B981] font-mono">{canonical || "(pick canonical above)"}</div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleMerge}
                  disabled={busy || !canonical || selected.length === 0}
                  data-testid="merge-submit"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 text-[#0B0E14] font-semibold text-sm px-4 py-2.5 rounded-md transition-colors"
                >
                  <GitMerge size={16} weight="bold" />
                  {busy ? "Merging…" : "Merge"}
                </button>
              </div>
            </div>
          </section>
        )}

        {tab === "rename" && (
          <section
            className="bg-[#141923] border border-[#273041] rounded-lg p-6"
            data-testid="rename-panel"
          >
            <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-1">Rename a single player</h2>
            <p className="text-sm text-[#9CA3AF] mb-5">
              Useful for fixing typos in Challonge entries (e.g. "Jim S" → "Jim Smith").
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-[#6B7280] mb-2">From</label>
                <select
                  value={renameTarget}
                  onChange={(e) => setRenameTarget(e.target.value)}
                  data-testid="rename-from-select"
                  className="w-full bg-[#0B0E14] border border-[#273041] rounded-md px-3 py-2.5 text-sm text-[#F3F4F6]"
                >
                  <option value="">— select a player —</option>
                  {players.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-[#6B7280] mb-2">To</label>
                <input
                  type="text"
                  value={renameTo}
                  onChange={(e) => setRenameTo(e.target.value)}
                  data-testid="rename-to-input"
                  placeholder="Corrected name"
                  className="w-full bg-[#0B0E14] border border-[#273041] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none rounded-md px-4 py-2.5 text-sm text-[#F3F4F6]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleRename}
              disabled={busy || !renameTarget || !renameTo}
              data-testid="rename-submit"
              className="mt-4 inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 text-[#0B0E14] font-semibold text-sm px-4 py-2.5 rounded-md transition-colors"
            >
              <PencilSimple size={16} weight="bold" />
              {busy ? "Renaming…" : "Rename"}
            </button>
          </section>
        )}

        {tab === "sync" && (
          <section
            className="bg-[#141923] border border-[#273041] rounded-lg p-6"
            data-testid="sync-panel"
          >
            <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-1">Manual sync</h2>
            <p className="text-sm text-[#9CA3AF] mb-5">
              Normal sync skips already-completed tournaments (immutable). Force re-fetches everything — uses many API calls.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleSync(false)}
                disabled={busy}
                data-testid="sync-incremental-button"
                className="inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 text-[#0B0E14] font-semibold text-sm px-4 py-2.5 rounded-md transition-colors"
              >
                <ArrowsClockwise size={16} weight="bold" className={busy ? "animate-spin" : ""} />
                {busy ? "Syncing…" : "Sync (incremental)"}
              </button>
              <button
                type="button"
                onClick={() => handleSync(true)}
                disabled={busy}
                data-testid="sync-force-button"
                className="inline-flex items-center gap-2 bg-[#141923] border border-[#EF4444]/40 hover:bg-[#EF4444]/10 disabled:opacity-40 text-[#EF4444] font-semibold text-sm px-4 py-2.5 rounded-md transition-colors"
              >
                Force resync
              </button>
            </div>
          </section>
        )}

        {tab === "audit" && (
          <section
            className="bg-[#141923] border border-[#273041] rounded-lg p-6"
            data-testid="audit-panel"
          >
            <h2 className="font-[Outfit] text-xl font-semibold text-[#F3F4F6] mb-5">Audit log</h2>
            {audit.length === 0 ? (
              <div className="text-[#6B7280] text-sm">No admin actions recorded yet.</div>
            ) : (
              <ul className="divide-y divide-[#273041]/60">
                {audit.map((row, i) => (
                  <li key={i} className="py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#10B981]">{row.action}</span>
                      <span className="font-mono text-xs text-[#6B7280]">
                        {new Date(row.at).toLocaleString()}
                      </span>
                    </div>
                    <pre className="mt-1 text-[11px] text-[#9CA3AF] whitespace-pre-wrap font-mono overflow-x-auto">
                      {JSON.stringify(row.payload, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="text-xs text-[#6B7280]">
          <Link to="/" className="hover:text-[#10B981]">← Back to dashboard</Link>
        </div>
      </main>
    </>
  );
}

const TabBtn = ({ active, onClick, icon: Icon, label, testid }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testid}
    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
      active
        ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
        : "bg-[#141923] border-[#273041] text-[#9CA3AF] hover:text-[#F3F4F6]"
    }`}
  >
    <Icon size={14} weight={active ? "fill" : "regular"} />
    {label}
  </button>
);

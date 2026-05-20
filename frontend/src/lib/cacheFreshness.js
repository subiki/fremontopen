const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const formatRelativeTime = (iso, now = Date.now()) => {
  if (!iso) return "no data yet";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  const diffMs = Math.max(0, now - date.getTime());
  const minutes = Math.floor(diffMs / MINUTE_MS);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const assessCacheFreshness = (metadata = {}, now = Date.now()) => {
  const lastSyncIso = metadata.last_synced_at || metadata.generated_at || null;
  const generatedIso = metadata.generated_at || null;
  const syncStatus = metadata.sync_status || "unknown";
  const lastSyncDate = lastSyncIso ? new Date(lastSyncIso) : null;
  const generatedDate = generatedIso ? new Date(generatedIso) : null;
  const lastSyncMs = lastSyncDate && !Number.isNaN(lastSyncDate.getTime()) ? lastSyncDate.getTime() : null;
  const generatedMs = generatedDate && !Number.isNaN(generatedDate.getTime()) ? generatedDate.getTime() : null;

  if (syncStatus === "error") {
    return {
      tone: "error",
      label: "Sync error",
      summary: "Last refresh failed; cache may be stale.",
      detail: lastSyncMs ? `Last good sync ${formatRelativeTime(lastSyncIso, now)}` : "No successful sync recorded",
    };
  }

  if (!lastSyncMs && !generatedMs) {
    return {
      tone: "empty",
      label: "No cache data",
      summary: "Static export has not been generated yet.",
      detail: "Run the refresh/export workflow to populate the site.",
    };
  }

  const freshnessMs = lastSyncMs ?? generatedMs;
  const ageMs = Math.max(0, now - freshnessMs);
  const exportLagMs = lastSyncMs && generatedMs ? Math.max(0, generatedMs - lastSyncMs) : 0;
  const exportLagHours = Math.round(exportLagMs / HOUR_MS);

  if (ageMs >= 7 * DAY_MS) {
    return {
      tone: "stale",
      label: "Stale cache",
      summary: `Data is ${formatRelativeTime(lastSyncIso || generatedIso, now)} old.`,
      detail: "Refresh Challonge sync and rebuild the static export.",
    };
  }

  if (ageMs >= 3 * DAY_MS) {
    return {
      tone: "aging",
      label: "Aging cache",
      summary: `Data was last refreshed ${formatRelativeTime(lastSyncIso || generatedIso, now)}.`,
      detail: exportLagHours > 24 ? `Export was rebuilt about ${exportLagHours}h after sync.` : "Site is usable but due for the next refresh.",
    };
  }

  return {
    tone: "fresh",
    label: "Fresh cache",
    summary: `Data was refreshed ${formatRelativeTime(lastSyncIso || generatedIso, now)}.`,
    detail: exportLagHours > 24 ? `Export lagged sync by about ${exportLagHours}h.` : "Static snapshot is recent.",
  };
};

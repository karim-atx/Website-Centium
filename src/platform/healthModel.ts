// The pure part of a Health Connect / Apple Health sync (App-Centium
// ROUND_J.md §2.4; Database DB-Z4 ingest_health_samples). Unit-tested
// without a phone or a server (healthModel.test.ts).

/** ingest_health_samples takes at most this many samples and deletions together. */
export const INGEST_LIMIT = 500;

export type IngestBatch<S, D> = { samples: S[]; deleted: D[] };

/**
 * Splits a sync into calls of at most `limit` items. Deletions go first, so
 * a sample deleted and re-added in Health Connect lands after its deletion.
 * Always at least one call, so a sync with nothing new still reaches the
 * server (and its "last synced" moves).
 */
export function ingestBatches<S, D>(samples: S[], deleted: D[], limit = INGEST_LIMIT): IngestBatch<S, D>[] {
  const out: IngestBatch<S, D>[] = [];
  let d = 0;
  let s = 0;
  while (d < deleted.length || s < samples.length || out.length === 0) {
    const takeD = Math.min(limit, deleted.length - d);
    const takeS = Math.min(limit - takeD, samples.length - s);
    out.push({ deleted: deleted.slice(d, d + takeD), samples: samples.slice(s, s + takeS) });
    d += takeD;
    s += takeS;
  }
  return out;
}

/** One call's answer, as far as the count goes. */
export type IngestAnswer = { saved?: unknown; duplicate?: unknown; hidden?: unknown; rejected?: unknown };

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Saved, and everything else (already there, removed by the member, refused). */
export function tallyIngest(answers: IngestAnswer[]): { saved: number; skipped: number } {
  let saved = 0;
  let skipped = 0;
  for (const a of answers) {
    saved += n(a.saved);
    skipped += n(a.duplicate) + n(a.hidden) + n(a.rejected);
  }
  return { saved, skipped };
}

/** How often opening or returning to the app syncs (D2). "Sync now" ignores it. */
export const AUTO_SYNC_EVERY_MS = 15 * 60 * 1000;

export function autoSyncDue(lastAttemptAt: number | null, now: number): boolean {
  return lastAttemptAt === null || now - lastAttemptAt >= AUTO_SYNC_EVERY_MS;
}

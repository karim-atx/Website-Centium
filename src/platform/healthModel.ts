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

export type SyncResult = { saved: number; skipped: number; error?: "offline" | "server" | "access_off" };
type CallError = { message: string; code?: string };

/** What a sync calls: the phone's plugin and the server, with the session. */
export interface SyncSteps<S, D> {
  /** Rejects with code "access_off" when Health Connect's access was withdrawn. */
  collect(): Promise<{ syncId: string; samples: S[]; deleted: D[] }>;
  ingest(batch: IngestBatch<S, D>): PromiseLike<{ data: unknown; error: CallError | null }>;
  commit(syncId: string): Promise<void>;
  /** report_health_integration_sync. Never rejects. */
  report(accessState: "ok" | "access_off" | "error", lastSyncedAt: string | null, error?: string): PromiseLike<unknown>;
  isOffline(error: CallError): boolean;
  /** The server hasn't heard of the connection yet (ATXZ1). */
  notConnected(): void;
  now(): string;
}

/**
 * One sync. It ends only once the server has its outcome, so whoever reads
 * the status next (Settings' "Last synced") sees this sync, not the one before.
 */
export async function runSync<S, D>(steps: SyncSteps<S, D>): Promise<SyncResult> {
  let collected;
  try {
    collected = await steps.collect();
  } catch (e) {
    const code = (e as { code?: string } | null)?.code;
    if (code === "access_off") {
      // Access withdrawn in Health Connect: the server shows "Access off".
      await steps.report("access_off", null);
      return { saved: 0, skipped: 0, error: "access_off" };
    }
    console.error("[health] Reading Health Connect failed:", e);
    return { saved: 0, skipped: 0, error: "server" };
  }

  const answers: IngestAnswer[] = [];
  for (const batch of ingestBatches(collected.samples, collected.deleted)) {
    const { data, error } = await steps.ingest(batch);
    if (error) {
      if (steps.isOffline(error)) return { saved: 0, skipped: 0, error: "offline" };
      console.error("[health] The server refused a sync:", error.code, error.message);
      // Not connected on the server (yet): reporting needs the connection too.
      if (error.code === "ATXZ1") steps.notConnected();
      else await steps.report("error", null, `ingest_health_samples ${error.code ?? "failed"}`);
      return { saved: 0, skipped: 0, error: "server" };
    }
    answers.push((data ?? {}) as IngestAnswer);
  }
  // Every call answered: the phone moves on, and the server shows when.
  await steps.commit(collected.syncId).catch((e: unknown) => console.warn("[health] Commit failed:", e));
  await steps.report("ok", steps.now());
  return tallyIngest(answers);
}

/** How often opening or returning to the app syncs (D2). "Sync now" ignores it. */
export const AUTO_SYNC_EVERY_MS = 15 * 60 * 1000;

export function autoSyncDue(lastAttemptAt: number | null, now: number): boolean {
  return lastAttemptAt === null || now - lastAttemptAt >= AUTO_SYNC_EVERY_MS;
}

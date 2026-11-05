import { rpc } from "../pro/rpc";
import {
  dayChunks,
  DAYS_MAX,
  HOURS_MAX,
  parseActivityDay,
  parseActivityHour,
  parseSleepNight,
  type ReaderDay,
  type ReaderHour,
  type ReaderNight,
  type SyncedKind,
} from "./readersModel";

// Round J · J-2a: the calls behind readersModel.ts (Database DB-Z4). The
// member's own readers (my_*) and a professional's (client_*, under the
// health_metrics consent) take at most 400 days, the hour readers 31, so a
// longer range is read in pieces and joined. Not in database.types.ts yet,
// hence the untyped rpc (services/pro/rpc).

type Result<T> = { ok: true; rows: T[] } | { ok: false; error: unknown };

async function chunked<T>(
  fn: string,
  args: Record<string, unknown>,
  from: string,
  to: string,
  maxSpan: number,
  parse: (r: Record<string, unknown>) => T
): Promise<Result<T>> {
  const parts = await Promise.all(
    dayChunks(from, to, maxSpan).map(([f, t]) => rpc(fn, { ...args, p_from: f, p_to: t }))
  );
  const rows: T[] = [];
  for (const p of parts) {
    if (p.error) return { ok: false, error: p.error };
    for (const r of (p.data ?? []) as Record<string, unknown>[]) rows.push(parse(r));
  }
  return { ok: true, rows };
}

/** One activity row per day, each field from the best-ranked source. `client` reads a client's. */
export function readActivityDays(from: string, to: string, client?: string): Promise<Result<ReaderDay>> {
  return client
    ? chunked("client_activity_days", { p_client: client }, from, to, DAYS_MAX, parseActivityDay)
    : chunked("my_activity_days", {}, from, to, DAYS_MAX, parseActivityDay);
}

/** One row per day and hour: steps, kcal and heart rate (min, avg, max). */
export function readActivityHours(from: string, to: string, client?: string): Promise<Result<ReaderHour>> {
  return client
    ? chunked("client_activity_hours", { p_client: client }, from, to, HOURS_MAX, parseActivityHour)
    : chunked("my_activity_hours", {}, from, to, HOURS_MAX, parseActivityHour);
}

/** One main night per date (naps aren't here: read them from sleep_details). */
export function readSleepNights(from: string, to: string, client?: string): Promise<Result<ReaderNight>> {
  return client
    ? chunked("client_sleep_nights", { p_client: client }, from, to, DAYS_MAX, parseSleepNight)
    : chunked("my_sleep_nights", {}, from, to, DAYS_MAX, parseSleepNight);
}

/**
 * Removes a synced reading from Centium and remembers it, so the next sync
 * skips it (it stays in Apple Health / Health Connect). False when there's no
 * such row of yours or the call failed; a manual reading is deleted the usual way.
 */
export async function removeSyncedReading(kind: SyncedKind, id: string): Promise<boolean> {
  const { data, error } = await rpc("remove_synced_reading", { p_kind: kind, p_id: id });
  return !error && data === true;
}

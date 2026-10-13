import { OFFLINE_MESSAGE } from "../network-error";

/**
 * The Health B log sheets' offline queue (handover shared states: "writes
 * queue only for log sheets"; HE1.1.1 / HE1.6.1 / HE1.7.1 O3, designed by us).
 *
 * A save made with no connection is kept on this device, per account, and
 * sent when the browser is back online (or the next time a log sheet is
 * mounted while online). Nothing else in the app queues: every other write
 * still says "You're offline. Try again when you're connected."
 *
 * Only what the sheet would have sent is kept: the amount, the day it is
 * filed under, and for a reading its numbers, arm, position, note and time.
 * The queue is cleared on success, item by item, so a partial flush resumes.
 */

export type QueuedBpReading = {
  systolic: number;
  diastolic: number;
  pulse: number | null;
  arm: "left" | "right" | null;
  position: "sitting" | "standing" | "lying" | null;
  notes: string | null;
};

export type QueuedLog =
  | { id: string; kind: "water"; ml: number; day: string; /** B1 drink time (ISO). */ loggedAt?: string }
  | { id: string; kind: "weight"; kg: number; day: string; note?: string | null }
  | { id: string; kind: "bp"; reading: QueuedBpReading; day: string; recordedAt: string };

/** Shown in place of the saved state while an entry waits (HE1.1.1 O3, 11/16 #8C8378). */
export const QUEUED_COPY = "Will save when you're back online.";

const keyFor = (userId: string) => `centium:health-log-queue:${userId}`;

function read(userId: string): QueuedLog[] {
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as QueuedLog[]) : [];
  } catch {
    return [];
  }
}

function write(userId: string, items: QueuedLog[]) {
  try {
    if (items.length === 0) window.localStorage.removeItem(keyFor(userId));
    else window.localStorage.setItem(keyFor(userId), JSON.stringify(items));
  } catch {
    // Storage unavailable (private mode): the entry is lost, as it would be
    // without a queue. The sheet has already said it will save later; there
    // is no better promise to make here.
  }
}

/** Distributive Omit, so each queued kind keeps its own fields. */
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

export function enqueueLog(userId: string, item: WithoutId<QueuedLog>): void {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  write(userId, [...read(userId), { ...item, id } as QueuedLog]);
}

export function queuedLogs(userId: string): QueuedLog[] {
  return read(userId);
}

/** True when a failed write was the connection, not the database. */
export function isOfflineFailure(result: { ok: boolean; message?: string }): boolean {
  if (result.ok) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return result.message === OFFLINE_MESSAGE;
}

export function browserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

let flushing: Promise<void> | null = null;

/**
 * Sends every queued entry through `send`, oldest first. One flush at a
 * time per tab (several sheets can be mounted at once). An entry that fails
 * because the connection dropped again stays queued; one the database
 * refuses (out of range, signed out) is dropped, as a typed entry would have
 * been refused on the spot.
 */
export function flushLogQueue(userId: string, send: (item: QueuedLog) => Promise<{ ok: boolean; message?: string }>): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      for (const item of read(userId)) {
        if (browserOffline()) return;
        const result = await send(item);
        if (!result.ok && isOfflineFailure(result)) return;
        write(
          userId,
          read(userId).filter((q) => q.id !== item.id)
        );
      }
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

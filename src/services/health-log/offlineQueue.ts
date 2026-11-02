import { OFFLINE_MESSAGE } from "../network-error";
import type { LogFoodEntryParams } from "../food";
import type { WorkoutSession } from "../../types";
import type { SessionSwap } from "../workout/coachLogic";
import { describeQueued, withQueued } from "./outboxModel";
import { newRequestId } from "./requestId";
import { tk } from "../../i18n/core";

export { describeQueued, withQueued };

/**
 * The app's offline outbox (Round D, D22). It began as the Health B log
 * sheets' queue (water, weight, blood pressure: HE1.1.1 / HE1.6.1 / HE1.7.1
 * O3); it now also keeps food entries, habit ticks, finished workouts and
 * messages, in that order of priority.
 *
 * A save made with no connection is kept on this device, per account, and
 * sent when the browser is back online (the flusher is mounted once for the
 * whole app). Everything else still says it needs a connection.
 *
 * Only what the write would have sent is kept. The queue is cleared on
 * success, item by item, so a partial flush resumes. It is cleared on
 * sign-out too, after the person is warned (D23): it holds health data.
 */

export type QueuedBpReading = {
  systolic: number;
  diastolic: number;
  pulse: number | null;
  arm: "left" | "right" | null;
  position: "sitting" | "standing" | "lying" | null;
  notes: string | null;
};

export type QueuedWorkout = Omit<WorkoutSession, "id"> & { swaps?: SessionSwap[] };

export type QueuedLog =
  | { id: string; kind: "water"; ml: number; day: string; /** B1 drink time (ISO). */ loggedAt?: string }
  | { id: string; kind: "weight"; kg: number; day: string; note?: string | null }
  | { id: string; kind: "bp"; reading: QueuedBpReading; day: string; recordedAt: string }
  /** A diary entry; the diary shows it from `provisionalId` until it lands. */
  | { id: string; kind: "food"; params: Omit<LogFoodEntryParams, "userId">; provisionalId: string }
  /** The latest wanted state of one habit on one day (a later tick replaces it). */
  | { id: string; kind: "habit"; habitId: string; day: string; done: boolean }
  /** A finished workout, exactly as the session sheet would have saved it. */
  | { id: string; kind: "workout"; session: QueuedWorkout }
  /** A text message; the thread shows it as "Not sent yet" until it goes. */
  | { id: string; kind: "message"; threadId: string; text: string; replyToId: string | null; queuedAt: string }
  /** A daily goal (metric_goals) set offline; a later change replaces it. */
  | { id: string; kind: "goal"; metric: "water" | "steps"; value: number; day: string };

/** Shown in place of the saved state while an entry waits (HE1.1.1 O3, 11/16 #8C8378). */
export const QUEUED_COPY = tk("Will save when you're back online.");

/** The toast a screen shows when a write was kept on the device. */
export const SAVED_ON_DEVICE = tk("Saved on this device until you reconnect.");

/** Fired on window whenever the queue changes, so counts and pending rows update. */
export const OUTBOX_EVENT = "centium:outbox";

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
    // without a queue. The screen has already said it will save later; there
    // is no better promise to make here.
  }
  try {
    window.dispatchEvent(new Event(OUTBOX_EVENT));
  } catch {
    /* no window (tests) */
  }
}

/** Distributive Omit, so each queued kind keeps its own fields. */
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

/** A uuid: it is also the item's client_request_id, so a replay is saved once (Database 20261222020000). */
export const newQueueId = newRequestId;

/** Adds an entry. A habit tick (same habit and day) or a goal (same metric) replaces the waiting one. */
export function enqueueLog(userId: string, item: WithoutId<QueuedLog>, id: string = newQueueId()): string {
  write(userId, withQueued(read(userId), { ...item, id } as QueuedLog));
  return id;
}

export function queuedLogs(userId: string): QueuedLog[] {
  return read(userId);
}

/** Drops one entry (the person discarded a message that wasn't sent). */
export function removeQueued(userId: string, id: string): void {
  write(
    userId,
    read(userId).filter((q) => q.id !== id)
  );
}

/** Empties the queue (sign-out, after the warning). */
export function clearQueue(userId: string): void {
  write(userId, []);
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
 * time per tab. An entry that fails because the connection dropped again
 * stays queued (and stops the flush, so the order holds); one the database
 * refuses (out of range, signed out) is dropped, as a typed entry would have
 * been refused on the spot, and is reported to `onDropped`.
 */
export function flushLogQueue(
  userId: string,
  send: (item: QueuedLog) => Promise<{ ok: boolean; message?: string }>,
  onDropped?: (item: QueuedLog, message: string | undefined) => void
): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      for (const item of read(userId)) {
        if (browserOffline()) return;
        // Discarded while this flush was running (a message the person deleted).
        if (!read(userId).some((q) => q.id === item.id)) continue;
        const result = await send(item);
        if (!result.ok && isOfflineFailure(result)) return;
        if (!result.ok) onDropped?.(item, result.message);
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

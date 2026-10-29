import { useEffect, useRef } from "react";
import { useApp } from "../../../context/AppContext";
import { logBloodPressure } from "../../../services/blood-pressure";
import { flushLogQueue, queuedLogs, type QueuedLog } from "../../../services/health-log/offlineQueue";
import { isUuid } from "../../../services/health-log/requestId";
import { logWater } from "../../../services/health-log/waterIntakes";
import { sendMessage } from "../../../services/messaging";

/** Fired when a kept entry was refused once sent (not the connection); detail: { kind, message }. */
export const OUTBOX_DROPPED_EVENT = "centium:outbox-dropped";

/**
 * Sends the offline outbox (services/health-log/offlineQueue) when the
 * browser comes back online, and once on mount if anything is waiting.
 *
 * MOUNTED ONCE FOR THE WHOLE APP (Round D, O8), in the signed-in layout. It
 * used to live in the three log sheets only, so a queued entry waited until
 * one of those screens was open. The queue itself keeps one flush at a time.
 */
export function useLogQueueFlush() {
  const { authUserId, today, logWeightForToday, reloadMetrics, reloadBloodPressure, refreshAchievements, deliverQueued } = useApp();

  // The latest senders, so the listener is added once per account.
  const send = useRef<(item: QueuedLog) => Promise<{ ok: boolean; message?: string }>>(async () => ({ ok: false }));
  useEffect(() => {
    send.current = async (item: QueuedLog) => {
      if (!authUserId) return { ok: false };
      switch (item.kind) {
        case "water": {
          // Round D: the drink and the day total in one call, sent once
          // (log_water with the item's uuid; a replay is already_saved).
          const r = await logWater(item.ml, item.loggedAt ? new Date(item.loggedAt) : new Date(`${item.day}T12:00:00`), isUuid(item.id) ? item.id : null);
          if (r.ok) reloadMetrics();
          return r;
        }
        case "weight":
          return logWeightForToday(item.kg, item.day, item.note ?? null, item.id);
        case "bp": {
          const result = await logBloodPressure({ userId: authUserId, reading: item.reading, day: item.day, today, recordedAt: item.recordedAt, requestId: item.id });
          if (result.ok) {
            reloadBloodPressure();
            refreshAchievements();
          }
          return result;
        }
        case "message": {
          // The thread re-reads on the outbox event and shows the sent row.
          const r = await sendMessage(item.threadId, authUserId, item.text, item.replyToId, item.id);
          return r.ok ? { ok: true } : { ok: false, message: r.message };
        }
        default:
          return deliverQueued(item);
      }
    };
  });

  useEffect(() => {
    if (!authUserId) return;
    const flush = () => {
      if (queuedLogs(authUserId).length === 0) return;
      void flushLogQueue(
        authUserId,
        (item) => send.current(item),
        (item, message) => window.dispatchEvent(new CustomEvent(OUTBOX_DROPPED_EVENT, { detail: { kind: item.kind, message } }))
      );
    };
    if (navigator.onLine) flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [authUserId]);
}

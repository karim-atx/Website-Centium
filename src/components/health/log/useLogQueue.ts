import { useEffect, useRef } from "react";
import { useApp } from "../../../context/AppContext";
import { logBloodPressure } from "../../../services/blood-pressure";
import { flushLogQueue, queuedLogs, type QueuedLog } from "../../../services/health-log/offlineQueue";
import { deleteDrink, logDrink } from "../../../services/health-log/waterIntakes";

/**
 * Sends the Health B log sheets' queued entries (services/health-log/
 * offlineQueue) when the browser comes back online, and once on mount if
 * anything is waiting. Every log sheet mounts this; the queue itself keeps
 * one flush at a time.
 */
export function useLogQueueFlush() {
  const { authUserId, today, addWater, logWeightForToday, reloadBloodPressure, refreshAchievements } = useApp();

  // The latest senders, so the listener is added once per account.
  const send = useRef<(item: QueuedLog) => Promise<{ ok: boolean; message?: string }>>(async () => ({ ok: false }));
  useEffect(() => {
    send.current = async (item: QueuedLog) => {
      if (item.kind === "water") {
        if (!authUserId) return { ok: false };
        const drink = await logDrink(authUserId, item.ml, item.loggedAt ? new Date(item.loggedAt) : new Date(`${item.day}T12:00:00`));
        if (!drink.ok) return drink;
        const total = await addWater(item.ml, item.day);
        if (!total.ok) void deleteDrink(drink.id);
        return total;
      }
      if (item.kind === "weight") return logWeightForToday(item.kg, item.day, item.note ?? null);
      if (!authUserId) return { ok: false };
      const result = await logBloodPressure({ userId: authUserId, reading: item.reading, day: item.day, today, recordedAt: item.recordedAt });
      if (result.ok) {
        reloadBloodPressure();
        refreshAchievements();
      }
      return result;
    };
  });

  useEffect(() => {
    if (!authUserId) return;
    const flush = () => {
      if (queuedLogs(authUserId).length === 0) return;
      void flushLogQueue(authUserId, (item) => send.current(item));
    };
    if (navigator.onLine) flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [authUserId]);
}

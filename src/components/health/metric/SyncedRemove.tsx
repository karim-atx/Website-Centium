import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { sourceName, useActivitySources, useSleepSessions } from "../../../services/health-metrics/b1";
import { removeSyncedActivityDay, removeSyncedReading } from "../../../services/health-metrics/readers";
import { syncedActivitySource, type ActivityField } from "../../../services/health-metrics/readersModel";
import { HealthPopup } from "./HealthPopup";
import { SAVE_FAILED } from "./MetricKit";
import { t } from "../../../i18n/core";

/**
 * Delete on a synced day (HA-12 / PB-H-03, V6-169): "Remove from Centium?" /
 * "It stays in Apple Health. Centium won't import it again." / Cancel /
 * Remove (OURS-health-delete-confirm). The Database call removes the synced
 * day or night and remembers it so the next sync skips it; manual rows are
 * never touched by this path. Offered only on a day that has synced data.
 */
function useRemovePopup(onToast: (m: string) => void, remove: (day: string) => Promise<boolean[]>, sourceFor: (day: string) => string, after: () => void) {
  const { authUserId, reloadMetrics } = useApp();
  const [day, setDay] = useState<string | null>(null);
  const popup = (
    <HealthPopup
      open={day !== null}
      onClose={() => setDay(null)}
      title={t("Remove from Centium?")}
      body={<p>{t("It stays in {source}. Centium won't import it again.", { source: day ? sourceFor(day) : "Apple Health" })}</p>}
      secondary={{ label: t("Cancel"), onClick: () => setDay(null) }}
      primary={{
        label: t("Remove"),
        tone: "destructive",
        onClick: async () => {
          const d = day;
          setDay(null);
          if (!d || !authUserId) return;
          const results = await remove(d);
          if (results.some((ok) => !ok)) onToast(SAVE_FAILED);
          after();
          reloadMetrics();
        },
      }}
    />
  );
  return { open: setDay, popup };
}

/**
 * Steps, calories burned and heart rate. The sync writes these to
 * activity_daily and activity_hourly only (DB-Z4), so a synced day is removed
 * whole with remove_synced_activity_day (Karim's HA-12 decision (a)): that
 * day's steps, calories and heart rate from the phone go together. Offered
 * only when this page's own figure for the day came from a phone source.
 */
export function useSyncedRemove(field: ActivityField, fromDay: string, toDay: string, onToast: (m: string) => void) {
  const read = useActivitySources(fromDay, toDay);
  const synced = (d: string) => syncedActivitySource(field, d, read.data.days, read.data.hours);
  const { open, popup } = useRemovePopup(
    onToast,
    async (d) => [await removeSyncedActivityDay(d)],
    (d) => sourceName(synced(d) ?? "apple_health"),
    read.reload
  );
  return {
    /** The history row's Delete for a day with synced activity, else undefined. */
    onDelete: (d: string) => (synced(d) ? () => open(d) : undefined),
    /** "Apple Health" etc. when the day's figure is synced, else null. */
    sourceOf: (d: string) => {
      const s = synced(d);
      return s ? sourceName(s) : null;
    },
    popup,
  };
}

/** Sleep: the day's synced main night from my_sleep_nights, removed with remove_synced_reading('sleep'). */
export function useSyncedSleepRemove(fromDay: string, toDay: string, onToast: (m: string) => void) {
  const nights = useSleepSessions(fromDay, toDay);
  const synced = (d: string) => nights.data.filter((n) => n.day === d && !!n.source && n.source !== "manual");
  const { open, popup } = useRemovePopup(
    onToast,
    (d) => Promise.all(synced(d).map((n) => removeSyncedReading("sleep", n.id))),
    (d) => sourceName(synced(d)[0]?.source ?? "apple_health"),
    nights.reload
  );
  return {
    onDelete: (d: string) => (synced(d).length > 0 ? () => open(d) : undefined),
    sourceOf: (d: string) => {
      const n = nights.data.find((x) => x.day === d && !x.isNap);
      return n ? sourceName(n.source) : null;
    },
    popup,
  };
}

export type SyncedRemove = ReturnType<typeof useSyncedRemove>;

import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { hideSyncedReading, sourceName, useMetricRows, useSleepSessions, type RawMetricRow } from "../../../services/health-metrics/b1";
import { removeSyncedReading } from "../../../services/health-metrics/readers";
import { HealthPopup } from "./HealthPopup";
import { SAVE_FAILED } from "./MetricKit";
import { t } from "../../../i18n/core";

/**
 * Delete on a synced day (HA-12 / PB-H-03, V6-169): "Remove from Centium?" /
 * "It stays in Apple Health. Centium won't import it again." / Cancel /
 * Remove (OURS-health-delete-confirm). Every synced reading of that metric on
 * that day is removed with remove_synced_reading (Database DB-Z4), which also
 * remembers it so the next sync skips it; manual rows are never touched by
 * this path. Offered only on a day that has synced readings.
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
 * Steps, calories burned and heart rate.
 *
 * TODO(Round J, pending): under DB-Z4 the sync writes these to activity_daily
 * and activity_hourly only, never to health_metrics, and remove_synced_reading
 * has no activity kind. So this still reads health_metrics (where no synced
 * row is written any more) until the Database session decides between (a) an
 * 'activity_day' kind for remove_synced_reading, which keeps HA-12 here, and
 * (b) dropping HA-12 on these three pages.
 */
export function useSyncedRemove(dbType: "steps" | "calories_burned" | "heart_rate", fromDay: string, toDay: string, onToast: (m: string) => void) {
  const rows = useMetricRows(dbType, fromDay, toDay);
  const synced = (d: string): RawMetricRow[] => rows.data.filter((r) => r.day === d && r.source !== "manual");
  const { open, popup } = useRemovePopup(
    onToast,
    (d) => Promise.all(synced(d).map((r) => hideSyncedReading(r))),
    (d) => sourceName(synced(d)[0]?.source ?? "apple_health"),
    rows.reload
  );
  return {
    /** The history row's Delete for a day with synced readings, else undefined. */
    onDelete: (d: string) => (synced(d).length > 0 ? () => open(d) : undefined),
    /** "Apple Health" etc. for a day's rows, "Logged by you" for manual, null when none. */
    sourceOf: (d: string) => {
      const r = rows.data.find((x) => x.day === d);
      return r ? sourceName(r.source) : null;
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

import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { hideSyncedReading, useMetricRows, type RawMetricRow } from "../../../services/health-metrics/b1";
import { HealthPopup } from "./HealthPopup";
import { SAVE_FAILED } from "./MetricKit";
import { t } from "../../../i18n/core";

/**
 * Delete on a synced day (HA-12 / PB-H-03, V6-169; Database B1
 * hidden_synced_readings): "Remove from Centium?" / "It stays in Apple
 * Health. Centium won't import it again." / Cancel / Remove
 * (OURS-health-delete-confirm). Every synced reading of that metric on that
 * day is recorded as hidden (so the next sync skips it) and removed here;
 * manual rows are never touched by this path. Not reachable on the web today
 * (no synced rows), offered as soon as such rows exist.
 */
export function useSyncedRemove(dbType: "steps" | "sleep" | "calories_burned" | "heart_rate", fromDay: string, toDay: string, onToast: (m: string) => void) {
  const { authUserId, reloadMetrics } = useApp();
  const rows = useMetricRows(dbType, fromDay, toDay);
  const [day, setDay] = useState<string | null>(null);
  const synced = (d: string): RawMetricRow[] => rows.data.filter((r) => r.day === d && r.source !== "manual" && !!r.externalId);
  const first = day ? synced(day)[0] : undefined;
  const sourceLabel = first ? (first.source === "apple_health" ? "Apple Health" : first.source === "android_health" ? "Health Connect" : "WHOOP") : "Apple Health";
  const popup = (
    <HealthPopup
      open={day !== null}
      onClose={() => setDay(null)}
      title={t("Remove from Centium?")}
      body={<p>{t("It stays in {source}. Centium won't import it again.", { source: sourceLabel })}</p>}
      secondary={{ label: t("Cancel"), onClick: () => setDay(null) }}
      primary={{
        label: t("Remove"),
        tone: "destructive",
        onClick: async () => {
          const d = day;
          setDay(null);
          if (!d || !authUserId) return;
          const results = await Promise.all(synced(d).map((r) => hideSyncedReading(authUserId, r)));
          if (results.some((ok) => !ok)) onToast(SAVE_FAILED);
          rows.reload();
          reloadMetrics();
        },
      }}
    />
  );
  return {
    /** The history row's Delete for a day with synced readings, else undefined. */
    onDelete: (d: string) => (synced(d).length > 0 ? () => setDay(d) : undefined),
    /** "Apple Health" etc. for a day's rows, "Logged by you" for manual, null when none. */
    sourceOf: (d: string) => {
      const r = rows.data.find((x) => x.day === d);
      return r ? (r.source === "manual" ? t("Logged by you") : r.source === "apple_health" ? "Apple Health" : r.source === "android_health" ? "Health Connect" : "WHOOP") : null;
    },
    popup,
  };
}

export type SyncedRemove = ReturnType<typeof useSyncedRemove>;

import { supabase } from "../../../lib/supabase/client";
import { localDayOf } from "../../utils/date";

// OURS-Sources ("Devices and sources", /app/settings/devices): the reads.
// Read-only, own rows only (RLS). Nothing here writes.
//
// - Connected sources: public.health_integrations (provider apple_health /
//   android_health, connected, last_synced_at). The web never writes it; the
//   phone app will (PB-O-80). Whoop, an access state and priority need
//   Database stage B1 (PB-O-80 / 81), so they are not read here.
// - "Logged by you" (PB-O-82, derivable now): health_metrics rows with
//   source = 'manual' and blood_pressure_readings with source = 'manual'.
//   Water and weight are day snapshots (health-metrics service), so they
//   count days; body measurements count logging moments (one save writes a
//   row per measurement); blood pressure and steps count rows.

export type SourceProvider = "apple_health" | "android_health";

export interface ConnectedSource {
  provider: SourceProvider;
  lastSyncedAt: string | null;
}

export type ManualKey = "water" | "weight" | "blood-pressure" | "measurements" | "steps";

export interface ManualSummary {
  key: ManualKey;
  count: number;
  lastAt: string | null;
}

export type SourcesRead =
  | { ok: true; sources: ConnectedSource[]; manual: ManualSummary[] }
  | { ok: false };

const MEASUREMENT_TYPES = [
  "waist",
  "hips",
  "chest",
  "neck",
  "shoulders",
  "arm_left",
  "arm_right",
  "forearm_left",
  "forearm_right",
  "thigh_left",
  "thigh_right",
  "calf_left",
  "calf_right",
  "body_fat_pct",
] as const;

function summarise(key: ManualKey, stamps: string[], by: "row" | "day" | "moment"): ManualSummary {
  if (stamps.length === 0) return { key, count: 0, lastAt: null };
  const lastAt = stamps.reduce((a, b) => (b > a ? b : a));
  const count =
    by === "row" ? stamps.length : new Set(stamps.map((s) => (by === "day" ? localDayOf(s) : s))).size;
  return { key, count, lastAt };
}

export async function readSources(userId: string): Promise<SourcesRead> {
  const [integrations, metrics, bp] = await Promise.all([
    supabase.from("health_integrations").select("provider, connected, last_synced_at").eq("user_id", userId),
    supabase
      .from("health_metrics")
      .select("metric_type, recorded_at")
      .eq("user_id", userId)
      .eq("source", "manual")
      .in("metric_type", ["water", "weight", "steps", ...MEASUREMENT_TYPES]),
    supabase.from("blood_pressure_readings").select("recorded_at").eq("user_id", userId).eq("source", "manual"),
  ]);
  if (integrations.error || metrics.error || bp.error) return { ok: false };

  const sources: ConnectedSource[] = (integrations.data ?? [])
    .filter((r) => r.connected)
    .map((r) => ({ provider: r.provider as SourceProvider, lastSyncedAt: r.last_synced_at }))
    // Apple Health / Health Connect first, by platform order in the enum.
    .sort((a, b) => a.provider.localeCompare(b.provider));

  const rows = metrics.data ?? [];
  const of = (types: readonly string[]) => rows.filter((r) => types.includes(r.metric_type)).map((r) => r.recorded_at);
  const manual: ManualSummary[] = [
    summarise("water", of(["water"]), "day"),
    summarise("weight", of(["weight"]), "day"),
    summarise("blood-pressure", (bp.data ?? []).map((r) => r.recorded_at), "row"),
    summarise("measurements", of(MEASUREMENT_TYPES), "moment"),
    summarise("steps", of(["steps"]), "row"),
  ];
  return { ok: true, sources, manual };
}

import { supabase } from "../../../lib/supabase/client";
import { localDayOf } from "../../utils/date";

// OURS-Sources ("Devices and sources", /app/settings/devices): the reads.
// Read-only, own rows only (RLS). Nothing here writes.
//
// - Connected sources: public.health_integrations (provider apple_health /
//   android_health / whoop, connected, last_synced_at). The phone app links
//   them (PB-O-80). Database B1 (20261114000000) adds whoop, access_state
//   (ok / access_off / error; NULL means unknown, not ok), last_error_at and
//   priority (lower wins, 1-20, NULL unordered; PB-O-81). The one write here
//   is the priority order (savePriorities).
// - "Logged by you" (PB-O-82, derivable now): health_metrics rows with
//   source = 'manual' and blood_pressure_readings with source = 'manual'.
//   Water and weight are day snapshots (health-metrics service), so they
//   count days; body measurements count logging moments (one save writes a
//   row per measurement); blood pressure and steps count rows.

export type SourceProvider = "apple_health" | "android_health" | "whoop";

export type AccessState = "ok" | "access_off" | "error";

export interface ConnectedSource {
  /** health_integrations.id, what a priority write addresses. */
  id: string;
  provider: SourceProvider;
  lastSyncedAt: string | null;
  /** B1. Null = unknown (every row made before B1), never read as ok. */
  accessState: AccessState | null;
  lastErrorAt: string | null;
  /** B1. Lower wins when two sources report the same thing; null = unordered. */
  priority: number | null;
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

const PROVIDER_ORDER: SourceProvider[] = ["apple_health", "android_health", "whoop"];

/**
 * Saves the order in which overlapping sources are used (PB-O-81): the first
 * row gets priority 1, the next 2, and so on. One UPDATE per row; the grant
 * covers priority. Resolves false if any write failed (the screen reverts).
 */
export async function savePriorities(ordered: { id: string }[]): Promise<boolean> {
  const table = supabase.from("health_integrations") as unknown as {
    update: (v: { priority: number }) => { eq: (c: string, v: string) => PromiseLike<{ error: { message: string } | null }> };
  };
  const results = await Promise.all(ordered.map((s, i) => table.update({ priority: i + 1 }).eq("id", s.id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) console.error("[sources] Could not save the order:", failed.error.message);
  return !failed;
}

export async function readSources(userId: string): Promise<SourcesRead> {
  const [integrations, metrics, bp] = await Promise.all([
    // B1's columns are newer than the generated types (production).
    (supabase.from("health_integrations") as unknown as {
      select: (c: string) => {
        eq: (
          c: string,
          v: string
        ) => PromiseLike<{
          data:
            | {
                id: string;
                provider: string;
                connected: boolean;
                last_synced_at: string | null;
                access_state: string | null;
                last_error_at: string | null;
                priority: number | null;
              }[]
            | null;
          error: { message: string } | null;
        }>;
      };
    })
      .select("id, provider, connected, last_synced_at, access_state, last_error_at, priority")
      .eq("user_id", userId),
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
    .filter((r) => r.connected && (r.provider === "apple_health" || r.provider === "android_health" || r.provider === "whoop"))
    .map((r) => ({
      id: r.id,
      provider: r.provider as SourceProvider,
      lastSyncedAt: r.last_synced_at,
      accessState:
        r.access_state === "ok" || r.access_state === "access_off" || r.access_state === "error" ? (r.access_state as AccessState) : null,
      lastErrorAt: r.last_error_at,
      priority: r.priority,
    }))
    // In priority order (lower first, unordered last), then the phone's own
    // source before WHOOP, by the enum order.
    .sort(
      (a, b) =>
        (a.priority ?? 99) - (b.priority ?? 99) ||
        PROVIDER_ORDER.indexOf(a.provider) - PROVIDER_ORDER.indexOf(b.provider)
    );

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

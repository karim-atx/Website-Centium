// Health Connect on Android, Apple Health on iOS later (App-Centium
// ROUND_J.md §2; Database DB-Z4). Read only: steps, sleep, workouts, heart
// rate, and weight and body fat only while recovery-sensitive mode is off (D1).
//
// WHO DOES WHAT (§2.7). The phone reads Health Connect and hands this module
// each sync's samples, already in ingest_health_samples' shape; this module
// makes every server call with the WebView's session, so the session lives in
// one place and iOS reuses all of it.
//
// WHEN IT SYNCS (D2): when the app opens or comes back to the foreground, at
// most every 15 minutes (syncHealthIfDue), plus "Sync now" (syncNow). Nothing
// in the background yet. The first sync reads 30 days (D3).
//
// A SYNC IS SAFE TO REPEAT. Every sample is keyed (a record's id, or a day or
// an hour), the server answers "duplicate" for what it has, and the phone only
// moves its changes token once the server has taken the whole sync. A sync
// that fails part-way is simply read again next time.
//
// Shown only where all three agree: the app, the "health_sync" switch
// (app_config), and a build that has the feature (Health Connect installed
// and up to date; `reason` says what to do otherwise).
import { App } from "@capacitor/app";
import { registerPlugin } from "@capacitor/core";
import { supabase } from "../../lib/supabase/client";
import { isOffline } from "../services/network-error";
import { nativeFeatureOn } from "./appConfig";
import type { HealthAvailability, HealthModule, HealthType } from "./contracts";
import { featureAvailable } from "./features";
import { autoSyncDue, runSync, type SyncResult } from "./healthModel";
import { isNative, platform } from "./index";

type Sample = Record<string, unknown>;
type Deletion = { kind: string; external_id: string };

interface CentiumHealthPlugin {
  status(): Promise<{ connected: boolean; granted: HealthType[] }>;
  connect(options: { recoverySensitive: boolean }): Promise<{ granted: HealthType[]; refused: HealthType[]; scopes: string[] }>;
  collect(options: { recoverySensitive: boolean }): Promise<{ syncId: string; samples: Sample[]; deleted: Deletion[] }>;
  commit(options: { syncId: string }): Promise<void>;
  openSettings(): Promise<void>;
  disconnect(): Promise<void>;
  setRecoverySensitive(options: { on: boolean }): Promise<void>;
}

const CentiumHealth = registerPlugin<CentiumHealthPlugin>("CentiumHealth");

// Not in the generated types yet (Database DB-Z4 is newer than database.types.ts).
type Rpc = { rpc: (fn: string, args: object) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }> };
const rpc = (fn: string, args: object) => (supabase as unknown as Rpc).rpc(fn, args);
type IntegrationRow = { connected: boolean; last_synced_at: string | null; access_state: string | null };
type From = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, v: string) => { maybeSingle: () => PromiseLike<{ data: IntegrationRow | null; error: unknown }> };
    };
  };
};

const provider = (): "android_health" | "apple_health" => (platform() === "ios" ? "apple_health" : "android_health");

// Recovery-sensitive mode as the app knows it; null until known. No sync runs
// before it is known, so weight is never read for someone who has the mode on.
let recoverySensitive: boolean | null = null;
let lastAttemptAt: number | null = null;
let running: Promise<SyncResult> | null = null;
// Health Connect's sheet closing brings the app back ("resume") before the
// server has heard of the connection: no automatic sync until connect() ends.
let connecting = false;

/** One line for report_health_integration_sync: the call and its code, never health data. */
function report(accessState: "ok" | "access_off" | "error", lastSyncedAt: string | null, error?: string) {
  return rpc("report_health_integration_sync", {
    p_provider: provider(),
    p_last_synced_at: lastSyncedAt,
    p_access_state: accessState,
    p_error: error ?? null,
  }).then(
    ({ error: e }) => e && console.warn("[health] Couldn't report the sync:", e.message),
    () => undefined,
  );
}

function sync(): Promise<SyncResult> {
  return runSync<Sample, Deletion>({
    collect: () => CentiumHealth.collect({ recoverySensitive: recoverySensitive ?? true }),
    ingest: (batch) => rpc("ingest_health_samples", { p_source: provider(), p_samples: batch.samples, p_deleted: batch.deleted }),
    commit: (syncId) => CentiumHealth.commit({ syncId }),
    report,
    isOffline,
    // Not an attempt worth waiting 15 minutes after.
    notConnected: () => {
      lastAttemptAt = null;
    },
    now: () => new Date().toISOString(),
  });
}

export const health: HealthModule = {
  async available(): Promise<HealthAvailability> {
    const a = await featureAvailable("health");
    if (!a.ok) return { ok: false, reason: (a.reason as HealthAvailability["reason"]) ?? "unsupported" };
    return nativeFeatureOn("health_sync") ? { ok: true } : { ok: false };
  },

  provider,

  async status() {
    const [native, row] = await Promise.all([
      CentiumHealth.status().catch(() => ({ connected: false, granted: [] as HealthType[] })),
      (supabase as unknown as From)
        .from("health_integrations")
        .select("connected, last_synced_at, access_state")
        .eq("provider", provider())
        .maybeSingle()
        .then((r) => r.data, () => null),
    ]);
    const accessState = row?.access_state;
    return {
      connected: native.connected && !!row?.connected,
      granted: native.granted,
      lastSyncedAt: row?.last_synced_at ?? null,
      accessState: accessState === "ok" || accessState === "access_off" || accessState === "error" ? accessState : null,
    };
  },

  async connect({ recoverySensitive: on }) {
    recoverySensitive = on;
    connecting = true;
    try {
      await CentiumHealth.setRecoverySensitive({ on });
      const asked = await CentiumHealth.connect({ recoverySensitive: on });
      if (asked.granted.length > 0) {
        const { error } = await rpc("connect_health_integration", { p_provider: provider(), p_scopes_granted: asked.scopes });
        if (error) throw error;
      }
      return { granted: asked.granted, refused: asked.refused };
    } finally {
      connecting = false;
    }
  },

  /** Rejects nothing: a failure comes back as `error`. */
  syncNow() {
    if (!running) {
      lastAttemptAt = Date.now();
      running = sync().finally(() => {
        running = null;
      });
    }
    return running;
  },

  openSettings: () => CentiumHealth.openSettings(),

  async disconnect({ removeSyncedData }) {
    const { error } = await rpc("disconnect_health_integration", { p_provider: provider(), p_remove_synced: removeSyncedData });
    // Not connected on the server already is fine: the phone's side still goes.
    if (error && error.code !== "ATXZ1") throw error;
    await CentiumHealth.disconnect();
  },

  async setRecoverySensitive(on) {
    recoverySensitive = on;
    await CentiumHealth.setRecoverySensitive({ on });
  },
};

/**
 * The app opened or came back (D2): syncs if this account is connected, the
 * mode is known and the last attempt was 15 minutes ago or more. Nothing in a
 * browser. Never throws.
 */
export async function syncHealthIfDue(): Promise<void> {
  if (!isNative() || recoverySensitive === null || running || connecting || !autoSyncDue(lastAttemptAt, Date.now())) return;
  try {
    if (!(await health.available()).ok) return;
    if (!(await CentiumHealth.status()).connected) return;
    await health.syncNow();
  } catch (e) {
    console.warn("[health] Automatic sync skipped:", e);
  }
}

let listening = false;

/**
 * A signed-in, onboarded account whose recovery-sensitive setting is known
 * (AppContext): the phone learns the mode, then syncs now if due and on every
 * return to the app. Called again whenever the mode changes.
 */
export function startHealthSync(recoverySensitiveOn: boolean): void {
  if (!isNative()) return;
  if (!listening) {
    listening = true;
    void App.addListener("resume", () => void syncHealthIfDue());
  }
  const changed = recoverySensitive !== recoverySensitiveOn;
  recoverySensitive = recoverySensitiveOn;
  const ready = changed ? CentiumHealth.setRecoverySensitive({ on: recoverySensitiveOn }).catch(() => undefined) : Promise.resolve();
  void ready.then(() => syncHealthIfDue());
}

/** Signed out, or the setting not known yet: no automatic sync. */
export function stopHealthSync(): void {
  recoverySensitive = null;
  lastAttemptAt = null;
}

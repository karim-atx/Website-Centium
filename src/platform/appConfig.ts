// The app's remote config: the minimum and latest versions, the store link,
// a notice, and a kill switch per native feature (Database DB-Z1,
// app_config(p_platform, p_app_version)). Native only; the website never asks.
//
// FAIL OPEN. If the call fails, every feature counts as on and no update is
// forced (the Database's contract): a broken config must never lock people
// out of their own data.
//
// Asked at launch and again on resume, at most every five minutes, always as
// a POST (supabase.rpc's default), which is what counts the platform and
// version for the day. Signed out too.
import { App } from "@capacitor/app";
import { supabase } from "../../lib/supabase/client";
import { isNative, platform } from "./index";
import { FAIL_OPEN, parseAppConfig, type AppConfig, type NativeFeature } from "./appConfigModel";

export type { AppConfig, NativeFeature };

// Not in the generated types yet (Database DB-Z1 is newer than database.types.ts).
type Rpc = { rpc: (fn: string, args: object) => PromiseLike<{ data: unknown; error: { message: string } | null }> };

let current: AppConfig = FAIL_OPEN;
let lastAsked = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<(config: AppConfig) => void>();
const REFRESH_MS = 5 * 60 * 1000;

export function currentAppConfig(): AppConfig {
  return current;
}

export function onAppConfig(listener: (config: AppConfig) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether a native feature's entry point may show. On unless the server switched it off. */
export function nativeFeatureOn(feature: NativeFeature): boolean {
  return current.features[feature] !== false;
}

async function ask(): Promise<void> {
  const p = platform();
  if (p === "web") return;
  let version: string | null = null;
  try {
    version = (await App.getInfo()).version;
  } catch {
    // Without a version the server answers but can't place us; still fail open.
  }
  const { data, error } = await (supabase as unknown as Rpc).rpc("app_config", { p_platform: p, p_app_version: version });
  if (error) {
    console.warn("[app-config]", error.message);
    return;
  }
  current = parseAppConfig(data, version);
  for (const l of listeners) l(current);
}

function refresh(): void {
  if (inFlight || Date.now() - lastAsked < REFRESH_MS) return;
  lastAsked = Date.now();
  inFlight = ask()
    .catch((e: unknown) => console.warn("[app-config]", e))
    .finally(() => {
      inFlight = null;
    });
}

/** Called once from main.tsx. Does nothing in a browser. */
export function startAppConfig(): void {
  if (!isNative()) return;
  refresh();
  void App.addListener("resume", refresh);
}

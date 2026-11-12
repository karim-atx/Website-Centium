// Round J · J-2e: Health Connect's screens (website PLAN.md §2.1; App-Centium
// ROUND_J.md §2). Pure, so the states and their words are tested on their
// own; the screens read platform/health.ts and show what this says.
import type { HealthAvailability, HealthBackgroundState, HealthType } from "../../platform/contracts";
import { tk } from "../../i18n/core";

/** The phone's own health store: Health Connect on Android, Apple Health on iPhone (health.provider()). */
export type PhoneProvider = "android_health" | "apple_health";

/**
 * Batch C item 36 (Karim, 2026-11-11; App-Centium #30): the words that name
 * the phone's health store, and the iPhone's honest notes. HealthKit never
 * tells an app whether a read was refused, never reports access as off, and
 * an app can't withdraw its own access; Apple Health opens in the Health app.
 * Keys are literal (tk) so the catalogue holds both sets.
 */
export interface HealthCopy {
  name: string;
  connect: string;
  disconnectTitle: string;
  removedNote: string;
  removeDetail: string;
  backgroundOn: string;
  backgroundUnavailable: string;
  changeAccess: string;
  /** iPhone: what was asked can't be told from what was allowed, so no Allowed / Not allowed per type. */
  showsAccessPerType: boolean;
  /** iPhone: where access is changed, under the list. */
  accessHint: string | null;
  /** iPhone: in the Disconnect popup. */
  disconnectNote: string | null;
}

export function healthCopy(p: PhoneProvider): HealthCopy {
  return p === "apple_health"
    ? {
        name: "Apple Health",
        connect: tk("Connect Apple Health"),
        disconnectTitle: tk("Disconnect Apple Health?"),
        removedNote: tk("Disconnected. Apple Health's data was removed."),
        removeDetail: tk("Deletes everything Centium synced from Apple Health: steps, sleep, workouts, heart rate, weight and body fat. What you entered yourself stays."),
        backgroundOn: tk("About once an hour, while Centium is closed. iOS decides the exact time."),
        backgroundUnavailable: tk("This iPhone can't sync Apple Health in the background."),
        changeAccess: tk("Open Health"),
        showsAccessPerType: false,
        accessHint: tk("To change what Centium reads, open Health › your profile › Apps › Centium."),
        disconnectNote: tk("Centium stops reading. To remove its access too, open Health › your profile › Apps › Centium."),
      }
    : {
        name: "Health Connect",
        connect: tk("Connect Health Connect"),
        disconnectTitle: tk("Disconnect Health Connect?"),
        removedNote: tk("Disconnected. Health Connect's data was removed."),
        removeDetail: tk("Deletes everything Centium synced from Health Connect: steps, sleep, workouts, heart rate, weight and body fat. What you entered yourself stays."),
        backgroundOn: tk("About once an hour, while Centium is closed."),
        backgroundUnavailable: tk("This phone can't sync Health Connect in the background."),
        changeAccess: tk("Change access"),
        showsAccessPerType: true,
        accessHint: null,
        disconnectNote: null,
      };
}

/** Health Connect on Google Play, for "not installed" and "out of date". */
export const HEALTH_CONNECT_PLAY_URL = "https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata";

export type HealthStatus = {
  connected: boolean;
  granted: HealthType[];
  lastSyncedAt: string | null;
  accessState: "ok" | "access_off" | "error" | null;
};

/** What is read (Karim, D1): weight and body fat only while recovery-sensitive mode is off. */
export const HEALTH_TYPES: readonly HealthType[] = ["steps", "sleep", "exercise", "heart_rate", "weight", "body_fat"];
const RECOVERY_HIDDEN: readonly HealthType[] = ["weight", "body_fat"];

export const HEALTH_TYPE_LABEL: Record<HealthType, string> = {
  steps: tk("Steps"),
  sleep: tk("Sleep"),
  exercise: tk("Workouts"),
  heart_rate: tk("Heart rate and resting heart rate"),
  weight: tk("Weight"),
  body_fat: tk("Body fat"),
};

/** The types asked for: weight and body fat left out while the mode is on (or unknown). */
export function typesToRead(recoverySensitive: boolean): HealthType[] {
  return HEALTH_TYPES.filter((x) => !recoverySensitive || !RECOVERY_HIDDEN.includes(x));
}

/**
 * Where the Settings row and the screen stand. "unavailable" is the app
 * without the feature (or the switch off): the row stays as in a browser.
 */
export type HealthView =
  | { kind: "unavailable" }
  | { kind: "install"; update: boolean }
  | { kind: "not_connected" }
  | { kind: "connected"; lastSyncedAt: string | null; accessState: HealthStatus["accessState"] };

export function healthView(a: HealthAvailability | null, s: HealthStatus | null, p: PhoneProvider = "android_health"): HealthView | null {
  if (!a) return null;
  // Installing or updating is Health Connect's; Apple Health is always there (item 36).
  if (!a.ok) return p === "android_health" && (a.reason === "needs_install" || a.reason === "needs_update") ? { kind: "install", update: a.reason === "needs_update" } : { kind: "unavailable" };
  if (!s) return null;
  if (!s.connected) return { kind: "not_connected" };
  return { kind: "connected", lastSyncedAt: s.lastSyncedAt, accessState: s.accessState };
}

/** The Settings row's line (PLAN §2.1): a key and its time, if any. */
export function rowLine(v: HealthView): { key: string; time?: string } | null {
  switch (v.kind) {
    case "unavailable":
      return null;
    case "install":
      return { key: v.update ? tk("Health Connect needs an update") : tk("Health Connect isn't installed") };
    case "not_connected":
      return { key: tk("Not connected") };
    case "connected":
      if (v.accessState === "access_off") return { key: tk("Access is off") };
      if (v.accessState === "error") return { key: tk("Couldn't sync") };
      return v.lastSyncedAt ? { key: tk("Connected · synced {time}"), time: v.lastSyncedAt } : { key: tk("Connected") };
  }
}

/** syncNow()'s answer, in words (PLAN §2.1 "Errors in words"). */
export function syncResultKey(r: { saved: number; skipped: number; error?: "offline" | "server" | "access_off" }): { key: string; danger: boolean } {
  if (r.error === "offline") return { key: tk("You're offline. It syncs when you're back online."), danger: true };
  if (r.error === "access_off") return { key: tk("Access is off. Allow Centium in Health Connect to sync again."), danger: true };
  if (r.error === "server") return { key: tk("The server couldn't save this sync. Try again later."), danger: true };
  return { key: tk("Synced."), danger: false };
}

/** connect() threw: the words for it. ATXZ0: syncing is switched off on the server. */
export function connectErrorKey(e: unknown, offline: boolean, p: PhoneProvider = "android_health"): string {
  const code = (e as { code?: string } | null)?.code;
  const apple = p === "apple_health";
  if (code === "ATXZ0") return apple ? tk("Syncing from Apple Health is switched off right now. Try again later.") : tk("Syncing from Health Connect is switched off right now. Try again later.");
  if (offline) return tk("You're offline. Connect again when you're back online.");
  return apple ? tk("Couldn't connect to Apple Health. Try again.") : tk("Couldn't connect to Health Connect. Try again.");
}

/**
 * "Sync in the background" (Round K, App-Centium ROUND_K.md §2.4, D-EL4): the
 * switch as health.background() reports it, off by default. Not available on
 * this phone: shown, disabled, with the reason.
 */
export type BackgroundSwitch = { available: boolean; on: boolean };

/** The switch once setBackground() answered, and the line under it (null: none). */
export function backgroundAfter(state: HealthBackgroundState): {
  sw: BackgroundSwitch;
  note: { key: string; danger: boolean; settings: boolean } | null;
} {
  switch (state) {
    case "on":
      return { sw: { available: true, on: true }, note: null };
    case "off":
      return { sw: { available: true, on: false }, note: null };
    case "refused":
      return {
        sw: { available: true, on: false },
        note: { key: tk("Background access wasn't allowed. You can allow it in Health Connect's settings."), danger: true, settings: true },
      };
    case "unavailable":
      return { sw: { available: false, on: false }, note: null };
  }
}

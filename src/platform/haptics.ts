// FX: the phone's haptics for in-app moments (Batch C, items 23-30). The rules
// are in hapticsModel.ts; this wires them to @capacitor/haptics (App #31 ships
// the same 8.0.2 natively), CentiumNative.hapticsAllowed() and the page.
//
// Call sites (one each):
//   banner     PushBanner (a push while the app is open), MessagePopupToast
//              (a new pill; a same-thread follow-up doesn't buzz again)
//   celebrate  AchievementUnlockToast (streaks, badges, levels, goal days,
//              milestones), the workout PR burst, a business's approval, a
//              professional's first "You're live"
//   ring       CallSurface's incoming-call overlay
//   vibrate    the barcode / front-desk scanners and the EMOM beeper: their
//              web vibration as before, now behind the switch (item 27)
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNative } from "./index";
import { nativeHapticsAllowed } from "./nativeShell";
import { createHaptics, type HapticKind, type ImpactWeight } from "./hapticsModel";

export type { HapticKind } from "./hapticsModel";

// --- the "Vibration" switch (Settings › Notifications › On this phone) ------
//
// A preference of the DEVICE, not of the account: outside the `centium-state`
// prefix and with no account id, so sign-out keeps it (lib/supabase/
// tabIdentity.ts, accountStorageKeys). Default on: only "off" is stored.

export const VIBRATION_KEY = "centium.vibration";

/** Whether the Vibration switch is on (default on). */
export function vibrationOn(): boolean {
  try {
    return globalThis.localStorage?.getItem(VIBRATION_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setVibrationOn(on: boolean): void {
  try {
    if (on) globalThis.localStorage?.removeItem(VIBRATION_KEY);
    else globalThis.localStorage?.setItem(VIBRATION_KEY, "off");
  } catch {
    // Storage refused (a private window): the switch lasts this page only.
  }
  if (!on) stopRing();
}

const WEIGHT: Record<ImpactWeight, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};

const haptics = createHaptics({
  isNative,
  switchOn: vibrationOn,
  visible: () => typeof document !== "undefined" && document.visibilityState === "visible",
  hapticsAllowed: nativeHapticsAllowed,
  impact: (weight) => Haptics.impact({ style: WEIGHT[weight] }),
  success: () => Haptics.notification({ type: NotificationType.Success }),
  vibrate: (ms) => {
    navigator.vibrate?.(ms);
  },
  now: () => Date.now(),
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (id) => window.clearTimeout(id as number),
  onHidden: (fn) => {
    const listener = () => {
      if (document.visibilityState === "hidden") fn();
    };
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  },
});

/**
 * A banner's tap or an achievement's celebration, in the app only. `key`:
 * the moment's own id, so it plays once a session however often it renders.
 */
export function fxHaptic(kind: HapticKind, opts?: { key?: string }): void {
  void haptics.play(kind, opts);
}

/** The incoming-call ring, until stopRing() or the page goes hidden. */
export function startRing(): void {
  haptics.startRing();
}

export function stopRing(): void {
  haptics.stopRing();
}

/** A scanner's or the EMOM beeper's web vibration, when the Vibration switch is on. */
export function vibrateIfOn(ms: number): void {
  haptics.vibrate(ms);
}

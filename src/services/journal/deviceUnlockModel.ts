// Fingerprint (or face) unlock for locked journal folders: the screens'
// decisions, kept pure so they are tested without a phone (Round K, DB-Z8;
// App-Centium ROUND_K.md §3; the platform module is platform/biometrics.ts).
//
// THE PHONE NEVER DECIDES ON ITS OWN. Its key signs a one-time challenge after
// a strong fingerprint or face match; the server checks the signature against
// the public key it was given at registration and opens the same five-minute
// window as the password. Everything here only chooses what to show.

// The platform module's shapes (platform/biometrics.ts), restated so this
// stays pure: importing that module pulls in the native bridge.
export type BiometricKind = "fingerprint" | "face" | "biometric";
export type SignError = "cancelled" | "locked_out" | "key_invalidated" | "no_key" | "failed";
export interface BiometricAvailability {
  ok: boolean;
  kind?: BiometricKind;
  reason?: "not_native" | "no_hardware" | "none_enrolled" | "unsupported";
}
import type { UnlockPurpose } from "../../platform/biometricsModel";
import { describeLockError } from "./lockLogic";
import { t, tk } from "../../i18n/core";

/**
 * Where this phone stands:
 * - "off": not the app, the switch is off, or the phone can't (nothing shown);
 * - "enrol": the phone can, once a fingerprint or face is set up in its settings;
 * - "setup": it can, but this phone isn't registered (or its key is gone);
 * - "ready": a key on the phone, registered for this account.
 */
export type DeviceUnlockStatus = "off" | "enrol" | "setup" | "ready";

export function deviceUnlockStatus(avail: BiometricAvailability, hasKey: boolean, registered: boolean): DeviceUnlockStatus {
  if (!avail.ok) return avail.reason === "none_enrolled" ? "enrol" : "off";
  return hasKey && registered ? "ready" : "setup";
}

const UNLOCK_WITH: Record<BiometricKind, string> = {
  fingerprint: tk("Unlock with fingerprint"),
  face: tk("Unlock with face"),
  biometric: tk("Unlock with fingerprint or face"),
};
const REMOVE_WITH: Record<BiometricKind, string> = {
  fingerprint: tk("Remove with fingerprint"),
  face: tk("Remove with face"),
  biometric: tk("Remove with fingerprint or face"),
};
const TURN_ON: Record<BiometricKind, string> = {
  fingerprint: tk("Unlock locked folders with your fingerprint"),
  face: tk("Unlock locked folders with your face"),
  biometric: tk("Unlock locked folders with your fingerprint or face"),
};
const ENROL_FIRST: Record<BiometricKind, string> = {
  fingerprint: tk("Set up a fingerprint in your phone's settings first."),
  face: tk("Set up face unlock in your phone's settings first."),
  biometric: tk("Set up a fingerprint or face in your phone's settings first."),
};

/** The lock sheet's button: "Unlock with fingerprint", or "Remove with …" when removing the lock. */
export function deviceButtonLabel(kind: BiometricKind | undefined, purpose: UnlockPurpose): string {
  const k = kind ?? "biometric";
  return t(purpose === "remove" ? REMOVE_WITH[k] : UNLOCK_WITH[k]);
}

/** Settings' row that turns it on for this phone. */
export function turnOnLabel(kind: BiometricKind | undefined): string {
  return t(TURN_ON[kind ?? "biometric"]);
}

/** Settings' line while the phone has no fingerprint or face set up. */
export function enrolFirstLine(kind: BiometricKind | undefined): string {
  return t(ENROL_FIRST[kind ?? "biometric"]);
}

/** A failed fingerprint or face unlock: the line to show, and what to offer next. */
export interface DeviceFailure {
  /** The sentence, or null to stay quiet (the member cancelled). */
  line: string | null;
  /** Point to Settings to set this phone up (again). */
  setup: boolean;
  /** The key is gone: revoke it on the server so it stops being listed. */
  revoke: boolean;
}

export type DeviceOutcome = { ok: true; unlockedUntil: string | null } | ({ ok: false } & DeviceFailure);

/**
 * What a refused fingerprint prompt means. The password, or the emailed code,
 * always stays under the button, so every failure falls back to it.
 * "key_invalidated": a fingerprint was added to the phone and Android deleted
 * the key; the server copy is revoked and set-up offered again.
 */
export function signFailure(error: SignError): DeviceFailure {
  switch (error) {
    case "cancelled":
      return { line: null, setup: false, revoke: false };
    case "locked_out":
      return { line: t("Too many tries. Use your password or the emailed code."), setup: false, revoke: false };
    case "key_invalidated":
      return { line: t("Your fingerprints or face changed on this phone, so set up the unlock again."), setup: true, revoke: true };
    case "no_key":
      return { line: t("Unlock isn't set up on this phone yet."), setup: true, revoke: false };
    default:
      return { line: t("That didn't work. Use your password or the emailed code."), setup: false, revoke: false };
  }
}

/**
 * The Edge Function unlock-journal-folder-with-device's answer. 200 is the
 * password unlock's own row: success, or success = false with the server's
 * sentence ("This device could not be verified.", shown translated). The
 * other statuses are DB-Z8's: 401 unauthenticated, 403 switched_off, 404
 * no_such_folder, 429 too_many_attempts (the password's shared tries).
 */
export function edgeOutcome(
  status: number,
  body: { success?: boolean; message?: string; unlocked_until?: string | null } | null
): DeviceOutcome {
  if (status === 200 && body) {
    if (body.success) return { ok: true, unlockedUntil: body.unlocked_until ?? null };
    return { ok: false, line: body.message ? t(body.message) : describeLockError(undefined, undefined), setup: false, revoke: false };
  }
  const code = status === 401 ? "ATX01" : status === 403 ? "ATXB0" : status === 404 ? "ATX78" : status === 429 ? "ATX02" : undefined;
  return { ok: false, line: describeLockError(code, undefined), setup: false, revoke: false };
}

/**
 * The phone's name for the device list, from the WebView's user agent
 * ("…Android 14; Pixel 8 Build/…"), as register_device_key wants it: one line,
 * 1–80 characters. Chrome's reduced agent hides the model ("Android 10; K"),
 * so that, or anything unreadable, falls back to "Android phone" in the
 * app's language.
 */
export function phoneLabel(userAgent: string): string {
  const m = /Android [^;)]*;\s*([^;)]+?)(?:\s+Build\/[^;)]*)?[;)]/.exec(userAgent);
  const model = m?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  if (!model || model === "K" || /^wv$/i.test(model)) return t("Android phone");
  return model.slice(0, 80);
}

/**
 * The name to register: the phone's model from CentiumNative.deviceModel()
 * (Build.MODEL, never the owner's own name for the phone) when the app has
 * it, else the user agent's (phoneLabel). App builds before Round K lack the
 * call, so model is undefined there.
 */
export function phoneLabelFrom(model: string | undefined, userAgent: string): string {
  const clean = (model ?? "").replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, 80) : phoneLabel(userAgent);
}

// Batch D GD: the first journal lock's steps, kept pure so they are tested
// without a server or a phone (the sheet is components/mind/FirstJournalLock).
//
// THERE IS NO SEPARATE JOURNAL PASSWORD. Karim approved "create and confirm a
// password"; it is built on the ACCOUNT password, the one the server already
// checks for every unlock (unlock_journal_folder), so the person types it twice
// and the server checks it before the folder locks. An account without a
// password (Google- or Apple-only) confirms with the emailed code instead, as
// its unlock does.
//
// The steps:
//   protect: the password twice (or the emailed code), checked, then the lock;
//   explain: how a locked folder opens again;
//   device:  this phone's fingerprint or face, offered only where it can be set
//            up and isn't yet (the app; never a browser).

import type { BiometricKind, DeviceUnlockStatus } from "./deviceUnlockModel";
import type { UnlockMethod } from "./lockLogic";
import { t, tk } from "../../i18n/core";

export type FirstLockStep = "protect" | "explain" | "device";

/**
 * WHETHER THIS LOCK IS THE FIRST. Known on the device, with no server state:
 * the account has no folder locked now, and this device hasn't walked it
 * through the first lock since it signed in (`seen`, firstLockSeenKey). A
 * person who removes every lock and signs in again sees it once more, which
 * is harmless: it only explains, and the lock is the same.
 */
export function isFirstLock(lockedCount: number, seen: boolean): boolean {
  return lockedCount === 0 && !seen;
}

/**
 * The marker's localStorage key. It carries the account id, so sign-out
 * clears it with the rest of the account's data (lib/supabase/tabIdentity
 * accountStorageKeys), and another account on the device starts fresh.
 */
export function firstLockSeenKey(userId: string): string {
  return `centium-journal-first-lock-seen:${userId}`;
}

/** Whether this device has walked this account through its first lock. A refused storage reads as not yet. */
export function firstLockSeen(storage: Pick<Storage, "getItem"> | undefined, userId: string | null): boolean {
  if (!userId || !storage) return false;
  try {
    return storage.getItem(firstLockSeenKey(userId)) === "1";
  } catch {
    return false;
  }
}

/** Set once the first lock has gone through; a refused storage only means the steps may show again. */
export function markFirstLockSeen(storage: Pick<Storage, "setItem"> | undefined, userId: string | null): void {
  if (!userId || !storage) return;
  try {
    storage.setItem(firstLockSeenKey(userId), "1");
  } catch {
    // Nothing to do: see above.
  }
}

/** What is wrong with the two password fields, or null when they can go to the server. */
export type ConfirmProblem = "empty" | "confirm" | "mismatch";

export function confirmProblem(password: string, confirm: string): ConfirmProblem | null {
  if (!password) return "empty";
  if (!confirm) return "confirm";
  // Exact: a password is never trimmed or case-folded.
  if (password !== confirm) return "mismatch";
  return null;
}

const PROBLEM_LINE: Record<ConfirmProblem, string> = {
  empty: tk("Enter your password."),
  confirm: tk("Enter your password again to confirm it."),
  mismatch: tk("The passwords don't match."),
};

export function confirmProblemLine(problem: ConfirmProblem): string {
  return t(PROBLEM_LINE[problem]);
}

/** Step 3 only where the phone can set it up now and hasn't ("setup"); never "off", "enrol" or "ready". */
export function offerDeviceStep(status: DeviceUnlockStatus): boolean {
  return status === "setup";
}

/** The step after this one, or "done" when the sheet closes. */
export function nextFirstLockStep(step: FirstLockStep, offerDevice: boolean): FirstLockStep | "done" {
  if (step === "protect") return "explain";
  if (step === "explain") return offerDevice ? "device" : "done";
  return "done";
}

/** The explain step's lines, following what the lock really does (AppContext, JournalTab, the server). */
export function explainLines(method: UnlockMethod): string[] {
  return [
    method === "code"
      ? t("Its entries stay hidden until you unlock it with a code we email you.")
      : t("Its entries stay hidden until you unlock it with your account password."),
    t("Unlocking opens it for five minutes, then it locks again by itself."),
    t("Writing in it, deleting it or removing the lock asks again."),
  ];
}

const USE: Record<BiometricKind, string> = {
  fingerprint: tk("Use fingerprint"),
  face: tk("Use Face ID"),
  biometric: tk("Use fingerprint or face"),
};
const DEVICE_LINE: Record<BiometricKind, string> = {
  fingerprint: tk("Open locked folders with your fingerprint instead. Your password still works."),
  face: tk("Open locked folders with Face ID instead. Your password still works."),
  biometric: tk("Open locked folders with your fingerprint or face instead. Your password still works."),
};
const DEVICE_LINE_CODE: Record<BiometricKind, string> = {
  fingerprint: tk("Open locked folders with your fingerprint instead. The emailed code still works."),
  face: tk("Open locked folders with Face ID instead. The emailed code still works."),
  biometric: tk("Open locked folders with your fingerprint or face instead. The emailed code still works."),
};

/** Step 3's button, by what the phone has ("face" is an iPhone's Face ID). */
export function deviceUseLabel(kind: BiometricKind | undefined): string {
  return t(USE[kind ?? "biometric"]);
}

/** Step 3's line under the title. */
export function deviceStepLine(kind: BiometricKind | undefined, method: UnlockMethod): string {
  const k = kind ?? "biometric";
  return t(method === "code" ? DEVICE_LINE_CODE[k] : DEVICE_LINE[k]);
}

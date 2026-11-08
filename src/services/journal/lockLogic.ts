// The journal folder lock's client-side decisions (backend stage 3, Database
// docs/HANDOVER_API.md), kept pure so they are tested without a server.
//
// THE SERVER IS THE LOCK. A locked folder's entries are hidden and unwritable
// by a restrictive RLS policy until the owner opens a five-minute window with
// their account password; nothing here can extend or fake that window. What
// the client keeps is only what it was told: `unlocked_until` from a
// successful unlock, per folder. The screen treats a locked folder as open
// while that moment is still ahead, and re-locks itself when it passes.

import { rateLimitMessage } from "../network-error";
import { t } from "../../i18n/core";

/** Folder id → the ISO end of its unlock window, as unlock_journal_folder returned it. */
export type UnlockWindows = Record<string, string>;

/** Whether the folder's entries can be read and written right now. */
export function isFolderOpen(
  folder: { id: string; locked?: boolean } | undefined,
  windows: UnlockWindows,
  now: number
): boolean {
  if (!folder) return false;
  if (!folder.locked) return true;
  const until = windows[folder.id];
  return until !== undefined && Date.parse(until) > now;
}

/** The windows still open at `now` (a lapsed one is simply dropped). */
export function liveWindows(windows: UnlockWindows, now: number): UnlockWindows {
  const out: UnlockWindows = {};
  for (const [id, until] of Object.entries(windows)) {
    if (Date.parse(until) > now) out[id] = until;
  }
  return out;
}

/** Milliseconds until the next window closes, or null when none is open. */
export function msUntilNextExpiry(windows: UnlockWindows, now: number): number | null {
  let next: number | null = null;
  for (const until of Object.values(windows)) {
    const at = Date.parse(until);
    if (Number.isNaN(at)) continue;
    const ms = Math.max(0, at - now);
    if (next === null || ms < next) next = ms;
  }
  return next;
}

/**
 * The sentence for a failed lock call. ATX02 (rate limited): the server's
 * text names an internal action, so only its delay is read; a wrong password
 * never arrives here (it is `success = false`, whose message the caller shows
 * verbatim).
 */
export function describeLockError(code: string | undefined, message: string | undefined): string {
  switch (code) {
    case "ATX01":
      return t("Your session expired. Sign in again.");
    case "ATX02":
      return rateLimitMessage(message);
    case "ATX77":
      return t("This account signs in without a password, so there's no password to unlock this folder with.");
    case "ATX78":
      return t("This folder no longer exists.");
    // Round K (DB-Z8).
    case "ATXB0":
      return t("Fingerprint and face unlock is switched off right now. Use your password or the emailed code.");
    case "ATXB1":
      return t("For your security, sign in again, or confirm with your password or an emailed code.");
    case "ATXB2":
      return t("This account has a password. Use it to unlock.");
    default:
      return t("Couldn't reach Centium. Check your connection and try again.");
  }
}

/** How an account opens a locked folder: its password, or a code emailed to it (DB-Z8). */
export type UnlockMethod = "password" | "code";

/**
 * Round K (D-BK5): an account with a password uses it; one without (Google-
 * or Apple-only) uses the emailed code, but only once the Database has the
 * code calls. Without either, Lock isn't offered (null), because a folder it
 * locked could never be opened again.
 */
export function unlockMethodFor(hasPassword: boolean, codeUnlockReady: boolean): UnlockMethod | null {
  if (hasPassword) return "password";
  return codeUnlockReady ? "code" : null;
}

/** PostgREST's "function not found": a call the Database hasn't shipped yet. */
export function isMissingFunction(code: string | undefined): boolean {
  return code === "PGRST202" || code === "42883";
}

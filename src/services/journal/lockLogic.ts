// The journal folder lock's client-side decisions (backend stage 3, Database
// docs/HANDOVER_API.md), kept pure so they are tested without a server.
//
// THE SERVER IS THE LOCK. A locked folder's entries are hidden and unwritable
// by a restrictive RLS policy until the owner opens a five-minute window with
// their account password; nothing here can extend or fake that window. What
// the client keeps is only what it was told: `unlocked_until` from a
// successful unlock, per folder. The screen treats a locked folder as open
// while that moment is still ahead, and re-locks itself when it passes.

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
    const t = Date.parse(until);
    if (Number.isNaN(t)) continue;
    const ms = Math.max(0, t - now);
    if (next === null || ms < next) next = ms;
  }
  return next;
}

/**
 * The sentence for a failed lock call. ATX02 (rate limited) is written to be
 * shown as it is and names the delay, so it passes through; a wrong password
 * never arrives here (it is `success = false`, whose message the caller shows
 * verbatim).
 */
export function describeLockError(code: string | undefined, message: string | undefined): string {
  switch (code) {
    case "ATX01":
      return "Your session expired. Sign in again.";
    case "ATX02":
      return message || "Too many tries. Wait a few minutes and try again.";
    case "ATX77":
      return "This account signs in without a password, so there's no password to unlock this folder with.";
    case "ATX78":
      return "This folder no longer exists.";
    default:
      return "Couldn't reach Centium. Check your connection and try again.";
  }
}

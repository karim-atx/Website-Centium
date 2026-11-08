// What the website still decides about a Health Connect / Apple Health sync
// (App-Centium ROUND_J.md §2.4). The sync itself runs on the phone since
// Round K (ROUND_K.md D-EL3: HealthSyncModel.kt, with this file's former
// batching and reporting cases as its unit tests).

export type SyncResult = { saved: number; skipped: number; error?: "offline" | "server" | "access_off" };

/** How often opening or returning to the app syncs (D2). "Sync now" ignores it. */
export const AUTO_SYNC_EVERY_MS = 15 * 60 * 1000;

export function autoSyncDue(lastAttemptAt: number | null, now: number): boolean {
  return lastAttemptAt === null || now - lastAttemptAt >= AUTO_SYNC_EVERY_MS;
}

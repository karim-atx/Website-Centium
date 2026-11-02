import { t } from "../../i18n/core";

// Market + Share 3.0 · D-28, the client share locks, pure (shareLocks.test.ts).
//
// Body weight, body fat, biomarkers and average heart rate are OFF by default
// on every client card, and UNAVAILABLE (no switch, a lock line) in
// recovery-sensitive mode and for under-18s. In recovery mode the food-day
// card is unavailable and the Home streak entry is absent. Share to Community
// is hidden for under-18s (D-49), and for everyone until Community takes
// image posts.
//
// The age is the device's view (forumAccess: the date of birth on the
// profile). An account with no date of birth is treated as under 18 here:
// these are the most sensitive numbers in the app, so the lock fails closed
// (W1.md question).

export type SensitiveStat = "body_weight" | "body_fat" | "biomarkers" | "avg_heart_rate";

export const SENSITIVE_STATS: readonly SensitiveStat[] = ["body_weight", "body_fat", "biomarkers", "avg_heart_rate"];

export interface ShareLockInput {
  /** AppContext recoverySensitive || recoveryModePending (pending fails closed, as the app's other recovery gates do). */
  recovery: boolean;
  /** forumAccess(dateOfBirth): "adult" | "minor" | "unknown-age". */
  age: "adult" | "minor" | "unknown-age";
}

export interface ShareLocks {
  recovery: boolean;
  minor: boolean;
  /** The sensitive stats can't be switched on. */
  sensitiveLocked: boolean;
  /** The food-day card can't be made. */
  foodDayLocked: boolean;
  /** The Home streak share entry is absent. */
  streakHidden: boolean;
  /** Share to Community is never offered (D-49: also hidden for everyone until image posts exist). */
  communityHidden: boolean;
  /** The line under a locked stat, or null. */
  lockLine: string | null;
}

/** Whether Community takes image posts yet (D-49): not today. */
export const COMMUNITY_IMAGE_POSTS = false;

export function shareLocks({ recovery, age }: ShareLockInput): ShareLocks {
  const minor = age !== "adult";
  const sensitiveLocked = recovery || minor;
  return {
    recovery,
    minor,
    sensitiveLocked,
    foodDayLocked: recovery,
    streakHidden: recovery,
    communityHidden: minor || !COMMUNITY_IMAGE_POSTS,
    lockLine: !sensitiveLocked ? null : recovery ? t("Not shared while recovery-sensitive mode is on.") : t("Not available on cards for under-18s."),
  };
}

/** A stat's starting switch: sensitive stats always start off; the rest start on. */
export const statDefaultOn = (stat: string): boolean => !(SENSITIVE_STATS as readonly string[]).includes(stat);

/** Whether a stat may be switched on at all. */
export const statAllowed = (stat: string, locks: ShareLocks): boolean => !(locks.sensitiveLocked && (SENSITIVE_STATS as readonly string[]).includes(stat));

/** The stats that reach the card and the export: on, and allowed. Locks win over any saved switch. */
export function visibleStats<T extends { key: string }>(stats: readonly T[], on: ReadonlySet<string>, locks: ShareLocks): T[] {
  return stats.filter((s) => on.has(s.key) && statAllowed(s.key, locks));
}

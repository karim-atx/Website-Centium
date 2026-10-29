import type { PausedWorkoutSession } from "../../types";

/**
 * The device's paused workouts and the server's, merged (Round D O6).
 *
 * A session paused, or snapshotted set by set, while offline exists only on
 * the device. Replacing the device's copy with the server's (what hydrate
 * used to do) lost it. Per routine the newer copy wins: the later start, or
 * for the same start, more time logged. A device copy that wins (or that the
 * server lacks) is listed in `pushUp`, to be saved back. A routine the server
 * no longer has is kept only if the device copy is newer than nothing, i.e.
 * always: finishing or quitting clears both copies, so a server miss means
 * it never arrived.
 */
export function mergePausedSessions(
  local: Readonly<Record<string, PausedWorkoutSession>>,
  remote: Readonly<Record<string, PausedWorkoutSession>>
): { merged: Record<string, PausedWorkoutSession>; pushUp: string[] } {
  const merged: Record<string, PausedWorkoutSession> = { ...remote };
  const pushUp: string[] = [];
  for (const [routineId, mine] of Object.entries(local)) {
    const theirs = remote[routineId];
    if (!theirs || isNewer(mine, theirs)) {
      merged[routineId] = mine;
      pushUp.push(routineId);
    }
  }
  return { merged, pushUp };
}

function isNewer(a: PausedWorkoutSession, b: PausedWorkoutSession): boolean {
  const ta = Date.parse(a.startedAt);
  const tb = Date.parse(b.startedAt);
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta > tb;
  return a.elapsedSec > b.elapsedSec;
}

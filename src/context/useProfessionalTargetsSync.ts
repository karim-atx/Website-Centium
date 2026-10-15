// Release 3 · W7 (CU3): the targets a professional set, synced into the
// device goal from AppContext, so Home, the diary hero and every ring follow
// them without the client opening Food first.

import { useEffect, useState } from "react";
import { fetchProfessionalTargets } from "../services/nutrition/client";
import { showsTargets, withProfessionalTargets, type ProfessionalTargets } from "../services/nutrition/clientNutritionModel";
import type { NutritionGoal } from "../types";

/** The device's record of which professional-set goal row it already applied (unlocked targets apply once). */
const appliedKey = (uid: string) => `centium-food:pro-targets-applied:${uid}`;
const readApplied = (uid: string): string | null => {
  try {
    return localStorage.getItem(appliedKey(uid));
  } catch {
    return null;
  }
};
const writeApplied = (uid: string, goalId: string) => {
  try {
    localStorage.setItem(appliedKey(uid), goalId);
  } catch {
    /* storage unavailable: the targets apply again next time, which is harmless */
  }
};

/**
 * CU3: the targets a professional set, read from the client's own current
 * nutrition_goals row (set_by_professional_id, locked) and
 * nutrition_targets_locked(me).
 *
 * WHY THE PANEL SHOWED 2,000 KCAL. The client's goal lives on the device
 * (AppContext usePersistentState "nutritionGoal", seeded with the 2,000 kcal
 * reference intake) and the app never read nutrition_goals, so a target the
 * dietitian set with set_client_nutrition_targets could not reach it. This
 * brings it in through the same setter the Goals panel uses:
 * - locked: the device goal is kept equal to the professional's targets as an
 *   Existing plan (re-applied whenever it drifts), and Food's Goals panel
 *   locks its controls;
 * - unlocked: applied once per goal row, after which the client may change it.
 *
 * `userId` is null for anyone who isn't a signed-in customer: nothing is read.
 */
export function useProfessionalTargetsSync(
  userId: string | null,
  nutritionGoal: NutritionGoal,
  setNutritionGoal: (goal: NutritionGoal) => void
): ProfessionalTargets | null {
  const [targets, setTargets] = useState<ProfessionalTargets | null>(null);

  useEffect(() => {
    setTargets(null);
    if (!userId) return;
    let live = true;
    void fetchProfessionalTargets(userId).then((r) => {
      // A failed read keeps whatever the device has (offline, the last applied targets).
      if (live && r.ok) setTargets(r.data);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !targets) return;
    if (showsTargets(nutritionGoal, targets)) {
      if (readApplied(userId) !== targets.goalId) writeApplied(userId, targets.goalId);
      return;
    }
    if (!targets.locked && readApplied(userId) === targets.goalId) return;
    setNutritionGoal(withProfessionalTargets(nutritionGoal, targets));
    writeApplied(userId, targets.goalId);
    // Idempotent: an unlocked row applied once returns above, so the client's
    // own later edits stay; a locked goal that drifted is put back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, targets, nutritionGoal]);

  return targets;
}

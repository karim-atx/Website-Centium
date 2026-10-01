import { useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { useHealthChecks } from "../../context/healthChecksStore";
import { bloodPressureFlag, labFlag, type Flag } from "../../services/health-checks/flags";
import type { BloodMarker } from "../../types";

/**
 * Flags for the signed-in user's OWN readings, worked out on the device each
 * render, and null for everything while the mode is not on. Only the user's
 * own BP and lab screens call this; no professional screen does.
 */
export function useCheckFlags() {
  const { user } = useApp();
  const { active, phase } = useHealthChecks();
  const bp = useCallback(
    (r: { systolic: number; diastolic: number }): Flag | null => (active ? bloodPressureFlag(r) : null),
    [active]
  );
  const lab = useCallback(
    (m: BloodMarker): Flag | null => (active ? labFlag(m, { sex: user.sex, phase }) : null),
    [active, user.sex, phase]
  );
  return { active, bp, lab };
}

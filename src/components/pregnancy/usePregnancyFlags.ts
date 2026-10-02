import { useCallback } from "react";
import { useApp } from "../../context/AppContext";
import {
  haemoglobinGdl,
  pregnancyBloodPressureFlag,
  pregnancyHaemoglobinFlag,
  type PregnancyFlag,
} from "../../services/pregnancy/checks";
import type { BloodMarker } from "../../types";
import { todayLocal } from "../../utils/date";

/**
 * The pregnancy flags for the user's OWN readings (Task Y), worked out on the
 * device each render:
 * - blood pressure while a pregnancy is active, which REPLACES the general
 *   bands (`replacesBpBands`): the category labels, counts, chart bands and
 *   severe-reading alert step aside for the pregnancy levels;
 * - haemoglobin while a pregnancy is active, and for results taken in the 12
 *   weeks after a birth while that window is still open.
 * When neither applies, everything returns null and the screens are as before.
 */
export function usePregnancyFlags() {
  const { pregnancy, lastEndedPregnancy } = useApp();
  const today = todayLocal();
  const pregnant = pregnancy !== null;
  const lmpDate = pregnancy?.lmpDate ?? null;
  const dueDate = pregnancy?.dueDate ?? null;
  const birth = !pregnant && lastEndedPregnancy?.outcome === "birth" ? lastEndedPregnancy : null;
  const endedOn = birth?.endedOn ?? null;
  const until = birth?.postpartumUntil && birth.postpartumUntil >= today ? birth.postpartumUntil : null;
  const afterBirth = endedOn !== null && until !== null;

  const bp = useCallback(
    (r: { systolic: number; diastolic: number }): PregnancyFlag | null =>
      pregnant ? pregnancyBloodPressureFlag(r.systolic, r.diastolic) : null,
    [pregnant]
  );

  const lab = useCallback(
    (m: BloodMarker): PregnancyFlag | null => {
      if (m.markerKey !== "haemoglobin" || (!pregnant && !afterBirth)) return null;
      const on = m.history[m.history.length - 1]?.date;
      const gdl = haemoglobinGdl(m.value, m.unit);
      if (!on || gdl === null) return null;
      return pregnancyHaemoglobinFlag(gdl, on, {
        active: pregnant ? { lmpDate, dueDate } : null,
        afterBirth: afterBirth ? { endedOn: endedOn as string, until: until as string } : null,
      });
    },
    [pregnant, lmpDate, dueDate, afterBirth, endedOn, until]
  );

  return { replacesBpBands: pregnant, bp, lab };
}

import { useApp } from "../context/AppContext";

/**
 * Recovery-sensitive mode, as one question every screen asks (Round D, AJ):
 * should numbers that the mode hides (calories, macros, weight, body
 * measurements, BMI, streaks) be kept out of view right now?
 *
 * TRUE WHILE THE SETTING IS STILL UNKNOWN ("pending"), so a number never
 * flashes for someone who has the mode on. That is the rule the Home and
 * Weight screens already follow; this hook is the same rule in one place.
 *
 * Only for the person's OWN screens. Professionals are never told whether a
 * client has the mode on, and their views never change because of it.
 */
export function useHideNumbers(): boolean {
  const { recoverySensitive, recoveryModePending } = useApp();
  return recoverySensitive || recoveryModePending;
}

/** The neutral line shown where a section is hidden in recovery-sensitive mode. */
export const RECOVERY_HIDDEN_LINE = "Hidden in recovery-sensitive mode. You can change this in Profile.";

// Handover 2026-09-29 WO16: which colour a measurement's chart and change
// summary take, and the change summary itself. Pure, so it is tested without
// a database.
//
// THE COLOUR FOLLOWS THE GOAL (03 "WO16"): green toward it, red against it,
// blue on a plateau, with no goal, or with a single reading. A plateau is a
// change within ±0.5 (cm, or % for body fat) over the last 3 readings, and
// "toward" and "against" are read over that same window, so the colour always
// describes the recent trend the summary's "since last" is part of.
//
// MAINTAIN is green on a plateau (holding steady is the goal) and red off one.
// The handover lists blue for "plateau" without separating Maintain; reading
// that literally would make Maintain unable to ever be green.

/** No row means no goal (the database has no "none" value). */
export type MeasurementGoal = "decrease" | "increase" | "maintain";

export const GOAL_LABEL: Record<MeasurementGoal | "none", string> = {
  decrease: "Decrease",
  increase: "Increase",
  maintain: "Maintain",
  none: "No goal",
};

/** 02 "Goal colours (WO16)". */
export const GOAL_COLOR = {
  toward: "#3F9165",
  against: "#C45A4E",
  neutral: "#4C8FD1",
} as const;

export type GoalTone = keyof typeof GOAL_COLOR;

export const PLATEAU = 0.5;
const WINDOW = 3;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** `values` oldest first. */
export function goalTone(values: number[], goal: MeasurementGoal | null): GoalTone {
  if (values.length < 2 || !goal) return "neutral";
  const recent = values.slice(-WINDOW);
  const change = round1(recent[recent.length - 1] - recent[0]);
  const flat = Math.abs(change) <= PLATEAU;
  if (goal === "maintain") return flat ? "toward" : "against";
  if (flat) return "neutral";
  return (change < 0) === (goal === "decrease") ? "toward" : "against";
}

/** "↓ 1.8 cm" / "↑ 0.6 cm" / "0 cm". */
export function changeText(delta: number, unit: string): string {
  const d = round1(delta);
  const arrow = d < 0 ? "↓ " : d > 0 ? "↑ " : "";
  return `${arrow}${Math.abs(d)} ${unit}`;
}

/**
 * "↓ 1.8 cm since Aug 16 · ↓ 1.2 cm since last". Null with fewer than two
 * readings: there is nothing to have changed from. `readings` oldest first.
 */
export function changeSummary(
  readings: { value: number; label: string }[],
  unit: string
): string | null {
  if (readings.length < 2) return null;
  const last = readings[readings.length - 1].value;
  const first = readings[0];
  const prev = readings[readings.length - 2].value;
  return `${changeText(last - first.value, unit)} since ${first.label} · ${changeText(last - prev, unit)} since last`;
}

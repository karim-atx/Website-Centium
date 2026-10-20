// Release 3 · W9 MO11 Consent and data sharing: the drawn switches over
// practice_settings.default_data_requests (access_category[]). A switch
// covering several categories is on when any of them is asked, and turning it
// on or off adds or removes all of them. Categories no switch covers are kept
// as they are. Pure (no service import, so node:test can load it); the
// category names are services/pro/practice AccessCategory values.

export const CONSENT_SWITCHES = [
  { key: "workouts", title: "Workouts", sub: "Needed for programmes", cats: ["workout_activity"] },
  { key: "food", title: "Food diary", sub: "Needed for meal plans", cats: ["food_diary"] },
  { key: "body", title: "Weight and body measurements", sub: "", cats: ["weight", "body_measurements"] },
  { key: "vitals", title: "Vitals and lab results", sub: "Optional", cats: ["health_metrics", "blood_pressure", "lab_results"] },
] as const;

export type ConsentSwitch = (typeof CONSENT_SWITCHES)[number]["key"];
type SwitchCat = (typeof CONSENT_SWITCHES)[number]["cats"][number];

const catsOf = (key: ConsentSwitch): readonly SwitchCat[] => CONSENT_SWITCHES.find((s) => s.key === key)?.cats ?? [];

export function switchOn(asked: readonly string[], key: ConsentSwitch): boolean {
  return catsOf(key).some((c) => asked.includes(c));
}

export function withSwitch<C extends string>(asked: readonly C[], key: ConsentSwitch, on: boolean): C[] {
  const mine = catsOf(key) as readonly string[];
  const rest = asked.filter((c) => !mine.includes(c));
  return on ? [...rest, ...(mine as C[])] : rest;
}

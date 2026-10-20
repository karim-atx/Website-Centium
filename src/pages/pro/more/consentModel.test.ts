import { strict as assert } from "node:assert";
import { test } from "node:test";
import { CONSENT_SWITCHES, switchOn, withSwitch } from "./consentModel";

test("MO11: the drawn order and wording", () => {
  assert.deepEqual(
    CONSENT_SWITCHES.map((s) => s.title),
    ["Workouts", "Food diary", "Weight and body measurements", "Vitals and lab results"]
  );
});

test("MO11: a switch is on when any of its categories is asked", () => {
  assert.equal(switchOn(["weight"], "body"), true);
  assert.equal(switchOn(["lab_results"], "vitals"), true);
  assert.equal(switchOn(["food_diary"], "workouts"), false);
});

test("MO11: turning a switch on or off keeps categories it doesn't cover", () => {
  assert.deepEqual(withSwitch(["medical_history", "weight"], "body", true), ["medical_history", "weight", "body_measurements"]);
  assert.deepEqual(withSwitch(["medical_history", "weight", "body_measurements", "habits"], "body", false), ["medical_history", "habits"]);
  assert.deepEqual(withSwitch(["allergies_dietary"], "vitals", true), ["allergies_dietary", "health_metrics", "blood_pressure", "lab_results"]);
  assert.deepEqual(withSwitch([], "workouts", false), []);
});

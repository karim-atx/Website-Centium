import { strict as assert } from "node:assert";
import { test } from "node:test";
import { contraceptionSwitch } from "./healthNotificationModel";

const OFF = { pillReminder: false, methodReminders: false };

test("a pill plan mirrors pill_reminder and writes only it", () => {
  const s = contraceptionSwitch("pill_combined", { pillReminder: true, methodReminders: false });
  assert.equal(s.shown, true);
  assert.equal(s.checked, true);
  assert.deepEqual(s.patch(false), { pillReminder: false });
  assert.equal(contraceptionSwitch("pill_progestin", { pillReminder: false, methodReminders: true }).checked, false);
});

test("a ring, patch, injection or device mirrors method_reminders and writes only it", () => {
  for (const m of ["ring", "patch", "injection", "implant", "iud_hormonal", "iud_copper"] as const) {
    const s = contraceptionSwitch(m, { pillReminder: true, methodReminders: false });
    assert.equal(s.shown, true, m);
    assert.equal(s.checked, false, m);
    assert.deepEqual(s.patch(true), { methodReminders: true }, m);
  }
});

test("a method with nothing to remind about has no row", () => {
  for (const m of ["condom", "other", "none"] as const) {
    const s = contraceptionSwitch(m, { pillReminder: true, methodReminders: true });
    assert.equal(s.shown, false, m);
    assert.deepEqual(s.patch(true), {}, m);
  }
});

test("no plan yet stands for both switches", () => {
  const s = contraceptionSwitch(null, OFF);
  assert.equal(s.shown, true);
  assert.equal(s.checked, false);
  assert.deepEqual(s.patch(true), { pillReminder: true, methodReminders: true });
  assert.equal(contraceptionSwitch(null, { pillReminder: false, methodReminders: true }).checked, true);
  assert.equal(contraceptionSwitch(null, null).checked, false);
});

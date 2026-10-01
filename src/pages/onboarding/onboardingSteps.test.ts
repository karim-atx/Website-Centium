import { strict as assert } from "node:assert";
import { test } from "node:test";
import { dateOfBirthComplete, resumeIndex, stepsFor } from "./onboardingSteps";

const dob = "1990-05-01";
const pro = { accountType: "professional" as const, professionalSubtype: "trainer", businessType: null, businessName: "", dateOfBirth: dob };
const biz = { accountType: "business" as const, professionalSubtype: null, businessType: "gym", businessName: "Iron Peak", dateOfBirth: dob };
const customer = { accountType: "customer" as const, professionalSubtype: null, businessType: null, businessName: "", dateOfBirth: dob };
const at = (d: Parameters<typeof resumeIndex>[1], stored: string | null) => stepsFor(d.accountType, false)[resumeIndex(stored, d, false)];

test("the subtype step follows the account type for professionals and businesses, not customers", () => {
  assert.deepEqual(stepsFor("professional", false).slice(2, 5), ["accountType", "subtype", "aboutYou"]);
  assert.deepEqual(stepsFor("business", false).slice(2, 6), ["accountType", "subtype", "dateOfBirth", "ready"]);
  assert.ok(!stepsFor("customer", false).includes("subtype"));
});

test("every account type is asked for a date of birth exactly once", () => {
  for (const t of ["customer", "professional", "business"] as const) {
    const steps = stepsFor(t, false);
    assert.equal(steps.filter((k) => k === "aboutYou" || k === "dateOfBirth").length, 1, t);
  }
});

test("never resumes past a missing or under-16 date of birth", () => {
  assert.equal(at({ ...customer, dateOfBirth: "" }, "goal"), "aboutYou");
  assert.equal(at({ ...pro, dateOfBirth: "" }, "ready"), "aboutYou");
  assert.equal(at({ ...biz, dateOfBirth: "" }, "ready"), "dateOfBirth");
  const tooYoung = new Date(Date.now() - 10 * 365 * 86400000).toISOString().slice(0, 10);
  assert.equal(dateOfBirthComplete({ dateOfBirth: tooYoung }), false);
  assert.equal(dateOfBirthComplete({ dateOfBirth: dob }), true);
});

test("a draft saved by name resumes on that step", () => {
  assert.equal(at(pro, "aboutYou"), "aboutYou");
  assert.equal(at(pro, "subtype"), "subtype");
  assert.equal(at(customer, "goal"), "goal");
});

test("an old draft saved by position resumes on the same step it was on", () => {
  // Old professional list: welcome, auth, accountType, aboutYou, background, ready.
  assert.equal(at(pro, "3"), "aboutYou");
  assert.equal(at(pro, "4"), "background");
  assert.equal(at(pro, "2"), "accountType");
  // Old business list: welcome, auth, accountType, ready.
  assert.equal(at(biz, "3"), "ready");
  // Customers had no subtype step, so positions are unchanged.
  assert.equal(at(customer, "4"), "recovery");
});

test("never resumes past a missing specialty or business type", () => {
  assert.equal(at({ ...pro, professionalSubtype: null }, "aboutYou"), "subtype");
  assert.equal(at({ ...biz, businessName: " " }, "3"), "subtype");
});

test("a step this account type does not have goes back to choosing the account type", () => {
  assert.equal(at(customer, "subtype"), "accountType");
});

test("nothing saved, or nonsense, starts at the beginning", () => {
  assert.equal(at(customer, null), "welcome");
  assert.equal(at(customer, "banana"), "welcome");
  assert.equal(at(customer, "-1"), "welcome");
});

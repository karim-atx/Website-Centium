import { strict as assert } from "node:assert";
import { test } from "node:test";
import { dateOfBirthComplete, laneOf, resumeIndex, stepsFor } from "./onboardingSteps";

const dob = "1990-05-01";
const pro = { accountType: "professional" as const, professionalSubtype: "trainer", businessType: null, businessName: "", dateOfBirth: dob };
const biz = { accountType: "business" as const, professionalSubtype: null, businessType: "gym", businessName: "Iron Peak", dateOfBirth: dob };
const customer = { accountType: "customer" as const, professionalSubtype: null, businessType: null, businessName: "", dateOfBirth: dob };
const at = (d: Parameters<typeof resumeIndex>[1], stored: string | null) => stepsFor(d.accountType, false)[resumeIndex(stored, d, false)];

test("the client lane is About you, A gentler start, Goals and activity, What to track, then You're all set", () => {
  assert.deepEqual(stepsFor("customer", false), ["welcome", "auth", "accountType", "about", "gentle", "goals", "track", "ready"]);
  assert.deepEqual(stepsFor(null, false).slice(3), ["about", "gentle", "goals", "track", "ready"]);
});

test("the subtype step follows the account type for professionals and businesses, not customers", () => {
  assert.deepEqual(stepsFor("professional", false).slice(2, 5), ["accountType", "subtype", "proAbout"]);
  assert.deepEqual(stepsFor("business", false).slice(2, 4), ["accountType", "bizType"]);
  assert.ok(!stepsFor("customer", false).includes("subtype"));
});

test("the business lane is the type, then six numbered steps", () => {
  assert.deepEqual(stepsFor("business", false).slice(3), ["bizType", "bizBusiness", "bizWhere", "bizEssentials", "bizPolicies", "bizPayments", "bizReview"]);
});

test("a business draft saved before v6 resumes on the step that replaced its own", () => {
  assert.equal(at(biz, "subtype"), "bizType");
  assert.equal(at(biz, "dateOfBirth"), "bizPolicies");
  assert.equal(at(biz, "ready"), "bizReview");
  assert.equal(at(biz, "bizWhere"), "bizWhere");
});

test("a business never resumes past Your business without a name, or past its type without one", () => {
  assert.equal(at({ ...biz, businessName: "" }, "bizEssentials"), "bizBusiness");
  assert.equal(at({ ...biz, businessType: null }, "bizWhere"), "bizType");
});

test("every account type is asked for a date of birth exactly once", () => {
  for (const t of ["customer", "professional", "business"] as const) {
    const steps = stepsFor(t, false);
    assert.equal(steps.filter((k) => k === "about" || k === "aboutYou" || k === "proAbout" || k === "bizPolicies").length, 1, t);
  }
});

test("never resumes past a missing or under-16 date of birth", () => {
  assert.equal(at({ ...customer, dateOfBirth: "" }, "goals"), "about");
  assert.equal(at({ ...pro, dateOfBirth: "" }, "ready"), "proAbout");
  assert.equal(at({ ...pro, dateOfBirth: "" }, "proReview"), "proAbout");
  assert.equal(at({ ...biz, dateOfBirth: "" }, "ready"), "bizPolicies");
  assert.equal(at({ ...biz, dateOfBirth: "" }, "bizReview"), "bizPolicies");
  const tooYoung = new Date(Date.now() - 10 * 365 * 86400000).toISOString().slice(0, 10);
  assert.equal(dateOfBirthComplete({ dateOfBirth: tooYoung }), false);
  assert.equal(dateOfBirthComplete({ dateOfBirth: dob }), true);
});

test("a draft saved by name resumes on that step", () => {
  assert.equal(at(pro, "proAbout"), "proAbout");
  assert.equal(at(pro, "proCreds"), "proCreds");
  assert.equal(at(pro, "subtype"), "subtype");
  assert.equal(at(customer, "goals"), "goals");
  assert.equal(at(customer, "track"), "track");
});

test("the professional lane is the specialty, then six numbered steps", () => {
  assert.deepEqual(stepsFor("professional", false).slice(3), ["subtype", "proAbout", "proWork", "proServices", "proCreds", "background", "proReview"]);
});

test("a professional draft saved before v6 resumes on the step that replaced its own", () => {
  assert.equal(at(pro, "aboutYou"), "proAbout");
  assert.equal(at(pro, "background"), "background");
  assert.equal(at(pro, "ready"), "proReview");
  assert.equal(laneOf("professional"), "professional");
});

test("a client draft saved before v6 resumes on the step that replaced its own", () => {
  assert.equal(at(customer, "aboutYou"), "about");
  assert.equal(at(customer, "recovery"), "gentle");
  assert.equal(at(customer, "goal"), "goals");
  assert.equal(at(customer, "activity"), "goals");
  assert.equal(at(customer, "tracking"), "track");
});

test("an old draft saved by position resumes on the same step it was on", () => {
  // Old professional list: welcome, auth, accountType, aboutYou, background, ready.
  assert.equal(at(pro, "3"), "proAbout");
  assert.equal(at(pro, "4"), "background");
  assert.equal(at(pro, "5"), "proReview");
  assert.equal(at(pro, "2"), "accountType");
  // Old business list: welcome, auth, accountType, ready.
  assert.equal(at(biz, "3"), "bizReview");
  // Old customer list: welcome, auth, accountType, aboutYou, recovery, goal, activity, tracking, ready.
  assert.equal(at(customer, "4"), "gentle");
  assert.equal(at(customer, "6"), "goals");
  assert.equal(at(customer, "7"), "track");
});

test("never resumes past a missing specialty or business type", () => {
  assert.equal(at({ ...pro, professionalSubtype: null }, "aboutYou"), "subtype");
  assert.equal(at({ ...pro, professionalSubtype: null }, "proWork"), "subtype");
  assert.equal(at({ ...biz, businessType: null }, "3"), "bizType");
  assert.equal(at({ ...biz, businessName: " " }, "3"), "bizBusiness");
});

test("a step this account type does not have goes back to choosing the account type", () => {
  assert.equal(at(customer, "subtype"), "accountType");
  assert.equal(at(pro, "gentle"), "accountType");
});

test("nothing saved, or nonsense, starts at the beginning", () => {
  assert.equal(at(customer, null), "welcome");
  assert.equal(at(customer, "banana"), "welcome");
  assert.equal(at(customer, "-1"), "welcome");
});

test("each account type drafts into its own lane", () => {
  assert.equal(laneOf("customer"), "client");
  assert.equal(laneOf("professional"), "professional");
  assert.equal(laneOf("business"), "business");
  assert.equal(laneOf(null), null);
});

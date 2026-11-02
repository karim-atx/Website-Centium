import { test } from "node:test";
import assert from "node:assert/strict";
import { noCreditKind, offerCredit, offerUsesClassCredit, offerUsesCredit, parseClassCredits, parseHiringCredits, parseProPlanInApp, premiumCodeMessage, proPlanBoughtLine, proPlanPath } from "./model.ts";
import { CLASS_CREDIT_PRICES, HIRING_CREDIT_PRICES, classCreditPricesText } from "./features.ts";
import { HIRING_ERROR_TEXT, creditRefusalFor, hiringErrorOf } from "../hiring/model.ts";

// Round G5 · class credits for class-slot hires and professional plans bought
// in the Centium app. The one rule: with business_plans_enforced off for the
// caller, loading, or a database without G5 (null), everything is today's.

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
const HIRING_ON = parseHiringCredits([{ credits_on: true, free: 2, packs: [] }]);
const CLASS_ON = parseClassCredits([{ credits_on: true, free: 7, packs: [{ quantity: 10, used: 3, remaining: 7, starts_at: "2026-11-01T00:00:00Z", ends_at: "2027-11-01T00:00:00Z" }] }]);
const CLASS_OFF = parseClassCredits([{ credits_on: false, free: 0, packs: [] }]);

test("my_class_credits parses like my_hiring_credits: credits_on, free and the packs", () => {
  assert.deepEqual(Object.keys(CLASS_ON).sort(), ["creditsOn", "free", "packs"]);
  assert.equal(CLASS_ON.creditsOn, true);
  assert.equal(CLASS_ON.free, 7);
  assert.deepEqual(CLASS_ON.packs[0], { quantity: 10, used: 3, remaining: 7, startsAt: "2026-11-01T00:00:00Z", endsAt: "2027-11-01T00:00:00Z" });
  // An empty answer (no row) is off.
  assert.equal(parseClassCredits([]).creditsOn, false);
  assert.equal(parseClassCredits(null).creditsOn, false);
});

test("off means today: no class credit without credits_on, loading or no G5", () => {
  for (const cls of [null, undefined, CLASS_OFF]) {
    assert.equal(offerUsesClassCredit("class_slot", cls), false);
    // A class-slot offer shows today's percentage fee.
    assert.equal(offerCredit("class_slot", HIRING_ON, cls), null);
  }
  // Nothing on at all: both kinds pay today's fee.
  assert.equal(offerCredit("role", null, null), null);
  assert.equal(offerCredit("class_slot", null, null), null);
});

test("which offer kind shows which credit: role a hiring credit, class slot a class credit, never the other", () => {
  assert.equal(offerCredit("role", HIRING_ON, CLASS_ON), "hiring");
  assert.equal(offerCredit("class_slot", HIRING_ON, CLASS_ON), "class");
  // A role offer never uses a class credit, even with hiring credits off.
  assert.equal(offerCredit("role", null, CLASS_ON), null);
  assert.equal(offerUsesClassCredit("role", CLASS_ON), false);
  // A class-slot offer never uses a hiring credit, even with class credits off.
  assert.equal(offerCredit("class_slot", HIRING_ON, null), null);
  assert.equal(offerUsesCredit("class_slot", HIRING_ON), false);
});

test("class credit prices come from one constant ($3 for 1, $25 for 10, 12 months), formatted in the app's language", () => {
  assert.deepEqual({ ...CLASS_CREDIT_PRICES }, { one: 3, ten: 25, validMonths: 12 });
  assert.equal(classCreditPricesText(), `${usd(3)} for 1 class credit, ${usd(25)} for 10, valid for 12 months`);
  // G1's hiring credit prices are untouched.
  assert.deepEqual({ ...HIRING_CREDIT_PRICES }, { one: 39, three: 99 });
});

test("ATXQ4 splits by the offer kind, else by the message: class credit or hiring credit", () => {
  const cls = { code: "ATXQ4", message: "ATXQ4: buy a class credit in the Centium app to send this offer" };
  const hire = { code: "ATXQ4", message: "ATXQ4: buy a hiring credit in the Centium app to send this offer" };
  // The message.
  assert.equal(hiringErrorOf(cls), "no_class_credit");
  assert.equal(hiringErrorOf(hire), "no_hiring_credit");
  assert.equal(premiumCodeMessage("ATXQ4", { message: cls.message }), "Buy a class credit in the Centium app to send this offer.");
  assert.equal(premiumCodeMessage("ATXQ4", { message: hire.message }), "Buy a hiring credit in the Centium app to send this offer.");
  // G1's code alone (no message) stays the hiring credit sentence.
  assert.equal(premiumCodeMessage("ATXQ4"), "Buy a hiring credit in the Centium app to send this offer.");
  assert.equal(HIRING_ERROR_TEXT.no_class_credit, "Buy a class credit in the Centium app to send this offer.");
  assert.equal(HIRING_ERROR_TEXT.no_hiring_credit, "Buy a hiring credit in the Centium app to send this offer.");
  // The offer kind the app sent wins over the message.
  assert.equal(creditRefusalFor("class_slot", "no_hiring_credit"), "no_class_credit");
  assert.equal(creditRefusalFor("role", "no_class_credit"), "no_hiring_credit");
  assert.equal(creditRefusalFor("role", "no_hiring_credit"), "no_hiring_credit");
  assert.equal(creditRefusalFor("class_slot", "conflicts"), "conflicts");
  assert.equal(creditRefusalFor("class_slot", undefined), undefined);
  assert.equal(noCreditKind({ type: "class_slot", message: hire.message }), "class");
  assert.equal(noCreditKind({ type: "role", message: cls.message }), "hiring");
  assert.equal(noCreditKind({ message: cls.message }), "class");
  assert.equal(noCreditKind({}), "hiring");
});

// ---- professional plans in the app ----

const PLAN_ROW = { plans_in_app: true, bought_in_app: true, tier_id: "t-growth", tier_name: "Growth", billing_period: "yearly", renews_at: "2027-11-09T12:00:00Z" };

test("my_professional_plan_in_app parses; no row (not a professional) is null", () => {
  const p = parseProPlanInApp([PLAN_ROW]);
  assert.deepEqual(p, { plansInApp: true, boughtInApp: true, tierId: "t-growth", tierName: "Growth", billingPeriod: "yearly", renewsAt: "2027-11-09T12:00:00Z" });
  assert.equal(parseProPlanInApp([]), null);
  assert.equal(parseProPlanInApp(null), null);
  assert.equal(parseProPlanInApp([{ ...PLAN_ROW, billing_period: "weekly" }])?.billingPeriod, null);
});

test("the plan page: in the app only while plans_in_app, else exactly today's mailto", () => {
  assert.equal(proPlanPath(parseProPlanInApp([PLAN_ROW])), "app");
  assert.equal(proPlanPath(parseProPlanInApp([{ ...PLAN_ROW, bought_in_app: false }])), "app");
  // Off, loading (null), a non-professional or no G5: the emailed request.
  assert.equal(proPlanPath(parseProPlanInApp([{ ...PLAN_ROW, plans_in_app: false }])), "mailto");
  assert.equal(proPlanPath(null), "mailto");
  assert.equal(proPlanPath(undefined), "mailto");
});

test("Bought in the Centium app: the plan name and renewal whenever the plan came from the store, switch on or off", () => {
  const line = proPlanBoughtLine(parseProPlanInApp([PLAN_ROW]));
  assert.ok(line?.startsWith("Growth · Yearly · renews "), line ?? "null");
  assert.ok(line?.includes("2027"));
  assert.equal(proPlanBoughtLine(parseProPlanInApp([{ ...PLAN_ROW, bought_in_app: false }])), null);
  // A store plan shows the line with the switch off too (as businesses' paysInApp does).
  assert.ok(proPlanBoughtLine(parseProPlanInApp([{ ...PLAN_ROW, plans_in_app: false }]))?.startsWith("Growth · Yearly"));
  assert.equal(proPlanBoughtLine(parseProPlanInApp([{ ...PLAN_ROW, plans_in_app: false, bought_in_app: false }])), null);
  assert.equal(proPlanBoughtLine(null), null);
  assert.equal(proPlanBoughtLine(parseProPlanInApp([{ ...PLAN_ROW, billing_period: null, renews_at: null }])), "Growth");
});

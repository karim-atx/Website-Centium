import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createBlock,
  describeCreateRefusal,
  describeRedeemError,
  describeRedeemRefusal,
  grantsLine,
  gymArg,
  newMemberships,
  OFFLINE_LINE,
  redeemedLine,
} from "./codeLogic.ts";

const noDashes = (s: string) => {
  assert.ok(!s.includes("--"), s);
  assert.ok(!s.includes("—"), s);
  assert.ok(!s.includes("’"), s);
};

test("create: every documented refusal has its own words", () => {
  const cases: [string | undefined, string, string][] = [
    ["ATX02", "Too many create_business_member_code attempts. Please try again in 12 minute(s).", "You can create 20 codes an hour. Try again in 12 minutes."],
    ["ATX02", "Too many attempts. Please try again in 1 minute(s).", "You can create 20 codes an hour. Try again in 1 minute."],
    ["ATX02", "Too many attempts.", "You can create 20 codes an hour. Try again in a few minutes."],
    ["ATX09", "you do not have permission to issue member codes for this business", "You need Members access to create member codes. Ask the owner."],
    ["ATX08", "no such business", "We couldn't find your business. Refresh and try again."],
    ["ATX25", "that membership plan belongs to a different business", "That plan belongs to another business. Choose another plan."],
    ["ATXAC", "this business has no gym for a membership to belong to", "A membership or pass needs a gym. Add a gym first, or create a code with no plan."],
    ["ATXAC", "this business has 3 gyms -- say which one the membership is for", "Choose which of your 3 gyms this membership is for."],
    ["ATXAC", "that gym belongs to a different business", "That gym isn't one of yours. Choose another gym."],
    [undefined, "authentication required", "Your session expired. Sign in again."],
    ["XX000", "something else", "Couldn't create a code. Try again."],
  ];
  for (const [code, message, want] of cases) {
    const got = describeCreateRefusal({ code, message }, false);
    assert.equal(got, want);
    noDashes(got);
  }
  assert.equal(describeCreateRefusal({ message: "Failed to fetch" }, true), OFFLINE_LINE);
});

test("redeem: every success=false sentence is reworded, never shown raw", () => {
  const cases: [string, string][] = [
    ["That code is not valid.", "That code isn't valid. Check it and try again."],
    ["That code has already been used.", "That code has already been used. Ask the business for a new one."],
    ["That code has expired.", "That code has expired. Ask the business for a new one."],
    ["You cannot join your own business.", "That code is for your own business, so you can't join with it."],
    ["You are already a member of this business.", "You're already a member of this business."],
    ["This gym admits members aged 18 and over.", "This gym admits members aged 18 and over."],
    ["This gym admits members aged 21 and over.", "This gym admits members aged 21 and over."],
    ["That plan is no longer available -- ask the business for a new code.", "That plan is no longer available. Ask the business for a new code."],
    ["Something new -- from the server.", "Couldn't redeem that code. Try again."],
  ];
  for (const [server, want] of cases) {
    const got = describeRedeemRefusal(server);
    assert.equal(got, want);
    noDashes(got);
  }
  assert.equal(describeRedeemRefusal(null), "Couldn't redeem that code. Try again.");
});

test("redeem: raised errors (rate limit, session, offline, unknown)", () => {
  assert.equal(describeRedeemError({ code: "ATX02", message: "Too many attempts. Please try again in 9 minute(s)." }, false), "Too many tries. Wait 9 minutes and try again.");
  assert.equal(describeRedeemError({ code: "ATX02", message: "" }, false), "Too many tries. Wait a few minutes and try again.");
  assert.equal(describeRedeemError({ message: "authentication required" }, false), "Your session expired. Sign in again.");
  assert.equal(describeRedeemError({ message: "Failed to fetch" }, true), OFFLINE_LINE);
  assert.equal(describeRedeemError({ code: "XX000", message: "boom" }, false), "Couldn't redeem that code. Try again.");
});

const plans = [
  { id: "p1", name: "Monthly", kind: "membership" as const },
  { id: "p2", name: "Day pass", kind: "day_pass" as const },
];
const two = [
  { gymId: "g1", name: "Flex Gym" },
  { gymId: "g2", name: "Flex Studio" },
];

test("grantsLine: plan and type, the gym only with several gyms", () => {
  assert.equal(grantsLine({ membershipPlanId: null, gymId: null }, plans, two), "No plan");
  assert.equal(grantsLine({ membershipPlanId: "p1", gymId: "g2" }, plans, two), "Monthly (Membership) at Flex Studio");
  assert.equal(grantsLine({ membershipPlanId: "p2", gymId: "g1" }, plans, [two[0]]), "Day pass (Day pass)");
  assert.equal(grantsLine({ membershipPlanId: "gone", gymId: "g1" }, plans, two), "A plan at Flex Gym");
});

test("createBlock and gymArg: the gym is asked for and sent only with several gyms", () => {
  const base = { gymsLoading: false, gymsError: false };
  assert.equal(createBlock({ ...base, planId: null, gymId: null, gymCount: 0 }), null);
  assert.equal(createBlock({ ...base, planId: "p1", gymId: null, gymCount: 0 }), "no-gym");
  assert.equal(createBlock({ ...base, planId: "p1", gymId: null, gymCount: 1 }), null);
  assert.equal(createBlock({ ...base, planId: "p1", gymId: null, gymCount: 2 }), "choose-gym");
  assert.equal(createBlock({ ...base, planId: "p1", gymId: "g1", gymCount: 2 }), null);
  assert.equal(createBlock({ planId: "p1", gymId: null, gymCount: 0, gymsLoading: true, gymsError: false }), "gyms-loading");
  assert.equal(createBlock({ planId: "p1", gymId: null, gymCount: 0, gymsLoading: false, gymsError: true }), "gyms-error");
  assert.equal(gymArg("p1", "g1", 2), "g1");
  assert.equal(gymArg("p1", "g1", 1), null);
  assert.equal(gymArg(null, "g1", 2), null);
});

test("after a redemption: name what appeared, never imply a pass that did not", () => {
  const before = [{ id: "a", gymName: "Flex Gym", planName: "Day pass" }];
  const after = [...before, { id: "b", gymName: "Flex Studio", planName: "Monthly" }];
  const granted = newMemberships(before, after);
  assert.deepEqual(granted.map((g) => g.id), ["b"]);
  assert.equal(redeemedLine(granted, "Flex Fitness"), "You've joined Flex Fitness. Your Monthly at Flex Studio is now in your memberships.");
  assert.equal(redeemedLine([], "Flex Fitness"), "You've joined Flex Fitness.");
  assert.equal(redeemedLine([], null), "You've joined the business.");
  assert.equal(redeemedLine([], "Flex Fitness", true), "You've joined Flex Fitness. Reload to see any membership or pass that came with the code.");
  assert.equal(redeemedLine(newMemberships([], after), "Flex Fitness"), "You've joined Flex Fitness. 2 new memberships are now in your memberships.");
});

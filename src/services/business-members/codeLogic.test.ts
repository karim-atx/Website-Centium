import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createBlock,
  describeCreateRefusal,
  describeRedeemError,
  describeRedeemRefusal,
  grantsLine,
  gymArg,
  describePreviewError,
  grantNoun,
  newMemberships,
  OFFLINE_LINE,
  PREVIEW_UNUSABLE,
  previewLines,
  redeemedLine,
  redeemOutcome,
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
  // ATXAB from the business_members trigger: paused and closed worded apart, neither says the code was spent.
  assert.equal(
    describeRedeemError({ code: "ATXAB", message: "This business is paused and is not taking new activity. Existing records are unaffected." }, false),
    "This business is paused and isn't taking new members right now. Try again later.",
  );
  assert.equal(
    describeRedeemError({ code: "ATXAB", message: "This business is closed and is not taking new activity. Existing records are unaffected." }, false),
    "This business has closed, so it isn't taking new members.",
  );
});

test("redeem: the server's success sentence says what happened", () => {
  assert.equal(redeemOutcome("You are now a member, and your membership is ready."), "granted");
  assert.equal(redeemOutcome("You are now a member. You already have an active membership at this gym, so no new one was added."), "already-held");
  assert.equal(redeemOutcome("You are now a member."), "joined");
  assert.equal(redeemOutcome(null), "joined");
});

test("preview: what the code grants, until when, and the age line only above 16", () => {
  const now = new Date(2026, 9, 21, 12);
  const base = {
    businessName: "Flex Fitness",
    gymName: "Flex Gym",
    planName: "Monthly",
    planType: "membership" as const,
    grantsMembership: true,
    minEntryAge: 16,
    expiresAt: new Date(2026, 9, 28, 9).toISOString(),
  };
  assert.deepEqual(previewLines(base, now), ["Comes with Monthly (Membership) at Flex Gym, at no charge.", "Use it by Oct 28."]);
  assert.deepEqual(previewLines({ ...base, planName: "10 classes", planType: "class_pack", minEntryAge: 18 }, now), [
    "Comes with 10 classes (Class pack) at Flex Gym, at no charge.",
    "Use it by Oct 28.",
    "This gym admits members aged 18 and over.",
  ]);
  assert.deepEqual(previewLines({ ...base, gymName: null, planName: null, planType: null, grantsMembership: false, minEntryAge: null }, now), [
    "A member code only. It doesn't come with a membership or pass.",
    "Use it by Oct 28.",
  ]);
  // 16 and below can never refuse (the platform floor), so it isn't said.
  assert.equal(previewLines({ ...base, minEntryAge: 12 }, now).length, 2);
  assert.equal(PREVIEW_UNUSABLE, "This code can't be used. Check it, or ask the business for a new one.");
  for (const l of [...previewLines(base, now), PREVIEW_UNUSABLE]) noDashes(l);
});

test("preview: raised errors", () => {
  assert.equal(describePreviewError({ code: "ATX02", message: "Too many preview_business_member_code attempts. Please try again in 4 minute(s)." }, false), "Too many checks. Wait 4 minutes and try again.");
  assert.equal(describePreviewError({ code: "42501", message: "authentication required" }, false), "Your session expired. Sign in again.");
  assert.equal(describePreviewError({ message: "Failed to fetch" }, true), OFFLINE_LINE);
  assert.equal(describePreviewError({ code: "XX000", message: "boom" }, false), "Couldn't check that code. Try again.");
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
  const before = [{ id: "a", gymName: "Flex Gym", planName: "Day pass", planType: "day_pass" as const }];
  const after = [...before, { id: "b", gymName: "Flex Studio", planName: "Monthly", planType: "membership" as const }];
  const granted = newMemberships(before, after);
  assert.deepEqual(granted.map((g) => g.id), ["b"]);
  assert.equal(redeemedLine(granted, "Flex Fitness", "granted"), "You've joined Flex Fitness. Your membership at Flex Studio (Monthly) is now in your memberships.");
  assert.equal(redeemedLine(before, "Flex Fitness", "granted"), "You've joined Flex Fitness. Your pass at Flex Gym (Day pass) is now in your memberships.");
  assert.equal(redeemedLine([], "Flex Fitness", "joined"), "You've joined Flex Fitness.");
  assert.equal(redeemedLine([], null, "joined"), "You've joined the business.");
  // The server said nothing was added: never named as a new membership, even if the list changed.
  assert.equal(
    redeemedLine(granted, "Flex Fitness", "already-held"),
    "You've joined Flex Fitness. You already have an active membership at this gym, so no new one was added.",
  );
  assert.equal(redeemedLine([], "Flex Fitness", "granted", true), "You've joined Flex Fitness. What came with the code is ready. Reload to see it in your memberships.");
  assert.equal(redeemedLine(newMemberships([], after), "Flex Fitness", "granted"), "You've joined Flex Fitness. 2 new memberships or passes are now in your memberships.");
  assert.equal(grantNoun("class_pack"), "pass");
  assert.equal(grantNoun(null), "membership");
});

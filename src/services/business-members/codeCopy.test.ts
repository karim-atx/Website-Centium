import { test } from "node:test";
import assert from "node:assert/strict";
import { clampUses, codeActionMessage, isRedeemReason, redeemReasonLine, usesLine, usesValue } from "./codeCopy.ts";

test("AB6: every redeem reason has its sentence; joined and unknown reasons fall back", () => {
  const reasons = ["not_valid", "used_up", "revoked", "expired", "own_business", "employee", "already_member", "age_restricted", "plan_unavailable"];
  for (const r of reasons) {
    const line = redeemReasonLine(r, "");
    assert.ok(line && line.length > 10, r);
    assert.ok(!/redeem_business|ATX/.test(line), r);
  }
  assert.equal(redeemReasonLine("used_up"), "This code no longer works. Ask the gym for a new one.");
  assert.equal(redeemReasonLine("revoked"), "This code no longer works. Ask the gym for a new one.");
  assert.equal(redeemReasonLine("employee"), "You work at this business, so you can't join it with a member code.");
  assert.equal(redeemReasonLine("age_restricted", "This gym admits members aged 18 and over."), "This gym admits members aged 18 and over.");
  assert.equal(redeemReasonLine("age_restricted", null), "This gym has a minimum age for members.");
  assert.equal(redeemReasonLine("joined"), null);
  assert.equal(redeemReasonLine("something_new"), null);
  assert.equal(redeemReasonLine(undefined), null);
  assert.equal(isRedeemReason("plan_unavailable"), true);
  assert.equal(isRedeemReason("PLAN_UNAVAILABLE"), false);
});

test("AB6: uses 1–50, and how they read", () => {
  assert.deepEqual([clampUses(0), clampUses(1), clampUses(7.4), clampUses(51), clampUses(Number.NaN)], [1, 1, 7, 50, 1]);
  assert.equal(usesLine(0, 1), "Single use");
  assert.equal(usesLine(1, 1), "Used");
  assert.equal(usesLine(2, 10), "Used 2 of 10");
  assert.equal(usesValue(1), "1 person");
  assert.equal(usesValue(10), "Up to 10 people");
  assert.equal(codeActionMessage("ATX09", "x"), "You need Members access to change member codes. Ask the owner.");
  assert.equal(codeActionMessage("ATX08", "x"), "That code couldn't be found. Refresh and try again.");
  assert.equal(codeActionMessage("XXXX", "Couldn't revoke this code. Try again."), "Couldn't revoke this code. Try again.");
});

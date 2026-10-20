import test from "node:test";
import assert from "node:assert/strict";
import { signedNum } from "./proRules";

test("signedNum: plus, true minus, zero", () => {
  assert.equal(signedNum(3), "+3");
  assert.equal(signedNum(-3), "−3");
  assert.equal(signedNum(0), "0");
  assert.equal(signedNum(-2.5, (a) => `${a} kg`), "−2.5 kg");
});

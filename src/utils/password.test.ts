import test from "node:test";
import assert from "node:assert/strict";
import { meetsPasswordRule, passwordChecks } from "./password";

test("the rule is exactly the checklist: accepted only when no item shows a cross", () => {
  const samples = ["", "abc", "abcdefgh", "abcdefg1", "Abcdefg1", "abcdefg1!", "Abcdefg!", "ABCDEFG1!", "Abc1!", "Abcdefg1!", "Correct-Horse-9"];
  for (const p of samples) {
    const allTicked = passwordChecks.every((c) => c.test(p));
    assert.equal(meetsPasswordRule(p), allTicked, `"${p}"`);
  }
});

test("the old looser rule's passes that the checklist fails are now refused", () => {
  // 8+, a letter and a number, but no uppercase / no special: used to pass.
  assert.equal(meetsPasswordRule("abcdefg1"), false);
  assert.equal(meetsPasswordRule("Abcdefg1"), false);
  assert.equal(meetsPasswordRule("abcdefg1!"), false);
  assert.equal(meetsPasswordRule("Abcdefg1!"), true);
});

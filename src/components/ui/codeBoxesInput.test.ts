import { test } from "node:test";
import assert from "node:assert/strict";
import { codeAfterInput } from "./codeBoxesInput.ts";

test("typing into the next empty box appends and moves on", () => {
  assert.deepEqual(codeAfterInput("", 0, "4"), { code: "4", focusAt: 1 });
  assert.deepEqual(codeAfterInput("12345", 5, "6"), { code: "123456", focusAt: 5 });
});

test("retyping a middle box changes that digit only; the ones after it stay", () => {
  // The box's text was selected on focus, so the keystroke replaced it.
  assert.deepEqual(codeAfterInput("123456", 2, "9"), { code: "129456", focusAt: 3 });
});

test("a keystroke beside the old digit (no selection) still replaces just that digit", () => {
  assert.deepEqual(codeAfterInput("123456", 2, "39"), { code: "129456", focusAt: 3 });
  assert.deepEqual(codeAfterInput("123456", 2, "93"), { code: "129456", focusAt: 3 });
  // The last box: the new digit wins, it isn't cut off.
  assert.deepEqual(codeAfterInput("123456", 5, "67"), { code: "123457", focusAt: 5 });
  assert.deepEqual(codeAfterInput("113456", 1, "11"), { code: "113456", focusAt: 2 });
});

test("a paste or one-time-code autofill fills from the box, spaces dropped", () => {
  assert.deepEqual(codeAfterInput("", 0, "123 456"), { code: "123456", focusAt: 5 });
  assert.deepEqual(codeAfterInput("12", 2, "3456789"), { code: "123456", focusAt: 5 });
  assert.deepEqual(codeAfterInput("1", 1, "234"), { code: "1234", focusAt: 4 });
});

test("an emptied box (an Android delete with no Backspace key) removes that digit", () => {
  assert.deepEqual(codeAfterInput("1234", 3, ""), { code: "123", focusAt: 3 });
  assert.deepEqual(codeAfterInput("123456", 2, ""), { code: "12456", focusAt: 2 });
  assert.equal(codeAfterInput("12", 2, ""), null);
});

test("letters and symbols change nothing", () => {
  assert.equal(codeAfterInput("12", 2, "a"), null);
  assert.equal(codeAfterInput("12", 1, "x"), null);
});

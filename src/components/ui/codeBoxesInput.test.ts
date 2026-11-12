import { test } from "node:test";
import assert from "node:assert/strict";
import { codeAfterInput, CODE_LENGTH, EMAIL_CODE_LENGTH, emailCodeReady } from "./codeBoxesInput.ts";

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

// Emailed codes (EMAIL_CODE_LENGTH): eight boxes; 6 to 8 digits can be sent.

test("eight boxes: typing, retyping and the last box work at the emailed length", () => {
  assert.deepEqual(codeAfterInput("123456", 6, "7", EMAIL_CODE_LENGTH), { code: "1234567", focusAt: 7 });
  assert.deepEqual(codeAfterInput("1234567", 7, "8", EMAIL_CODE_LENGTH), { code: "12345678", focusAt: 7 });
  assert.deepEqual(codeAfterInput("12345678", 7, "89", EMAIL_CODE_LENGTH), { code: "12345679", focusAt: 7 });
  assert.deepEqual(codeAfterInput("12345678", 3, "0", EMAIL_CODE_LENGTH), { code: "12305678", focusAt: 4 });
});

test("an eight-digit paste fills all eight boxes; the six-box default still cuts it to six", () => {
  assert.deepEqual(codeAfterInput("", 0, "1234 5678", EMAIL_CODE_LENGTH), { code: "12345678", focusAt: 7 });
  assert.deepEqual(codeAfterInput("", 0, "123456789", EMAIL_CODE_LENGTH), { code: "12345678", focusAt: 7 });
  assert.deepEqual(codeAfterInput("", 0, "12345678"), { code: "123456", focusAt: 5 });
  // A six-digit email code pasted into eight boxes stays six, ready to send.
  assert.deepEqual(codeAfterInput("", 0, "123456", EMAIL_CODE_LENGTH), { code: "123456", focusAt: 6 });
});

test("an emailed code can be sent at 6, 7 or 8 digits, not shorter or longer", () => {
  assert.equal(EMAIL_CODE_LENGTH, 8);
  assert.equal(CODE_LENGTH, 6);
  assert.equal(emailCodeReady("12345"), false);
  assert.equal(emailCodeReady("123456"), true);
  assert.equal(emailCodeReady("1234567"), true);
  assert.equal(emailCodeReady("12345678"), true);
  assert.equal(emailCodeReady("123456789"), false);
  assert.equal(emailCodeReady(""), false);
  assert.equal(emailCodeReady("12345a78"), false);
});

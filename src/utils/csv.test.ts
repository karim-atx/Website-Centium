import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, neutraliseFormula, toCsvText } from "./csv.ts";

test("a text cell that starts like a formula reads as text", () => {
  for (const s of ['=HYPERLINK("https://x.test","Click")', "+cmd|' /C calc'!A0", "-2+3", "@SUM(A1)", "\t=1+1", "\r=1+1"]) {
    assert.equal(neutraliseFormula(s), `'${s}`, JSON.stringify(s));
  }
});

test("ordinary text, numbers and number-only text are unchanged", () => {
  assert.equal(neutraliseFormula("Maya K."), "Maya K.");
  assert.equal(neutraliseFormula("a=b"), "a=b");
  assert.equal(neutraliseFormula("-12.50"), "-12.50");
  assert.equal(neutraliseFormula("+961"), "+961");
  assert.equal(neutraliseFormula("1,200"), "1,200");
  assert.equal(csvCell(-12.5), '"-12.5"');
  assert.equal(csvCell(null), "");
});

test("quotes are doubled after the guard", () => {
  assert.equal(csvCell('=A1&"x"'), `"'=A1&""x"""`);
  assert.equal(csvCell('Say "hi"'), '"Say ""hi"""');
});

test("rows join with the chosen line ending", () => {
  assert.equal(toCsvText([["Name", "Amount"], ["=1+1", -3]]), `"Name","Amount"\r\n"'=1+1","-3"`);
  assert.equal(toCsvText([["a"], ["b"]], "\n"), `"a"\n"b"`);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFirstName, describeNameError, NAME_CHARACTERS, NAME_MISSING, NAME_TOO_LONG, singleLineName } from "./nameRules";

test("singleLineName makes one line of the refused characters", () => {
  assert.equal(singleLineName("Sarah"), "Sarah");
  assert.equal(singleLineName("  Sa\nrah \t "), "Sa rah");
  assert.equal(singleLineName("Sarah\r\n\r\nHacked"), "Sarah Hacked");
  assert.equal(singleLineName("Nour\u0085Ali"), "Nour Ali");
  // Bidi overrides and isolates go; the name's own letters stay.
  assert.equal(singleLineName("‮haras"), "haras");
  assert.equal(singleLineName("Rana⁦x⁩"), "Rana x");
});

test("the zero-width joiner and non-joiner stay (Arabic and Persian names)", () => {
  assert.equal(singleLineName("می‌خواهم"), "می‌خواهم");
  assert.equal(singleLineName("a‍b"), "a‍b");
  assert.equal(singleLineName("نور"), "نور");
});

test("describeNameError names only the single-line refusal", () => {
  assert.equal(describeNameError({ code: "23514", message: 'new row for relation "profiles" violates check constraint "profiles_first_name_single_line"' }), NAME_CHARACTERS);
  assert.equal(describeNameError({ code: "23514", message: "profiles_height_check" }), null);
  assert.equal(describeNameError({ code: "ATX51" }), null);
  assert.equal(describeNameError(null), null);
});

test("checkFirstName: one line, 1 to 60 characters, as saved (Round J · FI)", () => {
  assert.deepEqual(checkFirstName("  Rania \n"), { ok: true, name: "Rania" });
  assert.deepEqual(checkFirstName("رانيا"), { ok: true, name: "رانيا" });
  assert.deepEqual(checkFirstName(" \n\t "), { ok: false, message: NAME_MISSING });
  assert.deepEqual(checkFirstName("a".repeat(60)), { ok: true, name: "a".repeat(60) });
  assert.deepEqual(checkFirstName("a".repeat(61)), { ok: false, message: NAME_TOO_LONG });
  // Counted by character, not UTF-16 unit: 60 emoji is still 60.
  assert.equal(checkFirstName("😀".repeat(60)).ok, true);
});

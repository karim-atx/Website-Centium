import { test } from "node:test";
import assert from "node:assert/strict";
import { describeNameError, NAME_CHARACTERS, singleLineName } from "./nameRules";

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

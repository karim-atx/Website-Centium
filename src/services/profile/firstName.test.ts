import { test } from "node:test";
import assert from "node:assert/strict";
import { describeFirstNameError, NAME_CONTACT, NAME_FAILED, NAME_LENGTH, NAME_NOT_ALLOWED, NAME_RESERVED, NAME_SIGNED_OUT } from "./firstNameErrors";
import { NAME_CHARACTERS } from "./nameRules";
import { OFFLINE_MESSAGE } from "../network-error";

test("describeFirstNameError: each of set_my_first_name's codes in words (Database 20261226520000)", () => {
  assert.equal(describeFirstNameError({ code: "42501" }), NAME_SIGNED_OUT);
  assert.equal(describeFirstNameError({ code: "22023", message: "a first name is 1 to 60 characters" }), NAME_LENGTH);
  assert.equal(describeFirstNameError({ code: "23514", message: 'violates check constraint "profiles_first_name_single_line"' }), NAME_CHARACTERS);
  assert.equal(describeFirstNameError({ code: "ATX37" }), NAME_RESERVED);
  assert.equal(describeFirstNameError({ code: "ATXI1" }), NAME_CONTACT);
  assert.equal(describeFirstNameError({ code: "ATXI2" }), NAME_NOT_ALLOWED);
  assert.equal(describeFirstNameError({ code: "P0001", message: "boom" }), NAME_FAILED);
  assert.equal(describeFirstNameError(new TypeError("Failed to fetch") as never), OFFLINE_MESSAGE);
});

test("describeFirstNameError: ATXI0 names the day the next change is allowed, from DETAIL", () => {
  const line = describeFirstNameError({ code: "ATXI0", details: "2026-12-03T09:15:00Z" });
  assert.match(line, /^You can change your name again on /);
  assert.match(line, /3 December 2026/);
  // No readable DETAIL: still words, no "Invalid Date".
  const plain = describeFirstNameError({ code: "ATXI0", details: "soon" });
  assert.doesNotMatch(plain, /Invalid/);
  assert.match(plain, /five times in 30 days/);
});

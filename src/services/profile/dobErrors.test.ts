import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DOB_LOCKED, DOB_REQUIRED, describeDobError } from "./dobErrors.ts";

test("the two date-of-birth refusals read as sentences", () => {
  assert.equal(describeDobError("ATX51"), DOB_LOCKED);
  assert.equal(describeDobError("ATX52"), DOB_REQUIRED);
  assert.match(DOB_LOCKED, /Contact support/);
});

test("anything else is left to the caller", () => {
  assert.equal(describeDobError("ATX01"), null);
  assert.equal(describeDobError(undefined), null);
});

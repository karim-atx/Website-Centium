import { strict as assert } from "node:assert";
import { test } from "node:test";
import { deletionRunDate } from "./deletionDate";

test("the server's due date wins (an admin's 3-day notice)", () => {
  assert.equal(deletionRunDate("2026-10-07T16:28:31Z", "2026-10-10T00:00:00Z"), "2026-10-10");
});

test("without a due date (column unreadable), request + 30 days, as the sweep does", () => {
  assert.equal(deletionRunDate("2026-10-07T16:28:31Z", null), "2026-11-06");
});

test("the fallback and a self-service due date agree", () => {
  // request_account_deletion writes now() + 30 days, so both paths give the same day.
  assert.equal(deletionRunDate("2026-10-07T16:28:31Z", "2026-11-06T16:28:31Z"), deletionRunDate("2026-10-07T16:28:31Z", null));
});

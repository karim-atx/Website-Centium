import { strict as assert } from "node:assert";
import { test } from "node:test";
import { PAST_MIDNIGHT_ACCEPT_MESSAGE, PAST_MIDNIGHT_CODE, PAST_MIDNIGHT_MESSAGE } from "./pastMidnight";

test("the midnight refusal's code and words", () => {
  assert.equal(PAST_MIDNIGHT_CODE, "ATXAA");
  assert.equal(PAST_MIDNIGHT_MESSAGE, "A session cannot run past midnight. Choose a start time that lets it finish on the same day, or book it as two sessions.");
  // The professional accepting can't change the time, so their words say to decline.
  assert.match(PAST_MIDNIGHT_ACCEPT_MESSAGE, /Decline it/);
  for (const s of [PAST_MIDNIGHT_MESSAGE, PAST_MIDNIGHT_ACCEPT_MESSAGE]) assert.ok(!/[\u2018\u2019\u2014]/.test(s), "straight apostrophes, no em dashes");
});

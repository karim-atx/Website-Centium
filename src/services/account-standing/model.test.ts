import { test } from "node:test";
import assert from "node:assert/strict";
import { ACCOUNT_HELD, accountHeldLine, parseStanding, STANDING_OK } from "./model";

test("the standing reads the three states and fails open", () => {
  assert.deepEqual(parseStanding({ standing: "verify_email", rewards_withheld: true }), { standing: "verify_email", rewardsWithheld: true });
  assert.deepEqual(parseStanding({ standing: "under_review", rewards_withheld: true }), { standing: "under_review", rewardsWithheld: true });
  assert.deepEqual(parseStanding({ standing: "ok", rewards_withheld: false }), STANDING_OK);
  // Unreadable or unknown: never a hold on a bad read.
  assert.deepEqual(parseStanding(null), STANDING_OK);
  assert.deepEqual(parseStanding({ standing: "banned" }), STANDING_OK);
  // A score or reasons, if ever present, are not read.
  assert.deepEqual(Object.keys(parseStanding({ standing: "ok", score: 72, reasons: ["network_flood"] })).sort(), ["rewardsWithheld", "standing"]);
});

test("ATXR1 has its sentence whatever the action; other codes don't", () => {
  for (const detail of ["contact", "post", "review", "refer", "invite"]) assert.equal(accountHeldLine({ code: "ATXR1", details: detail } as never), ACCOUNT_HELD);
  assert.equal(accountHeldLine({ code: "ATX02" }), null);
  assert.equal(accountHeldLine(null), null);
});

test("the forum and every review writer say the same for ATXR1", async () => {
  const { describeForumError } = await import("../forum/rules");
  const { reviewRefusalLine } = await import("../safety/model");
  const e = { code: "ATXR1", message: "your account is being reviewed", details: "post" };
  assert.equal(describeForumError(e, "post"), ACCOUNT_HELD);
  assert.equal(describeForumError({ ...e, details: "post" }, "reply"), ACCOUNT_HELD);
  assert.equal(reviewRefusalLine({ ...e, details: "review" }), ACCOUNT_HELD);
  assert.equal(reviewRefusalLine({ ...e, details: "review" }, { professional: true }), ACCOUNT_HELD);
});

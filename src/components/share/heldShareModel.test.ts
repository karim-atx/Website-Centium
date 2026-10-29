// Round D · DV: a held share card's words and what each state allows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { HELD_REASONS, heldNoteLine, heldNoticeText, RELEASED_NOTICE, heldReasonWords, itemAllows, PAUSED_LINE, readHeldReason, readItemState, strongestState, type SharedItemState } from "./heldShareModel";

test("each reason category has its own short words, never a matched word", () => {
  assert.equal(heldReasonWords("contact_details"), "It shows contact details");
  assert.equal(heldReasonWords("not_relevant"), "It looks like advertising");
  assert.equal(heldReasonWords("not_allowed_content"), "It may break our community guidelines");
  assert.equal(heldReasonWords("other"), "It's being checked");
  const words = new Set(HELD_REASONS.map(heldReasonWords));
  assert.equal(words.size, HELD_REASONS.length);
});

test("an unknown or missing reason reads as other", () => {
  assert.equal(readHeldReason(null), "other");
  assert.equal(readHeldReason("profanity"), "other");
  assert.equal(heldReasonWords(undefined), "It's being checked");
});

test("the note and the notice carry the reason", () => {
  assert.equal(heldNoteLine("contact_details"), "It shows contact details. Only you can see this card until our team checks it, usually within a day.");
  const n = heldNoticeText("not_relevant");
  assert.equal(n.title, "Your shared card is held for review");
  assert.ok(n.line.startsWith("It looks like advertising."));
});

test("an unknown state reads as live", () => {
  assert.equal(readItemState("held_for_review"), "held_for_review");
  assert.equal(readItemState("archived"), "live");
  assert.equal(readItemState(null), "live");
});

test("a held card pauses the link and stops new exports", () => {
  const a = itemAllows("held_for_review", false);
  assert.equal(a.link, false);
  assert.equal(a.share, false);
  assert.deepEqual(a.chip, { label: "Held for review", tone: "gold" });
  assert.equal(a.line, PAUSED_LINE);
});

test("a live card links only while the database says the link is live", () => {
  assert.deepEqual(itemAllows("live", true), { link: true, share: true, chip: null, line: null });
  const paused = itemAllows("live", false);
  assert.equal(paused.link, false);
  assert.equal(paused.line, PAUSED_LINE);
});

test("removed and removal requested", () => {
  const removed = itemAllows("removed", false);
  assert.equal(removed.link, false);
  assert.equal(removed.chip?.label, "Removed");
  const asked = itemAllows("removal_requested", true);
  assert.equal(asked.link, true);
  assert.equal(asked.share, false);
  assert.equal(asked.chip?.label, "Removal asked");
});

test("a hold wins over the newest export of the same card", () => {
  const it = (state: SharedItemState, createdAt: string) => ({ state, createdAt });
  assert.equal(strongestState([]), null);
  assert.equal(strongestState([it("live", "2026-10-02"), it("held_for_review", "2026-10-01")])?.state, "held_for_review");
  assert.equal(strongestState([it("live", "2026-10-01"), it("live", "2026-10-03")])?.createdAt, "2026-10-03");
  assert.equal(strongestState([it("removed", "2026-10-03"), it("live", "2026-10-01")])?.state, "live");
});

test("the released notice says the link works again, with no reason", () => {
  assert.equal(RELEASED_NOTICE.title, "Your shared card is live again");
  assert.match(RELEASED_NOTICE.line, /link and QR work again/);
});

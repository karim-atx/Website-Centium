import { test } from "node:test";
import assert from "node:assert/strict";
import { OFFER_REPORT_NOTE_MAX, OFFER_REPORT_REASONS, offerReportError, offerReportNote } from "./reportModel.ts";

test("the reasons are exactly report_reason's six values", () => {
  assert.deepEqual(
    OFFER_REPORT_REASONS.map((r) => r.value).sort(),
    ["harassment", "harmful_health_advice", "impersonation", "inappropriate_content", "safety_concern", "spam"],
  );
  for (const r of OFFER_REPORT_REASONS) assert.ok(!/professional|review/i.test(r.hint), r.hint);
});

test("the note: trimmed, empty is null, at most 300 characters as Postgres counts them", () => {
  assert.equal(OFFER_REPORT_NOTE_MAX, 300);
  assert.equal(offerReportNote("   "), null);
  assert.equal(offerReportNote("  misleading  "), "misleading");
  assert.equal(Array.from(offerReportNote("a".repeat(400)) ?? "").length, 300);
  // An emoji is one character to char_length().
  assert.equal(Array.from(offerReportNote("😀".repeat(301)) ?? "").length, 300);
});

test("report_offer refusals read as the sheet's sentences", () => {
  assert.equal(offerReportError({ code: "ATX01", message: "authentication required" }), "Sign in to report this offer.");
  assert.equal(offerReportError({ code: "ATX08", message: "no such offer" }), "This offer isn't available any more, so it can't be reported.");
  assert.equal(offerReportError({ code: "22023", message: "you cannot report your own offer" }), "You can't report your own offer.");
  assert.equal(offerReportError({ code: "22023", message: "keep the note under 300 characters" }), "Keep the note under 300 characters.");
  assert.equal(offerReportError({ code: "ATX02", message: "rate limited" }), "You've sent a lot of reports in the last hour. Try again later.");
  assert.equal(offerReportError({ code: "22P02", message: 'invalid input value for enum report_reason: "other"' }), "Couldn't send the report. Try again.");
  assert.equal(offerReportError({}), "Couldn't send the report. Try again.");
});

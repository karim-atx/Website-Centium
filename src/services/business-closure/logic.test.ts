import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  BUSINESS_CLOSED_CODE,
  CLOSED_ADD_APPOINTMENT,
  CLOSED_APPROVE_JOIN,
  CLOSED_BOOK_APPOINTMENT,
  CLOSED_BUY_MEMBERSHIP,
  CLOSED_CHECK_IN,
  CLOSED_INVITE_MEMBER,
  CLOSED_INVITE_STAFF,
  CLOSED_MEMBER_CODE,
  CLOSED_PLACE_ORDER,
  CLOSED_REDEEM_CODE,
  CLOSED_RENEW_MEMBERSHIP,
  CLOSED_SELL_DAY_PASS,
  businessStatusOf,
  closeNameMatches,
  closedLine,
  closureMessage,
  closureReason,
  closureStateOf,
  isBusinessClosedError,
  takesNewActivity,
} from "./logic";

const CLOSED = "This business is closed and is not taking new activity. Existing records are unaffected.";
const PAUSED = "This business is paused and is not taking new activity. Existing records are unaffected.";

test("ATXAB and the state the trigger names", () => {
  assert.equal(BUSINESS_CLOSED_CODE, "ATXAB");
  assert.equal(isBusinessClosedError({ code: "ATXAB" }), true);
  assert.equal(isBusinessClosedError({ code: "ATXAA" }), false);
  assert.equal(isBusinessClosedError(null), false);
  assert.equal(closureStateOf(CLOSED), "closed");
  assert.equal(closureStateOf(PAUSED), "paused");
  // The trigger's own fallback is "closed".
  assert.equal(closureStateOf(undefined), "closed");
});

test("each screen's words, closed and paused", () => {
  assert.equal(closureMessage(CLOSED_BOOK_APPOINTMENT, CLOSED), "This business has closed and isn't taking new bookings.");
  assert.equal(closureMessage(CLOSED_BOOK_APPOINTMENT, PAUSED), "This business isn't taking bookings right now.");
  assert.equal(closureMessage(CLOSED_PLACE_ORDER, PAUSED), "This store isn't taking orders right now.");
  assert.equal(closureMessage(CLOSED_SELL_DAY_PASS, PAUSED), "This business is deactivated, so it can't sell day passes until it's reactivated.");
  assert.equal(closureMessage(CLOSED_ADD_APPOINTMENT, CLOSED), "This business is closed, so it can't take new appointments. Existing records are unaffected.");
});

test("check-in and staff invites are refused only when closed, so they never say deactivated", () => {
  for (const w of [CLOSED_CHECK_IN, CLOSED_INVITE_STAFF, CLOSED_APPROVE_JOIN]) {
    assert.equal(w.paused, w.closed);
    assert.match(w.closed, /is closed/);
  }
  assert.equal(closureMessage(CLOSED_CHECK_IN, CLOSED), "This business is closed, so it can't check people in. Existing records are unaffected.");
});

test("copy rules: straight apostrophes, no em dashes", () => {
  const all = [
    CLOSED_ADD_APPOINTMENT,
    CLOSED_APPROVE_JOIN,
    CLOSED_BOOK_APPOINTMENT,
    CLOSED_BUY_MEMBERSHIP,
    CLOSED_CHECK_IN,
    CLOSED_INVITE_MEMBER,
    CLOSED_INVITE_STAFF,
    CLOSED_MEMBER_CODE,
    CLOSED_PLACE_ORDER,
    CLOSED_REDEEM_CODE,
    CLOSED_RENEW_MEMBERSHIP,
    CLOSED_SELL_DAY_PASS,
  ].flatMap((w) => [w.closed, w.paused]);
  const lines = (["closed", "paused", "unavailable"] as const).flatMap((s) => [closedLine(s, "bookings"), closedLine(s, "orders")]);
  for (const s of [...all, ...lines]) assert.ok(s && !/[‘’—]/.test(s), s ?? "");
});

test("the public status from business_accepts(id, 'new') and the readable row", () => {
  assert.equal(businessStatusOf(true, null), "open");
  assert.equal(businessStatusOf(false, { closed_at: "2026-10-21T10:00:00Z", deactivated_at: null }), "closed");
  // Closed wins over an older pause.
  assert.equal(businessStatusOf(false, { closed_at: "2026-10-21T10:00:00Z", deactivated_at: "2026-10-01T10:00:00Z" }), "closed");
  assert.equal(businessStatusOf(false, { closed_at: null, deactivated_at: "2026-10-01T10:00:00Z" }), "paused");
  // A client can't read an unlisted row: not open, reason unknown.
  assert.equal(businessStatusOf(false, null), "unavailable");
  // Couldn't ask (signed out): the row may still say.
  assert.equal(businessStatusOf(null, null), "unknown");
  assert.equal(businessStatusOf(null, { closed_at: "2026-10-21T10:00:00Z", deactivated_at: null }), "closed");
  assert.equal(takesNewActivity("open"), true);
  assert.equal(takesNewActivity("unknown"), true);
  for (const s of ["closed", "paused", "unavailable"] as const) assert.equal(takesNewActivity(s), false);
});

test("the calm lines", () => {
  assert.equal(closedLine("open", "bookings"), null);
  assert.equal(closedLine("unknown", "orders"), null);
  assert.match(closedLine("closed", "bookings") ?? "", /^This business has closed\./);
  assert.equal(closedLine("paused", "bookings"), "This business isn't taking bookings right now.");
  assert.equal(closedLine("unavailable", "orders"), "This store isn't taking orders right now.");
});

test("the close confirm and reason", () => {
  assert.equal(closeNameMatches("  friend fitness hamra ", "Friend Fitness Hamra"), true);
  assert.equal(closeNameMatches("Friend Fitness", "Friend Fitness Hamra"), false);
  assert.equal(closeNameMatches("", "  "), false);
  assert.equal(closureReason("   "), null);
  assert.equal(closureReason("  Moving abroad "), "Moving abroad");
  assert.equal(closureReason("x".repeat(600))?.length, 500);
});

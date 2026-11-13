import { strict as assert } from "node:assert";
import { test } from "node:test";
import { nativePushTarget } from "./nativePushTarget.ts";
import { appPathFrom, decideHeldPath, type HeldPath } from "./openPathModel.ts";
import { notificationTarget } from "../services/push/messagePushUrl.ts";

// Batch D GA · a tapped native notification opens the same page the web one does.

const PUSH = "5c755543-bee6-48c2-9d7b-c56ef46aedf6";
const CALL = "0b1f9a4e-3c2d-4e5f-8a9b-1c2d3e4f5a6b";

test("a message push opens its conversation from messagePushId (flat, nested, or a JSON string)", () => {
  assert.equal(nativePushTarget({ type: "message", messagePushId: PUSH }), `/app/messages?push=${PUSH}`);
  assert.equal(nativePushTarget({ type: "message", data: { messagePushId: PUSH } }), `/app/messages?push=${PUSH}`);
  assert.equal(nativePushTarget({ type: "message", data: JSON.stringify({ messagePushId: PUSH }) }), `/app/messages?push=${PUSH}`);
  // The id wins over a url, as on the web.
  assert.equal(nativePushTarget({ messagePushId: PUSH, url: "/app" }), `/app/messages?push=${PUSH}`);
  // Not a uuid: nothing smuggled into the path; the url (or nothing) instead.
  assert.equal(nativePushTarget({ messagePushId: "x/../../evil" }), null);
  assert.equal(nativePushTarget({ messagePushId: "x", url: "/app/messages" }), "/app/messages");
});

test("a call push opens the call", () => {
  assert.equal(nativePushTarget({ type: "incoming_call", callId: CALL, url: `/calls/${CALL}` }), `/app/calls/${CALL}`);
  assert.equal(nativePushTarget({ type: "incoming_call", callId: "nope", url: "/app/calls/nope" }), "/app/calls/nope");
});

test("anything else opens its url, as before", () => {
  assert.equal(nativePushTarget({ type: "reminder", url: "/app/notifications" }), "/app/notifications");
  assert.equal(nativePushTarget({ url: "/app/calendar?day=2026-11-20" }), "/app/calendar?day=2026-11-20");
  // A url that leaves the origin is still handed on unchanged; NativeOpenPath drops it.
  assert.equal(nativePushTarget({ url: "https://evil.example/app" }), "https://evil.example/app");
  assert.equal(appPathFrom(nativePushTarget({ url: "https://evil.example/app" })), null);
  assert.equal(nativePushTarget({}), null);
  assert.equal(nativePushTarget(undefined), null);
  assert.equal(nativePushTarget("nope"), null);
});

// The destinations Karim approved, as the Database sends them (top-level
// `url` on the web, `data.url` natively, the same /app path in both). Each
// must open unchanged on both sides: natively through NativeOpenPath (which
// also holds it until sign-in: decideHeldPath keeps the path as given), and on
// the web through the service worker's notificationTarget.
const ORDER = "9d3c2b1a-0f9e-4d8c-b7a6-5f4e3d2c1b0a";
const DESTINATIONS: [kind: string, url: string][] = [
  ["calendar_event", "/app/calendar?day=2026-11-20"],
  ["class_booked", "/app/calendar?day=2026-11-20"],
  ["class_changed", "/app/calendar?day=2026-11-20"],
  ["class_cancelled", "/app/calendar?day=2026-11-20"],
  ["class_waitlist", "/app/calendar?day=2026-11-20"],
  ["appointment_cancelled", "/app/calendar?day=2026-11-20"],
  ["coach_update (appointment_change)", "/app/calendar?day=2026-11-20"],
  ["a calendar push without a day", "/app/calendar"],
  ["appointment_booked (venue)", "/app/business/calendar?day=2026-11-20"],
  ["pro_booking", "/app/pro/calendar?day=2026-11-20"],
  ["order_update (customer)", `/app/store/orders/${ORDER}`],
  ["order_placed (store)", `/app/business/orders/${ORDER}`],
  ["pill", "/app/contraception"],
  ["ring_removal", "/app/contraception"],
  ["ring_insertion", "/app/contraception"],
  ["patch_change", "/app/contraception"],
  ["injection_due", "/app/contraception"],
  ["device_replacement", "/app/contraception"],
  ["period_due", "/app/cycle"],
  ["medication", "/app/health/medications"],
  ["habit", "/app/mind"],
  ["weekly_summary (Premium on)", "/app/weekly-review"],
  ["weekly_summary (off) and everything else", "/app"],
  ["review_prompt (unchanged)", `/app/calendar?rate=${ORDER}`],
  ["browser message push url", `/app/messages?push=${PUSH}`],
];

test("every Batch D destination opens as sent, natively and on the web", () => {
  for (const [kind, url] of DESTINATIONS) {
    assert.equal(appPathFrom(nativePushTarget({ type: "reminder", kind, url })), url, `native ${kind}`);
    assert.equal(notificationTarget({ type: "reminder", url }, "/app"), url, `web ${kind}`);
    // Held until sign-in, then opened as the same path.
    const held: HeldPath = { path: appPathFrom(url)!, heldAt: 0, owner: null };
    assert.equal(decideHeldPath(held, { ready: false, pathname: "/login", userId: null, at: 1 }), "wait", kind);
    assert.equal(decideHeldPath(held, { ready: true, pathname: "/app", userId: "u", at: 2 }), "open", kind);
    assert.equal(held.path, url, kind);
  }
});

test("a message push opens the same conversation whether it has the new url or only messagePushId", () => {
  const url = `/app/messages?push=${PUSH}`;
  assert.equal(nativePushTarget({ type: "message", messagePushId: PUSH, url }), url);
  assert.equal(nativePushTarget({ type: "message", messagePushId: PUSH }), url);
  assert.equal(notificationTarget({ url, data: { messagePushId: PUSH } }, "/app"), url);
  assert.equal(notificationTarget({ data: { messagePushId: PUSH } }, "/app"), url);
});

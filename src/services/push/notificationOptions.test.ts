import { strict as assert } from "node:assert";
import { test } from "node:test";
import { effectiveFamily, PUSH_FAMILIES, pushNotificationOptions, readFamily, VIBRATE_CALL, VIBRATE_SHORT } from "./notificationOptions";

const ICON = "/pwa-192x192.png?v=3";
const base = { body: "b", icon: ICON, url: "/app", count: 1, tagShown: false };

test("the family is read only when it is one of the nine", () => {
  for (const f of PUSH_FAMILIES) assert.equal(readFamily({ family: f }), f);
  // Exact values only, as the Database sends them (no case folding, no _vN suffix).
  assert.equal(readFamily({ family: "Safety" }), null);
  assert.equal(readFamily({ family: "reminders_v2" }), null);
  assert.equal(readFamily({ family: "alarms" }), null);
  // Nested under data is not the field.
  assert.equal(readFamily({ data: { family: "calls" } }), null);
  assert.equal(readFamily({ family: 3 }), null);
  assert.equal(readFamily({}), null);
});

test("without a family only a call is inferred, from send-push's own type", () => {
  assert.equal(effectiveFamily({ type: "incoming_call", title: "x" }), "calls");
  assert.equal(effectiveFamily({ title: "Reminder", tag: "reminder-1" }), null);
  assert.equal(effectiveFamily({ tag: "push-1", data: { group: "abcdefgh12" } }), null);
  // The payload's own family wins.
  assert.equal(effectiveFamily({ type: "incoming_call", family: "calls" }), "calls");
  assert.equal(effectiveFamily({ family: "reminders", type: "incoming_call" }), "reminders");
});

test("a calendar alert arrives as reminders: short buzz, not sticky", () => {
  const o = pushNotificationOptions({ ...base, family: effectiveFamily({ title: "Team sync", tag: "reminder-5", family: "reminders" }), tag: "reminder-5" });
  assert.deepEqual(o.vibrate, [...VIBRATE_SHORT]);
  assert.equal(o.requireInteraction, undefined);
});

test("no family: exactly today's options (a reminder)", () => {
  assert.deepEqual(pushNotificationOptions({ ...base, family: null, tag: "reminder-9" }), {
    body: "b",
    icon: ICON,
    badge: ICON,
    tag: "reminder-9",
    renotify: false,
    data: { url: "/app", count: 1 },
  });
});

test("no family: a chat keeps its tag and always renotifies, as today", () => {
  const o = pushNotificationOptions({ ...base, family: null, tag: "push-1", chatTag: "chat-abcdefgh12", count: 3 });
  assert.equal(o.tag, "chat-abcdefgh12");
  assert.equal(o.renotify, true);
  assert.equal(o.vibrate, undefined);
  assert.equal(o.requireInteraction, undefined);
  assert.deepEqual(o.data, { url: "/app", count: 3 });
});

test("no family: a reused plain tag stays silent, as today", () => {
  const o = pushNotificationOptions({ ...base, family: null, tag: "reminder-9", tagShown: true });
  assert.equal(o.renotify, false);
  assert.equal("vibrate" in o, false);
  assert.equal("requireInteraction" in o, false);
});

test("every family vibrates; a call rings longer", () => {
  for (const f of PUSH_FAMILIES) {
    const o = pushNotificationOptions({ ...base, family: f });
    assert.deepEqual(o.vibrate, f === "calls" ? [...VIBRATE_CALL] : [...VIBRATE_SHORT], f);
  }
  assert.ok(VIBRATE_CALL.reduce((a, b) => a + b, 0) > VIBRATE_SHORT.reduce((a, b) => a + b, 0));
});

test("calls and safety stay on screen; nothing else does", () => {
  for (const f of PUSH_FAMILIES) {
    const o = pushNotificationOptions({ ...base, family: f });
    assert.equal(o.requireInteraction, f === "calls" || f === "safety" ? true : undefined, f);
  }
});

test("with a family, a reused tag renotifies; a new one or no tag doesn't", () => {
  assert.equal(pushNotificationOptions({ ...base, family: "reminders", tag: "reminder-9", tagShown: true }).renotify, true);
  assert.equal(pushNotificationOptions({ ...base, family: "reminders", tag: "reminder-9", tagShown: false }).renotify, false);
  // renotify without a tag is a TypeError in showNotification: never set.
  assert.equal(pushNotificationOptions({ ...base, family: "safety", tagShown: true }).renotify, false);
});

test("with a family, chats still renotify on their chat tag", () => {
  const o = pushNotificationOptions({ ...base, family: "messages", tag: "push-1", chatTag: "chat-abcdefgh12" });
  assert.equal(o.tag, "chat-abcdefgh12");
  assert.equal(o.renotify, true);
  assert.deepEqual(o.vibrate, [...VIBRATE_SHORT]);
  assert.equal(o.requireInteraction, undefined);
});

test("the vibrate array is a copy, not the shared constant", () => {
  const o = pushNotificationOptions({ ...base, family: "calls" });
  o.vibrate?.push(1);
  assert.equal(VIBRATE_CALL.length, 5);
});

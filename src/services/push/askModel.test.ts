import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { type AskPermission, EMPTY_PUSH_ASK, markShown, mayAsk, parsePushAsk, PUSH_ASK_SNOOZE_DAYS, snooze } from "./askModel.ts";

const NOW = Date.UTC(2026, 10, 6, 9);
const DAY = 86_400_000;
const app = { supported: true, permission: "default" as AskPermission };

describe("mayAsk", () => {
  it("asks once per moment in the app, before the phone was asked", () => {
    assert.equal(mayAsk(EMPTY_PUSH_ASK, "message", NOW, app), true);
    const s = markShown(EMPTY_PUSH_ASK, "message");
    assert.equal(mayAsk(s, "message", NOW, app), false);
    assert.equal(mayAsk(s, "booking", NOW, app), true);
  });

  it("never asks in a browser or once the phone has answered", () => {
    assert.equal(mayAsk(EMPTY_PUSH_ASK, "reminder", NOW, { supported: false, permission: "default" }), false);
    assert.equal(mayAsk(EMPTY_PUSH_ASK, "reminder", NOW, { supported: true, permission: "granted" }), false);
    assert.equal(mayAsk(EMPTY_PUSH_ASK, "reminder", NOW, { supported: true, permission: "denied" }), false);
  });

  it("waits 30 days after Not now", () => {
    assert.equal(PUSH_ASK_SNOOZE_DAYS, 30);
    const s = snooze(markShown(EMPTY_PUSH_ASK, "message"), NOW);
    assert.equal(mayAsk(s, "booking", NOW + 29 * DAY, app), false);
    assert.equal(mayAsk(s, "booking", NOW + 30 * DAY, app), true);
    assert.equal(mayAsk(s, "message", NOW + 31 * DAY, app), false);
  });
});

describe("parsePushAsk", () => {
  it("reads what was stored and drops anything unknown", () => {
    assert.deepEqual(parsePushAsk(JSON.stringify({ snoozedUntil: NOW, shown: ["message", "x", "booking"] })), { snoozedUntil: NOW, shown: ["message", "booking"] });
    assert.deepEqual(parsePushAsk("{"), EMPTY_PUSH_ASK);
    assert.deepEqual(parsePushAsk(null), EMPTY_PUSH_ASK);
    assert.deepEqual(parsePushAsk(JSON.stringify({ snoozedUntil: "soon" })), EMPTY_PUSH_ASK);
  });
});

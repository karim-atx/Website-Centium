import { test } from "node:test";
import assert from "node:assert/strict";
import { groupNotifications, notifLook, notifWhen, parseNotifications, unreadCount } from "./notificationsModel.ts";

const NOW = new Date(2026, 9, 16, 15, 0); // Fri

test("parse keeps only in-app target paths", () => {
  const list = parseNotifications([
    { id: "1", kind: "voucher_issued", title: "Voucher ready", body: "b", created_at: NOW.toISOString(), target_path: "/app/marketplace/rewards/mine" },
    { id: "2", kind: "x", title: "t", created_at: NOW.toISOString(), target_path: "https://evil.example" },
    { id: "3", kind: "x", created_at: NOW.toISOString() },
  ]);
  assert.equal(list.length, 2);
  assert.equal(list[0].targetPath, "/app/marketplace/rewards/mine");
  assert.equal(list[1].targetPath, null);
});

test("kinds take the board's tiles", () => {
  assert.deepEqual(notifLook("points_expiring"), { tone: "gold", glyph: "leaf" });
  assert.deepEqual(notifLook("class_session_cancelled"), { tone: "red", glyph: "x" });
  assert.deepEqual(notifLook("review_prompt"), { tone: "lav", glyph: "star" });
  assert.deepEqual(notifLook("voucher_issued"), { tone: "teal", glyph: "qr" });
});

test("when: time today, weekday this week, date before", () => {
  assert.equal(notifWhen(new Date(2026, 9, 16, 9, 2).toISOString(), NOW), "9:02 AM");
  assert.equal(notifWhen(new Date(2026, 9, 13, 9, 2).toISOString(), NOW), "Tue");
  assert.equal(notifWhen(new Date(2026, 8, 1, 9, 2).toISOString(), NOW), "Sep 1");
});

test("Today / Earlier groups and unread count", () => {
  const list = parseNotifications([
    { id: "a", title: "t", created_at: new Date(2026, 9, 16, 9).toISOString() },
    { id: "b", title: "t", created_at: new Date(2026, 9, 15, 9).toISOString(), read_at: "x" },
  ]);
  assert.deepEqual(groupNotifications(list, NOW).map((g) => [g.heading, g.items.length]), [["Today", 1], ["Earlier", 1]]);
  assert.equal(unreadCount(list), 1);
});

test("business kinds (B-MA.9 notifBiz): the board's tone and glyph, and where each row opens", async () => {
  const { bizNotifLook, bizNotifTarget } = await import("./notificationsModel.ts");
  assert.deepEqual(bizNotifLook("application_received"), { tone: "lav", glyph: "app" });
  assert.deepEqual(bizNotifLook("hire_offer_accepted"), { tone: "teal", glyph: "hire" });
  assert.deepEqual(bizNotifLook("hiring_fee_added"), { tone: "gold", glyph: "bill" });
  assert.deepEqual(bizNotifLook("hire_offer_declined"), { tone: "grey", glyph: "x" });
  assert.deepEqual(bizNotifLook("voucher_redeemed"), { tone: "blue", glyph: "qr" });
  assert.deepEqual(bizNotifLook("review"), { tone: "gold", glyph: "star" });
  assert.deepEqual(bizNotifLook("something_new"), { tone: "grey", glyph: "clock" });
  assert.equal(bizNotifTarget({ kind: "application_received", refId: "op 1", targetPath: null }), "/app/business/hiring/openings/op%201");
  assert.equal(bizNotifTarget({ kind: "application_received", refId: null, targetPath: null }), "/app/business/hiring");
  assert.equal(bizNotifTarget({ kind: "hiring_fee_added", refId: null, targetPath: null }), "/app/business/hiring/fees");
  assert.equal(bizNotifTarget({ kind: "hire_offer_accepted", refId: null, targetPath: null }), "/app/business/hiring/team");
  assert.equal(bizNotifTarget({ kind: "review", refId: null, targetPath: null }), "/app/business/analytics/reputation");
  assert.equal(bizNotifTarget({ kind: "voucher_redeemed", refId: null, targetPath: null }), null);
  assert.equal(bizNotifTarget({ kind: "voucher_redeemed", refId: null, targetPath: "/app/business/redeem" }), "/app/business/redeem");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bizNotifLook,
  bizNotifTarget,
  BUSINESS_COPY,
  BUSINESS_KINDS,
  CLIENT_COPY,
  clientNotificationTarget,
  GENERIC_COPY,
  groupNotifications,
  isBusinessKind,
  markReadLocally,
  notificationCopy,
  notificationCursor,
  notifLook,
  notifWhen,
  parseMarkedCount,
  parseMemberNotifications,
  RELEASE1_KINDS,
  unreadCount,
} from "./notificationsModel.ts";

const NOW = new Date(2026, 9, 16, 15, 0); // Fri
const V = "6f1c2a4e-1b2c-4d3e-8f90-0123456789ab";
const O = "0a1b2c3d-4e5f-4a6b-9c7d-8e9f0a1b2c3d";

/** A my_notifications row (Database 20261210600000), as PostgREST returns it. */
const row = (o: Record<string, unknown> = {}) => ({
  id: "11111111-1111-4111-8111-111111111111",
  kind: "voucher_issued",
  subject_type: "voucher",
  subject_id: V,
  actor_id: null,
  title_key: "voucher_issued",
  payload: { code: "ABCD-EFGH-JKMN" },
  read_at: null,
  created_at: "2026-10-16T09:02:00.123456+00:00",
  ...o,
});

test("parse: the reader's nine columns; a row without id, kind or created_at is dropped", () => {
  const list = parseMemberNotifications([
    row(),
    row({ id: "2", title_key: null, payload: null, subject_type: null, subject_id: null, read_at: "2026-10-16T10:00:00+00:00" }),
    row({ id: "3", payload: [1, 2] }),
    { id: "4", created_at: "2026-10-16T09:00:00Z" },
    { kind: "voucher_issued", created_at: "2026-10-16T09:00:00Z" },
  ]);
  assert.equal(list.length, 3);
  assert.deepEqual(list[0], {
    id: "11111111-1111-4111-8111-111111111111",
    kind: "voucher_issued",
    subjectType: "voucher",
    subjectId: V,
    actorId: null,
    titleKey: "voucher_issued",
    payload: { code: "ABCD-EFGH-JKMN" },
    readAt: null,
    createdAt: "2026-10-16T09:02:00.123456+00:00",
  });
  // notify_member writes the kind as the key when none is passed; a null key reads the same way.
  assert.equal(list[1].titleKey, "voucher_issued");
  assert.deepEqual(list[1].payload, {});
  assert.equal(list[1].readAt, "2026-10-16T10:00:00+00:00");
  assert.deepEqual(list[2].payload, {});
  assert.deepEqual(parseMemberNotifications(null), []);
  assert.deepEqual(parseMemberNotifications([]), []);
});

test("cursor: the last row shown, as (p_before, p_before_id)", () => {
  const list = parseMemberNotifications([row({ id: "a" }), row({ id: "b", created_at: "2026-10-15T08:00:00+00:00" })]);
  assert.deepEqual(notificationCursor(list), { before: "2026-10-15T08:00:00+00:00", beforeId: "b" });
  assert.equal(notificationCursor([]), null);
});

test("mark_notifications_read's count", () => {
  assert.equal(parseMarkedCount(3), 3);
  assert.equal(parseMarkedCount(0), 0);
  assert.equal(parseMarkedCount("2"), 2);
  assert.equal(parseMarkedCount(null), 0);
  assert.equal(parseMarkedCount(-1), 0);
});

test("copy: every Release 1 kind has a line; title_key first, then kind, then the generic line", () => {
  for (const k of RELEASE1_KINDS) {
    const c = notificationCopy({ titleKey: k, kind: k });
    assert.equal(c, CLIENT_COPY[k]);
    assert.ok(c.title.length > 0);
  }
  assert.deepEqual(notificationCopy({ titleKey: "voucher_issued", kind: "voucher_issued" }), { title: "Voucher ready", body: "Your voucher is in My rewards." });
  // an unknown key on a known kind reads as the kind
  assert.equal(notificationCopy({ titleKey: "member.voucher.v2", kind: "points_expiring" }).title, "Points expire soon");
  // an unknown key AND kind: the safe generic line, never the raw key
  const g = notificationCopy({ titleKey: "pro.secret.key", kind: "hired" });
  assert.equal(g, GENERIC_COPY);
  assert.equal(g.title, "New notification");
  assert.ok(!g.title.includes("pro.secret.key"));
  // prototype keys are not copy
  assert.equal(notificationCopy({ titleKey: "constructor", kind: "toString" }), GENERIC_COPY);
  // another inbox brings its own table
  assert.equal(notificationCopy({ titleKey: "hired", kind: "hired" }, { hired: { title: "Hired", body: "" } }).title, "Hired");
});

test("targets: voucher, offer, booking, points; owner kinds open nothing in the client UI", () => {
  assert.equal(clientNotificationTarget({ kind: "voucher_issued", subjectType: "voucher", subjectId: V }), `/app/marketplace/vouchers/${V}`);
  assert.equal(clientNotificationTarget({ kind: "voucher_issued", subjectType: null, subjectId: null }), "/app/marketplace/rewards/mine");
  assert.equal(clientNotificationTarget({ kind: "points_expiring", subjectType: null, subjectId: null }), "/app/marketplace/points/history");
  assert.equal(clientNotificationTarget({ kind: "voucher_redeemed", subjectType: "voucher", subjectId: V }), null);
  assert.equal(clientNotificationTarget({ kind: "offer_hidden", subjectType: "offer", subjectId: O }), null);
  assert.equal(clientNotificationTarget({ kind: "class_cancelled", subjectType: "offer", subjectId: O }), `/app/marketplace/rewards/${O}`);
  assert.equal(clientNotificationTarget({ kind: "class_cancelled", subjectType: "booking", subjectId: O }), "/app/marketplace/bookings");
  assert.equal(clientNotificationTarget({ kind: "x", subjectType: "points", subjectId: null }), "/app/marketplace/points/history");
  assert.equal(clientNotificationTarget({ kind: "x", subjectType: "voucher", subjectId: "../../admin" }), "/app/marketplace/rewards/mine");
  assert.equal(clientNotificationTarget({ kind: "x", subjectType: "offer", subjectId: null }), null);
  assert.equal(clientNotificationTarget({ kind: "x", subjectType: "class_series", subjectId: O }), null);
});

test("kinds take the board's tiles", () => {
  assert.deepEqual(notifLook("points_expiring"), { tone: "gold", glyph: "leaf" });
  assert.deepEqual(notifLook("class_cancelled"), { tone: "red", glyph: "x" });
  assert.deepEqual(notifLook("review_prompt"), { tone: "lav", glyph: "star" });
  assert.deepEqual(notifLook("voucher_issued"), { tone: "teal", glyph: "qr" });
  assert.deepEqual(notifLook("voucher_redeemed"), { tone: "teal", glyph: "qr" });
  assert.deepEqual(notifLook("offer_hidden"), { tone: "grey", glyph: "clock" });
});

test("when: time today, weekday this week, date before", () => {
  assert.equal(notifWhen(new Date(2026, 9, 16, 9, 2).toISOString(), NOW), "9:02 AM");
  assert.equal(notifWhen(new Date(2026, 9, 13, 9, 2).toISOString(), NOW), "Tue");
  assert.equal(notifWhen(new Date(2026, 8, 1, 9, 2).toISOString(), NOW), "Sep 1");
});

test("Today / Earlier keep the reader's order; unread count; local mark read", () => {
  const list = parseMemberNotifications([
    row({ id: "a", created_at: new Date(2026, 9, 16, 9).toISOString() }),
    row({ id: "b", created_at: new Date(2026, 9, 16, 9).toISOString() }),
    row({ id: "c", created_at: new Date(2026, 9, 15, 9).toISOString(), read_at: "2026-10-15T10:00:00Z" }),
  ]);
  const groups = groupNotifications(list, NOW);
  assert.deepEqual(groups.map((g) => [g.heading, g.items.map((n) => n.id)]), [["Today", ["a", "b"]], ["Earlier", ["c"]]]);
  assert.equal(unreadCount(list), 2);
  const one = markReadLocally(list, new Set(["b"]), "T");
  assert.deepEqual(one.map((n) => n.readAt), [null, "T", "2026-10-15T10:00:00Z"]);
  const all = markReadLocally(list, null, "T");
  assert.equal(unreadCount(all), 0);
  assert.equal(all[2].readAt, "2026-10-15T10:00:00Z"); // an already-read row isn't re-stamped
});

// ---- W4 · the business inbox (B-MA.9), on the DB6 reader ----

test("business kinds: every one is a member_notification_kind label with a line and a tile; member kinds are not business rows", () => {
  // member_notification_kind (Database 20261210600000), in its order.
  const ENUM = ["voucher_issued", "voucher_redeemed", "points_expiring", "offer_hidden", "application_received", "hire_offer_received", "hire_offer_accepted", "hire_offer_declined", "hired", "classes_added", "class_changed", "class_cancelled", "removed_from_team", "review_received", "review_prompt", "existing_team_invite", "hiring_fee_added"];
  for (const k of BUSINESS_KINDS) {
    assert.ok(ENUM.includes(k), k);
    const c = notificationCopy({ titleKey: k, kind: k }, BUSINESS_COPY);
    assert.equal(c, BUSINESS_COPY[k]);
    assert.ok(c.title.length > 0 && !c.title.includes("_"));
    assert.ok(isBusinessKind(k));
  }
  for (const k of ["voucher_issued", "points_expiring", "hire_offer_received", "hired", "class_cancelled", "review_prompt", "existing_team_invite", "something_new"]) assert.ok(!isBusinessKind(k), k);
  // an unknown key on a business kind reads as the kind; an unknown kind is the generic line, never the key
  assert.equal(notificationCopy({ titleKey: "biz.hiring.v2", kind: "hiring_fee_added" }, BUSINESS_COPY).title, "Hiring fee added to your Centium bill");
  assert.equal(notificationCopy({ titleKey: "biz.secret", kind: "hired" }, BUSINESS_COPY), GENERIC_COPY);
  assert.deepEqual(bizNotifLook("application_received"), { tone: "lav", glyph: "app" });
  assert.deepEqual(bizNotifLook("hire_offer_accepted"), { tone: "teal", glyph: "hire" });
  assert.deepEqual(bizNotifLook("hiring_fee_added"), { tone: "gold", glyph: "bill" });
  assert.deepEqual(bizNotifLook("hire_offer_declined"), { tone: "grey", glyph: "x" });
  assert.deepEqual(bizNotifLook("voucher_redeemed"), { tone: "blue", glyph: "qr" });
  assert.deepEqual(bizNotifLook("review_received"), { tone: "gold", glyph: "star" });
  assert.deepEqual(bizNotifLook("offer_hidden"), { tone: "grey", glyph: "clock" });
  assert.deepEqual(bizNotifLook("something_new"), { tone: "grey", glyph: "clock" });
});

test("business targets: by kind and subject; a non-uuid subject never reaches a path", () => {
  assert.equal(bizNotifTarget({ kind: "application_received", subjectType: "opening", subjectId: O }), `/app/business/hiring/openings/${O}`);
  assert.equal(bizNotifTarget({ kind: "application_received", subjectType: "opening", subjectId: "../../admin" }), "/app/business/hiring");
  assert.equal(bizNotifTarget({ kind: "application_received", subjectType: null, subjectId: null }), "/app/business/hiring");
  assert.equal(bizNotifTarget({ kind: "hiring_fee_added", subjectType: null, subjectId: null }), "/app/business/hiring/fees");
  assert.equal(bizNotifTarget({ kind: "hire_offer_accepted", subjectType: null, subjectId: null }), "/app/business/hiring/team");
  assert.equal(bizNotifTarget({ kind: "hire_offer_declined", subjectType: null, subjectId: null }), "/app/business/hiring");
  assert.equal(bizNotifTarget({ kind: "review_received", subjectType: "review", subjectId: O }), "/app/business/analytics/reputation");
  assert.equal(bizNotifTarget({ kind: "offer_hidden", subjectType: "offer", subjectId: O }), `/app/business/marketplace/offers/${O}`);
  assert.equal(bizNotifTarget({ kind: "offer_hidden", subjectType: "offer", subjectId: null }), "/app/business/marketplace");
  assert.equal(bizNotifTarget({ kind: "voucher_redeemed", subjectType: "voucher", subjectId: V }), null);
  assert.equal(bizNotifTarget({ kind: "voucher_issued", subjectType: "voucher", subjectId: V }), null);
});

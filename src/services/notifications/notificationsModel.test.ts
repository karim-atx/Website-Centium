import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLIENT_COPY,
  CLIENT_FILLS,
  CLIENT_KINDS,
  clientNotificationTarget,
  formatCount,
  formatNoticeDate,
  GENERIC_COPY,
  groupNotifications,
  MEMBER_NOTIFICATION_KINDS,
  markReadLocally,
  notificationCopy,
  notificationCursor,
  notifLook,
  notifWhen,
  parseMarkedCount,
  parseMemberNotifications,
  parseUnreadCount,
  RELEASE1_KINDS,
  unreadBadge,
  unreadCount,
  UNREAD_COUNT_CAP,
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

test("targets: the documented subject per client kind; other kinds open nothing in the client UI", () => {
  assert.equal(clientNotificationTarget({ kind: "voucher_issued", subjectType: "voucher", subjectId: V }), `/app/marketplace/vouchers/${V}`);
  assert.equal(clientNotificationTarget({ kind: "voucher_issued", subjectType: null, subjectId: null }), "/app/marketplace/rewards/mine");
  assert.equal(clientNotificationTarget({ kind: "voucher_issued", subjectType: "voucher", subjectId: "../../admin" }), "/app/marketplace/rewards/mine");
  assert.equal(clientNotificationTarget({ kind: "points_expiring", subjectType: "points", subjectId: null }), "/app/marketplace/points/history");
  assert.equal(clientNotificationTarget({ kind: "class_cancelled", subjectType: "class_session", subjectId: O }), "/app/marketplace/bookings?tab=upcoming");
  assert.equal(clientNotificationTarget({ kind: "review_prompt", subjectType: "class_session", subjectId: O }), "/app/marketplace/bookings?tab=past");
  for (const k of MEMBER_NOTIFICATION_KINDS.filter((k) => !CLIENT_KINDS.includes(k))) {
    assert.equal(clientNotificationTarget({ kind: k, subjectType: "voucher", subjectId: V }), null, k);
  }
  // the guessed subject routes are gone: an unknown kind opens nothing whatever its subject
  assert.equal(clientNotificationTarget({ kind: "x", subjectType: "points", subjectId: null }), null);
  assert.equal(clientNotificationTarget({ kind: "x", subjectType: "offer", subjectId: O }), null);
});

test("kinds: the enum in order; the client's are a member's four, never an owner's or a professional's", () => {
  assert.equal(MEMBER_NOTIFICATION_KINDS.length, 18);
  assert.deepEqual(MEMBER_NOTIFICATION_KINDS.slice(0, 4), [...RELEASE1_KINDS]);
  assert.deepEqual([...CLIENT_KINDS], ["voucher_issued", "points_expiring", "class_cancelled", "review_prompt"]);
  for (const k of CLIENT_KINDS) assert.ok((MEMBER_NOTIFICATION_KINDS as readonly string[]).includes(k), k);
  const notMine = [
    "voucher_redeemed", "offer_hidden", "application_received", "hire_offer_accepted", "hire_offer_declined", "hiring_fee_added", "gym_review_received",
    "hire_offer_received", "hired", "classes_added", "class_changed", "removed_from_team", "existing_team_invite", "instructor_review_received",
  ] as const;
  for (const k of notMine) assert.ok(!CLIENT_KINDS.includes(k), k);
  assert.equal(CLIENT_KINDS.length + notMine.length, MEMBER_NOTIFICATION_KINDS.length);
  // every client kind has a plain line and a fill
  for (const k of CLIENT_KINDS) {
    assert.ok(CLIENT_COPY[k]?.title, k);
    assert.equal(typeof CLIENT_FILLS[k], "function", k);
  }
});

test("unread count: the reader's integer, capped at 99; the badge reads 99+ at the cap", () => {
  assert.equal(UNREAD_COUNT_CAP, 99);
  assert.equal(parseUnreadCount(3), 3);
  assert.equal(parseUnreadCount("12"), 12);
  assert.equal(parseUnreadCount(99), 99);
  assert.equal(parseUnreadCount(140), 99);
  assert.equal(parseUnreadCount(0), 0);
  assert.equal(parseUnreadCount(null), 0);
  assert.equal(parseUnreadCount(-2), 0);
  assert.equal(parseUnreadCount([{ n: 3 }]), 0);
  assert.equal(unreadBadge(1), "1");
  assert.equal(unreadBadge(98), "98");
  assert.equal(unreadBadge(99), "99+");
  assert.equal(unreadBadge(parseUnreadCount(99)), "99+");
});

test("copy with payload: the documented keys interpolate; numbers with separators, dates month first", () => {
  const c = (kind: string, payload?: Record<string, unknown>) => notificationCopy({ titleKey: kind, kind, payload });
  assert.equal(formatCount(1250), "1,250");
  assert.equal(formatNoticeDate(new Date(2026, 10, 30)), "Nov 30, 2026");
  // voucher_issued: code, offer_title, points, expires_at (redeem_offer's payload)
  assert.deepEqual(c("voucher_issued", { code: "ABCD-EFGH-JKMN", offer_title: "15% off full-price items", points: 900, expires_at: "2027-01-21T10:00:00+00:00" }), {
    title: "Voucher ready",
    body: "Your voucher for 15% off full-price items is in My rewards.",
  });
  // points_expiring: points, expires_on (a date: that calendar day, not UTC midnight)
  assert.deepEqual(c("points_expiring", { points: 1250, expires_on: "2026-11-30" }), {
    title: "1,250 points expire soon",
    body: "They expire on Nov 30, 2026. Redeem them for a reward before then.",
  });
  assert.deepEqual(c("points_expiring", { points: 1, expires_on: "2026-11-30" }), { title: "1 point expires soon", body: "It expires on Nov 30, 2026. Redeem it for a reward before then." });
  assert.deepEqual(c("points_expiring", { points: "120" }), { title: "120 points expire soon", body: CLIENT_COPY.points_expiring.body });
  assert.deepEqual(c("points_expiring", { expires_on: "2026-11-30" }), { title: "Points expire soon", body: "Some of your points expire on Nov 30, 2026. Redeem them for a reward before then." });
  // class_cancelled: business_name, class_title, starts_at, reason
  const starts = new Date(2026, 10, 6, 18, 0).toISOString();
  assert.deepEqual(c("class_cancelled", { business_name: "Cedar Fitness", class_title: "Core 20", starts_at: starts, reason: "Instructor ill" }), {
    title: "Core 20 is cancelled",
    body: "Cedar Fitness cancelled Core 20 on Fri, Nov 6. Your booking is cancelled.",
  });
  assert.deepEqual(c("class_cancelled", { class_title: "Core 20" }), { title: "Core 20 is cancelled", body: CLIENT_COPY.class_cancelled.body });
  assert.equal(c("class_cancelled", { business_name: "Cedar Fitness", class_title: "Core 20" }).body, "Cedar Fitness cancelled Core 20. Your booking is cancelled.");
  // review_prompt: business_name, class_title, instructor_name
  assert.deepEqual(c("review_prompt", { business_name: "Hamra Strength Club", class_title: "Spin 45", instructor_name: "Rana Khoury" }), {
    title: "Rate your instructor",
    body: "How was Spin 45 with Rana Khoury at Hamra Strength Club?",
  });
  assert.equal(c("review_prompt", { class_title: "Spin 45", business_name: "Hamra Strength Club" }).body, "How was Spin 45 at Hamra Strength Club?");
  assert.equal(c("review_prompt", { class_title: "Spin 45", instructor_name: "Rana Khoury" }).body, "How was Spin 45 with Rana Khoury?");
});

test("copy without payload keys: the plain line, the same entry; bad values count as missing", () => {
  for (const k of CLIENT_KINDS) {
    assert.equal(notificationCopy({ titleKey: k, kind: k, payload: {} }), CLIENT_COPY[k], k);
    assert.equal(notificationCopy({ titleKey: k, kind: k }), CLIENT_COPY[k], k);
  }
  const c = (kind: string, payload: Record<string, unknown>) => notificationCopy({ titleKey: kind, kind, payload });
  assert.equal(c("points_expiring", { points: 0, expires_on: "not a date" }), CLIENT_COPY.points_expiring);
  assert.equal(c("points_expiring", { points: 2.5, expires_on: "" }), CLIENT_COPY.points_expiring);
  assert.equal(c("voucher_issued", { offer_title: "   " }), CLIENT_COPY.voucher_issued);
  assert.equal(c("review_prompt", { instructor_name: "Rana Khoury" }), CLIENT_COPY.review_prompt);
  // an unknown key on a client kind still fills by the kind
  assert.equal(notificationCopy({ titleKey: "member.points.v2", kind: "points_expiring", payload: { points: 120 } }).title, "120 points expire soon");
  // another table brings no client fills unless it passes them
  const other = { voucher_issued: { title: "Issued", body: "" } };
  assert.equal(notificationCopy({ titleKey: "voucher_issued", kind: "voucher_issued", payload: { offer_title: "X" } }, other), other.voucher_issued);
  assert.equal(notificationCopy({ titleKey: "voucher_issued", kind: "voucher_issued", payload: { offer_title: "X" } }, other, { voucher_issued: (p) => ({ body: String(p.offer_title) }) }).body, "X");
  // the generic line ignores payload
  assert.equal(notificationCopy({ titleKey: "hired", kind: "hired", payload: { business_name: "B" } }), GENERIC_COPY);
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

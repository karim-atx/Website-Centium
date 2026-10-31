import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bizNotifLook,
  bizNotifTarget,
  BUSINESS_COPY,
  BUSINESS_FILLS,
  BUSINESS_KINDS,
  CALENDAR_SYNC_KINDS,
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
  noticeMoney,
  PRO_COPY,
  PRO_FILLS,
  PRO_KINDS,
  SHARED_KINDS,
  proHubKind,
  proMemberTarget,
  parseMarkedCount,
  parseMemberNotifications,
  parseUnreadCount,
  RELEASE1_KINDS,
  unreadBadge,
  bellBadge,
  unreadCount,
  UNREAD_COUNT_CAP,
} from "./notificationsModel.ts";
import * as rt from "./notificationsModel.ts";

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
  for (const k of ["ambassador_application_approved", "ambassador_application_declined"]) {
    assert.equal(clientNotificationTarget({ kind: k, subjectType: "ambassador_application", subjectId: O }), "/app/more?open=referral", k);
  }
  for (const k of MEMBER_NOTIFICATION_KINDS.filter((k) => !CLIENT_KINDS.includes(k))) {
    assert.equal(clientNotificationTarget({ kind: k, subjectType: "voucher", subjectId: V }), null, k);
  }
  assert.equal(clientNotificationTarget({ kind: "forum_nickname_reset", subjectType: "forum_nickname", subjectId: null }), "/app/forum/nickname");
  // the guessed subject routes are gone: an unknown kind opens nothing whatever its subject
  assert.equal(clientNotificationTarget({ kind: "x", subjectType: "points", subjectId: null }), null);
  assert.equal(clientNotificationTarget({ kind: "x", subjectType: "offer", subjectId: O }), null);
});

test("kinds: the enum in order; the client's are a member's seventeen, never an owner's or a professional's own", () => {
  assert.equal(MEMBER_NOTIFICATION_KINDS.length, 31);
  assert.deepEqual(MEMBER_NOTIFICATION_KINDS.slice(0, 4), [...RELEASE1_KINDS]);
  // Release B appends the ambassador decision (20261217000000), to the applicant.
  assert.deepEqual(MEMBER_NOTIFICATION_KINDS.slice(18, 20), ["ambassador_application_approved", "ambassador_application_declined"]);
  // Round C Release 1 appends the nickname reset (20261220000000), to the member.
  assert.deepEqual(MEMBER_NOTIFICATION_KINDS.slice(20, 24), ["forum_nickname_reset", "support_resources", "image_approved", "image_rejected"]);
  // Round D · PR 1 appends the catalogue decision on a suggested food (20261222000000);
  // PR 2 a professional's reply to a logged workout, then a course published for the member.
  assert.deepEqual(MEMBER_NOTIFICATION_KINDS.slice(24, 27), ["food_submission_reviewed", "workout_log_reply", "course_published"]);
  // Round F2 · AB4 appends the no-show notices (20261225230000), to the member.
  assert.deepEqual(MEMBER_NOTIFICATION_KINDS.slice(27, 30), ["no_show_warning", "booking_paused", "booking_pause_lifted"]);
  // Round F2 appends the removed-course notice (20261226120000).
  assert.equal(MEMBER_NOTIFICATION_KINDS[30], "course_removed");
  assert.deepEqual([...CLIENT_KINDS], [
    "voucher_issued", "points_expiring", "class_cancelled", "review_prompt", "ambassador_application_approved", "ambassador_application_declined",
    "forum_nickname_reset", "support_resources", "image_approved", "image_rejected", "food_submission_reviewed", "workout_log_reply", "course_published",
    "no_show_warning", "booking_paused", "booking_pause_lifted", "course_removed",
  ]);
  for (const k of CLIENT_KINDS) assert.ok((MEMBER_NOTIFICATION_KINDS as readonly string[]).includes(k), k);
  const notMine = [
    "voucher_redeemed", "offer_hidden", "application_received", "hire_offer_accepted", "hire_offer_declined", "hiring_fee_added", "gym_review_received",
    "hire_offer_received", "hired", "classes_added", "class_changed", "removed_from_team", "existing_team_invite", "instructor_review_received",
  ] as const;
  for (const k of notMine) assert.ok(!CLIENT_KINDS.includes(k), k);
  assert.equal(CLIENT_KINDS.length + notMine.length, MEMBER_NOTIFICATION_KINDS.length);
  // Round C Release 2: where the shared kinds open on the client side.
  assert.equal(clientNotificationTarget({ kind: "support_resources", subjectType: "wellbeing", subjectId: null }), "/app/get-support");
  // 20261222080000: after a form's eating question, Get support offers recovery-sensitive mode.
  assert.equal(clientNotificationTarget({ kind: "support_resources", subjectType: "wellbeing", subjectId: null, payload: { offer_recovery_mode: true } }), "/app/get-support?recovery=1");
  assert.equal(clientNotificationTarget({ kind: "support_resources", subjectType: "wellbeing", subjectId: null, payload: { offer_recovery_mode: false } }), "/app/get-support");
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

// ---- W4 · the business inbox (B-MA.9), on the member inbox with p_kinds ----

test("business kinds: enum labels with a line and a tile; review is gym_review_received; member and professional kinds are not business rows", () => {
  for (const k of BUSINESS_KINDS) {
    assert.ok((MEMBER_NOTIFICATION_KINDS as readonly string[]).includes(k), k);
    const c = notificationCopy({ titleKey: k, kind: k }, BUSINESS_COPY);
    assert.equal(c, BUSINESS_COPY[k]);
    assert.ok(c.title.length > 0 && !c.title.includes("_"));
    assert.ok(typeof BUSINESS_FILLS[k] === "function", `a fill for ${k}`);
  }
  const biz: readonly string[] = BUSINESS_KINDS;
  assert.ok(biz.includes("gym_review_received"));
  assert.ok(!biz.includes("review_received"));
  const shared: readonly string[] = SHARED_KINDS;
  for (const k of [...CLIENT_KINDS, ...PRO_KINDS, "something_new"].filter((k) => !shared.includes(k))) assert.ok(!biz.includes(k), k);
  // the three inboxes split the enum: every label goes to exactly one (class_cancelled is the client's; the calendar also reads it),
  // except Round C Release 2's shared kinds: the support notice reaches all three, the image decisions the member and business inboxes
  // (a professional's arrive in the hub as pro.image.*).
  const all = [...CLIENT_KINDS, ...BUSINESS_KINDS, ...PRO_KINDS].filter((k) => !shared.includes(k)).sort();
  assert.deepEqual(all, MEMBER_NOTIFICATION_KINDS.filter((k) => !shared.includes(k)).sort());
  assert.deepEqual([...SHARED_KINDS], ["support_resources", "image_approved", "image_rejected"]);
  for (const k of SHARED_KINDS) assert.ok(CLIENT_KINDS.includes(k) && BUSINESS_KINDS.includes(k), k);
  assert.ok(PRO_KINDS.includes("support_resources"));
  assert.ok(!PRO_KINDS.includes("image_approved") && !PRO_KINDS.includes("image_rejected"));
  // an unknown key on a business kind reads as the kind; an unknown kind is the generic line, never the key
  assert.equal(notificationCopy({ titleKey: "biz.hiring.v2", kind: "hiring_fee_added" }, BUSINESS_COPY).title, "Hiring fee added to your Centium bill");
  assert.equal(notificationCopy({ titleKey: "biz.secret", kind: "hired" }, BUSINESS_COPY), GENERIC_COPY);
  assert.deepEqual(bizNotifLook("application_received"), { tone: "lav", glyph: "app" });
  assert.deepEqual(bizNotifLook("hire_offer_accepted"), { tone: "teal", glyph: "hire" });
  assert.deepEqual(bizNotifLook("hiring_fee_added"), { tone: "gold", glyph: "bill" });
  assert.deepEqual(bizNotifLook("hire_offer_declined"), { tone: "grey", glyph: "x" });
  assert.deepEqual(bizNotifLook("voucher_redeemed"), { tone: "blue", glyph: "qr" });
  assert.deepEqual(bizNotifLook("gym_review_received"), { tone: "gold", glyph: "star" });
  assert.deepEqual(bizNotifLook("offer_hidden"), { tone: "grey", glyph: "clock" });
  assert.deepEqual(bizNotifLook("something_new"), { tone: "grey", glyph: "clock" });
});

test("business copy: the documented payload keys fill the board's lines; a missing key keeps that part plain", () => {
  const c = (kind: string, payload: Record<string, unknown>) => notificationCopy({ titleKey: kind, kind, payload }, BUSINESS_COPY);
  assert.deepEqual(c("application_received", { professional_name: "Nour Fares", opening_title: "Sunday Spin instructor", opening_id: O }), { title: "New application · Sunday Spin instructor", body: "Nour Fares applied." });
  assert.deepEqual(c("application_received", { opening_title: "Sunday Spin instructor" }), { title: "New application · Sunday Spin instructor", body: BUSINESS_COPY.application_received.body });
  assert.deepEqual(c("hire_offer_accepted", { professional_name: "Rana", role_title: "Sunday Spin instructor" }), { title: "Rana accepted your offer", body: "They're on your team now as Sunday Spin instructor." });
  assert.deepEqual(c("hire_offer_declined", { professional_name: "Joe Abi Nader", role_title: "Saturday Spin cover" }), { title: "Joe Abi Nader declined your offer", body: "Joe Abi Nader declined Saturday Spin cover." });
  assert.deepEqual(c("hire_offer_declined", { role_title: "Saturday Spin cover" }), { title: BUSINESS_COPY.hire_offer_declined.title, body: "Your offer for Saturday Spin cover was declined." });
  // Database #38 sends the documented keys (and the extra ids); the pre-#38 `title` is no longer read.
  assert.deepEqual(c("hire_offer_declined", { professional_name: "Joe", role_title: "Saturday Spin cover", hire_offer_id: O }), { title: "Joe declined your offer", body: "Joe declined Saturday Spin cover." });
  assert.deepEqual(c("hire_offer_accepted", { professional_name: "Rana", role_title: "Sunday Spin instructor", hire_id: O, hire_offer_id: O, starts_on: "2026-11-01", sessions_not_assigned: 0 }), { title: "Rana accepted your offer", body: "They're on your team now as Sunday Spin instructor." });
  assert.deepEqual(c("hire_offer_accepted", { hire_id: O, title: "Sunday Spin instructor" }), BUSINESS_COPY.hire_offer_accepted);
  assert.equal(c("hiring_fee_added", { hiring_fee_id: O, amount: 25.6, minimum_applied: false }).body, "$25.60. Due on your next bill.");
  assert.deepEqual(c("application_received", { opening_id: O, opening_title: "Sunday Spin instructor", application_id: O, business_id: O }), { title: "New application · Sunday Spin instructor", body: BUSINESS_COPY.application_received.body });
  assert.deepEqual(c("hiring_fee_added", { amount: 25.6, currency: "USD", professional_name: "Rana Khoury", role_title: "Sunday Spin instructor" }), { title: "Hiring fee added to your Centium bill", body: "$25.60 for Rana Khoury · Sunday Spin instructor. Due on your next bill." });
  assert.equal(c("hiring_fee_added", { amount: "1250", currency: null }).body, "$1,250.00. Due on your next bill.");
  assert.equal(c("hiring_fee_added", { amount: 30, currency: "EUR", professional_name: "Rana" }).body, "€30.00 for Rana. Due on your next bill.");
  assert.deepEqual(c("hiring_fee_added", { amount: "n/a" }), BUSINESS_COPY.hiring_fee_added);
  assert.equal(c("voucher_redeemed", { offer_title: "15% off a day pass", points: 400 }).body, "A member used a voucher for 15% off a day pass.");
  assert.deepEqual(c("offer_hidden", { offer_title: "Free shaker", reason: "Misleading" }), { title: "Free shaker is hidden", body: "Hidden by Centium. Contact support for details." });
  assert.deepEqual(c("gym_review_received", { gym_name: "Friend Fitness Hamra", rating: 5, has_body: true }), { title: "New review for Friend Fitness Hamra", body: "5 stars, with a written review." });
  assert.equal(c("gym_review_received", { gym_name: "G", rating: 1, has_body: false }).body, "1 star.");
  assert.deepEqual(c("gym_review_received", { rating: 9 }), BUSINESS_COPY.gym_review_received);
  assert.equal(noticeMoney(-1, "USD"), null);
  assert.equal(noticeMoney(12, "not a code"), "$12.00");
});

test("business targets: by kind and documented subject; a non-uuid never reaches a path", () => {
  assert.equal(bizNotifTarget({ kind: "application_received", subjectType: "application", subjectId: V, payload: { opening_id: O } }), `/app/business/hiring/openings/${O}`);
  assert.equal(bizNotifTarget({ kind: "application_received", subjectType: "application", subjectId: V, payload: { opening_id: "../../admin" } }), "/app/business/hiring");
  assert.equal(bizNotifTarget({ kind: "application_received", subjectType: "application", subjectId: O }), "/app/business/hiring");
  assert.equal(bizNotifTarget({ kind: "hiring_fee_added", subjectType: "centium_charge", subjectId: V }), "/app/business/hiring/fees");
  assert.equal(bizNotifTarget({ kind: "hire_offer_accepted", subjectType: "hire_offer", subjectId: V }), "/app/business/hiring/team");
  assert.equal(bizNotifTarget({ kind: "hire_offer_declined", subjectType: "hire_offer", subjectId: V }), "/app/business/hiring");
  assert.equal(bizNotifTarget({ kind: "gym_review_received", subjectType: "gym_review", subjectId: O }), "/app/business/analytics/reputation");
  assert.equal(bizNotifTarget({ kind: "review_received", subjectType: "gym_review", subjectId: O }), null);
  assert.equal(bizNotifTarget({ kind: "offer_hidden", subjectType: "offer", subjectId: O }), `/app/business/marketplace/offers/${O}`);
  assert.equal(bizNotifTarget({ kind: "offer_hidden", subjectType: "offer", subjectId: null }), "/app/business/marketplace");
  assert.equal(bizNotifTarget({ kind: "voucher_redeemed", subjectType: "voucher", subjectId: V }), null);
  assert.equal(bizNotifTarget({ kind: "voucher_issued", subjectType: "voucher", subjectId: V }), null);
});

// ---- Release 2 · the professional's member-inbox kinds ----

test("professional kinds: the seven 'to a professional' labels, a line and a fill each; offers and invites are requests", () => {
  assert.deepEqual([...PRO_KINDS], ["hire_offer_received", "hired", "classes_added", "class_changed", "removed_from_team", "existing_team_invite", "instructor_review_received", "support_resources"]);
  // Database 20261219030000 writes a professional's ambassador decision to their hub (pro.ambassador.*):
  // the member kinds stay out of PRO_KINDS, or the hub would show the decision twice.
  for (const k of ["ambassador_application_approved", "ambassador_application_declined"]) assert.ok(!(PRO_KINDS as readonly string[]).includes(k), k);
  for (const k of PRO_KINDS) {
    assert.ok(PRO_COPY[k] && PRO_COPY[k].title.length > 0, k);
    assert.ok(typeof PRO_FILLS[k] === "function", k);
  }
  assert.deepEqual([...CALENDAR_SYNC_KINDS], ["classes_added", "class_changed", "class_cancelled", "removed_from_team"]);
  assert.equal(proHubKind("hire_offer_received"), "request");
  assert.equal(proHubKind("existing_team_invite"), "request");
  assert.equal(proHubKind("instructor_review_received"), "update");
  assert.equal(proHubKind("classes_added"), "update");
});

test("professional copy: P-MA.7's lines from the documented payload keys", () => {
  const c = (kind: string, payload: Record<string, unknown>) => notificationCopy({ titleKey: kind, kind, payload }, PRO_COPY);
  assert.deepEqual(c("hire_offer_received", { business_name: "Cedar Fitness", role_title: "HIIT instructor", pay: 70, pay_unit: "per_class", starts_on: "2026-11-02" }), {
    title: "New offer from Cedar Fitness",
    body: "HIIT instructor · $70 per class · from Mon, Nov 2. Accept or decline in Opportunities.",
  });
  assert.deepEqual(c("hire_offer_received", {}), PRO_COPY.hire_offer_received);
  assert.deepEqual(c("hired", { business_name: "Cedar Fitness", role_title: "HIIT instructor", starts_on: "2026-11-02" }), { title: "Cedar Fitness hired you", body: "HIIT instructor · starts Mon, Nov 2." });
  assert.equal(c("classes_added", { business_name: "Cedar Fitness", session_count: 3, first_starts_at: "2026-11-02T07:00:00" }).body, "Cedar Fitness added 3 classes. The first is Mon, Nov 2.");
  assert.equal(c("class_changed", { business_name: "Cedar Fitness", class_title: "HIIT 30", starts_at: "2026-11-04T07:30:00", previous_starts_at: "2026-11-04T07:00:00" }).body, "Cedar Fitness moved HIIT 30 from 7:00 AM to 7:30 AM. Your calendar is updated.");
  assert.deepEqual(c("class_cancelled", { business_name: "Cedar Fitness", class_title: "Core 20", starts_at: "2026-11-06T18:00:00" }), { title: "Core 20 on Fri, Nov 6 is cancelled", body: "Cedar Fitness cancelled this session. It's struck through in your calendar." });
  assert.equal(c("removed_from_team", { business_name: "Peak Performance Gym" }).title, "Your role at Peak Performance Gym ended");
  assert.deepEqual(c("existing_team_invite", { business_name: "Hamra Strength Club", accept_by: "2026-11-14", fee_text: "free" }), { title: "Hamra Strength Club added you to their team", body: "Accept by Nov 14, 2026 to join as existing team, free." });
  // Database #38 (the documented keys): existing_team_invite carries accept_by (a date), never expires_at;
  // send_hire_offer / accept_hire_offer send role_title; add_existing_team sends hired with the extra key source existing_team.
  assert.equal(c("existing_team_invite", { business_name: "Hamra Strength Club", business_id: "b1", invite_id: "i1", expires_at: "2026-11-14T12:00:00Z" }).body, PRO_COPY.existing_team_invite.body);
  assert.equal(c("hire_offer_received", { business_name: "Cedar Fitness", business_id: "b1", role_title: "HIIT instructor", offer_type: "role", pay: 70, pay_unit: "per_class", classes_per_month: 8, starts_on: "2026-11-02", fee_quote: 44.8, hire_offer_id: "h1" }).body, "HIIT instructor · $70 per class · from Mon, Nov 2. Accept or decline in Opportunities.");
  assert.deepEqual(c("hired", { business_name: "Cedar Fitness", professional_name: "Rana", role_title: "HIIT instructor", starts_on: "2026-11-02", hire_id: "h1", business_id: "b1", sessions_not_assigned: 0 }), { title: "Cedar Fitness hired you", body: "HIIT instructor · starts Mon, Nov 2." });
  assert.deepEqual(c("hired", { business_name: "Cedar Fitness", professional_name: "Rana", role_title: "trainer", starts_on: "2026-11-02", source: "existing_team" }), { title: "Cedar Fitness added you to their team", body: "You're on their team as existing team. No hiring fee." });
  assert.deepEqual(c("classes_added", { business_name: "Cedar Fitness", role_title: "HIIT instructor", session_count: 8, first_starts_at: "2026-11-02T07:00:00", hire_id: "h1" }), { title: PRO_COPY.classes_added.title, body: "Cedar Fitness added 8 classes. The first is Mon, Nov 2." });
  assert.deepEqual(c("instructor_review_received", { gym_name: "Hamra Strength Club", class_title: "Spin 45", rating: 5, has_body: true }), { title: "New review · 5 stars", body: "A member reviewed Spin 45 at Hamra Strength Club." });
});

test("professional targets: offers, work, the calendar day, reviews", () => {
  assert.equal(proMemberTarget({ kind: "hire_offer_received" }), "/app/pro/marketplace/opportunities/applications");
  assert.equal(proMemberTarget({ kind: "hired" }), "/app/pro/marketplace/opportunities/work");
  assert.equal(proMemberTarget({ kind: "removed_from_team" }), "/app/pro/marketplace/opportunities/work");
  assert.equal(proMemberTarget({ kind: "classes_added", payload: { first_starts_at: "2026-11-02T07:00:00" } }), "/app/pro/calendar?day=2026-11-02");
  assert.equal(proMemberTarget({ kind: "class_cancelled", payload: { starts_at: "2026-11-06T18:00:00" } }), "/app/pro/calendar?day=2026-11-06");
  assert.equal(proMemberTarget({ kind: "class_changed", payload: {} }), "/app/pro/calendar");
  assert.equal(proMemberTarget({ kind: "instructor_review_received" }), "/app/more/reviews");
});

test("the business bell's badge: attention items plus unread business notices", () => {
  assert.equal(bellBadge(0, 0), null);
  assert.equal(bellBadge(0, null), null);
  assert.equal(bellBadge(2, null), "2");
  assert.equal(bellBadge(2, 3), "5");
  assert.equal(bellBadge(0, 4), "4");
  assert.equal(bellBadge(1, 99), "99+");
  assert.equal(bellBadge(50, 60), "99+");
  assert.equal(bellBadge(40, 59), "99");
});

// ---------------------------------------------------------------------------
// Realtime (Database 73ea87b).

test("toInboxChange: INSERT / UPDATE payloads, anything else null", () => {
  assert.deepEqual(rt.toInboxChange({ eventType: "INSERT", new: { id: "n1", kind: "voucher_issued", read_at: null } }), { type: "INSERT", id: "n1", kind: "voucher_issued", readAt: null });
  assert.deepEqual(rt.toInboxChange({ eventType: "UPDATE", new: { id: "n1", kind: "voucher_issued", read_at: "2026-10-23T09:00:00Z" } }), {
    type: "UPDATE",
    id: "n1",
    kind: "voucher_issued",
    readAt: "2026-10-23T09:00:00Z",
  });
  assert.equal(rt.toInboxChange({ eventType: "DELETE", old: { id: "n1" } }), null);
  assert.equal(rt.toInboxChange(null), null);
});

test("inboxChangeShown: the screen's kinds only; no filter or no kind passes", () => {
  const c = (kind: string | null) => ({ type: "INSERT" as const, id: "x", kind, readAt: null });
  assert.equal(rt.inboxChangeShown(c("points_expiring"), CLIENT_KINDS), true);
  assert.equal(rt.inboxChangeShown(c("voucher_redeemed"), CLIENT_KINDS), false);
  assert.equal(rt.inboxChangeShown(c(null), CLIENT_KINDS), true);
  assert.equal(rt.inboxChangeShown(c("voucher_redeemed"), null), true);
});

test("applyReadChanges / hasNewRows", () => {
  const list = [
    { id: "a", readAt: null as string | null },
    { id: "b", readAt: "2026-10-23T08:00:00Z" as string | null },
  ];
  const out = rt.applyReadChanges(list, [
    { type: "UPDATE", id: "a", kind: "voucher_issued", readAt: "2026-10-23T09:00:00Z" },
    { type: "UPDATE", id: "zz", kind: "voucher_issued", readAt: "2026-10-23T09:00:00Z" },
    { type: "INSERT", id: "b", kind: "voucher_issued", readAt: null },
  ]);
  assert.deepEqual(out, [
    { id: "a", readAt: "2026-10-23T09:00:00Z" },
    { id: "b", readAt: "2026-10-23T08:00:00Z" },
  ]);
  assert.equal(out[1], list[1]);
  assert.equal(rt.hasNewRows(list, [{ type: "INSERT", id: "c", kind: null, readAt: null }]), true);
  assert.equal(rt.hasNewRows(list, [{ type: "INSERT", id: "a", kind: null, readAt: null }]), false);
  assert.equal(rt.hasNewRows(list, [{ type: "UPDATE", id: "c", kind: null, readAt: null }]), false);
});

test("mergeFirstPage: new rows on top, shown rows refreshed, loaded pages kept; no overlap replaces", () => {
  const list = [
    { id: "b", v: 1 },
    { id: "c", v: 1 },
    { id: "d", v: 1 },
  ];
  assert.deepEqual(
    rt.mergeFirstPage(list, true, {
      items: [
        { id: "a", v: 2 },
        { id: "b", v: 2 },
      ],
      more: true,
    }),
    {
      list: [
        { id: "a", v: 2 },
        { id: "b", v: 2 },
        { id: "c", v: 1 },
        { id: "d", v: 1 },
      ],
      more: true,
    }
  );
  assert.deepEqual(rt.mergeFirstPage(list, true, { items: [{ id: "x", v: 2 }], more: false }), { list: [{ id: "x", v: 2 }], more: false });
  assert.deepEqual(rt.mergeFirstPage([], false, { items: [{ id: "x", v: 2 }], more: false }), { list: [{ id: "x", v: 2 }], more: false });
});

test("ambassador decision: PLAN S3's lines; the decline names the next date (next_eligible_on) month first", () => {
  const c = (kind: string, payload?: Record<string, unknown>) => notificationCopy({ titleKey: kind, kind, payload });
  assert.deepEqual(c("ambassador_application_approved", {}), { title: "Your ambassador application", body: "You're now a Centium Ambassador." });
  assert.deepEqual(c("ambassador_application_declined", { next_eligible_on: "2027-01-26" }), {
    title: "Your ambassador application",
    body: "We've replied to your application. You can apply again from Jan 26, 2027.",
  });
  assert.equal(c("ambassador_application_declined", {}), CLIENT_COPY.ambassador_application_declined);
  assert.equal(c("ambassador_application_declined", { next_eligible_on: "soon" }), CLIENT_COPY.ambassador_application_declined);
  assert.deepEqual(notifLook("ambassador_application_approved"), { tone: "lav", glyph: "star" });
  assert.deepEqual(notifLook("ambassador_application_declined"), { tone: "lav", glyph: "app" });
});

test("Round D · DP: a suggested food's decision reads with its name and reason, opens Custom foods", () => {
  const c = (payload?: Record<string, unknown>) => notificationCopy({ titleKey: "food_submission_reviewed", kind: "food_submission_reviewed", payload });
  assert.equal(c().title, "Your food suggestion");
  assert.deepEqual(c({ status: "approved", name: "Kibbeh" }), { title: "Added to the catalogue", body: "Kibbeh is in the catalogue now, so everyone can find it." });
  assert.equal(c({ status: "rejected", name: "Kibbeh", reason_category: "duplicate" }).body, "Kibbeh wasn't added. The catalogue already has it. It's still in your own foods.");
  assert.equal(clientNotificationTarget({ kind: "food_submission_reviewed", subjectType: "food_submission", subjectId: null }), "/app/food?tab=prep&sub=foods");
  assert.deepEqual(notifLook("food_submission_reviewed"), { tone: "teal", glyph: "leaf" });
});

test("Round D: course_published names the author and the course, and opens the course", () => {
  const C = "11111111-2222-4333-8444-555555555555";
  const c = (payload?: Record<string, unknown>) => notificationCopy({ titleKey: "course_published", kind: "course_published", payload });
  assert.deepEqual(c({ course_id: C, title: "Strong knees", author_first_name: "Rana" }), { title: "Rana published a course for you", body: "Strong knees is ready to start." });
  assert.deepEqual(c({ title: "Strong knees" }), { title: CLIENT_COPY.course_published.title, body: "Strong knees is ready to start." });
  assert.equal(c({}), CLIENT_COPY.course_published);
  assert.equal(clientNotificationTarget({ kind: "course_published", subjectType: "course", subjectId: null, payload: { course_id: C } }), `/app/forum/courses/${C}`);
  assert.equal(clientNotificationTarget({ kind: "course_published", subjectType: "course", subjectId: C }), `/app/forum/courses/${C}`);
  assert.equal(clientNotificationTarget({ kind: "course_published", subjectType: "course", subjectId: null, payload: { course_id: "../x" } }), "/app/forum?tab=courses");
  assert.deepEqual(notifLook("course_published"), { tone: "lav", glyph: "app" });
});

test("Round F2: course_removed names the course when it can, and opens nothing", () => {
  const c = (payload?: Record<string, unknown>) => notificationCopy({ titleKey: "course_removed", kind: "course_removed", payload });
  assert.deepEqual(c({ title: "Strong knees" }), { title: "Course no longer available", body: "Strong knees is no longer available." });
  assert.deepEqual(c({}), { title: "Course no longer available", body: "A course you joined is no longer available." });
  assert.equal(clientNotificationTarget({ kind: "course_removed", subjectType: "course", subjectId: null, payload: { title: "Strong knees" } }), null);
});

test("Round F2 · AB4: the no-show notices name the business once the reader joins it, and open the bookings", () => {
  const B = "22222222-3333-4444-8555-666666666666";
  const row = (kind: string, payload: Record<string, unknown>) => ({ id: kind, kind, subjectType: "business", subjectId: B, actorId: null, titleKey: kind, payload, readAt: null, createdAt: "2026-11-07T18:00:00Z" });
  const rows = [row("no_show_warning", { business_id: B, no_shows: 2 }), row("booking_paused", { business_id: B, until: "2026-11-14T18:30:00Z" }), row("voucher_issued", {})];
  assert.deepEqual(rt.businessIdsToName(rows), [B]);
  const named = rt.withBusinessNames(rows, new Map([[B, "Pulse Gym"]]));
  assert.equal(named[0].payload.business_name, "Pulse Gym");
  assert.equal(named[2], rows[2]);
  assert.deepEqual(rt.businessIdsToName(named), []);
  const c = (kind: string, payload?: Record<string, unknown>) => notificationCopy({ titleKey: kind, kind, payload });
  assert.deepEqual(c("no_show_warning", named[0].payload), {
    title: "You missed 2 classes",
    body: "You missed 2 classes at Pulse Gym in the last 30 days. After 3, new bookings there pause for 7 days.",
  });
  assert.match(c("booking_paused", named[1].payload).body, /^You missed 3 classes at Pulse Gym in 30 days, so new bookings there are paused until Nov 14, .+\. Your existing bookings are kept\.$/);
  assert.match(c("booking_paused", { until: "2026-11-14T18:30:00Z" }).body, /^You missed 3 classes here in 30 days/);
  assert.equal(c("booking_pause_lifted", { business_name: "Pulse Gym" }).body, "You can book classes at Pulse Gym again.");
  assert.equal(c("booking_pause_lifted", {}), CLIENT_COPY.booking_pause_lifted);
  assert.equal(clientNotificationTarget({ kind: "booking_paused", subjectType: "business", subjectId: B }), "/app/marketplace/bookings?tab=upcoming");
  assert.equal(clientNotificationTarget({ kind: "booking_pause_lifted", subjectType: "business", subjectId: B }), "/app/marketplace");
  assert.deepEqual(notifLook("booking_paused"), { tone: "red", glyph: "x" });
});

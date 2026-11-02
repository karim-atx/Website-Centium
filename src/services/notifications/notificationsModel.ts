// Market + Share 3.0 · the member inbox, pure (C-MO.4.10 `notifClient`; the
// business inbox B-MA.9 reads the same rows in Release 2).
//
// Contract: Database 33c0bf5 (release/points-offers-and-the-public-shelf),
// migration 20261210600000_everybody_has_an_inbox.sql (no HANDOVER_API
// section; the migration comments are the contract):
// - my_notifications(p_before, p_limit, p_before_id, p_kinds) → id, kind
//   (member_notification_kind), subject_type, subject_id, actor_id, title_key,
//   payload (jsonb), read_at, created_at; the caller's own rows, newest first,
//   keyset-paged on (created_at, id), p_limit clamped to 1..200; p_kinds null
//   = every kind.
// - mark_notifications_read(p_ids uuid[] default null, p_kinds default null)
//   → integer, the count that moved (p_ids null = all of the caller's unread
//   rows, scoped to p_kinds when given).
// - my_unread_notification_count(p_kinds default null) → integer, capped at 99.
// - title_key is a KEY; the copy lives here. notify_member() writes the kind
//   name as the key when the writer passes none.
// - THE PAYLOAD CONTRACT (the migration's table): kind / subject_type /
//   payload keys, interpolated by the fills below.
//
// The reader, the cursor and the parser are the same for every inbox; each UI
// brings its own kinds, copy table, fills and target resolver (CLIENT_KINDS,
// CLIENT_COPY, CLIENT_FILLS and clientNotificationTarget here). The tones and
// glyphs are the screen script's (`NT`, `NI`).

import { formatShortDate } from "../../utils/date";
import { clock12 } from "../../utils/time12";
import { num, rows, str } from "../market/parse";
import { imageHome, imageNoticeCopy, SUPPORT_NOTICE } from "../moderation/imageCopy";
import { getSupportPath } from "../moderation/support";
import { FOOD_REVIEW_COPY, foodReviewCopy } from "../food/onlineSearchModel";
import { appLocale } from "../../i18n/format";
import { t, tk, tn } from "../../i18n/core";
import { liftedSentence, NO_SHOW_NOTICE_COPY, pausedSentence, warningSentence } from "../no-shows/noShowModel";

/** member_notification_kind, the whole enum in its declared order (20261210600000). */
export const MEMBER_NOTIFICATION_KINDS = [
  "voucher_issued",
  "voucher_redeemed",
  "points_expiring",
  "offer_hidden",
  "application_received",
  "hire_offer_received",
  "hire_offer_accepted",
  "hire_offer_declined",
  "hired",
  "classes_added",
  "class_changed",
  "class_cancelled",
  "removed_from_team",
  "gym_review_received",
  "instructor_review_received",
  "review_prompt",
  "existing_team_invite",
  "hiring_fee_added",
  // Release B (Database 20261217000000): the ambassador decision, to the applicant.
  "ambassador_application_approved",
  "ambassador_application_declined",
  // Round C Release 1 (Database 20261220000000): a moderator reset the
  // member's forum nickname (subject forum_nickname; no reason, no payload).
  "forum_nickname_reset",
  // Round C Release 2 (Database 20261221000000): the support notice (subject
  // wellbeing) and the image decisions (subject image_approval).
  "support_resources",
  "image_approved",
  "image_rejected",
  // Round D · PR 1 (Database 20261222000000): a food the member suggested for
  // the catalogue was reviewed (payload status, name, reason_category; never the note).
  "food_submission_reviewed",
  // Round D (Database 20261223010000): a professional replied to a workout
  // the member logged (subject workout_session; payload reply_id, routine).
  "workout_log_reply",
  // Round D (Database 20261223030000): a course the member is in the audience
  // of was first published (subject course; payload course_id, title,
  // author_first_name). Sent once per course.
  "course_published",
  // Round F2 · AB4 (Database 20261225230000 / 20261226060000): class
  // no-shows at a business (subject business; payload business_id, and
  // no_shows / until): the 2nd warns, the 3rd pauses new bookings for 7 days,
  // and an early end (staff, or a corrected mark) is told.
  "no_show_warning",
  "booking_paused",
  "booking_pause_lifted",
  // Round F2 (Database 20261226120000): a course the member was enrolled in
  // was deleted with its erased author (subject course, subject_id null;
  // payload title). Nothing to open.
  "course_removed",
  // Round G1 (Database 20261226170000): Premium through a professional or a
  // gym began, ends in 7 days, has ended (subject entitlement; payload via
  // 'professional' | 'gym', from_name, and ends_on, the member's local date).
  // Nothing to open.
  "premium_pass_started",
  "premium_pass_ending",
  "premium_pass_ended",
] as const;
export type MemberNotificationKind = (typeof MEMBER_NOTIFICATION_KINDS)[number];

/** member_notification_kind, Release 1 (the rest of the enum is Release 2's). */
export const RELEASE1_KINDS = ["voucher_issued", "voucher_redeemed", "points_expiring", "offer_hidden"] as const;

/**
 * The kinds addressed to a MEMBER (the client's bell and page pass these as
 * p_kinds): the four the board's client inbox draws (C-MO.4.10: points
 * expiring, session cancelled, review prompt, voucher ready). Everything else
 * in the enum goes to an offer's owner / a business (voucher_redeemed,
 * offer_hidden, application_received, hire_offer_accepted / _declined,
 * hiring_fee_added, gym_review_received) or to a professional
 * (hire_offer_received, hired, classes_added, class_changed,
 * removed_from_team, existing_team_invite, instructor_review_received), so it
 * never lights a member's bell. Release B adds the ambassador decision
 * (admin_review_ambassador_application → notify_member, subject
 * ambassador_application), addressed to the applicant: a member's kind,
 * read on the client's page (not drawn on the board; PLAN S3's lines).
 */
export const CLIENT_KINDS: readonly MemberNotificationKind[] = [
  "voucher_issued",
  "points_expiring",
  "class_cancelled",
  "review_prompt",
  "ambassador_application_approved",
  "ambassador_application_declined",
  "forum_nickname_reset",
  "support_resources",
  "image_approved",
  "image_rejected",
  "food_submission_reviewed",
  // Round D · TR22: a professional's reply to a logged workout.
  "workout_log_reply",
  // Round D · courses: a course for the member was published.
  "course_published",
  // Round F2 · AB4: the no-show warning, the booking pause and its early end.
  "no_show_warning",
  "booking_paused",
  "booking_pause_lifted",
  // Round F2: a course the member was in is gone.
  "course_removed",
  // Round G1: Premium through a professional or a gym.
  "premium_pass_started",
  "premium_pass_ending",
  "premium_pass_ended",
];

/** my_unread_notification_count's cap: the reader never counts past it. */
export const UNREAD_COUNT_CAP = 99;

/** my_unread_notification_count's integer (≥ 0, at most the cap); anything else is 0. */
export function parseUnreadCount(data: unknown): number {
  const n = num(data);
  return n !== null && Number.isInteger(n) && n > 0 ? Math.min(n, UNREAD_COUNT_CAP) : 0;
}

/** The count as shown: "99+" at the cap (the reader stops counting there). */
export const unreadBadge = (n: number): string => (n >= UNREAD_COUNT_CAP ? `${UNREAD_COUNT_CAP}+` : String(Math.max(0, Math.floor(n))));

/**
 * The business bell's badge (Karim): the attention items plus the unread
 * business notices. "99+" once the notices reach the reader's cap (the true
 * total is unknown past it) or the sum passes 99; null when there is nothing.
 */
export function bellBadge(attention: number, unread: number | null | undefined): string | null {
  const notices = Math.max(0, Math.floor(unread ?? 0));
  const total = Math.max(0, Math.floor(attention)) + notices;
  if (total === 0) return null;
  return notices >= UNREAD_COUNT_CAP || total > UNREAD_COUNT_CAP ? `${UNREAD_COUNT_CAP}+` : String(total);
}

/** One my_notifications row. `kind` stays a string so a Release 2 kind still parses. */
export interface MemberNotification {
  id: string;
  kind: string;
  subjectType: string | null;
  subjectId: string | null;
  actorId: string | null;
  titleKey: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export function parseMemberNotifications(data: unknown): MemberNotification[] {
  return rows(data).flatMap((r) => {
    const id = str(r.id);
    const createdAt = str(r.created_at);
    const kind = str(r.kind);
    if (!id || !createdAt || !kind) return [];
    const p = r.payload;
    return [
      {
        id,
        kind,
        subjectType: str(r.subject_type),
        subjectId: str(r.subject_id),
        actorId: str(r.actor_id),
        titleKey: str(r.title_key) ?? kind,
        payload: p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : {},
        readAt: str(r.read_at),
        createdAt,
      },
    ];
  });
}

/**
 * Round F2 · AB4: the kinds whose sentence names the business ("You missed 2
 * classes at {gym}…") but whose payload carries only business_id. The reader
 * joins business_name on from the subject (subject_type 'business').
 */
export const BUSINESS_NAMED_KINDS: readonly string[] = ["no_show_warning", "booking_paused", "booking_pause_lifted"];

/** The business ids those rows need a name for (none already named). */
export function businessIdsToName(items: readonly MemberNotification[]): string[] {
  const ids = items.flatMap((n) => {
    if (!BUSINESS_NAMED_KINDS.includes(n.kind) || typeof n.payload.business_name === "string") return [];
    const id = typeof n.payload.business_id === "string" ? n.payload.business_id : n.subjectType === "business" ? n.subjectId : null;
    return id ? [id] : [];
  });
  return [...new Set(ids)];
}

/** The rows with business_name joined into the payload where the name is known. */
export function withBusinessNames(items: MemberNotification[], names: ReadonlyMap<string, string>): MemberNotification[] {
  if (names.size === 0) return items;
  return items.map((n) => {
    if (!BUSINESS_NAMED_KINDS.includes(n.kind) || typeof n.payload.business_name === "string") return n;
    const id = typeof n.payload.business_id === "string" ? n.payload.business_id : n.subjectType === "business" ? n.subjectId : null;
    const name = id ? names.get(id) : undefined;
    return name ? { ...n, payload: { ...n.payload, business_name: name } } : n;
  });
}

/** The (p_before, p_before_id) keyset cursor: the last row shown. */
export interface NotificationCursor {
  before: string;
  beforeId: string;
}

export function notificationCursor(list: readonly MemberNotification[]): NotificationCursor | null {
  const last = list[list.length - 1];
  return last ? { before: last.createdAt, beforeId: last.id } : null;
}

/** mark_notifications_read's integer (the count that moved); anything else is 0. */
export function parseMarkedCount(data: unknown): number {
  const n = typeof data === "number" ? data : typeof data === "string" && data.trim() !== "" ? Number(data) : NaN;
  return Number.isInteger(n) && n > 0 ? n : 0;
}

// ---- copy ----

export interface NotificationCopy {
  title: string;
  /** "" = no body line. */
  body: string;
}

/** Keyed by title_key (the kind name is the default key). */
export type NotificationCopyTable = Readonly<Record<string, NotificationCopy>>;

/**
 * The client's lines WITHOUT payload: the board's titles where they don't
 * depend on a payload value, and the line shown when a documented key is
 * missing (CLIENT_FILLS adds the values). voucher_redeemed and offer_hidden
 * go to an offer's owner (not in CLIENT_KINDS, so the client page never
 * reads them; the business page reads BUSINESS_COPY); Release 1 keeps a line
 * here for every Release 1 kind.
 */
export const CLIENT_COPY: NotificationCopyTable = {
  voucher_issued: { title: tk("Voucher ready"), body: tk("Your voucher is in My rewards.") },
  points_expiring: { title: tk("Points expire soon"), body: tk("Some of your points expire soon. Redeem them for a reward before they lapse.") },
  class_cancelled: { title: tk("Class cancelled"), body: tk("One of your booked classes is cancelled.") },
  review_prompt: { title: tk("Rate your instructor"), body: tk("How was your class? Tell others what it was like.") },
  voucher_redeemed: { title: tk("Voucher redeemed"), body: tk("A member used a voucher for one of your offers.") },
  offer_hidden: { title: tk("Offer hidden"), body: tk("Hidden by Centium. Contact support for details.") },
  // PLAN S3 "Notification" (Release B).
  ambassador_application_approved: { title: tk("Your ambassador application"), body: tk("You're now a Centium Ambassador.") },
  ambassador_application_declined: { title: tk("Your ambassador application"), body: tk("We've replied to your application.") },
  // Round C S4: the reset carries no reason, so none is shown.
  forum_nickname_reset: { title: tk("Your forum nickname was reset"), body: tk("A moderator reset your nickname. Choose a new one to keep posting.") },
  // Round C Release 2 (Database 20261221040000 / 030000): image approval
  // (payload surface, reason_category) and the private support notice.
  support_resources: { title: SUPPORT_NOTICE.title, body: SUPPORT_NOTICE.body },
  image_approved: imageNoticeCopy(true, null, null),
  image_rejected: imageNoticeCopy(false, null, null),
  // Round D · DP: the catalogue decision on a food the member suggested.
  food_submission_reviewed: FOOD_REVIEW_COPY,
  // Round D · TR22 (D-S5). The payload carries no name, so "Your coach".
  workout_log_reply: { title: tk("Your coach replied to your workout"), body: tk("Read it in your workout history.") },
  // Round D · courses (payload course_id, title, author_first_name).
  course_published: { title: tk("A new course for you"), body: tk("Open it in Community › Courses.") },
  // Round F2 · AB4 (services/no-shows): the business's name joins the payload
  // from the subject when it can be read (withBusinessNames, ./index.ts).
  no_show_warning: NO_SHOW_NOTICE_COPY.no_show_warning,
  booking_paused: NO_SHOW_NOTICE_COPY.booking_paused,
  booking_pause_lifted: NO_SHOW_NOTICE_COPY.booking_pause_lifted,
  // Round F2 (payload title; Karim approved the copy 2026-10-31).
  course_removed: { title: tk("Course no longer available"), body: tk("A course you joined is no longer available.") },
  // Round G1 (DB_G1_HANDOVER "Notices", copy for Karim's review). Without
  // the payload: the handover's titles, "Your Premium is ending" (ours, for
  // a row with no ends_on) and the ended notice's last sentence.
  premium_pass_started: { title: tk("You have Centium Premium"), body: "" },
  premium_pass_ending: { title: tk("Your Premium is ending"), body: "" },
  premium_pass_ended: { title: tk("Your Premium has ended"), body: tk("Everything you logged is still here.") },
};

/** A key no table knows: a safe line, never the raw key. */
export const GENERIC_COPY: NotificationCopy = { title: tk("New notification"), body: "" };

/**
 * A line's payload values: what the documented keys say, or nothing (the
 * table's line stays). Each part falls back on its own: a missing key keeps
 * that part's plain line, never a half-filled sentence.
 */
export type NotificationFill = (payload: Readonly<Record<string, unknown>>) => Partial<NotificationCopy>;
export type NotificationFillTable = Readonly<Record<string, NotificationFill>>;

// ---- payload readers and formats ----

/** A non-blank string value, trimmed. */
const pText = (p: Readonly<Record<string, unknown>>, k: string): string | null => {
  const v = p[k];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
/** A positive whole number (a number or a numeric string). */
const pCount = (p: Readonly<Record<string, unknown>>, k: string): number | null => {
  const n = num(p[k]);
  return n !== null && Number.isInteger(n) && n > 0 ? n : null;
};
/**
 * A date or timestamp value: a bare "2026-11-30" (a `date`) is that calendar
 * day where the member is (not UTC midnight, which reads as the day before
 * west of Greenwich); a timestamptz is its instant.
 */
const pDate = (p: Readonly<Record<string, unknown>>, k: string): Date | null => {
  const v = pText(p, k);
  if (!v) return null;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  const d = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
/** "1,250". */
export const formatCount = (n: number): string => n.toLocaleString(appLocale("en-US"));
/** Month first: "Nov 30, 2026". */
export const formatNoticeDate = (d: Date): string => formatShortDate(d, { month: "short", day: "numeric", year: "numeric" });
/** Month first with the weekday: "Fri, Nov 6". */
const formatNoticeDay = (d: Date): string => formatShortDate(d, { weekday: "short", month: "short", day: "numeric" });

/**
 * The client kinds' payload values (the migration's table):
 * - voucher_issued (voucher; code, offer_title, points, expires_at):
 *   offer_title → "Your voucher for {offer_title} is in My rewards.";
 * - points_expiring (points; points, expires_on): points → "{n} points expire
 *   soon" ("1 point expires soon"); expires_on → "They expire on {Nov 30,
 *   2026}. Redeem them for a reward before then." (the board's words);
 * - class_cancelled (class_session; business_name, class_title, starts_at,
 *   reason): class_title → "{class_title} is cancelled"; business_name +
 *   class_title (+ starts_at) → "{business} cancelled {class} on {Fri, Nov
 *   6}. Your booking is cancelled.";
 * - review_prompt (class_session; business_name, class_title,
 *   instructor_name): class_title → "How was {class} with {instructor} at
 *   {business}?" (either name left out when missing);
 * - ambassador_application_approved (ambassador_application; no keys): the
 *   plain line;
 * - ambassador_application_declined (ambassador_application;
 *   next_eligible_on, a date): "We've replied to your application. You can
 *   apply again from {Jan 26, 2027}." The reason itself stays on the status
 *   card (it is not in the payload).
 */
export const CLIENT_FILLS: NotificationFillTable = {
  voucher_issued: (p) => {
    const offer = pText(p, "offer_title");
    return offer ? { body: t("Your voucher for {offer} is in My rewards.", { offer }) } : {};
  },
  points_expiring: (p) => {
    const n = pCount(p, "points");
    const on = pDate(p, "expires_on");
    const out: Partial<NotificationCopy> = {};
    if (n !== null) out.title = tn(n, "{n} point expires soon", "{n} points expire soon", { n: formatCount(n) });
    if (on) {
      const date = formatNoticeDate(on);
      out.body =
        n === 1
          ? t("It expires on {date}. Redeem it for a reward before then.", { date })
          : n !== null
            ? t("They expire on {date}. Redeem them for a reward before then.", { date })
            : t("Some of your points expire on {date}. Redeem them for a reward before then.", { date });
    }
    return out;
  },
  class_cancelled: (p) => {
    const cls = pText(p, "class_title");
    const biz = pText(p, "business_name");
    const at = pDate(p, "starts_at");
    const out: Partial<NotificationCopy> = {};
    if (cls) out.title = t("{class} is cancelled", { class: cls });
    if (cls && biz)
      out.body = at
        ? t("{business} cancelled {class} on {day}. Your booking is cancelled.", { business: biz, class: cls, day: formatNoticeDay(at) })
        : t("{business} cancelled {class}. Your booking is cancelled.", { business: biz, class: cls });
    return out;
  },
  review_prompt: (p) => {
    const cls = pText(p, "class_title");
    if (!cls) return {};
    const who = pText(p, "instructor_name");
    const biz = pText(p, "business_name");
    const vars = { class: cls, instructor: who ?? "", business: biz ?? "" };
    return {
      body:
        who && biz
          ? t("How was {class} with {instructor} at {business}?", vars)
          : who
            ? t("How was {class} with {instructor}?", vars)
            : biz
              ? t("How was {class} at {business}?", vars)
              : t("How was {class}?", vars),
    };
  },
  ambassador_application_approved: () => ({}),
  forum_nickname_reset: () => ({}),
  support_resources: () => ({}),
  image_approved: (p) => (p.surface ? imageNoticeCopy(true, p.surface, null) : {}),
  image_rejected: (p) => (p.surface || p.reason_category ? imageNoticeCopy(false, p.surface, p.reason_category) : {}),
  food_submission_reviewed: (p) => foodReviewCopy(p.status, p.name, p.reason_category),
  workout_log_reply: (p) => {
    const routine = pText(p, "routine");
    return routine ? { body: t("About {routine}. Read it in your workout history.", { routine }) } : {};
  },
  course_published: (p) => {
    const title = pText(p, "title");
    const who = pText(p, "author_first_name");
    const out: Partial<NotificationCopy> = {};
    if (who) out.title = t("{name} published a course for you", { name: who });
    if (title) out.body = t("{title} is ready to start.", { title });
    return out;
  },
  ambassador_application_declined: (p) => {
    const on = pDate(p, "next_eligible_on");
    return on ? { body: t("We've replied to your application. You can apply again from {date}.", { date: formatNoticeDate(on) }) } : {};
  },
  // Round F2 · AB4: payload business_id (+ no_shows / until); business_name
  // is joined on by the reader (./index.ts) and may be missing.
  no_show_warning: (p) => {
    const gym = pText(p, "business_name");
    return gym ? { body: warningSentence(gym) } : {};
  },
  booking_paused: (p) => {
    const gym = pText(p, "business_name");
    const until = pText(p, "until");
    return gym || until ? { body: pausedSentence(gym, until) } : {};
  },
  booking_pause_lifted: (p) => {
    const gym = pText(p, "business_name");
    return gym ? { body: liftedSentence(gym) } : {};
  },
  course_removed: (p) => {
    const title = pText(p, "title");
    return title ? { body: t("{title} is no longer available.", { title }) } : {};
  },
  // Round G1: payload via ('professional' | 'gym'), from_name; ending also ends_on.
  premium_pass_started: (p) => {
    const name = pText(p, "from_name");
    if (!name) return {};
    return { body: p.via === "gym" ? t("{name} includes Centium Premium with your membership.", { name }) : t("{name} included Centium Premium for you.", { name }) };
  },
  premium_pass_ending: (p) => {
    const on = pDate(p, "ends_on");
    const name = pText(p, "from_name");
    if (!on) return {};
    const date = formatNoticeDate(on);
    return { title: t("Your Premium ends on {date}", { date }), ...(name ? { body: t("Premium through {name} ends on {date}.", { name, date }) } : {}) };
  },
  premium_pass_ended: (p) => {
    const name = pText(p, "from_name");
    return name ? { body: t("Premium through {name} has ended. Everything you logged is still here.", { name }) } : {};
  },
};

function own<T>(table: Readonly<Record<string, T>>, k: string): T | null {
  return Object.prototype.hasOwnProperty.call(table, k) ? table[k] : null;
}

/**
 * A table's line in the chosen language. The tables hold English keys (tk);
 * the line is translated where it is read. Unchanged (English, or no
 * catalogue entry): the table's own object comes back.
 */
function translated(c: NotificationCopy): NotificationCopy {
  const title = t(c.title);
  const body = c.body ? t(c.body) : c.body;
  return title === c.title && body === c.body ? c : { title, body };
}

/** Each inbox's copy table brings its own fills (CLIENT_, BUSINESS_, PRO_); any other table none. */
function defaultFills(table: NotificationCopyTable): NotificationFillTable | null {
  if (table === CLIENT_COPY) return CLIENT_FILLS;
  if (table === BUSINESS_COPY) return BUSINESS_FILLS;
  if (table === PRO_COPY) return PRO_FILLS;
  return null;
}

/**
 * title_key's line, else the kind's, else the generic line; then the payload
 * values from `fills` (by the same key) when the row carries a payload. The
 * table's own entry comes back unchanged when nothing fills. CLIENT_COPY,
 * BUSINESS_COPY and PRO_COPY bring their own fills by default; another table
 * brings its own (or none).
 */
export function notificationCopy(
  n: Pick<MemberNotification, "titleKey" | "kind"> & { payload?: Readonly<Record<string, unknown>> },
  table: NotificationCopyTable = CLIENT_COPY,
  fills: NotificationFillTable | null = defaultFills(table)
): NotificationCopy {
  const k = own(table, n.titleKey) ? n.titleKey : own(table, n.kind) ? n.kind : null;
  if (k === null) return translated(GENERIC_COPY);
  const base = translated(table[k]);
  const fill = fills ? own(fills, k) : null;
  if (!fill || !n.payload) return base;
  const f = fill(n.payload);
  if (!f.title && !f.body) return base;
  return { title: f.title || base.title, body: f.body || base.body };
}

// ---- where a row opens (client) ----

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The client route a row opens, or null (the row only marks read), from the
 * documented subject per kind (the migration's table):
 * voucher_issued (voucher) → the voucher, else My rewards;
 * points_expiring (points) → Points history;
 * class_cancelled (class_session) → My bookings › Upcoming;
 * review_prompt (class_session) → My bookings › Past (the session id isn't a
 * booking id, so the calendar's ?rate=<booking> link can't be built);
 * ambassador_application_approved / _declined (ambassador_application) →
 * More with the Referral popup open, where the status card is;
 * support_resources → Get support, offering recovery-sensitive mode when the
 * payload's offer_recovery_mode is true (20261222080000);
 * any other kind (not a member's) → nothing in the client UI.
 */
export function clientNotificationTarget(
  n: Pick<MemberNotification, "kind" | "subjectType" | "subjectId"> & { payload?: Readonly<Record<string, unknown>> }
): string | null {
  const id = n.subjectId && UUID.test(n.subjectId) ? n.subjectId : null;
  switch (n.kind) {
    case "voucher_issued":
      return n.subjectType === "voucher" && id ? `/app/marketplace/vouchers/${id}` : "/app/marketplace/rewards/mine";
    case "points_expiring":
      return "/app/marketplace/points/history";
    case "class_cancelled":
      return "/app/marketplace/bookings?tab=upcoming";
    case "review_prompt":
      return "/app/marketplace/bookings?tab=past";
    case "ambassador_application_approved":
    case "ambassador_application_declined":
      return "/app/more?open=referral";
    case "forum_nickname_reset":
      return "/app/forum/nickname";
    case "support_resources":
      // 20261222080000: after a form's eating question, with the offer to turn on recovery-sensitive mode.
      return getSupportPath(n.payload?.offer_recovery_mode === true);
    case "image_approved":
    case "image_rejected":
      return imageHome(n.payload?.surface, "member");
    case "food_submission_reviewed":
      // Food › Custom › Custom foods, where the food (and the suggestion) lives.
      return "/app/food?tab=prep&sub=foods";
    case "workout_log_reply":
      // Round D · TR22: the session in Workout › History, opened.
      return n.subjectType === "workout_session" && id ? `/app/workout?tab=history&session=${id}` : "/app/workout?tab=history";
    case "course_published": {
      // Round D: the course's page (payload course_id, else the subject).
      const course = typeof n.payload?.course_id === "string" && UUID.test(n.payload.course_id) ? n.payload.course_id : n.subjectType === "course" ? id : null;
      return course ? `/app/forum/courses/${course}` : "/app/forum?tab=courses";
    }
    case "no_show_warning":
    case "booking_paused":
      // Round F2 · AB4: the member's bookings (the ones kept are there).
      return "/app/marketplace/bookings?tab=upcoming";
    case "booking_pause_lifted":
      return "/app/marketplace";
    case "course_removed":
      // Round F2: the course is gone, so there is nothing to open.
      return null;
    case "premium_pass_started":
    case "premium_pass_ending":
    case "premium_pass_ended":
      // Round G1: subject entitlement, nothing to open.
      return null;
    default:
      return null;
  }
}

// ---- look ----

export type NotifTone = "lav" | "slate" | "blue" | "teal" | "red" | "gold" | "grey";
export type NotifGlyph = "hire" | "app" | "clock" | "x" | "user" | "star" | "qr" | "leaf" | "bill";

/** `NT`: the 38 tile's [fill, ink] per tone (light; fixed identity hues). */
export const NOTIF_TONES: Record<NotifTone, [string, string]> = {
  lav: ["#EEEAF8", "#7D67D9"],
  slate: ["#ECEFF5", "#667BB1"],
  blue: ["#EBF2F4", "#5A859E"],
  teal: ["#E6F1EF", "#4F8F8A"],
  red: ["#FBE7E4", "#C0392B"],
  gold: ["#FDF3D6", "#9A7414"],
  grey: ["#F5F5F6", "#8C8378"],
};

/** `NI`: the 18 glyph paths (stroke 1.9, 24 viewBox). */
export const NOTIF_GLYPHS: Record<NotifGlyph, string> = {
  hire: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2ZM9 12l2 2 4-4",
  app: "M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z",
  clock: "M12 6v6l4 2M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  x: "M18 6 6 18M6 6l12 12",
  user: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 11h-6",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  qr: "M3 3h5v5H3zM16 3h5v5h-5zM3 16h5v5H3zM21 16h-3a2 2 0 0 0-2 2v3M12 7v3a2 2 0 0 1-2 2H7",
  leaf: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10ZM2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12",
  bill: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11",
};

/** The kinds to their tile, as the boards draw them (voucher redeemed: P-MA.7's teal); anything else is grey with the clock. */
export function notifLook(kind: string): { tone: NotifTone; glyph: NotifGlyph } {
  switch (kind) {
    case "points_expiring":
      return { tone: "gold", glyph: "leaf" };
    case "class_cancelled":
      return { tone: "red", glyph: "x" };
    case "review_prompt":
      return { tone: "lav", glyph: "star" };
    case "voucher_issued":
    case "voucher_redeemed":
      return { tone: "teal", glyph: "qr" };
    case "ambassador_application_approved":
      return { tone: "lav", glyph: "star" };
    case "ambassador_application_declined":
      return { tone: "lav", glyph: "app" };
    case "forum_nickname_reset":
      return { tone: "lav", glyph: "user" };
    case "support_resources":
      return { tone: "teal", glyph: "leaf" };
    case "image_approved":
      return { tone: "teal", glyph: "app" };
    case "image_rejected":
      return { tone: "red", glyph: "x" };
    case "food_submission_reviewed":
      return { tone: "teal", glyph: "leaf" };
    case "workout_log_reply":
      return { tone: "lav", glyph: "user" };
    case "course_published":
      return { tone: "lav", glyph: "app" };
    case "no_show_warning":
      return { tone: "gold", glyph: "clock" };
    case "booking_paused":
      return { tone: "red", glyph: "x" };
    case "booking_pause_lifted":
      return { tone: "teal", glyph: "app" };
    case "course_removed":
      return { tone: "lav", glyph: "app" };
    case "premium_pass_started":
      return { tone: "lav", glyph: "star" };
    case "premium_pass_ending":
      return { tone: "gold", glyph: "clock" };
    case "premium_pass_ended":
      return { tone: "lav", glyph: "app" };
    default:
      return { tone: "grey", glyph: "clock" };
  }
}

const key =(d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** `n.when`: today "9:02 AM"; this past week the weekday "Fri"; older "Oct 16" (or "Oct 16, 2025"). */
export function notifWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (key(d) === key(now)) return clock12(d);
  const days = (now.getTime() - d.getTime()) / 86400000;
  if (days < 7 && days > 0) return formatShortDate(d, { weekday: "short" });
  return formatShortDate(d, d.getFullYear() === now.getFullYear() ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/** Today / Earlier in the reader's order (created_at desc, id desc); an empty group is left out. */
export function groupNotifications<T extends { createdAt: string }>(list: readonly T[], now: Date = new Date()): { heading: "Today" | "Earlier"; items: T[] }[] {
  const today = list.filter((n) => key(new Date(n.createdAt)) === key(now));
  const earlier = list.filter((n) => key(new Date(n.createdAt)) !== key(now));
  return [
    ...(today.length ? [{ heading: "Today" as const, items: today }] : []),
    ...(earlier.length ? [{ heading: "Earlier" as const, items: earlier }] : []),
  ];
}

export const unreadCount = (list: readonly { readAt: string | null }[]): number => list.filter((n) => !n.readAt).length;

/** Marks `ids` (null = every row) read locally, as mark_notifications_read did on the server. */
export function markReadLocally<T extends { id: string; readAt: string | null }>(list: readonly T[], ids: ReadonlySet<string> | null, at: string): T[] {
  return list.map((n) => (!n.readAt && (!ids || ids.has(n.id)) ? { ...n, readAt: at } : n));
}

// ---------------------------------------------------------------------------
// Market + Share 3.0 · W4 · the business inbox (B-MA.9 `notifBiz`, D-38),
// Release 2, on the member inbox (Database 20261210600000, HANDOVER_API
// Release 1 "Notifications"): the page reads my_notifications(p_kinds =
// BUSINESS_KINDS), Mark all read is mark_notifications_read(null,
// BUSINESS_KINDS), and the bell row's count is
// my_unread_notification_count(BUSINESS_KINDS). The reader, cursor, parser,
// grouping and local mark are the ones above.
// Writers (Database #38 sends the documented keys, HANDOVER_API "The
// notification payloads now match the contract"): redeem_offer
// (voucher_redeemed), admin_set_offer_hidden (offer_hidden), apply_to_opening
// (application_received: subject application; professional_name,
// opening_title, opening_id), accept_hire_offer (hire_offer_accepted: subject
// hire_offer; professional_name, role_title — and hiring_fee_added: subject
// centium_charge; amount, currency, professional_name, role_title),
// decline_hire_offer (hire_offer_declined: professional_name, role_title) and
// the gym_reviews trigger (gym_review_received: venue reviews only; gym_name,
// rating, has_body).

/**
 * The kinds that reach a business owner (the migration's payload table):
 * Release 1's owner kinds, the hiring kinds addressed to the business, and
 * gym_review_received ("to the BUSINESS"). The rest of the enum goes to a
 * member (CLIENT_KINDS) or a professional (PRO_KINDS).
 */
export const BUSINESS_KINDS: readonly MemberNotificationKind[] = [
  "voucher_redeemed",
  "offer_hidden",
  "application_received",
  "hire_offer_accepted",
  "hire_offer_declined",
  "hiring_fee_added",
  "gym_review_received",
  // Round C Release 2: an owner's own images and the support notice reach
  // them here (Database: "add the kinds to BUSINESS_KINDS").
  "support_resources",
  "image_approved",
  "image_rejected",
];

/**
 * The business lines without payload: the board's titles where they don't
 * name a person, a role or a class, and the line shown when a documented key
 * is missing (BUSINESS_FILLS adds the values).
 */
export const BUSINESS_COPY: NotificationCopyTable = {
  // Round C Release 2 (Database 20261221040000 / 030000): image approval
  // (payload surface, reason_category) and the private support notice.
  support_resources: { title: SUPPORT_NOTICE.title, body: SUPPORT_NOTICE.body },
  image_approved: imageNoticeCopy(true, null, null),
  image_rejected: imageNoticeCopy(false, null, null),
  application_received: { title: tk("New application"), body: tk("A professional applied to one of your openings.") },
  hire_offer_accepted: { title: tk("Your offer was accepted"), body: tk("They're on your team now.") },
  hire_offer_declined: { title: tk("Your offer was declined"), body: tk("You can offer the role to someone else.") },
  hiring_fee_added: { title: tk("Hiring fee added to your Centium bill"), body: tk("Due on your next bill.") },
  voucher_redeemed: { title: tk("Voucher redeemed at the front desk"), body: tk("A member used a voucher for one of your offers.") },
  offer_hidden: { title: tk("Offer hidden"), body: tk("Hidden by Centium. Contact support for details.") },
  gym_review_received: { title: tk("New review"), body: tk("A member left you a review.") },
};

/** "$25.60" (fees always show cents, as feeMoney); another currency with its own symbol. Null when the amount isn't a number. */
export function noticeMoney(amount: unknown, currency: unknown): string | null {
  const n = num(amount);
  if (n === null || n < 0) return null;
  const code = typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency.trim()) ? currency.trim().toUpperCase() : "USD";
  if (code === "USD") return "$" + n.toLocaleString(appLocale("en-US"), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  try {
    return n.toLocaleString(appLocale("en-US"), { style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return null;
  }
}

/** The role a hiring row names: payload role_title (the documented key; Database #38 corrected the writers). */
const roleOf = (p: Readonly<Record<string, unknown>>): string | null => pText(p, "role_title");

/** The rating, 1–5; null outside it. */
const starsOf = (p: Readonly<Record<string, unknown>>): number | null => {
  const r = pCount(p, "rating");
  return r !== null && r <= 5 ? r : null;
};

/**
 * The business kinds' payload values (the migration's table; B-MA.9's
 * wording where the board draws the row):
 * - application_received (application; professional_name, opening_title,
 *   opening_id): "New application · {opening_title}" / "{name} applied.";
 * - hire_offer_accepted (hire_offer; professional_name, role_title): "{name}
 *   accepted your offer" / "They're on your team now as {role_title}.";
 * - hire_offer_declined (hire_offer; same keys): "{name} declined your
 *   offer" / "{name} declined {role_title}.";
 * - hiring_fee_added (centium_charge; amount, currency, professional_name,
 *   role_title): "{$25.60} for {name} · {role}. Due on your next bill.";
 * - voucher_redeemed (voucher; offer_title, points; actor = the member):
 *   "A member used a voucher for {offer_title}." (points not shown);
 * - offer_hidden (offer; offer_title, reason): "{offer_title} is hidden" /
 *   "Hidden by Centium. Contact support for details." (Karim; reason never shown);
 * - gym_review_received (gym_review; gym_name, rating, has_body): "New review
 *   for {gym_name}" / "5 stars, with a written review." ("5 stars." without).
 */
export const BUSINESS_FILLS: NotificationFillTable = {
  support_resources: () => ({}),
  image_approved: (p) => (p.surface ? imageNoticeCopy(true, p.surface, null) : {}),
  image_rejected: (p) => (p.surface || p.reason_category ? imageNoticeCopy(false, p.surface, p.reason_category) : {}),
  application_received: (p) => {
    const role = pText(p, "opening_title");
    const who = pText(p, "professional_name");
    const out: Partial<NotificationCopy> = {};
    if (role) out.title = t("New application · {role}", { role });
    if (who) out.body = t("{name} applied.", { name: who });
    return out;
  },
  hire_offer_accepted: (p) => {
    const who = pText(p, "professional_name");
    const role = roleOf(p);
    const out: Partial<NotificationCopy> = {};
    if (who) out.title = t("{name} accepted your offer", { name: who });
    if (role) out.body = t("They're on your team now as {role}.", { role });
    return out;
  },
  hire_offer_declined: (p) => {
    const who = pText(p, "professional_name");
    const role = roleOf(p);
    const out: Partial<NotificationCopy> = {};
    if (who) out.title = t("{name} declined your offer", { name: who });
    if (who && role) out.body = t("{name} declined {role}.", { name: who, role });
    else if (role) out.body = t("Your offer for {role} was declined.", { role });
    return out;
  },
  hiring_fee_added: (p) => {
    const money = noticeMoney(p.amount, p.currency);
    if (!money) return {};
    const who = pText(p, "professional_name");
    const role = roleOf(p);
    if (!who) return { body: t("{amount}. Due on your next bill.", { amount: money }) };
    return {
      body: role
        ? t("{amount} for {name} · {role}. Due on your next bill.", { amount: money, name: who, role })
        : t("{amount} for {name}. Due on your next bill.", { amount: money, name: who }),
    };
  },
  voucher_redeemed: (p) => {
    const offer = pText(p, "offer_title");
    return offer ? { body: t("A member used a voucher for {offer}.", { offer }) } : {};
  },
  offer_hidden: (p) => {
    const offer = pText(p, "offer_title");
    return offer ? { title: t("{offer} is hidden", { offer }) } : {};
  },
  gym_review_received: (p) => {
    const gym = pText(p, "gym_name");
    const stars = starsOf(p);
    const out: Partial<NotificationCopy> = {};
    if (gym) out.title = t("New review for {gym}", { gym });
    if (stars !== null)
      out.body = p.has_body === true ? tn(stars, "{n} star, with a written review.", "{n} stars, with a written review.") : tn(stars, "{n} star.", "{n} stars.");
    return out;
  },
};

/** The business kinds to their tile, as B-MA.9 draws them; anything else is grey with the clock. */
export function bizNotifLook(kind: string): { tone: NotifTone; glyph: NotifGlyph } {
  switch (kind) {
    case "application_received":
      return { tone: "lav", glyph: "app" };
    case "hire_offer_accepted":
      return { tone: "teal", glyph: "hire" };
    case "hiring_fee_added":
      return { tone: "gold", glyph: "bill" };
    case "hire_offer_declined":
      return { tone: "grey", glyph: "x" };
    case "voucher_redeemed":
      return { tone: "blue", glyph: "qr" };
    case "gym_review_received":
      return { tone: "gold", glyph: "star" };
    case "support_resources":
      return { tone: "teal", glyph: "leaf" };
    case "image_approved":
      return { tone: "teal", glyph: "app" };
    case "image_rejected":
      return { tone: "red", glyph: "x" };
    default:
      return { tone: "grey", glyph: "clock" };
  }
}

const HIRING = "/app/business/hiring";

/**
 * Where a business row opens, from its kind and documented subject (never a
 * path the server sends): an application (subject `application`) opens its
 * opening's applicants from the payload's opening_id, else the hiring hub;
 * an accepted offer opens Team; a fee (`centium_charge`) Hiring fees; a
 * declined offer the hub; a gym review (`gym_review`) Reputation; a hidden
 * offer (`offer`) its editor. null (voucher_redeemed, anything else): the row
 * only marks itself read.
 */
export function bizNotifTarget(n: Pick<MemberNotification, "kind" | "subjectType" | "subjectId"> & { payload?: Readonly<Record<string, unknown>> }): string | null {
  const id = n.subjectId && UUID.test(n.subjectId) ? n.subjectId : null;
  switch (n.kind) {
    case "application_received": {
      const opening = n.payload ? pText(n.payload, "opening_id") : null;
      return opening && UUID.test(opening) ? `${HIRING}/openings/${opening}` : HIRING;
    }
    case "hire_offer_accepted":
      return `${HIRING}/team`;
    case "hiring_fee_added":
      return `${HIRING}/fees`;
    case "hire_offer_declined":
      return HIRING;
    case "gym_review_received":
      return "/app/business/analytics/reputation";
    case "offer_hidden":
      return n.subjectType === "offer" && id ? `/app/business/marketplace/offers/${id}` : "/app/business/marketplace";
    case "support_resources":
      return "/app/get-support";
    case "image_approved":
    case "image_rejected":
      return imageHome(n.payload?.surface, "business");
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Market + Share 3.0 · Release 2 · the professional's member-inbox kinds.
//
// professional_notifications (pro_notification_kind request / to_review /
// update, `pro.*` title keys) is NOT migrated and keeps the console's own
// rows. The Release 2 professional kinds are member_notification_kind labels,
// and notify_member() is the only writer of that enum, so they arrive in
// `notifications` (the member inbox, keyed on the professional's profile):
// P-MA.7 NotificationsHub merges them in with my_notifications(p_kinds =
// PRO_KINDS); the calendar strips read the sync kinds; Opportunities reads
// existing_team_invite. Writers (Database #38, the documented keys):
// send_hire_offer (hire_offer_received), accept_hire_offer (hired, and
// classes_added once the sessions exist: session_count, first_starts_at),
// add_existing_team (hired with the extra key source 'existing_team'),
// remove_from_team (removed_from_team), invite_existing_team
// (existing_team_invite: subject business_employee = the invitation;
// business_name, business_id, accept_by a date, fee_text 'free'),
// review_instructor (instructor_review_received) and the business_classes
// trigger (class_changed / class_cancelled, future sessions only).

/**
 * Round C Release 2: the kinds that reach a person whatever their account
 * (the support notice; an image decision), so they sit in more than one
 * inbox list. Every other label goes to exactly one.
 */
export const SHARED_KINDS: readonly MemberNotificationKind[] = ["support_resources", "image_approved", "image_rejected"];

/** The kinds addressed to a professional (the migration's payload table; instructor_review_received "to the INSTRUCTOR"). */
export const PRO_KINDS: readonly MemberNotificationKind[] = [
  "hire_offer_received",
  "hired",
  "classes_added",
  "class_changed",
  "removed_from_team",
  "existing_team_invite",
  "instructor_review_received",
  // Round C Release 2: the private support notice (a professional's post can
  // match too; the payload may carry country_code). The image decisions reach
  // the hub as pro.image.* rows instead, so they are NOT here.
  "support_resources",
];

/**
 * The calendar's sync kinds (services/calendar-sync SYNC_KINDS). class_cancelled
 * stays a CLIENT kind for the member bell (lead); a professional's own inbox
 * is read for it here only, for the P-CA.5.3 strip.
 */
export const CALENDAR_SYNC_KINDS: readonly MemberNotificationKind[] = ["classes_added", "class_changed", "class_cancelled", "removed_from_team"];

/** Where a professional's member-inbox row sits in P-MA.7's sub-track: an offer or an invite needs an answer. */
export function proHubKind(kind: string): "request" | "update" {
  return kind === "hire_offer_received" || kind === "existing_team_invite" ? "request" : "update";
}

/**
 * The professional kinds' lines without payload (ours; P-MA.7 draws only the
 * filled rows, PRO_FILLS).
 */
export const PRO_COPY: NotificationCopyTable = {
  support_resources: { title: SUPPORT_NOTICE.title, body: SUPPORT_NOTICE.body },
  hire_offer_received: { title: tk("New offer"), body: tk("Accept or decline in Opportunities.") },
  hired: { title: tk("You're hired"), body: tk("See it in My work.") },
  classes_added: { title: tk("Classes added to your calendar"), body: tk("Your calendar is updated.") },
  class_changed: { title: tk("Class time changed"), body: tk("A gym changed one of your classes. Your calendar is updated.") },
  class_cancelled: { title: tk("Class cancelled"), body: tk("A gym cancelled one of your sessions. It's struck through in your calendar.") },
  removed_from_team: { title: tk("Your role ended"), body: tk("Future classes were removed from your calendar. Past ones stay as history.") },
  existing_team_invite: { title: tk("A gym added you to their team"), body: tk("Accept to join as existing team.") },
  instructor_review_received: { title: tk("New review"), body: tk("A member reviewed one of your classes.") },
};

/** pay_unit words; an unknown unit is left out. Shown through t(). */
const PAY_UNIT: Readonly<Record<string, string>> = {
  per_class: tk("per class"),
  per_session: tk("per session"),
  per_hour: tk("an hour"),
  per_month: tk("a month"),
  hour: tk("an hour"),
  month: tk("a month"),
  class: tk("per class"),
  session: tk("per session"),
};

/**
 * The professional kinds' payload values (the migration's table; P-MA.7
 * `notifList` wording where the board draws the row):
 * - hire_offer_received (hire_offer; business_name, role_title, pay,
 *   pay_unit, starts_on, …): "New offer from {business}" / "{role} · {$70 per
 *   class} · from {Mon, Nov 2}. Accept or decline in Opportunities.";
 * - hired (hire; business_name, role_title, starts_on): "{business} hired
 *   you" / "{role} · starts {Mon, Nov 2}.";
 * - classes_added (hire; business_name, session_count, first_starts_at):
 *   "{business} added {n} classes. The first is {Mon, Nov 2}.";
 * - class_changed (class_series; business_name, class_title, starts_at,
 *   previous_starts_at): "{business} moved {class} from {7:00 AM} to {7:30
 *   AM}. Your calendar is updated." (the days too when they differ);
 * - class_cancelled (class_session; business_name, class_title, starts_at):
 *   "{class} on {Fri, Nov 6} is cancelled" / "{business} cancelled this
 *   session. It's struck through in your calendar.";
 * - removed_from_team (business; business_name): "Your role at {business}
 *   ended";
 * - existing_team_invite (business_employee; business_name, accept_by,
 *   fee_text): "{business} added you to their team" / "Accept by {Nov 14,
 *   2026} to join as existing team, {fee_text}.";
 * - instructor_review_received (gym_review; gym_name, class_title, rating,
 *   has_body): "New review · 5 stars" / "A member reviewed {class} at {gym}."
 *   (the board's reviewer name isn't in the payload).
 */
export const PRO_FILLS: NotificationFillTable = {
  support_resources: () => ({}),
  hire_offer_received: (p) => {
    const biz = pText(p, "business_name");
    const role = roleOf(p);
    const pay = num(p.pay);
    const unit = pText(p, "pay_unit");
    const from = pDate(p, "starts_on");
    const out: Partial<NotificationCopy> = {};
    if (biz) out.title = t("New offer from {business}", { business: biz });
    const payLine = pay !== null && pay >= 0 ? `$${Number.isInteger(pay) ? pay : pay.toFixed(2)}${unit && PAY_UNIT[unit] ? ` ${t(PAY_UNIT[unit])}` : ""}` : null;
    const parts = [role, payLine, from ? t("from {date}", { date: formatNoticeDay(from) }) : null].filter(Boolean);
    if (parts.length) out.body = t("{details}. Accept or decline in Opportunities.", { details: parts.join(" · ") });
    return out;
  },
  hired: (p) => {
    const biz = pText(p, "business_name");
    const role = roleOf(p);
    const from = pDate(p, "starts_on");
    const out: Partial<NotificationCopy> = {};
    // add_existing_team writes `hired` too, with source 'existing_team': no hire, no role.
    if (p.source === "existing_team") {
      if (biz) out.title = t("{business} added you to their team", { business: biz });
      out.body = t("You're on their team as existing team. No hiring fee.");
      return out;
    }
    if (biz) out.title = t("{business} hired you", { business: biz });
    if (role) out.body = from ? t("{role} · starts {date}.", { role, date: formatNoticeDay(from) }) : `${role}.`;
    return out;
  },
  classes_added: (p) => {
    const biz = pText(p, "business_name");
    const n = pCount(p, "session_count");
    const first = pDate(p, "first_starts_at");
    if (!biz || n === null) return {};
    const vars = { n: formatCount(n), business: biz, date: first ? formatNoticeDay(first) : "" };
    return {
      body: first
        ? tn(n, "{business} added {n} class. The first is {date}.", "{business} added {n} classes. The first is {date}.", vars)
        : tn(n, "{business} added {n} class.", "{business} added {n} classes.", vars),
    };
  },
  class_changed: (p) => {
    const biz = pText(p, "business_name");
    const cls = pText(p, "class_title");
    const now = pDate(p, "starts_at");
    const was = pDate(p, "previous_starts_at");
    if (!biz || !cls) return {};
    if (!now || !was) return { body: t("{business} moved {class}. Your calendar is updated.", { business: biz, class: cls }) };
    const sameDay = formatNoticeDay(now) === formatNoticeDay(was);
    const from = sameDay ? clock12(was) : `${formatNoticeDay(was)}, ${clock12(was)}`;
    const to = sameDay ? clock12(now) : `${formatNoticeDay(now)}, ${clock12(now)}`;
    return { body: t("{business} moved {class} from {from} to {to}. Your calendar is updated.", { business: biz, class: cls, from, to }) };
  },
  class_cancelled: (p) => {
    const biz = pText(p, "business_name");
    const cls = pText(p, "class_title");
    const at = pDate(p, "starts_at");
    const out: Partial<NotificationCopy> = {};
    if (cls) out.title = at ? t("{class} on {day} is cancelled", { class: cls, day: formatNoticeDay(at) }) : t("{class} is cancelled", { class: cls });
    if (biz) out.body = t("{business} cancelled this session. It's struck through in your calendar.", { business: biz });
    return out;
  },
  removed_from_team: (p) => {
    const biz = pText(p, "business_name");
    return biz ? { title: t("Your role at {business} ended", { business: biz }) } : {};
  },
  existing_team_invite: (p) => {
    const biz = pText(p, "business_name");
    const by = pDate(p, "accept_by");
    const fee = pText(p, "fee_text");
    const out: Partial<NotificationCopy> = {};
    if (biz) out.title = t("{business} added you to their team", { business: biz });
    if (by)
      out.body = fee
        ? t("Accept by {date} to join as existing team, {fee}.", { date: formatNoticeDate(by), fee })
        : t("Accept by {date} to join as existing team.", { date: formatNoticeDate(by) });
    return out;
  },
  instructor_review_received: (p) => {
    const stars = starsOf(p);
    const cls = pText(p, "class_title");
    const gym = pText(p, "gym_name");
    const out: Partial<NotificationCopy> = {};
    if (stars !== null) out.title = tn(stars, "New review · {n} star", "New review · {n} stars");
    if (cls) out.body = gym ? t("A member reviewed {class} at {gym}.", { class: cls, gym }) : t("A member reviewed {class}.", { class: cls });
    return out;
  },
};

const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Where a professional's member-inbox row opens: an offer My applications; a
 * hire or an ended role My work; the calendar kinds the calendar, on the day
 * of the first, moved or cancelled class when the payload says it; a review
 * the professional's reviews (More › Reviews, as the console's pro.review.new
 * row). existing_team_invite opens its P-MA.5.4 dialog on Opportunities
 * (NotificationsHub, from services/team-hiring inviteFromNotification).
 */
export function proMemberTarget(n: Pick<MemberNotification, "kind"> & { payload?: Readonly<Record<string, unknown>> }): string {
  const day = (k: string) => {
    const d = n.payload ? pDate(n.payload, k) : null;
    return d ? `?day=${localDay(d)}` : "";
  };
  switch (n.kind) {
    case "hire_offer_received":
      return "/app/pro/marketplace/opportunities/applications";
    case "hired":
    case "removed_from_team":
      return "/app/pro/marketplace/opportunities/work";
    case "classes_added":
      return `/app/pro/calendar${day("first_starts_at")}`;
    case "class_changed":
    case "class_cancelled":
      return `/app/pro/calendar${day("starts_at")}`;
    case "instructor_review_received":
      return "/app/more/reviews";
    case "support_resources": {
      const cc = n.payload ? pText(n.payload, "country_code") : null;
      return cc ? `/app/get-support?country=${encodeURIComponent(cc)}` : "/app/get-support";
    }
    default:
      return "/app/pro/marketplace/opportunities";
  }
}

// ---------------------------------------------------------------------------
// Realtime (Database 73ea87b: public.notifications is in supabase_realtime).
// A postgres_changes event is a TRIGGER (as the app's other realtime hooks):
// an INSERT makes the open page re-read its first page and the bell re-count;
// an UPDATE's read_at is applied to a row the open page already shows (a mark
// on another device), without a read.

/** One inbox change from a postgres_changes payload. */
export interface InboxChange {
  type: "INSERT" | "UPDATE";
  id: string | null;
  kind: string | null;
  readAt: string | null;
}

/** A postgres_changes payload (eventType + new row) → the change, or null for anything else. */
export function toInboxChange(payload: unknown): InboxChange | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { eventType?: unknown; new?: unknown };
  if (p.eventType !== "INSERT" && p.eventType !== "UPDATE") return null;
  const row = p.new && typeof p.new === "object" ? (p.new as Record<string, unknown>) : {};
  const s = (v: unknown) => (typeof v === "string" && v ? v : null);
  return { type: p.eventType, id: s(row.id), kind: s(row.kind), readAt: s(row.read_at) };
}

/** A change this screen shows: its kind is one of `kinds` (null = every kind); an unknown kind counts (re-reading is safe). */
export const inboxChangeShown = (c: InboxChange, kinds: readonly string[] | null): boolean => !kinds || !c.kind || kinds.includes(c.kind);

/** The rows with each UPDATE's read_at applied (rows not in the list are left alone). */
export function applyReadChanges<T extends { id: string; readAt: string | null }>(list: readonly T[], changes: readonly InboxChange[]): T[] {
  const reads = new Map<string, string | null>();
  for (const c of changes) if (c.type === "UPDATE" && c.id) reads.set(c.id, c.readAt);
  if (!reads.size) return list.slice();
  return list.map((n) => (reads.has(n.id) && reads.get(n.id) !== n.readAt ? { ...n, readAt: reads.get(n.id) ?? null } : n));
}

/** Whether the changes carry a row the list doesn't have yet. */
export const hasNewRows = (list: readonly { id: string }[], changes: readonly InboxChange[]): boolean => {
  const known = new Set(list.map((n) => n.id));
  return changes.some((c) => c.type === "INSERT" && (!c.id || !known.has(c.id)));
};

/**
 * The list after a fresh first page: rows it didn't have go on top (newest
 * first, as the reader returns them), rows it had take the fresh copy, and the
 * pages already loaded below stay. A first page with no row in common (more
 * rows arrived than a page holds, or the list was empty) replaces the list.
 */
export function mergeFirstPage<T extends { id: string }>(list: readonly T[], more: boolean, page: { items: readonly T[]; more: boolean }): { list: T[]; more: boolean } {
  const known = new Set(list.map((n) => n.id));
  if (!page.items.some((n) => known.has(n.id))) return { list: page.items.slice(), more: page.more };
  const fresh = new Map(page.items.map((n) => [n.id, n]));
  const added = page.items.filter((n) => !known.has(n.id));
  return { list: [...added, ...list.map((n) => fresh.get(n.id) ?? n)], more };
}

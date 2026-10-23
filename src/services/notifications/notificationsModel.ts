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
 * never lights a member's bell.
 */
export const CLIENT_KINDS: readonly MemberNotificationKind[] = ["voucher_issued", "points_expiring", "class_cancelled", "review_prompt"];

/** my_unread_notification_count's cap: the reader never counts past it. */
export const UNREAD_COUNT_CAP = 99;

/** my_unread_notification_count's integer (≥ 0, at most the cap); anything else is 0. */
export function parseUnreadCount(data: unknown): number {
  const n = num(data);
  return n !== null && Number.isInteger(n) && n > 0 ? Math.min(n, UNREAD_COUNT_CAP) : 0;
}

/** The count as shown: "99+" at the cap (the reader stops counting there). */
export const unreadBadge = (n: number): string => (n >= UNREAD_COUNT_CAP ? `${UNREAD_COUNT_CAP}+` : String(Math.max(0, Math.floor(n))));

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
 * reads them); they stay here because the business inbox reuses their lines.
 */
export const CLIENT_COPY: NotificationCopyTable = {
  voucher_issued: { title: "Voucher ready", body: "Your voucher is in My rewards." },
  points_expiring: { title: "Points expire soon", body: "Some of your points expire soon. Redeem them for a reward before they lapse." },
  class_cancelled: { title: "Class cancelled", body: "One of your booked classes is cancelled." },
  review_prompt: { title: "Rate your instructor", body: "How was your class? Tell others what it was like." },
  voucher_redeemed: { title: "Voucher redeemed", body: "A member used a voucher for one of your offers." },
  offer_hidden: { title: "Offer hidden", body: "Hidden by Centium. Contact support for details." },
};

/** A key no table knows: a safe line, never the raw key. */
export const GENERIC_COPY: NotificationCopy = { title: "New notification", body: "" };

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
export const formatCount = (n: number): string => n.toLocaleString("en-US");
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
 *   {business}?" (either name left out when missing).
 */
export const CLIENT_FILLS: NotificationFillTable = {
  voucher_issued: (p) => {
    const offer = pText(p, "offer_title");
    return offer ? { body: `Your voucher for ${offer} is in My rewards.` } : {};
  },
  points_expiring: (p) => {
    const n = pCount(p, "points");
    const on = pDate(p, "expires_on");
    const out: Partial<NotificationCopy> = {};
    if (n !== null) out.title = n === 1 ? "1 point expires soon" : `${formatCount(n)} points expire soon`;
    if (on) {
      const date = formatNoticeDate(on);
      out.body =
        n === 1
          ? `It expires on ${date}. Redeem it for a reward before then.`
          : n !== null
            ? `They expire on ${date}. Redeem them for a reward before then.`
            : `Some of your points expire on ${date}. Redeem them for a reward before then.`;
    }
    return out;
  },
  class_cancelled: (p) => {
    const cls = pText(p, "class_title");
    const biz = pText(p, "business_name");
    const at = pDate(p, "starts_at");
    const out: Partial<NotificationCopy> = {};
    if (cls) out.title = `${cls} is cancelled`;
    if (cls && biz) out.body = `${biz} cancelled ${cls}${at ? ` on ${formatNoticeDay(at)}` : ""}. Your booking is cancelled.`;
    return out;
  },
  review_prompt: (p) => {
    const cls = pText(p, "class_title");
    if (!cls) return {};
    const who = pText(p, "instructor_name");
    const biz = pText(p, "business_name");
    return { body: `How was ${cls}${who ? ` with ${who}` : ""}${biz ? ` at ${biz}` : ""}?` };
  },
};

function own<T>(t: Readonly<Record<string, T>>, k: string): T | null {
  return Object.prototype.hasOwnProperty.call(t, k) ? t[k] : null;
}

/**
 * title_key's line, else the kind's, else the generic line; then the payload
 * values from `fills` (by the same key) when the row carries a payload. The
 * table's own entry comes back unchanged when nothing fills. CLIENT_COPY
 * brings CLIENT_FILLS by default; another table brings its own (or none).
 */
export function notificationCopy(
  n: Pick<MemberNotification, "titleKey" | "kind"> & { payload?: Readonly<Record<string, unknown>> },
  table: NotificationCopyTable = CLIENT_COPY,
  fills: NotificationFillTable | null = table === CLIENT_COPY ? CLIENT_FILLS : null
): NotificationCopy {
  const k = own(table, n.titleKey) ? n.titleKey : own(table, n.kind) ? n.kind : null;
  if (k === null) return GENERIC_COPY;
  const base = table[k];
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
 * any other kind (not a member's) → nothing in the client UI.
 */
export function clientNotificationTarget(n: Pick<MemberNotification, "kind" | "subjectType" | "subjectId">): string | null {
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
    default:
      return { tone: "grey", glyph: "clock" };
  }
}

const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

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

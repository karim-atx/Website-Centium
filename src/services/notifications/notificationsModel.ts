// Market + Share 3.0 · the member inbox, pure (C-MO.4.10 `notifClient`; the
// business inbox B-MA.9 reads the same rows in Release 2).
//
// Contract: Database 2a5b122 (release/points-offers-and-the-public-shelf),
// migration 20261210600000_everybody_has_an_inbox.sql (no HANDOVER_API
// section; the migration comments are the contract):
// - my_notifications(p_before, p_limit, p_before_id) → id, kind
//   (member_notification_kind), subject_type, subject_id, actor_id, title_key,
//   payload (jsonb), read_at, created_at; the caller's own rows, newest first,
//   keyset-paged on (created_at, id), p_limit clamped to 1..200.
// - mark_notifications_read(p_ids uuid[] default null) → integer, the count
//   that moved (null = all of the caller's unread rows).
// - title_key is a KEY; the copy lives here. notify_member() writes the kind
//   name as the key when the writer passes none.
//
// The reader, the cursor and the parser are the same for every inbox; each UI
// brings its own copy table and its own target resolver (CLIENT_COPY and
// clientNotificationTarget here). The tones and glyphs are the screen
// script's (`NT`, `NI`).

import { formatShortDate } from "../../utils/date";
import { clock12 } from "../../utils/time12";
import { rows, str } from "../market/parse";

/** member_notification_kind, Release 1 (the rest of the enum is Release 2's). */
export const RELEASE1_KINDS = ["voucher_issued", "voucher_redeemed", "points_expiring", "offer_hidden"] as const;

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
 * The client's lines. The board's titles where they don't depend on payload
 * fields; DB6 documents no payload keys yet, so no line interpolates one.
 * voucher_redeemed and offer_hidden go to an offer's owner; they are here so a
 * member who also owns an offer never sees the generic line for them.
 */
export const CLIENT_COPY: NotificationCopyTable = {
  voucher_issued: { title: "Voucher ready", body: "Your voucher is in My rewards." },
  points_expiring: { title: "Points expire soon", body: "Some of your points expire soon. Redeem them for a reward before they lapse." },
  voucher_redeemed: { title: "Voucher redeemed", body: "A member used a voucher for one of your offers." },
  offer_hidden: { title: "Offer taken down", body: "Centium hid one of your offers. Members can't see it in Rewards now." },
};

/** A key no table knows: a safe line, never the raw key. */
export const GENERIC_COPY: NotificationCopy = { title: "New notification", body: "" };

const own = (t: NotificationCopyTable, k: string): NotificationCopy | null => (Object.prototype.hasOwnProperty.call(t, k) ? t[k] : null);

/** title_key's line, else the kind's, else the generic line. */
export function notificationCopy(n: Pick<MemberNotification, "titleKey" | "kind">, table: NotificationCopyTable = CLIENT_COPY): NotificationCopy {
  return own(table, n.titleKey) ?? own(table, n.kind) ?? GENERIC_COPY;
}

// ---- where a row opens (client) ----

const OWNER_KINDS = new Set(["voucher_redeemed", "offer_hidden"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The client route a row opens, or null (the row only marks read).
 * voucher_issued → the voucher (subject 'voucher') or My rewards;
 * points_expiring → Points history; an owner's kind → nothing in the client
 * UI; any other kind by its subject: offer → the offer, voucher → the
 * voucher, booking → My bookings, points → Points history.
 */
export function clientNotificationTarget(n: Pick<MemberNotification, "kind" | "subjectType" | "subjectId">): string | null {
  const id = n.subjectId && UUID.test(n.subjectId) ? n.subjectId : null;
  if (n.kind === "voucher_issued") return n.subjectType === "voucher" && id ? `/app/marketplace/vouchers/${id}` : "/app/marketplace/rewards/mine";
  if (n.kind === "points_expiring") return "/app/marketplace/points/history";
  if (OWNER_KINDS.has(n.kind)) return null;
  switch (n.subjectType) {
    case "offer":
      return id ? `/app/marketplace/rewards/${id}` : null;
    case "voucher":
      return id ? `/app/marketplace/vouchers/${id}` : "/app/marketplace/rewards/mine";
    case "booking":
      return "/app/marketplace/bookings";
    case "points":
      return "/app/marketplace/points/history";
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

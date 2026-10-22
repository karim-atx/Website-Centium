// Market + Share 3.0 · W2 · the client inbox, pure (C-MO.4.10 `notifClient`).
// Row shape: PLAN §2.2 DB6 my_notifications (id, kind, title, body, ref_id,
// target_path, created_at, read_at); re-check the names when DB6 lands. The
// tones and glyphs are the screen script's (`NT`, `NI`).

import { formatShortDate } from "../../utils/date";
import { clock12 } from "../../utils/time12";
import { rows, str } from "../market/parse";

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  refId: string | null;
  /** An in-app path the row opens ("/app/marketplace/rewards/mine"); only /app paths are followed. */
  targetPath: string | null;
  createdAt: string;
  readAt: string | null;
}

export function parseNotifications(data: unknown): AppNotification[] {
  return rows(data).flatMap((r) => {
    const id = str(r.id);
    const createdAt = str(r.created_at);
    const title = str(r.title);
    if (!id || !createdAt || !title) return [];
    const path = str(r.target_path);
    return [
      {
        id,
        kind: str(r.kind) ?? "other",
        title,
        body: str(r.body) ?? "",
        refId: str(r.ref_id),
        targetPath: path && path.startsWith("/app/") ? path : null,
        createdAt,
        readAt: str(r.read_at),
      },
    ];
  });
}

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

/** The client kinds (DB6 M1) to their tile, as the board draws them; anything else is grey with the clock. */
export function notifLook(kind: string): { tone: NotifTone; glyph: NotifGlyph } {
  switch (kind) {
    case "points_expiring":
      return { tone: "gold", glyph: "leaf" };
    case "class_session_cancelled":
    case "class_cancelled":
      return { tone: "red", glyph: "x" };
    case "review_prompt":
      return { tone: "lav", glyph: "star" };
    case "voucher_issued":
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

/** Today / Earlier, newest first; an empty group is left out. */
export function groupNotifications(list: readonly AppNotification[], now: Date = new Date()): { heading: "Today" | "Earlier"; items: AppNotification[] }[] {
  const sorted = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const today = sorted.filter((n) => key(new Date(n.createdAt)) === key(now));
  const earlier = sorted.filter((n) => key(new Date(n.createdAt)) !== key(now));
  return [
    ...(today.length ? [{ heading: "Today" as const, items: today }] : []),
    ...(earlier.length ? [{ heading: "Earlier" as const, items: earlier }] : []),
  ];
}

export const unreadCount = (list: readonly AppNotification[]): number => list.filter((n) => !n.readAt).length;

// ---------------------------------------------------------------------------
// Market + Share 3.0 · W4 · the business inbox (B-MA.9 `notifBiz`, D-38).
// awaiting DB stage DB6 (the business scope) / DB12 (the hiring kinds).

/** The business kinds the board draws (B-MA.9), to their tile; anything else is grey with the clock. */
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
    case "review":
    case "review_received":
    case "instructor_review":
    case "gym_review":
      return { tone: "gold", glyph: "star" };
    default:
      return { tone: "grey", glyph: "clock" };
  }
}

const HIRING = "/app/business/hiring";

/**
 * Where a business row opens: the server's target_path (an /app path) when it
 * sends one, else the kind's page (an application opens its opening's
 * applicants when ref_id names it; a review opens Reputation). null: the row
 * only marks itself read.
 */
export function bizNotifTarget(n: Pick<AppNotification, "kind" | "refId" | "targetPath">): string | null {
  if (n.targetPath) return n.targetPath;
  switch (n.kind) {
    case "application_received":
      return n.refId ? `${HIRING}/openings/${encodeURIComponent(n.refId)}` : HIRING;
    case "hire_offer_accepted":
      return `${HIRING}/team`;
    case "hiring_fee_added":
      return `${HIRING}/fees`;
    case "hire_offer_declined":
      return HIRING;
    case "review":
    case "review_received":
    case "instructor_review":
    case "gym_review":
      return "/app/business/analytics/reputation";
    default:
      return null;
  }
}

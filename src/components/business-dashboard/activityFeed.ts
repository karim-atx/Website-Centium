// B15 · Recent activity (DI-03) from business_activity, the server's feed.
// Pure (no Supabase import), so node --test loads it.
//
// REPLACES the client-assembled feed (bookings, business_members and
// business_classes rows stitched together in the browser). The server writes
// one row per event with a LABEL (a shared first name, "Member #0042", or
// "Guest") and no person id, and shows each kind only to the permission its
// subject needs (payment: revenue, order: store, check_in: front_desk,
// booking / cancel / appointment: schedule, review: marketing, join / end:
// members). The label is rendered as given.
//
// Titles for booking, join and end follow BizSummaryV27's activity rows
// ("Member #4F2A booked Spin 45", "Member #9C1E joined", "Member #77B0 ended
// their membership"); every other kind's title and sub is OURS (listed in the
// B15 report).

import type { ActivityKind, ActivityRow, DashClass } from "./dashboardTypes";
import { localDayOf, shiftDate } from "../../utils/date";
import { mondayFirstWeek } from "../../utils/week";
import { time12 } from "../../utils/time12";
import { dayLabel } from "./dashboardModel";
import { t } from "../../i18n/core";

export const ACTIVITY_KINDS: readonly ActivityKind[] = ["booking", "cancel", "join", "end", "check_in", "order", "payment", "appointment", "review"];

/** The feed's first page and poll size (business_recent_activity caps at 200). */
export const ACTIVITY_PAGE = 200;

type RawActivity = {
  id: number | string;
  kind: string;
  label: string | null;
  is_minor: boolean | null;
  ref_kind: string | null;
  ref_id: string | null;
  summary: string | null;
  at: string;
};

/** One row from business_recent_activity or a Realtime INSERT payload; null for a kind this build does not know. */
export function toActivityRow(r: Partial<RawActivity> | null | undefined): ActivityRow | null {
  if (!r || r.id === undefined || r.id === null || !r.at || !r.kind) return null;
  if (!(ACTIVITY_KINDS as readonly string[]).includes(r.kind)) return null;
  return {
    id: Number(r.id),
    kind: r.kind as ActivityKind,
    // Round G (EH5): the server's "Guest" (no person shared) reads in the app's language.
    label: r.label === null || r.label === undefined || r.label === "Guest" ? t("Guest") : r.label,
    isMinor: r.is_minor ?? null,
    refKind: r.ref_kind ?? null,
    refId: r.ref_id ?? null,
    summary: r.summary ?? null,
    at: r.at,
  };
}

/** Newest first, one row per id (a Realtime row may arrive again in the next poll). */
export function mergeActivity(current: ActivityRow[], incoming: ActivityRow[], cap = ACTIVITY_PAGE * 2): ActivityRow[] {
  const byId = new Map<number, ActivityRow>();
  for (const r of current) byId.set(r.id, r);
  for (const r of incoming) byId.set(r.id, r);
  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at) || b.id - a.id).slice(0, cap);
}

/** Ids in `next` that `seen` did not have: the rows that get the New tag (OURS-DA-states #4). */
export function freshIds(seen: Set<number> | null, next: ActivityRow[]): number[] {
  if (!seen) return [];
  return next.filter((r) => !seen.has(r.id)).map((r) => r.id);
}

export interface ActivityEvent {
  key: string;
  id: number;
  type: ActivityKind;
  at: string;
  day: string;
  title: string;
  sub: string;
  isMinor: boolean;
}

export interface ActivityContext {
  /** The business's classes (the booking's ref is its class). */
  classes: DashClass[];
  /** Bookings per class id, for "18 of 20 now booked". */
  booked: Record<string, number>;
  /** Venue names by gym id (a check-in's ref is its venue). */
  venueNames: Record<string, string>;
  today: string;
}

function classLine(ctx: ActivityContext, refId: string | null, withCount: boolean): string {
  const c = refId ? ctx.classes.find((k) => k.id === refId) : undefined;
  if (!c) return "";
  const when = `${dayLabel(c.date, ctx.today)} ${time12(c.start)}`;
  return withCount ? `${when} · ${t("{n} of {cap} now booked", { n: ctx.booked[c.id] ?? 0, cap: c.cap })}` : when;
}

/** A row as the card draws it: title, sub, day group. */
export function activityEvent(r: ActivityRow, ctx: ActivityContext): ActivityEvent {
  const who = r.label;
  const s = r.summary;
  let title: string;
  let sub = "";
  switch (r.kind) {
    case "booking":
      title = s ? t("{who} booked {what}", { who, what: s }) : t("{who} booked a class", { who });
      sub = classLine(ctx, r.refId, true);
      break;
    case "cancel":
      title = s ? t("{who} cancelled {what}", { who, what: s }) : t("{who} cancelled a class", { who });
      sub = classLine(ctx, r.refId, false);
      break;
    case "join":
      title = t("{who} joined", { who });
      sub = s ?? t("No plan");
      break;
    case "end":
      title = t("{who} ended their membership", { who });
      sub = s ?? "";
      break;
    case "check_in":
      title = t("{who} checked in", { who });
      sub = (r.refId && ctx.venueNames[r.refId]) || "";
      break;
    case "order":
      title = s ? t("{who} placed {what}", { who, what: s }) : t("{who} placed an order", { who });
      break;
    case "payment":
      title = s ? t("{who} paid {what}", { who, what: s }) : t("{who} paid", { who });
      break;
    case "appointment":
      title = s ? t("{who} booked {what}", { who, what: s }) : t("{who} booked an appointment", { who });
      break;
    case "review":
      title = t("{who} left a review", { who });
      sub = s ?? "";
      break;
  }
  return { key: `a-${r.id}`, id: r.id, type: r.kind, at: r.at, day: localDayOf(r.at), title, sub, isMinor: r.isMinor === true };
}

export function activityEvents(rows: ActivityRow[], ctx: ActivityContext, now: Date, days = 30): ActivityEvent[] {
  const since = shiftDate(localDayOf(now), -(days - 1));
  return rows.filter((r) => localDayOf(r.at) >= since).map((r) => activityEvent(r, ctx));
}

// ---- This week, compared with last week (BizSummaryV27 totals) ---------------

export type TotalType = "join" | "end" | "booking" | "created";

export interface WeekTotal {
  type: TotalType;
  label: string;
  n: number;
  prev: number;
  days: number[];
}

/**
 * Joined, Ended (and Booked, Classes for a class-based business), this week
 * Monday to today against last week. Joined / Ended / Booked count the feed's
 * own rows (`totalsRows`: every join, end and booking since last Monday,
 * read uncapped); Classes counts business_classes created (not a person event,
 * so not in the feed).
 */
export function weekTotals(classBased: boolean, totalsRows: Pick<ActivityRow, "kind" | "at">[], classes: DashClass[], now: Date): WeekTotal[] {
  const today = localDayOf(now);
  const week = mondayFirstWeek(today);
  const lastWeek = week.map((d) => shiftDate(d, -7));
  const perDay = (dates: string[], hit: (d: string) => number) => dates.map(hit);
  const mk = (type: TotalType, label: string, dayOf: string[]): WeekTotal => {
    const count = (d: string) => dayOf.filter((x) => x === d).length;
    const days = perDay(week, count);
    const prev = perDay(lastWeek, count);
    return { type, label, n: days.reduce((a, b) => a + b, 0), prev: prev.reduce((a, b) => a + b, 0), days };
  };
  const daysOf = (kind: ActivityKind) => totalsRows.filter((r) => r.kind === kind).map((r) => localDayOf(r.at));
  const out: WeekTotal[] = [mk("join", t("Joined"), daysOf("join")), mk("end", t("Ended"), daysOf("end"))];
  if (classBased) {
    out.push(mk("booking", t("Booked"), daysOf("booking")));
    out.push(mk("created", t("Classes"), classes.map((c) => localDayOf(c.createdAt))));
  }
  return out;
}

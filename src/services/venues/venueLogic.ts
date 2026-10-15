// Pure rules for gyms and classes (v5.1 backend stage 4, Database
// docs/HANDOVER_API.md "Stage 4 · Gyms and classes"). No Supabase here, so
// node --test can load it.

import { formatPrice } from "../../utils/price";
import { formatShortDate } from "../../utils/date";

/** B7 MB-03 adds quarterly and semiannually to billing_period. */
export type Billing = "daily" | "monthly" | "quarterly" | "semiannually" | "annually";

export interface PlanLite {
  id: string;
  name: string;
  price: number;
  billing: Billing;
}

/** The unit a plan's price is per: "$45/month". */
export const PERIOD: Record<Billing, string> = { daily: "day", monthly: "month", quarterly: "3 months", semiannually: "6 months", annually: "year" };

/** Plans cheapest first, so the list and the default selection are stable. */
export function sortPlans<T extends PlanLite>(plans: T[]): T[] {
  return [...plans].sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
}

/**
 * MO1.4.2 "Membership from $45/month". The cheapest monthly plan when there is
 * one (the frame's line is always per month); otherwise the cheapest plan in
 * its own unit. Null when the business sells no plans.
 */
export function membershipFromLine(plans: PlanLite[]): string | null {
  if (plans.length === 0) return null;
  const monthly = plans.filter((p) => p.billing === "monthly");
  const pool = monthly.length > 0 ? monthly : plans;
  const cheapest = sortPlans(pool)[0];
  return `Membership from ${formatPrice(cheapest.price)}/${PERIOD[cheapest.billing]}`;
}

/**
 * MO1.4.2.2's "Save 22%" on a yearly plan: against twelve months of the
 * cheapest monthly plan (the frame's own numbers: 1 − 420 / (45 × 12) = 22%).
 * Null when there is nothing to compare with or nothing is saved. Only yearly
 * plans get one; the database has no 3-month period.
 */
export function planSaving(plan: PlanLite, plans: PlanLite[]): number | null {
  if (plan.billing !== "annually") return null;
  const monthly = plans.filter((p) => p.billing === "monthly" && p.price > 0);
  if (monthly.length === 0) return null;
  const base = Math.min(...monthly.map((p) => p.price)) * 12;
  const pct = Math.round((1 - plan.price / base) * 100);
  return pct > 0 ? pct : null;
}

/**
 * gym_pass_state() (migration 20261121020000, the one definition): 'upcoming'
 * outranks 'awaiting_payment' (payment_status is beside it), and 'unknown' is
 * a terminal state for a status nobody mapped. It should never appear; it is
 * never treated as valid.
 */
export type PassState = "valid" | "awaiting_payment" | "expired" | "cancelled" | "refunded" | "upcoming" | "unknown";

/** The neutral tag for a pass state the app cannot read; logged, never valid. */
export function unavailableTag(context: string): { label: string; tone: "muted" } {
  console.error(`[venues] pass_state 'unknown' reached the app (${context}); shown as unavailable.`);
  return { label: "Status unavailable", tone: "muted" };
}

/**
 * The tag a membership wears (MO1.4.2 card, gym page header, the pass).
 * `pass_state` is the database's one derived truth; this only names it.
 * "member" is the teal Member tag; "pending" the amber "Pay on your first
 * visit" (flow 4.8, until the gym marks it paid); "muted" the rest.
 */
export function memberTag(state: PassState): { label: string; tone: "member" | "pending" | "muted" } {
  switch (state) {
    case "valid":
      return { label: "Member", tone: "member" };
    case "awaiting_payment":
      return { label: "Pay on your first visit", tone: "pending" };
    case "expired":
      return { label: "Expired", tone: "muted" };
    case "cancelled":
      return { label: "Cancelled", tone: "muted" };
    case "refunded":
      return { label: "Refunded", tone: "muted" };
    case "upcoming":
      return { label: "Not started yet", tone: "muted" };
    case "unknown":
      return unavailableTag("memberTag");
  }
}

/**
 * B7 MB-05: a membership's lifecycle status. 'upcoming' is a renewal that is
 * not in force yet (its pass grants nothing until the period before it ends).
 */
export type GymMembershipStatus = "active" | "expired" | "cancelled" | "upcoming";

/**
 * The tag for a whole membership row: an upcoming period says when it starts;
 * everything else is the pass state's own tag (pass_state 'upcoming' since
 * 20261121020000).
 */
export function membershipTag(m: { passState: PassState; startedOn: string }): { label: string; tone: "member" | "pending" | "muted" } {
  if (m.passState === "upcoming") return { label: `Starts ${dayMonthYear(m.startedOn)}`, tone: "muted" };
  return memberTag(m.passState);
}

/**
 * A plan's commitment terms as information (MB-05 follow-up, item 5). They
 * are NOT enforced: ending is never blocked by them (a contractual question
 * with the user).
 */
export function commitmentLines(minimumTermMonths: number | null | undefined, noticeDays: number | null | undefined): string[] {
  const out: string[] = [];
  if (minimumTermMonths && minimumTermMonths > 0) out.push(`Minimum term: ${minimumTermMonths} ${minimumTermMonths === 1 ? "month" : "months"}`);
  if (noticeDays && noticeDays > 0) out.push(noticeDays === 1 ? "1 day's notice" : `${noticeDays} days' notice`);
  return out;
}

/**
 * The membership that makes somebody a member of this venue: the one with
 * status 'active' (the database allows one per person per venue). Rows come
 * newest first from my_gym_memberships().
 */
export function currentMembership<T extends { gymId: string; status: string }>(rows: T[], gymId: string): T | null {
  return rows.find((r) => r.gymId === gymId && r.status === "active") ?? null;
}

/** "1 Oct 2026" from a `date` column (no timezone shift). */
export function dayMonthYear(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const mon = formatShortDate(new Date(Date.UTC(y, m - 1, d)), { month: "short", timeZone: "UTC" });
  return `${d} ${mon} ${y}`;
}

/** The pass's VALID line: "1 Oct 2026 to 1 Jan 2027", or from-only when open-ended. */
export function validRange(startedOn: string, expiresOn: string | null): string {
  return expiresOn ? `${dayMonthYear(startedOn)} to ${dayMonthYear(expiresOn)}` : `From ${dayMonthYear(startedOn)}`;
}

/** "3-month membership"-style line for the pass: the plan's own name. */
export function planLine(planName: string): string {
  return /membership/i.test(planName) ? planName : `${planName} membership`;
}

/**
 * zxing-wasm's writer returns one byte per module, 0 = dark. Rows of booleans
 * (true = dark), for an SVG drawn in the page's own colours.
 */
export function qrModules(data: ArrayLike<number>, width: number, height: number): boolean[][] {
  const rows: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < width; x++) row.push(data[y * width + x] < 128);
    rows.push(row);
  }
  return rows;
}

/**
 * BR-14, warned BEFORE cancel_class_booking() as the doc asks: is it already
 * inside the free-cancellation window? `startsAt` is class_starts_at().
 */
export function isLateCancellation(startsAt: string, windowHours: number, now: Date = new Date()): boolean {
  return new Date(startsAt).getTime() - now.getTime() < windowHours * 3_600_000;
}

/** "Free cancellation up to 12 hours before." (MO1.4.4 #11). */
export function cancellationLine(windowHours: number): string {
  if (windowHours <= 0) return "Free cancellation until the class starts.";
  return `Free cancellation up to ${windowHours} ${windowHours === 1 ? "hour" : "hours"} before.`;
}

/** The ISO date `days` after `iso` (both local calendar dates). */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/**
 * Stage 4 ATX codes as a person reads them. The doc's own messages are terse
 * lower-case server strings ("no such venue"), so they are worded here, as
 * services/recoveryCodes does. ATX02 (rate limit) names its delay and is
 * shown as it is.
 */
export function stage4Message(code: string | undefined, serverMessage: string, fallback: string): string {
  switch (code) {
    case "ATX01":
      return "Your session expired. Sign in again.";
    case "ATX02":
      return serverMessage;
    case "ATX79":
      return "This gym isn't available any more.";
    case "ATX81":
      return "This gym can't take memberships on Centium yet.";
    case "ATX82":
      return "That plan isn't offered at this gym.";
    case "ATX83":
      return "You already have an active membership here.";
    case "ATX84":
      return "That membership couldn't be found.";
    case "ATX85":
      return "This class isn't available any more.";
    case "ATX86":
      return "This class has already started.";
    case "ATX87":
      return "You've already booked this class.";
    case "ATX88":
      return "That class just filled up.";
    case "ATX89":
      return "You don't have a booking for this class.";
    case "ATX90":
      return "You're not on the waitlist for this class.";
    case "ATX91":
      return "Choose a rating from 1 to 5 stars.";
    case "ATX92":
      return "You've already reviewed this gym.";
    case "ATX93":
      return "That can't be done with this review.";
    default:
      return fallback;
  }
}

/** MO1.4.2.3's review age: "2 days ago", "1 week ago", "3 weeks ago", "1 month ago". */
export function reviewAge(iso: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  const unit = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"} ago`;
  if (days < 1) return "Today";
  if (days < 7) return unit(days, "day");
  if (days < 30) return unit(Math.floor(days / 7), "week");
  if (days < 365) return unit(Math.floor(days / 30), "month");
  return unit(Math.floor(days / 365), "year");
}

/**
 * Stage A4: business_profiles.logo_url and gyms.cover_url hold an object path
 * in a public bucket (<owner_uid>/… ), not a URL. A usable path is non-empty,
 * relative and has no "..". Anything else is not drawn (the initials show).
 */
export function storagePath(value: string | null | undefined): string | null {
  const p = value?.trim();
  if (!p || /^[a-z][a-z0-9+.-]*:/i.test(p) || p.startsWith("/") || p.split("/").includes("..")) return null;
  return p;
}

/**
 * gyms.logo_url (stage 4d) is different: a business points it at an image it
 * already hosts, so it is a full URL. Only http(s) is drawn.
 */
export function hostedImageUrl(value: string | null | undefined): string | null {
  const u = value?.trim();
  return u && /^https?:\/\//i.test(u) ? u : null;
}

/** A business's rating card from its loaded reviews (no public summary reader exists for a business). */
export function summaryOf(reviews: readonly { rating: number | null; redacted: boolean }[]): { average: number; total: number; counts: [number, number, number, number, number] } {
  const rated = reviews.filter((r) => !r.redacted && r.rating !== null) as { rating: number }[];
  const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const r of rated) counts[5 - Math.min(5, Math.max(1, Math.round(r.rating)))] += 1;
  const total = rated.length;
  return { average: total ? rated.reduce((a, r) => a + r.rating, 0) / total : 0, total, counts };
}

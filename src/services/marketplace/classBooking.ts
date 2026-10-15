import { formatShortDate } from "../../utils/date";
import { stage4Message } from "../venues/venueLogic";

// B9 (Database docs/HANDOVER_API.md "B9 · Classes and schedule"), the
// member's side, as pure functions so node:test can hold them: the venue
// terms book_class() asks for (ATXE4), the B9 refusals in words, the booking
// rules line, the class's level and what to bring, and the distance text.

/**
 * The policy kinds book_class() refuses on (ATXE4). pending_policies() lists
 * every published kind (returns, delivery and the appointment waiver too);
 * only these three stand between a member and a class.
 */
export const CLASS_POLICY_KINDS = ["waiver", "class_terms", "house_rules"] as const;
export type ClassPolicyKind = (typeof CLASS_POLICY_KINDS)[number];

export const isClassPolicyKind = (k: string): k is ClassPolicyKind => (CLASS_POLICY_KINDS as readonly string[]).includes(k);

/** The business side's own names for the documents (business-more PoliciesPages). */
export const CLASS_POLICY_TITLES: Record<ClassPolicyKind, string> = {
  waiver: "Liability waiver",
  class_terms: "Class terms",
  house_rules: "House rules",
};

/**
 * The policy kinds book_appointment() refuses on (B12, ATXE4): the
 * appointment waiver, the liability waiver and the house rules.
 */
export const APPOINTMENT_POLICY_KINDS = ["appointment_waiver", "waiver", "house_rules"] as const;

/** Any document a booking can wait on (classes or appointments). */
export type VenuePolicyKind = ClassPolicyKind | (typeof APPOINTMENT_POLICY_KINDS)[number];

export const VENUE_POLICY_TITLES: Record<VenuePolicyKind, string> = {
  ...CLASS_POLICY_TITLES,
  appointment_waiver: "Appointment waiver",
};

/** The order the documents are read in: the waiver first, as the business lists them. */
export function sortClassPolicies<T extends { kind: VenuePolicyKind }>(docs: T[], order: readonly VenuePolicyKind[] = CLASS_POLICY_KINDS): T[] {
  return [...docs].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

/**
 * The B9 refusals a member can meet, in words, then the stage 4 codes
 * (stage4Message) for everything older. ATXE2 carries the window in the
 * server's message ("bookings for this class open 14 days before it
 * starts"); the number is read from it when it is there.
 */
export function classErrorMessage(code: string | undefined, serverMessage: string, fallback: string): string {
  switch (code) {
    case "ATXE0":
      return "This class was cancelled by the venue.";
    case "ATXE2": {
      const n = /open (\d+) days?/i.exec(serverMessage)?.[1];
      return n ? `Bookings for this class open ${n} ${n === "1" ? "day" : "days"} before it starts.` : "Bookings for this class aren't open yet.";
    }
    case "ATXE3":
      return "Bookings for this class have closed.";
    case "ATXE4":
      return "Accept this venue's terms before booking.";
    case "ATXE5":
      return "The waitlist for this class is full.";
    default:
      return stage4Message(code, serverMessage, fallback);
  }
}

/** class_booking_rules(): the class page's lines (CL-05). */
export interface ClassBookingRules {
  cancellationHours: number;
  bookingWindowDays: number;
  closesMinutesBefore: number;
  waitlistCap: number;
}

/** "Sat 11 Oct" in the device's time, as the class page writes dates. */
function dayMonthOf(d: Date): string {
  const wd = d.toLocaleDateString("en-GB", { weekday: "short" });
  return `${wd} ${d.getDate()} ${formatShortDate(d, { month: "short" })}`;
}

/**
 * The booking window line. Before the window opens it names the day
 * ("Bookings open Sat 18 Oct."); once open it states the rule ("Bookings
 * open 14 days ahead."), the handover's own example.
 */
export function bookingWindowLine(rules: Pick<ClassBookingRules, "bookingWindowDays">, startsAt: string | null, now: Date = new Date()): string {
  const days = rules.bookingWindowDays;
  if (startsAt) {
    const opens = new Date(new Date(startsAt).getTime() - days * 86_400_000);
    if (Number.isFinite(opens.getTime()) && opens.getTime() > now.getTime()) return `Bookings open ${dayMonthOf(opens)}.`;
  }
  return `Bookings open ${days} ${days === 1 ? "day" : "days"} ahead.`;
}

/** business_classes.level (class_level enum) as the Level tile's value. */
export const CLASS_LEVEL_LABELS = {
  all_levels: "All levels",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
} as const;
export type ClassLevel = keyof typeof CLASS_LEVEL_LABELS;

export function levelLabel(level: string | null | undefined): string | null {
  return level && level in CLASS_LEVEL_LABELS ? CLASS_LEVEL_LABELS[level as ClassLevel] : null;
}

/** MO1.4.4 #27: "Mat · Water · Towel"; null when there is nothing to bring. */
export function whatToBringLine(items: readonly (string | null)[] | null | undefined): string | null {
  const list = (items ?? []).map((s) => (s ?? "").trim()).filter(Boolean);
  return list.length ? list.join(" · ") : null;
}

/**
 * MO1.4 #43 / MO1.4.4 #11: "1.2 km" (the frames' form). One decimal under
 * 10 km, whole kilometres from there; nothing for a missing distance.
 */
export function distanceText(km: number | null | undefined): string | null {
  if (km === null || km === undefined || !Number.isFinite(km) || km < 0) return null;
  if (km < 10) return `${(Math.round(km * 10) / 10).toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/**
 * MO1.4.4 #20 "Yoga instructor · Physio": the professional's specialty and
 * then their type, from the public directory; the type alone without one.
 */
export function instructorRole(specialty: string | null | undefined, typeLabel: string | null | undefined): string | null {
  const parts = [specialty?.trim(), typeLabel?.trim()].filter((s): s is string => !!s);
  const unique = parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
  return unique.length ? unique.join(" · ") : null;
}

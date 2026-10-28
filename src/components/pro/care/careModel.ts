// Release 3 · W6 Care network (MO7 v3): status words, chips and filters. Pure.

import { SUBTYPE_SINGULAR } from "../../professionals/subtypeLabels";
import type { Tone } from "../client/clientFormat";
export type ReferralStatus = "awaiting_client" | "declined_by_client" | "sent" | "accepted" | "declined" | "withdrawn" | "disputed" | "closed";

/** "Dietitian", "Physiotherapist", "Doctor" (the colleague's type as a label). */
export function typeLabel(type: string | null | undefined): string {
  const s = type ? (SUBTYPE_SINGULAR as Record<string, string>)[type] : null;
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Health professional";
}

export const firstName = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || "";

/** Received cards (careCard15): New, Accepted, Declined; a dispute is with support. */
export function receivedChip(status: ReferralStatus): { label: string; tone: Tone } {
  switch (status) {
    case "accepted":
      return { label: "Accepted", tone: "act" };
    case "declined":
      return { label: "Declined", tone: "att" };
    case "disputed":
    case "closed":
      return { label: status === "closed" ? "Closed" : "With support", tone: "pau" };
    case "withdrawn":
      return { label: "Withdrawn", tone: "pau" };
    default:
      return { label: "New", tone: "req" };
  }
}

/** Sent rows (referSent15): "Waiting for {client_first_name}" until the client agrees, then the colleague's answer. */
export function sentChip(status: ReferralStatus, clientFirst: string, proFirst: string): { label: string; tone: Tone } {
  switch (status) {
    case "awaiting_client":
      return { label: clientFirst ? `Waiting for ${clientFirst}` : "Waiting for the client", tone: "req" };
    case "sent":
      return { label: proFirst ? `With ${proFirst}` : "With your colleague", tone: "onb" };
    case "accepted":
      return { label: "Accepted", tone: "act" };
    case "declined":
      return { label: "Declined", tone: "att" };
    case "declined_by_client":
      return { label: clientFirst ? `${clientFirst} said no` : "The client said no", tone: "att" };
    case "withdrawn":
      return { label: "Withdrawn", tone: "pau" };
    case "disputed":
      return { label: "With support", tone: "pau" };
    case "closed":
      return { label: "Closed", tone: "pau" };
  }
}

export const canWithdraw = (s: ReferralStatus) => s === "awaiting_client" || s === "sent";
/**
 * MO7 v3 "decline, reason dropdown open": the frame's five reasons. Release A
 * stores the reason as text (care_referral_declines.reason, 1 to 500, read
 * by the two professionals only), so a
 * preset saves its label and Other saves what the professional types.
 * Optional: no reason chosen declines with none.
 */
export type ReferralDeclineReason = "fully_booked" | "outside_specialty" | "not_taking" | "too_far" | "other";
export const REFERRAL_DECLINE_REASONS: { value: ReferralDeclineReason; label: string }[] = [
  { value: "fully_booked", label: "Fully booked" },
  { value: "outside_specialty", label: "Outside my specialty" },
  { value: "not_taking", label: "Not taking referrals right now" },
  { value: "too_far", label: "Too far from the client" },
  { value: "other", label: "Other" },
];

/** The text respond_care_referral stores: the preset's label, Other's own words, or null. */
export function declineReasonText(reason: ReferralDeclineReason | null, other: string): string | null {
  if (!reason) return null;
  if (reason === "other") return other.trim() || null;
  return REFERRAL_DECLINE_REASONS.find((r) => r.value === reason)?.label ?? null;
}

/** dispute_care_referral takes sent, accepted and declined referrals (either side). */
export const canDispute = (s: ReferralStatus) => s === "sent" || s === "accepted" || s === "declined";

/**
 * The colleague filter chips (referStep15 chipRow10: Care network, Nearby,
 * Dietitians, Physios, Doctors; Trainers kept after them). "Nearby" is W6B-5,
 * colleagues_near_me (Release B), which lists colleagues outside the network
 * too; the type chips filter the network.
 */
export type ColleagueFilter = "all" | "nearby" | "dietitians" | "physios" | "doctors" | "trainers";
export const COLLEAGUE_FILTERS: { key: ColleagueFilter; label: string }[] = [
  { key: "all", label: "Care network" },
  { key: "nearby", label: "Nearby" },
  { key: "dietitians", label: "Dietitians" },
  { key: "physios", label: "Physios" },
  { key: "doctors", label: "Doctors" },
  { key: "trainers", label: "Trainers" },
];
export function matchesFilter(type: string | null, f: ColleagueFilter): boolean {
  if (f === "all" || f === "nearby") return true;
  if (f === "dietitians") return type === "dietitian" || type === "nutritionist";
  if (f === "physios") return type === "physiotherapist";
  if (f === "doctors") return type === "doctor";
  return type === "trainer" || type === "coach_instructor";
}

/**
 * A Nearby row's distance (the frame's "Physiotherapist · {n} km"):
 * colleagues_near_me returns a band, never a point, so the band is what
 * shows. band_rank 1 to 6 as discovery_reach() numbers them.
 */
const BANDS = ["under 2 km", "2 to 5 km", "5 to 10 km", "10 to 25 km", "25 to 50 km", "over 50 km"];
export const bandWords = (band: number): string => BANDS[Math.min(BANDS.length, Math.max(1, Math.round(band))) - 1];

/** "Physiotherapist · 2 to 5 km", with "· in your network" when they're already in it. */
export function nearbyLine(type: string | null, band: number, inNetwork: boolean): string {
  return [typeLabel(type), bandWords(band), inNetwork ? "in your network" : null].filter(Boolean).join(" · ");
}

/** "today, 9:40 AM" / "yesterday" / "Oct 10" for the card's received line. */
export function whenWord(iso: string, now = new Date(), clock?: (d: Date) => string): string {
  const d = new Date(iso);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return clock ? `today, ${clock(d)}` : "today";
  if (d.toDateString() === y.toDateString()) return "yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

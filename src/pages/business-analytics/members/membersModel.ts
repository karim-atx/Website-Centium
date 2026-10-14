import type { BizKind } from "../../../components/business-more/kind";

// The Members section's pages per type (AN4 frames for the drawn structure;
// OURS-AN4-gym-variant and OURS-AN4-classes-variant for the per-type set and
// vocabulary; AN4-045 for Store).
//
// WHAT IS LIVE AND WHAT WAITS. V6-51 defines a member as a distinct person
// with an active business_members row OR an active gym_membership; that
// de-duplicated count, the growth / first-90-day / engagement / at-risk
// readers and the per-plan split are backend stage B7 (BU5-06 / BU5-07),
// which is not on the local stack yet, so those values read "–" with a
// coming line (never a guessed number). Visits and Not seen in 14 days wait
// for check-ins (BU5-16). Store customers wait for orders (BU5-15). Live
// today: the number of membership plans, member codes (create, copy, share,
// redeemed share) and every venue's roster.

export type MembersPageKey = "growth" | "first90" | "engagement" | "atrisk" | "visits" | "notseen" | "plans";

export interface MembersPageDef {
  key: MembersPageKey;
  title: string;
  /** The number-box labels (head[0] is the index value). */
  boxes: [string, string];
  /** The coming line while the reader is not on the stack. */
  coming: string;
  /** Which stage it waits for. */
  waits: "B7" | "check-ins";
}

export interface MembersVocab {
  /** Section label, crumb and picker header ("Members sections"). */
  label: "Members" | "Clients" | "Customers";
  people: "members" | "clients" | "customers";
  one: "member" | "client" | "customer";
}

export function vocabOf(kind: BizKind): MembersVocab {
  if (kind === "classes") return { label: "Clients", people: "clients", one: "client" };
  if (kind === "store") return { label: "Customers", people: "customers", one: "customer" };
  return { label: "Members", people: "members", one: "member" };
}

const CHECK_INS = "Shows once members start checking in at your front desk.";

export function pagesOf(kind: BizKind): MembersPageDef[] {
  if (kind === "store") return [];
  if (kind === "classes")
    return [
      { key: "growth", title: "Growth", boxes: ["Active clients", "New clients"], coming: "Coming soon: how many clients booked in this range, and how many were new.", waits: "B7" },
      { key: "first90", title: "First 90 days", boxes: ["New in the last 90 days", "Booked again in 2 weeks"], coming: "Coming soon: how many new clients book again in their first weeks.", waits: "B7" },
      { key: "engagement", title: "Engagement", boxes: ["Bookings a week", "Booked this period"], coming: "Coming soon: how often clients book, compared with their own usual rhythm.", waits: "B7" },
      { key: "atrisk", title: "At risk", boxes: ["Clients at risk", "Average drop vs their usual"], coming: "Coming soon: clients who have stopped booking or book far less than usual.", waits: "B7" },
      { key: "plans", title: "Plans", boxes: ["Membership plans", "On the most popular plan"], coming: "Coming soon: how clients on a plan split across your plans.", waits: "B7" },
    ];
  return [
    { key: "growth", title: "Growth", boxes: ["Active members", "Average membership length"], coming: "Coming soon: how many members joined and left in this range.", waits: "B7" },
    { key: "first90", title: "First 90 days", boxes: ["Joined in the last 90 days", "Still active"], coming: "Coming soon: how many new members are still with you after 90 days.", waits: "B7" },
    { key: "visits", title: "Visits", boxes: ["Visits a week", "Visited this period"], coming: CHECK_INS, waits: "check-ins" },
    { key: "notseen", title: "Not seen in 14 days", boxes: ["Not seen in 14 days", "Longest away"], coming: CHECK_INS, waits: "check-ins" },
    { key: "plans", title: "Plans", boxes: ["Membership plans", "On the most popular plan"], coming: "Coming soon: how members split across your plans.", waits: "B7" },
  ];
}

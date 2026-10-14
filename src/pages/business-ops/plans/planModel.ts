import type { MembershipBilling, MembershipPlanRow, PlanKind, PlanStatus } from "../../../services/membership-plans/types";

// v6 Batch 4 · Plans (OP1-037…052, 096…111, 157…178). The words and the
// derived values the plan list, the plan page and the plan sheet share, kept
// free of React and Supabase so they are tested on their own. Every template
// is the OpsTabsV4 source's (logic 419-426, 492-498, 559-605); the strings we
// wrote are marked OURS and listed in the checklists.

export const KIND_LABEL: Record<PlanKind, string> = {
  membership: "Membership",
  day_pass: "Day pass",
  class_pack: "Class pack",
  intro_offer: "Intro offer",
  drop_in: "Drop-in",
};

/** Group label per plan type (OP1-040 row 4, logic 419-422). */
export const GROUP_OF: Record<PlanKind, string> = {
  membership: "Memberships",
  class_pack: "Class packs",
  day_pass: "Day passes and drop-ins",
  drop_in: "Day passes and drop-ins",
  intro_offer: "Intro offers",
};

export const GROUP_ORDER = ["Memberships", "Class packs", "Day passes and drop-ins", "Intro offers"];

/** "a day" / "a month" / "a year" (OP1-022 row 15). */
export function periodPhrase(billing: MembershipBilling): string {
  return billing === "daily" ? "a day" : billing === "annually" ? "a year" : "a month";
}

/** The list and page price line: "$100 a month". */
export const priceLine = (p: Pick<MembershipPlanRow, "price" | "billing">): string => `${p.price} ${periodPhrase(p.billing)}`;

/** Detail row "Billing" values (source: Monthly, Annually, Daily). */
export function billingLabel(billing: MembershipBilling): string {
  return billing === "daily" ? "Daily" : billing === "annually" ? "Annually" : "Monthly";
}

/** "Renews" row value on the plan page (source: Monthly). */
export function renewsLabel(billing: MembershipBilling): string {
  return billing === "annually" ? "Yearly" : "Monthly";
}

/** "Renews" row sub (source: "Billed each month until cancelled"; yearly OURS). */
export function renewsSub(billing: MembershipBilling): string {
  return billing === "annually" ? "Billed each year until cancelled" : "Billed each month until cancelled";
}

/** Tile icon key per plan (OP1-022 row 13): repeat monthly, calendar-range annual, sun day pass. */
export type PlanIconKey = "repeat" | "calendar-range" | "sun" | "ticket" | "sparkles" | "door-open" | "graduation-cap";
export function planIcon(p: Pick<MembershipPlanRow, "kind" | "billing">): PlanIconKey {
  if (p.kind === "day_pass") return "sun";
  if (p.kind === "class_pack") return "ticket";
  if (p.kind === "intro_offer") return "sparkles";
  if (p.kind === "drop_in") return "door-open";
  return p.billing === "annually" ? "calendar-range" : "repeat";
}

/** Preview tile icon per plan type (logic 591). */
export const PREVIEW_ICON: Record<PlanKind, PlanIconKey> = {
  membership: "graduation-cap",
  class_pack: "ticket",
  intro_offer: "sparkles",
  drop_in: "door-open",
  day_pass: "sun",
};

/** "{n} plan" / "{n} plans" (OP1-022 row 10). */
export const plansCount = (n: number): string => `${n} ${n === 1 ? "plan" : "plans"}`;

/**
 * The row's third line (OP1-022 row 16): memberships "{n} active members";
 * day passes "{n} active passes" (OURS until "sold this period", BU2-12).
 */
export function membersLine(kind: PlanKind, n: number): string {
  if (kind === "day_pass") return `${n} active ${n === 1 ? "pass" : "passes"}`;
  return `${n} active ${n === 1 ? "member" : "members"}`;
}

/** Status pill label (logic 403). */
export const STATUS_LABEL: Record<Exclude<PlanStatus, "archived">, string> = { active: "Active", paused: "Paused", hidden: "Hidden" };

/** The plan page status line (logic 494; hidden OURS). */
export function statusLine(status: PlanStatus): string {
  if (status === "paused") return "Paused: nobody new can buy it. Current members keep it.";
  if (status === "hidden") return "Hidden: not on Explore. Current members keep it.";
  return "Members can buy it on Explore";
}

/**
 * The figures line (OP1-022 row 9, logic 461): only sentences the data
 * supports. No plans: the source's empty line. Plans but no members yet: OURS.
 */
export function figuresLine(plans: Pick<MembershipPlanRow, "name" | "status">[], counts: Map<string, number> | null, early = false): string {
  if (plans.length === 0) return "Add your first plan to start selling memberships.";
  const parts: string[] = [];
  if (counts) {
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    let best: { name: string; n: number } | null = null;
    for (const p of plans) {
      const n = counts.get(p.name) ?? 0;
      if (n > 0 && (!best || n > best.n)) best = { name: p.name, n };
    }
    // OP1-032 row 2: early data says so instead of naming a most popular plan.
    // The source's second sentence ("Value per class shows after 2 weeks of
    // bookings.") waits for the value-per-class figure (B15).
    if (early && total > 0) parts.push("Your first members joined this month.");
    else if (best && total > 0) parts.push(`${best.name} is the most popular plan: ${best.n} of ${total} members.`);
    else parts.push("Members show here once someone buys a plan on Explore.");
  }
  for (const p of plans) if (p.status === "paused") parts.push(`${p.name} is paused.`);
  return parts.join(" ");
}

/**
 * Early data (OP1-032; HANDOVER 3.10 hides deltas under 14 days): the first
 * active membership started under 14 days ago, in this calendar month (the
 * line says "this month"). Dates are ISO days.
 */
export function isEarly(firstStarted: string | null, today: string): boolean {
  if (!firstStarted) return false;
  const days = Math.round((Date.parse(today) - Date.parse(firstStarted.slice(0, 10))) / 86400000);
  return days >= 0 && days < 14 && firstStarted.slice(0, 7) === today.slice(0, 7);
}

/** "a" / "an" before a lower-case type name (OP1-107 template). */
export const article = (word: string): string => (/^[aeiou]/i.test(word) ? "an" : "a");

/** OP1-107 row 5: the switch note, from / to types (template OURS, sentence literal). */
export function switchNote(from: PlanKind, to: PlanKind): string {
  const toLower = KIND_LABEL[to].toLowerCase();
  return `Switched from ${KIND_LABEL[from]}. Name, price and payment type were kept; the fields below them changed to fit ${article(toLower)} ${toLower}.`;
}

/** The sheet's price label per type (logic 573). */
export function priceLabel(kind: PlanKind): string {
  return kind === "day_pass" ? "Price per day" : kind === "drop_in" ? "Price per class" : "Price";
}

/** Name placeholder per type (OP1-041 row 10; others OURS from the source samples). */
export function namePlaceholder(kind: PlanKind): string {
  return kind === "day_pass" ? "Day pass" : kind === "class_pack" ? "10-class pack" : kind === "intro_offer" ? "Intro week" : kind === "drop_in" ? "Drop-in" : "Monthly Membership";
}

/** Billing period choice in the sheet (OP1-158 row 10). Only Monthly and Yearly are columns today. */
export type BillingChoice = "weekly" | "monthly" | "every_3_months" | "every_6_months" | "yearly";
export const BILLING_CHOICES: { value: BillingChoice; label: string; live: boolean }[] = [
  { value: "weekly", label: "Weekly", live: false },
  { value: "monthly", label: "Monthly", live: true },
  { value: "every_3_months", label: "Every 3 months", live: false },
  { value: "every_6_months", label: "Every 6 months", live: false },
  { value: "yearly", label: "Yearly", live: true },
];
export const billingOfChoice = (c: BillingChoice): MembershipBilling => (c === "yearly" ? "annually" : "monthly");
export const choiceOfBilling = (b: MembershipBilling): BillingChoice => (b === "annually" ? "yearly" : "monthly");
export const choiceLabel = (c: BillingChoice): string => BILLING_CHOICES.find((x) => x.value === c)?.label ?? "Monthly";

/** "a month" / "a year" / "every 3 months" (logic 602 templates). */
export function choicePhrase(c: BillingChoice): string {
  return c === "weekly" ? "a week" : c === "yearly" ? "a year" : c === "every_3_months" ? "every 3 months" : c === "every_6_months" ? "every 6 months" : "a month";
}

/** Price as typed, read for the preview ("$75"), or null when it is not a number. */
export function previewPrice(input: string): string | null {
  const cleaned = input.trim().replace(/[$€£\s,]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/** "Pay with cash" (logic 591: lower-case method, "Whish Money" restored). */
export function payWith(method: string): string {
  return "Pay with " + method.toLowerCase().replace("whish money", "Whish Money");
}

/**
 * Preview line 1 (logic 591 / 602): membership "${price} {period}" plus the
 * limit phrase when the business runs classes ("unlimited classes", OURS for
 * the default); day pass "${price} a day · {covers lower case}".
 */
export function previewLine1(kind: PlanKind, price: string, period: BillingChoice, runsClasses: boolean): string {
  if (kind === "day_pass") return `${price} a day · ${runsClasses ? "all classes" : "gym entry"}`;
  return `${price} ${choicePhrase(period)}${runsClasses ? " · unlimited classes" : ""}`;
}

/** "2 Sep" from an ISO date (the plan page's member rows). */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]}`;
}

/** Two-letter initials from a first name ("Taylor" → "T"; "Mary Ann" → "MA"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
}

/**
 * Plan names that more than one plan uses: venue_members names the plan, not
 * its id, so a shared name's members cannot be told apart and are not shown.
 */
export function sharedNames(plans: Pick<MembershipPlanRow, "name">[]): Set<string> {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const p of plans) (seen.has(p.name) ? dup : seen).add(p.name);
  return dup;
}

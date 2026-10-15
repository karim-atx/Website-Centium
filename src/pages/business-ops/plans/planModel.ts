import type { MembershipBilling, MembershipPlanRow, PlanKind, PlanStatus } from "../../../services/membership-plans/types";

// v6 Batch 4 · Plans (OP1-037…052, 096…111, 157…178). The words and the
// derived values the plan list, the plan page and the plan sheet share, kept
// free of React and Supabase so they are tested on their own. Every template
// is the OpsTabsV4 source's (logic 419-426, 492-498, 559-605); the strings we
// wrote are marked OURS and listed in the checklists. B7 MB-03 supplies the
// type, status, limits, class types, commitment and conversion columns.

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

/** "a day" / "a month" / "every 3 months" / "every 6 months" / "a year" (OP1-022 row 15). */
export function periodPhrase(billing: MembershipBilling): string {
  return billing === "daily"
    ? "a day"
    : billing === "annually"
      ? "a year"
      : billing === "quarterly"
        ? "every 3 months"
        : billing === "semiannually"
          ? "every 6 months"
          : "a month";
}

/** The period a limit counts in ("a month", "every 3 months"): the billing period (visits_per_period). */
export const perPeriod = periodPhrase;

/** "7 days", "2 months", "1 year" from valid_for_days. */
export function daysLabel(days: number | null): string {
  if (!days) return "";
  if (days % 365 === 0) return `${days / 365} ${days === 365 ? "year" : "years"}`;
  if (days % 30 === 0) return `${days / 30} ${days === 30 ? "month" : "months"}`;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/**
 * The list and page price line per type (OP1-022 row 15): "$100 a month",
 * "$120 for 10 classes", "$15 a day", "$18 a class", "$20 for 7 days".
 */
export function priceLine(p: Pick<MembershipPlanRow, "price" | "billing" | "kind" | "sessionsInPack" | "validForDays">): string {
  if (p.kind === "class_pack") return p.sessionsInPack ? `${p.price} for ${p.sessionsInPack} classes` : p.price;
  if (p.kind === "day_pass") return `${p.price} a day`;
  if (p.kind === "drop_in") return `${p.price} a class`;
  if (p.kind === "intro_offer") return p.validForDays ? `${p.price} for ${daysLabel(p.validForDays)}` : p.price;
  return `${p.price} ${periodPhrase(p.billing)}`;
}

/** Detail row "Billing" values (source: Monthly, Annually, Daily). */
export function billingLabel(billing: MembershipBilling): string {
  return billing === "daily"
    ? "Daily"
    : billing === "annually"
      ? "Annually"
      : billing === "quarterly"
        ? "Every 3 months"
        : billing === "semiannually"
          ? "Every 6 months"
          : "Monthly";
}

/** "Renews" row value on the plan page (source: Monthly). */
export function renewsLabel(billing: MembershipBilling): string {
  return billing === "annually" ? "Yearly" : billingLabel(billing);
}

/** "Renews" row sub (source: "Billed each month until cancelled"; others OURS). */
export function renewsSub(billing: MembershipBilling): string {
  return billing === "annually"
    ? "Billed each year until cancelled"
    : billing === "quarterly"
      ? "Billed every 3 months until cancelled"
      : billing === "semiannually"
        ? "Billed every 6 months until cancelled"
        : "Billed each month until cancelled";
}

/** Tile icon key per plan (OP1-022 row 13): repeat monthly, calendar-range annual, sun day pass. */
export type PlanIconKey = "repeat" | "calendar-range" | "sun" | "ticket" | "sparkles" | "door-open" | "graduation-cap";
export function planIcon(p: Pick<MembershipPlanRow, "kind" | "billing">): PlanIconKey {
  if (p.kind === "day_pass") return "sun";
  if (p.kind === "class_pack") return "ticket";
  if (p.kind === "intro_offer") return "sparkles";
  if (p.kind === "drop_in") return "door-open";
  return p.billing === "monthly" ? "repeat" : "calendar-range";
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
 * The row's third line (OP1-022 row 16): memberships "{n} active members",
 * packs "{n} active packs"; day passes, drop-ins and intro offers "{n} active"
 * (OURS: the fallback while business_plan_figures is unread; periodLine wins).
 */
export function membersLine(kind: PlanKind, n: number): string {
  if (kind === "class_pack") return `${n} active ${n === 1 ? "pack" : "packs"}`;
  if (kind === "day_pass") return `${n} active ${n === 1 ? "pass" : "passes"}`;
  if (kind === "membership") return `${n} active ${n === 1 ? "member" : "members"}`;
  return `${n} active`;
}

/**
 * OP1-022 row 16 / OP1-036 row 3 (B15 MB-04 business_plan_figures .sold, new
 * sales not renewals): day passes and drop-ins "{n} sold this period", intro
 * offers "{n} used this period". Null for the kinds that keep membersLine.
 */
export function periodLine(kind: PlanKind, sold: number): string | null {
  if (kind === "day_pass" || kind === "drop_in") return `${sold} sold this period`;
  if (kind === "intro_offer") return `${sold} used this period`;
  return null;
}

/** Status pill label (logic 403). */
export const STATUS_LABEL: Record<Exclude<PlanStatus, "archived">, string> = { active: "Active", paused: "Paused", hidden: "Hidden" };

/** The plan page status line (logic 494; V6-47 paused copy; hidden and archived OURS). */
export function statusLine(status: PlanStatus): string {
  if (status === "paused") return "Paused: nobody new can buy it. Members keep their plan and renewals continue.";
  if (status === "hidden") return "Hidden: not on Explore. Current members keep it.";
  if (status === "archived") return "Archived: not on Explore and can't be bought. Current members keep it until it ends.";
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

/**
 * Billing period choice in the sheet (OP1-158 row 10). Every 3 / 6 months
 * are billing_period quarterly / semiannually (B7); there is no weekly value
 * in the enum, so Weekly stays "Soon".
 */
export type BillingChoice = "weekly" | "monthly" | "every_3_months" | "every_6_months" | "yearly";
export const BILLING_CHOICES: { value: BillingChoice; label: string; live: boolean }[] = [
  { value: "weekly", label: "Weekly", live: false },
  { value: "monthly", label: "Monthly", live: true },
  { value: "every_3_months", label: "Every 3 months", live: true },
  { value: "every_6_months", label: "Every 6 months", live: true },
  { value: "yearly", label: "Yearly", live: true },
];
export const billingOfChoice = (c: BillingChoice): MembershipBilling =>
  c === "yearly" ? "annually" : c === "every_3_months" ? "quarterly" : c === "every_6_months" ? "semiannually" : "monthly";
export const choiceOfBilling = (b: MembershipBilling): BillingChoice =>
  b === "annually" ? "yearly" : b === "quarterly" ? "every_3_months" : b === "semiannually" ? "every_6_months" : "monthly";
export const choiceLabel = (c: BillingChoice): string => BILLING_CHOICES.find((x) => x.value === c)?.label ?? "Monthly";

/** "a month" / "a year" / "every 3 months" (logic 602 templates). */
export function choicePhrase(c: BillingChoice): string {
  return c === "weekly" ? "a week" : c === "yearly" ? "a year" : c === "every_3_months" ? "every 3 months" : c === "every_6_months" ? "every 6 months" : "a month";
}

/**
 * The billing period stored for the types that have none of their own (the
 * column is NOT NULL): a day pass and a drop-in are daily; a class pack or an
 * intro offer takes the shortest period that covers its validity.
 */
export function billingForKind(kind: PlanKind, choice: BillingChoice, validForDays: number | null): MembershipBilling {
  if (kind === "membership") return billingOfChoice(choice);
  if (kind === "day_pass" || kind === "drop_in") return "daily";
  const d = validForDays ?? 30;
  return d <= 31 ? "monthly" : d <= 92 ? "quarterly" : d <= 183 ? "semiannually" : "annually";
}

/** Valid for (class pack, OURS menu): 1, 2, 3, 6, 12 months as days. */
export const VALID_FOR = [30, 60, 90, 180, 365];
/** Length (intro offer, OURS menu): 3, 7, 14, 30 days. */
export const LENGTHS = [3, 7, 14, 30];
/** Minimum commitment (OP1-173) in months; 0 = None. */
export const COMMITMENTS = [0, 3, 6, 12];
/** Notice (OP1-173) in days; 0 = Cancel anytime. */
export const NOTICES = [0, 14, 30];

/** Commitment field value (OP1-175): "None, cancel anytime", "6 months, 30 days' notice". */
export function commitmentLabel(months: number | null, notice: number | null): string {
  const a = months ? `${months} months` : "None";
  const b = notice ? `${notice} days' notice` : "cancel anytime";
  return `${a}, ${b}`;
}

/** Includes / Covers / Which classes value (OP1-163 rule): "All classes", the one name, or "{n} class types". */
export function classesLabel(set: string[] | null, allLabel = "All classes"): string {
  if (!set || set.length === 0) return allLabel;
  return set.length === 1 ? set[0]! : `${set.length} class types`;
}

/** Limit value (OP1-166): "Unlimited" (NULL; never "0") or "Up to 12 a month". */
export function limitLabel(n: number | null, billing: MembershipBilling): string {
  return n && n > 0 ? `Up to ${n} ${perPeriod(billing)}` : "Unlimited";
}

/** "Spin 45 and Yoga Flow", "A, B and C". */
export function joinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
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

export interface PreviewInput {
  kind: PlanKind;
  price: string;
  period: BillingChoice;
  runsClasses: boolean;
  classes: string[] | null;
  limit: number | null;
  sessions: number | null;
  validForDays: number | null;
  commitMonths: number | null;
  noticeDays: number | null;
}

/**
 * Preview lines (logic 591 / 602): line 1 the price and its terms, line 2 the
 * chosen classes and a commitment other than the default (full form, OP1-176),
 * or "" when there is nothing to add. The pay line is separate (Q-P8).
 */
export function previewLines(x: PreviewInput): [string, string] {
  const covers = x.classes && x.classes.length ? joinAnd(x.classes) : x.runsClasses ? "all classes" : "gym entry";
  if (x.kind === "day_pass") return [`${x.price} a day · ${covers}`, ""];
  if (x.kind === "drop_in") return [`${x.price} a class · ${covers}`, ""];
  if (x.kind === "class_pack") {
    const s = x.sessions ? ` for ${x.sessions} classes` : "";
    const v = x.validForDays ? ` · valid ${daysLabel(x.validForDays)}` : "";
    return [`${x.price}${s}${v}`, x.classes && x.classes.length ? x.classes.join(", ") : ""];
  }
  if (x.kind === "intro_offer") return [`${x.price}${x.validForDays ? ` for ${daysLabel(x.validForDays)}` : ""}`, ""];
  const limit = x.limit && x.limit > 0 ? ` · up to ${x.limit} classes ${choicePhrase(x.period)}` : x.runsClasses ? " · unlimited classes" : "";
  const extra: string[] = [];
  if (x.classes && x.classes.length) extra.push(x.classes.join(", "));
  if (x.commitMonths || x.noticeDays) extra.push(commitmentLabel(x.commitMonths, x.noticeDays));
  return [`${x.price} ${choicePhrase(x.period)}${limit}`, extra.join(" · ")];
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

/** OP1-052 toast (n = 0 and 1 OURS). */
export function archivedToast(name: string, n: number | null): string {
  if (!n) return `${name} archived.`;
  if (n === 1) return `${name} archived. 1 member keeps it until it ends.`;
  return `${name} archived. ${n} members keep it until it ends.`;
}

/** OP1-051 body (0 members OURS). */
export function archiveBody(n: number | null): string {
  if (!n) return "It's removed from Explore and can't be bought.";
  return `It's removed from Explore and can't be bought. The ${n} current ${n === 1 ? "member keeps" : "members keep"} it until it ends.`;
}

/**
 * The class types a plan may name: trimmed, de-duplicated, and only those the
 * database accepts (1 to 60 characters). The rest are listed as too long.
 */
export function classTypeOptions(types: string[]): { ok: string[]; tooLong: string[] } {
  const seen = new Set<string>();
  const ok: string[] = [];
  const tooLong: string[] = [];
  for (const raw of types) {
    const t = raw.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    (t.length > 60 ? tooLong : ok).push(t);
  }
  return { ok, tooLong };
}

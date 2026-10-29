import type { MembershipBilling, MembershipPlanRow, PlanKind, PlanStatus } from "../../../services/membership-plans/types";

// Market + Share 3.0 · W3 · B-MA.5 Memberships / B-MA.5.1 Edit a plan: the
// words and derived values the plan list, the plan page and the Add / Edit
// plan sheet share, kept free of React and Supabase so they are tested on
// their own. The drawn values come from Business Marketplace Screens (`plan`,
// `bizPlans`, `members`, `chipSet`); the kept live values (plan types,
// limits, commitment, converts-to, the Explore preview, D-15) are the v6
// plan screens' (OpsTabsV4 templates), restyled. Strings we wrote are marked
// OURS.

export const KIND_LABEL: Record<PlanKind, string> = {
  membership: "Membership",
  day_pass: "Day pass",
  class_pack: "Class pack",
  intro_offer: "Intro offer",
  drop_in: "Drop-in",
};

/** "a day" / "a month" / "every 3 months" / "every 6 months" / "a year". */
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

/** "7 days", "2 months", "1 year" from valid_for_days. */
export function daysLabel(days: number | null): string {
  if (!days) return "";
  if (days % 365 === 0) return `${days / 365} ${days === 365 ? "year" : "years"}`;
  if (days % 30 === 0) return `${days / 30} ${days === 30 ? "month" : "months"}`;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/**
 * The price line per type (the plan page and the share card): "$100 a month",
 * "$120 for 10 classes", "$15 a day", "$18 a class", "$20 for 7 days".
 */
export function priceLine(p: Pick<MembershipPlanRow, "price" | "billing" | "kind" | "sessionsInPack" | "validForDays">): string {
  if (p.kind === "class_pack") return p.sessionsInPack ? `${p.price} for ${p.sessionsInPack} classes` : p.price;
  if (p.kind === "day_pass") return `${p.price} a day`;
  if (p.kind === "drop_in") return `${p.price} a class`;
  if (p.kind === "intro_offer") return p.validForDays ? `${p.price} for ${daysLabel(p.validForDays)}` : p.price;
  return `${p.price} ${periodPhrase(p.billing)}`;
}

/** Billing as a word (the share card, the plan page). */
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

/** "Renews" row value on the plan page. */
export function renewsLabel(billing: MembershipBilling): string {
  return billing === "annually" ? "Yearly" : billingLabel(billing);
}

/** "Renews" row sub on the plan page. */
export function renewsSub(billing: MembershipBilling): string {
  return billing === "annually"
    ? "Billed each year until cancelled"
    : billing === "quarterly"
      ? "Renews every 3 months until cancelled"
      : billing === "semiannually"
        ? "Renews every 6 months until cancelled"
        : "Billed each month until cancelled";
}

// ---------------------------------------------------------------------------
// B-MA.5 plan cards

/** Days in one billing period ("{duration}" on the card: Monthly "30 days", 3 months "90 days", Day pass "1 day"). */
export const PERIOD_DAYS: Record<MembershipBilling, number> = { daily: 1, monthly: 30, quarterly: 90, semiannually: 180, annually: 365 };

const nDays = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/**
 * The card's "{duration}" (bizPlans `dur`): the days one purchase covers. A
 * class pack is its classes and validity, an intro offer its length, a
 * drop-in one class (OURS for the three live types the board doesn't draw).
 */
export function durationLabel(p: Pick<MembershipPlanRow, "kind" | "billing" | "sessionsInPack" | "validForDays">): string {
  if (p.kind === "day_pass") return nDays(1);
  if (p.kind === "drop_in") return "1 class";
  if (p.kind === "class_pack") {
    const parts = [p.sessionsInPack ? `${p.sessionsInPack} ${p.sessionsInPack === 1 ? "class" : "classes"}` : null, p.validForDays ? nDays(p.validForDays) : null];
    return parts.filter(Boolean).join(" · ");
  }
  if (p.kind === "intro_offer") return p.validForDays ? nDays(p.validForDays) : "";
  return nDays(PERIOD_DAYS[p.billing]);
}

/** The card's second line "{duration} · {included}" (the new plan's two lines joined with " · ", bizPlans line 782). */
export function cardMeta(p: Pick<MembershipPlanRow, "kind" | "billing" | "sessionsInPack" | "validForDays" | "includes">): string {
  return [durationLabel(p), ...(p.includes ?? []).map((x) => x.trim()).filter(Boolean)].filter(Boolean).join(" · ");
}

export type ChipTone = "good" | "warn" | "soft";

/** The status chip (bizPlans: Active good, Paused warn; Hidden and Archived OURS in the board's soft tone). */
export function statusChip(status: PlanStatus): { label: string; tone: ChipTone } {
  if (status === "paused") return { label: "Paused", tone: "warn" };
  if (status === "hidden") return { label: "Hidden", tone: "soft" };
  if (status === "archived") return { label: "Archived", tone: "soft" };
  return { label: "Active", tone: "good" };
}

export interface CardFigures {
  /** Active holders now (business_plan_figures.active_now, or the venue members on the plan); null when unknown. */
  active: number | null;
  /** New sales this calendar month to date; null when unknown. */
  soldMonth: number | null;
  /** New sales today; null when unknown. */
  soldToday: number | null;
  /** Added in this visit and still without members ("New · no members yet"). */
  isNew?: boolean;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The card's members line (bizPlans `members`): "Not on sale" for a paused
 * plan; "21 sold this month" for a day pass (and a drop-in), with today's
 * sales after it when there are any (the Day passes tab's "Sold today",
 * PLAN §3.4); "12 used this month" for an intro offer (OURS); "128 members"
 * otherwise (a class pack counts its holders); "New · no members yet" for a
 * plan just added. Null when nothing is known.
 */
export function memberLine(p: Pick<MembershipPlanRow, "kind" | "dbStatus">, f: CardFigures): string | null {
  if (p.dbStatus === "paused") return "Not on sale";
  if (f.isNew && !f.active && !f.soldMonth) return "New · no members yet";
  if (p.kind === "day_pass" || p.kind === "drop_in") {
    if (f.soldMonth === null) return null;
    const today = f.soldToday ? ` · ${f.soldToday} today` : "";
    return `${f.soldMonth} sold this month${today}`;
  }
  if (p.kind === "intro_offer") return f.soldMonth === null ? null : `${f.soldMonth} used this month`;
  if (f.active === null) return null;
  return plural(f.active, "member", "members");
}

/** The plan page status line. */
export function statusLine(status: PlanStatus): string {
  if (status === "paused") return "Paused: nobody new can buy it. Members keep their plan and renewals continue.";
  if (status === "hidden") return "Hidden: not on Explore. Current members keep it.";
  if (status === "archived") return "Archived: not on Explore and can't be bought. Current members keep it until it ends.";
  return "Members can buy it on Explore";
}

// ---------------------------------------------------------------------------
// The Add / Edit plan sheet (`plan`, D-15 / D-16)

/**
 * The drawn Billing chips (`chipSet(["One-time", "Monthly", "3 months",
 * "6 months", "12 months"])`) on the live billing_period enum (D-16):
 * One-time = daily (the day pass / drop-in types, and the one-off class pack
 * and intro offer); Monthly = monthly; 3 / 6 / 12 months = quarterly /
 * semiannually / annually.
 */
export const BILLING_CHIPS: { value: MembershipBilling; label: string }[] = [
  { value: "daily", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "3 months" },
  { value: "semiannually", label: "6 months" },
  { value: "annually", label: "12 months" },
];

/** The chip a plan shows: every type but Membership is One-time; a Membership shows its period (null = none chosen yet). */
export function billingChipOf(kind: PlanKind, billing: MembershipBilling | null): MembershipBilling | null {
  return kind === "membership" ? billing : "daily";
}

/** Which type One-time turns a Membership into: a Day pass where offered, else a Drop-in, else a Class pack; null when none is. */
export function oneTimeKind(kinds: PlanKind[]): PlanKind | null {
  return (["day_pass", "drop_in", "class_pack", "intro_offer"] as PlanKind[]).find((k) => kinds.includes(k)) ?? null;
}

/** The class-based types are offered only to a business that runs classes (V6-47). */
const CLASS_BASED: PlanKind[] = ["class_pack", "drop_in"];
const ALL_KINDS: PlanKind[] = ["membership", "day_pass", "class_pack", "intro_offer", "drop_in"];

/**
 * The Type chips: the drawn Membership · Day pass first, then the live types
 * the business may sell (plan_types_for_business_type; null offers every
 * type), class-based ones only when it runs classes. The plan's own type is
 * always kept.
 */
export function typeChips(offered: PlanKind[] | null, runsClasses: boolean, current: PlanKind): PlanKind[] {
  return ALL_KINDS.filter((k) => k === current || k === "membership" || ((!offered || offered.includes(k)) && (runsClasses || !CLASS_BASED.includes(k))));
}

/**
 * The billing period stored per type (the column is NOT NULL): a Membership
 * its chip; a day pass and a drop-in daily; a class pack or an intro offer
 * the shortest period that covers its validity.
 */
export function billingForKind(kind: PlanKind, chip: MembershipBilling | null, validForDays: number | null): MembershipBilling {
  if (kind === "membership") return chip ?? "monthly";
  if (kind === "day_pass" || kind === "drop_in") return "daily";
  const d = validForDays ?? 30;
  return d <= 31 ? "monthly" : d <= 92 ? "quarterly" : d <= 183 ? "semiannually" : "annually";
}

/** The price as typed, read ("$75", "$8.50"), or null when it is not a number. */
export function previewPrice(input: string): string | null {
  const cleaned = input.trim().replace(/[$€£\s,]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/** The Price box's error: the board's "Enter a price for this plan." when empty; OURS when it isn't a number. */
export function priceProblem(input: string): string | null {
  if (!input.trim()) return "Enter a price for this plan.";
  if (!previewPrice(input)) return "Enter the price as a number, for example 45.";
  return null;
}

/** includes (membership_plans_text_sets_check: distinct, at most 20, each at most 120 characters). */
export const INCLUDES_MAX = 20;
export const INCLUDE_MAX_LEN = 120;

/** The "What's included" lines as stored: trimmed, blanks and repeats dropped; null when none. */
export function cleanIncludes(lines: string[]): string[] | null {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out.length ? out : null;
}

/** Why the lines can't be saved (OURS), or null. */
export function includesProblem(lines: string[]): string | null {
  const clean = cleanIncludes(lines) ?? [];
  if (clean.length > INCLUDES_MAX) return `Keep it to ${INCLUDES_MAX} lines.`;
  if (clean.some((x) => x.length > INCLUDE_MAX_LEN)) return `Each line can be ${INCLUDE_MAX_LEN} characters at most.`;
  return null;
}

/** "a" / "an" before a lower-case type name. */
export const article = (word: string): string => (/^[aeiou]/i.test(word) ? "an" : "a");

/** The type switch note (kept from the v6 sheet). */
export function switchNote(from: PlanKind, to: PlanKind): string {
  const toLower = KIND_LABEL[to].toLowerCase();
  return `Switched from ${KIND_LABEL[from]}. Name, price and payment type were kept; the fields below them changed to fit ${article(toLower)} ${toLower}.`;
}

/** Valid for (class pack): 1, 2, 3, 6, 12 months as days. */
export const VALID_FOR = [30, 60, 90, 180, 365];
/** Length (intro offer): 3, 7, 14, 30 days. */
export const LENGTHS = [3, 7, 14, 30];
/** Minimum commitment in months; 0 = None. */
export const COMMITMENTS = [0, 3, 6, 12];
/** Notice in days; 0 = Cancel anytime. */
export const NOTICES = [0, 14, 30];

/** Commitment value: "None, cancel anytime", "6 months, 30 days' notice". */
export function commitmentLabel(months: number | null, notice: number | null): string {
  const a = months ? `${months} months` : "None";
  const b = notice ? `${notice} days' notice` : "cancel anytime";
  return `${a}, ${b}`;
}

/** Includes / Covers / Which classes value: "All classes", the one name, or "{n} class types". */
export function classesLabel(set: string[] | null, allLabel = "All classes"): string {
  if (!set || set.length === 0) return allLabel;
  return set.length === 1 ? set[0]! : `${set.length} class types`;
}

/** Limit value: "Unlimited" (NULL; never "0") or "Up to 12 a month". */
export function limitLabel(n: number | null, billing: MembershipBilling): string {
  return n && n > 0 ? `Up to ${n} ${periodPhrase(billing)}` : "Unlimited";
}

/** "Spin 45 and Yoga Flow", "A, B and C". */
export function joinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "Pay with cash" (lower-case method, "Whish Money" restored). */
export function payWith(method: string): string {
  return "Pay with " + method.toLowerCase().replace("whish money", "Whish Money");
}

export interface PreviewInput {
  kind: PlanKind;
  price: string;
  billing: MembershipBilling;
  runsClasses: boolean;
  classes: string[] | null;
  limit: number | null;
  sessions: number | null;
  validForDays: number | null;
  commitMonths: number | null;
  noticeDays: number | null;
}

/**
 * The Explore preview's lines (kept from the v6 sheet): line 1 the price and
 * its terms, line 2 the chosen classes and a commitment other than the
 * default, or "" when there is nothing to add.
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
  const phrase = periodPhrase(x.billing);
  const limit = x.limit && x.limit > 0 ? ` · up to ${x.limit} classes ${phrase}` : x.runsClasses ? " · unlimited classes" : "";
  const extra: string[] = [];
  if (x.classes && x.classes.length) extra.push(x.classes.join(", "));
  if (x.commitMonths || x.noticeDays) extra.push(commitmentLabel(x.commitMonths, x.noticeDays));
  return [`${x.price} ${phrase}${limit}`, extra.join(" · ")];
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

/** The archive dialog's body (kept, live). */
export function archiveBody(n: number | null): string {
  if (!n) return "It's removed from Explore and can't be bought.";
  return `It's removed from Explore and can't be bought. The ${n} current ${n === 1 ? "member keeps" : "members keep"} it until it ends.`;
}

// ---------------------------------------------------------------------------
// Members (`members`: avatar initials, name, plan, "Until {date}")

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sep 2" from an ISO date (month first, D-02). */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** The member row's right-hand date: "Until Nov 15" (the board's "Until 15 Nov", month first per D-02); "" for an open-ended membership. */
export const untilLabel = (iso: string | null | undefined): string => (iso && shortDate(iso) ? `Until ${shortDate(iso)}` : "");

/** Two-letter initials from the member's label ("Maya K." → "MK", "Taylor" → "T"). */
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

/** The active members list: the one ending soonest first, open-ended ones last. */
export function sortMembers<T extends { expiresOn: string | null; label: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.expiresOn && b.expiresOn) return a.expiresOn < b.expiresOn ? -1 : a.expiresOn > b.expiresOn ? 1 : a.label.localeCompare(b.label);
    if (a.expiresOn) return -1;
    if (b.expiresOn) return 1;
    return a.label.localeCompare(b.label);
  });
}

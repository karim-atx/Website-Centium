// Round G1 · Premium, the switches, passes, business plan levels and hiring
// credits: the pure half (parsers, decisions, sentences). No React and no
// Supabase, so the tests read it directly.
//
// Contract: Database Round G1 (PR #55, migrations 20261226170000-210000;
// design-handover/round-g/DB_G1_HANDOVER.md).
//
// THE ONE RULE: while a switch is off for the caller, or still loading, the
// app behaves exactly as today. Every decision below therefore reads a
// missing answer (null) as "off".

import { t, tk, tn } from "../../i18n/core";
import { appLocale } from "../../i18n/format";
import { formatShortDate } from "../../utils/date";
import type { PremiumFeature } from "./features";

/** A date on the Premium cards: "9 November 2026" (Arabic month names in Arabic). */
export const premiumDate = (iso: string): string => formatShortDate(new Date(iso), { day: "numeric", month: "long", year: "numeric" });

/** A price in the app's language ("$9.99"; Arabic with Western digits). Null stays null, never $0. */
export function formatPremiumPrice(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return new Intl.NumberFormat(appLocale("en-US"), { style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);
}

/**
 * The App Store and Google Play listings are not live yet (decision G7 b):
 * the store buttons say "Coming soon" and the trial card stays hidden. Turn
 * this on, with the two URLs below, when the apps are in the stores.
 */
export const STORE_APPS_LIVE = false;
export const APP_STORE_URL: string | null = null;
export const GOOGLE_PLAY_URL: string | null = null;

// ---- the answers ----

export interface Switches {
  premiumOn: boolean;
  businessPlansOn: boolean;
  preview: boolean;
}

export interface FreeLimits {
  history_days: number;
  barcode_scans_per_day: number;
  own_routines: number;
  habits: number;
  recipes: number;
  locked_journal_folders: number;
}

export type PremiumSource =
  | "existing_plan"
  | "direct_write"
  | "admin_assigned"
  | "centium_charge"
  | "billing_period_change"
  | "store"
  | "admin_comp"
  | "professional_pass"
  | "gym_pass";

export interface MyPremium {
  premiumOn: boolean;
  preview: boolean;
  /** Only ever true while the switch is on (the Database's rule). */
  premium: boolean;
  source: PremiumSource | null;
  endsAt: string | null;
  isTrial: boolean;
  /** Null when no limits apply. */
  limits: FreeLimits | null;
  /** False in recovery-sensitive mode. */
  mayPromptUpgrade: boolean;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  trialDays: number | null;
}

type Row = Record<string, unknown>;
const firstRow = (data: unknown): Row | null => {
  const r = Array.isArray(data) ? data[0] : data;
  return r && typeof r === "object" ? (r as Row) : null;
};
const bool = (v: unknown) => v === true;
const numOrNull = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const intOr0 = (v: unknown) => {
  const n = numOrNull(v);
  return n !== null && n > 0 ? Math.floor(n) : 0;
};
const strOrNull = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : null);

/** my_switches(): one row; anything unreadable is "off". */
export function parseSwitches(data: unknown): Switches {
  const r = firstRow(data);
  return { premiumOn: bool(r?.premium_on), businessPlansOn: bool(r?.business_plans_on), preview: bool(r?.preview) };
}

const LIMIT_KEYS: (keyof FreeLimits)[] = ["history_days", "barcode_scans_per_day", "own_routines", "habits", "recipes", "locked_journal_folders"];

/** free_limits() (jsonb), or my_premium().limits. Null when it isn't an object with every number. */
export function parseFreeLimits(data: unknown): FreeLimits | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const o = data as Row;
  const out = {} as FreeLimits;
  for (const k of LIMIT_KEYS) {
    const n = numOrNull(o[k]);
    if (n === null || n < 0) return null;
    out[k] = n;
  }
  return out;
}

const SOURCES: PremiumSource[] = ["existing_plan", "direct_write", "admin_assigned", "centium_charge", "billing_period_change", "store", "admin_comp", "professional_pass", "gym_pass"];

/** my_premium(): one row. `premium` is never true while the switch is off. */
export function parseMyPremium(data: unknown): MyPremium {
  const r = firstRow(data);
  const on = bool(r?.premium_on);
  const src = strOrNull(r?.source);
  return {
    premiumOn: on,
    preview: bool(r?.preview),
    premium: on && bool(r?.premium),
    source: src && (SOURCES as string[]).includes(src) ? (src as PremiumSource) : null,
    endsAt: strOrNull(r?.ends_at),
    isTrial: bool(r?.is_trial),
    limits: parseFreeLimits(r?.limits),
    mayPromptUpgrade: bool(r?.may_prompt_upgrade),
    monthlyPrice: numOrNull(r?.monthly_price),
    yearlyPrice: numOrNull(r?.yearly_price),
    trialDays: numOrNull(r?.trial_days),
  };
}

// ---- "off behaves as today" ----

/** The member Premium work and the passes: only when premium_on is known to be true. */
export const premiumOn = (p: Pick<MyPremium, "premiumOn"> | Pick<Switches, "premiumOn"> | null | undefined): boolean => p?.premiumOn === true;

/** The plan levels, pay-first and hiring credits: only when business_plans_on is known to be true. */
export const businessPlansOn = (s: Pick<Switches, "businessPlansOn"> | null | undefined): boolean => s?.businessPlansOn === true;

/** The Premium badge (decision G9): the member's own screens and share cards, with the switch on and Premium held. */
export const showPremiumBadge = (p: Pick<MyPremium, "premiumOn" | "premium"> | null | undefined): boolean => !!p && p.premiumOn && p.premium;

/** "Buy in the Centium app" where Premium is offered: the switch on and no Premium yet. */
export const showBuyInApp = (p: Pick<MyPremium, "premiumOn" | "premium"> | null | undefined): boolean => !!p && p.premiumOn && !p.premium;

/** The plan page's feature grid: the features.ts list with the switch on, today's grid otherwise. */
export const planPageFeatureSource = (p: Pick<MyPremium, "premiumOn"> | null | undefined): "features" | "today" => (premiumOn(p) ? "features" : "today");

// ---- the prompt rules (decision G6) ----

export type AgeBand = "adult" | "minor" | "unknown-age";

export interface PromptContext {
  /** my_premium(), or null while it loads. */
  premium: Pick<MyPremium, "premiumOn" | "premium" | "mayPromptUpgrade"> | null;
  /** forumAccess(dateOfBirth): only "adult" is ever prompted. */
  age: AgeBand;
  /** The route, to keep Get support free of prompts. */
  path: string;
  /** Get support's popup is open. */
  inSupport: boolean;
  /** The local day this feature last prompted (YYYY-MM-DD), if any. */
  lastShownDay: string | null;
  /** Today, local (YYYY-MM-DD). */
  today: string;
}

export const GET_SUPPORT_PATH = "/app/get-support";

/** Whether anything may prompt at all here (every rule but once a day). */
export function promptAllowed(c: Omit<PromptContext, "lastShownDay" | "today">): boolean {
  if (!c.premium || !c.premium.premiumOn || c.premium.premium) return false;
  // Recovery-sensitive mode, and while that is still loading (premium null above).
  if (!c.premium.mayPromptUpgrade) return false;
  if (c.age !== "adult") return false;
  if (c.inSupport || c.path === GET_SUPPORT_PATH || c.path.startsWith(`${GET_SUPPORT_PATH}/`) || c.path.startsWith(`${GET_SUPPORT_PATH}?`)) return false;
  return true;
}

/** G6: at most once per feature per day, and never where promptAllowed says no. */
export function mayPrompt(c: PromptContext): boolean {
  return promptAllowed(c) && c.lastShownDay !== c.today;
}

/** Where the day a feature last prompted is kept (per account, per feature). */
export const promptStorageKey = (userId: string, feature: PremiumFeature) => `centium-premium-prompt:${userId}:${feature}`;

/** A local calendar day, YYYY-MM-DD. */
export const localDay = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ---- the trial card at the end of sign-up (CF; G7 b keeps it hidden) ----

export interface TrialCardContext {
  storeAppsLive: boolean;
  premium: Pick<MyPremium, "premiumOn" | "premium" | "mayPromptUpgrade"> | null;
  age: AgeBand;
  /** The recovery-sensitive answer given during sign-up. */
  recoverySensitive: boolean;
  /** Already shown once on this account. */
  seen: boolean;
}

export function trialCardDue(c: TrialCardContext): boolean {
  if (!c.storeAppsLive || c.seen || c.recoverySensitive) return false;
  return promptAllowed({ premium: c.premium, age: c.age, path: "/onboarding", inSupport: false });
}

export const trialSeenKey = (userId: string) => `centium-premium-trial-seen:${userId}`;

// ---- the member's status card (EA) ----

export type MemberStatus =
  | { kind: "professional_pass"; endsAt: string | null }
  | { kind: "gym_pass"; endsAt: string | null }
  | { kind: "comp"; endsAt: string | null }
  | { kind: "store"; endsAt: string | null; isTrial: boolean }
  | null;

/**
 * Which status card the member sees, if any. Only with the switch on and
 * Premium held. my_premium() carries no giver's name (a Database need), so
 * the card never invents one.
 */
export function memberStatus(p: MyPremium | null | undefined): MemberStatus {
  if (!showPremiumBadge(p) || !p) return null;
  switch (p.source) {
    case "professional_pass":
      return { kind: "professional_pass", endsAt: p.endsAt };
    case "gym_pass":
      return { kind: "gym_pass", endsAt: p.endsAt };
    case "admin_comp":
      return { kind: "comp", endsAt: p.endsAt };
    case "store":
      return { kind: "store", endsAt: p.endsAt, isTrial: p.isTrial };
    default:
      return null;
  }
}

/** The status card's title. Never a price on a pass. */
export function memberStatusTitle(s: NonNullable<MemberStatus>): string {
  switch (s.kind) {
    case "professional_pass":
      return t("Premium from your professional");
    case "gym_pass":
      return t("Premium with your gym membership");
    case "comp":
      return t("Premium");
    case "store":
      return s.isTrial ? t("Premium free trial") : t("Premium");
  }
}

/** The status card's line: "until {date}" once an end is set; a store purchase is managed in the store. */
export function memberStatusLine(s: NonNullable<MemberStatus>, formatDate: (iso: string) => string): string | null {
  if (s.kind === "store") return t("Managed in the app store");
  return s.endsAt ? t("Until {date}", { date: formatDate(s.endsAt) }) : null;
}

// ---- the professional's passes ----

export interface PassHolder {
  clientId: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
}

export interface MyPasses {
  allowance: number;
  used: number;
  verified: boolean;
  passes: PassHolder[];
}

export type PassReason =
  | "self"
  | "not_your_client"
  | "already_given"
  | "not_verified"
  | "no_paid_plan"
  | "no_passes_left"
  | "too_soon"
  | "no_activity"
  | "shared_sign_in";

export interface PassCandidate {
  clientId: string;
  name: string;
  eligible: boolean;
  reason: PassReason | string | null;
}

const holders = (v: unknown): PassHolder[] =>
  (Array.isArray(v) ? v : []).flatMap((x) => {
    const r = x && typeof x === "object" ? (x as Row) : null;
    const id = strOrNull(r?.client_id);
    if (!r || !id) return [];
    return [{ clientId: id, name: strOrNull(r.name) ?? "", startsAt: strOrNull(r.starts_at), endsAt: strOrNull(r.ends_at) }];
  });

/** my_premium_passes(): one row. */
export function parseMyPasses(data: unknown): MyPasses {
  const r = firstRow(data);
  return { allowance: intOr0(r?.allowance), used: intOr0(r?.used), verified: bool(r?.verified), passes: holders(r?.passes) };
}

/** premium_pass_candidates(): one row per active client. */
export function parseCandidates(data: unknown): PassCandidate[] {
  return (Array.isArray(data) ? data : []).flatMap((x) => {
    const r = x && typeof x === "object" ? (x as Row) : null;
    const id = strOrNull(r?.client_id);
    if (!r || !id) return [];
    return [{ clientId: id, name: strOrNull(r.name) ?? "", eligible: bool(r.eligible), reason: strOrNull(r.reason) }];
  });
}

const REASON_TEXT: Record<PassReason, string> = {
  self: tk("You can't include Premium for yourself."),
  not_your_client: tk("They aren't one of your active clients."),
  already_given: tk("They already have Premium through you."),
  not_verified: tk("Your licence verification isn't current. Renew it to include Premium."),
  no_paid_plan: tk("Passes come with your own paid plan, Starter and up."),
  no_passes_left: tk("You've used all the passes your plan includes."),
  too_soon: tk("You can include Premium once you've worked together for 14 days."),
  no_activity: tk("You can include Premium once they've booked or had a session with you, or logged against a programme or meal plan they share with you."),
  shared_sign_in: tk("You can't include Premium for someone who signs in on the same device and network as you."),
};

/** A plain sentence for each premium_pass_refusal reason (and ATXQ6's detail). */
export function passReasonText(reason: string | null | undefined): string {
  if (reason && Object.prototype.hasOwnProperty.call(REASON_TEXT, reason)) return t(REASON_TEXT[reason as PassReason]);
  return t("This client can't have Premium through you yet.");
}

/** "2 of 5 used". */
export const passesUsedText = (used: number, allowance: number) => tn(allowance, "{used} of {n} pass used", "{used} of {n} passes used", { used });

// ---- the gym's opt-in ----

export interface GymPasses {
  premiumForMembers: boolean;
  cap: number;
  used: number;
}

export function parseGymPasses(data: unknown): GymPasses {
  const r = firstRow(data);
  return { premiumForMembers: bool(r?.premium_for_members), cap: intOr0(r?.cap), used: intOr0(r?.used) };
}

// ---- business plan levels (#15) ----

export type PlanPeriod = "monthly" | "yearly";

export interface PlanLevelPrice {
  seatBlocks: number;
  seats: number;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
}

export interface PlanLevel {
  businessPlansOn: boolean;
  mustPayFirst: boolean;
  planActive: boolean;
  seatBlocks: number | null;
  billingPeriod: PlanPeriod | null;
  renewsAt: string | null;
  chosenSeatBlocks: number | null;
  chosenBillingPeriod: PlanPeriod | null;
  choiceDue: boolean;
}

const period = (v: unknown): PlanPeriod | null => (v === "monthly" || v === "yearly" ? v : null);

export function parseLevelPrices(data: unknown): PlanLevelPrice[] {
  return (Array.isArray(data) ? data : [])
    .flatMap((x) => {
      const r = x && typeof x === "object" ? (x as Row) : null;
      const n = numOrNull(r?.seat_blocks);
      if (!r || n === null) return [];
      return [{ seatBlocks: n, seats: intOr0(r.seats), monthlyPrice: numOrNull(r.monthly_price), yearlyPrice: numOrNull(r.yearly_price) }];
    })
    .sort((a, b) => a.seatBlocks - b.seatBlocks);
}

export function parseLevel(data: unknown): PlanLevel | null {
  const r = firstRow(data);
  if (!r) return null;
  return {
    businessPlansOn: bool(r.business_plans_on),
    mustPayFirst: bool(r.must_pay_first),
    planActive: bool(r.plan_active),
    seatBlocks: numOrNull(r.seat_blocks),
    billingPeriod: period(r.billing_period),
    renewsAt: strOrNull(r.renews_at),
    chosenSeatBlocks: numOrNull(r.chosen_seat_blocks),
    chosenBillingPeriod: period(r.chosen_billing_period),
    choiceDue: bool(r.choice_due),
  };
}

/** Base, Base + 5 seats, Base + 10 seats: the seat count is the server's. */
export function planLevelName(p: Pick<PlanLevelPrice, "seatBlocks" | "seats">, base: Pick<PlanLevelPrice, "seats"> | null): string {
  if (p.seatBlocks === 0 || !base) return p.seatBlocks === 0 ? t("Base") : tn(p.seatBlocks, "Base + {n} seat block", "Base + {n} seat blocks");
  const extra = Math.max(0, p.seats - base.seats);
  return tn(extra, "Base + {n} seat", "Base + {n} seats");
}

/** The wording key recorded with "Start now" (purchase_confirmations). */
export const PLAN_START_WORDING_KEY = "business_plan.start_now";

/** Pay-first: the business must start its plan before it can go live. Only on the switch. */
export const mustPayFirst = (l: PlanLevel | null | undefined): boolean => !!l && l.businessPlansOn && l.mustPayFirst;

/** The gentle renewal card. */
export const choiceDue = (l: PlanLevel | null | undefined): boolean => !!l && l.businessPlansOn && l.choiceDue;

// ---- hiring credits ----

export interface CreditPack {
  quantity: number;
  used: number;
  remaining: number;
  startsAt: string | null;
  endsAt: string | null;
}

export interface HiringCredits {
  creditsOn: boolean;
  free: number;
  price1: number | null;
  price3: number | null;
  packs: CreditPack[];
}

export function parseHiringCredits(data: unknown): HiringCredits {
  const r = firstRow(data);
  const packs = (Array.isArray(r?.packs) ? (r!.packs as unknown[]) : []).flatMap((x) => {
    const p = x && typeof x === "object" ? (x as Row) : null;
    if (!p) return [];
    return [{ quantity: intOr0(p.quantity), used: intOr0(p.used), remaining: intOr0(p.remaining), startsAt: strOrNull(p.starts_at), endsAt: strOrNull(p.ends_at) }];
  });
  return { creditsOn: bool(r?.credits_on), free: intOr0(r?.free), price1: numOrNull(r?.price_1), price3: numOrNull(r?.price_3), packs };
}

/** A role offer uses a credit instead of the fee line, only when credits are on. Class-slot hires are unchanged. */
export const offerUsesCredit = (type: "role" | "class_slot", credits: Pick<HiringCredits, "creditsOn"> | null | undefined): boolean => type === "role" && credits?.creditsOn === true;

// ---- the Round G1 codes ----

/**
 * ATXQ0, Q1, Q3, Q4 and Q6 as plain sentences (Q2 is G2's; Q5 is the
 * Admin's). Q3's sentence follows what was refused; Q6's detail is the
 * reason. Null for any other code.
 */
export function premiumCodeMessage(code: string | null | undefined, opts: { detail?: string | null; message?: string | null } = {}): string | null {
  const c = code ?? (/\bATXQ\d\b/.exec(opts.message ?? "")?.[0] ?? null);
  switch (c) {
    case "ATXQ0":
      return t("That isn't available yet.");
    case "ATXQ1":
      return t("That's part of Centium Premium.");
    case "ATXQ3":
      return /venue/i.test(opts.message ?? "")
        ? t("Start your business plan before you add a venue.")
        : /verification/i.test(opts.message ?? "")
          ? t("Start your business plan before you submit your verification.")
          : t("Start your business plan first.");
    case "ATXQ4":
      return t("No hiring credit free. A role offer needs one.");
    case "ATXQ6":
      return passReasonText(opts.detail ?? /\(([a-z_]+)\)/.exec(opts.message ?? "")?.[1] ?? null);
    default:
      return null;
  }
}

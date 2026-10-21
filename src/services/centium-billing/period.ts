// Batch 2 · CS: a business chooses monthly or yearly (Database 20261204000000,
// HANDOVER_API "Yearly or monthly for a business"). Pure shapes and wording;
// the only import is the pure pricing arithmetic (the node test project reads
// this file).
//
//   subscription_states.billing_period          'monthly' | 'yearly', default monthly
//   subscription_price_for(tier, period, blocks) numeric, NULL when the tier has
//                                                no price for that period
//   set_subscription_billing_period(period)      the caller's OWN subscription;
//                                                renews_at moves from now;
//                                                42501 / ATXAD
//
// NULL IS "NOT AVAILABLE", NEVER FREE. A period without a price is not offered.
// THE SAVING (Database b93cb12: Base is 29.00 a month or 289.99 a year, a seat
// block 59.99 or 599.99) is computed from the two prices subscription_price_for
// returns, by the same rule as every other plan (yearlySaving: rounded down,
// none unless yearly is actually cheaper). NULL on either side is no saving.
//
// NO MONEY MOVES THROUGH CENTIUM. Switching records the choice; it charges
// nothing.

import { monthlyEquivalent, yearlySaving, type YearlySaving } from "../subscription-tiers/pricing";

export type SubscriptionPeriod = "monthly" | "yearly";

export const SUBSCRIPTION_PERIODS: readonly SubscriptionPeriod[] = ["monthly", "yearly"];

/** A billing_period read off the row; anything else is not a period this knows. */
export const toSubscriptionPeriod = (v: unknown): SubscriptionPeriod | null => (v === "monthly" || v === "yearly" ? v : null);

/** subscription_price_for's numeric (a number or a string by driver); NULL stays null. */
export function priceOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export const periodName = (p: SubscriptionPeriod): string => (p === "monthly" ? "Monthly" : "Yearly");

/** "a month" / "a year", after a price. */
export const perPeriod = (p: SubscriptionPeriod): string => (p === "monthly" ? "a month" : "a year");

/** "/mo" / "/yr", the plan list's short form. */
export const periodSuffix = (p: SubscriptionPeriod): string => (p === "monthly" ? "/mo" : "/yr");

export const NOT_AVAILABLE = "Not available";

/**
 * "Yearly price: Not available", where a sentence would otherwise carry the
 * price (business_plan_summary's plan_price or seat_block_price is NULL, or
 * subscription_price_for is). Never "$0", never another period's figure.
 */
export const missingPriceText = (p: SubscriptionPeriod): string => `${periodName(p)} price: ${NOT_AVAILABLE}`;

/** "$29.00 a month", or "Not available" for a NULL price. Never "$0". */
export function periodPriceText(amount: number | null, period: SubscriptionPeriod, money: (n: number) => string): string {
  return amount === null ? NOT_AVAILABLE : `${money(amount)} ${perPeriod(period)}`;
}

/**
 * What paying yearly saves against twelve monthlies, from the two prices
 * subscription_price_for (or business_plan_summary) gave. Null unless both
 * exist and yearly is actually cheaper: a NULL on either side is no saving.
 */
export function periodSaving(prices: Partial<Record<SubscriptionPeriod, number | null>> | null | undefined): YearlySaving | null {
  const monthly = prices?.monthly;
  const yearly = prices?.yearly;
  if (monthly == null || yearly == null) return null;
  return yearlySaving(monthly, yearly);
}

/** "$24.17 a month, billed yearly": a yearly price restated, so the two compare. */
export const perMonthText = (yearly: number, money: (n: number) => string): string => `${money(monthlyEquivalent(yearly))} a month, billed yearly`;

/**
 * One period as a choice: offered only with a price. The current period is
 * shown as current even without one (it is what the business is on).
 */
export interface PeriodOption {
  period: SubscriptionPeriod;
  price: number | null;
  current: boolean;
  /** It can be chosen: not the current one, and it has a price. */
  selectable: boolean;
  /** Why it can't be chosen, for the row; null when selectable or current. */
  reason: string | null;
}

export function periodOptions(current: SubscriptionPeriod, prices: Record<SubscriptionPeriod, number | null>): PeriodOption[] {
  return SUBSCRIPTION_PERIODS.map((period) => {
    const price = prices[period];
    const isCurrent = period === current;
    return {
      period,
      price,
      current: isCurrent,
      selectable: !isCurrent && price !== null,
      reason: !isCurrent && price === null ? noPriceText(period) : null,
    };
  });
}

/** Why a period isn't offered: the plan has no price for it yet. */
export const noPriceText = (p: SubscriptionPeriod): string => `${periodName(p)} billing isn't available for your plan yet.`;

/**
 * Where renews_at lands after a switch made at `from`: one month or one year
 * on, the way Postgres adds an interval (a month from Jan 31 is the last day of
 * February, a year from Feb 29 is Feb 28). Only a preview for the confirm; the
 * row the function returns is what the screen then shows.
 */
export function renewalAfterSwitch(from: Date, period: SubscriptionPeriod): Date {
  const y = from.getFullYear() + (period === "yearly" ? 1 : 0);
  const m = from.getMonth() + (period === "monthly" ? 1 : 0);
  const lastDay = new Date(y, m + 1, 0).getDate();
  const d = new Date(from);
  d.setFullYear(y, m, Math.min(from.getDate(), lastDay));
  return d;
}

/** "Nov 19", with the year when it isn't this year's ("Oct 21, 2027"). */
export function renewalDayText(when: string | Date, now: Date = new Date()): string {
  const d = typeof when === "string" ? new Date(when) : when;
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/** The confirm before a switch. */
export function switchConfirm(input: {
  to: SubscriptionPeriod;
  price: number;
  seatBlocks: number;
  renewal: Date;
  now?: Date;
  money: (n: number) => string;
}): { title: string; body: string; action: string } {
  const { to, price, seatBlocks, renewal, money } = input;
  const what = seatBlocks > 0 ? `Your plan and ${seatBlocks === 1 ? "1 seat block" : `${seatBlocks} seat blocks`}` : "Your plan";
  return {
    title: `Switch to ${to} billing?`,
    body: `${what} will cost ${money(price)} ${perPeriod(to)}. Your next renewal moves to ${renewalDayText(renewal, input.now)}. Nothing is charged now.`,
    action: `Switch to ${to}`,
  };
}

export type PeriodSwitchRefusal = { kind: "signed_out" | "no_subscription" | "no_price" | "offline" | "failed"; message: string };

/**
 * Why set_subscription_billing_period refused, in our words. ATXAD carries two
 * messages: 'you have no subscription to change' and 'that plan has no
 * <period> price yet'. A dropped connection is the service's to word
 * (OFFLINE_MESSAGE, kind "offline") before this is asked.
 */
export function periodSwitchRefusal(code: string | undefined, message: string | undefined, period: SubscriptionPeriod): PeriodSwitchRefusal {
  if (code === "42501") return { kind: "signed_out", message: "Your session has ended. Sign in again to change how you're billed." };
  if (code === "ATXAD") {
    const m = (message ?? "").toLowerCase();
    if (m.includes("no subscription")) return { kind: "no_subscription", message: "You don't have a plan to change yet." };
    const named = /has no (monthly|yearly) price/.exec(m);
    if (named) return { kind: "no_price", message: noPriceText(named[1] as SubscriptionPeriod) };
    return { kind: "no_price", message: noPriceText(period) };
  }
  return { kind: "failed", message: "Couldn't change how you're billed. Try again." };
}

/** What switched, for the line under the choice. */
export const switchedText = (p: SubscriptionPeriod, renewsAt: string | null, now?: Date): string =>
  `You're now billed ${p}.${renewsAt ? ` Your next renewal is ${renewalDayText(renewsAt, now)}.` : ""}`;

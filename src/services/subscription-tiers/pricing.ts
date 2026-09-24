// What a plan costs, and what paying yearly saves.
//
// SEPARATE FROM index.ts BECAUSE IT TOUCHES NOTHING. That file opens the
// Supabase client at import time, which needs import.meta.env and therefore a
// bundler; this is arithmetic and formatting, and keeping it apart lets the
// marketing site, the in-app screens and the unit tests all share one answer
// without any of them reaching for a database connection.
//
// EVERY NUMBER IS DERIVED FROM THE TWO PRICES THE ROW CARRIES. The saving was
// previously a label — "−15%" on the marketing plan picker, "SAVE 30%" on the
// client subscription screen — written beside prices that did not produce it.
// At the real numbers, $9.99 × 12 = $119.88 against $99.99 is 16.6%, so both
// were wrong, in opposite directions, about the same plan.

/** Money as it is written on a plan: "$9.99", "$0" for free. */
export function formatPrice(amount: number): string {
  if (amount === 0) return "$0";
  // Whole amounts lose the ".00": a $60 add-on should not read "$60.00" when
  // every other price on the page is a natural "$9.99".
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/**
 * What twelve months of the monthly price would come to.
 *
 * The comparison a yearly price is a discount against — not the yearly price
 * itself, which is what makes "save" a real number rather than a slogan.
 */
export const yearlyAtMonthlyRate = (monthlyPrice: number): number =>
  Math.round(monthlyPrice * 12 * 100) / 100;

export interface YearlySaving {
  /** Currency saved across the year. */
  amount: number;
  /** Whole percent, ROUNDED DOWN. */
  percent: number;
}

/**
 * What paying yearly saves, or null when there is nothing to compare.
 *
 * ROUNDED DOWN, DELIBERATELY. A saving is a promise, and rounding 16.6% up to
 * 17% advertises a discount the prices do not give. Down is the only direction
 * that cannot overstate it.
 *
 * Returns null — never zero — when the plan is free, has no yearly price, or
 * the yearly price is not actually a discount. A "Save 0%" badge is worse than
 * no badge, and a yearly price ABOVE twelve monthlies is a data problem the UI
 * must not dress up as a saving.
 */
export function yearlySaving(
  monthlyPrice: number,
  yearlyPrice: number | null | undefined
): YearlySaving | null {
  if (!monthlyPrice || yearlyPrice == null) return null;
  const twelve = yearlyAtMonthlyRate(monthlyPrice);
  if (twelve <= 0 || yearlyPrice >= twelve) return null;
  const amount = Math.round((twelve - yearlyPrice) * 100) / 100;
  const percent = Math.floor((amount / twelve) * 100);
  // A discount too small to round to one percent is not one worth claiming.
  if (percent < 1) return null;
  return { amount, percent };
}

/** "Save 16%" — the badge, in one place so every surface agrees. */
export const savingLabel = (saving: YearlySaving): string => `Save ${saving.percent}%`;

/**
 * The per-month figure a yearly plan works out to.
 *
 * Shown beside a yearly price so the two billing periods can be compared at
 * all: $99.99 a year and $9.99 a month are not comparable numbers until one
 * of them is restated.
 */
export const monthlyEquivalent = (yearlyPrice: number): number =>
  Math.round((yearlyPrice / 12) * 100) / 100;

export type BillingPeriod = "monthly" | "yearly";

/**
 * What a plan costs for the chosen period, and how it is worded.
 *
 * NULL YEARLY IS NOT ZERO. Only the free tiers have no yearly price — the
 * column is nullable and they are the rows that leave it null — so a yearly
 * view of a free plan says "Free", not "$0/year", and never falls back to a
 * monthly figure the row does not have.
 */
export function priceLabel(
  monthlyPrice: number,
  yearlyPrice: number | null | undefined,
  period: BillingPeriod
): string {
  if (monthlyPrice === 0) return "Free";
  if (period === "monthly") return `${formatPrice(monthlyPrice)}/mo`;
  if (yearlyPrice == null) return `${formatPrice(monthlyPrice)}/mo`;
  return `${formatPrice(yearlyPrice)}/yr`;
}

/**
 * "10%" from the stored 10.00.
 *
 * numeric(5,2) arrives as a number or a string depending on the driver, and
 * the share is a whole percent in practice — so a trailing ".00" is dropped
 * while a real fraction is kept.
 */
export function formatPercent(pct: number): string {
  const rounded = Math.round(pct * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded}%`;
}

/**
 * "$79.99/mo base + $59.99 per 5 professionals + 10% marketplace fee".
 *
 * The business model in one line, assembled from the rows rather than
 * written out — the three numbers in it live in two tables and a settings
 * row, and none of them is safe to retype.
 */
export function businessSummary(params: {
  basePrice: number;
  seatPrice: number;
  seatsPerBlock: number;
  revenueSharePct: number;
}): string {
  const { basePrice, seatPrice, seatsPerBlock, revenueSharePct } = params;
  return (
    `${formatPrice(basePrice)}/mo base + ${formatPrice(seatPrice)} per ${seatsPerBlock} professionals` +
    ` + ${formatPercent(revenueSharePct)} marketplace fee`
  );
}

/**
 * "Free for 1 client · paid plans from $14.99".
 *
 * `freeCap` is the default tier's max_clients and `cheapestPaid` the lowest
 * non-zero monthly price among the professional tiers. Both are read, so a
 * new entry tier or a changed cap rewrites this sentence by itself.
 */
export function professionalSummary(
  freeCap: number | null,
  cheapestPaid: number | null
): string {
  const free =
    freeCap == null
      ? "Free for unlimited clients"
      : `Free for ${freeCap} ${freeCap === 1 ? "client" : "clients"}`;
  return cheapestPaid == null ? free : `${free} · paid plans from ${formatPrice(cheapestPaid)}`;
}


/**
 * What a plan allows, in the noun its own cap is counted in.
 *
 * The two columns are never both set on one row — professionals are capped
 * on clients and businesses on employees — so this reads whichever the row
 * carries and says nothing when neither is set, which is what unlimited
 * looks like in this table.
 */
export function limitLabel(tier: {
  maxClients: number | null;
  maxEmployees: number | null;
}): string | null {
  if (tier.maxClients !== null) {
    return `Up to ${tier.maxClients} client${tier.maxClients === 1 ? "" : "s"}`;
  }
  if (tier.maxEmployees !== null) {
    return `Up to ${tier.maxEmployees} professional${tier.maxEmployees === 1 ? "" : "s"}`;
  }
  return null;
}

/**
 * The one honest sentence about buying, shared by every screen that shows a
 * plan.
 *
 * Said once rather than worded three ways — the three subscription screens
 * disagreed about what was possible, one of them promising "no payment will
 * be processed" under a button that looked exactly like a purchase.
 */
export const NO_PAYMENTS_NOTE =
  "Payments aren't available in the app yet. We'll set up your plan for you.";
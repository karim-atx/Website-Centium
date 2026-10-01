/**
 * Task G: the Free plan's one month for connecting new clients, as words.
 *
 * Pure, so it is tested without a database. The facts come from
 * my_professional_plan() (see ./freePeriod): `source` 'default' IS the Free
 * plan, `may_connect_clients` is the same predicate the two connection paths
 * refuse with (ATX49), and `free_period_ends_at` says when.
 */

/** Shown in place of the invite/accept action once the month is over. */
export const FREE_PERIOD_ENDED = "Your free month has ended. Upgrade to connect new clients.";

/**
 * Shown to a CLIENT whose code redemption was refused with ATX49. Never says
 * why: a professional's plan is their own business, so this is the same
 * sentence a full roster gets.
 */
export const NOT_ACCEPTING_CLIENTS = "This professional isn't accepting new clients right now.";

/** The pieces of my_professional_plan() the copy needs. */
export interface FreePeriodFacts {
  /** 'default' is the Free plan. */
  source: "own_subscription" | "business_seat" | "default";
  freePeriodEndsAt: string;
  mayConnectClients: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Free plan: 12 days left to connect clients", or null when there is nothing
 * to count down: a paid or seated professional (their month is irrelevant), or
 * one who can no longer connect (FREE_PERIOD_ENDED is shown instead).
 *
 * WHOLE DAYS, ROUNDED UP, so the last day reads "1 day left" until the moment
 * it ends rather than "0 days left" while connecting still works.
 */
export function freePeriodLine(plan: FreePeriodFacts | null, now: Date = new Date()): string | null {
  if (!plan || plan.source !== "default" || !plan.mayConnectClients) return null;
  const msLeft = new Date(plan.freePeriodEndsAt).getTime() - now.getTime();
  if (!Number.isFinite(msLeft)) return null;
  const days = Math.max(1, Math.ceil(msLeft / DAY_MS));
  return `Free plan: ${days} ${days === 1 ? "day" : "days"} left to connect clients`;
}

/** Whether the invite and accept paths should show FREE_PERIOD_ENDED instead. */
export function freePeriodBlocksConnecting(plan: FreePeriodFacts | null): boolean {
  return !!plan && !plan.mayConnectClients;
}

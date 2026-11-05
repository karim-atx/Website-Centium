// Round I · FG: an account's standing after the sign-up risk check (Database
// 20261226490000, HANDOVER_API "Round I · FG"). Pure, so it is tested without
// a server.
//
// my_account_standing() answers 'ok', 'verify_email' (a step-up: rewards wait
// until the email is verified) or 'under_review' (a hold: contacting new
// people, forum posting, reviews, redeeming a referral and inviting a client
// are refused with ATXR1). It never carries the score or the reasons, and the
// app never shows either. In shadow mode it is always 'ok', so nothing shows.

import { tk } from "../../i18n/core";

export type Standing = "ok" | "verify_email" | "under_review";

export interface AccountStanding {
  standing: Standing;
  rewardsWithheld: boolean;
}

export const STANDING_OK: AccountStanding = { standing: "ok", rewardsWithheld: false };

/** my_account_standing()'s jsonb; anything unreadable is 'ok' (fail open: never hold someone on a bad read). */
export function parseStanding(data: unknown): AccountStanding {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const s = d.standing;
  const standing: Standing = s === "verify_email" || s === "under_review" ? s : "ok";
  return { standing, rewardsWithheld: d.rewards_withheld === true };
}

/** The sentence for an action refused while the account is under review (ATXR1, any DETAIL). */
export const ACCOUNT_HELD = tk("Your account is being reviewed, so you can't do this yet. Your own logging, settings and the support chat still work.");

/** ATXR1's sentence, or null for any other error. */
export function accountHeldLine(e: { code?: string | null } | null | undefined): string | null {
  return e?.code === "ATXR1" ? ACCOUNT_HELD : null;
}

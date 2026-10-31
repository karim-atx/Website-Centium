// Round F2 · AB6 (Karim F24): member codes with a use limit, revoked and
// replaced (Database 20261226050000), pure. The business side: "Can be used"
// (1–50, default 1), "Used {n} of {max}", Revoke and Replace in the code's
// menu. The member side: redeem_business_member_code's result now carries a
// stable `reason`, and each reason has its sentence here (server copy is never
// shown; codeLogic's message matching stays the fallback for an older reader).

import { t, tk, tn } from "../../i18n/core";

/** create_business_member_code_with_uses' range (22023 outside it). */
export const MIN_USES = 1;
export const MAX_USES = 50;

export const clampUses = (n: number): number => Math.min(MAX_USES, Math.max(MIN_USES, Math.round(Number.isFinite(n) ? n : MIN_USES)));

export const CODE_COPY = {
  usesLabel: tk("Can be used"),
  usesHint: tk("How many people can join with this code."),
  fewer: tk("Fewer uses"),
  more: tk("More uses"),
  menu: tk("Code options"),
  revoke: tk("Revoke code"),
  replace: tk("Replace code"),
  revokeTitle: tk("Revoke this code?"),
  revokeBody: tk("The code stops working now. Anyone who already joined keeps their membership."),
  revokeConfirm: tk("Revoke code"),
  replaceTitle: tk("Replace this code?"),
  replaceBody: tk("The old code stops working now. Anyone who already joined keeps their membership."),
  replaceConfirm: tk("Replace code"),
  keep: tk("Keep it"),
  revoked: tk("Code revoked."),
  replaced: tk("Code replaced. The new code is {code}."),
  revokeFailed: tk("Couldn't revoke this code. Try again."),
  replaceFailed: tk("Couldn't replace this code. Try again."),
  noPermission: tk("You need Members access to change member codes. Ask the owner."),
  notFound: tk("That code couldn't be found. Refresh and try again."),
} as const;

/** "Used 2 of 10" (a single-use code says "Single use" until it is used). */
export function usesLine(uses: number, maxUses: number): string {
  if (maxUses <= 1) return uses >= 1 ? t("Used") : t("Single use");
  return t("Used {n} of {max}", { n: uses, max: maxUses });
}

/** "Up to 10 people" for the stepper's value. */
export function usesValue(n: number): string {
  return n === 1 ? t("1 person") : tn(n, "Up to {n} person", "Up to {n} people");
}

export type RedeemReason =
  | "joined"
  | "not_valid"
  | "used_up"
  | "revoked"
  | "expired"
  | "own_business"
  | "employee"
  | "already_member"
  | "age_restricted"
  | "plan_unavailable";

const REASONS: readonly RedeemReason[] = ["joined", "not_valid", "used_up", "revoked", "expired", "own_business", "employee", "already_member", "age_restricted", "plan_unavailable"];
export const isRedeemReason = (r: unknown): r is RedeemReason => typeof r === "string" && (REASONS as readonly string[]).includes(r);

/**
 * A refused redemption's sentence from its reason. `serverMessage` is read
 * only for the gym's age ("…aged 18 and over."). Null for `joined` or an
 * unknown reason (the caller falls back to the older message matching).
 */
export function redeemReasonLine(reason: unknown, serverMessage?: string | null): string | null {
  if (!isRedeemReason(reason)) return null;
  switch (reason) {
    case "joined":
      return null;
    case "not_valid":
      return t("That code isn't valid. Check it and try again.");
    case "used_up":
    case "revoked":
      return t("This code no longer works. Ask the gym for a new one.");
    case "expired":
      return t("That code has expired. Ask the business for a new one.");
    case "own_business":
      return t("That code is for your own business, so you can't join with it.");
    case "employee":
      return t("You work at this business, so you can't join it with a member code.");
    case "already_member":
      return t("You're already a member of this business.");
    case "age_restricted": {
      const age = /aged (\d+) and over/i.exec(serverMessage ?? "")?.[1];
      return age ? t("This gym admits members aged {age} and over.", { age }) : t("This gym has a minimum age for members.");
    }
    case "plan_unavailable":
      return t("That plan is no longer available. Ask the business for a new code.");
  }
}

/** revoke / replace refusals (ATX09 without members, ATX08 a code that's gone). */
export function codeActionMessage(code: string | undefined, fallback: string): string {
  if (code === "ATX09") return t(CODE_COPY.noPermission);
  if (code === "ATX08") return t(CODE_COPY.notFound);
  return t(fallback);
}

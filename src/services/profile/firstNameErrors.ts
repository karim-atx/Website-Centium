import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { appLocale } from "../../i18n/format";
import { t, tk } from "../../i18n/core";
import { describeNameError, NAME_TOO_LONG } from "./nameRules";

// Round J · FI: set_my_first_name's refusals in words (Database
// 20261226520000). Pure, so it is tested without a server; the call is in
// firstName.ts.

export const NAME_LENGTH = NAME_TOO_LONG;
export const NAME_CONTACT = tk("A name can't contain contact details.");
export const NAME_NOT_ALLOWED = tk("That name isn't allowed.");
export const NAME_RESERVED = tk("That name is reserved. Choose a different name.");
export const NAME_SIGNED_OUT = tk("You're signed out. Sign in again.");
export const NAME_FAILED = tk("Couldn't save your name. Try again.");

/**
 * The sentence for set_my_first_name's refusal (already translated: ATXI0
 * carries a date). `detail` is the error's DETAIL (ATXI0: when the next
 * change is allowed, ISO UTC).
 */
export function describeFirstNameError(error: { code?: string; message?: string; details?: string | null } | null | undefined): string {
  switch (error?.code) {
    case "42501":
      return t(NAME_SIGNED_OUT);
    case "22023":
      // Also "finish setting up your profile first": only reachable before
      // onboarding's own row exists, which onboarding makes first.
      return t(NAME_LENGTH);
    case "ATX37":
      return t(NAME_RESERVED);
    case "ATXI1":
      return t(NAME_CONTACT);
    case "ATXI2":
      return t(NAME_NOT_ALLOWED);
    case "ATXI0": {
      const when = error.details ? new Date(error.details) : null;
      if (!when || Number.isNaN(when.getTime())) return t("You've changed your name five times in 30 days. Try again later.");
      const date = when.toLocaleDateString(appLocale("en-GB"), { day: "numeric", month: "long", year: "numeric" });
      return t("You can change your name again on {date}.", { date });
    }
    default: {
      const line = describeNameError(error);
      if (line) return t(line);
      return t(isOffline(error) ? OFFLINE_MESSAGE : NAME_FAILED);
    }
  }
}

/**
 * Task T: the database's two date-of-birth refusals, as sentences
 * (Database 20261009000000). Pure, so it is tested without a server.
 *
 *   ATX51  the date is locked once set: a client changing or clearing it is
 *          refused. Only support can correct it (admin_set_date_of_birth).
 *   ATX52  a date of birth is required to finish onboarding.
 */

export const DOB_LOCKED =
  "Your date of birth is already saved and can't be changed here. Need to correct it? Contact support.";
export const DOB_REQUIRED = "Add your date of birth to finish setting up your account.";

/** The sentence for a date-of-birth refusal, or null for any other error. */
export function describeDobError(code: string | undefined): string | null {
  if (code === "ATX51") return DOB_LOCKED;
  if (code === "ATX52") return DOB_REQUIRED;
  return null;
}

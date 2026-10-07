// What "Copy all" and "Download" on MO1.8.4.2 hand over: the codes one per
// line, so a password manager's notes field or a printout keeps them
// readable. The download adds a short header saying what the file is.

export const RECOVERY_CODES_FILENAME = "centium-recovery-codes.txt";

/** One code per line, trimmed, empty entries dropped. */
export function recoveryCodesClipboard(codes: readonly string[]): string {
  return codes
    .map((c) => c.trim())
    .filter(Boolean)
    .join("\n");
}

/** The downloaded file: a header, then the codes. */
export function recoveryCodesFile(codes: readonly string[]): string {
  return [
    "Centium recovery codes",
    "Each code signs you in once if you lose your phone. Keep them somewhere safe.",
    "",
    recoveryCodesClipboard(codes),
    "",
  ].join("\n");
}

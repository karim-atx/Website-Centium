// Password rules shared by sign-up (AuthStep) and password reset
// (ResetPassword). Extracted so the two screens cannot drift apart: a
// password accepted by one and rejected by the other would be a confusing
// bug to hit while locked out of your own account.

export const passwordChecks = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

/**
 * THE password rule: every item on the checklist above, and nothing else.
 * Sign-up's button and submit, and the reset page's, all ask this, so the
 * list the user is shown is exactly what is enforced; a password is never
 * accepted while an item still shows a cross.
 *
 * The same rule Supabase Auth is set to on staging (2026-09-30: minimum 8,
 * "lower_upper_letters_digits_symbols"), so the list, the buttons and the
 * server agree. Locally supabase/config.toml sets none (GoTrue's default of 6
 * characters); a server refusal reads as "That password is too weak" through
 * describeAuthError either way.
 */
export function meetsPasswordRule(password: string): boolean {
  return passwordChecks.every((c) => c.test(password));
}

/**
 * The strength bar's reading, from the same checklist. "Strong" means the rule
 * passes and nothing less, so the bar never says Strong while the button is
 * still disabled.
 */
export function passwordStrength(password: string): { passed: number; label: string; color: string } {
  const passed = passwordChecks.filter((c) => c.test(password)).length;
  if (meetsPasswordRule(password)) return { passed, label: "Strong", color: "rgb(var(--c-status-good))" };
  if (passed <= 2) return { passed, label: "Weak", color: "rgb(var(--c-status-high))" };
  return { passed, label: "Medium", color: "rgb(var(--c-status-caution))" };
}

/**
 * Whether to show "Passwords don't match" yet.
 *
 * The awkward part is the first few keystrokes: "abc" is not yet "abcdef",
 * but the user is mid-way through typing it correctly and telling them off
 * for that is noise. So the warning waits for one of two signals that they
 * are actually done — the confirmation has reached the password's length, so
 * it can no longer become correct by typing more, or they have left the
 * field. An empty confirmation is never an error; that is what the submit
 * guard is for.
 */
export function shouldWarnPasswordMismatch(
  password: string,
  confirmPassword: string,
  confirmBlurred: boolean
): boolean {
  return (
    confirmPassword.length > 0 &&
    confirmPassword !== password &&
    (confirmBlurred || confirmPassword.length >= password.length)
  );
}

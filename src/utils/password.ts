// Password rules shared by sign-up (AuthStep) and password reset
// (ResetPassword). Extracted so the two screens cannot drift apart: a
// password accepted by one and rejected by the other would be a confusing
// bug to hit while locked out of your own account.

export const passwordChecks = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
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
 * Supabase Auth checks its own configured requirements on the server as well
 * (see the report on 2026-09-30: locally 6 characters and nothing required);
 * where it is weaker this is the stricter of the two, and a server refusal
 * still reads as "That password is too weak" through describeAuthError.
 */
export function meetsPasswordRule(password: string): boolean {
  return passwordChecks.every((c) => c.test(password));
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

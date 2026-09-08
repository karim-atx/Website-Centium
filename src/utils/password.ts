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
 * Length + a number + a letter. The special character is a bonus that lifts
 * the "Strong" label but is not required, matching what sign-up has always
 * enforced.
 */
export function meetsMinimumPassword(password: string): boolean {
  return passwordChecks[0].test(password) && passwordChecks[2].test(password) && /[A-Za-z]/.test(password);
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

// The code boxes' editing rule (CodeBoxes.tsx), kept pure so it is tested
// without a browser (codeBoxesInput.test.ts).
//
// A box's input event arrives as the box's whole new value, so what it means
// depends on what was there:
// - one digit: that box becomes it, the boxes after it keep theirs;
// - two digits on a filled box: a keystroke landed beside the old digit
//   (the caret wasn't on a selection, as when the box was tapped again), so
//   the new digit replaces the old one, the rest stay;
// - more: a paste, a password manager or the phone's one-time-code
//   suggestion, filling from this box;
// - nothing on a filled box: the keyboard deleted it without a Backspace key
//   event (Android keyboards report "Unidentified"), so that digit goes.

/** An authenticator app's code (TOTP): always six digits. */
export const CODE_LENGTH = 6;

/**
 * A code Supabase emails (reauthenticate(): the journal's unlock code and the
 * password-change code). Its length is the project's Email OTP Length, 8 on
 * production (the Database's config.toml says the same for the local stack),
 * so the boxes show eight. A six-digit code is still accepted, in case the
 * setting goes back: the server's reauthentication_code_ok takes 6 to 10.
 */
export const EMAIL_CODE_LENGTH = 8;
export const EMAIL_CODE_MIN_LENGTH = 6;

/** Whether an emailed code is long enough to send: 6 to 8 digits. */
export const emailCodeReady = (code: string): boolean =>
  /^\d+$/.test(code) && code.length >= EMAIL_CODE_MIN_LENGTH && code.length <= EMAIL_CODE_LENGTH;

export interface CodeEdit {
  code: string;
  /** The box to focus next. */
  focusAt: number;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export function codeAfterInput(current: string, i: number, raw: string, length = CODE_LENGTH): CodeEdit | null {
  const digits = onlyDigits(current).slice(0, length);
  const typed = onlyDigits(raw);
  const old = digits[i];

  if (!typed) {
    if (raw === "" && old) return { code: digits.slice(0, i) + digits.slice(i + 1), focusAt: i };
    return null;
  }

  let one: string | null = null;
  if (typed.length === 1) one = typed;
  else if (typed.length === 2 && old && (typed[0] === old || typed[1] === old)) one = typed[0] === old ? typed[1] : typed[0];

  if (one !== null) {
    const code = (digits.slice(0, i) + one + digits.slice(i + 1)).slice(0, length);
    return { code, focusAt: Math.min(i + 1, length - 1) };
  }

  const code = (digits.slice(0, i) + typed).slice(0, length);
  return { code, focusAt: Math.min(code.length, length - 1) };
}

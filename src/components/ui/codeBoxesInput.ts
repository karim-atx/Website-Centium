// The six code boxes' editing rule (CodeBoxes.tsx), kept pure so it is tested
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

export const CODE_LENGTH = 6;

export interface CodeEdit {
  code: string;
  /** The box to focus next. */
  focusAt: number;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export function codeAfterInput(current: string, i: number, raw: string): CodeEdit | null {
  const digits = onlyDigits(current).slice(0, CODE_LENGTH);
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
    const code = (digits.slice(0, i) + one + digits.slice(i + 1)).slice(0, CODE_LENGTH);
    return { code, focusAt: Math.min(i + 1, CODE_LENGTH - 1) };
  }

  const code = (digits.slice(0, i) + typed).slice(0, CODE_LENGTH);
  return { code, focusAt: Math.min(code.length, CODE_LENGTH - 1) };
}

import { isNumberField, normaliseDigits } from "./digits";

// Round F (AV): the browser side of digits.ts (kept apart so the pure part is
// testable without the DOM).
/**
 * One listener for the whole app, in the capture phase on window, so it runs
 * before React reads the field: an Arabic digit typed into a number field is
 * replaced in place (same length, so the caret stays), and React's onChange
 * then sees ASCII.
 */
export function installDigitNormaliser(target: Window = window) {
  target.addEventListener(
    "input",
    (e) => {
      const el = e.target as HTMLInputElement | null;
      if (!el || !isNumberField(el)) return;
      const next = normaliseDigits(el.value);
      if (next === el.value) return;
      let start: number | null = null;
      try {
        start = el.selectionStart;
      } catch {
        // type=number has no selection API.
      }
      el.value = next;
      if (start !== null) {
        try {
          el.setSelectionRange(start, start);
        } catch {
          // Ignore: the field type has no caret.
        }
      }
    },
    true,
  );
}

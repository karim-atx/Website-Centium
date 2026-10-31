// Round F (AV): Arabic keyboards type Arabic-Indic digits (٠-٩), Persian
// ones (۰-۹) and the Arabic decimal and thousands marks (٫ ٬). Every number
// field and parse helper in the app reads ASCII, so they are turned into
// 0-9, "." and "," as they are typed (digitInput.ts, once, at start)
// and wherever text is parsed (normaliseDigits).

const ARABIC_INDIC = 0x0660;
const PERSIAN = 0x06f0;

export function normaliseDigits(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c >= ARABIC_INDIC && c <= ARABIC_INDIC + 9) out += String(c - ARABIC_INDIC);
    else if (c >= PERSIAN && c <= PERSIAN + 9) out += String(c - PERSIAN);
    else if (ch === "٫") out += ".";
    else if (ch === "٬") out += ",";
    else out += ch;
  }
  return out;
}

const NUMERIC_MODES = new Set(["numeric", "decimal", "tel"]);
const NUMERIC_TYPES = new Set(["number", "tel"]);

/** Does this field hold a number (so its digits are rewritten as typed)? */
export function isNumberField(el: { tagName: string; type?: string; inputMode?: string; getAttribute(n: string): string | null }): boolean {
  if (el.tagName !== "INPUT") return false;
  const mode = (el.getAttribute("inputmode") || el.inputMode || "").toLowerCase();
  return NUMERIC_MODES.has(mode) || NUMERIC_TYPES.has((el.type || "").toLowerCase());
}

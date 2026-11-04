// Links built from stored text: a professional's credential link, a clinical
// source, a food database's attribution, a business's email or phone.
//
// Round I, FB: every such value goes through one of these before it becomes an
// href, so a `javascript:` or `data:` value can never run in the viewer's
// session, whatever the database or an edge function lets through. (React 18
// only warns about a `javascript:` href; it still renders it.)

/** An http or https address, normalised; null for anything else. */
export function safeHref(raw: string): string | null {
  const s = raw.trim();
  if (!/^https?:\/\//i.test(s)) return null;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

// One address, nothing that could start a mailto header (?, &, #) or a second
// recipient (, ;).
const EMAIL = /^[^\s@?&#,;:<>"'()[\]\\]+@[^\s@?&#,;:<>"'()[\]\\/]+\.[^\s@?&#,;:<>"'()[\]\\/]+$/;

/** `mailto:` for one plain address; null when it carries anything else. */
export function mailtoHref(raw: string): string | null {
  const s = raw.trim();
  return EMAIL.test(s) ? `mailto:${s}` : null;
}

/** `tel:` with the digits only (and a leading +); null with fewer than 3 digits. */
export function telHref(raw: string): string | null {
  const s = raw.trim();
  const digits = s.replace(/\D/g, "");
  if (digits.length < 3) return null;
  return `tel:${s.startsWith("+") ? "+" : ""}${digits}`;
}

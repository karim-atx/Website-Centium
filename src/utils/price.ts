// Prices cross a type boundary in this app, and both sides are load-bearing.
//
// The four business catalog tables — business_classes, business_offerings,
// membership_plans — all store `price` as `numeric` with a `>= 0` check. Every
// screen that edits one has always been a free-text box holding whatever the
// owner typed: "$45", "45", "$8.50". Those are not the same thing, and the
// conversion has to happen somewhere rather than being discovered by a 22P02
// at the first save.
//
// WHAT ROUND-TRIPPING COSTS, stated plainly because it is a real behaviour
// change: a price is stored as a number, so it comes back formatted by this
// file, not as the exact characters that were typed. "45" saves and returns as
// "$45". Anything genuinely unparseable is refused at the call site with a
// message rather than silently becoming null — a price that quietly vanishes
// is how a business ends up advertising something as free.

/** `null` = deliberately no price (the field was left blank). */
export type ParsedPrice = { ok: true; value: number | null } | { ok: false };

/**
 * Reads what somebody typed into a price box.
 *
 * Lenient about presentation (currency symbols, thousands separators,
 * surrounding space) and strict about the number, because the column has a
 * `price >= 0` check that a negative would fail at the database rather than
 * in the form.
 */
export function parsePrice(input: string): ParsedPrice {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, value: null };

  const cleaned = trimmed.replace(/[$€£\s,]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return { ok: false };

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return { ok: false };
  return { ok: true, value };
}

/**
 * Renders a stored price.
 *
 * PostgREST hands back `numeric` as a string ("45.00"), not a number, so this
 * takes both. Whole amounts lose the ".00" — "$45" is what these screens have
 * always shown and what the seeded demo plans looked like.
 */
export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

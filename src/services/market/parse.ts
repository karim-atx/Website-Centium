// Market + Share 3.0 · W2 · pure row readers shared by the market services'
// models (no Supabase import, so the models stay testable under node:test).

/** Rows from a set-returning function (an array, or one object). */
export const rows = (data: unknown): Record<string, unknown>[] =>
  Array.isArray(data) ? (data as Record<string, unknown>[]) : data && typeof data === "object" ? [data as Record<string, unknown>] : [];

export const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

export const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

export const bool = (v: unknown): boolean => v === true || v === "true" || v === 1;

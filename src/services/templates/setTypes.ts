import type { PrescribedSetType } from "../../types";

/**
 * set_types as the column takes it (set_types_valid): null when every set is
 * normal, else the array up to its last non-normal entry (normal stored as
 * null), at most 50 long.
 */
export function setTypesColumn(types: (PrescribedSetType | null)[] | undefined): (PrescribedSetType | null)[] | null {
  if (!types) return null;
  const clean = types.slice(0, 50).map((t) => (t === "warmup" || t === "pr" || t === "dropset" ? t : null));
  let end = clean.length;
  while (end > 0 && clean[end - 1] === null) end -= 1;
  return end === 0 ? null : clean.slice(0, end);
}

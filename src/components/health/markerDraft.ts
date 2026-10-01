// The draft behind one row of "Add blood work", and the rules for it. Kept
// out of MarkerEntryRow.tsx so that file only exports a component.

/**
 * One result being typed. Strings, not numbers, because a half-typed "1." is a
 * legitimate state of a field; conversion happens once, at save.
 */
export interface MarkerDraft {
  /** The standard list's marker; null while choosing or for "Other". */
  markerKey: string | null;
  /** "Other": a marker not on the list, name and unit kept as typed. */
  other: boolean;
  name: string;
  value: string;
  unit: string;
  low: string;
  high: string;
  /** Where the range came from: the list's pre-fill, or the user. */
  rangeFrom: "list" | "you" | null;
}

export const emptyMarker = (): MarkerDraft => ({
  markerKey: null,
  other: false,
  name: "",
  value: "",
  unit: "",
  low: "",
  high: "",
  rangeFrom: null,
});

/** Digits and at most one decimal point. Lab values are never negative. */
export const numeric = (raw: string) => raw.replace(/[^\d.]/g, "").replace(/(?<=\..*)\./g, "");

export const asNumber = (s: string) => (s.trim() === "" ? null : Number(s));

/** Whether a draft can be saved: a name, a number, and a sane range if any. */
export function draftUsable(m: MarkerDraft): boolean {
  if (!m.name.trim() || m.value.trim() === "" || !Number.isFinite(Number(m.value))) return false;
  const low = asNumber(m.low);
  const high = asNumber(m.high);
  if ((low !== null && !Number.isFinite(low)) || (high !== null && !Number.isFinite(high))) return false;
  return !(low !== null && high !== null && low > high);
}

export const draftRange = (m: MarkerDraft) => ({ low: asNumber(m.low), high: asNumber(m.high) });


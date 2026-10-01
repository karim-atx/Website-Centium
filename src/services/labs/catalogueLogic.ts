/**
 * The standard lab marker list (Database 20261011000000), as rules. Pure, so
 * the arithmetic is tested without a server.
 *
 * WHAT IS SAFE TO USE, per the database's own note: matching a typed name to a
 * marker and converting units are mechanical and fine today. The reference
 * ranges have NOT been clinically reviewed yet (`reviewed` is false on every
 * row), so a range from here is only ever a pre-fill the user can change,
 * labelled as such, and a range printed on their own report wins.
 */

export type MarkerSex = "male" | "female";

export interface CatalogueUnit {
  unit: string;
  /** canonical = value × factor + offset. */
  factor: number;
  offset: number;
}

export interface CatalogueRange {
  /** null = the same for everyone. */
  sex: MarkerSex | null;
  low: number | null;
  high: number | null;
}

export interface CatalogueMarker {
  key: string;
  displayName: string;
  category: string;
  canonicalUnit: string;
  reviewed: boolean;
  notes: string | null;
  /** Lower-cased, trimmed names that mean this marker. */
  aliases: string[];
  /** Every accepted unit, the canonical one first (factor 1, offset 0). */
  units: CatalogueUnit[];
  ranges: CatalogueRange[];
}

/** How names are compared: lower(btrim(name)), as the alias table stores them. */
export const normaliseMarkerName = (name: string) => name.trim().toLowerCase();

/** The marker a typed name means, or null ("Other": kept exactly as typed). */
export function matchMarker(name: string, markers: CatalogueMarker[]): CatalogueMarker | null {
  const n = normaliseMarkerName(name);
  if (!n) return null;
  return (
    markers.find((m) => m.aliases.includes(n)) ??
    markers.find((m) => normaliseMarkerName(m.displayName) === n || m.key === n) ??
    null
  );
}

/** Markers whose name or any alias contains the query, in the list's order. */
export function searchMarkers(query: string, markers: CatalogueMarker[]): CatalogueMarker[] {
  const q = normaliseMarkerName(query);
  if (!q) return markers;
  return markers.filter(
    (m) => normaliseMarkerName(m.displayName).includes(q) || m.aliases.some((a) => a.includes(q))
  );
}

export function unitOf(marker: CatalogueMarker, unit: string): CatalogueUnit | null {
  return marker.units.find((u) => u.unit === unit) ?? null;
}

/**
 * A value in `unit` expressed in the marker's canonical unit, or null when
 * the unit is not one the list accepts (never guessed).
 *
 * MIND THE OFFSET: zero for every marker but HbA1c, where the IFCC relation is
 * affine (NGSP % = 0.09148 × mmol/mol + 2.152). Multiplying alone would read
 * 48 mmol/mol as 4.39 % instead of 6.54 %.
 */
export function toCanonical(marker: CatalogueMarker, value: number, unit: string): number | null {
  const u = unitOf(marker, unit);
  return u ? value * u.factor + u.offset : null;
}

/** The inverse: a canonical value in `unit`, or null for an unknown unit. */
export function fromCanonical(marker: CatalogueMarker, canonical: number, unit: string): number | null {
  const u = unitOf(marker, unit);
  return u && u.factor !== 0 ? (canonical - u.offset) / u.factor : null;
}

/** A value from one accepted unit to another, or null if either is unknown. */
export function convertUnit(marker: CatalogueMarker, value: number, from: string, to: string): number | null {
  if (from === to) return value;
  const c = toCanonical(marker, value, from);
  return c === null ? null : fromCanonical(marker, c, to);
}

/** Four significant figures, without trailing zeros: 0.7400 → 0.74. */
export const tidy = (n: number) => Number(n.toPrecision(4));

/**
 * The list's reference range for this person, in `unit`, or null.
 *
 * Their own sex's row first, then a row that applies to everyone. NO ROW
 * MEANS NO INTERVAL, deliberately: the nine threshold markers (cholesterol,
 * LDL, HDL, triglycerides, eGFR, glucose, HbA1c, vitamin D, PSA) have none,
 * and neither have LH, FSH and estradiol for women (cycle-phase dependent).
 * A person with no sex on file, or "other", only gets an everyone-row.
 */
export function catalogueRange(
  marker: CatalogueMarker,
  sex: string | null | undefined,
  unit: string
): { low: number | null; high: number | null } | null {
  const own = sex === "male" || sex === "female" ? marker.ranges.find((r) => r.sex === sex) : undefined;
  const row = own ?? marker.ranges.find((r) => r.sex === null);
  if (!row || (row.low === null && row.high === null)) return null;
  const conv = (v: number | null) => {
    if (v === null) return null;
    const out = fromCanonical(marker, v, unit);
    return out === null ? null : tidy(out);
  };
  const low = conv(row.low);
  const high = conv(row.high);
  if ((row.low !== null && low === null) || (row.high !== null && high === null)) return null;
  return { low, high };
}

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

/** The cycle phases a woman's LH, FSH and estradiol ranges are given for. */
export type LabPhase = "follicular" | "mid_cycle" | "luteal" | "postmenopausal";

export const LAB_PHASES: readonly { value: LabPhase; label: string }[] = [
  { value: "follicular", label: "Follicular" },
  { value: "mid_cycle", label: "Mid-cycle" },
  { value: "luteal", label: "Luteal" },
  { value: "postmenopausal", label: "Postmenopausal" },
];

export interface CatalogueRange {
  /** null = the same for everyone. */
  sex: MarkerSex | null;
  /** Women's LH, FSH and estradiol only: the phase this range is for. */
  phase: LabPhase | null;
  /** Either bound may be absent: a range can be one-sided ("under 20"). */
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
  /**
   * The plain-language remark shown under a result (Database 20261013000000),
   * e.g. that ALT can rise after hard training. For the nine threshold
   * markers it carries the thresholds themselves, as information.
   */
  remark: string | null;
  /** Lower-cased, trimmed names that mean this marker. */
  aliases: string[];
  /** Every accepted unit, the canonical one first (factor 1, offset 0). */
  units: CatalogueUnit[];
  ranges: CatalogueRange[];
}

/**
 * The nine threshold markers (cholesterol, LDL, HDL, triglycerides, eGFR,
 * glucose, HbA1c, vitamin D, PSA): the list holds no range rows for them,
 * because their familiar numbers are risk thresholds rather than ranges. The
 * approved review: no range and no flag for these, only the remark.
 */
export function isThresholdMarker(marker: CatalogueMarker): boolean {
  return marker.ranges.length === 0;
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
 * Whether this person's range for the marker depends on the cycle phase: a
 * woman's LH, FSH or estradiol, whose ranges are given per phase
 * (Database 20261013050000). The entry form asks for the phase first.
 */
export function needsPhase(marker: CatalogueMarker, sex: string | null | undefined): boolean {
  return sex === "female" && marker.ranges.some((r) => r.sex === "female" && r.phase !== null);
}

/**
 * The range to PRE-FILL in the entry form, or null.
 *
 * ONLY FROM A REVIEWED ROW (lab_markers.reviewed, signed off in Database
 * 20261013060000). An unreviewed marker pre-fills nothing: the user enters
 * the range printed on their report. For a phase-dependent marker nothing is
 * pre-filled until a phase is chosen.
 */
export function prefillRange(
  marker: CatalogueMarker,
  sex: string | null | undefined,
  unit: string,
  phase: LabPhase | null = null
): { low: number | null; high: number | null } | null {
  return marker.reviewed ? catalogueRange(marker, sex, unit, phase) : null;
}

/**
 * Whether to say "the standard list has no range for this marker". Always
 * for the threshold markers (no range rows at all: their familiar numbers are
 * risk thresholds, not ranges); for others only once reviewed, when there is
 * no row for this person (e.g. LH, FSH, estradiol for women).
 */
export function noStandardRange(
  marker: CatalogueMarker,
  sex: string | null | undefined,
  unit: string,
  phase: LabPhase | null = null
): boolean {
  if (marker.ranges.length === 0) return true;
  // Waiting for the phase is not "no range": the form asks for it instead.
  if (needsPhase(marker, sex) && phase === null) return false;
  return marker.reviewed && catalogueRange(marker, sex, unit, phase) === null;
}

/**
 * The list's reference range for this person, in `unit`, or null.
 *
 * Their own sex's row first, then a row that applies to everyone. NO ROW
 * MEANS NO INTERVAL, deliberately: the nine threshold markers (cholesterol,
 * LDL, HDL, triglycerides, eGFR, glucose, HbA1c, vitamin D, PSA) have none.
 * A woman's LH, FSH and estradiol are given per cycle phase: that phase's row,
 * or nothing until the phase is known. A person with no sex on file, or
 * "other", only gets an everyone-row. Either bound may be absent.
 */
export function catalogueRange(
  marker: CatalogueMarker,
  sex: string | null | undefined,
  unit: string,
  phase: LabPhase | null = null
): { low: number | null; high: number | null } | null {
  const own = needsPhase(marker, sex)
    ? phase === null
      ? undefined
      : marker.ranges.find((r) => r.sex === "female" && r.phase === phase)
    : sex === "male" || sex === "female"
      ? marker.ranges.find((r) => r.sex === sex && r.phase === null)
      : undefined;
  if (needsPhase(marker, sex) && !own) return null;
  const row = own ?? marker.ranges.find((r) => r.sex === null && r.phase === null);
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

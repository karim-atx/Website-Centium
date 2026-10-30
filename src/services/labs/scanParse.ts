/**
 * Round E · lab reports read on the device: turns the text read off a report
 * (by the on-device reader, services/labs/scanRead) into results to check.
 * Pure, so the matching is tested without a reader or a server.
 *
 * WHAT IT DOES NOT DO: decide anything clinical. It finds a marker name from
 * the standard list (its aliases), the number after it, the unit printed next
 * to it and the range printed on the line, and hands every one of them to the
 * member to check, edit or remove. Anything it cannot read stays empty for the
 * member to type; nothing is guessed. A unit the list does not accept for that
 * marker is left blank rather than assumed.
 */
import { normaliseMarkerName, unitOf, type CatalogueMarker } from "./catalogueLogic";

export interface ScannedResult {
  markerKey: string;
  /** The list's display name (what the row shows). */
  name: string;
  /** The value as printed, or null when no number could be read. */
  value: number | null;
  /** The list's spelling of the printed unit, or null when it isn't one the list accepts. */
  unit: string | null;
  /** The unit exactly as it was read, when one was (shown when it isn't accepted). */
  printedUnit: string | null;
  /** The range printed on the report, in the printed unit; null bounds when absent. */
  rangeLow: number | null;
  rangeHigh: number | null;
  /** The line it came from, so the member can compare. */
  line: string;
  /**
   * The value is far outside the range printed beside it (more than five
   * times over, or under a fifth): the reader may have dropped a decimal
   * point ("5.6" read as "56"). Never corrected, only flagged for checking.
   */
  check: boolean;
  /**
   * The range may have lost a decimal point: a value with decimals against a
   * whole-number upper limit eight or more times bigger ("2.10" against
   * "0.5 - 45"). The status is worked out from the range, so it is flagged.
   */
  checkRange: boolean;
}

export interface ScanReading {
  results: ScannedResult[];
  /** yyyy-mm-dd when a date was printed on the report, else null. */
  date: string | null;
  /** Lines that look like a result (a name and a number) but match no marker. */
  unmatched: string[];
}

/** A unit as compared: lower case, µ/μ as u, no spaces, x/× and powers spelt one way. */
export function normaliseUnit(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[µμ]/g, "u")
    .replace(/[×]/g, "x")
    .replace(/\s+/g, "")
    .replace(/³/g, "^3")
    .replace(/⁶/g, "^6")
    .replace(/⁹/g, "^9")
    .replace(/¹²/g, "^12")
    .replace(/10\*\*?(\d+)/g, "10^$1")
    .replace(/10e(\d+)/g, "10^$1")
    // What the reader makes of a caret: x10"9/L, x10M9/L, x1079/L.
    .replace(/10["'”“m7]{1,2}(3|6|9|12)\//g, "10^$1/")
    // ... and of a capital I after m: mlU/L for mIU/L.
    .replace(/^mlu\//, "miu/")
    .replace(/^x+(?=10)/, "")
    .replace(/^\(|\)$/g, "");
}

/** The list's spelling of a printed unit for this marker, or null if the list doesn't accept it. */
export function acceptedUnit(marker: CatalogueMarker, printed: string): string | null {
  const n = normaliseUnit(printed);
  if (!n) return null;
  const exact = unitOf(marker, printed);
  if (exact) return exact.unit;
  const hit = marker.units.find((u) => normaliseUnit(u.unit) === n);
  if (hit) return hit.unit;
  // Common printed spellings of the same unit.
  const SAME: Record<string, string> = { "k/ul": "10^3/ul", "thou/ul": "10^3/ul", "m/ul": "10^6/ul", "mil/ul": "10^6/ul", "l/l": "l/l", "iu/l": "u/l", "mu/l": "miu/l", "uiu/ml": "miu/l", "mcg/l": "ug/l", "mcg/dl": "ug/dl", "mcg/ml": "ug/ml", "mmol/mol": "mmol/mol" };
  const alt = SAME[n];
  if (alt) {
    const a = marker.units.find((u) => normaliseUnit(u.unit) === alt);
    if (a) return a.unit;
  }
  return null;
}

/**
 * A printed number: "13.5", "13,5" (a decimal comma), "250,000" (a thousands
 * comma: exactly three digits after it). OCR's O for 0 inside digits is fixed.
 */
export function readNumber(raw: string): number | null {
  let s = raw.trim().replace(/(?<=\d)[oO](?=[\d.,]|$)/g, "0").replace(/^[oO](?=[.,]\d)/, "0");
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else s = s.replace(",", ".");
  // A leading zero before more digits is a dropped decimal point ("06" for
  // "0.6"): a report never prints a whole number that way.
  if (/^0\d+$/.test(s)) s = `0.${s.slice(1)}`;
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const NUM = String.raw`\d+(?:[.,]\d+)*`;
const DASH = String.raw`[-–—‒−]|to`;
/** A standalone number: after a space, a colon or the line start; not "25-OH", not a date. */
const NUMBER_TOKEN = new RegExp(String.raw`(?:^|\s|:)(${NUM}|[oO][.,]\d+)(?![-–][a-zA-Z]|\/\d)(?=\s|$|[a-zA-Z%/µμ*<>(\-–])`, "g");

/** The printed range somewhere in the text after the value, or nulls. */
export function readRange(rest: string): { low: number | null; high: number | null } {
  const two = rest.match(new RegExp(String.raw`(${NUM})\s*(?:${DASH})\s*(${NUM})`, "i"));
  if (two) {
    const low = readNumber(two[1]);
    const high = readNumber(two[2]);
    if (low !== null && high !== null && low <= high) return { low, high };
  }
  const under = rest.match(new RegExp(String.raw`(?:<|≤|<=|up to|under|below)\s*(${NUM})`, "i"));
  if (under) return { low: null, high: readNumber(under[1]) };
  const over = rest.match(new RegExp(String.raw`(?:>|≥|>=|over|above)\s*(${NUM})`, "i"));
  if (over) return { low: readNumber(over[1]), high: null };
  return { low: null, high: null };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const valid = (y: number, m: number, d: number) => {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 ? `${y}-${pad(m)}-${pad(d)}` : null;
};

/**
 * The first date printed on the report: 2026-08-12, 12/08/2026 (day first, as
 * reports in Lebanon print it), 12 Aug 2026 or Aug 12, 2026. A date after
 * `today` is ignored (it can't be a test date).
 */
export function readReportDate(text: string, today: string): string | null {
  const found: string[] = [];
  for (const m of text.matchAll(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
    const v = valid(+m[1], +m[2], +m[3]);
    if (v) found.push(v);
  }
  for (const m of text.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/g)) {
    const v = valid(+m[3], +m[2], +m[1]);
    if (v) found.push(v);
  }
  for (const m of text.matchAll(/\b(\d{1,2})[\s-]+([A-Za-z]{3})[a-z]*\.?[\s-]+(\d{4})\b/g)) {
    const mo = MONTHS.indexOf(m[2].toLowerCase());
    const v = mo >= 0 ? valid(+m[3], mo + 1, +m[1]) : null;
    if (v) found.push(v);
  }
  for (const m of text.matchAll(/\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/g)) {
    const mo = MONTHS.indexOf(m[1].toLowerCase());
    const v = mo >= 0 ? valid(+m[3], mo + 1, +m[2]) : null;
    if (v) found.push(v);
  }
  const usable = found.filter((d) => d <= today);
  if (usable.length === 0) return null;
  // The first date printed is the collection date. matchAll above runs per
  // pattern, so sort by where each first appears.
  const at = (d: string) => {
    const [y, m, dd] = d.split("-").map(Number);
    const forms = [d, `${dd}/${m}/${y}`, `${pad(dd)}/${pad(m)}/${y}`, `${dd}.${m}.${y}`, `${pad(dd)}.${pad(m)}.${y}`, `${dd}-${m}-${y}`, `${pad(dd)}-${pad(m)}-${y}`];
    const hits = forms.map((f) => text.indexOf(f)).filter((i) => i >= 0);
    const named = text.search(new RegExp(String.raw`\b${dd}\s+${MONTHS[m - 1]}`, "i"));
    if (named >= 0) hits.push(named);
    return hits.length ? Math.min(...hits) : Number.MAX_SAFE_INTEGER;
  };
  return usable.sort((a, b) => at(a) - at(b))[0];
}

/** Every name a marker goes by, lower case, longest first. */
function namesOf(marker: CatalogueMarker): string[] {
  const set = new Set<string>([...marker.aliases, normaliseMarkerName(marker.displayName)]);
  return [...set].filter(Boolean).sort((a, b) => b.length - a.length);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The marker a line's label names: the longest list name found in it as whole
 * words (so "LDL cholesterol" wins over "cholesterol", and "hb" never matches
 * inside "hba1c").
 */
export function markerForLabel(label: string, markers: CatalogueMarker[]): CatalogueMarker | null {
  const text = ` ${label.toLowerCase().replace(/[_:]/g, " ").replace(/\s+/g, " ").trim()} `;
  let best: { marker: CatalogueMarker; len: number } | null = null;
  for (const m of markers) {
    for (const name of namesOf(m)) {
      if (best && name.length <= best.len) break;
      const re = new RegExp(String.raw`(?<![a-z0-9])${escape(name)}(?![a-z0-9])`);
      if (re.test(text)) {
        best = { marker: m, len: name.length };
        break;
      }
    }
  }
  return best?.marker ?? null;
}

/** Reads the text of a report into results to check. */
export function parseReport(text: string, markers: CatalogueMarker[], today: string): ScanReading {
  const results: ScannedResult[] = [];
  const unmatched: string[] = [];
  const seen = new Set<string>();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[|¦]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const line of lines) {
    // The value is the first standalone number with a name before it. Digits
    // inside a name don't count: "Vitamin B12", "HbA1c" and "25-OH" keep theirs.
    let first: RegExpMatchArray | null = null;
    let valueAt = -1;
    let label = "";
    for (const m of line.matchAll(NUMBER_TOKEN)) {
      const at = (m.index ?? 0) + m[0].indexOf(m[1]);
      const before = line.slice(0, at).trim();
      if (!/[a-z]{2,}/i.test(before)) continue;
      first = m;
      valueAt = at;
      label = before;
      break;
    }
    if (!first) continue;
    const marker = markerForLabel(label, markers);
    if (!marker) {
      if (label.length <= 40) unmatched.push(line);
      continue;
    }
    if (seen.has(marker.key)) continue;
    seen.add(marker.key);

    const value = readNumber(first[1]);
    const after = line.slice(valueAt + first[1].length);
    // The unit: the first token after the value (skipping an H/L flag or a
    // star) that the list accepts for this marker; a unit-looking token the
    // list doesn't accept is kept as printed, for the member to see.
    let unit: string | null = null;
    let printedUnit: string | null = null;
    const tokens = after.replace(/[()[\]]/g, " ").split(/\s+/).filter(Boolean);
    for (const t of tokens.slice(0, 4)) {
      if (/^(h|l|hi|lo|high|low|\*+|!)$/i.test(t)) continue;
      if (readNumber(t) !== null || /^[<>≤≥-]/.test(t)) continue;
      const a = acceptedUnit(marker, t);
      if (a) {
        unit = a;
        printedUnit = t;
        break;
      }
      if (/[a-zA-Z%/µμ^]/.test(t) && !printedUnit) printedUnit = t;
    }
    // "x10^9/L" can be printed as two tokens ("x10^9 /L").
    if (!unit) {
      const joined = tokens.slice(0, 3).join("");
      const a = acceptedUnit(marker, joined) ?? acceptedUnit(marker, tokens.slice(0, 2).join(""));
      if (a) {
        unit = a;
        printedUnit = tokens.slice(0, 2).join(" ");
      }
    }
    // A bare "%" printed straight after the number ("5.6%").
    if (!unit && /^%/.test(after)) {
      const a = acceptedUnit(marker, "%");
      if (a) {
        unit = a;
        printedUnit = "%";
      }
    }
    const range = readRange(after);
    const check =
      value !== null &&
      ((range.high !== null && range.high > 0 && value > range.high * 5) || (range.low !== null && range.low > 0 && value < range.low / 5));
    const checkRange =
      !check && value !== null && value > 0 && !Number.isInteger(value) && range.high !== null && Number.isInteger(range.high) && range.high >= value * 8;
    results.push({
      markerKey: marker.key,
      name: marker.displayName,
      value,
      unit,
      printedUnit: unit ? null : printedUnit,
      rangeLow: range.low,
      rangeHigh: range.high,
      line,
      check,
      checkRange,
    });
  }
  return { results, date: readReportDate(text, today), unmatched };
}

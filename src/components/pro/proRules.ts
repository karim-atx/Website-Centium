// Release 3 · the pure rules behind the shared professional components, apart
// from the components so the node tests load them (and Fast refresh keeps
// working on the component files).

/** HANDOVER i: ring colour by adherence. 70 and above good, 40 to 69 needs watching, below 40 poor. */
export type RingStatus = "good" | "watch" | "poor";
export function ringStatus(v: number): RingStatus {
  return v >= 70 ? "good" : v >= 40 ? "watch" : "poor";
}

/** food_conflicts kinds (DB-5). */
export type ConflictKind = "allergy_confirmed" | "allergy_check" | "restriction" | "preference" | "allergies_unknown";
/** Only a confirmed allergy (structured data) blocks; a keyword match is "Check this" and never decides severity. */
export const conflictBlocks = (kind: ConflictKind): boolean => kind === "allergy_confirmed";

/** COPY CL2: the LockLine sentence. */
export const lockLineText = (what: string, clientFirstName: string): string =>
  `${what} not shared, so hidden. ${clientFirstName} can change this any time.`;

/** ProChart ranges (HANDOVER e). */
export type ProChartRange = "W" | "M" | "3M" | "Y";
export const PRO_CHART_RANGES: ProChartRange[] = ["W", "M", "3M", "Y"];

/**
 * COPY 6.3: a signed number for deltas. Positives get "+", negatives the true
 * minus "−" (U+2212, as the dashboard deltas already use), zero stays "0".
 * `body` formats the absolute value (defaults to String).
 */
export function signedNum(n: number, body: (abs: number) => string = String): string {
  if (n > 0) return `+${body(n)}`;
  if (n < 0) return `−${body(Math.abs(n))}`;
  return body(0);
}

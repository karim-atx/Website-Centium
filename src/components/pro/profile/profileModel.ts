// Release 3 · W6 the pure parts of the professional's profile screens (MO3,
// MO4, MO5, MO6, MO8, MO14, MO15, MO16, MO20, MO26), tested in
// profileModel.test.ts.

// No imports that reach the Supabase client: the node test runner loads this file.
import { licenceStatus, type LicenceReviewRow } from "../../../services/professional-cv/licenceStatus";
import { siteHref, siteText } from "../../../config/site";
import { appLocale } from "../../../i18n/format";

type WorkModeDb = "in_person" | "online" | "both";
type LicenceLike = { id: string; documentPath: string | null };

/** COPY `{profile_url}`: the site address + /p/{handle} (config/site). profileUrl is the text shown, profileHref the link copied and shared. */
export const profileUrl = (handle: string) => siteText(`/p/${handle}`);
export const profileHref = (handle: string) => siteHref(`/p/${handle}`);

/** "1 word", "92 words". */
export function wordCount(text: string | null | undefined): number {
  const t = (text ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Years of experience from the CV's experience entries (start to end, or to
 * now for a current role), overlapping roles counted once. Months are
 * "YYYY-MM". Whole years, rounded down.
 */
export function yearsOfExperience(rows: { start: string; end: string | null }[], now: string): number {
  const toIdx = (m: string) => Number(m.slice(0, 4)) * 12 + (Number(m.slice(5, 7)) - 1);
  const spans = rows
    .filter((r) => !!r.start)
    .map((r) => [toIdx(r.start), toIdx(r.end ?? now)] as [number, number])
    .filter(([a, b]) => b >= a)
    .sort((x, y) => x[0] - y[0]);
  let months = 0;
  let cur: [number, number] | null = null;
  for (const s of spans) {
    if (!cur) cur = [s[0], s[1]];
    else if (s[0] <= cur[1]) cur[1] = Math.max(cur[1], s[1]);
    else {
      months += cur[1] - cur[0];
      cur = [s[0], s[1]];
    }
  }
  if (cur) months += cur[1] - cur[0];
  return Math.floor(months / 12);
}

export interface LicenceFacts<L extends LicenceLike = LicenceLike> {
  /** The licence the Licence row and sheet are about: the first verified one, else the first. */
  primary: L | null;
  verified: boolean;
  /** When the approving review was decided (ISO), for "Verified {date}". */
  verifiedAt: string | null;
  status: ReturnType<typeof licenceStatus> | null;
}

export function licenceFacts<L extends LicenceLike>(licences: L[], reviews: LicenceReviewRow[]): LicenceFacts<L> {
  if (licences.length === 0) return { primary: null, verified: false, verifiedAt: null, status: null };
  const withStatus = licences.map((l) => ({ l, s: licenceStatus(l, reviews) }));
  const v = withStatus.find((x) => x.s.kind === "verified");
  const pick = v ?? withStatus[0];
  const approved = v
    ? reviews
        .filter((r) => r.licenceId === v.l.id && r.documentPath === v.l.documentPath && r.approvedAt)
        .map((r) => r.approvedAt as string)
        .sort()
        .pop() ?? null
    : null;
  return { primary: pick.l, verified: !!v, verifiedAt: approved, status: pick.s };
}

/** "Mar 3, 2026", the frames' date shape for a verification date. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric", year: "numeric" });
}

/** "Mar 2028" for a "YYYY-MM" month. */
export function monthYear(month: string | null): string | null {
  if (!month) return null;
  const d = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
  return d.toLocaleDateString(appLocale("en-US"), { month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// MO20 Where you work: the four tabs over professional_work_mode's three values
// ---------------------------------------------------------------------------

export type WorkTab = "independent" | "business" | "online" | "mix";

/** The onboarding mapping (proModel WORK_MODE_TO_DB): Independent and Business are both in person. */
export const WORK_TAB_TO_DB: Record<WorkTab, WorkModeDb> = { independent: "in_person", business: "in_person", online: "online", mix: "both" };

/** In person reads as Business when the professional works at a business, else Independent. */
export function workTabOf(mode: WorkModeDb | null, worksAtBusiness: boolean): WorkTab | null {
  if (mode === "online") return "online";
  if (mode === "both") return "mix";
  if (mode === "in_person") return worksAtBusiness ? "business" : "independent";
  return null;
}

/**
 * The MO20 radius bar (r13 whereWork13) over professional_profiles.
 * service_radius_km (Release B 20261217010000: 1 to 100 km, default 25).
 * The frame fills 40% at 10 km on a linear 25 km scale; the column now runs
 * to 100, so the bar is a curve through the same point: 1 km is empty,
 * 10 km is 40% as drawn, 100 km is full. The slider moves in RADIUS_STEPS
 * positions along that curve, so small radii get the fine steps.
 */
export const RADIUS_MIN_KM = 1;
export const RADIUS_MAX_KM = 100;
export const RADIUS_DEFAULT_KM = 25;
export const RADIUS_STEPS = 200;
const RADIUS_CURVE = Math.log(0.4) / Math.log((10 - RADIUS_MIN_KM) / (RADIUS_MAX_KM - RADIUS_MIN_KM));
const clampKm = (km: number) => Math.min(RADIUS_MAX_KM, Math.max(RADIUS_MIN_KM, km));
export const radiusFill = (km: number | null) => (km === null ? 0 : Math.pow((clampKm(km) - RADIUS_MIN_KM) / (RADIUS_MAX_KM - RADIUS_MIN_KM), RADIUS_CURVE));
/** The slider position (0 to RADIUS_STEPS) for a radius, and back to whole km. */
export const radiusPosition = (km: number | null) => Math.round(radiusFill(km) * RADIUS_STEPS);
export const radiusAtPosition = (pos: number) =>
  clampKm(Math.round(RADIUS_MIN_KM + (RADIUS_MAX_KM - RADIUS_MIN_KM) * Math.pow(Math.min(1, Math.max(0, pos / RADIUS_STEPS)), 1 / RADIUS_CURVE)));

/**
 * The MO1 "Service area" row (PLAN S2, drawn copy): "{area_label} and {n} km
 * around"; only the area when there's no radius; "Online only" when
 * work_mode is online. Null when there's no area to name (the row keeps its
 * plain subtitle).
 */
export function serviceAreaLine(areaLabel: string | null, km: number | null, workMode: WorkModeDb | null): string | null {
  if (workMode === "online") return "Online only";
  const area = areaLabel?.trim();
  if (!area) return null;
  return km ? `${area} and ${km} km around` : area;
}

// ---------------------------------------------------------------------------
// MO5 / MO16 lines
// ---------------------------------------------------------------------------

export function priceLabel(price: number, currency = "USD"): string {
  if (!price) return "Free";
  const sym = currency === "USD" ? "$" : `${currency} `;
  return `${sym}${Number.isInteger(price) ? price : price.toFixed(2)}`;
}

const PER: Record<string, string> = { daily: "day", monthly: "mo", annually: "yr", quarterly: "qtr", semiannually: "6 mo" };

/**
 * "$120/mo" (S218 `{price}/mo`): every hire plan is billed by its period
 * (professional_plans.billing); a package's session_count is how many
 * sessions each period holds (DB-4), not a one-off price.
 */
export function planPrice(price: number, billing: string): string {
  const p = priceLabel(price);
  return price ? `${p}/${PER[billing] ?? billing}` : p;
}

/** The plan row's line: the package size first, then what's included. */
export function planLine(features: string[], sessionCount: number | null): string {
  const parts = [sessionCount !== null ? plural(sessionCount, "session") : null, ...features].filter(Boolean) as string[];
  return parts.length ? parts.slice(0, 2).join(" · ") : "No details yet";
}

export function sessionLine(durationMin: number, locationKind: string | null): string {
  const where = locationKind === "online" ? "Online" : locationKind === "in_person" ? "In person" : locationKind === "home_visit" ? "Home visit" : locationKind === "phone" ? "Phone" : "In person or online";
  return `${durationMin} min · ${where}`;
}

export const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120] as const;

/** "" or "Free" is 0; otherwise a non-negative number, else null (invalid). */
export function parsePriceInput(s: string): number | null {
  const t = s.trim().replace(/^\$/, "");
  if (t === "" || /^free$/i.test(t)) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Number(t);
}

// ---------------------------------------------------------------------------
// MO3 / MO15 pinned pair (r16 btnSpec16): equal halves, stacked when a half
// can't hold "Book a session" with its icon (162 pt needed, 160 at 360).
// ---------------------------------------------------------------------------

/**
 * Each half of the bar (16 from each edge, 8 apart) must hold 162 px. Larger
 * text always stacks: the frame scales the bar 1.2x, so a 390 column acts as
 * 325 with halves of 142.
 */
export function pairStacks(viewportWidth: number, largerText = false): boolean {
  const w = Math.min(viewportWidth, 430) / (largerText ? 1.2 : 1);
  return (w - 32 - 8) / 2 < 162;
}

// ---------------------------------------------------------------------------
// MO6 reviews
// ---------------------------------------------------------------------------

export type ReviewTab = "all" | "needs" | "replied";

export function filterReviews<T extends { redactedAt: string | null; reply: unknown }>(rows: T[], tab: ReviewTab): T[] {
  if (tab === "needs") return rows.filter((r) => !r.redactedAt && !r.reply);
  if (tab === "replied") return rows.filter((r) => !!r.reply);
  return rows;
}

/** The average of the counted (not redacted) reviews, one decimal; null with none. */
export function averageOf(rows: { rating: number; redactedAt: string | null }[]): number | null {
  const c = rows.filter((r) => !r.redactedAt);
  return c.length ? Math.round((c.reduce((n, r) => n + r.rating, 0) / c.length) * 10) / 10 : null;
}

/** "Jane S." from a first name and an optional last initial; "A client" when hidden. */
export function reviewerLabel(name: string | null): string {
  return name?.trim() ? name.trim() : "A client";
}

// Market + Share 3.0 · W5 · the professional's public profile, work history,
// class-context reviews and the ranked directory (C-MO.4.9, P-MA.2 Work
// history; PLAN §2.2 DB10, api.md "Reviews and work history", types.ts
// WorkHistoryEntry / InstructorReview / ProfessionalCard / DirectoryResult).
// Pure parsers and display rules (no Supabase import, so node:test runs them).
//
// D-27: no phone, email, social link or website is ever read into these
// shapes, whatever the reader returns.

import { num, rows, str } from "../market/parse";
import type { ProfessionalCardData } from "../../components/market/peopleModel";

export type WorkType = "role" | "class_slot";

/** One Centium work-history entry (a hire): types.ts WorkHistoryEntry. */
export interface WorkEntry {
  id: string;
  hireId: string | null;
  businessId: string | null;
  businessName: string;
  roleTitle: string;
  type: WorkType;
  /** ISO date the hire started. */
  from: string | null;
  /** ISO date it ended; null while current. */
  to: string | null;
}

/** A review with the class and gym it was written for (D-43), or a client review (no context). */
export interface ProfileReview {
  id: string;
  reviewerName: string;
  rating: number;
  text: string | null;
  createdAt: string | null;
  className: string | null;
  businessName: string | null;
}

/** A current Team class ("Teaches at"). */
export interface TeachesAtRow {
  seriesId: string | null;
  title: string;
  businessId: string | null;
  businessName: string;
  /** ISO weekday 1 = Monday … 7 = Sunday. */
  weekday: number | null;
  /** "HH:MM" (24-hour; shown 12-hour). */
  startTime: string | null;
  /** ISO date when the class starts later ("Spin 45 · from Nov 1"). */
  startsOn: string | null;
}

/** A service on the Services tab: Book (a single session) or Hire (a pack or programme). */
export interface ProfileService {
  id: string;
  kind: "book" | "hire";
  name: string;
  meta: string | null;
  price: number | null;
}

/** An active point offer on About. */
export interface ProfileOffer {
  id: string;
  headline: string;
  endsOn: string | null;
  pointsCost: number;
}

/** professional_public_profile(p_id): no contact fields (D-27). */
export interface PublicProfile {
  card: ProfessionalCardData;
  about: string | null;
  specialties: string[];
  services: ProfileService[];
  offers: ProfileOffer[];
  workHistory: WorkEntry[];
  reviews: ProfileReview[];
  teachesAt: TeachesAtRow[];
}

/** professionals_ranked: the card plus its place in the server's order, "From $X" and the keyset cursor (rank_score, id). */
export interface DirectoryHit extends ProfessionalCardData {
  rank: number | null;
  fromPriceValue: number | null;
  /** rank_score, the cursor's first half (p_before_score). */
  score: number | null;
}

const workType = (v: unknown): WorkType => (v === "class_slot" ? "class_slot" : "role");

/**
 * The card from professional_public_profile or professionals_ranked
 * (professional_id, first_name, avatar_url, specialty, headline,
 * average_rating and review_count from professional_rating(),
 * hired_via_centium, area_label, location). Never contact fields: neither
 * function returns any.
 */
export function parseCard(r: Record<string, unknown>): ProfessionalCardData {
  return {
    id: str(r.professional_id) ?? "",
    name: str(r.first_name)?.trim() ?? "",
    photoUrl: str(r.avatar_url),
    specialty: str(r.specialty) ?? str(r.headline) ?? "",
    rating: num(r.average_rating),
    reviewCount: num(r.review_count) ?? 0,
    hiredViaCentiumCount: num(r.hired_via_centium) ?? 0,
    distanceKm: null,
    area: str(r.area_label) ?? str(r.location),
  };
}

/** work_history(p_professional_id): hire_id, business_id, business_name, logo_url, role_title, type, from_on, to_on, status, classes_per_week, hired_via_centium. */
export function parseWork(data: unknown): WorkEntry[] {
  return rows(data)
    .map((r) => ({
      id: str(r.hire_id) ?? "",
      hireId: str(r.hire_id),
      businessId: str(r.business_id),
      businessName: str(r.business_name) ?? "",
      roleTitle: str(r.role_title) ?? "",
      type: workType(r.type),
      from: str(r.from_on),
      to: str(r.to_on),
    }))
    .filter((w) => w.id && w.businessName);
}

/**
 * professional_public_profile (one row; none for an unlisted professional)
 * with work_history. The rest of the board's profile has no reader in the
 * contract (Database gap): reviews with their class and gym, the services
 * split Book / Hire, point offers, Teaches at — those stay empty and the
 * screens keep their live sources.
 */
export function parsePublicProfile(profile: unknown, work: unknown): PublicProfile | null {
  const r = rows(profile)[0];
  if (!r) return null;
  const card = parseCard(r);
  if (!card.id) return null;
  const skills = Array.isArray(r.skills) ? (r.skills as unknown[]).map(str).filter((s): s is string => !!s) : [];
  return { card, about: str(r.bio), specialties: skills, services: [], offers: [], workHistory: parseWork(work), reviews: [], teachesAt: [] };
}

/** professionals_ranked rows, in the server's order (rank_score desc, id). "From $X" is the lower of the two rates. */
export function parseDirectory(data: unknown): DirectoryHit[] {
  return rows(data)
    .map((r, i) => {
      const prices = [num(r.consultation_rate), num(r.monthly_rate)].filter((p): p is number => p != null && p > 0);
      const card = parseCard(r);
      // Every row is kept (only an id is required): the cursor is the LAST ROW the server sent.
      return { ...card, name: card.name || "Professional", rank: i + 1, fromPriceValue: prices.length ? Math.min(...prices) : null, score: num(r.rank_score) };
    })
    .filter((c) => c.id);
}

// ---------------------------------------------------------------- display rules

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ymd = (iso: string): [number, number, number] | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? [Number(m[1]), Number(m[2]) - 1, Number(m[3])] : null;
};

/** "Sep 12, 2026" (D-02, month first). */
export function dayText(iso: string | null): string {
  const d = iso ? ymd(iso) : null;
  return d ? `${MONTHS[d[1]]} ${d[2]}, ${d[0]}` : "";
}

/** The stub on a work-history entry: "Role" (current), "Class slot", "Ended" (a role that ended). */
export function workStub(e: Pick<WorkEntry, "type" | "to">, today: string): "Role" | "Class slot" | "Ended" {
  if (e.type === "class_slot") return "Class slot";
  return e.to && e.to.slice(0, 10) < today ? "Ended" : "Role";
}

/** "Spin instructor · Role", "Saturday Spin cover · Class slot". */
export const workRoleLine = (e: Pick<WorkEntry, "roleTitle" | "type">): string => `${e.roleTitle} · ${e.type === "class_slot" ? "Class slot" : "Role"}`;

/**
 * The date line, month first (D-02): a class slot is its day ("Sep 12, 2026");
 * a role is "Mar 2026 to now", "Jan to Jun 2025" (same year), "Nov 2024 to
 * Feb 2025".
 */
export function workDates(e: Pick<WorkEntry, "type" | "from" | "to">, today: string): string {
  if (e.type === "class_slot") return dayText(e.from);
  const a = e.from ? ymd(e.from) : null;
  if (!a) return "";
  const b = e.to && e.to.slice(0, 10) < today ? ymd(e.to) : null;
  if (!b) return `${MONTHS[a[1]]} ${a[0]} to now`;
  if (a[0] === b[0]) return a[1] === b[1] ? `${MONTHS[a[1]]} ${a[0]}` : `${MONTHS[a[1]]} to ${MONTHS[b[1]]} ${a[0]}`;
  return `${MONTHS[a[1]]} ${a[0]} to ${MONTHS[b[1]]} ${b[0]}`;
}

/** Newest first: current roles, then by start date. */
export function sortWork(list: WorkEntry[], today: string): WorkEntry[] {
  const current = (e: WorkEntry) => (workStub(e, today) === "Role" ? 1 : 0);
  return [...list].sort((x, y) => current(y) - current(x) || (y.from ?? "").localeCompare(x.from ?? ""));
}

/** A review's context line: "Spin 45 · Hamra Strength Club"; null for a client review. */
export function reviewContext(r: Pick<ProfileReview, "className" | "businessName">): string | null {
  if (r.className && r.businessName) return `${r.className} · ${r.businessName}`;
  return r.businessName ?? r.className ?? null;
}

/** "Spin 45 · from Nov 1" when the class starts later; else the title. */
export function teachesTitle(t: Pick<TeachesAtRow, "title" | "startsOn">, today: string): string {
  const d = t.startsOn ? ymd(t.startsOn) : null;
  return d && t.startsOn!.slice(0, 10) > today ? `${t.title} · from ${MONTHS[d[1]]} ${d[2]}` : t.title;
}

const WEEKDAY = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
/** The day label on a Teaches-at row ("FRI"), ISO weekday 1..7. */
export const weekdayCaps = (w: number | null): string => (w && w >= 1 && w <= 7 ? WEEKDAY[w - 1] : "");

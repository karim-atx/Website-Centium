// Market + Share 3.0 · W5 · the professional's public profile, work history,
// class-context reviews and the ranked directory (C-MO.4.9, P-MA.2 Work
// history; PLAN §2.2 DB10, api.md "Reviews and work history", types.ts
// WorkHistoryEntry / InstructorReview / ProfessionalCard / DirectoryResult).
// Pure parsers and display rules (no Supabase import, so node:test runs them).
//
// D-27: no phone, email, social link or website is ever read into these
// shapes, whatever the reader returns.

import { bool, num, rows, str } from "../market/parse";
import type { ProfessionalCardData } from "../../components/market/peopleModel";
import { getLanguage, t, tk } from "../../i18n/core";
import { appLocale } from "../../i18n/format";

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
  /** Release B (20261217010000): how they work and how far they go in person (MO3 Where). */
  workMode: WorkMode | null;
  serviceRadiusKm: number | null;
  about: string | null;
  specialties: string[];
  services: ProfileService[];
  offers: ProfileOffer[];
  workHistory: WorkEntry[];
  reviews: ProfileReview[];
  teachesAt: TeachesAtRow[];
}

/** professional_work_mode; null is unset, which the server counts as in person. */
export type WorkMode = "in_person" | "online" | "both";

/**
 * Release B (Database 20261217010000 / 020000): what professionals_ranked and
 * professionals_in_area say about how somebody is reached. An online row has
 * no coordinates (distance_band 'online', band_rank 7); has_area is "an
 * in-person result with a distance"; is_online_only is "works only online".
 * A both-modes professional out of reach is false / false, so both are kept.
 */
export interface Reach {
  workMode: WorkMode | null;
  serviceRadiusKm: number | null;
  /** "in_clinic", … (kinds of place, never an address). */
  sessionPlaces: string[];
  isOnlineOnly: boolean;
  hasArea: boolean;
  /** ISO 3166-1 alpha-2, or null when they saved no country. */
  countryCode: string | null;
}

export const workModeOf = (v: unknown): WorkMode | null => (v === "in_person" || v === "online" || v === "both" ? v : null);

/** Works online: online or both (or the server says online only). */
export const worksOnline = (r: Pick<Reach, "workMode" | "isOnlineOnly">): boolean => r.isOnlineOnly || r.workMode === "online" || r.workMode === "both";

/** Works in person: in person, both, or unset (the server's rule). */
export const worksInPerson = (r: Pick<Reach, "workMode" | "isOnlineOnly">): boolean => !r.isOnlineOnly && r.workMode !== "online";

/** The six Release B columns of a ranked or in-area row. */
export function parseReach(r: Record<string, unknown>): Reach {
  const cc = str(r.country_code);
  return {
    workMode: workModeOf(r.work_mode),
    serviceRadiusKm: num(r.service_radius_km),
    sessionPlaces: Array.isArray(r.session_places) ? (r.session_places as unknown[]).map(str).filter((s): s is string => !!s) : [],
    isOnlineOnly: bool(r.is_online_only),
    hasArea: bool(r.has_area),
    countryCode: cc && /^[A-Za-z]{2}$/.test(cc) ? cc.toUpperCase() : null,
  };
}

/** professionals_ranked: the card plus its place in the server's order, "From $X" and the keyset cursor (rank_score, id). */
export interface DirectoryHit extends ProfessionalCardData, Reach {
  rank: number | null;
  fromPriceValue: number | null;
  /** rank_score, the cursor's first half (p_before_score). */
  score: number | null;
  /** The professional's approximate area (two decimals, ~1 km): the device works out the distance (DJ). */
  approxLat: number | null;
  approxLng: number | null;
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

/** public_offers('professional', id) rows → About's offers (live by the server's rule, cheapest first). */
export function parseProfileOffers(data: unknown): ProfileOffer[] {
  return rows(data).flatMap((r) => {
    const id = str(r.id);
    const headline = str(r.title);
    const pointsCost = num(r.points_cost);
    if (!id || !headline || pointsCost === null) return [];
    const end = str(r.ends_on);
    return [{ id, headline, endsOn: end ? end.slice(0, 10) : null, pointsCost }];
  });
}

/**
 * professional_public_profile (one row; none for an unlisted professional)
 * with work_history and public_offers. The rest of the board's profile has no
 * reader in the contract (Database gap): reviews with their class and gym,
 * the services split Book / Hire, Teaches at — those stay empty and the
 * screens keep their live sources.
 */
export function parsePublicProfile(profile: unknown, work: unknown, offers: unknown = []): PublicProfile | null {
  const r = rows(profile)[0];
  if (!r) return null;
  const card = parseCard(r);
  if (!card.id) return null;
  const skills = Array.isArray(r.skills) ? (r.skills as unknown[]).map(str).filter((s): s is string => !!s) : [];
  return { card, workMode: workModeOf(r.work_mode), serviceRadiusKm: num(r.service_radius_km), about: str(r.bio), specialties: skills, services: [], offers: parseProfileOffers(offers), workHistory: parseWork(work), reviews: [], teachesAt: [] };
}

/** professionals_ranked rows, in the server's order (rank_score desc, id). "From $X" is the lower of the two rates. */
export function parseDirectory(data: unknown): DirectoryHit[] {
  return rows(data)
    .map((r, i) => {
      const prices = [num(r.consultation_rate), num(r.monthly_rate)].filter((p): p is number => p != null && p > 0);
      const card = parseCard(r);
      const reach = parseReach(r);
      // Every row is kept (only an id is required): the cursor is the LAST ROW the server sent.
      // Online rows and no-area rows too (Release B): they come after every distance band.
      return {
        ...card,
        name: card.name || t("Professional"),
        rank: i + 1,
        fromPriceValue: prices.length ? Math.min(...prices) : null,
        score: num(r.rank_score),
        approxLat: num(r.approx_lat),
        approxLng: num(r.approx_lng),
        ...reach,
        // "Online" in place of a distance (PLAN S1) whenever none is measured.
        online: worksOnline(reach),
      };
    })
    .filter((c) => c.id);
}

// ---------------------------------------------------------------- display rules

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ymd = (iso: string): [number, number, number] | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? [Number(m[1]), Number(m[2]) - 1, Number(m[3])] : null;
};

// Arabic: the locale's own month and day names (English keeps its exact form below).
const local = (d: [number, number, number], o: Intl.DateTimeFormatOptions) => new Date(d[0], d[1], d[2] || 1).toLocaleDateString(appLocale(), o);
const english = () => getLanguage() === "en";

/** "Sep 12, 2026" (D-02, month first). */
export function dayText(iso: string | null): string {
  const d = iso ? ymd(iso) : null;
  if (d && !english()) return local(d, { month: "short", day: "numeric", year: "numeric" });
  return d ? `${MONTHS[d[1]]} ${d[2]}, ${d[0]}` : "";
}

/** The stub on a work-history entry: "Role" (current), "Class slot", "Ended" (a role that ended). English keys, shown through t(). */
export function workStub(e: Pick<WorkEntry, "type" | "to">, today: string): "Role" | "Class slot" | "Ended" {
  if (e.type === "class_slot") return tk("Class slot");
  return e.to && e.to.slice(0, 10) < today ? tk("Ended") : tk("Role");
}

/** "Spin instructor · Role", "Saturday Spin cover · Class slot". */
export const workRoleLine = (e: Pick<WorkEntry, "roleTitle" | "type">): string => `${e.roleTitle} · ${e.type === "class_slot" ? t("Class slot") : t("Role")}`;

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
  if (!english()) {
    const my = (x: [number, number, number]) => local(x, { month: "short", year: "numeric" });
    if (!b) return t("{from} to now", { from: my(a) });
    return a[0] === b[0] && a[1] === b[1] ? my(a) : t("{from} to {to}", { from: my(a), to: my(b) });
  }
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
export function teachesTitle(row: Pick<TeachesAtRow, "title" | "startsOn">, today: string): string {
  const d = row.startsOn ? ymd(row.startsOn) : null;
  if (!(d && row.startsOn!.slice(0, 10) > today)) return row.title;
  const date = english() ? `${MONTHS[d[1]]} ${d[2]}` : local(d, { month: "short", day: "numeric" });
  return t("{title} · from {date}", { title: row.title, date });
}

const WEEKDAY = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
/** The day label on a Teaches-at row ("FRI"), ISO weekday 1..7. */
export const weekdayCaps = (w: number | null): string =>
  w && w >= 1 && w <= 7 ? (english() ? WEEKDAY[w - 1] : new Date(2024, 0, w).toLocaleDateString(appLocale(), { weekday: "short" })) : "";

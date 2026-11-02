// Market + Share 3.0 · W5 · the client's professional directory and profile
// (C-MO.4.9: `proDir`, `proAbout`, `proServices`, `proBook`, `proBooked`,
// `proWork`, `proReviews`). Pure display rules, tested in
// profileModel.test.ts. No import here reaches the Supabase client.
//
// D-27: nothing in this file carries a phone, email or website. Social
// handles (Instagram, Facebook, X) are turned into links only for a viewer the
// live connection check says is a connected client (the caller decides; see
// `socialLinks`).

import { ratingLabel, reviewCountLabel } from "../../../services/professional-reviews/rules";
import type { ProfessionalCardData } from "../../../components/market/peopleModel";
import { dayText, reviewContext, type DirectoryHit, type ProfileReview } from "../../../services/pro-profile/model";
import { clock12 } from "../../../utils/time12";
import { SUBTYPE_SINGULAR } from "../../../components/professionals/subtypeLabels";
import { getLanguage, t, tk } from "../../../i18n/core";
import { appLocale } from "../../../i18n/format";

/** The subtype names with a capital (SUBTYPE_SINGULAR's), as English keys for t(). */
const TYPE_LABEL: Record<keyof typeof SUBTYPE_SINGULAR, string> = {
  trainer: tk("Personal trainer"),
  dietitian: tk("Dietitian"),
  physiotherapist: tk("Physiotherapist"),
  doctor: tk("Doctor"),
  nutritionist: tk("Nutritionist"),
  coach_instructor: tk("Coach or instructor"),
  other: tk("Health professional"),
};

/** "Personal trainer": the subtype's name, for a listing without a specialty. */
export const typeLabel = (s: keyof typeof SUBTYPE_SINGULAR | null | undefined): string => t(s ? TYPE_LABEL[s] : "Professional");

/** The fields of a live directory listing (services/directory) the card uses. */
export interface ListingLike {
  profileId: string;
  name: string;
  avatarUrl: string | null;
  specialty: string | null;
  headline: string | null;
  location: string | null;
  skills: string[];
  monthlyRate: number | null;
  consultationRate: number | null;
  averageRating: number | null;
  reviewCount: number;
}

/** "$15", "$15.50". */
export const dollars = (n: number): string => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** "From $15" (the card's price), or null when nothing is priced. */
export function fromPriceText(value: number | null | undefined): string | null {
  return value != null && Number.isFinite(value) && value > 0 ? t("From {price}", { price: dollars(value) }) : null;
}

/**
 * The live listing's lowest price: the per-session rate or the monthly rate,
 * whichever is lower (what "From $X" means until DB10's `from_price`).
 */
export function listingFromPrice(l: Pick<ListingLike, "monthlyRate" | "consultationRate">): number | null {
  const prices = [l.consultationRate, l.monthlyRate].filter((p): p is number => p != null && Number.isFinite(p) && p > 0);
  return prices.length ? Math.min(...prices) : null;
}

/**
 * The rating the card and the header show: the average once three reviews
 * count toward it (the live "New until 3 reviews" rule), else null ("New").
 */
export const shownRating = (average: number | null, count: number): number | null => {
  const r = ratingLabel(average, count);
  return r.kind === "average" ? Number(r.value) : null;
};

/**
 * A live listing as the shared ProfessionalCard (one identity everywhere).
 * `typeLabel` is the subtype's name, for a listing with no specialty.
 * The hired line comes only from DB10 (`hiredViaCentiumCount` stays 0 here
 * and the caller hides the line while it is unknown).
 */
export function listingCard(l: ListingLike, typeLabel: string, place?: string | null): ProfessionalCardData {
  return {
    id: l.profileId,
    name: l.name,
    photoUrl: l.avatarUrl,
    specialty: l.specialty?.trim() || l.headline?.trim() || typeLabel,
    rating: shownRating(l.averageRating, l.reviewCount),
    reviewCount: l.reviewCount,
    hiredViaCentiumCount: 0,
    area: place !== undefined ? place : l.location,
    fromPrice: fromPriceText(listingFromPrice(l)),
  };
}

/** A professionals_ranked hit (Database Release 2) as the card, with its "From $X". */
export function hitCard(h: DirectoryHit, photoUrl?: string | null): ProfessionalCardData {
  return {
    ...h,
    photoUrl: h.photoUrl ?? photoUrl ?? null,
    rating: shownRating(h.rating, h.reviewCount),
    fromPrice: fromPriceText(h.fromPriceValue),
  };
}

const norm = (s: string) => s.toLocaleLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** The search field over the live directory (name, specialty, headline, area, skills). Blank matches all. */
export function matchesQuery(l: Pick<ListingLike, "name" | "specialty" | "headline" | "location" | "skills">, query: string): boolean {
  const q = norm(query.trim());
  if (!q) return true;
  const hay = norm([l.name, l.specialty, l.headline, l.location, ...(l.skills ?? [])].filter(Boolean).join(" "));
  return q.split(/\s+/).every((w) => hay.includes(w));
}

/**
 * The header's rating line: "4.8 · 38 reviews · Hamra, Beirut",
 * "New · no reviews yet · Badaro, Beirut", "New · 2 reviews · Beirut".
 */
export function profileRatingLine(average: number | null, count: number, area: string | null): string {
  const r = ratingLabel(average, count);
  const head = r.kind === "average" ? `${r.value} · ${reviewCountLabel(r.count)}` : count > 0 ? `${t("New")} · ${reviewCountLabel(count)}` : t("New · no reviews yet");
  return area?.trim() ? `${head} · ${area.trim()}` : head;
}

// ---------------------------------------------------------------- services

export interface ServiceRow {
  key: string;
  /** Book = a single session (appointment_services); Hire = a plan (professional_plans). */
  kind: "book" | "hire";
  id: string;
  name: string;
  meta: string | null;
  price: string;
}

/** The Services tab: the bookable session types (Book) then the plans (Hire). */
export function serviceRows(
  sessions: { id: string; name: string; meta: string; price: string }[],
  plans: { id: string; name: string; meta: string | null; price: string }[],
): ServiceRow[] {
  return [
    ...sessions.map((s) => ({ key: `b:${s.id}`, kind: "book" as const, id: s.id, name: s.name, meta: s.meta, price: s.price })),
    ...plans.map((p) => ({ key: `h:${p.id}`, kind: "hire" as const, id: p.id, name: p.name, meta: p.meta, price: p.price })),
  ];
}

// ---------------------------------------------------------------- socials (D-27)

export interface SocialLink {
  kind: "instagram" | "facebook" | "x";
  label: string;
  text: string;
  href: string;
}

const HANDLE = /^[A-Za-z0-9._]{1,50}$/;

/**
 * The professional's social links, for a CONNECTED client only (D-27: never
 * on a public view; the caller passes nothing for anyone else). Values are
 * free text ("@handle" or a profile URL); anything that can't be a safe
 * https link to that network is dropped.
 */
export function socialLinks(s: { instagram?: string | null; facebook?: string | null; x?: string | null } | null): SocialLink[] {
  if (!s) return [];
  const out: SocialLink[] = [];
  const handleOf = (raw: string, hosts: RegExp) =>
    raw
      .trim()
      .replace(new RegExp(`^https?://(www\\.|m\\.)?(${hosts.source})/`, "i"), "")
      .replace(/^@/, "")
      .replace(/[/?#].*$/, "");
  const add = (kind: SocialLink["kind"], raw: string | null | undefined, hosts: RegExp, base: string, label: string) => {
    if (!raw?.trim()) return;
    const h = handleOf(raw, hosts);
    if (!HANDLE.test(h)) return;
    out.push({ kind, label, text: kind === "facebook" ? h : `@${h}`, href: `${base}${h}` });
  };
  add("instagram", s.instagram, /instagram\.com/, "https://www.instagram.com/", "Instagram");
  add("facebook", s.facebook, /facebook\.com|fb\.com/, "https://www.facebook.com/", "Facebook");
  add("x", s.x, /x\.com|twitter\.com/, "https://x.com/", "X");
  return out;
}

// ---------------------------------------------------------------- reviews

/** A live client review (services/professional-reviews ReviewRow), the fields the tab reads. */
export interface ClientReviewLike {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  redactedAt: string | null;
  reviewerName: string | null;
}

export interface ReviewLine {
  id: string;
  who: string;
  when: string;
  /** "Spin 45 · Hamra Strength Club" for a class review; null for a client review. */
  context: string | null;
  text: string | null;
  rating: number;
  at: string;
}

/**
 * The Reviews tab's rows, newest first: the live client reviews (removed ones
 * left to the full Reviews page) and, once DB10 answers, the class reviews
 * with their class and gym. `mineId` reads "You" (its name may be hidden from
 * others).
 */
export function reviewLines(client: ClientReviewLike[], classReviews: ProfileReview[], mineId?: string | null): ReviewLine[] {
  const a: ReviewLine[] = client
    .filter((r) => !r.redactedAt)
    .map((r) => ({ id: `c:${r.id}`, who: r.id === mineId ? t("You") : r.reviewerName?.trim() || t("A client"), when: dayText(r.createdAt), context: null, text: r.body?.trim() || null, rating: r.rating, at: r.createdAt }));
  const b: ReviewLine[] = classReviews.map((r) => ({
    id: `k:${r.id}`,
    who: r.reviewerName.trim() || t("A client"),
    when: dayText(r.createdAt),
    context: reviewContext(r),
    text: r.text?.trim() || null,
    rating: r.rating,
    at: r.createdAt ?? "",
  }));
  return [...a, ...b].sort((x, y) => y.at.localeCompare(x.at));
}

/** "New": the summary's figure under three reviews (an English key; the tab shows it through t()). */
export const NEW = tk("New");

/** The summary's big figure: the average once three reviews count, else "New". */
export function summaryFigure(average: number | null, count: number): string {
  const r = ratingLabel(average, count);
  return r.kind === "average" ? r.value : NEW;
}

/** "38 reviews from class clients" (class reviews only), else "12 reviews". */
export function summaryLine(count: number, classOnly: boolean): string {
  return classOnly ? t("{reviews} from class clients", { reviews: reviewCountLabel(count) }) : reviewCountLabel(count);
}

/** The average of a set of 1–5 ratings, or null. */
export function averageOf(ratings: number[]): number | null {
  const ok = ratings.filter((r) => r >= 1 && r <= 5);
  return ok.length ? Math.round((ok.reduce((a, b) => a + b, 0) / ok.length) * 10) / 10 : null;
}

// ---------------------------------------------------------------- booking

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A time chip: "7:00 AM" (the day is the chip row above it). */
export const timeChip = (startsAt: string): string => clock12(startsAt);

/** A day chip: "Mon 19". */
export function dayChip(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (getLanguage() !== "en") return date.toLocaleDateString(appLocale(), { weekday: "short", day: "numeric" });
  return `${WEEKDAY[date.getDay()]} ${d}`;
}

/** The ticket's and the confirmation's time: "Mon, Oct 19 · 7:00 AM" (D-02 / D-03). */
export function sessionWhen(startsAt: string, joiner = " · "): string {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return "";
  if (getLanguage() !== "en") return `${d.toLocaleDateString(appLocale(), { weekday: "short", month: "short", day: "numeric" })}${joiner}${clock12(d)}`;
  return `${WEEKDAY[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}${joiner}${clock12(d)}`;
}

/** "Oct 19 to Oct 25", the week the Time box shows. */
export function weekTitle(days: Date[]): string {
  const a = days[0];
  const b = days[days.length - 1];
  if (getLanguage() !== "en") {
    const md = (x: Date) => x.toLocaleDateString(appLocale(), { month: "short", day: "numeric" });
    return t("{from} to {to}", { from: md(a), to: md(b) });
  }
  return `${MONTH[a.getMonth()]} ${a.getDate()} to ${MONTH[b.getMonth()]} ${b.getDate()}`;
}

import { t, tn, tx } from "../../i18n/core";

// Market + Share 3.0 · people shown on market cards (ProfessionalCard,
// InstructorCard): pure rules from Client Professional Screens' script
// (`dir`, `pr`) and Client Explore Screens (the instructor card).

/** A stable step (1–4) for a person, so their avatar keeps one colour everywhere. */
export function identityStep(id: string): 1 | 2 | 3 | 4 {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 4) + 1) as 1 | 2 | 3 | 4;
}

/** Initials from a display name ("Rana Khoury" → "RK"). */
export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** "Hired via Centium · N roles" / "No Centium work yet". */
export const hiredText = (roles: number): string => (roles > 0 ? tn(roles, "Hired via Centium · {n} role", "Hired via Centium · {n} roles") : t("No Centium work yet"));

/** The rating line: "4.8 · 38 reviews · 1.2 km", "New · 4.0 km". */
export function ratingLine(rating: number | null | undefined, reviews: number, extra?: string | null): string {
  const parts = [rating != null && reviews > 0 ? tn(reviews, "{rating} · {n} review", "{rating} · {n} reviews", { rating: rating.toFixed(1) }) : t("New")];
  if (extra) parts.push(extra);
  return parts.join(" · ");
}

/** The handover's ProfessionalCard / DirectoryResult (types.ts), with no contact field (D-27). */
export interface ProfessionalCardData {
  id: string;
  name: string;
  photoUrl: string | null;
  specialty: string;
  rating: number | null;
  reviewCount: number;
  /** Centium roles (hires) to date; 0 is "No Centium work yet". */
  hiredViaCentiumCount: number;
  /** Device-side distance; shown as "1.2 km" in place of the area. */
  distanceKm?: number | null;
  /** The area ("Hamra, Beirut") when there is no distance. */
  area?: string | null;
  /** "From $15", formatted by the caller; omitted when they list no priced service. */
  fromPrice?: string | null;
  /** Release B: works online (online or both). With no distance measured, "Online" takes the place (PLAN S1). */
  online?: boolean;
  /** Release B: their country's name, only when it isn't the searcher's and "Include other countries" is on. */
  abroad?: string | null;
}

/**
 * The card's place: the distance, else "Online" (PLAN S1: "4.8 · 38 reviews ·
 * Online") for one who works online, else the area; then the country when the
 * professional is in another one. "about 1.2 km" (Karim, DJ, 2026-10-27; the
 * board's "1.2 km"): the distance is to a ~1 km area, so it never claims more
 * than that.
 */
export function placeOf(p: Pick<ProfessionalCardData, "distanceKm" | "area" | "online" | "abroad">): string | null {
  const place = p.distanceKm != null && Number.isFinite(p.distanceKm) ? t("about {km} km", { km: p.distanceKm.toFixed(1) }) : p.online ? tx("Online", "session format") : (p.area ?? null);
  return [place, p.abroad].filter(Boolean).join(" · ") || null;
}

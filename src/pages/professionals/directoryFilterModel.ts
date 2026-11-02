// DJ (Karim, 2026-10-27): the Professionals list's Distance filter and sort,
// worked out ON THE DEVICE (services/geo/distance.ts). The server gets only a
// radius bucket and a point rounded to one decimal place (about 11 km), so a
// 5 km choice is meaningful only when it is also applied here, to the
// distance from each professional's approximate area (two decimals, ~1 km).
// Not drawn for professionals: the groups and options follow the Explore
// classes filter (classFilterModel) and pro Openings ("Within 5 km").
//
// Release B (Database 20261217010000 / 020000; PLAN S1): a "Where" group
// ("In person" / "Online", on work_mode, both-modes counting for both) and a
// one-row "Country" group, "Include other countries" (p_any_country; not
// drawn, kept modest). The Distance options apply to in-person results (the
// ones the device can measure); online results are kept when "Online" is
// chosen or nothing in Where is.

import { tk } from "../../i18n/core";
import { appLocale } from "../../i18n/format";
import { distanceKm, type Coords } from "../../services/geo/distance";
import { worksInPerson, worksOnline, type Reach } from "../../services/pro-profile/model";

// The options are English values (matched below); FilterPopup shows them through t().
export const DISTANCE_OPTIONS = [tk("Within 5 km"), tk("Within 10 km"), tk("Within 25 km"), tk("Within 50 km")] as const;
export const WHERE_OPTIONS = [tk("In person"), tk("Online")] as const;
export const ANY_COUNTRY_OPTION = tk("Include other countries");
export const COUNTRY_OPTIONS = [ANY_COUNTRY_OPTION] as const;

export const SORTS = [tk("Best match"), tk("Nearest")] as const;
export type DirectorySort = (typeof SORTS)[number];

/** professionals_ranked's p_sort: Nearest pages in distance order on the server. */
export const serverSort = (sort: DirectorySort): "weighted" | "distance" => (sort === "Nearest" ? "distance" : "weighted");

/** The server's default radius for the ranked list when no distance is chosen. */
export const DEFAULT_RADIUS_KM = 50;

const kmOf = (option: string): number | null => {
  const m = /^Within (\d+) km$/.exec(option);
  return m ? Number(m[1]) : null;
};

/**
 * The radius the chosen Distance options allow: the widest one checked (the
 * rows are checkboxes, as in every FilterPopup group), or null for none.
 */
export function chosenRadiusKm(selected: readonly string[]): number | null {
  const kms = selected.map(kmOf).filter((k): k is number => k != null);
  return kms.length ? Math.max(...kms) : null;
}

export interface WhereChoice {
  inPerson: boolean;
  online: boolean;
}

/** The Where rows checked. Neither (or both) means everyone. */
export const chosenWhere = (selected: readonly string[]): WhereChoice => ({ inPerson: selected.includes("In person"), online: selected.includes("Online") });

/** "Include other countries" is checked (p_any_country). */
export const anyCountryChosen = (selected: readonly string[]): boolean => selected.includes(ANY_COUNTRY_OPTION);

type Mode = Pick<Reach, "workMode" | "isOnlineOnly">;

/** Kept by the Where choice: on work_mode, both-modes for both, unset as in person (the server's rule). */
export function keptByWhere(h: Mode, where: WhereChoice): boolean {
  if (where.inPerson === where.online) return true;
  return where.inPerson ? worksInPerson(h) : worksOnline(h);
}

export interface Placed {
  approxLat: number | null;
  approxLng: number | null;
}

/** The distance from the point to a professional's approximate area, or null when either is unknown. */
export function deviceDistance(point: Coords | null, p: Placed): number | null {
  if (!point || p.approxLat == null || p.approxLng == null) return null;
  const d = distanceKm(point, { lat: p.approxLat, lng: p.approxLng });
  return Number.isFinite(d) ? d : null;
}

/**
 * The list as shown, from the rows the server sent:
 * - Where first (keptByWhere);
 * - the Distance choice cuts the measured (in-person) results only; the
 *   unmeasured stay (online ones, and no-area ones who can't be measured)
 *   and go after the measured;
 * - Best match keeps the server's order; Nearest sorts the measured ones by
 *   distance, then the no-area ones, then the online-only ones (PLAN S1).
 * Stable, so ties keep the server's order. A row without Release B's columns
 * counts as unset (in person).
 */
export function arrangeDirectory<T extends { distanceKm?: number | null; workMode?: Reach["workMode"]; isOnlineOnly?: boolean }>(
  hits: readonly T[],
  maxKm: number | null,
  sort: DirectorySort,
  where: WhereChoice = { inPerson: false, online: false },
): T[] {
  const kept = hits.filter((h) => {
    const mode: Mode = { workMode: h.workMode ?? null, isOnlineOnly: !!h.isOnlineOnly };
    // A both-modes professional out of reach comes back as an online result
    // (no point, card "Online"), so "In person" alone leaves it out.
    if (where.inPerson && !where.online && h.distanceKm == null && worksOnline(mode)) return false;
    return keptByWhere(mode, where);
  });
  const measured = kept.filter((h) => h.distanceKm != null);
  const unmeasured = kept.filter((h) => h.distanceKm == null);
  const inRange = maxKm == null ? measured : measured.filter((h) => (h.distanceKm as number) <= maxKm);
  if (sort === "Nearest") {
    const near = [...inRange].sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number));
    return [...near, ...unmeasured.filter((h) => !h.isOnlineOnly), ...unmeasured.filter((h) => h.isOnlineOnly)];
  }
  if (maxKm != null) return [...inRange, ...unmeasured];
  // Best match with no distance chosen: exactly the server's order.
  return kept;
}

/**
 * The country on a card (Release B): only with "Include other countries" on,
 * and only for a professional whose saved country differs from the
 * searcher's. The country's name in the app's language, else its code.
 */
export function abroadLabel(rowCountry: string | null | undefined, searcherCountry: string | null, anyCountry: boolean): string | null {
  if (!anyCountry || !rowCountry || !searcherCountry) return null;
  const cc = rowCountry.toUpperCase();
  if (cc === searcherCountry.toUpperCase()) return null;
  try {
    return new Intl.DisplayNames([appLocale("en") ?? "en"], { type: "region" }).of(cc) ?? cc;
  } catch {
    return cc;
  }
}

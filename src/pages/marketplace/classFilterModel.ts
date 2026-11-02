// Market + Share 3.0 · W2 · the class filter's groups and rules, pure
// (C-MO.4.3 `classFilterOpen` / `classFiltered`; Client Explore Screens script
// `FG`, `matches`). The board's groups are Type, Time, Gym and Distance; D-20
// adds Price, the live price ceiling (Any / Free / Under $15 / Under $30).
// Options come from the classes actually listed (the board's lists are its
// sample data); Distance only shows once the device has shared a position.

import type { FilterGroupDef } from "../../components/market/filterModel";
import { tk, tn } from "../../i18n/core";

export interface FilterableClass {
  classType: string | null;
  startTime: string;
  businessName: string;
  venueName?: string | null;
  priceValue: number | null;
  /** km from the device, when known. */
  km?: number | null;
}

// The choices are English values (matched below); FilterPopup shows them through t().
export const TIME_OPTIONS = [tk("Morning"), tk("Afternoon"), tk("Evening")] as const;
export const DISTANCE_OPTIONS = [tk("Under 1 km"), tk("Under 3 km"), tk("Under 5 km")] as const;
export const PRICE_OPTIONS = [tk("Free"), tk("Under $15"), tk("Under $30")] as const;

const hourOf = (hhmm: string): number => Number(hhmm.slice(0, 2)) || 0;
export const placeOf = (c: FilterableClass): string => c.venueName || c.businessName;

/** The `FG` time rule: morning before 12, afternoon 12 to 17, evening from 17. */
export function timeMatches(hhmm: string, option: string): boolean {
  const h = hourOf(hhmm);
  return option === "Morning" ? h < 12 : option === "Afternoon" ? h >= 12 && h < 17 : h >= 17;
}

/** D-20 price, the live rule: "Free" keeps free classes, "Under $15" is strictly less. */
export function priceMatches(price: number | null, option: string): boolean {
  const p = price ?? 0;
  if (option === "Free") return p === 0;
  const ceiling = Number(option.replace(/[^0-9.]/g, ""));
  return p < ceiling;
}

export function classFilterGroups<T extends FilterableClass>(classes: readonly T[], hasPosition: boolean): FilterGroupDef<T>[] {
  const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x && x.trim() !== ""))].sort((a, b) => a.localeCompare(b));
  const types = uniq(classes.map((c) => c.classType));
  const places = uniq(classes.map(placeOf));
  const groups: FilterGroupDef<T>[] = [];
  if (types.length) groups.push({ heading: tk("Type"), options: types, test: (c, v) => c.classType === v });
  groups.push({ heading: tk("Time"), options: TIME_OPTIONS, test: (c, v) => timeMatches(c.startTime, v) });
  if (places.length > 1) groups.push({ heading: tk("Gym"), options: places, test: (c, v) => placeOf(c) === v });
  if (hasPosition) groups.push(distanceGroup<T>());
  groups.push({ heading: tk("Price"), options: PRICE_OPTIONS, test: (c, v) => priceMatches(c.priceValue, v) });
  return groups;
}

/** The Distance group ("Under 1 km / 3 km / 5 km"): a choice keeps what is strictly nearer; no distance never matches. */
export function distanceGroup<T extends { km?: number | null }>(): FilterGroupDef<T> {
  return { heading: tk("Distance"), options: DISTANCE_OPTIONS, test: (c, v) => c.km != null && c.km < parseFloat(v.replace("Under ", "")) };
}

/**
 * Release B · Explore Gyms' filter: the classes filter's Distance group, the
 * only one (no frame draws a gyms filter; it matches the classes one). Only
 * with a known position, so no group at all without one and the trigger hides.
 */
export function gymFilterGroups<T extends { km?: number | null }>(hasPosition: boolean): FilterGroupDef<T>[] {
  return hasPosition ? [distanceGroup<T>()] : [];
}

/** "Friday, October 16 · 5 classes" (D-02 month first). */
export function classCountLine(dayLabel: string, n: number): string {
  return tn(n, "{day} · {n} class", "{day} · {n} classes", { day: dayLabel });
}

/** The day strip: from today for at least 14 days, out to the last listed class (at most 60). */
export function stripDays(today: Date, classDates: readonly string[]): string[] {
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const last = classDates.reduce((a, b) => (b > a ? b : a), key(today));
  const out: string[] = [];
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (out.length < 60 && (out.length < 14 || key(d) <= last)) {
    out.push(key(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// The Sources page's grouping, kept free of the network so it can be tested.
//
// THE SAME FULL LIST FOR EVERYONE. Nothing here, or on the page, may filter
// or hide a source by who is signed in, their settings or any mode: a list
// that changed with the reader would itself say something about them.

import { tk } from "../../i18n/core";

export type ClinicalSource = {
  key: string;
  feature: string;
  organisation: string;
  title: string;
  url: string;
  sortOrder: number;
  /** The publication year; null when the table has none (never a review date). */
  year: number | null;
};

export type SourceGroup = { feature: string; heading: string; sources: ClinicalSource[] };

/**
 * The groups, in the page's order, with their headings (catalogue keys: the
 * page shows t(heading)). "monitoring" is headed "Health checks": no heading
 * names the mode it belongs to.
 */
export const SOURCE_GROUPS: readonly { feature: string; heading: string }[] = [
  { feature: "blood_pressure", heading: tk("Blood pressure") },
  { feature: "screening", heading: tk("Health screening") },
  { feature: "labs", heading: tk("Lab results") },
  { feature: "monitoring", heading: tk("Health checks") },
  { feature: "cycle", heading: tk("Cycle") },
  { feature: "contraception", heading: tk("Contraception") },
  { feature: "pregnancy", heading: tk("Pregnancy") },
  { feature: "exercise", heading: tk("Exercise") },
];

/**
 * Sources grouped in SOURCE_GROUPS order, each group by sort_order. A feature
 * the list does not know yet still shows, last, under "Other sources", so a
 * new row is never silently left off the page.
 */
export function groupSources(sources: ClinicalSource[]): SourceGroup[] {
  const known = new Set(SOURCE_GROUPS.map((g) => g.feature));
  const byOrder = (a: ClinicalSource, b: ClinicalSource) => a.sortOrder - b.sortOrder;
  const groups: SourceGroup[] = SOURCE_GROUPS.map((g) => ({
    ...g,
    sources: sources.filter((s) => s.feature === g.feature).sort(byOrder),
  }));
  const other = sources.filter((s) => !known.has(s.feature)).sort(byOrder);
  if (other.length) groups.push({ feature: "other", heading: tk("Other sources"), sources: other });
  return groups.filter((g) => g.sources.length > 0);
}

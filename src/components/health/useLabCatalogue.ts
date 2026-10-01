import { useEffect, useState } from "react";
import { fetchLabCatalogue } from "../../services/labs/catalogue";
import { isThresholdMarker, type CatalogueMarker } from "../../services/labs/catalogueLogic";
import type { BloodMarker } from "../../types";

/**
 * The standard marker list (read once per page load and cached), and what it
 * says about one of the user's results: the remark to show under it, and
 * whether it is one of the nine threshold markers (no range, no flag).
 * Results not linked to the list ("Other") get neither.
 */
export function useLabCatalogue() {
  const [catalogue, setCatalogue] = useState<CatalogueMarker[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchLabCatalogue().then((c) => {
      if (!cancelled) setCatalogue(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const entryFor = (m: BloodMarker) => (m.markerKey && catalogue ? catalogue.find((c) => c.key === m.markerKey) ?? null : null);
  return {
    remarkFor: (m: BloodMarker) => entryFor(m)?.remark ?? null,
    isThreshold: (m: BloodMarker) => {
      const e = entryFor(m);
      return e ? isThresholdMarker(e) : false;
    },
  };
}

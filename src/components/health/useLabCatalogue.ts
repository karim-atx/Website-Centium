import { useEffect, useState } from "react";
import { fetchLabCatalogue } from "../../services/labs/catalogue";
import { isThresholdMarker, type CatalogueMarker } from "../../services/labs/catalogueLogic";

/** Anything that names a result: a BloodMarker, a LabResult, a draft. */
type MarkerLike = { markerKey?: string | null };

/**
 * The standard marker list (read once per page load and cached), and what it
 * says about one of the user's results: the remark to show under it, and
 * whether it is one of the nine threshold markers (no range, no flag).
 * Results not linked to the list ("Other") get neither.
 */
export function useLabCatalogue() {
  const [catalogue, setCatalogue] = useState<CatalogueMarker[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void fetchLabCatalogue().then((c) => {
      if (cancelled) return;
      setCatalogue(c);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const entryFor = (m: MarkerLike) => (m.markerKey && catalogue ? catalogue.find((c) => c.key === m.markerKey) ?? null : null);
  return {
    catalogue,
    /** True once the read finished (catalogue may still be null if it failed). */
    loaded,
    entryFor,
    remarkFor: (m: MarkerLike) => entryFor(m)?.remark ?? null,
    isThreshold: (m: MarkerLike) => {
      const e = entryFor(m);
      return e ? isThresholdMarker(e) : false;
    },
  };
}

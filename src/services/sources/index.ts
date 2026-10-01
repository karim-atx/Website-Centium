import { supabase } from "../../../lib/supabase/client";

// The guidelines and articles the app's health content rests on
// (clinical_sources, Database 20261013030000 and 0b67003): publicly readable,
// one row per source, each with a link that was opened when it was added,
// the feature it informs and, where known, the year it was published.
// Grouping lives in ./groups.

import type { ClinicalSource } from "./groups";

export { groupSources, SOURCE_GROUPS, type ClinicalSource, type SourceGroup } from "./groups";

export async function fetchClinicalSources(): Promise<{ ok: true; sources: ClinicalSource[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("clinical_sources")
    .select("key, feature, organisation, title, url, sort_order, published_year")
    .order("sort_order");
  if (error) return { ok: false };
  return {
    ok: true,
    sources: (data ?? []).map((s) => ({
      key: s.key,
      feature: s.feature,
      organisation: s.organisation,
      title: s.title,
      url: s.url,
      sortOrder: s.sort_order,
      year: s.published_year,
    })),
  };
}

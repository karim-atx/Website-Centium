import { supabase } from "../../../lib/supabase/client";

// The guidelines and articles the app's health content rests on
// (clinical_sources, Database 20261013030000): publicly readable, one row
// per source, each with a link that was opened when it was added.

export type ClinicalSource = {
  key: string;
  organisation: string;
  title: string;
  url: string;
  /** The publication year, where the citation states one. */
  year: number | null;
};

/** The first four-digit year in a citation ("... 2018 Dec;143(3) ..."), or null. */
export function yearFromCitation(citation: string | null): number | null {
  const m = citation?.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

export async function fetchClinicalSources(): Promise<{ ok: true; sources: ClinicalSource[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("clinical_sources")
    .select("key, organisation, title, url, citation")
    .order("sort_order");
  if (error) return { ok: false };
  return {
    ok: true,
    sources: (data ?? []).map((s) => ({
      key: s.key,
      organisation: s.organisation,
      title: s.title,
      url: s.url,
      year: yearFromCitation(s.citation),
    })),
  };
}

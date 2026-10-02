import { supabase } from "../../../lib/supabase/client";
import { LAB_PHASES, type CatalogueMarker, type LabPhase, type MarkerSex } from "./catalogueLogic";

// The standard lab marker list (Database 20261011000000): four publicly
// readable tables, read once per page load and cached. No client writes.

let cached: Promise<CatalogueMarker[] | null> | null = null;

async function load(): Promise<CatalogueMarker[] | null> {
  const [markers, aliases, units, ranges] = await Promise.all([
    supabase
      .from("lab_markers")
      .select("key, display_name, category, canonical_unit, reviewed, sort_order, notes, remark")
      .order("sort_order"),
    supabase.from("lab_marker_aliases").select("alias, marker_key"),
    supabase.from("lab_marker_units").select("marker_key, unit, to_canonical_factor, to_canonical_offset"),
    supabase.from("lab_marker_ranges").select("marker_key, applies_to_sex, phase, ref_low, ref_high"),
  ]);
  if (markers.error || aliases.error || units.error || ranges.error || !markers.data) return null;
  return markers.data.map((m) => ({
    key: m.key,
    displayName: m.display_name,
    category: m.category,
    canonicalUnit: m.canonical_unit,
    reviewed: m.reviewed,
    notes: m.notes,
    remark: m.remark,
    aliases: (aliases.data ?? []).filter((a) => a.marker_key === m.key).map((a) => a.alias.trim().toLowerCase()),
    // The canonical unit is implied by the list (factor 1, offset 0), so it
    // leads; the table holds the alternatives.
    units: [
      { unit: m.canonical_unit, factor: 1, offset: 0 },
      ...(units.data ?? [])
        .filter((u) => u.marker_key === m.key && u.unit !== m.canonical_unit)
        .map((u) => ({ unit: u.unit, factor: Number(u.to_canonical_factor), offset: Number(u.to_canonical_offset) })),
    ],
    ranges: (ranges.data ?? [])
      .filter((r) => r.marker_key === m.key)
      .map((r) => ({
        sex: (r.applies_to_sex === "male" || r.applies_to_sex === "female" ? r.applies_to_sex : null) as MarkerSex | null,
        phase: (LAB_PHASES.some((p) => p.value === r.phase) ? r.phase : null) as LabPhase | null,
        low: r.ref_low === null ? null : Number(r.ref_low),
        high: r.ref_high === null ? null : Number(r.ref_high),
      })),
  }));
}

/** The list, or null if it could not be read (entry then falls back to "Other"). */
export function fetchLabCatalogue(): Promise<CatalogueMarker[] | null> {
  if (!cached) {
    cached = load().then((r) => {
      if (r === null) cached = null; // a failed read is retried next time
      return r;
    });
  }
  return cached;
}

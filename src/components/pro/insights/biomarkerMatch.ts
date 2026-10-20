// Release 3 · W9 biomarker matching (HANDOVER_API "Programmes, swaps and
// allergens": "Shared results: select marker_key from blood_markers and
// match the catalogue by key").
//
// - The catalogue (lab_markers) is matched by blood_markers.marker_key only;
//   a result without a key has no catalogue entry (no name or alias match).
// - A marker's identity is its key, else its lower-cased name: the same
//   partition client_biomarker_flags uses (coalesce(marker_key,
//   lower(name))), so a flag row is found by that identity and a keyed
//   marker never picks up another marker's flag through a shared name.

export const markerIdentity = (markerKey: string | null | undefined, name: string): string => (markerKey ? `key:${markerKey}` : `name:${name.trim().toLowerCase()}`);

export function catalogueByKey<T extends { key: string }>(catalogue: T[] | null | undefined, markerKey: string | null | undefined): T | null {
  if (!catalogue || !markerKey) return null;
  return catalogue.find((c) => c.key === markerKey) ?? null;
}

export function flagFor<F extends { markerKey: string | null; name: string }>(flags: F[], markerKey: string | null | undefined, name: string): F | null {
  const id = markerIdentity(markerKey, name);
  return flags.find((f) => markerIdentity(f.markerKey, f.name) === id) ?? null;
}

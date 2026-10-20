// Release 3 · Professional UI, DB-1 readers (Database HANDOVER_API.md
// "Release 3 · Professional UI backend", DB-1 · Types, handles, access).
//
// - my_professional_subtype(): the signed-in professional's lane, derived in
//   the database from profiles.professional_subtype (subtype_for_type). Null
//   for any account that isn't a professional.
// - professional_client_access(p_client_id): every switch one client has on
//   for the caller, plus the imaging and single-result share counts. Only for
//   a connected (not disconnected) client; another client returns no row.

import { supabase } from "../../../lib/supabase/client";
import type { Enums } from "../../../lib/supabase/database.types";
import { isOffline } from "../network-error";
import { isProLane, type ProLane } from "../../components/pro/subtypeLanes";

export type AccessCategory = Enums<"access_category">;

export type ReadResult<T> = { ok: true; data: T } | { ok: false; offline: boolean };

export async function fetchMyLane(): Promise<ReadResult<ProLane | null>> {
  const { data, error } = await supabase.rpc("my_professional_subtype");
  if (error) return { ok: false, offline: isOffline(error) };
  return { ok: true, data: isProLane(data) ? data : null };
}

export interface ClientAccess {
  clientId: string;
  /** The switches that are on, as the access_category enum. */
  categories: AccessCategory[];
  /** imaging_shares rows for this professional (imaging stays per record, decision 6). */
  imagingSharedCount: number;
  /** result_shares rows: single lab results shared without the Lab results switch (Karim's answer 3). */
  resultSharedCount: number;
}

/** One client's access, or null when they aren't (or are no longer) this professional's client. */
export async function fetchClientAccess(clientId: string): Promise<ReadResult<ClientAccess | null>> {
  const { data, error } = await supabase.rpc("professional_client_access", { p_client_id: clientId });
  if (error) return { ok: false, offline: isOffline(error) };
  const row = (data ?? [])[0];
  if (!row) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      clientId: row.client_id,
      categories: row.categories ?? [],
      imagingSharedCount: row.imaging_shared_count ?? 0,
      resultSharedCount: row.result_shared_count ?? 0,
    },
  };
}

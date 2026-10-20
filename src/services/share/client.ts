// Release 3 · W8 the client's extra readers for CU29 / CU30 (DB-8; select
// policies only, no writes):
// - professionals' first names and photos from public_profile_summary (the
//   source the Home reminders already use), with related_profile_summary
//   first for a professional the client is connected to;
// - share_requests (select party) by id, for how each shared card shows the
//   client (answer_share_request sets visibility 'none' for Allow without my
//   name).

import { supabase } from "../../../lib/supabase/client";
import type { Visibility } from "../../components/share/shareCardModel";

const from = (table: string) => supabase.from(table as never);

export interface ProSummary {
  firstName: string;
  avatarUrl: string | null;
}

type NameRow = { id: string; first_name: string | null; avatar_url: string | null };

/** First names and photos by id. Best effort: a failed read leaves the id out. */
export async function fetchProSummaries(ids: string[]): Promise<Map<string, ProSummary>> {
  const out = new Map<string, ProSummary>();
  const want = [...new Set(ids.filter(Boolean))];
  if (!want.length) return out;
  const put = (rows: NameRow[]) => {
    for (const r of rows) if (r.first_name?.trim() && !out.has(r.id)) out.set(r.id, { firstName: r.first_name.trim(), avatarUrl: r.avatar_url });
  };
  const related = await from("related_profile_summary").select("id, first_name, avatar_url").in("id", want);
  if (!related.error) put((related.data ?? []) as unknown as NameRow[]);
  const missing = want.filter((id) => !out.has(id));
  if (missing.length) {
    const pub = await from("public_profile_summary").select("id, first_name, avatar_url").in("id", missing);
    if (!pub.error) put((pub.data ?? []) as unknown as NameRow[]);
  }
  return out;
}

/** share_requests.visibility by request id (the client is a party). Best effort. */
export async function fetchRequestVisibilities(ids: string[]): Promise<Map<string, Visibility>> {
  const out = new Map<string, Visibility>();
  const want = [...new Set(ids.filter(Boolean))];
  if (!want.length) return out;
  const { data, error } = await from("share_requests").select("id, visibility").in("id", want);
  if (error) return out;
  for (const r of (data ?? []) as unknown as { id: string; visibility: Visibility }[]) out.set(r.id, r.visibility);
  return out;
}

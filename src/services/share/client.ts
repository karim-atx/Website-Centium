// Release 3 · W8 the client's extra readers for CU29 / CU30 (DB-8; select
// policies only, no writes):
// - professionals' first names and photos from public_profile_summary (the
//   source the Home reminders already use), with related_profile_summary
//   first for a professional the client is connected to;
// - professional_handle(p_professional_id) for the CU29 preview (815efc5);
// - share_requests (select party) by id, for how each shared card shows the
//   client (answer_share_request sets visibility 'none' for Allow without my
//   name).

import { supabase } from "../../../lib/supabase/client";
import type { Visibility } from "../../components/share/shareCardModel";
import { rpc } from "../pro/rpc";

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

/**
 * Release 3 · 815efc5 (W8-1): each professional's public handle by id, through
 * professional_handle(p_professional_id) → text (migration 20261124190000;
 * public_handles has no policy, so this definer function is the only reader).
 * The CU29 preview needs it to show where the win would appear: the handle
 * line, the link and the QR, as on the real card. Best effort: a null result
 * or a failed read leaves the id out, and the card then has no handle line,
 * link or QR (as before).
 */
export async function fetchProfessionalHandles(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const want = [...new Set(ids.filter(Boolean))];
  await Promise.all(
    want.map(async (id) => {
      const { data, error } = await rpc("professional_handle", { p_professional_id: id });
      if (!error && typeof data === "string" && data.trim()) out.set(id, data.trim());
    }),
  );
  return out;
}

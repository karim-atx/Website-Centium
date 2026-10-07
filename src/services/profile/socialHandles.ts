import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import {
  describeHandleSaveError,
  legacyHandlesToMove,
  storedHandle,
  type SocialHandles,
  type SocialKind,
} from "./socialHandleRules";

// Reads and writes for the member's Instagram and X (Stage A1, HANDOVER_API
// "Member Instagram and X").
//
// PRIVATE BY CONSTRUCTION, and nothing here may change that. profiles has one
// SELECT policy, profiles_select_own, so these columns are readable by their
// owner and, through client_social_handles(), by that member's connected adult
// professionals. They are NOT professional_profiles.instagram / .x, which are
// a professional's public advertising.
//
// The generated types come from production, where Stage A1 isn't yet, so the
// two columns and the function go through the narrow casts below.

type Row = { instagram: string | null; x: string | null };
type DbError = { code?: string; message: string };

// ONE NARROW CAST per call shape: the profiles table and rpc typed loosely
// enough to name instagram, x and client_social_handles.
const profilesTable = () =>
  supabase.from("profiles") as unknown as {
    select: (cols: string) => {
      eq: (col: string, v: string) => { maybeSingle: () => PromiseLike<{ data: Row | null; error: DbError | null }> };
    };
    update: (patch: Row) => { eq: (col: string, v: string) => PromiseLike<{ error: DbError | null }> };
  };

/** The signed-in member's own handles, or null when the read failed. */
export async function fetchMySocialHandles(userId: string): Promise<SocialHandles | null> {
  const { data, error } = await profilesTable().select("instagram, x").eq("id", userId).maybeSingle();
  if (error) {
    console.error("[profile] Could not read the social handles:", error.code ?? error.message);
    return null;
  }
  return { instagram: data?.instagram ?? null, x: data?.x ?? null };
}

export type SaveHandlesResult = { ok: true; value: SocialHandles } | { ok: false; field: SocialKind | null; message: string };

/** Saves both handles (bare; empty clears). The caller validates first with handleProblem(). */
export async function saveMySocialHandles(
  userId: string,
  handles: { instagram: string; x: string }
): Promise<SaveHandlesResult> {
  const value = { instagram: storedHandle(handles.instagram), x: storedHandle(handles.x) };
  const { error } = await profilesTable().update(value).eq("id", userId);
  if (error) {
    console.error("[profile] Could not save the social handles:", error.code ?? "");
    if (isOffline(error)) return { ok: false, field: null, message: OFFLINE_MESSAGE };
    return { ok: false, ...describeHandleSaveError(error.code, error.message) };
  }
  return { ok: true, value };
}

/**
 * Moves handles that were kept only on this device (the old local stand-in,
 * user.instagramHandle / user.xHandle) up to the account, once.
 *
 * Returns true when the device copy can be dropped: the account already had
 * handles (it wins), there was nothing valid to move, or the move succeeded.
 * False on a failed read or write, so the next sign-in tries again.
 */
export async function migrateLocalSocialHandles(
  userId: string,
  local: { instagramHandle?: string | null; xHandle?: string | null }
): Promise<boolean> {
  if (!local.instagramHandle && !local.xHandle) return false;
  const server = await fetchMySocialHandles(userId);
  if (!server) return false;
  const move = legacyHandlesToMove(server, local);
  if (!move) return true;
  const r = await saveMySocialHandles(userId, { instagram: move.instagram ?? "", x: move.x ?? "" });
  return r.ok;
}

/**
 * A professional reads one of THEIR OWN client's handles
 * (client_social_handles). Null whenever nothing should be shown:
 *
 * - ATX96, not one of your clients (including a disconnected one);
 * - ATX97, the client is under 18, refused whatever the relationship;
 * - any other failure.
 *
 * Every refusal shows NOTHING, never an empty "not set" field: the function
 * raises rather than returning nulls precisely so a minor's handles can't
 * read as merely blank. A returned row with both handles null is also
 * nothing to show.
 */
export async function fetchClientSocialHandles(clientId: string): Promise<SocialHandles | null> {
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: DbError | null }>;
  const { data, error } = await rpc("client_social_handles", { p_client_id: clientId });
  if (error) {
    // The code only; ATX96 / ATX97 are expected outcomes, not faults.
    if (error.code !== "ATX96" && error.code !== "ATX97") {
      console.warn("[profile] Could not read a client's handles:", error.code ?? "network");
    }
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as Partial<Row> | null | undefined;
  const instagram = row?.instagram || null;
  const x = row?.x || null;
  return instagram || x ? { instagram, x } : null;
}

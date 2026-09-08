import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Enums } from "../../../lib/supabase/database.types";

// Client-owned consent: which categories of their data a client has granted
// each professional they're connected to.
//
// Ownership is asymmetric and that asymmetry is the point. Under RLS the
// CLIENT is the only party who may INSERT or UPDATE these rows; the
// professional gets SELECT on rows naming them and can never write. Nothing
// in this module is callable from the professional side — the roster's read
// lives in services/roster.
//
// `granted_at` / `revoked_at` are maintained by a database trigger. This
// module writes the `granted` boolean and nothing else, deliberately: a
// client-supplied consent timestamp would be worthless as an audit record.

export type AccessCategory = Enums<"access_category">;

/**
 * The five categories, in display order.
 *
 * These snake_case values ARE the contract now. Two other spellings used to
 * exist — the professional side's camelCase (`foodDiary`) and the client
 * screen's display-label keys (`"Food diary"`) — and because neither matched
 * the other, toggling a switch on one side was invisible to the other. One
 * vocabulary, taken from the database enum.
 */
export const ACCESS_CATEGORIES: { category: AccessCategory; label: string; description: string }[] = [
  { category: "food_diary", label: "Food diary", description: "Meals and nutrition you log" },
  { category: "workout_activity", label: "Workout activity", description: "Sessions, exercises and sets" },
  { category: "weight", label: "Weight", description: "Your weight entries over time" },
  { category: "progress", label: "Progress", description: "Streaks, goals and trends" },
  { category: "health_metrics", label: "Health metrics", description: "Steps, sleep, heart rate and biomarkers" },
];

/** Maps the DB enum onto the key shape the professional-side UI reads. */
export const accessKeyFor: Record<AccessCategory, "foodDiary" | "workoutActivity" | "weight" | "progress" | "healthMetrics"> = {
  food_diary: "foodDiary",
  workout_activity: "workoutActivity",
  weight: "weight",
  progress: "progress",
  health_metrics: "healthMetrics",
};

export interface LinkedProfessional {
  /** professional_clients.id — the relationship. */
  relationshipId: string;
  professionalId: string;
  name: string;
  avatarUrl: string | null;
  joinedAt: string;
}

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  const message = error.message ?? "";
  if (code === "23505") return "That consent setting was already being updated. Try again.";
  // Genuinely an auth problem — no session, or an expired one.
  if (code === "PGRST301" || /jwt|not authenticated|authentication/i.test(message)) {
    return "You need to be signed in to change data sharing. Sign in and try again.";
  }
  // A permission/RLS refusal is NOT an auth problem, and must not be
  // reported as one. Telling a correctly-signed-in user to sign in again
  // sent a real bug (see setGrant's note on column-scoped UPDATE) chasing
  // the session for far longer than it should have. Surface the database's
  // own words instead.
  if (code === "42501" || /permission denied|row-level security/i.test(message)) {
    return `Data sharing couldn't be saved — the database refused the change. ${message}`;
  }
  return message || "Could not update data sharing. Try again.";
}

export type LinkedProfessionalsResult =
  | { status: "ok"; professionals: LinkedProfessional[] }
  | { status: "error"; message: string };

/**
 * The client's own active relationships, and the real professional UUIDs
 * behind them.
 *
 * This replaces keying consent off the mock professional directory, whose
 * ids ("pr1", "pr2") are not real accounts and could never satisfy the
 * client_access_grants foreign key. RLS scopes the view to the caller, so a
 * client sees only their own relationships.
 */
export async function fetchLinkedProfessionals(): Promise<LinkedProfessionalsResult> {
  try {
    const { data: rels, error } = await supabase
      .from("active_professional_clients")
      .select("id, professional_id, joined_at")
      .order("joined_at", { ascending: false });

    if (error) return { status: "error", message: describe(error) };
    if (!rels?.length) return { status: "ok", professionals: [] };

    const professionalIds = rels.map((r) => r.professional_id).filter((id): id is string => !!id);
    const { data: profiles } = await supabase
      .from("public_profile_summary")
      .select("id, first_name, avatar_url")
      .in("id", professionalIds);

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    return {
      status: "ok",
      professionals: rels
        .filter((r) => !!r.id && !!r.professional_id)
        .map((r) => ({
          relationshipId: r.id!,
          professionalId: r.professional_id!,
          name: byId.get(r.professional_id!)?.first_name?.trim() || "Your professional",
          avatarUrl: byId.get(r.professional_id!)?.avatar_url ?? null,
          joinedAt: r.joined_at ?? "",
        })),
    };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Could not load your professionals.",
    };
  }
}

export type GrantMap = Partial<Record<AccessCategory, boolean>>;

export type GrantsResult =
  | { status: "ok"; grants: Record<string, GrantMap> }
  | { status: "error"; message: string };

/**
 * The client's current grants, keyed by professional id then category.
 *
 * Absent means denied. A category with no row is not granted — there is no
 * default-on, and callers must not invent one. The previous screen defaulted
 * four of the five categories to "on", which told clients they were sharing
 * data they had never consented to share.
 */
export async function fetchMyGrants(clientId: string): Promise<GrantsResult> {
  try {
    const { data, error } = await supabase
      .from("client_access_grants")
      .select("professional_id, category, granted")
      .eq("client_id", clientId);

    if (error) return { status: "error", message: describe(error) };

    const grants: Record<string, GrantMap> = {};
    for (const row of data ?? []) {
      if (!row.professional_id) continue;
      const bucket = grants[row.professional_id] ?? {};
      bucket[row.category] = !!row.granted;
      grants[row.professional_id] = bucket;
    }
    return { status: "ok", grants };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not load your settings." };
  }
}

export type SetGrantResult = { status: "ok" } | { status: "error"; message: string };

/**
 * Grants or revokes one category for one professional.
 *
 * Upsert on the (client_id, professional_id, category) unique constraint —
 * one row per category per relationship, created on first toggle and
 * updated thereafter, rather than a new row each time. Only `granted` is
 * written; `granted_at` and `revoked_at` are the trigger's to set.
 */
export async function setGrant(
  clientId: string,
  professionalId: string,
  category: AccessCategory,
  granted: boolean
): Promise<SetGrantResult> {
  // Update-then-insert rather than a single upsert, deliberately.
  //
  // PostgREST's .upsert() compiles to INSERT ... ON CONFLICT DO UPDATE and
  // sets EVERY column in the payload on the conflict path — so it tries to
  // update client_id, professional_id and category as well as granted.
  // This table grants column-scoped UPDATE (granted) only, which is the
  // right design: a client may flip their own switch and nothing else, and
  // granted_at/revoked_at stay the trigger's. Postgres therefore refused the
  // whole statement with 42501 the moment a row already existed — so the
  // first toggle of a category appeared to work and every later one failed.
  //
  // Postgres' own hint ("GRANT UPDATE ON ... TO authenticated") would have
  // fixed the symptom by letting clients rewrite client_id, professional_id,
  // category and the audit timestamps. Not on consent data.
  const updateGranted = async () => {
    const { data, error } = await supabase
      .from("client_access_grants")
      .update({ granted })
      .eq("client_id", clientId)
      .eq("professional_id", professionalId)
      .eq("category", category)
      .select("id");
    return { data, error };
  };

  try {
    const first = await updateGranted();
    if (first.error) return { status: "error", message: describe(first.error) };
    if ((first.data?.length ?? 0) > 0) return { status: "ok" };

    // No row for this category yet — create it. Inserting all four columns
    // is legitimate; only UPDATE is column-restricted.
    const { error: insertError } = await supabase
      .from("client_access_grants")
      .insert({ client_id: clientId, professional_id: professionalId, category, granted });
    if (!insertError) return { status: "ok" };

    // A concurrent toggle won the race and created the row between our
    // update and our insert. The unique constraint caught it; update the
    // row that now exists.
    if (insertError.code === "23505") {
      const retry = await updateGranted();
      if (retry.error) return { status: "error", message: describe(retry.error) };
      if ((retry.data?.length ?? 0) > 0) return { status: "ok" };
    }
    return { status: "error", message: describe(insertError) };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not save that change." };
  }
}

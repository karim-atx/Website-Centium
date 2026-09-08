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
  if (
    code === "PGRST301" ||
    code === "42501" ||
    /jwt|not authenticated|authentication|permission denied|row-level security/i.test(message)
  ) {
    // Also the honest message if a professional ever reaches this code path:
    // only the client may write their own grants.
    return "You can only change data sharing on your own account. Sign in and try again.";
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
  try {
    const { error } = await supabase.from("client_access_grants").upsert(
      { client_id: clientId, professional_id: professionalId, category, granted },
      { onConflict: "client_id,professional_id,category" }
    );
    if (error) return { status: "error", message: describe(error) };
    return { status: "ok" };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not save that change." };
  }
}

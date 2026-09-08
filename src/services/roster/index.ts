import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Enums } from "../../../lib/supabase/database.types";

// The professional's side of the client relationship: issuing invite codes,
// reading the roster, and ending a relationship.
//
// Deliberately narrow. The roster row that comes back carries the
// relationship itself plus the client's display identity — nothing about
// the client's health, training or nutrition. Those live on the client's own
// tables behind `client_access_grants`, are still mock in this app, and are
// NOT surfaced here; see the README follow-up rather than reintroducing the
// cached-projection fields the mock used to carry.

export interface RosterClient {
  /** professional_clients.id — the relationship, and what disconnect takes. */
  id: string;
  clientId: string;
  name: string;
  avatarUrl: string | null;
  joinedAt: string;
  prefix: string | null;
  pronouns: string | null;
  contactStyle: string | null;
  reminderPreference: string | null;
  communicationBoundaries: string | null;
  assignedProgramId: string | null;
  assignedFoodTemplateId: string | null;
  /** From client_access_grants. All false when the client has granted nothing. */
  access: {
    foodDiary: boolean;
    workoutActivity: boolean;
    weight: boolean;
    progress: boolean;
    healthMetrics: boolean;
    labResults: boolean;
    medicalHistory: boolean;
  };
}

const emptyAccess = (): RosterClient["access"] => ({
  foodDiary: false,
  workoutActivity: false,
  weight: false,
  progress: false,
  healthMetrics: false,
  labResults: false,
  medicalHistory: false,
});

/** access_category enum -> the key the app's UI uses. */
const accessKeyFor: Record<Enums<"access_category">, keyof RosterClient["access"]> = {
  food_diary: "foodDiary",
  workout_activity: "workoutActivity",
  weight: "weight",
  progress: "progress",
  health_metrics: "healthMetrics",
  lab_results: "labResults",
  medical_history: "medicalHistory",
};

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  const message = error.message ?? "";

  // Migration 9 rate-limits code creation to 10/hour.
  if (code === "ATX02" || /ATX02|rate limit/i.test(message)) return message;
  // create_client_code requires account_type = 'professional'.
  if (/not a professional|account_type|professional account/i.test(message)) {
    return "Only professional accounts can generate client codes.";
  }
  if (
    code === "PGRST301" ||
    code === "42501" ||
    /jwt|not authenticated|authentication|permission denied/i.test(message)
  ) {
    return "You need to be signed in as a professional to do this.";
  }
  return message || "Something went wrong. Try again.";
}

export type CreateCodeResult =
  | { status: "ok"; code: string; expiresAt: string }
  | { status: "error"; message: string };

/**
 * Issues a real invite code. This creates NO relationship — the client only
 * appears on the roster once they redeem it.
 */
export async function createClientCode(): Promise<CreateCodeResult> {
  try {
    const { data, error } = await supabase.rpc("create_client_code", {});
    if (error) return { status: "error", message: describe(error) };
    if (!data?.code) return { status: "error", message: "No code came back. Try again." };
    return { status: "ok", code: data.code, expiresAt: data.expires_at };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not generate a code." };
  }
}

export type RosterResult =
  | { status: "ok"; clients: RosterClient[] }
  | { status: "error"; message: string };

/**
 * The professional's active clients.
 *
 * Three reads rather than one: the view carries no profile data, so display
 * info comes from `related_profile_summary` and consent from
 * `client_access_grants`.
 *
 * NOT `public_profile_summary`, which this used to read and which could never
 * work here. That view is anon-readable discovery data and is filtered to
 * `account_type in ('professional', 'business')` precisely so customers are
 * not publicly enumerable — but a professional's clients ARE customers, so it
 * returned zero rows for every one of them and the whole roster rendered as
 * the fallback string. `related_profile_summary` is scoped to the caller's own
 * relationships instead, which is the correct basis for reading a name you are
 * entitled to because of who you are to that person.
 *
 * RLS already scopes all three to the caller (`security_invoker = true` on
 * the view), but the grants read ALSO filters on professional_id explicitly.
 * That read hits the table directly rather than the view, and this is consent
 * data: if that policy is ever loosened, an unfiltered query would quietly
 * show a professional what a shared client granted to someone else. The
 * filter costs nothing and removes the single point of failure.
 */
export async function fetchRoster(professionalId: string): Promise<RosterResult> {
  try {
    const { data: rels, error } = await supabase
      .from("active_professional_clients")
      .select(
        "id, client_id, joined_at, prefix, pronouns, contact_style, reminder_preference, communication_boundaries, assigned_program_id, assigned_food_template_id"
      )
      .order("joined_at", { ascending: false });

    if (error) return { status: "error", message: describe(error) };
    if (!rels?.length) return { status: "ok", clients: [] };

    const clientIds = rels.map((r) => r.client_id).filter((id): id is string => !!id);

    const [{ data: profiles }, { data: grants }] = await Promise.all([
      supabase.from("related_profile_summary").select("id, first_name, avatar_url").in("id", clientIds),
      supabase
        .from("client_access_grants")
        .select("client_id, category, granted")
        .eq("professional_id", professionalId)
        .in("client_id", clientIds),
    ]);

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const accessByClient = new Map<string, RosterClient["access"]>();
    for (const g of grants ?? []) {
      if (!g.client_id) continue;
      const bucket = accessByClient.get(g.client_id) ?? emptyAccess();
      const key = accessKeyFor[g.category];
      if (key) bucket[key] = !!g.granted;
      accessByClient.set(g.client_id, bucket);
    }

    const clients: RosterClient[] = rels
      .filter((r) => !!r.id && !!r.client_id)
      .map((r) => {
        const profile = profileById.get(r.client_id!);
        return {
          id: r.id!,
          clientId: r.client_id!,
          // Load-bearing for exactly two cases now: a client who has not set a
          // name yet, and a lookup that unexpectedly resolved nothing.
          //
          // Deliberately NOT "Former client", which the database-side note
          // suggested. This query reads `active_professional_clients`, which
          // already filters `disconnected_at is null`, so a disconnected
          // relationship never reaches here at all — every row that does is a
          // CURRENT client. Labelling one "Former client" would assert a
          // history that is not true, which is worse than the vague string it
          // replaced, not better. If a historical-roster surface is ever
          // built, that is where "Former client" belongs.
          name: profile?.first_name?.trim() || "Name unavailable",
          avatarUrl: profile?.avatar_url ?? null,
          joinedAt: r.joined_at ?? "",
          prefix: r.prefix ?? null,
          pronouns: r.pronouns ?? null,
          contactStyle: r.contact_style ?? null,
          reminderPreference: r.reminder_preference ?? null,
          communicationBoundaries: r.communication_boundaries ?? null,
          assignedProgramId: r.assigned_program_id ?? null,
          assignedFoodTemplateId: r.assigned_food_template_id ?? null,
          access: accessByClient.get(r.client_id!) ?? emptyAccess(),
        };
      });

    return { status: "ok", clients };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not load your clients." };
  }
}

export type DisconnectResult = { status: "ok" } | { status: "error"; message: string };

/**
 * Ends a relationship. Either party may call it; when the caller is the
 * client it also revokes their access grants for that pair, server-side.
 */
export async function disconnectClient(relationshipId: string): Promise<DisconnectResult> {
  try {
    const { error } = await supabase.rpc("disconnect_client_relationship", {
      p_relationship_id: relationshipId,
    });
    if (error) return { status: "error", message: describe(error) };
    return { status: "ok" };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Could not remove that client." };
  }
}

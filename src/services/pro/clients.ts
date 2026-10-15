// Release 3 · W3 Clients (CL3) and the client page header (CL2): the
// roster-level readers and writers (Database HANDOVER_API.md "Release 3",
// DB-3 · Clients, the numbers, notes and habits; DB-6 for care plans).
//
// - my_client_stages(): stage (a label, never access: J5), stage_changed_at,
//   joined_at, nutrition_coaching and the professional's own tags.
// - set_client_stage(p_client_id, p_stage): writes the history row too.
// - client_flags(p_client_id): last activity, gone quiet, at risk, programme
//   and meal plan ending. Null numbers mean "nothing shared".
// - client_adherence(p_client_id, p_days, p_until): the 14-day ring.
// - professional_client_tags: insert / delete own rows (column grants:
//   professional_id, client_id, tag).
// - professional_clients: nutrition_coaching and the communication
//   preferences are in the UPDATE column grant.
// Every read counts only what the client shares (has_client_access in the
// database); nothing here infers from an unshared category.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";
import { fetchAdherencePct, localIso, shiftIso } from "./home";
import { fetchClientAccess } from "./access";

export type ClientStage = "onboarding" | "active" | "paused" | "completed";
export const CLIENT_STAGES: ClientStage[] = ["onboarding", "active", "paused", "completed"];
export const STAGE_LABEL: Record<ClientStage, string> = {
  onboarding: "Onboarding",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

export type Read<T> = { ok: true; data: T } | { ok: false; offline: boolean };
export type Write = { ok: true } | { ok: false; message: string };

const failed = (error: unknown, fallback: string): Write => ({ ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : fallback });

export interface StageRow {
  clientId: string;
  stage: ClientStage;
  stageChangedAt: string;
  joinedAt: string;
  nutritionCoaching: boolean;
  tags: string[];
}

export async function fetchClientStages(): Promise<Read<StageRow[]>> {
  const { data, error } = await rpc("my_client_stages");
  if (error) return { ok: false, offline: isOffline(error) };
  const rows = (data ?? []) as {
    client_id: string;
    stage: ClientStage;
    stage_changed_at: string;
    joined_at: string;
    nutrition_coaching: boolean;
    tags: string[] | null;
  }[];
  return {
    ok: true,
    data: rows.map((r) => ({
      clientId: r.client_id,
      stage: r.stage,
      stageChangedAt: r.stage_changed_at,
      joinedAt: r.joined_at,
      nutritionCoaching: r.nutrition_coaching,
      tags: (r.tags ?? []).slice().sort((a, b) => a.localeCompare(b)),
    })),
  };
}

export async function setClientStage(clientId: string, stage: ClientStage): Promise<Write> {
  const { error } = await rpc("set_client_stage", { p_client_id: clientId, p_stage: stage });
  return error ? failed(error, "Couldn't change the stage. Try again.") : { ok: true };
}

export interface ClientFlags {
  lastActivityAt: string | null;
  goneQuiet: boolean;
  atRisk: boolean;
  programmeEnding: boolean;
  mealPlanEnding: boolean;
}

export async function fetchClientFlags(clientId: string): Promise<ClientFlags | null> {
  const { data, error } = await rpc("client_flags", { p_client_id: clientId });
  if (error) return null;
  const r = ((data ?? []) as {
    last_activity_at: string | null;
    gone_quiet: boolean | null;
    at_risk: boolean | null;
    programme_ending: boolean | null;
    meal_plan_ending: boolean | null;
  }[])[0];
  if (!r) return null;
  return {
    lastActivityAt: r.last_activity_at,
    goneQuiet: !!r.gone_quiet,
    atRisk: !!r.at_risk,
    programmeEnding: !!r.programme_ending,
    mealPlanEnding: !!r.meal_plan_ending,
  };
}

/**
 * HANDOVER i "Clinical overview ring": record types shared, of 6 (Lab
 * results, Medical history, Imaging, Medications, Blood pressure, Activity and
 * vitals). Medications ride on Medical history (k), so that switch counts
 * twice; Imaging counts when at least one imaging_shares row exists
 * (decision 6). A single shared result counts as Lab results (answer 3).
 */
export async function fetchRecordsShared(clientId: string): Promise<number | null> {
  const r = await fetchClientAccess(clientId);
  if (!r.ok || !r.data) return null;
  const c = r.data.categories;
  return (
    (c.includes("lab_results") || r.data.resultSharedCount > 0 ? 1 : 0) +
    (c.includes("medical_history") ? 2 : 0) +
    (r.data.imagingSharedCount > 0 ? 1 : 0) +
    (c.includes("blood_pressure") ? 1 : 0) +
    (c.includes("health_metrics") ? 1 : 0)
  );
}

export interface RosterNumbers {
  /** Adherence over 14 days (Full coaching, Nutrition) or records shared of 6 (Clinical overview); null = no data. */
  ring: number | null;
  flags: ClientFlags | null;
}

/** The ring and flags for each client, in parallel (a roster is small: the tier caps it). */
export async function fetchRosterNumbers(clientIds: string[], clinical: boolean): Promise<Record<string, RosterNumbers>> {
  const today = localIso(new Date());
  const rows = await Promise.all(
    clientIds.map(async (id) => {
      const [ring, flags] = await Promise.all([
        clinical ? fetchRecordsShared(id) : fetchAdherencePct(id, 14, today).then((v) => (typeof v === "number" ? v : null)),
        fetchClientFlags(id),
      ]);
      return [id, { ring, flags }] as const;
    })
  );
  return Object.fromEntries(rows);
}

// ---------------------------------------------------------------------------
// Plans: what the secondary line and the Programme / Meal plan / Care plan
// filters read.
// ---------------------------------------------------------------------------

export interface ClientPlan {
  clientId: string;
  name: string;
  /** Week n of m when the plan has a length and a start. */
  week: { n: number; of: number | null } | null;
  endsOn: string | null;
}

function weekOf(startsOn: string | null, joinWeek: number | null, of: number | null, today: string): ClientPlan["week"] {
  if (!startsOn) return null;
  const days = Math.round((new Date(`${today}T00:00:00`).getTime() - new Date(`${startsOn}T00:00:00`).getTime()) / 86400000);
  if (days < 0) return null;
  const n = Math.floor(days / 7) + (joinWeek ?? 1);
  return of && n > of ? null : { n, of };
}

/** Full coaching: the active programme per client (my templates, not ended). */
export async function fetchActiveProgrammes(me: string): Promise<Read<ClientPlan[]>> {
  const today = localIso(new Date());
  const { data, error } = await supabase
    .from("workout_template_assignments")
    .select("client_id, starts_on, ends_on, join_week, workout_templates!inner(name, duration_weeks, owner_id)")
    .is("ended_at", null)
    .eq("workout_templates.owner_id", me)
    .order("assigned_at", { ascending: false });
  if (error) return { ok: false, offline: isOffline(error) };
  type Row = { client_id: string; starts_on: string | null; ends_on: string | null; join_week: number | null; workout_templates: { name: string; duration_weeks: number | null } | null };
  const seen = new Set<string>();
  const out: ClientPlan[] = [];
  for (const r of (data ?? []) as unknown as Row[]) {
    if (seen.has(r.client_id)) continue;
    seen.add(r.client_id);
    out.push({
      clientId: r.client_id,
      name: r.workout_templates?.name ?? "",
      week: weekOf(r.starts_on, r.join_week, r.workout_templates?.duration_weeks ?? null, today),
      endsOn: r.ends_on,
    });
  }
  return { ok: true, data: out };
}

/** Nutrition (and Full coaching's nutrition): the active meal plan per client (DB-5 meal_plan_assignments). */
export async function fetchActiveMealPlans(me: string): Promise<Read<ClientPlan[]>> {
  const today = localIso(new Date());
  const { data, error } = await supabase
    .from("meal_plan_assignments" as never)
    .select("client_id, starts_on, ends_on, meal_plans:meal_plan_id(name, kcal_target)")
    .eq("professional_id", me)
    .is("ended_at", null)
    .order("assigned_at", { ascending: false });
  if (error) return { ok: false, offline: isOffline(error) };
  type Row = { client_id: string; starts_on: string | null; ends_on: string | null; meal_plans: { name: string; kcal_target: number | null } | null };
  const seen = new Set<string>();
  const out: ClientPlan[] = [];
  for (const r of (data ?? []) as unknown as Row[]) {
    if (seen.has(r.client_id)) continue;
    seen.add(r.client_id);
    const kcal = r.meal_plans?.kcal_target ? `, ${Math.round(Number(r.meal_plans.kcal_target)).toLocaleString("en-GB")} kcal` : "";
    out.push({ clientId: r.client_id, name: `${r.meal_plans?.name ?? ""}${kcal}`, week: weekOf(r.starts_on, 1, null, today), endsOn: r.ends_on });
  }
  return { ok: true, data: out };
}

/** Clinical overview: the active care plan per patient (DB-6). */
export async function fetchActiveCarePlans(me: string): Promise<Read<ClientPlan[]>> {
  const { data, error } = await supabase
    .from("care_plans" as never)
    .select("client_id, title, updated_at")
    .eq("professional_id", me)
    .eq("status", "active")
    .order("updated_at", { ascending: false });
  if (error) return { ok: false, offline: isOffline(error) };
  const seen = new Set<string>();
  const out: ClientPlan[] = [];
  for (const r of (data ?? []) as unknown as { client_id: string; title: string }[]) {
    if (seen.has(r.client_id)) continue;
    seen.add(r.client_id);
    out.push({ clientId: r.client_id, name: r.title, week: null, endsOn: null });
  }
  return { ok: true, data: out };
}

// ---------------------------------------------------------------------------
// Tags, nutrition coaching, communication preferences.
// ---------------------------------------------------------------------------

export const TAG_MAX = 30;

export async function addTag(me: string, clientId: string, tag: string): Promise<Write> {
  const t = tag.trim();
  if (!t) return { ok: false, message: "Type a tag first." };
  if (t.length > TAG_MAX) return { ok: false, message: `Keep tags to ${TAG_MAX} characters.` };
  const { error } = await supabase.from("professional_client_tags" as never).insert({ professional_id: me, client_id: clientId, tag: t } as never);
  if (error && (error as { code?: string }).code === "23505") return { ok: true };
  return error ? failed(error, "Couldn't add the tag. Try again.") : { ok: true };
}

export async function removeTag(me: string, clientId: string, tag: string): Promise<Write> {
  const { error } = await supabase.from("professional_client_tags" as never).delete().eq("professional_id", me).eq("client_id", clientId).eq("tag", tag);
  return error ? failed(error, "Couldn't remove the tag. Try again.") : { ok: true };
}

/** CL2 "Include nutrition coaching" (Full coaching only). */
export async function setNutritionCoaching(relationshipId: string, on: boolean): Promise<Write> {
  const { error } = await supabase.from("professional_clients").update({ nutrition_coaching: on } as never).eq("id", relationshipId);
  return error ? failed(error, "Couldn't save. Try again.") : { ok: true };
}

export interface CommunicationPreferences {
  pronouns: string | null;
  contactStyle: string | null;
  reminderPreference: string | null;
  communicationBoundaries: string | null;
}

/**
 * The communication preferences, saved on the relationship row (the old
 * ClientDetailSheet only patched local state, so an edit was lost on reload;
 * the columns are in the professional's UPDATE grant).
 */
export async function saveCommunicationPreferences(relationshipId: string, p: CommunicationPreferences): Promise<Write> {
  const clean = (v: string | null) => (v && v.trim() ? v.trim() : null);
  const { error } = await supabase
    .from("professional_clients")
    .update({
      pronouns: clean(p.pronouns),
      contact_style: clean(p.contactStyle),
      reminder_preference: clean(p.reminderPreference),
      communication_boundaries: clean(p.communicationBoundaries),
    })
    .eq("id", relationshipId);
  return error ? failed(error, "Couldn't save. Try again.") : { ok: true };
}

/** "2h ago", "yesterday", "6 days ago", "Oct 3" (activity lines). */
export function agoLabel(iso: string | null, now = new Date()): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  const mins = Math.round((now.getTime() - at.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24 && localIso(at) === localIso(now)) return `${hours}h ago`;
  if (localIso(at) === shiftIso(localIso(now), -1)) return "yesterday";
  const days = Math.round((new Date(`${localIso(now)}T00:00:00`).getTime() - new Date(`${localIso(at)}T00:00:00`).getTime()) / 86400000);
  if (days < 7) return `${days} days ago`;
  return at.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

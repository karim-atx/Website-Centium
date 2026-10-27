// Release 3 · W3 the client page (CL2, CL4, CL5 to CL9): per-client readers
// and writers, on the Database HANDOVER_API.md "Release 3" contract.
//
// DB-3: session_notes, note_templates, pro_change_log, the stage history,
//   habit_items (assigned_by_professional_id) behind the Habits switch,
//   client_biomarker_flags.
// DB-6: care_plans, care_plan_items, care_plan_versions, follow_ups,
//   publish_care_plan; result_shares (a single lab result shared without
//   the Lab results switch, Karim's answer 3); client_files with
//   create_client_file / delete_client_file and the client-files bucket;
//   coaching_terms_acceptances; client_pregnancy_summary ("pregnant, week n"
//   only, behind the Pregnancy switch, answer 2).
// DB-2: request_client_access (the LockLine "Ask to share").
// Every client-data read here is gated by RLS / the function itself; the
// screens additionally don't ask for what useClientAccess says is off.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";
import type { Read, Write, ClientStage } from "./clients";
import type { AccessCategory } from "./access";
import { ACCESS_CATEGORIES } from "../consent";

const failed = (error: unknown, fallback: string): Write => ({ ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : fallback });
const readFail = (error: unknown) => ({ ok: false as const, offline: isOffline(error) });
// Tables the generated types (W1-owned) don't name with their new columns:
// one narrow cast at the boundary.
const from = (table: string) => supabase.from(table as never);

// ---------------------------------------------------------------------------
// Notes (session_notes, note_templates)
// ---------------------------------------------------------------------------

export type NoteKind = "training" | "nutrition" | "clinical" | "body";

export interface SessionNote {
  id: string;
  kind: NoteKind;
  body: string;
  sharedWithClient: boolean;
  eventId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const NOTE_MAX = 10000;

export async function fetchNotes(me: string, clientId: string): Promise<Read<SessionNote[]>> {
  const { data, error } = await from("session_notes")
    .select("id, kind, body, shared_with_client, event_id, created_at, updated_at")
    .eq("professional_id", me)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) return readFail(error);
  type Row = { id: string; kind: NoteKind; body: string; shared_with_client: boolean; event_id: string | null; created_at: string; updated_at: string };
  return {
    ok: true,
    data: ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      kind: r.kind,
      body: r.body,
      sharedWithClient: r.shared_with_client,
      eventId: r.event_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  };
}

export async function createNote(me: string, clientId: string, kind: NoteKind, body: string, shared: boolean): Promise<Write> {
  const text = body.trim();
  if (!text) return { ok: false, message: "Write something first." };
  const { error } = await from("session_notes").insert({ professional_id: me, client_id: clientId, kind, body: text, shared_with_client: shared } as never);
  return error ? failed(error, "Couldn't save the note. Try again.") : { ok: true };
}

export async function updateNote(id: string, body: string, shared: boolean): Promise<Write> {
  const text = body.trim();
  if (!text) return { ok: false, message: "Write something first." };
  const { error } = await from("session_notes").update({ body: text, shared_with_client: shared } as never).eq("id", id);
  return error ? failed(error, "Couldn't save the note. Try again.") : { ok: true };
}

export async function deleteNote(id: string): Promise<Write> {
  const { error } = await from("session_notes").delete().eq("id", id);
  return error ? failed(error, "Couldn't delete the note. Try again.") : { ok: true };
}

export interface NoteTemplate {
  id: string;
  kind: NoteKind;
  title: string;
  body: string;
}

export async function fetchNoteTemplates(me: string): Promise<Read<NoteTemplate[]>> {
  const { data, error } = await from("note_templates").select("id, kind, title, body").eq("professional_id", me).order("title");
  if (error) return readFail(error);
  return { ok: true, data: (data ?? []) as unknown as NoteTemplate[] };
}

// ---------------------------------------------------------------------------
// CL4 change history: pro_change_log + the stage history.
// ---------------------------------------------------------------------------

export interface ChangeEntry {
  id: string;
  at: string;
  /** One readable line, e.g. "Changed the stage from Onboarding to Active". */
  line: string;
  /** Who made the change: the professional, or (W3-4 sharing rows) the client. */
  by: "pro" | "client";
}

/** W3-4: the sharing switch names, as the client's own sharing screen words them. */
const SHARING_WORD: Record<string, string> = Object.fromEntries(ACCESS_CATEGORIES.map((c) => [c.category, c.label.toLowerCase()]));

/**
 * W3-4 (20261216070000): the client_access_grants trigger writes subject_type
 * 'client_sharing' with summary { category } and nothing else. CATEGORY AND
 * DATE ONLY (Karim): no direction is stored, so CL4's "turned off" cannot be
 * said; the line is neutral, "{First name} changed {category} sharing".
 */
export function sharingLine(firstName: string, summary: Record<string, unknown>): string {
  const cat = typeof summary.category === "string" ? summary.category : "";
  const word = SHARING_WORD[cat] ?? (cat ? cat.replace(/_/g, " ") : "their");
  return `${firstName.trim() || "Your client"} changed ${word} sharing`;
}

const STAGE_WORD: Record<ClientStage, string> = { onboarding: "Onboarding", active: "Active", paused: "Paused", completed: "Completed" };

/** pro_change_log.summary is jsonb written by the assign, plan and target functions; this reads the keys it can. */
export function changeLine(subjectType: string, summary: Record<string, unknown>): string {
  const action = typeof summary.action === "string" ? summary.action : null;
  // The assign, plan and target functions name their subject under their own key (DB-3, DB-5).
  const str = (k: string) => (typeof summary[k] === "string" ? (summary[k] as string) : null);
  const name = str("name") ?? str("title") ?? str("programme") ?? str("plan");
  // W5: the subject words for the Release 3 writers (template_assignment, meal_plan,
  // nutrition_targets, routine = the client's copy edited by the professional).
  const SUBJECT: Record<string, string> = { template_assignment: "programme", meal_plan: "meal plan", nutrition_targets: "nutrition targets", routine: "their copy of a programme" };
  const subject = SUBJECT[subjectType] ?? subjectType.replace(/_/g, " ");
  if (subjectType === "care_plan" && action === "published") {
    const v = typeof summary.version === "number" ? ` (version ${summary.version})` : "";
    return `Published the care plan${v}`;
  }
  const verb = action ? action.replace(/_/g, " ") : "Changed";
  const cap = verb.charAt(0).toUpperCase() + verb.slice(1);
  return name ? `${cap} ${subject}: ${name}` : `${cap} ${subject}`;
}

export async function fetchChangeHistory(me: string, clientId: string, clientFirstName: string): Promise<Read<ChangeEntry[]>> {
  const [log, stages] = await Promise.all([
    from("pro_change_log").select("id, subject_type, summary, at").eq("professional_id", me).eq("client_id", clientId).order("at", { ascending: false }).limit(100),
    from("professional_client_stage_history").select("id, from_stage, to_stage, changed_at").eq("professional_id", me).eq("client_id", clientId).order("changed_at", { ascending: false }).limit(50),
  ]);
  const error = log.error ?? stages.error;
  if (error) return readFail(error);
  const out: ChangeEntry[] = [];
  for (const r of (log.data ?? []) as unknown as { id: string; subject_type: string; summary: Record<string, unknown> | null; at: string }[]) {
    out.push(
      r.subject_type === "client_sharing"
        ? { id: `log:${r.id}`, at: r.at, line: sharingLine(clientFirstName, r.summary ?? {}), by: "client" }
        : { id: `log:${r.id}`, at: r.at, line: changeLine(r.subject_type, r.summary ?? {}), by: "pro" },
    );
  }
  for (const r of (stages.data ?? []) as unknown as { id: string; from_stage: ClientStage | null; to_stage: ClientStage; changed_at: string }[]) {
    out.push({
      id: `stage:${r.id}`,
      at: r.changed_at,
      line: r.from_stage ? `Changed the stage from ${STAGE_WORD[r.from_stage]} to ${STAGE_WORD[r.to_stage]}` : `Started in ${STAGE_WORD[r.to_stage]}`,
      by: "pro",
    });
  }
  out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return { ok: true, data: out };
}

// ---------------------------------------------------------------------------
// Care plan (Clinical overview only, CL5 to CL7)
// ---------------------------------------------------------------------------

export type CareItemKind = "goal" | "recommendation" | "monitoring";

export interface CareItem {
  id: string;
  kind: CareItemKind;
  body: string;
  visibleToClient: boolean;
  metric: string | null;
  thresholdLow: number | null;
  thresholdHigh: number | null;
  position: number;
}

export interface FollowUp {
  id: string;
  dueOn: string;
  note: string | null;
  status: "planned" | "booked" | "done" | "cancelled";
  calendarEventId: string | null;
}

export interface CareVersion {
  id: string;
  version: number;
  note: string | null;
  createdAt: string;
  snapshot: { title?: string; items?: { kind: CareItemKind; body: string }[] };
}

export interface CarePlan {
  id: string;
  title: string;
  status: "active" | "closed";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: CareItem[];
  followUps: FollowUp[];
  versions: CareVersion[];
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function fetchCarePlan(me: string, clientId: string): Promise<Read<CarePlan | null>> {
  const { data, error } = await from("care_plans")
    .select("id, title, status, published_at, created_at, updated_at")
    .eq("professional_id", me)
    .eq("client_id", clientId)
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) return readFail(error);
  const plan = ((data ?? []) as unknown as { id: string; title: string; status: "active" | "closed"; published_at: string | null; created_at: string; updated_at: string }[])[0];
  if (!plan) return { ok: true, data: null };
  const [items, follow, versions] = await Promise.all([
    from("care_plan_items").select("id, kind, body, visible_to_client, metric, threshold_low, threshold_high, position").eq("care_plan_id", plan.id).order("position"),
    from("follow_ups").select("id, due_on, note, status, calendar_event_id").eq("care_plan_id", plan.id).order("due_on"),
    from("care_plan_versions").select("id, version, note, created_at, snapshot").eq("care_plan_id", plan.id).order("version", { ascending: false }),
  ]);
  const e = items.error ?? follow.error ?? versions.error;
  if (e) return readFail(e);
  type ItemRow = { id: string; kind: CareItemKind; body: string; visible_to_client: boolean; metric: string | null; threshold_low: unknown; threshold_high: unknown; position: number };
  return {
    ok: true,
    data: {
      id: plan.id,
      title: plan.title,
      status: plan.status,
      publishedAt: plan.published_at,
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
      items: ((items.data ?? []) as unknown as ItemRow[]).map((i) => ({
        id: i.id,
        kind: i.kind,
        body: i.body,
        visibleToClient: i.visible_to_client,
        metric: i.metric,
        thresholdLow: num(i.threshold_low),
        thresholdHigh: num(i.threshold_high),
        position: i.position,
      })),
      followUps: ((follow.data ?? []) as unknown as { id: string; due_on: string; note: string | null; status: FollowUp["status"]; calendar_event_id: string | null }[]).map((f) => ({
        id: f.id,
        dueOn: f.due_on,
        note: f.note,
        status: f.status,
        calendarEventId: f.calendar_event_id,
      })),
      versions: ((versions.data ?? []) as unknown as { id: string; version: number; note: string | null; created_at: string; snapshot: CareVersion["snapshot"] }[]).map((v) => ({
        id: v.id,
        version: v.version,
        note: v.note,
        createdAt: v.created_at,
        snapshot: v.snapshot ?? {},
      })),
    },
  };
}

export async function createCarePlan(me: string, clientId: string, title: string): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const t = title.trim();
  if (!t) return { ok: false, message: "Give the plan a name." };
  const { data, error } = await from("care_plans").insert({ professional_id: me, client_id: clientId, title: t } as never).select("id").single();
  if (error || !data) return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't create the care plan. Try again." };
  return { ok: true, id: (data as unknown as { id: string }).id };
}

export async function renameCarePlan(id: string, title: string): Promise<Write> {
  const t = title.trim();
  if (!t) return { ok: false, message: "Give the plan a name." };
  const { error } = await from("care_plans").update({ title: t } as never).eq("id", id);
  return error ? failed(error, "Couldn't save. Try again.") : { ok: true };
}

export interface CareItemDraft {
  kind: CareItemKind;
  body: string;
  visibleToClient: boolean;
  metric?: string | null;
  thresholdLow?: number | null;
  thresholdHigh?: number | null;
}

export async function addCareItem(planId: string, d: CareItemDraft, position: number): Promise<Write> {
  const body = d.body.trim();
  if (!body) return { ok: false, message: "Write the item first." };
  const { error } = await from("care_plan_items").insert({
    care_plan_id: planId,
    kind: d.kind,
    body,
    visible_to_client: d.visibleToClient,
    metric: d.metric ?? null,
    threshold_low: d.thresholdLow ?? null,
    threshold_high: d.thresholdHigh ?? null,
    position,
  } as never);
  return error ? failed(error, "Couldn't save. Try again.") : { ok: true };
}

export async function updateCareItem(id: string, patch: Partial<CareItemDraft>): Promise<Write> {
  const row: Record<string, unknown> = {};
  if (patch.body !== undefined) row.body = patch.body.trim();
  if (patch.visibleToClient !== undefined) row.visible_to_client = patch.visibleToClient;
  if (patch.kind !== undefined) row.kind = patch.kind;
  const { error } = await from("care_plan_items").update(row as never).eq("id", id);
  return error ? failed(error, "Couldn't save. Try again.") : { ok: true };
}

export async function deleteCareItem(id: string): Promise<Write> {
  const { error } = await from("care_plan_items").delete().eq("id", id);
  return error ? failed(error, "Couldn't remove it. Try again.") : { ok: true };
}

export async function addFollowUp(planId: string, dueOn: string, note: string): Promise<Write> {
  const { error } = await from("follow_ups").insert({ care_plan_id: planId, due_on: dueOn, note: note.trim() || null } as never);
  return error ? failed(error, "Couldn't add the follow-up. Try again.") : { ok: true };
}

export async function setFollowUpStatus(id: string, status: FollowUp["status"]): Promise<Write> {
  const { error } = await from("follow_ups").update({ status } as never).eq("id", id);
  return error ? failed(error, "Couldn't save. Try again.") : { ok: true };
}

/** "Save and mark reviewed" (CL6): publish_care_plan snapshots a new version and tells the client. */
export async function publishCarePlan(id: string, note: string): Promise<{ ok: true; version: number } | { ok: false; message: string }> {
  const { data, error } = await rpc("publish_care_plan", { p_care_plan_id: id, p_note: note.trim() || null });
  if (error) return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't publish. Try again." };
  return { ok: true, version: Number(data) };
}

// ---------------------------------------------------------------------------
// Results shared one at a time (result_shares), biomarker flags.
// ---------------------------------------------------------------------------

export interface SharedResult {
  shareId: string;
  markerId: string | null;
  panelId: string | null;
  /** blood_markers.marker_key: the catalogue key (null for a marker outside the catalogue). */
  markerKey: string | null;
  name: string;
  value: number | null;
  unit: string;
  rangeLow: number | null;
  rangeHigh: number | null;
  status: "low" | "normal" | "high" | null;
  /** The result's own date, else the day it was shared. */
  date: string;
  note: string | null;
  sharedAt: string;
}

export async function fetchSharedResults(me: string, clientId: string): Promise<Read<SharedResult[]>> {
  const { data, error } = await from("result_shares").select("id, blood_marker_id, blood_panel_id, note, shared_at").eq("professional_id", me).eq("client_id", clientId).order("shared_at", { ascending: false });
  if (error) return readFail(error);
  const shares = (data ?? []) as unknown as { id: string; blood_marker_id: string | null; blood_panel_id: string | null; note: string | null; shared_at: string }[];
  const markerIds = shares.map((s) => s.blood_marker_id).filter((x): x is string => !!x);
  const panelIds = shares.map((s) => s.blood_panel_id).filter((x): x is string => !!x);
  const [markers, panelMarkers] = await Promise.all([
    markerIds.length
      ? from("blood_markers").select("id, marker_key, name, value, unit, range_low, range_high, status, result_date, created_at").in("id", markerIds)
      : Promise.resolve({ data: [], error: null }),
    panelIds.length
      ? from("blood_markers").select("id, blood_panel_id, marker_key, name, value, unit, range_low, range_high, status, result_date, created_at").in("blood_panel_id", panelIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const e = markers.error ?? panelMarkers.error;
  if (e) return readFail(e);
  type M = { id: string; blood_panel_id?: string | null; marker_key: string | null; name: string; value: unknown; unit: string; range_low: unknown; range_high: unknown; status: SharedResult["status"]; result_date: string | null; created_at: string };
  const byId = new Map(((markers.data ?? []) as unknown as M[]).map((m) => [m.id, m]));
  const out: SharedResult[] = [];
  const mk = (s: (typeof shares)[number], m: M): SharedResult => ({
    shareId: s.id,
    markerId: m.id,
    panelId: s.blood_panel_id,
    markerKey: m.marker_key,
    name: m.name,
    value: num(m.value),
    unit: m.unit,
    rangeLow: num(m.range_low),
    rangeHigh: num(m.range_high),
    status: m.status,
    date: m.result_date ?? s.shared_at.slice(0, 10),
    note: s.note,
    sharedAt: s.shared_at,
  });
  for (const s of shares) {
    if (s.blood_marker_id) {
      const m = byId.get(s.blood_marker_id);
      if (m) out.push(mk(s, m));
    } else if (s.blood_panel_id) {
      for (const m of (panelMarkers.data ?? []) as unknown as M[]) if (m.blood_panel_id === s.blood_panel_id) out.push(mk(s, m));
    }
  }
  return { ok: true, data: out };
}

export interface BiomarkerFlag {
  markerKey: string | null;
  name: string;
  unit: string;
  latestValue: number;
  resultDate: string;
  rangeLow: number | null;
  rangeHigh: number | null;
  rangeSource: "lab" | "reference" | null;
  status: "out_of_range" | "borderline" | "normal" | "unknown";
  previousValue: number | null;
  previousDate: string | null;
  changePct: number | null;
  changeFlag: boolean;
  yearlyRate: number | null;
}

export async function fetchBiomarkerFlags(clientId: string): Promise<Read<BiomarkerFlag[]>> {
  const { data, error } = await rpc("client_biomarker_flags", { p_client_id: clientId });
  if (error) return readFail(error);
  type Row = {
    marker_key: string | null;
    name: string;
    unit: string;
    latest_value: unknown;
    result_date: string;
    range_low: unknown;
    range_high: unknown;
    range_source: BiomarkerFlag["rangeSource"];
    status: BiomarkerFlag["status"];
    previous_value: unknown;
    previous_date: string | null;
    change_pct: unknown;
    change_flag: boolean | null;
    yearly_rate: unknown;
  };
  return {
    ok: true,
    data: ((data ?? []) as Row[]).map((r) => ({
      markerKey: r.marker_key,
      name: r.name,
      unit: r.unit,
      latestValue: Number(r.latest_value),
      resultDate: r.result_date,
      rangeLow: num(r.range_low),
      rangeHigh: num(r.range_high),
      rangeSource: r.range_source,
      status: r.status,
      previousValue: num(r.previous_value),
      previousDate: r.previous_date,
      changePct: num(r.change_pct),
      changeFlag: !!r.change_flag,
      yearlyRate: num(r.yearly_rate),
    })),
  };
}

// ---------------------------------------------------------------------------
// Cycle and pregnancy (answer 2): one word, or "pregnant, week n".
// ---------------------------------------------------------------------------

export async function fetchPregnancySummary(clientId: string): Promise<Read<{ pregnant: boolean; week: number | null } | null>> {
  const { data, error } = await rpc("client_pregnancy_summary", { p_client_id: clientId });
  if (error) return readFail(error);
  const r = ((data ?? []) as { pregnant: boolean | null; week: number | null }[])[0];
  return { ok: true, data: r ? { pregnant: !!r.pregnant, week: r.week ?? null } : null };
}

// ---------------------------------------------------------------------------
// Dietary needs (Allergies and dietary needs switch; dietary_restrictions is
// Food diary OR Allergies and dietary needs in phase one).
// ---------------------------------------------------------------------------

export interface DietaryNeeds {
  allergies: { allergen: string; severity: "mild" | "moderate" | "severe"; note: string | null; updatedAt: string }[];
  restrictions: { restriction: string; kind: string; createdAt: string }[];
}

export async function fetchDietaryNeeds(clientId: string, allergiesShared: boolean): Promise<Read<DietaryNeeds>> {
  const [a, r] = await Promise.all([
    allergiesShared
      ? from("allergies").select("allergen, severity, note, updated_at").eq("user_id", clientId)
      : Promise.resolve({ data: [], error: null }),
    from("dietary_restrictions").select("restriction, kind, created_at").eq("user_id", clientId),
  ]);
  const e = a.error ?? r.error;
  if (e) return readFail(e);
  return {
    ok: true,
    data: {
      allergies: ((a.data ?? []) as unknown as { allergen: string; severity: DietaryNeeds["allergies"][number]["severity"]; note: string | null; updated_at: string }[]).map((x) => ({
        allergen: x.allergen,
        severity: x.severity,
        note: x.note,
        updatedAt: x.updated_at,
      })),
      restrictions: ((r.data ?? []) as unknown as { restriction: string; kind: string; created_at: string }[]).map((x) => ({ restriction: x.restriction, kind: x.kind, createdAt: x.created_at })),
    },
  };
}

// ---------------------------------------------------------------------------
// Habits (Habits switch). Assigned habits read with their 14-day ticks.
// ---------------------------------------------------------------------------

export interface ClientHabit {
  id: string;
  label: string;
  assignedByMe: boolean;
  doneDates: string[];
}

export async function fetchHabits(me: string, clientId: string, since: string): Promise<Read<ClientHabit[]>> {
  const { data, error } = await from("habit_items").select("id, label, assigned_by_professional_id, archived_at").eq("owner_id", clientId).is("archived_at", null).order("position");
  if (error) return readFail(error);
  const items = (data ?? []) as unknown as { id: string; label: string; assigned_by_professional_id: string | null }[];
  if (!items.length) return { ok: true, data: [] };
  const done = await from("habit_completions").select("habit_item_id, completed_date").in("habit_item_id", items.map((i) => i.id)).gte("completed_date", since);
  if (done.error) return readFail(done.error);
  const byItem = new Map<string, string[]>();
  for (const d of (done.data ?? []) as unknown as { habit_item_id: string; completed_date: string }[]) byItem.set(d.habit_item_id, [...(byItem.get(d.habit_item_id) ?? []), d.completed_date]);
  return { ok: true, data: items.map((i) => ({ id: i.id, label: i.label, assignedByMe: i.assigned_by_professional_id === me, doneDates: byItem.get(i.id) ?? [] })) };
}

// ---------------------------------------------------------------------------
// Client files (CL2 Files tab) and the signed coaching terms.
// ---------------------------------------------------------------------------

export interface ClientFile {
  id: string;
  kind: "document" | "progress_photo";
  title: string;
  path: string;
  uploadedByMe: boolean;
  createdAt: string;
}

export async function fetchClientFiles(me: string, clientId: string): Promise<Read<ClientFile[]>> {
  const { data, error } = await from("client_files").select("id, kind, title, path, uploaded_by, created_at").eq("professional_id", me).eq("client_id", clientId).is("deleted_at", null).order("created_at", { ascending: false });
  if (error) return readFail(error);
  return {
    ok: true,
    data: ((data ?? []) as unknown as { id: string; kind: ClientFile["kind"]; title: string; path: string; uploaded_by: string; created_at: string }[]).map((f) => ({
      id: f.id,
      kind: f.kind,
      title: f.title,
      path: f.path,
      uploadedByMe: f.uploaded_by === me,
      createdAt: f.created_at,
    })),
  };
}

export async function fetchTermsAcceptance(me: string, clientId: string): Promise<Read<{ version: number; acceptedAt: string } | null>> {
  const { data, error } = await from("coaching_terms_acceptances").select("terms_version, accepted_at").eq("professional_id", me).eq("client_id", clientId).order("accepted_at", { ascending: false }).limit(1);
  if (error) return readFail(error);
  const r = ((data ?? []) as unknown as { terms_version: number; accepted_at: string }[])[0];
  return { ok: true, data: r ? { version: r.terms_version, acceptedAt: r.accepted_at } : null };
}

/** create_client_file registers the row and returns the path; the object is uploaded there (client_files_insert_registered). */
export async function uploadClientFile(clientId: string, kind: ClientFile["kind"], title: string, file: File): Promise<Write> {
  const { data, error } = await rpc("create_client_file", { p_other_party: clientId, p_kind: kind, p_title: title.trim(), p_filename: file.name });
  if (error) return failed(error, "Couldn't add the file. Try again.");
  const row = ((data ?? []) as { file_id: string; path: string }[])[0];
  if (!row) return { ok: false, message: "Couldn't add the file. Try again." };
  const up = await supabase.storage.from("client-files").upload(row.path, file, { contentType: file.type, upsert: false });
  if (up.error) {
    await rpc("delete_client_file", { p_file_id: row.file_id });
    return { ok: false, message: isOffline(up.error) ? OFFLINE_MESSAGE : "Couldn't upload the file. Try again." };
  }
  return { ok: true };
}

export async function deleteClientFile(id: string, path: string): Promise<Write> {
  const { error } = await rpc("delete_client_file", { p_file_id: id });
  if (error) return failed(error, "Couldn't remove the file. Try again.");
  await supabase.storage.from("client-files").remove([path]);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Asking for a data type (LockLine "Ask to share"), pending payment.
// ---------------------------------------------------------------------------

export async function askToShare(clientId: string, category: AccessCategory): Promise<Write> {
  const { error } = await rpc("request_client_access", { p_client_id: clientId, p_category: category, p_message: null });
  if (!error) return { ok: true };
  const msg = (error as { message?: string }).message ?? "";
  if (/already asked/.test(msg)) return { ok: false, message: "You've already asked. It's waiting for them." };
  if (/already share/.test(msg)) return { ok: false, message: "They already share this with you." };
  return failed(error, "Couldn't send the request. Try again.");
}

export async function fetchPendingAccessRequests(me: string, clientId: string): Promise<AccessCategory[]> {
  const { data } = await from("access_requests").select("category, status").eq("professional_id", me).eq("client_id", clientId).eq("status", "pending");
  return ((data ?? []) as unknown as { category: AccessCategory }[]).map((r) => r.category);
}

export interface ClientPendingHire {
  id: string;
  planName: string;
  priceAgreed: number;
  paymentMethod: string;
  createdAt: string;
}

/** professional_pending_hires(), this client's rows (the client page header banner). */
export async function fetchClientPendingHires(clientId: string): Promise<Read<ClientPendingHire[]>> {
  const { data, error } = await rpc("professional_pending_hires");
  if (error) return readFail(error);
  return {
    ok: true,
    data: ((data ?? []) as { id: string; client_id: string; plan_name: string; price_agreed: unknown; payment_method: string; created_at: string }[])
      .filter((r) => r.client_id === clientId)
      .map((r) => ({ id: r.id, planName: r.plan_name, priceAgreed: Number(r.price_agreed), paymentMethod: r.payment_method, createdAt: r.created_at })),
  };
}

/** One day's planned vs completed items for this client (pro_client_day_items), for the Progress bars. */
export async function fetchDayItems(clientId: string, days: string[]): Promise<Read<{ day: string; planned: number; completed: number }[]>> {
  const rows = await Promise.all(
    days.map(async (day) => {
      const { data, error } = await rpc("pro_client_day_items", { p_client_id: clientId, p_day: day });
      if (error) return { error };
      const r = ((data ?? []) as { planned: number | null; completed: number | null }[])[0];
      return { day, planned: r?.planned ?? 0, completed: r?.completed ?? 0 };
    })
  );
  const bad = rows.find((r) => "error" in r && r.error);
  if (bad && "error" in bad) return readFail(bad.error);
  return { ok: true, data: rows as { day: string; planned: number; completed: number }[] };
}

/** client_adherence(p_client_id, p_days, p_until): planned and completed items; null when nothing it counts is shared. */
export async function fetchAdherenceRow(clientId: string, days: number, until: string): Promise<Read<{ planned: number; completed: number; pct: number | null } | null>> {
  const { data, error } = await rpc("client_adherence", { p_client_id: clientId, p_days: days, p_until: until });
  if (error) return readFail(error);
  const r = ((data ?? []) as { planned: number | null; completed: number | null; pct: number | null }[])[0];
  if (!r || r.pct === null) return { ok: true, data: null };
  return { ok: true, data: { planned: r.planned ?? 0, completed: r.completed ?? 0, pct: r.pct } };
}

// ---------------------------------------------------------------------------
// Plan tab: this client's programmes, meal plan and targets.
// ---------------------------------------------------------------------------

export interface ClientProgramme {
  id: string;
  name: string;
  durationWeeks: number | null;
  startsOn: string | null;
  endsOn: string | null;
  joinWeek: number | null;
  endedAt: string | null;
}

/** My templates assigned to this client: the active one(s) and Past programmes (ended_at set). */
export async function fetchClientProgrammes(me: string, clientId: string): Promise<Read<ClientProgramme[]>> {
  const { data, error } = await supabase
    .from("workout_template_assignments")
    .select("id, starts_on, ends_on, join_week, ended_at, assigned_at, workout_templates!inner(name, duration_weeks, owner_id)")
    .eq("client_id", clientId)
    .eq("workout_templates.owner_id", me)
    .order("assigned_at", { ascending: false });
  if (error) return readFail(error);
  type Row = { id: string; starts_on: string | null; ends_on: string | null; join_week: number | null; ended_at: string | null; workout_templates: { name: string; duration_weeks: number | null } | null };
  return {
    ok: true,
    data: ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      name: r.workout_templates?.name ?? "",
      durationWeeks: r.workout_templates?.duration_weeks ?? null,
      startsOn: r.starts_on,
      endsOn: r.ends_on,
      joinWeek: r.join_week,
      endedAt: r.ended_at,
    })),
  };
}

export interface ClientMealPlan {
  assignmentId: string;
  planId: string;
  name: string;
  kcal: number | null;
  proteinPct: number | null;
  carbsPct: number | null;
  fatPct: number | null;
  daysCount: number | null;
  startsOn: string | null;
  endsOn: string | null;
}

export async function fetchClientMealPlan(me: string, clientId: string): Promise<Read<ClientMealPlan | null>> {
  const { data, error } = await from("meal_plan_assignments")
    .select("id, meal_plan_id, starts_on, ends_on, meal_plans:meal_plan_id(name, kcal_target, protein_pct, carbs_pct, fat_pct, days_count)")
    .eq("professional_id", me)
    .eq("client_id", clientId)
    .is("ended_at", null)
    .order("assigned_at", { ascending: false })
    .limit(1);
  if (error) return readFail(error);
  type Row = { id: string; meal_plan_id: string; starts_on: string | null; ends_on: string | null; meal_plans: { name: string; kcal_target: unknown; protein_pct: unknown; carbs_pct: unknown; fat_pct: unknown; days_count: number | null } | null };
  const r = ((data ?? []) as unknown as Row[])[0];
  if (!r) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      assignmentId: r.id,
      planId: r.meal_plan_id,
      name: r.meal_plans?.name ?? "",
      kcal: num(r.meal_plans?.kcal_target),
      proteinPct: num(r.meal_plans?.protein_pct),
      carbsPct: num(r.meal_plans?.carbs_pct),
      fatPct: num(r.meal_plans?.fat_pct),
      daysCount: r.meal_plans?.days_count ?? null,
      startsOn: r.starts_on,
      endsOn: r.ends_on,
    },
  };
}

export interface ClientTargets {
  calories: number | null;
  proteinPct: number | null;
  carbsPct: number | null;
  fatPct: number | null;
  locked: boolean;
  setAt: string;
}

/**
 * The targets this professional set for the client (W5, follow-up "The
 * targets you set": my_client_nutrition_targets). It returns a row only when
 * the caller set the current targets and is still connected; no switch is
 * needed. The client's own targets and weight goal stay behind Progress
 * (nutrition_goals), read on the NU8 screen only.
 */
export async function fetchClientTargets(clientId: string): Promise<Read<ClientTargets | null>> {
  const { data, error } = await rpc("my_client_nutrition_targets", { p_client_id: clientId });
  if (error) return readFail(error);
  const r = ((data ?? []) as { target_calories: unknown; protein_pct: unknown; carbs_pct: unknown; fat_pct: unknown; locked: boolean | null; set_at: string }[])[0];
  if (!r) return { ok: true, data: null };
  return {
    ok: true,
    data: { calories: num(r.target_calories), proteinPct: num(r.protein_pct), carbsPct: num(r.carbs_pct), fatPct: num(r.fat_pct), locked: !!r.locked, setAt: r.set_at },
  };
}

/** assign_habit (Full coaching): the client can tick and archive it, not rename it (ATXG4). */
export async function assignHabit(clientId: string, label: string): Promise<Write> {
  const t = label.trim();
  if (!t) return { ok: false, message: "Name the habit first." };
  const { error } = await rpc("assign_habit", { p_client_id: clientId, p_label: t, p_icon: "custom", p_colour: "lavender" });
  return error ? failed(error, "Couldn't add the habit. Try again.") : { ok: true };
}

/** calendar_events.outcome (DB-4) for the sessions listed: completed, no_show, late_cancel. */
export async function fetchEventOutcomes(ids: string[]): Promise<Record<string, string | null>> {
  if (!ids.length) return {};
  const { data } = await from("calendar_events").select("id, outcome").in("id", ids);
  return Object.fromEntries(((data ?? []) as unknown as { id: string; outcome: string | null }[]).map((r) => [r.id, r.outcome]));
}

/** The days this client logged any food (food_log_entries, Food diary switch), for Logging consistency. */
export async function fetchLoggedDays(clientId: string, since: string): Promise<Read<string[]>> {
  const { data, error } = await from("food_log_entries").select("logged_date").eq("user_id", clientId).gte("logged_date", since);
  if (error) return readFail(error);
  return { ok: true, data: [...new Set(((data ?? []) as unknown as { logged_date: string }[]).map((r) => r.logged_date))] };
}

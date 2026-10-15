// Release 3 · W6 Forms and check-ins (MO29, HO20, CL10, CL11) on the
// Database HANDOVER_API.md DB-6 contract (20261124060000):
// - forms (kind intake / check_in, title, archived_at) and form_questions
//   (type, prompt, unit, required, options, scale_min / scale_max,
//   safety_topic, safety_trigger): the owner writes them through RLS, gated
//   by can_write_form(kind) (check-ins: Full coaching and Nutrition only);
// - create_weekly_check_in_template() makes the built-in Weekly check-in with
//   its safety-marked questions;
// - assign_form(p_form_id, p_client_id, p_due_at, p_schedule) sends one form
//   (due_at) or starts a schedule (daily@HH:MM / weekly:<1-7>@HH:MM, the
//   client's local time); cancel_form_assignment stops it;
// - form_responses: the professional reads a response once it's submitted,
//   for that response only (decision 6); review_form_response(p_response_id,
//   p_reply) marks it reviewed and tells the client;
// - photo answers live in the private form-uploads bucket under
//   {client}/{assignment}/…, readable by the assigning professional.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";
import type { Read, Write } from "./clients";
import { diffQuestions, fromRow, toRow, type FormAssignment, type FormKind, type FormSummary, type QuestionDraft, type QuestionRow } from "../../components/pro/forms/formModel";

export type { FormAssignment, FormSummary };

const from = (table: string) => supabase.from(table as never);
const readFail = (error: unknown) => ({ ok: false as const, offline: isOffline(error) });

function message(error: unknown, fallback: string): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const code = (error as { code?: string } | null)?.code;
  if (code === "ATX12") return "That person isn't your client any more.";
  if (code === "ATX09") return "Check-ins are for Full coaching and Nutrition professionals.";
  if (code === "ATX08") return "This form isn't available any more.";
  if (code === "ATXG9") return "This form has already been sent.";
  return fallback;
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export async function canWriteForm(kind: FormKind): Promise<boolean> {
  const { data, error } = await rpc("can_write_form", { p_kind: kind });
  return !error && data === true;
}

export async function fetchForms(me: string): Promise<Read<{ forms: FormSummary[]; assignments: FormAssignment[] }>> {
  const [f, a] = await Promise.all([
    from("forms").select("id, kind, title, updated_at, form_questions(count)").eq("professional_id", me).is("archived_at", null).order("created_at", { ascending: true }),
    from("form_assignments").select("id, form_id, client_id, schedule, due_at, status, series_id").eq("professional_id", me).in("status", ["series", "due", "submitted", "missed"]),
  ]);
  if (f.error) return readFail(f.error);
  if (a.error) return readFail(a.error);
  const forms = ((f.data ?? []) as unknown as { id: string; kind: FormKind; title: string; updated_at: string; form_questions: { count: number }[] }[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    questionCount: r.form_questions?.[0]?.count ?? 0,
    updatedAt: r.updated_at,
  }));
  return { ok: true, data: { forms, assignments: ((a.data ?? []) as unknown as AssignmentRow[]).map(mapAssignment) } };
}

interface AssignmentRow {
  id: string;
  form_id: string;
  client_id: string;
  schedule: string | null;
  due_at: string | null;
  status: FormAssignment["status"];
  series_id: string | null;
}
const mapAssignment = (r: AssignmentRow): FormAssignment => ({ id: r.id, formId: r.form_id, clientId: r.client_id, schedule: r.schedule, dueAt: r.due_at, status: r.status, seriesId: r.series_id });

export interface FormDetail {
  id: string;
  kind: FormKind;
  title: string;
  questions: QuestionDraft[];
  assignments: FormAssignment[];
}

const Q_COLS = "id, position, type, prompt, unit, required, options, scale_min, scale_max, safety_topic, safety_trigger";

export async function fetchForm(formId: string): Promise<Read<FormDetail | null>> {
  const [f, q, a] = await Promise.all([
    from("forms").select("id, kind, title, archived_at").eq("id", formId).maybeSingle(),
    from("form_questions").select(Q_COLS).eq("form_id", formId).order("position"),
    from("form_assignments").select("id, form_id, client_id, schedule, due_at, status, series_id").eq("form_id", formId).in("status", ["series", "due", "submitted", "missed"]),
  ]);
  if (f.error) return readFail(f.error);
  if (q.error) return readFail(q.error);
  if (a.error) return readFail(a.error);
  const row = f.data as unknown as { id: string; kind: FormKind; title: string; archived_at: string | null } | null;
  if (!row || row.archived_at) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      id: row.id,
      kind: row.kind,
      title: row.title,
      questions: ((q.data ?? []) as unknown as QuestionRow[]).map(fromRow),
      assignments: ((a.data ?? []) as unknown as AssignmentRow[]).map(mapAssignment),
    },
  };
}

/**
 * Saves a form: a new one is inserted first; then its questions are brought
 * in line with the draft (inserts, updates, deletes). Returns the form id.
 */
export async function saveForm(me: string, formId: string | null, kind: FormKind, title: string, saved: QuestionDraft[], draft: QuestionDraft[]): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  let id = formId;
  if (!id) {
    const { data, error } = await from("forms").insert({ professional_id: me, kind, title: title.trim() } as never).select("id").single();
    if (error) return { ok: false, message: message(error, "Couldn't save the form. Try again.") };
    id = (data as unknown as { id: string }).id;
  } else {
    const { error } = await from("forms").update({ title: title.trim() } as never).eq("id", id);
    if (error) return { ok: false, message: message(error, "Couldn't save the form. Try again.") };
  }
  const d = diffQuestions(saved, draft);
  if (d.remove.length) {
    const { error } = await from("form_questions").delete().in("id", d.remove);
    if (error) return { ok: false, message: message(error, "Couldn't save the questions. Try again.") };
  }
  for (const u of d.update) {
    const { error } = await from("form_questions").update(toRow(u.q, u.index) as never).eq("id", u.id);
    if (error) return { ok: false, message: message(error, "Couldn't save the questions. Try again.") };
  }
  if (d.insert.length) {
    const { error } = await from("form_questions").insert(d.insert.map((x) => ({ form_id: id, ...toRow(x.q, x.index) })) as never);
    if (error) return { ok: false, message: message(error, "Couldn't save the questions. Try again.") };
  }
  return { ok: true, id };
}

/** A form leaves the lists (archived_at); answers already sent stay readable. */
export async function archiveForm(formId: string): Promise<Write> {
  const { error } = await from("forms").update({ archived_at: new Date().toISOString() } as never).eq("id", formId);
  return error ? { ok: false, message: message(error, "Couldn't remove the form. Try again.") } : { ok: true };
}

/** The built-in Weekly check-in, copied into your forms with its safety questions marked. */
export async function createWeeklyCheckIn(): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const { data, error } = await rpc("create_weekly_check_in_template");
  if (error || typeof data !== "string") return { ok: false, message: message(error, "Couldn't add the template. Try again.") };
  return { ok: true, id: data };
}

/** One form sent now (dueAt), or a schedule started (schedule). */
export async function assignForm(formId: string, clientId: string, dueAt: string | null, schedule: string | null): Promise<Write> {
  const { error } = await rpc("assign_form", { p_form_id: formId, p_client_id: clientId, p_due_at: dueAt, p_schedule: schedule });
  return error ? { ok: false, message: message(error, "Couldn't send the form. Try again.") } : { ok: true };
}

export async function cancelAssignment(assignmentId: string): Promise<Write> {
  const { error } = await rpc("cancel_form_assignment", { p_assignment_id: assignmentId });
  return error ? { ok: false, message: message(error, "Couldn't stop it. Try again.") } : { ok: true };
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export interface FormResponse {
  id: string;
  assignmentId: string;
  formId: string;
  formTitle: string;
  formKind: FormKind;
  clientId: string;
  answers: Record<string, unknown>;
  submittedAt: string;
  reviewedAt: string | null;
  reply: string | null;
  safetyFlag: boolean;
  safetyTopics: string[];
}

interface ResponseRow {
  id: string;
  assignment_id: string;
  client_id: string;
  answers: unknown;
  submitted_at: string;
  reviewed_at: string | null;
  reply: string | null;
  safety_flag: boolean;
  safety_topics: string[] | null;
  form_assignments: { form_id: string; forms: { title: string; kind: FormKind } | null } | null;
}

const R_COLS = "id, assignment_id, client_id, answers, submitted_at, reviewed_at, reply, safety_flag, safety_topics, form_assignments(form_id, forms(title, kind))";

const mapResponse = (r: ResponseRow): FormResponse => ({
  id: r.id,
  assignmentId: r.assignment_id,
  formId: r.form_assignments?.form_id ?? "",
  formTitle: r.form_assignments?.forms?.title ?? "Form",
  formKind: r.form_assignments?.forms?.kind ?? "check_in",
  clientId: r.client_id,
  answers: r.answers && typeof r.answers === "object" && !Array.isArray(r.answers) ? (r.answers as Record<string, unknown>) : {},
  submittedAt: r.submitted_at,
  reviewedAt: r.reviewed_at,
  reply: r.reply,
  safetyFlag: r.safety_flag,
  safetyTopics: r.safety_topics ?? [],
});

/** Submitted responses sent to me, newest first (one client, or every client). */
export async function fetchResponses(me: string, opts: { clientId?: string; formId?: string; unreviewed?: boolean; limit?: number } = {}): Promise<Read<FormResponse[]>> {
  let q = from("form_responses").select(R_COLS).eq("professional_id", me).not("submitted_at", "is", null);
  if (opts.clientId) q = q.eq("client_id", opts.clientId);
  if (opts.unreviewed) q = q.is("reviewed_at", null);
  const { data, error } = await q.order("submitted_at", { ascending: false }).limit(opts.limit ?? 200);
  if (error) return readFail(error);
  let list = ((data ?? []) as unknown as ResponseRow[]).map(mapResponse);
  if (opts.formId) list = list.filter((r) => r.formId === opts.formId);
  return { ok: true, data: list };
}

export async function fetchResponse(responseId: string): Promise<Read<{ response: FormResponse; questions: (QuestionDraft & { position: number })[] } | null>> {
  const { data, error } = await from("form_responses").select(R_COLS).eq("id", responseId).maybeSingle();
  if (error) return readFail(error);
  if (!data) return { ok: true, data: null };
  const response = mapResponse(data as unknown as ResponseRow);
  const q = await from("form_questions").select(Q_COLS).eq("form_id", response.formId).order("position");
  if (q.error) return readFail(q.error);
  return { ok: true, data: { response, questions: ((q.data ?? []) as unknown as QuestionRow[]).map((r) => ({ ...fromRow(r), position: r.position })) } };
}

/** The questions of several forms at once (CL11 reads every check-in form a client answered). */
export async function fetchQuestions(formIds: string[]): Promise<Read<Record<string, (QuestionDraft & { position: number })[]>>> {
  if (!formIds.length) return { ok: true, data: {} };
  const { data, error } = await from("form_questions").select(`form_id, ${Q_COLS}`).in("form_id", formIds).order("position");
  if (error) return readFail(error);
  const out: Record<string, (QuestionDraft & { position: number })[]> = {};
  for (const r of (data ?? []) as unknown as (QuestionRow & { form_id: string })[]) (out[r.form_id] ??= []).push({ ...fromRow(r), position: r.position });
  return { ok: true, data: out };
}

export async function reviewResponse(responseId: string, reply: string): Promise<Write> {
  const { error } = await rpc("review_form_response", { p_response_id: responseId, p_reply: reply.trim() || null });
  return error ? { ok: false, message: message(error, "Couldn't mark it as reviewed. Try again.") } : { ok: true };
}

/** Signed URLs for photo answers (form-uploads, the assigning professional may read them). */
export async function photoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from("form-uploads").createSignedUrls(paths, 600);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const d of data) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

/** The client's latest intake response to me (CL10), or null. */
export async function fetchLatestIntake(me: string, clientId: string): Promise<Read<FormResponse | null>> {
  const r = await fetchResponses(me, { clientId, limit: 50 });
  if (!r.ok) return r;
  return { ok: true, data: r.data.find((x) => x.formKind === "intake") ?? null };
}

/** The hub's To review rows for this response are done (the owner may set read_at). */
export async function markResponseRead(responseId: string): Promise<void> {
  await supabase.from("professional_notifications").update({ read_at: new Date().toISOString() }).eq("subject_type", "form_response").eq("subject_id", responseId).is("read_at", null);
}

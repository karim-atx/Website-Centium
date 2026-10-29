// Release 3 · W6 Forms and check-ins (MO29, HO20, CL10, CL11) on the
// Database HANDOVER_API.md DB-6 contract (20261124060000):
// - forms (kind intake / check_in, title, archived_at) and form_questions
//   (type, prompt, unit, required, options, scale_min / scale_max,
//   safety_topic, safety_trigger): the owner writes them through RLS, gated
//   by can_write_form(kind) (every lane, clinical check-ins included since
//   Round D, 20261222050000);
// - Round D (20261222050000): forms.description and send_on_hire (assigned
//   when someone hires the professional); form_questions.section_title,
//   show_if (one condition on an earlier question, 22023 otherwise) and
//   profile_field; type long_text; schedules every2weeks / every4weeks;
// - Round D (20261222060000): list_form_templates() and use_form_template(
//   p_key) → the new form's id (ATX08 not available, ATX09 another lane);
// - 20261222080000 (the approved templates): form_responses.urgent (an
//   urgent answer was sent; safety_flag is set with it) and
//   form_response_notes(p_response_id), the notes a response's answers
//   trigger, for the professional only. The new form_questions columns come
//   with a template; saveForm never writes them (toRow sends the builder's own);
// - assign_form(p_form_id, p_client_id, p_due_at, p_schedule) sends one form
//   (due_at) or starts a schedule (daily@HH:MM / weekly:<1-7>@HH:MM /
//   every2weeks:… / every4weeks:…, the client's local time);
//   cancel_form_assignment stops it;
// - form_responses: the professional reads a response once it's submitted,
//   for that response only (decision 6); review_form_response(p_response_id,
//   p_reply) marks it reviewed and tells the client;
// - photo answers live in the private form-uploads bucket under
//   {client}/{assignment}/…, readable by the assigning professional.

import { supabase } from "../../../lib/supabase/client";
import { parseConfirmedAnswers, type ConfirmedAnswer } from "../client-forms/proposals";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";
import type { Read, Write } from "./clients";
import { parseResponseNotes, type ResponseNote } from "../../components/pro/forms/reviewModel";
import { diffQuestions, fromRow, isLocalKey, showIfRow, toRow, type FormAssignment, type FormKind, type FormSummary, type FormTemplate, type QuestionDraft, type QuestionRow } from "../../components/pro/forms/formModel";

export type { FormAssignment, FormSummary, FormTemplate };

const from = (table: string) => supabase.from(table as never);
const readFail = (error: unknown) => ({ ok: false as const, offline: isOffline(error) });

function message(error: unknown, fallback: string): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const code = (error as { code?: string } | null)?.code;
  if (code === "ATX12") return "That person isn't your client any more.";
  if (code === "ATX09") return "Only professionals can send forms.";
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
    from("forms").select("id, kind, title, updated_at, send_on_hire, form_questions(count)").eq("professional_id", me).is("archived_at", null).order("created_at", { ascending: true }),
    from("form_assignments").select("id, form_id, client_id, schedule, due_at, status, series_id").eq("professional_id", me).in("status", ["series", "due", "submitted", "missed"]),
  ]);
  if (f.error) return readFail(f.error);
  if (a.error) return readFail(a.error);
  const forms = ((f.data ?? []) as unknown as { id: string; kind: FormKind; title: string; updated_at: string; send_on_hire: boolean | null; form_questions: { count: number }[] }[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    questionCount: r.form_questions?.[0]?.count ?? 0,
    updatedAt: r.updated_at,
    sendOnHire: r.send_on_hire === true,
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
  /** "" when there's none. */
  description: string;
  sendOnHire: boolean;
  questions: QuestionDraft[];
  assignments: FormAssignment[];
}

// recovery_options, pro_note and client_prompt are read only, to lock the answers they name (never written by the builder).
const Q_COLS = "id, position, type, prompt, unit, required, options, scale_min, scale_max, safety_topic, safety_trigger, section_title, show_if, profile_field, recovery_options, pro_note, client_prompt";

export async function fetchForm(formId: string): Promise<Read<FormDetail | null>> {
  const [f, q, a] = await Promise.all([
    from("forms").select("id, kind, title, description, send_on_hire, archived_at").eq("id", formId).maybeSingle(),
    from("form_questions").select(Q_COLS).eq("form_id", formId).order("position"),
    from("form_assignments").select("id, form_id, client_id, schedule, due_at, status, series_id").eq("form_id", formId).in("status", ["series", "due", "submitted", "missed"]),
  ]);
  if (f.error) return readFail(f.error);
  if (q.error) return readFail(q.error);
  if (a.error) return readFail(a.error);
  const row = f.data as unknown as { id: string; kind: FormKind; title: string; description: string | null; send_on_hire: boolean | null; archived_at: string | null } | null;
  if (!row || row.archived_at) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      id: row.id,
      kind: row.kind,
      title: row.title,
      description: row.description ?? "",
      sendOnHire: row.send_on_hire === true,
      questions: ((q.data ?? []) as unknown as QuestionRow[]).map(fromRow),
      assignments: ((a.data ?? []) as unknown as AssignmentRow[]).map(mapAssignment),
    },
  };
}

export interface FormFields {
  kind: FormKind;
  title: string;
  description: string;
  sendOnHire: boolean;
}

const QUESTIONS_FAILED = "Couldn't save the questions. Try again.";
/** 22023 from the questions guard: a condition or profile field that doesn't fit. */
const questionsMessage = (error: unknown) =>
  (error as { code?: string } | null)?.code === "22023" ? "A condition or profile field doesn't fit its question. Check the questions and try again." : message(error, QUESTIONS_FAILED);

/**
 * Saves a form: a new one is inserted first; then its questions are brought
 * in line with the draft (deletes, updates in order, inserts). A condition on
 * a question that was new in this save names it by its new id in a second
 * pass, once the insert has returned the ids. Returns the form id.
 */
export async function saveForm(me: string, formId: string | null, fields: FormFields, saved: QuestionDraft[], draft: QuestionDraft[]): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  let id = formId;
  const columns = { title: fields.title.trim(), description: fields.description.trim() || null, send_on_hire: fields.sendOnHire };
  if (!id) {
    const { data, error } = await from("forms").insert({ professional_id: me, kind: fields.kind, ...columns } as never).select("id").single();
    if (error) return { ok: false, message: message(error, "Couldn't save the form. Try again.") };
    id = (data as unknown as { id: string }).id;
  } else {
    const { error } = await from("forms").update(columns as never).eq("id", id);
    if (error) return { ok: false, message: message(error, "Couldn't save the form. Try again.") };
  }
  const d = diffQuestions(saved, draft);
  if (d.remove.length) {
    const { error } = await from("form_questions").delete().in("id", d.remove);
    if (error) return { ok: false, message: message(error, QUESTIONS_FAILED) };
  }
  for (const u of d.update) {
    const { error } = await from("form_questions").update(toRow(u.q, u.index) as never).eq("id", u.id);
    if (error) return { ok: false, message: questionsMessage(error) };
  }
  const ids = new Map<string, string>();
  if (d.insert.length) {
    const { data, error } = await from("form_questions").insert(d.insert.map((x) => ({ form_id: id, ...toRow(x.q, x.index) })) as never).select("id, position");
    if (error) return { ok: false, message: questionsMessage(error) };
    const byPosition = new Map(((data ?? []) as unknown as { id: string; position: number }[]).map((r) => [r.position, r.id]));
    for (const x of d.insert) {
      const newId = byPosition.get(x.index);
      if (newId) ids.set(x.q.id, newId);
    }
  }
  // The second pass: conditions on questions that only now have an id.
  for (const q of draft) {
    if (!q.showIf || !isLocalKey(q.showIf.questionId)) continue;
    const rowId = isLocalKey(q.id) ? ids.get(q.id) : q.id;
    if (!rowId) continue;
    const { error } = await from("form_questions").update({ show_if: showIfRow(q.showIf, ids) } as never).eq("id", rowId);
    if (error) return { ok: false, message: questionsMessage(error) };
  }
  return { ok: true, id };
}

/** "Automatically when someone hires you" (forms.send_on_hire), written at once from the Sending sheet. */
export async function setSendOnHire(formId: string, on: boolean): Promise<Write> {
  const { error } = await from("forms").update({ send_on_hire: on } as never).eq("id", formId);
  return error ? { ok: false, message: message(error, "Couldn't change when it's sent. Try again.") } : { ok: true };
}

/** A form leaves the lists (archived_at); answers already sent stay readable. */
export async function archiveForm(formId: string): Promise<Write> {
  const { error } = await from("forms").update({ archived_at: new Date().toISOString() } as never).eq("id", formId);
  return error ? { ok: false, message: message(error, "Couldn't remove the form. Try again.") } : { ok: true };
}

// ---------------------------------------------------------------------------
// Templates (Round D, 20261222060000)
// ---------------------------------------------------------------------------

interface TemplateRow {
  key: string;
  lane: string;
  kind: FormKind;
  title: string;
  description: string | null;
  question_count: number | null;
  available: boolean | null;
}

/** The templates for my lane and every lane, in the Database's order. */
export async function listFormTemplates(): Promise<Read<FormTemplate[]>> {
  const { data, error } = await rpc("list_form_templates");
  if (error) return readFail(error);
  return {
    ok: true,
    data: ((data ?? []) as TemplateRow[]).map((r) => ({
      key: r.key,
      lane: r.lane,
      kind: r.kind,
      title: r.title,
      description: r.description,
      questionCount: r.question_count ?? 0,
      available: r.available === true,
    })),
  };
}

/** Copies an available template into a form of my own (questions, sections, conditions, profile fields). */
export async function copyFormTemplate(key: string): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const { data, error } = await rpc("use_form_template", { p_key: key });
  if (error || typeof data !== "string") {
    const code = (error as { code?: string } | null)?.code;
    if (code === "ATX08") return { ok: false, message: "This template isn't available yet." };
    if (code === "ATX09") return { ok: false, message: "This template isn't for your practice." };
    return { ok: false, message: message(error, "Couldn't add the template. Try again.") };
  }
  return { ok: true, id: data };
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

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
  /** form_responses.urgent (20261222080000): an urgent answer was sent. */
  urgent: boolean;
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
  urgent: boolean | null;
  form_assignments: { form_id: string; forms: { title: string; kind: FormKind } | null } | null;
}

const R_COLS = "id, assignment_id, client_id, answers, submitted_at, reviewed_at, reply, safety_flag, safety_topics, urgent, form_assignments(form_id, forms(title, kind))";

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
  urgent: r.urgent === true,
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

/**
 * The carried answers the client confirmed into their profile
 * (form_response_confirmed_answers, 20261222070000), as confirmed, in
 * question order. Never a pending or declined one; each field needs the
 * consent its profile row needs, so a missing consent simply gives no row.
 * A failed read shows no box.
 */
export async function fetchConfirmedAnswers(responseId: string): Promise<ConfirmedAnswer[]> {
  const { data, error } = await rpc("form_response_confirmed_answers", { p_response_id: responseId });
  if (error) {
    if (!isOffline(error)) console.error("[forms] form_response_confirmed_answers failed:", error.code, error.message);
    return [];
  }
  return parseConfirmedAnswers(data);
}

/**
 * The notes this response's answers trigger (form_response_notes,
 * 20261222080000), urgent ones first. Only the professional it was sent to
 * reads them; the client never does. A failed read shows no notes.
 */
export async function fetchResponseNotes(responseId: string): Promise<ResponseNote[]> {
  const { data, error } = await rpc("form_response_notes", { p_response_id: responseId });
  if (error) {
    if (!isOffline(error)) console.error("[forms] form_response_notes failed:", error.code, error.message);
    return [];
  }
  return parseResponseNotes(data);
}

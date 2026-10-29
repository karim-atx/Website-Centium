// Release 3 · W7 the client's side of a professional's forms, care referrals
// and today's sessions (CU5, CU6, CU23, CU26), on the Database DB-6 contract:
// - form_assignments (select own: client_id = me), forms (select when
//   assigned to me), form_questions (select through forms), form_responses
//   (select own, drafts included);
// - save_form_response(p_assignment_id, p_answers, p_submit, p_consent)
//   returns the form_responses row; ATXG9 once sent, 22023 "please answer: …"
//   when a required answer is missing on submit, 22023 "consent_required: …"
//   when a submit carries no consent (Release A, 20261216060000; a draft never
//   sends it), ATX08 when the form isn't open;
// - photo answers go to the private form-uploads bucket at
//   {me}/{assignment}/{file} (images only, 10 MB);
// - care_referrals (select own: client_id = me); answer_care_referral(
//   p_referral_id, p_agree); ATX08 once it isn't waiting any more. Release A:
//   once the receiver accepts, connect_from_referral(p_referral_id,
//   p_categories) is the client's own second decision (ATX08 otherwise).
//   decline_reason is never read here: the client isn't told why;
// - appointments (select own) with staff_id = the professional, status booked;
// - first names from public_profile_summary (professionals and businesses).
// - Round D (20261222050000): forms.description; form_questions.section_title,
//   show_if and profile_field; on submit, answers to questions with a profile
//   field become proposals the client confirms one by one
//   (my_form_profile_proposals(p_response_id), confirm_form_profile_proposal(
//   p_proposal_id, p_value), decline_form_profile_proposal(p_proposal_id);
//   ATXL2 a weight in recovery-sensitive mode, ATX10 already decided, ATX08
//   not theirs, 22023 an invalid value).
// Pure rules live in ./logic and ./proposals.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { parseShowIfRule, type Answers, type ClientQuestion, type ConnectReferral, type FormKind, type PendingReferral, type QuestionType, type TodaySession } from "./logic";
import { asProposalField, type ProfileProposal, type ProposalStatus } from "./proposals";
import type { AccessCategory } from "../consent";

export type Read<T> = { ok: true; data: T } | { ok: false; offline: boolean };

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
const rpcClient = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult> };
const from = (table: string) => supabase.from(table as never);
const readFail = (error: unknown) => ({ ok: false as const, offline: isOffline(error) });

export interface ClientFormBundle {
  assignmentId: string;
  formId: string;
  kind: FormKind;
  title: string;
  /** Round D: shown above the questions ("" when none). */
  description: string;
  dueAt: string | null;
  status: "due" | "missed";
  proId: string;
  proName: string;
  proAvatarUrl: string | null;
  /** Every question of the form, by position (the recovery filter is applied by the caller). */
  questions: ClientQuestion[];
  /** The saved draft's answers ({} when none). */
  answers: Answers;
  hasDraft: boolean;
  /** The schedule of the series this check-in belongs to (for "Next check-in"). */
  schedule: string | null;
}

interface AssignmentRow { id: string; form_id: string; professional_id: string; series_id: string | null; due_at: string | null; status: "due" | "missed" }
interface FormRow { id: string; kind: FormKind; title: string; description: string | null }
interface QuestionRow { id: string; form_id: string; position: number; type: QuestionType; prompt: string; unit: string | null; required: boolean; options: unknown; scale_min: number | null; scale_max: number | null; safety_topic: string | null; safety_trigger: unknown; section_title: string | null; show_if: unknown; profile_field: string | null }
interface ResponseRow { assignment_id: string; answers: unknown; submitted_at: string | null }
interface NameRow { id: string; first_name: string | null; avatar_url: string | null }

const toQuestion = (r: QuestionRow): ClientQuestion => ({
  id: r.id,
  position: r.position,
  type: r.type,
  prompt: r.prompt,
  unit: r.unit,
  required: r.required,
  options: Array.isArray(r.options) ? r.options.map((o) => String(o)) : null,
  scaleMin: r.scale_min,
  scaleMax: r.scale_max,
  safetyTopic: r.safety_topic,
  safetyTrigger: r.safety_trigger && typeof r.safety_trigger === "object" && !Array.isArray(r.safety_trigger) ? (r.safety_trigger as Record<string, unknown>) : null,
  sectionTitle: r.section_title,
  showIf: parseShowIfRule(r.show_if),
  profileField: r.profile_field,
});

async function namesOf(ids: string[]): Promise<Map<string, NameRow>> {
  const out = new Map<string, NameRow>();
  if (!ids.length) return out;
  const { data } = await from("public_profile_summary").select("id, first_name, avatar_url").in("id", ids);
  for (const r of (data ?? []) as unknown as NameRow[]) out.set(r.id, r);
  return out;
}

const nameOr = (m: Map<string, NameRow>, id: string, fallback: string) => m.get(id)?.first_name?.trim() || fallback;

/** The forms waiting for me (due or missed, not sent), with their questions and any saved draft. */
export async function fetchMyOpenForms(me: string): Promise<Read<ClientFormBundle[]>> {
  const a = await from("form_assignments").select("id, form_id, professional_id, series_id, due_at, status").eq("client_id", me).in("status", ["due", "missed"]).order("due_at", { ascending: true });
  if (a.error) return readFail(a.error);
  const assignments = (a.data ?? []) as unknown as AssignmentRow[];
  if (!assignments.length) return { ok: true, data: [] };

  const formIds = [...new Set(assignments.map((x) => x.form_id))];
  const seriesIds = [...new Set(assignments.map((x) => x.series_id).filter((x): x is string => !!x))];
  const [f, q, r, s, names] = await Promise.all([
    from("forms").select("id, kind, title, description").in("id", formIds),
    from("form_questions").select("id, form_id, position, type, prompt, unit, required, options, scale_min, scale_max, safety_topic, safety_trigger, section_title, show_if, profile_field").in("form_id", formIds).order("position", { ascending: true }),
    from("form_responses").select("assignment_id, answers, submitted_at").eq("client_id", me).in("assignment_id", assignments.map((x) => x.id)),
    seriesIds.length ? from("form_assignments").select("id, schedule").in("id", seriesIds) : Promise.resolve({ data: [], error: null }),
    namesOf([...new Set(assignments.map((x) => x.professional_id))]),
  ]);
  if (f.error) return readFail(f.error);
  if (q.error) return readFail(q.error);
  if (r.error) return readFail(r.error);
  const forms = new Map(((f.data ?? []) as unknown as FormRow[]).map((x) => [x.id, x]));
  const questions = new Map<string, ClientQuestion[]>();
  for (const row of (q.data ?? []) as unknown as QuestionRow[]) {
    const list = questions.get(row.form_id) ?? [];
    list.push(toQuestion(row));
    questions.set(row.form_id, list);
  }
  const responses = new Map(((r.data ?? []) as unknown as ResponseRow[]).map((x) => [x.assignment_id, x]));
  const schedules = new Map(((s.data ?? []) as unknown as { id: string; schedule: string | null }[]).map((x) => [x.id, x.schedule]));

  const data: ClientFormBundle[] = [];
  for (const x of assignments) {
    const form = forms.get(x.form_id);
    const resp = responses.get(x.id);
    if (!form || resp?.submitted_at) continue;
    const answers = resp && resp.answers && typeof resp.answers === "object" && !Array.isArray(resp.answers) ? (resp.answers as Answers) : {};
    data.push({
      assignmentId: x.id,
      formId: x.form_id,
      kind: form.kind,
      title: form.title,
      description: form.description?.trim() ?? "",
      dueAt: x.due_at,
      status: x.status,
      proId: x.professional_id,
      proName: nameOr(names, x.professional_id, "Your professional"),
      proAvatarUrl: names.get(x.professional_id)?.avatar_url ?? null,
      questions: questions.get(x.form_id) ?? [],
      answers,
      hasDraft: !!resp,
      schedule: x.series_id ? schedules.get(x.series_id) ?? null : null,
    });
  }
  return { ok: true, data };
}

export interface SavedResponse {
  id: string;
  safety_flag: boolean;
  safety_topics: string[];
  submitted_at: string | null;
}

export type SaveResult = { ok: true; row: SavedResponse } | { ok: false; code: "sent" | "missing" | "consent" | "closed" | "offline" | "other"; message: string; missing?: string };

/** The consent_required refusal in the app's words: the box above Send wasn't ticked. */
export const CONSENT_REQUIRED_MESSAGE = "Tick the box to share these answers before you send them.";

/**
 * save_form_response: p_submit false keeps a draft ("Save, come back later"),
 * true sends it. Release A: a submit carries the client's consent (p_consent,
 * the box above Send). A draft never sends p_consent at all: a draft is the
 * client's own and the professional can't read it, so the database asks on
 * submit only and stamps consent_at once.
 */
export async function saveFormResponse(assignmentId: string, answers: Answers, submit: false): Promise<SaveResult>;
export async function saveFormResponse(assignmentId: string, answers: Answers, submit: true, consent: boolean): Promise<SaveResult>;
export async function saveFormResponse(assignmentId: string, answers: Answers, submit: boolean, consent?: boolean): Promise<SaveResult> {
  const args: Record<string, unknown> = { p_assignment_id: assignmentId, p_answers: answers, p_submit: submit };
  if (submit) args.p_consent = consent === true;
  const { data, error } = await rpcClient.rpc("save_form_response", args);
  if (error) {
    if (isOffline(error)) return { ok: false, code: "offline", message: OFFLINE_MESSAGE };
    if (error.code === "ATXG9") return { ok: false, code: "sent", message: "This form has already been sent." };
    if (error.code === "ATX08") return { ok: false, code: "closed", message: "This form isn't open any more." };
    // The same SQLSTATE as a missing answer, told apart by the word the database leads with.
    if (error.code === "22023" && error.message.startsWith("consent_required")) return { ok: false, code: "consent", message: CONSENT_REQUIRED_MESSAGE };
    if (error.code === "22023") {
      const m = /please answer: (.*)$/.exec(error.message);
      return { ok: false, code: "missing", message: "Some required answers are missing.", missing: m?.[1] };
    }
    return { ok: false, code: "other", message: "Couldn't save your answers. Try again." };
  }
  const row = (data ?? {}) as Partial<SavedResponse>;
  return { ok: true, row: { id: String(row.id ?? ""), safety_flag: row.safety_flag === true, safety_topics: Array.isArray(row.safety_topics) ? row.safety_topics : [], submitted_at: row.submitted_at ?? null } };
}

// ---------------------------------------------------------------------------
// Round D: answers carried into the profile, confirmed one by one
// ---------------------------------------------------------------------------

interface ProposalRow { proposal_id: string; response_id: string; question_prompt: string | null; field: string; suggested: unknown; status: ProposalStatus }

/** This response's proposals (all statuses; the step offers the pending ones). */
/** One response's proposals, or every one the client has (null). */
export async function fetchProfileProposals(responseId: string | null): Promise<Read<ProfileProposal[]>> {
  const { data, error } = await rpcClient.rpc("my_form_profile_proposals", { p_response_id: responseId });
  if (error) return readFail(error);
  const out: ProfileProposal[] = [];
  for (const r of (data ?? []) as ProposalRow[]) {
    const field = asProposalField(r.field);
    if (!field) continue;
    const suggested = r.suggested && typeof r.suggested === "object" && !Array.isArray(r.suggested) ? (r.suggested as Record<string, unknown>) : {};
    out.push({ id: r.proposal_id, responseId: r.response_id, prompt: r.question_prompt ?? "", field, suggested, status: r.status });
  }
  return { ok: true, data: out };
}

export type ProposalResult = { ok: true } | { ok: false; message: string; gone?: boolean };

function proposalFail(error: { code?: string; message: string }, fallback: string): ProposalResult {
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "ATXL2") return { ok: false, message: "Weight isn't added while recovery-sensitive mode is on.", gone: true };
  if (error.code === "ATX10") return { ok: false, message: "You already decided this one.", gone: true };
  if (error.code === "ATX08") return { ok: false, message: "This isn't available any more.", gone: true };
  if (error.code === "22023") return { ok: false, message: "Check the details and try again." };
  return { ok: false, message: fallback };
}

/** Adds one carried answer to the profile, as the client edited it (p_value). */
export async function confirmProfileProposal(id: string, value: Record<string, unknown>): Promise<ProposalResult> {
  const { error } = await rpcClient.rpc("confirm_form_profile_proposal", { p_proposal_id: id, p_value: value });
  return error ? proposalFail(error, "Couldn't add it. Try again.") : { ok: true };
}

/** Leaves one carried answer out: nothing is written. */
export async function declineProfileProposal(id: string): Promise<ProposalResult> {
  const { error } = await rpcClient.rpc("decline_form_profile_proposal", { p_proposal_id: id });
  return error ? proposalFail(error, "Couldn't skip it. Try again.") : { ok: true };
}

const FORM_UPLOADS = "form-uploads";

/** Uploads one photo for a photo answer; returns its storage path. */
export async function uploadFormPhoto(me: string, assignmentId: string, file: File): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${me}/${assignmentId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(FORM_UPLOADS).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't add that photo. Use a JPEG, PNG or HEIC under 10 MB." };
  return { ok: true, path };
}

export async function removeFormPhoto(path: string): Promise<void> {
  await supabase.storage.from(FORM_UPLOADS).remove([path]);
}

export async function formPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase.storage.from(FORM_UPLOADS).createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const r of data ?? []) if (r.path && r.signedUrl) out[r.path] = r.signedUrl;
  return out;
}

interface ReferralRow { id: string; from_professional: string; to_professional: string; reason: string; created_at: string }

/** Care referrals waiting for my answer (CU23). The receiving professional sees nothing before it. */
export async function fetchMyPendingReferrals(me: string): Promise<Read<PendingReferral[]>> {
  const { data, error } = await from("care_referrals").select("id, from_professional, to_professional, reason, created_at").eq("client_id", me).eq("status", "awaiting_client").order("created_at", { ascending: true });
  if (error) return readFail(error);
  const rows = (data ?? []) as unknown as ReferralRow[];
  const names = await namesOf([...new Set(rows.flatMap((r) => [r.from_professional, r.to_professional]))]);
  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      fromId: r.from_professional,
      fromName: nameOr(names, r.from_professional, "Your professional"),
      toName: names.get(r.to_professional)?.first_name?.trim() || null,
      reason: r.reason,
      createdAt: r.created_at,
    })),
  };
}

export async function answerCareReferral(referralId: string, agree: boolean): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await rpcClient.rpc("answer_care_referral", { p_referral_id: referralId, p_agree: agree });
  if (!error) return { ok: true };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "ATX08") return { ok: false, message: "This referral isn't waiting for your answer any more." };
  return { ok: false, message: "Couldn't send your answer. Try again." };
}

/**
 * Release A (20261216060000, CU23): a referral the receiving professional
 * accepted, waiting for the client's own second decision. Accepting connects
 * nobody: the client connects themselves with connect_from_referral and picks
 * what to share. Waiting while there's no link to that professional made
 * since the answer (a link made later, even if ended since, means they
 * already decided, so an ended relationship never asks again).
 */
export async function fetchMyAcceptedReferrals(me: string): Promise<Read<ConnectReferral[]>> {
  const { data, error } = await from("care_referrals").select("id, from_professional, to_professional, reason, created_at, responded_at").eq("client_id", me).eq("status", "accepted").order("responded_at", { ascending: true });
  if (error) return readFail(error);
  const rows = (data ?? []) as unknown as (ReferralRow & { responded_at: string | null })[];
  if (!rows.length) return { ok: true, data: [] };
  const links = await from("professional_clients").select("professional_id, created_at, disconnected_at").eq("client_id", me).in("professional_id", [...new Set(rows.map((r) => r.to_professional))]);
  if (links.error) return readFail(links.error);
  const linkRows = (links.data ?? []) as unknown as { professional_id: string; created_at: string; disconnected_at: string | null }[];
  const waiting = rows.filter((r) => !linkRows.some((l) => l.professional_id === r.to_professional && (!l.disconnected_at || (r.responded_at !== null && Date.parse(l.created_at) >= Date.parse(r.responded_at)))));
  const names = await namesOf([...new Set(waiting.flatMap((r) => [r.from_professional, r.to_professional]))]);
  return {
    ok: true,
    data: waiting.map((r) => ({
      id: r.id,
      fromId: r.from_professional,
      fromName: nameOr(names, r.from_professional, "Your professional"),
      toId: r.to_professional,
      toName: names.get(r.to_professional)?.first_name?.trim() || null,
      respondedAt: r.responded_at ?? r.created_at,
    })),
  };
}

/**
 * connect_from_referral(p_referral_id, p_categories): the client becomes the
 * receiving professional's client and shares exactly the categories picked
 * (an empty list shares nothing). ATX08 once it isn't an accepted referral
 * of theirs any more.
 */
export async function connectFromReferral(referralId: string, categories: AccessCategory[]): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await rpcClient.rpc("connect_from_referral", { p_referral_id: referralId, p_categories: categories });
  if (!error) return { ok: true };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "ATX08") return { ok: false, message: "This referral can't be used to connect any more." };
  return { ok: false, message: "Couldn't connect. Try again." };
}

interface AppointmentRow { id: string; staff_id: string | null; service_name: string; starts_at: string; ends_at: string }

/** Today's booked sessions with a professional (CU5 "session coming up", CU23 level 1). */
export async function fetchTodaySessions(me: string, now: Date): Promise<Read<TodaySession[]>> {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const { data, error } = await from("appointments")
    .select("id, staff_id, service_name, starts_at, ends_at")
    .eq("client_id", me)
    .eq("status", "booked")
    .is("business_id", null)
    .not("staff_id", "is", null)
    .gt("ends_at", now.toISOString())
    .lt("starts_at", end)
    .order("starts_at", { ascending: true });
  if (error) return readFail(error);
  const rows = (data ?? []) as unknown as AppointmentRow[];
  const names = await namesOf([...new Set(rows.map((r) => r.staff_id!))]);
  return {
    ok: true,
    data: rows.map((r) => ({ id: r.id, proId: r.staff_id!, proName: nameOr(names, r.staff_id!, "your professional"), serviceName: r.service_name, startsAt: r.starts_at, endsAt: r.ends_at })),
  };
}

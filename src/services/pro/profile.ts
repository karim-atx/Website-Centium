// Release 3 · W6 Profile, public profile, services and where you work (MO3,
// MO4, MO5, MO6, MO8, MO14, MO15, MO16, MO20, MO26): the readers and writers
// the professional's own profile screens need beyond the CV
// (services/professional-cv), the listing row (services/professional-profile)
// and the session types (services/pro/calendar). Every name is checked against
// the local stack (Database HANDOVER_API "Release 3" DB-1, DB-4, DB-6):
//
// - set_my_handle(p_handle) → text. 22023 format, ATXG2 once every 30 days,
//   ATXB6 (or 23505) taken in the one namespace handles share with business
//   slugs, or a reserved word. handle is outside the UPDATE grant.
// - request_professional_type_change(p_type, p_note) → uuid; 22023 for the
//   same type or a pending request; professional_type_change_requests is
//   readable by its owner (select_own).
// - professional_plans: the column grant includes session_count (1 to 200).
// - appointment_services: a pro row (professional_id, business_id null) with
//   description (≤ 500).
// - my_business_employments() → business_id, business_name, accepted_at,
//   invited_at.
// - professional_profiles: specialties (≤ 5), work_mode (in_person, online,
//   both), home_visit_km (> 0, ≤ 200) are in the UPDATE grant.

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";
import { detailDate } from "../../utils/date";
import type { Read, Write } from "./clients";
import type { ProfessionalSubtype } from "../../types";
import { validatePlanDraft, type PlanBilling, type PlanDraft } from "../hires/proLogic";

const from = (table: string) => supabase.from(table as never);
const readFail = (error: unknown) => ({ ok: false as const, offline: isOffline(error) });
const failed = (error: unknown, fallback: string): Write => ({ ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : fallback });

// ---------------------------------------------------------------------------
// The professional_profiles facts these screens read
// ---------------------------------------------------------------------------

export type WorkModeDb = "in_person" | "online" | "both";

export interface ProfileFacts {
  exists: boolean;
  handle: string | null;
  handleChangedAt: string | null;
  specialties: string[];
  workMode: WorkModeDb | null;
  homeVisitKm: number | null;
  listedPublicly: boolean;
  affiliatedBusinessId: string | null;
  paymentModalities: string[];
  monthlyRate: number | null;
  consultationRate: number | null;
  bio: string | null;
}

const EMPTY_FACTS: ProfileFacts = {
  exists: false,
  handle: null,
  handleChangedAt: null,
  specialties: [],
  workMode: null,
  homeVisitKm: null,
  listedPublicly: false,
  affiliatedBusinessId: null,
  paymentModalities: [],
  monthlyRate: null,
  consultationRate: null,
  bio: null,
};

export async function fetchProfileFacts(me: string): Promise<Read<ProfileFacts>> {
  try {
    const { data, error } = await from("professional_profiles")
      .select("handle, handle_changed_at, specialties, work_mode, home_visit_km, listed_publicly, affiliated_business_id, payment_modalities, monthly_rate, consultation_rate, bio")
      .eq("profile_id", me)
      .maybeSingle();
    if (error) return readFail(error);
    const r = data as unknown as {
      handle: string | null;
      handle_changed_at: string | null;
      specialties: string[] | null;
      work_mode: WorkModeDb | null;
      home_visit_km: number | string | null;
      listed_publicly: boolean;
      affiliated_business_id: string | null;
      payment_modalities: string[] | null;
      monthly_rate: number | string | null;
      consultation_rate: number | string | null;
      bio: string | null;
    } | null;
    if (!r) return { ok: true, data: EMPTY_FACTS };
    const num = (v: number | string | null) => (v === null || v === undefined ? null : Number(v));
    return {
      ok: true,
      data: {
        exists: true,
        handle: r.handle,
        handleChangedAt: r.handle_changed_at,
        specialties: r.specialties ?? [],
        workMode: r.work_mode,
        homeVisitKm: num(r.home_visit_km),
        listedPublicly: r.listed_publicly,
        affiliatedBusinessId: r.affiliated_business_id,
        paymentModalities: r.payment_modalities ?? [],
        monthlyRate: num(r.monthly_rate),
        consultationRate: num(r.consultation_rate),
        bio: r.bio,
      },
    };
  } catch (e) {
    return readFail(e);
  }
}

/**
 * ATX03 from professional_profiles_guard_listing: the row says listed while
 * the professional works at a business, and the guard refuses every update.
 */
export const LISTED_BY_BUSINESS = "Your business manages your listing, so this can't be saved here right now. Contact support if it keeps happening.";

/** Update, else insert (the grants differ; never an upsert, see saveMyProfile). */
async function writeProfile(me: string, row: Record<string, unknown>, fallback: string): Promise<Write> {
  try {
    const up = await from("professional_profiles").update(row as never).eq("profile_id", me).select("profile_id");
    if (up.error) return (up.error as { code?: string }).code === "ATX03" ? { ok: false, message: LISTED_BY_BUSINESS } : failed(up.error, fallback);
    if ((up.data ?? []).length > 0) return { ok: true };
    const ins = await from("professional_profiles").insert({ profile_id: me, ...row } as never);
    return ins.error ? failed(ins.error, fallback) : { ok: true };
  } catch (e) {
    return failed(e, fallback);
  }
}

export const saveSpecialties = (me: string, specialties: string[]) =>
  writeProfile(me, { specialties }, "Couldn't save your specialties. Try again.");

export const saveWorkMode = (me: string, workMode: WorkModeDb | null) =>
  writeProfile(me, { work_mode: workMode }, "Couldn't save how you work. Try again.");

export const saveServiceRadius = (me: string, km: number | null) =>
  writeProfile(me, { home_visit_km: km }, "Couldn't save your service area. Try again.");

export const savePaymentModalities = (me: string, modalities: string[]) =>
  writeProfile(me, { payment_modalities: modalities }, "Couldn't save your payment methods. Try again.");

export const saveRates = (me: string, monthly: number | null, consultation: number | null) =>
  writeProfile(me, { monthly_rate: monthly, consultation_rate: consultation }, "Couldn't save your rates. Try again.");

// ---------------------------------------------------------------------------
// Handle (DB-1)
// ---------------------------------------------------------------------------

export const HANDLE_30_DAYS = "You can change your handle once every 30 days.";
/** ATXG2 with the next allowed day (ISO in DETAIL): "You can change your handle again on Oct 9." */
export const handleAgainOn = (day: string) => `You can change your handle once every 30 days. You can change it again on ${day}.`;

/** The backend's answer, said honestly (handles share one namespace with business slugs). */
export function describeHandleError(error: { code?: string; message?: string; details?: string | null } | null, offline = false): string {
  if (offline) return OFFLINE_MESSAGE;
  const code = error?.code ?? "";
  const msg = error?.message ?? "";
  if (code === "ATXG2") {
    const day = detailDate(error?.details) ?? detailDate(msg);
    return day ? handleAgainOn(day) : HANDLE_30_DAYS;
  }
  if (code === "22023") return "Use 3 to 30 lowercase letters, numbers and single dots, not only numbers.";
  // ATXB6: the one namespace handles share with business slugs (checked with psql: "flexfitness").
  if (code === "23505" || code === "ATXB6") return /reserved/i.test(msg) ? "That handle is reserved. Try another." : "That handle is taken by another account or business. Try another.";
  if (code === "ATX09") return "Only a professional account has a handle.";
  if (code === "ATX03") return LISTED_BY_BUSINESS;
  return "Couldn't save your handle. Try again.";
}

export async function setMyHandle(handle: string): Promise<{ ok: true; handle: string | null } | { ok: false; message: string }> {
  try {
    const { data, error } = await rpc("set_my_handle", { p_handle: handle });
    if (error) return { ok: false, message: describeHandleError(error, isOffline(error)) };
    return { ok: true, handle: (data as string | null) ?? null };
  } catch (e) {
    return { ok: false, message: describeHandleError(null, isOffline(e)) };
  }
}

// ---------------------------------------------------------------------------
// Professional type change requests (DB-1, decided by an admin)
// ---------------------------------------------------------------------------

export interface TypeChangeRequest {
  id: string;
  requestedType: ProfessionalSubtype;
  status: string;
  createdAt: string;
}

export async function fetchPendingTypeChange(me: string): Promise<Read<TypeChangeRequest | null>> {
  try {
    const { data, error } = await from("professional_type_change_requests")
      .select("id, requested_type, status, created_at")
      .eq("professional_id", me)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) return readFail(error);
    const r = ((data ?? []) as unknown as { id: string; requested_type: ProfessionalSubtype; status: string; created_at: string }[])[0];
    return { ok: true, data: r ? { id: r.id, requestedType: r.requested_type, status: r.status, createdAt: r.created_at } : null };
  } catch (e) {
    return readFail(e);
  }
}

export async function requestTypeChange(type: ProfessionalSubtype, note: string): Promise<Write> {
  try {
    const { error } = await rpc("request_professional_type_change", { p_type: type, p_note: note.trim() || null });
    if (!error) return { ok: true };
    if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
    if (error.code === "22023") {
      return { ok: false, message: /pending/i.test(error.message) ? "You already have a request waiting for our team." : "Choose a different type." };
    }
    return { ok: false, message: "Couldn't send your request. Try again." };
  } catch (e) {
    return failed(e, "Couldn't send your request. Try again.");
  }
}

// ---------------------------------------------------------------------------
// Hire plans with session_count (MO5 Packages and plans, MO16)
// ---------------------------------------------------------------------------

export interface ServicePlan {
  id: string;
  name: string;
  price: number;
  billing: PlanBilling | "quarterly" | "semiannually";
  features: string[];
  active: boolean;
  position: number;
  sessionCount: number | null;
  createdAt: string;
}

const PLAN_COLUMNS = "id, name, price, billing, features, active, position, session_count, created_at";
type PlanRow = { id: string; name: string; price: number | string; billing: ServicePlan["billing"]; features: string[] | null; active: boolean; position: number; session_count: number | null; created_at: string };
const toPlan = (r: PlanRow): ServicePlan => ({
  id: r.id,
  name: r.name,
  price: Number(r.price) || 0,
  billing: r.billing,
  features: r.features ?? [],
  active: r.active,
  position: r.position,
  sessionCount: r.session_count,
  createdAt: r.created_at,
});

export async function fetchServicePlans(me: string): Promise<Read<ServicePlan[]>> {
  try {
    const { data, error } = await from("professional_plans").select(PLAN_COLUMNS).eq("professional_id", me).order("position").order("created_at");
    if (error) return readFail(error);
    return { ok: true, data: ((data ?? []) as unknown as PlanRow[]).map(toPlan) };
  } catch (e) {
    return readFail(e);
  }
}

export interface PlanInput extends PlanDraft {
  /** A package's sessions (1 to 200); null for a programme or monthly plan. */
  sessionCount: number | null;
}

const planFail = (error: unknown) => failed(error, "Couldn't save this plan. Try again.");

/** Adds or edits a plan. professional_id goes on INSERT only (outside the UPDATE grant). */
export async function savePlan(me: string, id: string | null, input: PlanInput, position: number): Promise<{ ok: true; plan: ServicePlan } | { ok: false; message: string }> {
  const built = validatePlanDraft(input);
  if (!built.ok) return built;
  if (input.sessionCount !== null && (!Number.isInteger(input.sessionCount) || input.sessionCount < 1 || input.sessionCount > 200)) {
    return { ok: false, message: "A package holds 1 to 200 sessions." };
  }
  const row = { ...built.row, session_count: input.sessionCount };
  try {
    const q = id
      ? from("professional_plans").update(row as never).eq("id", id).select(PLAN_COLUMNS).single()
      : from("professional_plans").insert({ ...row, professional_id: me, position } as never).select(PLAN_COLUMNS).single();
    const { data, error } = await q;
    if (error || !data) return planFail(error) as { ok: false; message: string };
    return { ok: true, plan: toPlan(data as unknown as PlanRow) };
  } catch (e) {
    return planFail(e) as { ok: false; message: string };
  }
}

export async function setPlanFields(id: string, row: { active?: boolean; position?: number }): Promise<Write> {
  try {
    const { error } = await from("professional_plans").update(row as never).eq("id", id);
    return error ? planFail(error) : { ok: true };
  } catch (e) {
    return planFail(e);
  }
}

// ---------------------------------------------------------------------------
// A session type from MO16 (appointment_services, with its description)
// ---------------------------------------------------------------------------

export interface SessionServiceInput {
  name: string;
  durationMin: number;
  price: number;
  locationKind: "in_person" | "online";
  description: string;
}

export async function addSessionService(me: string, s: SessionServiceInput): Promise<Write> {
  const name = s.name.trim();
  if (!name) return { ok: false, message: "Give the service a name." };
  if (name.length > 60) return { ok: false, message: "Keep the name to 60 characters or fewer." };
  if (s.description.trim().length > 500) return { ok: false, message: "Keep the description to 500 characters or fewer." };
  try {
    const { error } = await from("appointment_services").insert({
      professional_id: me,
      business_id: null,
      name,
      duration_min: s.durationMin,
      price: s.price,
      location_kind: s.locationKind,
      description: s.description.trim() || null,
    } as never);
    return error ? failed(error, "Couldn't add this service. Try again.") : { ok: true };
  } catch (e) {
    return failed(e, "Couldn't add this service. Try again.");
  }
}

// ---------------------------------------------------------------------------
// Businesses you work at (MO20), read only
// ---------------------------------------------------------------------------

export interface Employment {
  businessId: string;
  businessName: string;
  acceptedAt: string | null;
}

export async function fetchEmployments(): Promise<Read<Employment[]>> {
  try {
    const { data, error } = await rpc("my_business_employments");
    if (error) return readFail(error);
    return {
      ok: true,
      data: ((data ?? []) as { business_id: string; business_name: string; accepted_at: string | null }[]).map((r) => ({
        businessId: r.business_id,
        businessName: r.business_name,
        acceptedAt: r.accepted_at,
      })),
    };
  } catch (e) {
    return readFail(e);
  }
}

// ---------------------------------------------------------------------------
// Profile name and phone (MO26 Personal), profiles columns in the UPDATE grant
// ---------------------------------------------------------------------------

export async function saveFirstName(me: string, name: string): Promise<Write> {
  const v = name.trim();
  if (v.length < 1) return { ok: false, message: "Add your name." };
  if (v.length > 60) return { ok: false, message: "Keep your name to 60 characters or fewer." };
  try {
    const { error } = await from("profiles").update({ first_name: v } as never).eq("id", me);
    return error ? failed(error, "Couldn't save your name. Try again.") : { ok: true };
  } catch (e) {
    return failed(e, "Couldn't save your name. Try again.");
  }
}

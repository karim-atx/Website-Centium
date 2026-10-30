import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { prepareForumPhoto } from "../forum/photo";
import { recordLegalAcceptances } from "../legal/acceptances";
import { COVER_MAX_BYTES, LOGO_MAX_BYTES, replacedObject } from "../venues/consoleLogic";
import { storagePath } from "../venues/venueLogic";
import { uploadWithProgress } from "../storage";
import { coverToRemove, coverUrlFor } from "../business-more/cover";
import { myImageApprovals, stagedUrl, stagingPath, submitImage, uploadToStaging, withdrawPending } from "../moderation/images";
import { OB_STRINGS } from "../../pages/onboarding/shell/flow";
import { looksBlurry } from "./blurCheck";
import { fetchBookingPolicies, setBookingPolicy } from "../business-classes/schedule";
import { POLICY_RANGE, type BookingPolicy, type PolicyField } from "../business-classes/scheduleRules";
import {
  amenityKeysOf,
  businessTypeFor,
  dbCategories,
  docBody,
  instagramHandle,
  type BizLane,
  type DayHours,
  type Essentials,
  type Location,
  type PolicyKind,
  type StarterPlan,
} from "../../pages/onboarding/business/lanes";
import { docsFor, type BusinessLaneDraft } from "../../pages/onboarding/business/draft";
import { contactRefusal, moderationRefusal } from "../moderation/text";
import { tk } from "../../i18n/core";

// Database stage B5 "Business foundations and onboarding" (HANDOVER_API.md
// "## B5"), for the Classes, Gym and Store onboarding lanes:
// - business_profiles (studio type, cover, instagram handle, categories,
//   short_description, timezone; business_code assigned by trigger), created
//   at Step 1 with active = false so nothing is listed before review;
// - gyms (a venue for EVERY business type, V6-64: venue_kind studio / gym /
//   store / wellness), gym_hours, gym_area_hours;
// - business_store_settings (D9 capability flags, delivery, returns);
// - policy_documents / policy_versions (published = frozen, ATXB7);
// - business_verifications (one pending submission) + bucket
//   business-verification; legal_acceptances (Terms and Privacy);
// (onboarding_drafts are the shell's: services/onboarding/drafts.ts.)
// - business_setup_checklist() + onboarding_progress (dismissals, seen flags).
//
// None of it is in lib/supabase/database.types.ts (generated from production),
// so the calls go through an untyped view of the same client.
const db = typed as unknown as SupabaseClient;

export type Res<T> = { ok: true; value: T } | { ok: false; message: string; offline?: boolean; code?: string };

const SAVE_FAIL: string = tk("Couldn't save this step. Check your connection and try again.");

function fail<T>(error: unknown, fallback = SAVE_FAIL): Res<T> {
  const e = error as { message?: string; code?: string } | null;
  if (isOffline(error)) return { ok: false, offline: true, message: OFFLINE_MESSAGE };
  const msg = e?.message ?? "";
  // ATXB6 (identity: slug / timezone), ATXB7 (published policy), ATXB8 (review).
  if (/ATXB6/.test(msg)) return { ok: false, code: "ATXB6", message: msg.replace(/^.*ATXB6:\s*/, "").replace(/^./, (m) => m.toUpperCase()) };
  return { ok: false, code: e?.code, message: moderationRefusal(e) ?? fallback };
}

/** The browser's timezone when the server knows it, else the column default. */
function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Step 1 · the business row and its images

export interface BusinessRow {
  id: string;
  businessCode: string | null;
  businessType: string;
  active: boolean;
}

export async function fetchMyBusinessRow(uid: string): Promise<Res<BusinessRow | null>> {
  const { data, error } = await db.from("business_profiles").select("id, business_code, business_type, active").eq("profile_id", uid).maybeSingle();
  if (error) return fail(error, tk("Couldn't load your business."));
  if (!data) return { ok: true, value: null };
  const r = data as { id: string; business_code: string | null; business_type: string; active: boolean };
  return { ok: true, value: { id: r.id, businessCode: r.business_code, businessType: r.business_type, active: r.active } };
}

/**
 * Creates (first time) or updates the business_profiles row from Step 1.
 * The insert sets active = false: the row is not listed until review
 * approves it (admin_review_business_verification sets active).
 * business_code is the trigger's to assign and is never sent.
 */
export async function saveBusinessBasics(uid: string, d: BusinessLaneDraft): Promise<Res<BusinessRow>> {
  // Round C Release 2: contact details belong in messages, said at save time.
  const contact = contactRefusal(d.description);
  if (contact) return { ok: false, message: contact };
  if (!d.lane) return { ok: false, message: SAVE_FAIL };
  const type = businessTypeFor(d.lane, d.storeType);
  if (!type) return { ok: false, message: SAVE_FAIL };
  const handle = instagramHandle(d.instagram);
  const row = {
    business_name: d.name.trim().slice(0, 60),
    business_type: type,
    short_description: d.description.trim() ? d.description.trim().slice(0, 160) : null,
    categories: dbCategories(type, d.categories),
    public_phone: d.phone.trim() || null,
    public_email: d.email.trim() || null,
    instagram: handle || null,
    public_website: d.website.trim() || null,
  };
  const existing = await fetchMyBusinessRow(uid);
  if (!existing.ok) return existing;
  if (existing.value) {
    // The image columns are the Database's to write (on approval); a removed
    // picture is the one write left here.
    const cleared = { ...(d.coverPath ? {} : { cover_url: null }), ...(d.logoPath ? {} : { logo_url: null }) };
    const upd = await db.from("business_profiles").update({ ...row, ...cleared }).eq("id", existing.value.id).select("id, business_code, business_type, active").single();
    if (upd.error) return fail(upd.error);
    const r = upd.data as { id: string; business_code: string | null; business_type: string; active: boolean };
    const sent = await submitStep1Images(r.id, d);
    if (!sent.ok) return sent;
    return { ok: true, value: { id: r.id, businessCode: r.business_code, businessType: r.business_type, active: r.active } };
  }
  const tz = deviceTimezone();
  // NO RETURNING. The row is inserted with active = false, and an inactive
  // row is readable only to an insider (is_business_insider, a STABLE
  // function whose snapshot cannot see the row its own INSERT is creating),
  // so INSERT … RETURNING is refused with 42501. The new row is read back
  // afterwards, when it is committed and its owner can see it.
  const insert = async (withTz: boolean) =>
    db.from("business_profiles").insert({ profile_id: uid, active: false, ...row, ...(withTz && tz ? { timezone: tz } : {}) });
  let ins = await insert(true);
  // A timezone the server does not know (ATXB6) falls back to the default.
  if (ins.error && /ATXB6/.test(ins.error.message ?? "")) ins = await insert(false);
  if (ins.error) return fail(ins.error);
  const made = await fetchMyBusinessRow(uid);
  if (!made.ok) return made;
  if (!made.value) return { ok: false, message: SAVE_FAIL };
  const sent = await submitStep1Images(made.value.id, d);
  if (!sent.ok) return sent;
  return { ok: true, value: made.value };
}

const STEP1_SURFACE = { cover: "business_cover", logo: "business_logo" } as const;

/** A path staged by uploadBusinessImage: <uid>/business_cover|business_logo/<file>. */
const isStagedPath = (kind: "logo" | "cover", path: string) => path.split("/")[1] === STEP1_SURFACE[kind];

/**
 * Step 1's pictures, submitted for approval once the business row exists
 * (Round C Release 2): every Step 1 save sends a picture staged since the
 * last one, and skips one already submitted (pending, decided or published,
 * which is when the column holds the same path). Older drafts' paths are
 * public objects the old save already wrote, and are left alone.
 */
async function submitStep1Images(businessId: string, d: BusinessLaneDraft): Promise<Res<null>> {
  const kinds = (["cover", "logo"] as const).filter((k) => {
    const path = k === "cover" ? d.coverPath : d.logoPath;
    return !!path && isStagedPath(k, path);
  });
  if (kinds.length === 0) return { ok: true, value: null };
  const { data, error } = await db.from("business_profiles").select("cover_url, logo_url").eq("id", businessId).maybeSingle();
  if (error) return fail(error);
  const columns = (data ?? {}) as { cover_url?: string | null; logo_url?: string | null };
  for (const k of kinds) {
    const path = (k === "cover" ? d.coverPath : d.logoPath)!;
    if ((k === "cover" ? columns.cover_url : columns.logo_url) === path) continue;
    const mine = await myImageApprovals(STEP1_SURFACE[k], businessId);
    if (mine.some((a) => a.stagingPath === path)) continue;
    const r = await submitImage(STEP1_SURFACE[k], businessId, path);
    if (!r.ok) return { ok: false, message: r.message, code: r.code };
  }
  return { ok: true, value: null };
}

/** The public URL of a stored logo or cover path (an old cover is read from where it was written: ../business-more/cover). */
function imageUrl(kind: "logo" | "cover", path: string | null): string | null {
  if (kind === "cover") return coverUrlFor(path, (bucket, p) => db.storage.from(bucket).getPublicUrl(p).data.publicUrl);
  const p = storagePath(path);
  return p ? db.storage.from("business-logos").getPublicUrl(p).data.publicUrl : null;
}

/**
 * How the owner sees a Step 1 picture: a staged one from image-staging (a
 * signed URL; the public copy only exists once approved), anything older from
 * its public bucket.
 */
export async function imagePreviewUrl(kind: "logo" | "cover", path: string | null): Promise<string | null> {
  if (!path) return null;
  if (!isStagedPath(kind, path)) return imageUrl(kind, path);
  return (await stagedUrl(path)) ?? imageUrl(kind, path);
}

/**
 * Stages a logo or cover in image-staging (<uid>/business_logo|business_cover/
 * <file>) after re-drawing it (metadata stripped). No business row is needed
 * yet: Step 1's save submits it for approval (submitStep1Images), and the
 * Database writes the column once it is approved. The picture it replaces is
 * left where it is: until the new one is approved, it is what others see.
 */
export async function uploadBusinessImage(uid: string, kind: "logo" | "cover", file: File): Promise<Res<string>> {
  const prepared = await prepareForumPhoto(file);
  if (!prepared.ok) return { ok: false, message: prepared.message };
  const max = kind === "logo" ? LOGO_MAX_BYTES : COVER_MAX_BYTES;
  if (prepared.file.size > max) {
    return { ok: false, message: kind === "logo" ? tk("This logo is too large. Choose one under 2 MB.") : tk("This photo is too large. Choose one under 5 MB.") };
  }
  const up = await uploadToStaging(stagingPath(uid, STEP1_SURFACE[kind], prepared.file), prepared.file);
  return up.ok ? { ok: true, value: up.value } : { ok: false, message: up.message };
}

/** Remove photo: the public object of a published picture (the column is cleared by Step 1's save). */
export async function removeBusinessImage(uid: string, kind: "logo" | "cover", previous: string | null): Promise<void> {
  // A staged picture already submitted is taken back (withdraw_image); one
  // never submitted just stays private until the staging sweep.
  if (previous) await withdrawPending(kind === "logo" ? "business_logo" : "business_cover", null, previous);
  if (kind === "logo") {
    const old = replacedObject(previous, uid, "");
    if (old) await db.storage.from("business-logos").remove([old]);
    return;
  }
  const old = coverToRemove(previous, { ownerUid: uid, callerUid: uid });
  if (old) await db.storage.from(old.bucket).remove([old.path]);
}

// ---------------------------------------------------------------------------
// Step 2 · venues, hours, area hours

const venueKind = (lane: BizLane, storeType: string | null) =>
  lane === "classes" ? "studio" : lane === "gym" ? "gym" : storeType === "wellness_service" ? "wellness" : "store";

function hoursRow(h: DayHours) {
  return h.open
    ? { weekday: h.weekday, closed: false, open_24h: false, opens_at: h.opens, closes_at: h.closes }
    : { weekday: h.weekday, closed: true, open_24h: false, opens_at: null, closes_at: null };
}

/** Writes a venue's week: update the days that exist, insert the rest (no upsert: gym_id is not in the UPDATE grant). */
async function writeHours(gymId: string, hours: DayHours[]): Promise<Res<null>> {
  const { data, error } = await db.from("gym_hours").select("id, weekday").eq("gym_id", gymId);
  if (error) return fail(error);
  const have = new Map((data as { id: string; weekday: number }[]).map((r) => [r.weekday, r.id]));
  for (const h of hours) {
    const r = hoursRow(h);
    const id = have.get(h.weekday);
    const res = id
      ? await db.from("gym_hours").update({ closed: r.closed, open_24h: r.open_24h, opens_at: r.opens_at, closes_at: r.closes_at }).eq("id", id)
      : await db.from("gym_hours").insert({ gym_id: gymId, ...r });
    if (res.error) return fail(res.error);
  }
  return { ok: true, value: null };
}

/**
 * The main venue (and any extra locations): a gyms row per location for every
 * business type (V6-64), its week in gym_hours, and (Gym) gym_area_hours.
 * Returns the main venue's id.
 */
export async function saveVenues(d: BusinessLaneDraft, businessId: string): Promise<Res<string>> {
  if (!d.lane) return { ok: false, message: SAVE_FAIL };
  const tz = deviceTimezone();
  const base = (loc: Location) => ({
    name: d.name.trim(),
    location: loc.address.trim(),
    lat: Number((loc.lat ?? 0).toFixed(6)),
    lng: Number((loc.lng ?? 0).toFixed(6)),
    venue_kind: venueKind(d.lane!, d.storeType),
    public_phones: d.phone.trim() ? [d.phone.trim()] : [],
    public_email: d.email.trim() || null,
    public_website: d.website.trim() || null,
    // No cover_url / logo_url: a venue's cover is its own picture (gym_cover,
    // set in the venue console) and the logo is the business's.
    default_cancellation_hours: d.lane === "classes" ? d.essentials.cancelHours : 12,
  });
  const write = async (loc: Location, id: string | null): Promise<Res<string>> => {
    if (loc.lat == null || loc.lng == null) return { ok: false, message: SAVE_FAIL };
    if (id) {
      const upd = await db.from("gyms").update(base(loc)).eq("id", id).select("id");
      if (upd.error) return fail(upd.error);
      if (upd.data && upd.data.length > 0) return { ok: true, value: id };
    }
    const tryInsert = (withTz: boolean) =>
      db.from("gyms").insert({ business_id: businessId, ...base(loc), ...(withTz && tz ? { timezone: tz } : {}) }).select("id").single();
    let ins = await tryInsert(true);
    if (ins.error && /timezone/i.test(ins.error.message ?? "")) ins = await tryInsert(false);
    if (ins.error) return fail(ins.error);
    return { ok: true, value: (ins.data as { id: string }).id };
  };

  const main = await write(d.location, d.gymId);
  if (!main.ok) return main;
  const hours = await writeHours(main.value, d.hours);
  if (!hours.ok) return hours;

  // Extra locations: the other venue rows of this business, matched by address.
  const { data: others, error } = await db.from("gyms").select("id, location").eq("business_id", businessId).neq("id", main.value);
  if (error) return fail(error);
  const byAddress = new Map((others as { id: string; location: string }[]).map((g) => [g.location.trim().toLowerCase(), g.id]));
  for (const loc of d.extraLocations) {
    if (!loc.address.trim() || loc.lat == null || loc.lng == null) continue;
    const r = await write(loc, byAddress.get(loc.address.trim().toLowerCase()) ?? null);
    if (!r.ok) return r;
    const h = await writeHours(r.value, d.hours);
    if (!h.ok) return h;
  }

  // Area hours (Gym): replaced as a set for the main venue.
  if (d.lane === "gym") {
    const del = await db.from("gym_area_hours").delete().eq("gym_id", main.value);
    if (del.error) return fail(del.error);
    const rows = d.areas
      .filter((a) => a.name.trim())
      .flatMap((a) => a.hours.map((h) => ({ gym_id: main.value, area_name: a.name.trim().slice(0, 40), ...hoursRow(h) })));
    if (rows.length) {
      const ins = await db.from("gym_area_hours").insert(rows);
      if (ins.error) return fail(ins.error);
    }
  }
  return { ok: true, value: main.value };
}

// ---------------------------------------------------------------------------
// Step 3 · essentials that have a home today

const RETURNS_TEXT: Record<Essentials["returnsRule"], string> = {
  returns_14: "Returns within 14 days. Unopened items only.",
  exchanges_only: "Exchanges only.",
  no_returns: "No returns.",
};

const money2 = (v: string): number | null => {
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return v.trim() && Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

/** Store: business_store_settings (D9 flags, delivery, returns). Upsert: business_id is in the UPDATE grant. */
export async function saveStoreSettings(businessId: string, e: Essentials): Promise<Res<null>> {
  const delivery = e.delivery;
  const row = {
    business_id: businessId,
    sells_products: e.sellsProducts,
    offers_appointments: e.offersAppointments,
    delivery_enabled: delivery,
    pickup_enabled: e.pickup,
    delivery_fee: delivery ? money2(e.deliveryFee) : null,
    free_delivery_over: delivery ? money2(e.freeOver) : null,
    delivery_time_text: delivery && e.deliveryTime.trim() ? e.deliveryTime.trim().slice(0, 60) : null,
    returns_policy: RETURNS_TEXT[e.returnsRule],
    allow_exchanges: e.returnsRule !== "no_returns" && e.allowExchanges,
  };
  const { error } = await db.from("business_store_settings").upsert(row, { onConflict: "business_id" });
  if (error) return fail(error);
  return { ok: true, value: null };
}

/**
 * Gym: the starter plan in membership_plans (Monthly → monthly, Annual →
 * annually). A Visit pack has no billing value yet (plan types are B7,
 * MB-03), so it stays in the draft. Returns the plan id.
 */
export async function saveStarterPlan(businessId: string, plan: StarterPlan, existingId: string | null): Promise<Res<string | null>> {
  if (plan.type === "Visit pack") return { ok: true, value: existingId };
  const price = money2(plan.price);
  if (price == null) return { ok: true, value: existingId };
  const row = { name: plan.name.trim().slice(0, 80) || "Monthly unlimited", price, billing: plan.type === "Annual" ? "annually" : "monthly" };
  if (existingId) {
    const upd = await db.from("membership_plans").update(row).eq("id", existingId).select("id");
    if (upd.error) return fail(upd.error);
    if (upd.data && upd.data.length) return { ok: true, value: existingId };
  }
  const ins = await db.from("membership_plans").insert({ business_id: businessId, ...row }).select("id").single();
  if (ins.error) return fail(ins.error);
  return { ok: true, value: (ins.data as { id: string }).id };
}

/**
 * OURS-essentials-additions rows 4 and 5 (B7 MB-03 plan_type): the Classes
 * lane's Intro offer and the Gym lane's Day pass become membership_plans
 * rows, shaped as the Plans editor writes them (PlanSheet / planModel
 * billingForKind): Day pass = plan_type day_pass, billing daily; Intro offer
 * = plan_type intro_offer, valid 7 days (the editor's default length),
 * billing monthly; "First class free" is price 0. Idempotent without a
 * stored id: the business's one plan of that type (only onboarding has
 * written one while the lane runs) is updated, else one is inserted. Turned
 * off again, that plan is archived, never deleted. A Day pass or Intro pack
 * without a valid price stays in the draft until it has one.
 */
export async function saveOfferPlans(businessId: string, lane: BizLane, e: Essentials): Promise<Res<null>> {
  const want =
    lane === "classes"
      ? {
          type: "intro_offer" as const,
          on: e.introOn,
          row: e.introKind === "first_free" ? { name: "First class free", price: 0 } : { name: "Intro pack", price: money2(e.introPrice) },
          extra: { billing: "monthly", valid_for_days: 7 },
        }
      : lane === "gym"
        ? { type: "day_pass" as const, on: e.dayPassOn, row: { name: "Day pass", price: money2(e.dayPassPrice) }, extra: { billing: "daily", valid_for_days: null } }
        : null;
  if (!want) return { ok: true, value: null };
  const found = await db.from("membership_plans").select("id").eq("business_id", businessId).eq("plan_type", want.type).order("created_at", { ascending: true }).limit(1);
  if (found.error) return fail(found.error);
  const existing = ((found.data ?? []) as { id: string }[])[0]?.id ?? null;
  if (!want.on) {
    if (!existing) return { ok: true, value: null };
    const off = await db.from("membership_plans").update({ status: "archived" }).eq("id", existing);
    return off.error ? fail(off.error) : { ok: true, value: null };
  }
  if (want.row.price == null) return { ok: true, value: null };
  const row = { name: want.row.name, price: want.row.price, billing: want.extra.billing, valid_for_days: want.extra.valid_for_days, plan_type: want.type, status: "active" };
  const r = existing
    ? await db.from("membership_plans").update(row).eq("id", existing)
    : await db.from("membership_plans").insert({ business_id: businessId, ...row });
  return r.error ? fail(r.error) : { ok: true, value: null };
}

/**
 * Gym (B10, OB-259 "Entry and check-in"): the venue's minimum entry age
 * (16-21), guest passes a month (0-10) and whether the front desk can check
 * people in. gyms.access_qr stays on (one access method is required). A
 * database without the columns (42703 / PGRST204) keeps them in the draft only.
 */
export async function saveEntrySettings(gymId: string, e: Essentials): Promise<Res<null>> {
  const row = {
    min_entry_age: Math.min(21, Math.max(16, Math.round(e.minAge))),
    guest_passes_per_month: Math.min(10, Math.max(0, Math.round(e.guestPasses))),
    front_desk_checkin: e.frontDeskCheckIn,
    // B13 MK-02 (OB-257 row 23): the picked facilities as amenity_vocabulary() keys.
    amenities: amenityKeysOf(e.amenities),
  };
  const { error } = await db.from("gyms").update(row).eq("id", gymId);
  if (error && !["42703", "PGRST204"].includes(error.code)) return fail(error);
  return { ok: true, value: null };
}

/**
 * Classes (B9 CL-05): the business default row of business_booking_policies
 * (class_type null) with the essentials' cancellation window, booking window,
 * closes-before, class size and waitlist, plus the venue's
 * gyms.default_cancellation_hours. Values are clamped to the table's CHECK
 * ranges (POLICY_RANGE). Writing needs business_can(schedule); the owner has it.
 * The picked class TYPES have no storage yet and stay in the draft only.
 */
export async function saveClassDefaults(businessId: string, gymId: string, e: Essentials): Promise<Res<null>> {
  const { error } = await db.from("gyms").update({ default_cancellation_hours: e.cancelHours }).eq("id", gymId);
  if (error) return fail(error);
  const read = await fetchBookingPolicies(businessId);
  if (!read.ok) return { ok: false, message: SAVE_FAIL };
  let row: BookingPolicy | null = read.value.find((p) => p.classType === null) ?? null;
  const clamp = (f: PolicyField, v: number) => Math.min(POLICY_RANGE[f][1], Math.max(POLICY_RANGE[f][0], Math.round(v)));
  const want: [PolicyField, number][] = [
    ["cancellationHours", clamp("cancellationHours", e.cancelHours)],
    ["bookingWindowDays", clamp("bookingWindowDays", e.bookAheadDays)],
    ["closesMinutesBefore", clamp("closesMinutesBefore", e.closesBeforeMin)],
    ["defaultCapacity", clamp("defaultCapacity", e.spots)],
    ["waitlistCap", clamp("waitlistCap", e.waitlist)],
  ];
  for (const [field, value] of want) {
    if (row && row[field] === value) continue;
    const r = await setBookingPolicy(businessId, row, null, field, value);
    if (!r.ok) return typeof navigator !== "undefined" && !navigator.onLine ? { ok: false, offline: true, message: OFFLINE_MESSAGE } : { ok: false, message: SAVE_FAIL };
    row = r.value;
  }
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// Step 4 · policies (drafts now, published on submit) and verification files

/**
 * Writes each document as an UNPUBLISHED version (a draft: editable, visible
 * to the business only). Publishing happens on Submit for review, which
 * freezes the text (ATXB7) and points current_version at it.
 */
export async function savePolicyDrafts(businessId: string, d: BusinessLaneDraft): Promise<Res<null>> {
  if (!d.lane) return { ok: false, message: SAVE_FAIL };
  for (const doc of docsFor(d)) {
    const body = docBody(doc);
    const r = await upsertDraftVersion(businessId, doc.kind, body);
    if (!r.ok) return r;
  }
  return { ok: true, value: null };
}

async function upsertDraftVersion(businessId: string, kind: PolicyKind, body: string): Promise<Res<{ documentId: string; versionId: string; version: number }>> {
  let docId: string;
  const found = await db.from("policy_documents").select("id, current_version").eq("business_id", businessId).eq("kind", kind).maybeSingle();
  if (found.error) return fail(found.error);
  let current = 0;
  if (found.data) {
    docId = (found.data as { id: string }).id;
    current = (found.data as { current_version: number | null }).current_version ?? 0;
  } else {
    const ins = await db.from("policy_documents").insert({ business_id: businessId, kind }).select("id").single();
    if (ins.error) return fail(ins.error);
    docId = (ins.data as { id: string }).id;
  }
  const drafts = await db.from("policy_versions").select("id, version").eq("document_id", docId).is("published_at", null).order("version", { ascending: false }).limit(1);
  if (drafts.error) return fail(drafts.error);
  const draft = (drafts.data as { id: string; version: number }[])[0];
  if (draft) {
    const upd = await db.from("policy_versions").update({ body }).eq("id", draft.id);
    if (upd.error) return fail(upd.error);
    return { ok: true, value: { documentId: docId, versionId: draft.id, version: draft.version } };
  }
  const latest = await db.from("policy_versions").select("version").eq("document_id", docId).order("version", { ascending: false }).limit(1);
  if (latest.error) return fail(latest.error);
  const next = Math.max(current, (latest.data as { version: number }[])[0]?.version ?? 0) + 1;
  // A first version of a waiver must be accepted; later edits choose (D7, MO1).
  const ins = await db.from("policy_versions").insert({ document_id: docId, version: next, body, requires_reacceptance: false }).select("id").single();
  if (ins.error) return fail(ins.error);
  return { ok: true, value: { documentId: docId, versionId: (ins.data as { id: string }).id, version: next } };
}

/** Publishes every draft version of this business's documents (on submit). */
async function publishPolicies(businessId: string): Promise<Res<null>> {
  const docs = await db.from("policy_documents").select("id").eq("business_id", businessId);
  if (docs.error) return fail(docs.error);
  for (const doc of docs.data as { id: string }[]) {
    const drafts = await db.from("policy_versions").select("id, version").eq("document_id", doc.id).is("published_at", null).order("version", { ascending: false }).limit(1);
    if (drafts.error) return fail(drafts.error);
    const v = (drafts.data as { id: string; version: number }[])[0];
    if (!v) continue;
    const pub = await db.from("policy_versions").update({ published_at: new Date().toISOString() }).eq("id", v.id);
    if (pub.error) return fail(pub.error);
    const cur = await db.from("policy_documents").update({ current_version: v.version }).eq("id", doc.id);
    if (cur.error) return fail(cur.error);
  }
  return { ok: true, value: null };
}

export const VERIFY_MAX_BYTES = 10 * 1024 * 1024;
const VERIFY_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const VERIFY_BUCKET = "business-verification";
export const ID_BLURRY = tk("This photo is blurry. Retake it in good light so all 4 corners show.");

/**
 * A verification file's path: <owner_uid>/<verification_id>/<file>
 * (Database 20261120040000). Segment 1 is the BUSINESS OWNER even when a
 * manager uploads (may_write_business_file, `members`), so the file counts
 * against and is purged with the owner; the verification id groups one
 * submission's files and becomes business_verifications.id on submit.
 */
export function verificationObjectPath(ownerUid: string, verificationId: string, fileId: string, ext: "jpg" | "pdf"): string {
  return `${ownerUid}/${verificationId}/${fileId}.${ext}`;
}

/**
 * Uploads one verification file to the private business-verification bucket
 * (10 MB, images and PDF), with byte progress. Images are re-drawn first and
 * PDFs rewritten (metadata stripped, as the forum photos and course PDFs
 * are); an ID photo is checked for blur first unless `acceptBlurry` (code
 * "BLURRY", OB-265).
 */
export async function uploadVerificationFile(params: {
  ownerUid: string;
  verificationId: string;
  file: File;
  checkBlur: boolean;
  acceptBlurry: boolean;
  onProgress: (fraction: number) => void;
}): Promise<Res<{ path: string; name: string; size: number }>> {
  const { ownerUid, verificationId, file, checkBlur, acceptBlurry, onProgress } = params;
  if (!VERIFY_TYPES.includes(file.type)) return { ok: false, message: tk("Choose a photo or a PDF.") }; // OURS
  let body: Blob;
  let ext: "jpg" | "pdf";
  if (file.type === "application/pdf") {
    if (file.size > VERIFY_MAX_BYTES) return { ok: false, message: tk("This file is over 10 MB. Choose a smaller one.") };
    const { preparePdf } = await import("../courses/pdf");
    const prepared = await preparePdf(file);
    if (!prepared.ok) return { ok: false, message: prepared.message };
    body = new Blob([prepared.bytes as BlobPart], { type: "application/pdf" });
    ext = "pdf";
  } else {
    if (checkBlur && !acceptBlurry && (await looksBlurry(file))) return { ok: false, code: "BLURRY", message: ID_BLURRY };
    const prepared = await prepareForumPhoto(file);
    if (!prepared.ok) return { ok: false, message: prepared.message };
    body = prepared.file;
    ext = "jpg";
  }
  if (body.size > VERIFY_MAX_BYTES) return { ok: false, message: tk("This file is over 10 MB. Choose a smaller one.") };
  const path = verificationObjectPath(ownerUid, verificationId, crypto.randomUUID(), ext);
  const { error } = await uploadWithProgress(VERIFY_BUCKET, path, body, body.type, { onProgress });
  if (error) {
    console.warn("[business-onboarding] verification upload refused:", error.status ?? "", error.message);
    return { ok: false, message: OB_STRINGS.uploadFailed };
  }
  return { ok: true, value: { path, name: file.name, size: body.size } };
}

/**
 * Removes a replaced or removed verification file, but only one from the
 * submission being put together (its second segment is `verificationId`):
 * a file already submitted belongs to that submission's record.
 */
export async function removeVerificationFile(path: string | null, verificationId: string | null): Promise<void> {
  const p = storagePath(path);
  if (!p || !verificationId || p.split("/")[1] !== verificationId) return;
  await db.storage.from(VERIFY_BUCKET).remove([p]);
}

// ---------------------------------------------------------------------------
// Step 6 · submit for review


/**
 * Submit for review: record the Terms / Privacy / health disclaimer acceptance (a new row per
 * version; SELECT and INSERT only), publish the documents, and open the one
 * pending verification with the uploaded files. Re-submitting while one is
 * pending keeps the existing one (unique pending index).
 */
export async function submitForReview(uid: string, businessId: string, d: BusinessLaneDraft): Promise<Res<null>> {
  // The Business Terms and Privacy Policy accepted on Review, and the health
  // disclaimer shown above Submit for review (B5 legal_acceptances, the
  // shell's service and LEGAL_VERSION; the same three the professional lane records).
  const legal = await recordLegalAcceptances(uid, ["terms", "privacy", "health_disclaimer"]);
  if (!legal.ok) return legal.offline ? { ok: false, offline: true, message: OFFLINE_MESSAGE } : { ok: false, message: tk("Couldn't submit. Check your connection and try again.") };
  const drafts = await savePolicyDrafts(businessId, d);
  if (!drafts.ok) return drafts;
  const pub = await publishPolicies(businessId);
  if (!pub.ok) return pub;
  const pending = await db.from("business_verifications").select("id").eq("business_id", businessId).eq("status", "pending").maybeSingle();
  if (pending.error) return fail(pending.error, tk("Couldn't submit. Check your connection and try again."));
  if (!pending.data) {
    const files = [d.proof.path, d.idFront.path, d.idBack.path].filter((p): p is string => !!p);
    // The id the files were grouped under (<owner>/<verification_id>/…), so
    // the folder and the row agree; a fresh one when nothing new was uploaded.
    const insert = (id: string) => db.from("business_verifications").insert({ id, business_id: businessId, file_paths: files });
    let ins = await insert(d.verificationId ?? crypto.randomUUID());
    // An id already used by an earlier submission (a draft that missed being
    // cleared after a submit): the files stay where they are, the row gets a new id.
    if (ins.error?.code === "23505" && d.verificationId) ins = await insert(crypto.randomUUID());
    if (ins.error) return fail(ins.error, tk("Couldn't submit. Check your connection and try again."));
  }
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// After submitting: review status, approval seen, Get set up

export interface ReviewItem {
  step?: string;
  field: string;
  problem: string;
  fix?: string;
}

export interface ReviewStatus {
  status: "pending" | "approved" | "rejected" | "none";
  /** business_profiles.id (the Show on Explore switch writes it). */
  businessId: string;
  /** The latest submission's id (its files sit under <owner_uid>/<id>/), or null. */
  verificationId: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  items: ReviewItem[];
  active: boolean;
  businessName: string;
  businessType: string;
  businessCode: string | null;
}

export async function fetchReviewStatus(uid: string): Promise<Res<ReviewStatus | null>> {
  const biz = await db.from("business_profiles").select("id, active, business_name, business_type, business_code").eq("profile_id", uid).maybeSingle();
  if (biz.error) return fail(biz.error, tk("Couldn't load your review status. Try again."));
  if (!biz.data) return { ok: true, value: null };
  const b = biz.data as { id: string; active: boolean; business_name: string; business_type: string; business_code: string | null };
  const v = await db.from("business_verifications").select("id, status, items, submitted_at, reviewed_at").eq("business_id", b.id).order("submitted_at", { ascending: false }).limit(1);
  if (v.error) return fail(v.error, tk("Couldn't load your review status. Try again."));
  const row = (v.data as { id: string; status: ReviewStatus["status"]; items: ReviewItem[]; submitted_at: string; reviewed_at: string | null }[])[0];
  return {
    ok: true,
    value: {
      status: row?.status ?? "none",
      businessId: b.id,
      verificationId: row?.id ?? null,
      submittedAt: row?.submitted_at ?? null,
      reviewedAt: row?.reviewed_at ?? null,
      items: Array.isArray(row?.items) ? row.items : [],
      active: b.active,
      businessName: b.business_name,
      businessType: b.business_type,
      businessCode: b.business_code,
    },
  };
}

/** A per-business flag in onboarding_progress (item done). */
export async function markProgress(businessId: string, item: string): Promise<void> {
  const now = new Date().toISOString();
  const upd = await db.from("onboarding_progress").update({ done_at: now }).eq("business_id", businessId).eq("item", item).select("id");
  if (!upd.error && upd.data && upd.data.length) return;
  await db.from("onboarding_progress").insert({ business_id: businessId, item, done_at: now });
}

export async function hasProgress(businessId: string, item: string): Promise<boolean> {
  const { data } = await db.from("onboarding_progress").select("done_at").eq("business_id", businessId).eq("item", item).maybeSingle();
  return !!(data as { done_at: string | null } | null)?.done_at;
}


import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { prepareForumPhoto } from "../forum/photo";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { storagePath } from "./venueLogic";
import {
  consoleMessage,
  COVER_MAX_BYTES,
  coverObjectPath,
  hoursWritePlan,
  LOGO_MAX_BYTES,
  logoObjectPath,
  replacedObject,
  toMyVenue,
  toRosterEntry,
  toVenueDashboard,
  toVenueMember,
  totalOf,
  validateDrafts,
  type DayDraft,
  type GymHoursTableRow,
  type MembershipStatus,
  type MyVenue,
  type MyVenueRow,
  type RosterEntry,
  type RosterRow,
  type VenueDashboard,
  type VenueDashboardRow,
  type VenueMember,
  type VenueMemberRow,
} from "./consoleLogic";
import type { Result } from "./index";

// The venue console (backend stage A4, Database docs/HANDOVER_API.md "Stage
// A4 · The business side of a venue"): my_venues() → venue_dashboard(id) →
// venue_members(id) and venue_class_roster(class_id), all four gated on
// is_business_insider() (owner AND employees); the owner-only writes are
// gym_hours (directly), gyms.timezone, and the logo / cover objects.
//
// None of it is in the production-generated types, so every call goes through
// a narrow cast at this boundary.

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: T | null; error: PostgrestError | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

type Res<T> = PromiseLike<{ data: T | null; error: PostgrestError | null }>;
type Loose = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, v: string) => Res<unknown[]> & {
        gte: (col: string, v: string) => { order: (col: string) => { order: (col: string) => Res<unknown[]> } };
        maybeSingle: () => Res<unknown>;
      };
    };
    update: (row: Record<string, unknown>) => {
      eq: (col: string, v: string) => { select: (c: string) => Res<unknown[]> };
    };
    insert: (rows: Record<string, unknown>[]) => Res<unknown>;
  };
};
// gym_hours, gyms.timezone / cover_url, business_profiles.logo_url and
// business_classes.gym_id are A4's / stage 4's and not in the generated types.
const db = supabase as unknown as Loose;

const fail = <T>(error: PostgrestError, fallback: string): Result<T> => ({
  ok: false,
  code: error.code,
  message: isOffline(error) ? OFFLINE_MESSAGE : consoleMessage(error.code, error.message, fallback),
});

/** Every venue the caller is an insider of; hidden ones last, with hiddenAt set. */
export async function fetchMyVenues(): Promise<Result<MyVenue[]>> {
  const { data, error } = await rpc<MyVenueRow[]>("my_venues");
  if (error) {
    console.error("[venue console] Could not read your venues:", error.message);
    return fail(error, "Couldn't load your venues right now.");
  }
  return { ok: true, value: (data ?? []).map(toMyVenue) };
}

export async function fetchVenueDashboard(gymId: string): Promise<Result<VenueDashboard | null>> {
  const { data, error } = await rpc<VenueDashboardRow[] | VenueDashboardRow>("venue_dashboard", { p_gym_id: gymId });
  if (error) {
    console.error("[venue console] Could not read the dashboard:", error.message);
    return fail(error, "Couldn't load this venue's figures right now.");
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, value: row ? toVenueDashboard(row) : null };
}

export async function fetchVenueMembers(
  gymId: string,
  status: MembershipStatus | null,
  limit: number,
  offset: number
): Promise<Result<{ members: VenueMember[]; total: number }>> {
  const { data, error } = await rpc<VenueMemberRow[]>("venue_members", {
    p_gym_id: gymId,
    p_status: status,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    console.error("[venue console] Could not read members:", error.message);
    return fail(error, "Couldn't load members right now.");
  }
  const rows = data ?? [];
  return { ok: true, value: { members: rows.map(toVenueMember), total: totalOf(rows) } };
}

export async function fetchClassRoster(classId: string): Promise<Result<RosterEntry[]>> {
  const { data, error } = await rpc<RosterRow[]>("venue_class_roster", { p_class_id: classId });
  if (error) {
    console.error("[venue console] Could not read the roster:", error.message);
    return fail(error, "Couldn't load this class's roster right now.");
  }
  return { ok: true, value: (data ?? []).map(toRosterEntry) };
}

export interface VenueClassLite {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
}

/**
 * The venue's classes from today on, for the console's roster list. Read from
 * business_classes by gym_id, which insiders (employees too) can read.
 */
export async function fetchVenueClasses(gymId: string, today: string): Promise<Result<VenueClassLite[]>> {
  type Row = { id: string; title: string; event_date: string; start_time: string; end_time: string; max_capacity: number };
  const { data, error } = await db
    .from("business_classes")
    .select("id, title, event_date, start_time, end_time, max_capacity")
    .eq("gym_id", gymId)
    .gte("event_date", today)
    .order("event_date")
    .order("start_time");
  if (error) {
    console.error("[venue console] Could not read classes:", error.message);
    return fail(error, "Couldn't load this venue's classes right now.");
  }
  return {
    ok: true,
    value: ((data ?? []) as Row[]).map((r) => ({
      id: r.id,
      title: r.title,
      date: r.event_date,
      startTime: r.start_time.slice(0, 5),
      endTime: r.end_time.slice(0, 5),
      maxCapacity: r.max_capacity,
    })),
  };
}

// ---------------------------------------------------------------------------
// Opening hours (owner only). Insiders read public.gym_hours directly:
// gym_hours_for() is the PUBLIC reader and returns nothing for a hidden venue.

export async function fetchHoursTable(gymId: string): Promise<Result<GymHoursTableRow[]>> {
  const { data, error } = await db.from("gym_hours").select("id, weekday, closed, open_24h, opens_at, closes_at").eq("gym_id", gymId);
  if (error) {
    console.error("[venue console] Could not read opening hours:", error.message);
    return fail(error, "Couldn't load opening hours right now.");
  }
  return { ok: true, value: (data ?? []) as GymHoursTableRow[] };
}

/**
 * Saves the seven days. Validated first (the CHECK would refuse anything
 * else); then each changed day is UPDATEd by id and each missing one INSERTed.
 * An update that RLS filters out returns no row, which is a refusal (staff,
 * not the owner), not a success.
 */
export async function saveHours(gymId: string, drafts: DayDraft[]): Promise<Result<GymHoursTableRow[]>> {
  if (Object.keys(validateDrafts(drafts)).length > 0) {
    return { ok: false, message: "Fix the highlighted days first." };
  }
  const current = await fetchHoursTable(gymId);
  if (!current.ok) return current;
  const plan = hoursWritePlan(current.value, drafts);

  for (const u of plan.updates) {
    const { data, error } = await db
      .from("gym_hours")
      .update({ ...u.row, updated_at: new Date().toISOString() })
      .eq("id", u.id)
      .select("id");
    if (error) {
      console.error("[venue console] Could not update opening hours:", error.message);
      return fail(error, "Couldn't save opening hours. Try again.");
    }
    if (!data || data.length === 0) return { ok: false, code: "42501", message: consoleMessage("42501", "", "") };
  }
  if (plan.inserts.length > 0) {
    const { error } = await db.from("gym_hours").insert(plan.inserts.map((r) => ({ gym_id: gymId, ...r })));
    if (error) {
      console.error("[venue console] Could not add opening hours:", error.message);
      return fail(error, "Couldn't save opening hours. Try again.");
    }
  }
  return fetchHoursTable(gymId);
}

/** gyms.timezone; the database checks the name against pg_timezone_names. */
export async function saveVenueTimezone(gymId: string, timezone: string): Promise<Result<string>> {
  const { data, error } = await db.from("gyms").update({ timezone }).eq("id", gymId).select("timezone");
  if (error) {
    console.error("[venue console] Could not save the time zone:", error.message);
    if (error.code === "23514") return { ok: false, code: error.code, message: "That time zone isn't recognised." };
    return fail(error, "Couldn't save the time zone. Try again.");
  }
  if (!data || data.length === 0) return { ok: false, code: "42501", message: consoleMessage("42501", "", "") };
  return { ok: true, value: timezone };
}

// ---------------------------------------------------------------------------
// Logo (business_profiles.logo_url in business-logos) and cover (gyms.cover_url
// in gym-covers). Stored as object PATHS under <owner_uid>/…; the URL is built.

export interface VenueImages {
  /** The stored paths, kept so a replacement can remove the old object. */
  logoPath: string | null;
  coverPath: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
}

const publicUrl = (bucket: "business-logos" | "gym-covers", value: string | null): string | null => {
  const p = storagePath(value);
  return p ? supabase.storage.from(bucket).getPublicUrl(p).data.publicUrl : null;
};

export async function fetchVenueImages(gymId: string, businessId: string): Promise<Result<VenueImages>> {
  const [biz, gym] = await Promise.all([
    db.from("business_profiles").select("logo_url").eq("id", businessId).maybeSingle(),
    db.from("gyms").select("cover_url").eq("id", gymId).maybeSingle(),
  ]);
  const error = biz.error ?? gym.error;
  if (error) {
    console.error("[venue console] Could not read the venue's images:", error.message);
    return fail(error, "Couldn't load the logo and cover right now.");
  }
  const logoPath = (biz.data as { logo_url: string | null } | null)?.logo_url ?? null;
  const coverPath = (gym.data as { cover_url: string | null } | null)?.cover_url ?? null;
  return {
    ok: true,
    value: { logoPath, coverPath, logoUrl: publicUrl("business-logos", logoPath), coverUrl: publicUrl("gym-covers", coverPath) },
  };
}

type ImageKind = "logo" | "cover";

/**
 * Prepares (metadata stripped by re-drawing, as forum photos are), uploads to
 * the owner's own prefix, points the column at it, and only then removes the
 * object it replaced. A failed column write removes the new object instead.
 */
export async function uploadVenueImage(params: {
  kind: ImageKind;
  uid: string;
  gymId: string;
  businessId: string;
  file: File;
  previousPath: string | null;
}): Promise<Result<{ path: string; url: string | null }>> {
  const { kind, uid, gymId, businessId, file, previousPath } = params;
  const prepared = await prepareForumPhoto(file);
  if (!prepared.ok) return { ok: false, message: prepared.message };
  const max = kind === "logo" ? LOGO_MAX_BYTES : COVER_MAX_BYTES;
  if (prepared.file.size > max) {
    return { ok: false, message: kind === "logo" ? "This logo is too large. Choose one under 2 MB." : "This photo is too large. Choose one under 5 MB." };
  }

  const bucket = kind === "logo" ? "business-logos" : "gym-covers";
  const path = kind === "logo" ? logoObjectPath(uid, crypto.randomUUID()) : coverObjectPath(uid, gymId, crypto.randomUUID());
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, prepared.file, { contentType: "image/jpeg", upsert: false });
  if (upErr) {
    console.warn(`[venue console] ${kind} upload refused:`, upErr.message);
    return { ok: false, message: isOffline(upErr) ? OFFLINE_MESSAGE : "The image couldn't be uploaded. Try again." };
  }

  const written =
    kind === "logo"
      ? await db.from("business_profiles").update({ logo_url: path }).eq("id", businessId).select("id")
      : await db.from("gyms").update({ cover_url: path }).eq("id", gymId).select("id");
  if (written.error || !written.data || written.data.length === 0) {
    console.error(`[venue console] Could not save the ${kind}:`, written.error?.message ?? "no row updated");
    await supabase.storage.from(bucket).remove([path]);
    return written.error
      ? fail(written.error, "Couldn't save the image. Try again.")
      : { ok: false, code: "42501", message: consoleMessage("42501", "", "") };
  }

  const old = replacedObject(previousPath, uid, path);
  if (old) {
    const { error } = await supabase.storage.from(bucket).remove([old]);
    if (error) console.warn(`[venue console] Could not remove the previous ${kind}:`, error.message);
  }
  return { ok: true, value: { path, url: publicUrl(bucket, path) } };
}

/** Clears the column, then removes the object (own prefix only). */
export async function removeVenueImage(params: {
  kind: ImageKind;
  uid: string;
  gymId: string;
  businessId: string;
  previousPath: string | null;
}): Promise<Result<null>> {
  const { kind, uid, gymId, businessId, previousPath } = params;
  const written =
    kind === "logo"
      ? await db.from("business_profiles").update({ logo_url: null }).eq("id", businessId).select("id")
      : await db.from("gyms").update({ cover_url: null }).eq("id", gymId).select("id");
  if (written.error) return fail(written.error, "Couldn't remove the image. Try again.");
  if (!written.data || written.data.length === 0) return { ok: false, code: "42501", message: consoleMessage("42501", "", "") };
  const old = replacedObject(previousPath, uid, "");
  if (old) {
    const { error } = await supabase.storage.from(kind === "logo" ? "business-logos" : "gym-covers").remove([old]);
    if (error) console.warn(`[venue console] Could not remove the ${kind} object:`, error.message);
  }
  return { ok: true, value: null };
}

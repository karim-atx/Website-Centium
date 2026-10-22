import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typed } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { prepareForumPhoto } from "../forum/photo";
import {
  cleanAmenities,
  cleanFirstVisit,
  ownsObject,
  parseFunnel,
  parsePerfWeek,
  parseStrength,
  parseTopItem,
  photoError,
  photoObjectPath,
  sortPhotos,
  type BusinessPhoto,
  type Funnel,
  type NewClientsWeek,
  type PerfWeek,
  type PhotoStatus,
  type ServerStrength,
  type TopItem,
} from "./listingLogic";
import type { Result } from "./index";

// B13 listing pieces for the business Marketplace (HANDOVER_API.md "B13"):
// MK-02 listing_strength + gyms.amenities / first_visit, MK-03 the photo
// gallery (business_photos + the public business-photos bucket, moderated by
// Centium), MK-07 the listing-performance readers. None of these are in the
// generated types: reads and writes go through an untyped view of the client.

const db = typed as unknown as SupabaseClient;
const BUCKET = "business-photos";

const failWith = <T>(e: { code?: string; message: string }, message: string): Result<T> => ({
  ok: false,
  code: e.code,
  message: isOffline(e) ? OFFLINE_MESSAGE : message,
});

// ---------------------------------------------------------------------------
// MK-02

export async function fetchStrength(businessId: string): Promise<Result<ServerStrength>> {
  const { data, error } = await db.rpc("listing_strength", { p_business_id: businessId });
  if (error) return failWith(error, "Couldn't load your listing strength.");
  return { ok: true, value: parseStrength((data ?? []) as { item: string; done: boolean | null }[]) };
}

export interface VenueDetails {
  amenities: string[];
  firstVisit: string | null;
}

export async function fetchVenueDetails(gymId: string): Promise<Result<VenueDetails>> {
  const { data, error } = await db.from("gyms").select("amenities, first_visit").eq("id", gymId).maybeSingle();
  if (error) return failWith(error, "Couldn't load your listing.");
  const r = (data ?? {}) as { amenities?: string[] | null; first_visit?: string | null };
  return { ok: true, value: { amenities: cleanAmenities(r.amenities ?? []), firstVisit: r.first_visit?.trim() || null } };
}

/** gyms.amenities (fixed keys) or gyms.first_visit; the venue write needs the Venues permission (gyms_update_insider). */
export async function saveVenueDetails(gymId: string, patch: Partial<VenueDetails>): Promise<Result<VenueDetails>> {
  const row: Record<string, unknown> = {};
  if (patch.amenities) row.amenities = cleanAmenities(patch.amenities);
  if (patch.firstVisit !== undefined) row.first_visit = patch.firstVisit === null ? null : cleanFirstVisit(patch.firstVisit);
  const { data, error } = await db.from("gyms").update(row).eq("id", gymId).select("amenities, first_visit");
  if (error) {
    console.error("[marketplace] Could not save the venue details:", error.message);
    return failWith(error, "Couldn't save. Try again.");
  }
  const r = (data?.[0] ?? null) as { amenities: string[] | null; first_visit: string | null } | null;
  if (!r) return { ok: false, message: "You need the Venues permission to change this. Ask the owner." };
  return { ok: true, value: { amenities: cleanAmenities(r.amenities ?? []), firstVisit: r.first_visit?.trim() || null } };
}

// ---------------------------------------------------------------------------
// MK-03

const url = (path: string): string => db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

interface PhotoRow {
  id: string;
  gym_id: string | null;
  path: string;
  caption: string | null;
  position: number;
  status: PhotoStatus;
  reject_reason: string | null;
}

const toPhoto = (r: PhotoRow): BusinessPhoto => ({
  id: r.id,
  gymId: r.gym_id,
  path: r.path,
  url: url(r.path),
  caption: r.caption?.trim() || null,
  position: r.position,
  status: r.status,
  rejectReason: r.reject_reason?.trim() || null,
});

const PHOTO_COLS = "id, gym_id, path, caption, position, status, reject_reason";

/** The business's own photos, every status (insiders see all of theirs). */
export async function fetchBusinessPhotos(businessId: string): Promise<Result<BusinessPhoto[]>> {
  const { data, error } = await db.from("business_photos").select(PHOTO_COLS).eq("business_id", businessId).order("position").order("created_at");
  if (error) return failWith(error, "Couldn't load your photos.");
  return { ok: true, value: sortPhotos(((data ?? []) as PhotoRow[]).map(toPhoto)) };
}

async function putObject(uid: string, businessId: string, file: File): Promise<Result<string>> {
  const prepared = await prepareForumPhoto(file); // metadata stripped on the device (MA1-033 K2)
  if (!prepared.ok) return { ok: false, message: prepared.message };
  if (prepared.file.size > 5 * 1024 * 1024) return { ok: false, message: "This photo is too large. Choose one under 5 MB." };
  const path = photoObjectPath(uid, businessId, `${crypto.randomUUID()}.jpg`);
  const up = await db.storage.from(BUCKET).upload(path, prepared.file, { contentType: "image/jpeg", upsert: false });
  if (up.error) {
    console.warn("[marketplace] photo upload refused:", up.error.message);
    return { ok: false, message: isOffline(up.error) ? OFFLINE_MESSAGE : "Couldn't upload the photo. Try again." };
  }
  return { ok: true, value: path };
}

const dropObject = async (path: string, uid: string): Promise<void> => {
  if (ownsObject(path, uid)) await db.storage.from(BUCKET).remove([path]);
};

/** Upload, then the row (in review until Centium approves it). ATXF5 past 20. */
export async function addBusinessPhoto(p: { uid: string; businessId: string; gymId: string | null; file: File; position: number }): Promise<Result<BusinessPhoto>> {
  const put = await putObject(p.uid, p.businessId, p.file);
  if (!put.ok) return put;
  const { data, error } = await db
    .from("business_photos")
    .insert({ business_id: p.businessId, gym_id: p.gymId, path: put.value, position: p.position })
    .select(PHOTO_COLS)
    .single();
  if (error || !data) {
    await dropObject(put.value, p.uid);
    if (error) console.warn("[marketplace] photo row refused:", error.message);
    return error ? failWith(error, photoError(error.code)) : { ok: false, message: photoError(undefined) };
  }
  return { ok: true, value: toPhoto(data as PhotoRow) };
}

/** A new file in the same place: the path changes, so the photo goes back to review. */
export async function replaceBusinessPhoto(p: { uid: string; businessId: string; photo: BusinessPhoto; file: File }): Promise<Result<BusinessPhoto>> {
  const put = await putObject(p.uid, p.businessId, p.file);
  if (!put.ok) return put;
  const { data, error } = await db.from("business_photos").update({ path: put.value }).eq("id", p.photo.id).select(PHOTO_COLS);
  if (error || !data || data.length === 0) {
    await dropObject(put.value, p.uid);
    return error ? failWith(error, photoError(error.code)) : { ok: false, message: photoError("ATX03") };
  }
  await dropObject(p.photo.path, p.uid);
  return { ok: true, value: toPhoto(data[0] as PhotoRow) };
}

export async function deleteBusinessPhoto(p: { uid: string; photo: BusinessPhoto }): Promise<Result<null>> {
  const { data, error } = await db.from("business_photos").delete().eq("id", p.photo.id).select("id");
  if (error) return failWith(error, "Couldn't delete the photo. Try again.");
  if (!data || data.length === 0) return { ok: false, message: photoError("ATX03") };
  await dropObject(p.photo.path, p.uid);
  return { ok: true, value: null };
}

/** Every photo id, once each, in the new order. */
export async function reorderBusinessPhotos(businessId: string, ids: string[]): Promise<Result<null>> {
  const { error } = await db.rpc("reorder_business_photos", { p_business_id: businessId, p_ids: ids });
  if (error) {
    console.warn("[marketplace] reorder refused:", error.message);
    return failWith(error, "Couldn't move the photo. Try again.");
  }
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// MK-07 (gate marketing; always the last 12 weeks)

export interface ListingPerformance {
  weeks: PerfWeek[];
  funnel: Funnel;
  top: TopItem[];
  newClients: NewClientsWeek[];
}

export async function fetchListingPerformance(businessId: string, topLimit = 5): Promise<Result<ListingPerformance>> {
  const [w, f, t, nc] = await Promise.all([
    db.rpc("listing_performance", { p_business_id: businessId }),
    db.rpc("listing_funnel", { p_business_id: businessId }),
    db.rpc("listing_top_items", { p_business_id: businessId, p_limit: topLimit }),
    db.rpc("listing_new_clients", { p_business_id: businessId }),
  ]);
  const e = w.error ?? f.error ?? t.error ?? nc.error;
  if (e) {
    console.warn("[marketplace] listing performance refused:", e.message);
    return failWith(e, "Couldn't load your performance.");
  }
  const funnelRow = Array.isArray(f.data) ? (f.data[0] as Record<string, unknown> | undefined) : (f.data as Record<string, unknown> | null);
  return {
    ok: true,
    value: {
      weeks: ((w.data ?? []) as Record<string, unknown>[]).map(parsePerfWeek),
      funnel: parseFunnel(funnelRow),
      top: ((t.data ?? []) as Record<string, unknown>[]).map(parseTopItem),
      newClients: ((nc.data ?? []) as { week_start: string; new_clients: number }[]).map((r) => ({ weekStart: String(r.week_start), n: Number(r.new_clients) || 0 })),
    },
  };
}

// ---------------------------------------------------------------------------
// MK-04 (business_classes writes need the Schedule permission)

export interface ClassCentium {
  centiumSpots: number | null;
  listed: boolean;
  /** Bookings whose source is "centium" (set by the database since B13). */
  centiumBooked: number;
}

export async function fetchClassCentium(classIds: string[]): Promise<Result<Map<string, ClassCentium>>> {
  const out = new Map<string, ClassCentium>();
  if (!classIds.length) return { ok: true, value: out };
  const [cl, bk] = await Promise.all([
    db.from("business_classes").select("id, centium_spots, listed_on_explore").in("id", classIds),
    db.from("business_class_bookings").select("business_class_id").in("business_class_id", classIds).eq("source", "centium"),
  ]);
  if (cl.error) return failWith(cl.error, "Couldn't load your classes.");
  const counts = new Map<string, number>();
  if (!bk.error) for (const r of (bk.data ?? []) as { business_class_id: string }[]) counts.set(r.business_class_id, (counts.get(r.business_class_id) ?? 0) + 1);
  for (const r of (cl.data ?? []) as { id: string; centium_spots: number | null; listed_on_explore: boolean | null }[])
    out.set(r.id, { centiumSpots: r.centium_spots ?? null, listed: r.listed_on_explore !== false, centiumBooked: counts.get(r.id) ?? 0 });
  return { ok: true, value: out };
}

/** Classes featured this week (MK-06 live placements; the marker on MA1-003 row 7b). Empty when not readable. */
export async function fetchFeaturedClassIds(businessId: string): Promise<Set<string>> {
  const { data, error } = await db.from("featured_placements").select("target_id").eq("business_id", businessId).eq("target_kind", "class").eq("status", "live");
  if (error) return new Set();
  return new Set(((data ?? []) as { target_id: string }[]).map((r) => r.target_id));
}

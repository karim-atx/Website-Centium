// Market + Share 3.0 · W3 · the professional Marketplace readers and writers
// (P-MA.1 Overview, P-MA.2 Showcase). Pure rules in ./model (tested).
//
// - professional_overview() (DB5, Database PR #39, 20261214030000): the hero
//   and ledger figures, and marketplace_visible = professional_is_listed(),
//   the same listed_publicly that set_marketplace_visible writes (HANDOVER_API:
//   "There is no second column"), so the Visible tile reads it from here.
// - Database 73ea87b (20261211400000): set_marketplace_visible (D-19), the
//   professional's own shelf rows (fetchShelf / saveShelfItem /
//   setShelfItemVisible / deleteShelfItem) and reorder_showcase_items.
// - DB3 on session types and plans (Database PR #39, 20261214040000):
//   appointment_services.image_url / visible; professional_plans.description
//   / image_url / visible / format (in_person | online | both). SELECT,
//   INSERT and UPDATE granted per column to authenticated (SELECT to anon
//   too). Written directly, as everything else on these tables (no RPC).
//   `visible` is "Show in Showcase", not `active` ("Offered"); a session
//   type's format stays its location_kind; plans order by `position`.
//
// LIVE (D-18): the services are appointment_services (Book; a professional's
// own rows, business_id null, active) and professional_plans (Hire). Writes
// reuse the live paths the Services page and its sheets use
// (services/pro/profile savePlan / setPlanFields / addSessionService,
// services/pro/calendar deleteSessionType); two are new here because nothing
// live did them: editing a session type WITH its description (the column is
// live, ≤ 500, in the UPDATE grant; saveSessionType leaves it out) and
// deleting a plan (DELETE is granted, policy professional_plans_delete_own;
// professional_hires.plan_id is ON DELETE RESTRICT, so a plan someone hired
// answers 23503).

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { marketRpc, type MarketResult } from "../market/rpc";
import { fetchServicePlans } from "../pro/profile";
import type { Read, Write } from "../pro/clients";
import { reorderShowcase } from "../business-market/overview";
import { uploadProductPhoto } from "../store/products";
import { PLAN_SHOWCASE_DEFAULT, parseProOverview, parseShelfRows, planShowcaseById, visibleRefusal, type Format, type LocationKind, type PlanService, type ProOverview, type SessionService, type ShelfItem } from "./model";

export * from "./model";

const from = (table: string) => supabase.from(table as never);
const failed = (error: unknown, fallback: string): Write => ({ ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : fallback });

// ---------------------------------------------------------------------------
// P-MA.1 Overview
// ---------------------------------------------------------------------------

export function fetchProOverview(): Promise<MarketResult<ProOverview | null>> {
  return marketRpc("professional_overview", undefined, "Couldn't load your marketplace figures.", parseProOverview);
}

/**
 * Shows or hides the professional's Showcase and offers (vouchers already
 * issued still work): set_marketplace_visible(p_visible) → the new state
 * (Database 73ea87b; it sets professional_profiles.listed_publicly). Turning
 * it on can be refused: ATXC6 (no verified licence or certificate), ATX47
 * (under 18), ATX48 (no date of birth); each maps to its own line
 * (VISIBLE_REFUSALS). Turning it off always works.
 */
export async function setMarketplaceVisible(visible: boolean): Promise<MarketResult<boolean>> {
  const r = await marketRpc("set_marketplace_visible", { p_visible: visible }, "Couldn't change your listing. Try again.", (data) => (typeof data === "boolean" ? data : visible));
  if (r.ok) return r;
  const refusal = visibleRefusal(r.code);
  return refusal ? { ...r, message: refusal } : r;
}

// ---------------------------------------------------------------------------
// P-MA.2 Showcase · Services (live)
// ---------------------------------------------------------------------------

const SESSION_COLUMNS = "id, name, description, duration_min, price, currency, buffer_min, colour, location_kind, image_url, visible, created_at";
type SessionDbRow = {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price: number | string;
  currency: string;
  buffer_min: number;
  colour: string | null;
  location_kind: LocationKind;
  image_url: string | null;
  visible: boolean | null;
  created_at: string;
};

/** The plan columns DB3 added (20261214040000), read beside the shared plan read (services/pro/profile fetchServicePlans). */
const PLAN_SHOWCASE_COLUMNS = "id, description, image_url, visible, format";

/** The professional's own active session types and every plan (offered or not), with their showcase fields. */
export async function fetchShowcaseServices(me: string): Promise<Read<{ sessions: SessionService[]; plans: PlanService[] }>> {
  try {
    const [s, p, x] = await Promise.all([
      from("appointment_services").select(SESSION_COLUMNS).eq("professional_id", me).is("business_id", null).eq("active", true).order("created_at"),
      fetchServicePlans(me),
      from("professional_plans").select(PLAN_SHOWCASE_COLUMNS).eq("professional_id", me),
    ]);
    if (s.error) return { ok: false, offline: isOffline(s.error) };
    if (!p.ok) return p;
    if (x.error) return { ok: false, offline: isOffline(x.error) };
    const extras = planShowcaseById(x.data);
    const sessions = ((s.data ?? []) as unknown as SessionDbRow[]).map(
      (r): SessionService => ({
        id: r.id,
        name: r.name,
        description: r.description,
        durationMin: r.duration_min,
        price: Number(r.price) || 0,
        currency: r.currency,
        bufferMin: r.buffer_min,
        colour: r.colour,
        locationKind: r.location_kind,
        imageUrl: r.image_url?.trim() || null,
        visible: r.visible !== false,
        createdAt: r.created_at,
      })
    );
    const plans = p.data.map((pl): PlanService => ({ ...pl, billing: pl.billing, ...(extras.get(pl.id) ?? PLAN_SHOWCASE_DEFAULT) }));
    return { ok: true, data: { sessions, plans } };
  } catch (e) {
    return { ok: false, offline: isOffline(e) };
  }
}

export interface SessionDraft {
  name: string;
  description: string;
  durationMin: number;
  bufferMin: number;
  price: number;
  colour: string;
  locationKind: LocationKind;
  /** The service photo (product-images, the shelf's uploader); null = none. */
  imageUrl: string | null;
  /** Show in Showcase. */
  visible: boolean;
}

/** Adds or edits a session type with its description (appointment_services, the calendar's own table). */
export async function saveSessionService(me: string, id: string | null, d: SessionDraft): Promise<Write> {
  const name = d.name.trim();
  if (!name) return { ok: false, message: "Give the service a name." };
  if (name.length > 60) return { ok: false, message: "Keep the name to 60 characters or fewer." };
  if (d.description.trim().length > 500) return { ok: false, message: "Keep the description to 500 characters or fewer." };
  const row = {
    name,
    description: d.description.trim() || null,
    duration_min: d.durationMin,
    buffer_min: d.bufferMin,
    price: d.price,
    colour: d.colour,
    location_kind: d.locationKind,
    image_url: d.imageUrl,
    visible: d.visible,
  };
  try {
    const { error } = id
      ? await from("appointment_services").update(row as never).eq("id", id).eq("professional_id", me)
      : await from("appointment_services").insert({ ...row, professional_id: me, business_id: null } as never);
    return error ? failed(error, "Couldn't save this service. Try again.") : { ok: true };
  } catch (e) {
    return failed(e, "Couldn't save this service. Try again.");
  }
}

export interface PlanShowcaseDraft {
  description: string;
  imageUrl: string | null;
  visible: boolean;
  format: Format | null;
}

/**
 * A plan's showcase fields (DB3, 20261214040000), after the shared savePlan
 * wrote the rest: description (≤ 500, professional_plans_desc_len), photo,
 * Show in Showcase, format (professional_plans_format_check).
 */
export async function savePlanShowcase(me: string, id: string, d: PlanShowcaseDraft): Promise<Write> {
  if (d.description.trim().length > 500) return { ok: false, message: "Keep the description to 500 characters or fewer." };
  try {
    const { error } = await from("professional_plans")
      .update({ description: d.description.trim() || null, image_url: d.imageUrl, visible: d.visible, format: d.format } as never)
      .eq("id", id)
      .eq("professional_id", me);
    return error ? failed(error, "Couldn't save this service. Try again.") : { ok: true };
  } catch (e) {
    return failed(e, "Couldn't save this service. Try again.");
  }
}

/** Deletes a plan. A plan clients hired stays (RESTRICT): switch Offered off instead. */
export async function deletePlanService(id: string): Promise<Write> {
  try {
    const { error } = await from("professional_plans").delete().eq("id", id);
    if (!error) return { ok: true };
    if ((error as { code?: string }).code === "23503") return { ok: false, message: "Clients have hired this plan, so it can't be deleted. Switch Offered off to stop new hires." };
    return failed(error, "Couldn't delete this service. Try again.");
  } catch (e) {
    return failed(e, "Couldn't delete this service. Try again.");
  }
}

// ---------------------------------------------------------------------------
// Session types and plans: Show in Showcase (DB3 `visible`, 20261214040000)
// ---------------------------------------------------------------------------

/** Shows or hides a session type or plan in the Showcase (its `visible`; a hidden session type stays bookable by link). */
export async function setServiceVisible(me: string, kind: "session" | "plan", id: string, visible: boolean): Promise<Write> {
  const fallback = visible ? "Couldn't show this service. Try again." : "Couldn't hide this service. Try again.";
  try {
    // Two literal payloads so npm run audit:grants checks each table's grant.
    const { error } =
      kind === "session"
        ? await from("appointment_services").update({ visible } as never).eq("id", id).eq("professional_id", me)
        : await from("professional_plans").update({ visible } as never).eq("id", id).eq("professional_id", me);
    return error ? failed(error, fallback) : { ok: true };
  } catch (e) {
    return failed(e, fallback);
  }
}

// ---------------------------------------------------------------------------
// P-MA.2 the professional's own shelf (business_offerings with professional_id)
// ---------------------------------------------------------------------------
// Database 73ea87b (20261211400000): a professional selects, inserts, updates
// and deletes their own rows (business_id null, never created hidden);
// authenticated may UPDATE title, description, price, image_url, visible,
// format, duration_label, bookable, sort (not hidden_at / hidden_reason /
// professional_id). `category` is required: a professional's item is
// 'professionals' (the enum's own value, as the Database's probe writes it).
// Photos go to the live product-images bucket under the caller's uid
// (product_images_insert_own), as a store's do.

const SHELF_COLUMNS = "id, title, description, price, image_url, format, duration_label, visible, hidden_at, sort, created_at";

/** The professional's own shelf items (hidden ones included), in the shelf's order. */
export async function fetchShelf(me: string): Promise<Read<ShelfItem[]>> {
  try {
    const { data, error } = await from("business_offerings").select(SHELF_COLUMNS).eq("professional_id", me).order("sort").order("created_at", { ascending: false }).order("id");
    if (error) return { ok: false, offline: isOffline(error) };
    return { ok: true, data: parseShelfRows(data) };
  } catch (e) {
    return { ok: false, offline: isOffline(e) };
  }
}

export interface ShelfDraft {
  name: string;
  description: string;
  /** null = no price shown. */
  price: number | null;
  imageUrl: string | null;
  format: Format | null;
  durationLabel: string;
  visible: boolean;
}

export const SHELF_NAME_MAX = 80;
export const SHELF_DURATION_MAX = 40;

/** Adds (id null) or edits one of the professional's own shelf items. */
export async function saveShelfItem(me: string, id: string | null, d: ShelfDraft): Promise<Write> {
  const title = d.name.trim();
  if (!title) return { ok: false, message: "Give the service a name." };
  if (title.length > SHELF_NAME_MAX) return { ok: false, message: `Keep the name to ${SHELF_NAME_MAX} characters or fewer.` };
  if (d.description.trim().length > 500) return { ok: false, message: "Keep the description to 500 characters or fewer." };
  const description = d.description.trim() || null;
  const duration_label = d.durationLabel.trim().slice(0, SHELF_DURATION_MAX) || null;
  try {
    // Two literal payloads (not a shared object) so npm run audit:grants checks the update.
    const { error } = id
      ? await from("business_offerings")
          .update({ title, description, price: d.price, image_url: d.imageUrl, format: d.format, duration_label, visible: d.visible } as never)
          .eq("id", id)
          .eq("professional_id", me)
      : await from("business_offerings").insert({
          professional_id: me,
          business_id: null,
          category: "professionals",
          title,
          description,
          price: d.price,
          image_url: d.imageUrl,
          format: d.format,
          duration_label,
          visible: d.visible,
        } as never);
    return error ? failed(error, "Couldn't save this service. Try again.") : { ok: true };
  } catch (e) {
    return failed(e, "Couldn't save this service. Try again.");
  }
}

/** Show in Showcase on / off for one shelf item. */
export async function setShelfItemVisible(me: string, id: string, visible: boolean): Promise<Write> {
  try {
    const { error } = await from("business_offerings").update({ visible } as never).eq("id", id).eq("professional_id", me);
    return error ? failed(error, visible ? "Couldn't show this service. Try again." : "Couldn't hide this service. Try again.") : { ok: true };
  } catch (e) {
    return failed(e, visible ? "Couldn't show this service. Try again." : "Couldn't hide this service. Try again.");
  }
}

/** Deletes one of the professional's own shelf items. */
export async function deleteShelfItem(me: string, id: string): Promise<Write> {
  try {
    const { error } = await from("business_offerings").delete().eq("id", id).eq("professional_id", me);
    return error ? failed(error, "Couldn't delete this service. Try again.") : { ok: true };
  } catch (e) {
    return failed(e, "Couldn't delete this service. Try again.");
  }
}

/** Saves the shelf's order (ids top to bottom) through reorder_showcase_items. */
export async function reorderShelf(ids: string[]): Promise<Write> {
  const r = await reorderShowcase(ids);
  return r.ok ? { ok: true } : { ok: false, message: r.offline ? OFFLINE_MESSAGE : r.message };
}

/** A service photo: the product-images bucket under the caller's own uid (uid/uid/<file>.jpg). */
export function uploadShelfPhoto(me: string, file: File): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  return uploadProductPhoto(me, file);
}

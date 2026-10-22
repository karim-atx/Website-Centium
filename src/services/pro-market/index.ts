// Market + Share 3.0 · W3 · the professional Marketplace readers and writers
// (P-MA.1 Overview, P-MA.2 Showcase). Pure rules in ./model (tested).
//
// Database stages that haven't landed go through marketRpc (W2), so a missing
// function answers `pending` and the screen shows its quiet state:
// - professional_overview(): DB5 (PLAN §2.2, api.md GET /marketplace/overview);
// - set_marketplace_visible(p_visible): DB3 (PLAN §2.2 "Professional
//   marketplace visibility"; D-19);
// - the DB3 service fields (photo_path, showcase_visible, format, sort on
//   appointment_services and professional_plans) are never selected and never
//   written until DB3 lands: their writers here answer `pending`.
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
import { parseProOverview, type LocationKind, type PlanService, type ProOverview, type SessionService } from "./model";

export * from "./model";

const from = (table: string) => supabase.from(table as never);
const failed = (error: unknown, fallback: string): Write => ({ ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : fallback });

// ---------------------------------------------------------------------------
// P-MA.1 Overview
// ---------------------------------------------------------------------------

export async function fetchProOverview(): Promise<MarketResult<ProOverview | null>> {
  // awaiting DB stage DB5
  return marketRpc("professional_overview", undefined, "Couldn't load your marketplace figures.", parseProOverview);
}

/** Shows or hides the professional's Showcase and offers (vouchers already issued still work). */
export async function setMarketplaceVisible(visible: boolean): Promise<MarketResult<boolean>> {
  // awaiting DB stage DB3
  return marketRpc("set_marketplace_visible", { p_visible: visible }, "Couldn't change your listing. Try again.", (data) => {
    const r = Array.isArray(data) ? data[0] : data;
    const v = r && typeof r === "object" ? (r as { visible?: unknown }).visible : r;
    return typeof v === "boolean" ? v : visible;
  });
}

// ---------------------------------------------------------------------------
// P-MA.2 Showcase · Services (live)
// ---------------------------------------------------------------------------

const SESSION_COLUMNS = "id, name, description, duration_min, price, currency, buffer_min, colour, location_kind, created_at";
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
  created_at: string;
};

/** The professional's own active session types and every plan (offered or not). */
export async function fetchShowcaseServices(me: string): Promise<Read<{ sessions: SessionService[]; plans: PlanService[] }>> {
  try {
    const [s, p] = await Promise.all([
      from("appointment_services").select(SESSION_COLUMNS).eq("professional_id", me).is("business_id", null).eq("active", true).order("created_at"),
      fetchServicePlans(me),
    ]);
    if (s.error) return { ok: false, offline: isOffline(s.error) };
    if (!p.ok) return p;
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
        createdAt: r.created_at,
      })
    );
    const plans = p.data.map((x): PlanService => ({ ...x, billing: x.billing }));
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
// DB3 service fields (photo_path, showcase_visible, format, sort)
// ---------------------------------------------------------------------------

/** Show or hide a service in the Showcase (showcase_visible). */
export async function setServiceShowcaseVisible(): Promise<MarketResult<null>> {
  // awaiting DB stage DB3: no column to write yet.
  return { ok: false, pending: true, message: "Hiding a service is coming soon." };
}

/** A service photo (photo_path, storage per the owner-uid path rule). */
export async function setServicePhoto(): Promise<MarketResult<null>> {
  // awaiting DB stage DB3: no column to write yet.
  return { ok: false, pending: true, message: "Service photos are coming soon." };
}

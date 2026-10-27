// Release 3 · W6 Businesses (MO9 v3, MO13, MO17 v3; decision 1: several
// businesses). The employment writes stay in services/business-team/employment
// (accept_business_employment, the own-row delete for decline and leave,
// request_to_join_business(p_code)); this adds what the new screens read:
//
// - my join requests, pending AND denied (business_join_requests, own rows
//   through business_join_requests_select_involved), for "Requests sent" with
//   the declined ones in red;
// - withdraw_join_request(p_request_id) (DB-6; ATX08 when it isn't a pending
//   request of mine);
// - request_to_join_business_by_id(p_business_id) (DB-6, MO17 Ask to join; a
//   business that isn't listed answers like a wrong code, ATXB9);
// - the business facts on each card and the detail page (business_profiles:
//   type, location, logo, cover, public email and phone);
// - the classes the business assigned to me (business_classes.professional_id),
//   for "Your schedule here" and "Classes this month".

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";

export type Write = { ok: true } | { ok: false; message: string };
export type Read<T> = { ok: true; data: T } | { ok: false; offline: boolean };

export interface JoinRequest {
  id: string;
  businessId: string;
  businessName: string;
  status: "pending" | "denied";
  createdAt: string;
  resolvedAt: string | null;
}

/** My pending requests and the ones a business declined in the last 90 days, newest first. */
export async function fetchJoinRequests(me: string, since: string): Promise<Read<JoinRequest[]>> {
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (k: string, v: string) => {
          in: (k: string, v: string[]) => { gte: (k: string, v: string) => { order: (c: string, o: { ascending: boolean }) => PromiseLike<{ data: unknown; error: unknown }> } };
        };
      };
    };
  })
    .from("business_join_requests")
    .select("id, business_id, status, created_at, resolved_at")
    .eq("professional_id", me)
    .in("status", ["pending", "denied"])
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) return { ok: false, offline: isOffline(error) };
  const rows = (data ?? []) as { id: string; business_id: string; status: "pending" | "denied"; created_at: string; resolved_at: string | null }[];
  const facts = await fetchBusinessFacts([...new Set(rows.map((r) => r.business_id))]);
  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      businessId: r.business_id,
      businessName: facts[r.business_id]?.name ?? "A business",
      status: r.status,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
    })),
  };
}

export async function withdrawJoinRequest(id: string): Promise<Write> {
  const { error } = await rpc("withdraw_join_request", { p_request_id: id });
  if (!error) return { ok: true };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  return { ok: false, message: "Couldn't withdraw. Try again." };
}

/**
 * MO17 Ask to join: same answers as joining by ID (one not-found message, a
 * rate limit). W6A-1 (20261216080000): the requested role (a wish; the
 * business chooses on accepting) and an optional message, at most 500
 * (22023 past it); blank sends null. Resolved by argument name.
 */
export async function requestToJoinById(businessId: string, ask?: { role: string | null; message: string }): Promise<Write> {
  const { error } = await rpc("request_to_join_business_by_id", {
    p_business_id: businessId,
    p_role: ask?.role ?? null,
    p_message: ask?.message.trim() || null,
  });
  if (!error) return { ok: true };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "22023" && `${error.message ?? ""}`.includes("500 characters")) return { ok: false, message: "Your message can be up to 500 characters." };
  if (error.code === "ATX02") return { ok: false, message: "Too many tries in a short time. Try again in an hour." };
  if (`${error.message ?? ""}`.includes("ATXB9")) return { ok: false, message: "This business isn't taking requests right now." };
  return { ok: false, message: "Couldn't send your request. Try again." };
}

export interface BusinessFacts {
  id: string;
  name: string;
  type: string | null;
  location: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  email: string | null;
  phone: string | null;
}

export async function fetchBusinessFacts(ids: string[]): Promise<Record<string, BusinessFacts>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("business_profiles")
    .select("id, business_name, business_type, location, logo_url, cover_url, public_email, public_phone")
    .in("id", ids);
  if (error) return {};
  const out: Record<string, BusinessFacts> = {};
  for (const r of (data ?? []) as unknown as {
    id: string;
    business_name: string | null;
    business_type: string | null;
    location: string | null;
    logo_url: string | null;
    cover_url: string | null;
    public_email: string | null;
    public_phone: string | null;
  }[])
    out[r.id] = {
      id: r.id,
      name: r.business_name?.trim() || "A business",
      type: r.business_type,
      location: r.location?.trim() || null,
      logoUrl: r.logo_url,
      coverUrl: r.cover_url,
      email: r.public_email?.trim() || null,
      phone: r.public_phone?.trim() || null,
    };
  return out;
}

export interface MyClass {
  id: string;
  businessId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}

/** The classes businesses assigned to me from `from` on (cancelled ones left out), oldest first. */
export async function fetchMyClasses(me: string, from: string): Promise<Read<MyClass[]>> {
  const { data, error } = await supabase
    .from("business_classes")
    .select("id, business_id, title, event_date, start_time, end_time")
    .eq("professional_id", me)
    .is("cancelled_at", null)
    .gte("event_date", from)
    .order("event_date", { ascending: true })
    .limit(400);
  if (error) return { ok: false, offline: isOffline(error) };
  const rows = (data ?? []) as unknown as { id: string; business_id: string; title: string; event_date: string; start_time: string | null; end_time: string | null }[];
  return {
    ok: true,
    data: rows.map((r) => ({ id: r.id, businessId: r.business_id, title: r.title, date: r.event_date, startTime: (r.start_time ?? "").slice(0, 5), endTime: (r.end_time ?? "").slice(0, 5) })),
  };
}

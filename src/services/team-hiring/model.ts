// Market + Share 3.0 · the professional side of Hiring: the row shapes and
// pure readers (no Supabase import, so node:test runs them; index.ts calls
// the functions and re-exports these).

import { bool, num, str } from "../market/parse";
import { applicationStatus, hhmmOf, isoWeekdays, parseInvites, parseOpening, payUnitOf, type ApplicationStatus, type ExistingTeamInvite, type Opening, type OpeningType, type PayUnit } from "../hiring/model";

/** An opening as a professional sees it (P-MA.5.1): the gym's card on top. */
export interface Opportunity extends Opening {
  businessId: string;
  businessName: string;
  /** The gym's VENUE reviews only (opportunities.business_rating, Database #38); null with none. */
  businessRating: number | null;
  businessReviewCount: number;
  distanceKm: number | null;
  applied: boolean;
  /** "HH:MM": the earliest start and latest end of the series the opening names (Database #38); null for a slot or a role naming none. */
  startTime: string | null;
  endTime: string | null;
}

/** A card on My applications: an application, or an offer (path "direct" when no application is behind it). */
export interface MyApplication {
  id: string;
  offerId: string | null;
  path: "opening" | "direct";
  status: ApplicationStatus;
  businessId: string;
  businessName: string;
  title: string;
  type: OpeningType;
  pay: number | null;
  payUnit: PayUnit;
  classesPerMonth: number | null;
  startsOn: string | null;
  note: string | null;
  createdAt: string | null;
}

/**
 * One opportunities row (id, business_id, business_name, logo_url, area,
 * type, title, description, schedule_label, pay, pay_unit,
 * classes_per_month, allow_pay_proposals, requirements, positions,
 * distance_km, applicants, applied, posted_at, and since Database #38
 * weekdays, start_time, end_time — from the series the opening names — and
 * business_rating, business_review_count — venue reviews only).
 */
export function parseOpportunity(r: Record<string, unknown>): Opportunity {
  const reviews = num(r.business_review_count) ?? 0;
  const rating = num(r.business_rating);
  return {
    ...parseOpening(r, { weekdays: isoWeekdays(r.weekdays) }),
    businessId: str(r.business_id) ?? "",
    businessName: str(r.business_name) ?? "",
    businessRating: reviews > 0 && rating != null ? rating : null,
    businessReviewCount: reviews,
    distanceKm: num(r.distance_km),
    applied: bool(r.applied),
    startTime: hhmmOf(r.start_time),
    endTime: hhmmOf(r.end_time),
  };
}

const OFFER_STATUS: Record<string, ApplicationStatus | null> = { pending: "OFFERED", accepted: "HIRED", declined: "DECLINED", withdrawn: null };

/** my_applications rows + my_hire_offers rows → the My applications cards (pure; exported for the tests). */
export function composeMyApplications(apps: readonly Record<string, unknown>[], offers: readonly Record<string, unknown>[]): MyApplication[] {
  const offerById = new Map(offers.filter((o) => str(o.id)).map((o) => [o.id as string, o]));
  const out: MyApplication[] = [];
  for (const a of apps) {
    const id = str(a.application_id);
    if (!id) continue;
    const type: OpeningType = a.type === "class_slot" ? "class_slot" : "role";
    const offerId = str(a.hire_offer_id);
    const fromOffer = offerId ? OFFER_STATUS[String(a.offer_status)] : null;
    const o = fromOffer && offerId ? offerById.get(offerId) : undefined;
    out.push({
      id,
      offerId: fromOffer ? offerId : null,
      path: "opening",
      status: fromOffer ?? applicationStatus(a.status),
      businessId: str(a.business_id) ?? "",
      businessName: str(a.business_name) ?? "",
      title: str(o?.title) ?? str(a.title) ?? "",
      type,
      pay: (o ? num(o.pay) : null) ?? num(a.proposed_pay) ?? num(a.pay),
      payUnit: payUnitOf(o?.pay_unit ?? a.pay_unit, type),
      classesPerMonth: (o ? num(o.classes_per_month) : null) ?? num(a.classes_per_month),
      startsOn: o ? str(o.starts_on) : null,
      note: (o ? str(o.message) : null) ?? str(a.message),
      createdAt: str(a.created_at),
    });
  }
  for (const o of offers) {
    const status = OFFER_STATUS[String(o.status)];
    const offerId = str(o.id);
    if (!status || !offerId || o.path !== "direct") continue;
    const type: OpeningType = o.type === "class_slot" ? "class_slot" : "role";
    out.push({
      id: offerId,
      offerId,
      path: "direct",
      status,
      businessId: str(o.business_id) ?? "",
      businessName: str(o.business_name) ?? "",
      title: str(o.title) ?? "",
      type,
      pay: num(o.pay),
      payUnit: payUnitOf(o.pay_unit, type),
      classesPerMonth: num(o.classes_per_month),
      startsOn: str(o.starts_on),
      note: str(o.message),
      createdAt: str(o.created_at),
    });
  }
  const rank = (a: MyApplication) => (a.status === "OFFERED" ? 0 : 1);
  return out.sort((a, b) => rank(a) - rank(b) || String(b.createdAt).localeCompare(String(a.createdAt)));
}

/**
 * The invite an existing_team_invite notification names (P-MA.7 row →
 * P-MA.5.4), in the documented form (Database #38, HANDOVER_API "The
 * notification payloads now match the contract"): subject_type
 * 'business_employee' with the INVITATION's id, payload business_name,
 * business_id, accept_by (a date: open to the end of that day, local) and
 * fee_text. null when the row isn't one.
 */
export function inviteFromNotification(n: { kind: string; memberKind?: string; subjectType: string | null; subjectId: string | null; payload: Record<string, unknown>; createdAt: string }): ExistingTeamInvite | null {
  if ((n.memberKind ?? n.kind) !== "existing_team_invite" || n.subjectType !== "business_employee") return null;
  const p = n.payload;
  const by = str(p.accept_by);
  const day = by && /^\d{4}-\d{2}-\d{2}$/.test(by) ? `${by}T23:59:59` : null;
  const inv = parseInvites([{ id: n.subjectId, business_id: p.business_id, business_name: p.business_name, sent_at: n.createdAt, expires_at: day }])[0];
  return inv ?? null;
}

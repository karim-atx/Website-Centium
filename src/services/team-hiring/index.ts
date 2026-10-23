// Market + Share 3.0 · W4 · Hiring, the professional side (P-MA.5.1–5.4):
// openings near me, apply, my applications and direct offers, accept /
// decline, my work, existing-team invites.
//
// Every call awaits Database stage DB8 (and DB11 for `open_to_gym_work`):
// PLAN §2.2 DB8, api.md "Hiring (gyms only)". `pending` → the quiet designed
// state; never sample data.

import { marketRpc, type MarketResult } from "../market/rpc";
import { bool, num, rows, str } from "../market/parse";
import { hiringWrite, type HiringWrite } from "../hiring";
import {
  applicationStatus,
  parseInvites,
  parseOpening,
  type ApplicationStatus,
  type ExistingTeamInvite,
  type Opening,
  type OpeningType,
  type PayUnit,
} from "../hiring/model";

export type { HiringWrite } from "../hiring";

/** An opening as a professional sees it (P-MA.5.1): the gym's card on top. */
export interface Opportunity extends Opening {
  businessId: string;
  businessName: string;
  businessRating: number | null;
  distanceKm: number | null;
  applied: boolean;
}

/** A card on My applications: an application, or a direct offer (path "direct"). */
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

export interface WorkClass {
  title: string;
  weekday: number | null;
  startTime: string | null;
  label: string | null;
}

/** A card on My work (P-MA.5.3). */
export interface WorkItem {
  hireId: string;
  businessId: string;
  businessName: string;
  roleTitle: string;
  type: OpeningType;
  since: string | null;
  tag: "NEW" | "HIRED" | "SLOT";
  classes: WorkClass[];
  sessionsAWeek: number;
  pay: number | null;
  payUnit: PayUnit;
}

export interface OpportunityFilters {
  type: OpeningType | null;
  specialty: string | null;
  distanceKm: number | null;
}

export function parseOpportunity(r: Record<string, unknown>): Opportunity {
  return {
    ...parseOpening(r),
    businessId: str(r.business_id) ?? "",
    businessName: str(r.business_name) ?? "",
    businessRating: num(r.business_rating) ?? num(r.rating),
    distanceKm: num(r.distance_km),
    applied: bool(r.applied),
  };
}

export function parseMyApplication(r: Record<string, unknown>): MyApplication {
  const type: OpeningType = r.type === "class_slot" ? "class_slot" : "role";
  const unit = r.pay_unit;
  return {
    id: str(r.id) ?? str(r.application_id) ?? str(r.hire_offer_id) ?? "",
    offerId: str(r.hire_offer_id) ?? str(r.offer_id),
    path: r.path === "direct" ? "direct" : "opening",
    status: applicationStatus(r.status),
    businessId: str(r.business_id) ?? "",
    businessName: str(r.business_name) ?? "",
    title: str(r.title) ?? str(r.role_title) ?? "",
    type,
    pay: num(r.pay),
    payUnit: unit === "per_class" || unit === "per_month" || unit === "per_slot" ? unit : type === "class_slot" ? "per_slot" : "per_class",
    classesPerMonth: num(r.classes_per_month),
    startsOn: str(r.starts_on),
    note: str(r.note) ?? str(r.message),
    createdAt: str(r.created_at),
  };
}

function parseWorkClass(v: unknown): WorkClass | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  const title = str(c.title) ?? str(c.class_title);
  return title ? { title, weekday: num(c.weekday), startTime: str(c.start_time), label: str(c.label) } : null;
}

export function parseWorkItem(r: Record<string, unknown>): WorkItem {
  const type: OpeningType = r.type === "class_slot" ? "class_slot" : "role";
  const t = typeof r.tag === "string" ? r.tag.toUpperCase() : "";
  const unit = r.pay_unit;
  return {
    hireId: str(r.hire_id) ?? str(r.id) ?? "",
    businessId: str(r.business_id) ?? "",
    businessName: str(r.business_name) ?? "",
    roleTitle: str(r.role_title) ?? str(r.title) ?? "",
    type,
    since: str(r.since) ?? str(r.starts_on) ?? str(r.hired_at),
    tag: t === "NEW" || t === "SLOT" ? t : type === "class_slot" ? "SLOT" : "HIRED",
    classes: (Array.isArray(r.classes) ? r.classes : []).map(parseWorkClass).filter((c): c is WorkClass => !!c),
    sessionsAWeek: num(r.sessions_a_week) ?? 0,
    pay: num(r.pay),
    payUnit: unit === "per_class" || unit === "per_month" || unit === "per_slot" ? unit : type === "class_slot" ? "per_slot" : "per_class",
  };
}

/** opportunities(p_tab, p_type, p_specialty, p_distance_km). */
export function fetchOpportunities(tab: "gyms" | "classes", f: OpportunityFilters): Promise<MarketResult<Opportunity[]>> {
  // awaiting DB stage DB8 (DB11 open_to_gym_work)
  return marketRpc(
    "opportunities",
    { p_tab: tab, p_type: f.type, p_specialty: f.specialty, p_distance_km: f.distanceKm },
    "Couldn't load openings.",
    (data) => rows(data).map(parseOpportunity).filter((o) => o.id),
  );
}

export interface ApplyInput {
  message: string | null;
  proposedPay: number | null;
  availabilityConfirmed: boolean;
  attachments: { kind: "credential" | "service" | "work_history" | "file"; refId: string | null; label: string }[];
}

/** apply_to_opening ⟳ (errors pay_locked, already_applied). */
export function applyToOpening(openingId: string, input: ApplyInput, requestId: string): Promise<HiringWrite> {
  // awaiting DB stage DB8
  return hiringWrite(
    "apply_to_opening",
    {
      p_opening_id: openingId,
      p_message: input.message,
      p_proposed_pay: input.proposedPay,
      p_availability_confirmed: input.availabilityConfirmed,
      p_attachments: input.attachments.map((a) => ({ kind: a.kind, ref_id: a.refId, label: a.label })),
      p_request_id: requestId,
    },
    "Couldn't send your application. Check your connection and try again.",
    () => null,
  );
}

/** my_applications: APPLIED / SHORTLISTED / OFFERED / HIRED / DECLINED, plus direct offers. */
export function fetchMyApplications(): Promise<MarketResult<MyApplication[]>> {
  // awaiting DB stage DB8
  return marketRpc("my_applications", {}, "Couldn't load your applications.", (data) => rows(data).map(parseMyApplication).filter((a) => a.id));
}

/** Clashes on accept: the professional sees titles and times. */
export interface Clash {
  title: string;
  start: string;
  end: string;
}

/** accept_hire_offer(p_ack_conflicts) ⟳: `conflicts` comes back unless acknowledged. */
export function acceptHireOffer(offerId: string, ackConflicts: boolean, requestId: string): Promise<HiringWrite> {
  // awaiting DB stage DB8 (the calendar series: DB9)
  return hiringWrite("accept_hire_offer", { p_offer_id: offerId, p_ack_conflicts: ackConflicts, p_request_id: requestId }, "Couldn't accept the offer. Try again.", () => null);
}

/** The clashes a `conflicts` refusal carries (its details), when it sends them. */
export function clashesOf(details: unknown): Clash[] {
  let v = details;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  return (Array.isArray(v) ? v : [])
    .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : null))
    .filter((c): c is Record<string, unknown> => !!c && typeof c.start === "string" && typeof c.end === "string")
    .map((c) => ({ title: str(c.title) ?? "", start: c.start as string, end: c.end as string }));
}

export function declineHireOffer(offerId: string): Promise<HiringWrite> {
  // awaiting DB stage DB8
  return hiringWrite("decline_hire_offer", { p_offer_id: offerId }, "Couldn't decline the offer. Try again.", () => null);
}

/** my_work: hires + assigned classes + sessions a week. */
export function fetchMyWork(): Promise<MarketResult<WorkItem[]>> {
  // awaiting DB stage DB8
  return marketRpc("my_work", {}, "Couldn't load your work.", (data) => rows(data).map(parseWorkItem).filter((w) => w.hireId));
}

/**
 * An existing-team invite from its notification (P-MA.7 row → P-MA.5.4).
 * There is no invite reader: the invite reaches the professional as a MEMBER
 * inbox row (Database 20261210600000's payload table): kind
 * `existing_team_invite`, subject_type `business_employee` (subject_id = the
 * business_employees row, the invite), payload business_name, business_id,
 * accept_by, fee_text. A bare `accept_by` date is open to the end of that
 * day. `memberKind` is the hub's row (services/pro/notifications), `kind` a
 * my_notifications row. null when the row isn't an invite.
 * awaiting DB stage DB12: nothing writes existing_team_invite yet.
 */
export function inviteFromNotification(n: { kind: string; memberKind?: string; subjectType: string | null; subjectId: string | null; payload: Record<string, unknown>; createdAt: string }): ExistingTeamInvite | null {
  if ((n.memberKind ?? n.kind) !== "existing_team_invite" || n.subjectType !== "business_employee") return null;
  const p = n.payload;
  const by = str(p.accept_by);
  const expiresAt = by && /^\d{4}-\d{2}-\d{2}$/.test(by) ? `${by}T23:59:59` : by;
  const inv = parseInvites([{ id: n.subjectId, business_id: p.business_id, business_name: p.business_name, sent_at: n.createdAt, expires_at: expiresAt }])[0];
  return inv ?? null;
}

/** accept_existing_team_invite (invite_expired after the window). */
export function acceptExistingTeamInvite(inviteId: string): Promise<HiringWrite> {
  // awaiting DB stage DB8
  return hiringWrite("accept_existing_team_invite", { p_invite_id: inviteId }, "Couldn't accept the invite. Try again.", () => null);
}

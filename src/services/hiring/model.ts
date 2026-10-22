// Market + Share 3.0 · W4 · Hiring and Team: row shapes and pure readers.
//
// Database stage DB8 (Hiring, Team, fees, existing team) has NOT landed
// (checked 2026-10-22: no Release 2 branch in ../Database, none of these
// functions on the local stack). The shapes follow PLAN §2.2 DB8, api.md
// "Hiring (gyms only)" and types.ts (Opening, Application, HireOffer, Hire,
// TeamMember, ExistingTeamWindow, ExistingTeamInvite, HiringFee,
// ProfessionalCard), in the database's snake_case. The parsers are tolerant
// (a missing column reads as null / empty) so the lead can rewire to the
// documented columns when HANDOVER_API.md gains a Hiring section, without the
// screens changing. No Supabase import here: the module stays testable.

import { bool, num, rows, str } from "../market/parse";
import { quoteHiringFee, type HiringFeeQuote, type OpeningType, type PayUnit } from "./fee";

export type { OpeningType, PayUnit } from "./fee";

export type OpeningStatus = "open" | "filled" | "closed";
/** The board's status labels, identical in both UIs (STATUS_STEPS colours). */
export type ApplicationStatus = "APPLIED" | "SHORTLISTED" | "OFFERED" | "HIRED" | "DECLINED";

/** ProfessionalCard (types.ts): one identity everywhere. Never contact fields. */
export interface ProCard {
  id: string;
  name: string;
  photoUrl: string | null;
  specialty: string | null;
  rating: number | null;
  reviewCount: number;
  hiredViaCentiumCount: number;
  distanceKm: number | null;
  onTeam: boolean;
  rank: number | null;
}

export interface Opening {
  id: string;
  type: OpeningType;
  title: string;
  description: string | null;
  classSeriesIds: string[];
  classSessionId: string | null;
  /** The class line the gym linked ("Spin 45"), when the reader names it. */
  className: string | null;
  /** First session of a linked series or the slot's session, ISO. */
  startsAt: string | null;
  /** ISO weekdays, 1 = Monday … 7 = Sunday (PLAN §2.2 "week days run Monday first"; to confirm with DB8). */
  weekdays: number[];
  pay: number | null;
  payUnit: PayUnit;
  classesPerMonth: number | null;
  allowPayProposals: boolean;
  requirements: string[];
  positions: number;
  status: OpeningStatus;
  postedAt: string | null;
  closedAt: string | null;
  applicantCount: number;
  newApplicantCount: number;
  hiredName: string | null;
  hiredAt: string | null;
  hiredPath: "opening" | "direct" | null;
}

export interface Attachment {
  kind: "credential" | "service" | "work_history" | "file";
  refId: string | null;
  label: string;
}

export interface Application {
  id: string;
  openingId: string;
  professional: ProCard;
  message: string | null;
  proposedPay: number | null;
  attachments: Attachment[];
  status: ApplicationStatus;
  isNew: boolean;
  createdAt: string | null;
  hireStartsOn: string | null;
}

export interface TeamClass {
  seriesId: string | null;
  title: string;
  /** ISO weekday, 1 = Monday … 7 = Sunday. */
  weekday: number | null;
  startTime: string | null;
  /** The reader's own line, e.g. "Every Friday · Spin instructor". */
  label: string | null;
}

export interface TeamHire {
  id: string;
  title: string;
  type: OpeningType;
  hiredAt: string | null;
  startsOn: string | null;
}

export interface TeamMember {
  professional: ProCard;
  source: "existing_team" | "hire";
  firstAddedAt: string | null;
  hires: TeamHire[];
  classes: TeamClass[];
}

export interface HiringFee {
  id: string;
  hireId: string | null;
  professionalName: string;
  roleTitle: string;
  type: OpeningType;
  hiredAt: string | null;
  quote: HiringFeeQuote;
  status: "DUE" | "PAID";
}

export interface ExistingTeamWindow {
  opensAt: string | null;
  closesAt: string | null;
  daysLeft: number;
  open: boolean;
}

export type ProfessionalType = "trainer" | "dietitian" | "physiotherapist" | "other";

export interface ExistingTeamInvite {
  id: string;
  businessId: string | null;
  businessName: string;
  name: string | null;
  professionalType: ProfessionalType | null;
  sentAt: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
}

// ---------------------------------------------------------------------------
// readers

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strs = (v: unknown): string[] => arr(v).map(str).filter((x): x is string => !!x);
const nums = (v: unknown): number[] => arr(v).map(num).filter((x): x is number => x != null);

const openingType = (v: unknown): OpeningType => (v === "class_slot" ? "class_slot" : "role");
const payUnit = (v: unknown, type: OpeningType): PayUnit =>
  v === "per_class" || v === "per_month" || v === "per_slot" ? v : type === "class_slot" ? "per_slot" : "per_class";

const STATUSES: ApplicationStatus[] = ["APPLIED", "SHORTLISTED", "OFFERED", "HIRED", "DECLINED"];
export function applicationStatus(v: unknown): ApplicationStatus {
  const s = typeof v === "string" ? v.toUpperCase() : "";
  return (STATUSES as string[]).includes(s) ? (s as ApplicationStatus) : "APPLIED";
}

/** A ProfessionalCard from a row (flat, or nested under `professional`). */
export function parseProCard(r: Record<string, unknown>): ProCard {
  const p = r.professional && typeof r.professional === "object" ? (r.professional as Record<string, unknown>) : r;
  return {
    id: str(p.professional_id) ?? str(p.id) ?? "",
    name: str(p.name) ?? str(p.display_name) ?? str(p.full_name) ?? "",
    photoUrl: str(p.photo_url) ?? str(p.avatar_url),
    specialty: str(p.specialty) ?? str(p.headline),
    rating: num(p.rating) ?? num(p.average_rating),
    reviewCount: num(p.review_count) ?? 0,
    hiredViaCentiumCount: num(p.hired_via_centium_count) ?? num(p.hire_count) ?? 0,
    distanceKm: num(p.distance_km),
    onTeam: bool(p.on_team) || bool(r.on_team),
    rank: num(p.rank) ?? num(r.rank),
  };
}

export function parseOpening(r: Record<string, unknown>): Opening {
  const type = openingType(r.type);
  const st = str(r.status);
  return {
    id: str(r.id) ?? str(r.opening_id) ?? "",
    type,
    title: str(r.title) ?? "",
    description: str(r.description),
    classSeriesIds: strs(r.class_series_ids),
    classSessionId: str(r.class_session_id),
    className: str(r.class_title) ?? str(r.class_name),
    startsAt: str(r.starts_at) ?? str(r.session_starts_at),
    weekdays: nums(r.weekdays),
    pay: num(r.pay) ?? num(r.pay_amount),
    payUnit: payUnit(r.pay_unit, type),
    classesPerMonth: num(r.classes_per_month),
    allowPayProposals: bool(r.allow_pay_proposals),
    requirements: strs(r.requirements),
    positions: num(r.positions) ?? 1,
    status: st === "filled" || st === "closed" ? st : "open",
    postedAt: str(r.posted_at) ?? str(r.created_at),
    closedAt: str(r.closed_at),
    applicantCount: num(r.applicant_count) ?? 0,
    newApplicantCount: num(r.new_applicant_count) ?? 0,
    hiredName: str(r.hired_name) ?? str(r.hired_professional_name),
    hiredAt: str(r.hired_at),
    hiredPath: r.hired_path === "direct" ? "direct" : r.hired_path === "opening" ? "opening" : null,
  };
}

export const parseOpenings = (data: unknown): Opening[] => rows(data).map(parseOpening).filter((o) => o.id);

function parseAttachment(v: unknown): Attachment | null {
  if (!v || typeof v !== "object") return null;
  const a = v as Record<string, unknown>;
  const label = str(a.label);
  if (!label) return null;
  const k = a.kind;
  return { kind: k === "credential" || k === "service" || k === "work_history" ? k : "file", refId: str(a.ref_id), label };
}

export function parseApplication(r: Record<string, unknown>): Application {
  return {
    id: str(r.id) ?? str(r.application_id) ?? "",
    openingId: str(r.opening_id) ?? "",
    professional: parseProCard(r),
    message: str(r.message),
    proposedPay: num(r.proposed_pay),
    attachments: arr(r.attachments).map(parseAttachment).filter((a): a is Attachment => !!a),
    status: applicationStatus(r.status),
    isNew: bool(r.is_new),
    createdAt: str(r.created_at),
    hireStartsOn: str(r.hire_starts_on) ?? str(r.starts_on),
  };
}

export const parseApplications = (data: unknown): Application[] => rows(data).map(parseApplication).filter((a) => a.id);

export const parseProCards = (data: unknown): ProCard[] => rows(data).map(parseProCard).filter((p) => p.id);

function parseTeamClass(v: unknown): TeamClass | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  const title = str(c.title) ?? str(c.class_title);
  if (!title) return null;
  return { seriesId: str(c.class_series_id) ?? str(c.series_id), title, weekday: num(c.weekday), startTime: str(c.start_time), label: str(c.label) };
}

function parseTeamHire(v: unknown): TeamHire | null {
  if (!v || typeof v !== "object") return null;
  const h = v as Record<string, unknown>;
  const id = str(h.id) ?? str(h.hire_id);
  if (!id) return null;
  return { id, title: str(h.title) ?? str(h.role_title) ?? "", type: openingType(h.type), hiredAt: str(h.hired_at), startsOn: str(h.starts_on) };
}

export function parseTeamMember(r: Record<string, unknown>): TeamMember {
  return {
    professional: parseProCard(r),
    source: r.source === "existing_team" ? "existing_team" : "hire",
    firstAddedAt: str(r.first_added_at) ?? str(r.added_at),
    hires: arr(r.hires).map(parseTeamHire).filter((h): h is TeamHire => !!h),
    classes: arr(r.classes ?? r.assigned_classes).map(parseTeamClass).filter((c): c is TeamClass => !!c),
  };
}

export const parseTeam = (data: unknown): TeamMember[] => rows(data).map(parseTeamMember).filter((m) => m.professional.id);

export function parseHiringFee(r: Record<string, unknown>): HiringFee {
  const type = openingType(r.type);
  const base = num(r.base) ?? 0;
  const mirror = quoteHiringFee(type, base);
  const pct = num(r.percent_amount) ?? mirror.percentAmount;
  const min = num(r.minimum) ?? mirror.minimum;
  const fee = num(r.fee) ?? num(r.amount) ?? mirror.fee;
  const status = typeof r.status === "string" && r.status.toUpperCase() === "PAID" ? "PAID" : "DUE";
  return {
    id: str(r.id) ?? str(r.hiring_fee_id) ?? "",
    hireId: str(r.hire_id),
    professionalName: str(r.professional_name) ?? str(r.name) ?? "",
    roleTitle: str(r.role_title) ?? str(r.title) ?? "",
    type,
    hiredAt: str(r.hired_at) ?? str(r.charged_at),
    quote: {
      type,
      base,
      basis: type === "role" ? "first_month_pay" : "slot_total_pay",
      percentAmount: pct,
      minimum: min,
      fee,
      // The server's flag when it sends one; else strictly-higher, as the mirror.
      minimumApplied: r.minimum_applied == null ? min > pct : bool(r.minimum_applied),
    },
    status,
  };
}

export const parseHiringFees = (data: unknown): HiringFee[] => rows(data).map(parseHiringFee).filter((f) => f.id);

export function parseWindow(data: unknown): ExistingTeamWindow | null {
  const r = rows(data)[0];
  if (!r) return null;
  const daysLeft = Math.max(0, num(r.days_left) ?? 0);
  return { opensAt: str(r.opens_at), closesAt: str(r.closes_at), daysLeft, open: r.open == null ? daysLeft > 0 : bool(r.open) };
}

const PRO_TYPES: ProfessionalType[] = ["trainer", "dietitian", "physiotherapist", "other"];
export function parseInvite(r: Record<string, unknown>): ExistingTeamInvite {
  const t = str(r.professional_type);
  return {
    id: str(r.id) ?? str(r.invite_id) ?? "",
    businessId: str(r.business_id),
    businessName: str(r.business_name) ?? "",
    name: str(r.name),
    professionalType: t && (PRO_TYPES as string[]).includes(t) ? (t as ProfessionalType) : null,
    sentAt: str(r.sent_at) ?? str(r.created_at),
    expiresAt: str(r.expires_at),
    acceptedAt: str(r.accepted_at),
  };
}

export const parseInvites = (data: unknown): ExistingTeamInvite[] => rows(data).map(parseInvite).filter((i) => i.id);

// ---------------------------------------------------------------------------
// window maths (D-31: verification date, or launch if later, + 30 days)

export const EXISTING_TEAM_WINDOW_DAYS = 30;

/** Fraction of the window used, 0..1 (the countdown bar on B-MA.8.8: 24 days left → 20%). */
export function windowUsed(daysLeft: number): number {
  const d = Math.min(EXISTING_TEAM_WINDOW_DAYS, Math.max(0, daysLeft));
  return (EXISTING_TEAM_WINDOW_DAYS - d) / EXISTING_TEAM_WINDOW_DAYS;
}

// ---------------------------------------------------------------------------
// errors (PLAN §2.2 DB8 / api.md names; mapped by name, as offers do)

export type HiringError =
  | "not_a_gym"
  | "pay_locked"
  | "already_applied"
  | "conflicts"
  | "conflict_warning"
  | "offer_withdrawn"
  | "window_closed"
  | "not_a_professional"
  | "invite_expired"
  | "professional_code"
  | "professional_account"
  | "instructor_not_on_team"
  | "invalid_pay";

const ERRORS: HiringError[] = [
  "not_a_gym",
  "pay_locked",
  "already_applied",
  "conflict_warning",
  "conflicts",
  "offer_withdrawn",
  "window_closed",
  "not_a_professional",
  "invite_expired",
  "professional_code",
  "professional_account",
  "instructor_not_on_team",
  "invalid_pay",
];

export function hiringErrorOf(e: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null | undefined): HiringError | null {
  if (!e) return null;
  const hay = [e.code, e.message, e.details, e.hint].filter(Boolean).join(" ").toLowerCase();
  for (const k of ERRORS) if (hay.includes(k)) return k;
  return null;
}

/** The board's words where it has them; ours otherwise (listed in W4.md). */
export const HIRING_ERROR_TEXT: Record<HiringError, string> = {
  not_a_gym: "Hiring is for gyms and studios.",
  pay_locked: "This opening doesn't take proposals.",
  already_applied: "You've already applied to this opening.",
  conflict_warning: "This overlaps a time already busy on their calendar.",
  conflicts: "This overlaps a time already busy on your calendar.",
  offer_withdrawn: "The gym withdrew this offer.",
  window_closed: "New professionals join through Hiring",
  not_a_professional: "This account isn't a professional account.",
  invite_expired: "This invite has expired",
  professional_code: "Add professionals to your team through Hiring.",
  professional_account: "New professionals join through Hiring.",
  instructor_not_on_team: "Only your Team can be named. Add people through Hiring.",
  invalid_pay: "Enter the pay for this opening.",
};

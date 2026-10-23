// Market + Share 3.0 · Hiring and Team: row shapes and pure readers.
//
// Database Release 2 (release/hiring-team-calendar-and-reviews abf4b2c +
// ff093b7, migrations 20261213000000–20261213080000; no HANDOVER_API section
// yet, so the migration comments and function definitions are the contract).
// Each reader below names the function or table it reads and its exact
// columns. No Supabase import here: the module stays testable under
// node:test.

import { bool, num, rows, str } from "../market/parse";
import { parseFeeQuote, type HiringFeeQuote, type OpeningType, type PayUnit } from "./fee";

export type { OpeningType, PayUnit } from "./fee";

/** public.opening_status. */
export type OpeningStatus = "open" | "filled" | "closed";
/** The board's status labels (public.application_status, upper-cased), identical in both UIs (STATUS_STEPS colours). */
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
  /** openings.schedule_label, the gym's own words when it gave some. */
  scheduleLabel: string | null;
  /** The class line the gym linked ("Spin 45"), from its class series / session. */
  className: string | null;
  /** First session of the linked series or the slot's session, ISO local. */
  startsAt: string | null;
  /** ISO weekdays of the linked series, 1 = Monday … 7 = Sunday (class_series.weekdays). */
  weekdays: number[];
  pay: number | null;
  payUnit: PayUnit;
  classesPerMonth: number | null;
  allowPayProposals: boolean;
  requirements: string[];
  positions: number;
  status: OpeningStatus;
  /** An admin took it down (openings.hidden_at). */
  hidden: boolean;
  postedAt: string | null;
  /** A closed opening's last change (openings.updated_at: set_opening_status stamps it). */
  closedAt: string | null;
  applicantCount: number;
  shortlistedCount: number;
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
  /** Nobody has decided on it yet (status applied): the server's "new" (my_openings.new_applicants). */
  isNew: boolean;
  createdAt: string | null;
  /** The accepted offer's start, once HIRED. */
  hireStartsOn: string | null;
  /** The fee behind a HIRED card: the charged amount when the caller may read fees, else the quote the gym was shown. */
  fee: number | null;
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
  /** What the offer showed (quoted_amount); differs from quote.fee only if the rate moved between offer and accept. */
  quotedAmount: number | null;
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

export const openingType = (v: unknown): OpeningType => (v === "class_slot" ? "class_slot" : "role");
export const payUnitOf = (v: unknown, type: OpeningType): PayUnit =>
  v === "per_class" || v === "per_month" || v === "per_slot" ? v : type === "class_slot" ? "per_slot" : "per_class";

const STATUSES: ApplicationStatus[] = ["APPLIED", "SHORTLISTED", "OFFERED", "HIRED", "DECLINED"];
export function applicationStatus(v: unknown): ApplicationStatus {
  const s = typeof v === "string" ? v.toUpperCase() : "";
  return (STATUSES as string[]).includes(s) ? (s as ApplicationStatus) : "APPLIED";
}

/**
 * search_professionals rows (professional_id, first_name, avatar_url,
 * specialty, headline, area_label, average_rating, review_count — both from
 * professional_rating() — hired_via_centium, on_this_team,
 * open_to_gym_work), in the server's order (Centium hires, then rating): the
 * rank is the position. No distance is returned.
 */
export function parseSearchRows(data: unknown): ProCard[] {
  return rows(data)
    .filter((r) => str(r.professional_id))
    .map((r, i) => ({
      id: r.professional_id as string,
      name: str(r.first_name)?.trim() ?? "",
      photoUrl: str(r.avatar_url),
      specialty: str(r.specialty) ?? str(r.headline),
      rating: num(r.average_rating),
      reviewCount: num(r.review_count) ?? 0,
      hiredViaCentiumCount: num(r.hired_via_centium) ?? 0,
      distanceKm: null,
      onTeam: bool(r.on_this_team),
      rank: i + 1,
    }));
}

/**
 * opening_applicants rows (application_id, professional_id, first_name,
 * avatar_url, specialty, headline, message, proposed_pay,
 * availability_confirmed, attachments, status, average_rating, review_count,
 * hired_via_centium, created_at) → the card part.
 */
export function applicantCard(r: Record<string, unknown>, onTeam: boolean): ProCard {
  return {
    id: str(r.professional_id) ?? "",
    name: str(r.first_name)?.trim() ?? "",
    photoUrl: str(r.avatar_url),
    specialty: str(r.specialty) ?? str(r.headline),
    rating: num(r.average_rating),
    reviewCount: num(r.review_count) ?? 0,
    hiredViaCentiumCount: num(r.hired_via_centium) ?? 0,
    distanceKm: null,
    onTeam,
    rank: null,
  };
}

/** The enrichment the business reads beside my_openings (its own class series and sessions, its accepted offers). */
export interface OpeningExtras {
  className?: string | null;
  startsAt?: string | null;
  weekdays?: number[];
  hiredName?: string | null;
  hiredAt?: string | null;
  hiredPath?: "opening" | "direct" | null;
  closedAt?: string | null;
}

/**
 * One my_openings row (id, type, title, description, class_series_ids,
 * class_session_id, schedule_label, pay, pay_unit, classes_per_month,
 * allow_pay_proposals, requirements, positions, status, hidden_at,
 * posted_at, applicants, shortlisted, new_applicants).
 */
export function parseOpening(r: Record<string, unknown>, x: OpeningExtras = {}): Opening {
  const type = openingType(r.type);
  const st = str(r.status);
  return {
    id: str(r.id) ?? "",
    type,
    title: str(r.title) ?? "",
    description: str(r.description),
    classSeriesIds: strs(r.class_series_ids),
    classSessionId: str(r.class_session_id),
    scheduleLabel: str(r.schedule_label),
    className: x.className ?? null,
    startsAt: x.startsAt ?? null,
    weekdays: x.weekdays ?? [],
    pay: num(r.pay),
    payUnit: payUnitOf(r.pay_unit, type),
    classesPerMonth: num(r.classes_per_month),
    allowPayProposals: bool(r.allow_pay_proposals),
    requirements: strs(r.requirements),
    positions: num(r.positions) ?? 1,
    status: st === "filled" || st === "closed" ? st : "open",
    hidden: !!str(r.hidden_at),
    postedAt: str(r.posted_at),
    closedAt: x.closedAt ?? null,
    applicantCount: num(r.applicants) ?? 0,
    shortlistedCount: num(r.shortlisted) ?? 0,
    newApplicantCount: num(r.new_applicants) ?? 0,
    hiredName: x.hiredName ?? null,
    hiredAt: x.hiredAt ?? null,
    hiredPath: x.hiredPath ?? null,
  };
}

export function parseAttachment(v: unknown): Attachment | null {
  if (!v || typeof v !== "object") return null;
  const a = v as Record<string, unknown>;
  const label = str(a.label);
  if (!label) return null;
  const k = a.kind;
  return { kind: k === "credential" || k === "service" || k === "work_history" ? k : "file", refId: str(a.ref_id), label };
}

/** One opening_applicants row (applicantCard) with the opening it belongs to. */
export function parseApplication(r: Record<string, unknown>, openingId: string, card: ProCard, x: { hireStartsOn?: string | null; fee?: number | null } = {}): Application {
  const status = applicationStatus(r.status);
  return {
    id: str(r.application_id) ?? "",
    openingId,
    professional: card,
    message: str(r.message),
    proposedPay: num(r.proposed_pay),
    attachments: arr(r.attachments).map(parseAttachment).filter((a): a is Attachment => !!a),
    status,
    isNew: status === "APPLIED",
    createdAt: str(r.created_at),
    hireStartsOn: x.hireStartsOn ?? null,
    fee: x.fee ?? null,
  };
}

/**
 * One my_hiring_fees row (id, hire_id, professional_id, first_name,
 * role_title, type, base, basis, percent_amount, minimum, amount,
 * minimum_applied, quoted_amount, status due | paid, charge_id,
 * charge_status, charged_at, paid_at); null when its arithmetic isn't all
 * there.
 */
export function parseHiringFee(r: Record<string, unknown>): HiringFee | null {
  const type = openingType(r.type);
  const quote = parseFeeQuote(type, r);
  const id = str(r.id);
  if (!quote || !id) return null;
  return {
    id,
    hireId: str(r.hire_id),
    professionalName: str(r.first_name) ?? "",
    roleTitle: str(r.role_title) ?? "",
    type,
    hiredAt: str(r.charged_at),
    quote,
    quotedAmount: num(r.quoted_amount),
    status: r.status === "paid" ? "PAID" : "DUE",
  };
}

export const parseHiringFees = (data: unknown): HiringFee[] => rows(data).map(parseHiringFee).filter((f): f is HiringFee => !!f);

/** existing_team_window(p_business_id) → business_id, opens_at, closes_at, days_left, open (closed with no dates until Karim sets the start). */
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
// class series → the lines Team and the opening cards show

/** class_series.weekdays: ISO 1 = Monday … 7 = Sunday (my_calendar names them from date '2024-01-01' + (w - 1), a Monday). */
export function isoWeekdays(v: unknown): number[] {
  return [...new Set(arr(v).map(num).filter((n): n is number => n != null && Number.isInteger(n) && n >= 1 && n <= 7))].sort((a, b) => a - b);
}

/** "HH:MM" of a time column ("18:30:00" → "18:30"). */
export const hhmmOf = (v: unknown): string | null => {
  const s = str(v);
  const m = s ? /^(\d{2}):(\d{2})/.exec(s) : null;
  return m ? `${m[1]}:${m[2]}` : null;
};

// ---------------------------------------------------------------------------
// window maths (D-31: verification date, or launch if later, + 30 days)

export const EXISTING_TEAM_WINDOW_DAYS = 30;

/** Fraction of the window used, 0..1 (the countdown bar on B-MA.8.8: 24 days left → 20%). */
export function windowUsed(daysLeft: number): number {
  const d = Math.min(EXISTING_TEAM_WINDOW_DAYS, Math.max(0, daysLeft));
  return (EXISTING_TEAM_WINDOW_DAYS - d) / EXISTING_TEAM_WINDOW_DAYS;
}

// ---------------------------------------------------------------------------
// errors
//
// The contract raises `ATXH<n>: <sentence>` (or ATXB8) in the MESSAGE with a
// SQLSTATE in the code. Each one maps to a name and the screen's words.
// Database #38 (8d3e9f3) added ATXH26 (delete_opening once somebody has
// applied) and the Team-only instructor rule, raised as ATX76.

export type HiringError =
  | "not_a_gym" // ATXH0 · ATX09
  | "pay_locked" // ATXH1 · 22023
  | "already_applied" // ATXH2 · ATX10
  | "not_your_class" // ATXH3 · 22023
  | "not_a_professional" // ATXH4 · ATX09
  | "availability_required" // ATXH5 · 22023
  | "opening_closed" // ATXH6 · ATX08
  | "own_opening" // ATXH7 · 22023
  | "opening_hidden" // ATXH8 · 42501
  | "business_paused" // ATXH9 · ATX09
  | "has_offer" // ATXH10 · ATX10
  | "not_open_to_gym_work" // ATXH11 · ATX09
  | "invalid_pay" // ATXH12 · 22023
  | "offer_pending" // ATXH13 · ATX10
  | "offer_closed" // ATXH14 · ATX10, and "no such offer" · ATX08
  | "conflicts" // ATXH15 · ATX10
  | "not_on_team" // ATXH16 · ATX08
  | "professional_code" // ATXH17 · 22023 (invite_employee: a professional's own code)
  | "professional_account" // ATXH17 · 22023, hint "…window … has closed" (invite_employee)
  | "nobody_named" // ATXH18 · 22023
  | "window_closed" // ATXH19 · ATX10
  | "already_invited" // ATXH20 · ATX10
  | "invite_expired" // ATXH21 · ATX10
  | "invite_gone" // "no such invitation" · ATX08
  | "not_attended" // ATXH22 · ATX94 (review_instructor; services/instructor-reviews words it)
  | "no_instructor" // ATXH23 · ATX08 (review_instructor)
  | "not_your_hire" // ATXH24 · 42501 (raise_hiring_dispute: no caller, the board draws no dispute flow)
  | "dispute_open" // ATXH25 · ATX10 (raise_hiring_dispute: support's only since Database #38, no member or business caller)
  | "has_applicants" // ATXH26 · ATX10 (delete_opening once somebody has applied: close it instead)
  | "no_seats" // ATXC0 · 23514 (the seat cap, Database #38 20261213190000: everyone but a Centium hire takes a seat, so add_existing_team and accept_existing_team_invite meet it)
  | "not_your_business" // ATXB8 · 42501
  | "rate_limited" // ATX02 (check_rate_limit)
  | "invalid_opening" // 23514 (a title / description / requirements CHECK)
  | "instructor_not_on_team"; // ATX76 (Database #38 business_team_professional: save_class_series, edit_class, assign_class_instructor and the business_classes trigger name only a Team professional)

const ATXH: Record<number, HiringError> = {
  0: "not_a_gym",
  1: "pay_locked",
  2: "already_applied",
  3: "not_your_class",
  4: "not_a_professional",
  5: "availability_required",
  6: "opening_closed",
  7: "own_opening",
  8: "opening_hidden",
  9: "business_paused",
  10: "has_offer",
  11: "not_open_to_gym_work",
  12: "invalid_pay",
  13: "offer_pending",
  14: "offer_closed",
  15: "conflicts",
  16: "not_on_team",
  18: "nobody_named",
  19: "window_closed",
  20: "already_invited",
  21: "invite_expired",
  22: "not_attended",
  23: "no_instructor",
  24: "not_your_hire",
  25: "dispute_open",
  26: "has_applicants",
};

export function hiringErrorOf(e: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null | undefined): HiringError | null {
  if (!e) return null;
  const msg = e.message ?? "";
  const h = /\bATXH(\d+)\b/.exec(msg);
  // ATXH17 is one sentence with two causes, told apart by the hint.
  if (h && Number(h[1]) === 17) return /window/i.test(e.hint ?? "") ? "professional_account" : "professional_code";
  if (h && ATXH[Number(h[1])]) return ATXH[Number(h[1])];
  if (/\bATXC0\b/.test(msg)) return "no_seats";
  if (/\bATXB8\b/.test(msg) || e.code === "42501") return "not_your_business";
  if (e.code === "ATX02") return "rate_limited";
  if (e.code === "ATX08" && /no such offer/i.test(msg)) return "offer_closed";
  if (e.code === "ATX08" && /no such invitation/i.test(msg)) return "invite_gone";
  if (e.code === "23514") return "invalid_opening";
  if (e.code === "ATX76") return "instructor_not_on_team";
  return null;
}

/** The board's words where it has them; ours otherwise (listed in W4.md). */
export const HIRING_ERROR_TEXT: Record<HiringError, string> = {
  not_a_gym: "Hiring is for gyms and studios.",
  pay_locked: "This opening doesn't take proposals.",
  already_applied: "You've already applied to this opening.",
  not_your_class: "One of those classes isn't yours. Choose again.",
  not_a_professional: "This account isn't a professional account.",
  availability_required: "Confirm you're available for this schedule.",
  opening_closed: "This opening is no longer open.",
  own_opening: "You can't apply to your own opening.",
  opening_hidden: "Centium took this opening down. Contact support for details.",
  business_paused: "This business is paused or closed, so it isn't hiring right now.",
  has_offer: "This applicant already has an offer.",
  not_open_to_gym_work: "They aren't open to gym work right now.",
  invalid_pay: "Check the pay, the classes a month and the start date.",
  offer_pending: "They already have an offer from you for this job.",
  offer_closed: "This offer is no longer open.",
  conflicts: "This overlaps a time already busy on your calendar.",
  not_on_team: "They aren't on your team anymore.",
  not_your_business: "You don't have permission to hire for this business.",
  rate_limited: "Too many tries in a short time. Try again later.",
  invalid_opening: "Check the title and the details, then try again.",
  professional_code: "Add professionals to your team through Hiring.",
  professional_account: "New professionals join through Hiring.",
  nobody_named: "Add at least one person, with an email or a phone number.",
  window_closed: "New professionals join through Hiring",
  already_invited: "This person has already been invited.",
  invite_expired: "This invite has expired",
  invite_gone: "This invite is no longer available.",
  not_attended: "You can review a class once you've been to it.",
  no_instructor: "This class had no named instructor on the gym's team.",
  not_your_hire: "This hire isn't yours to dispute.",
  dispute_open: "You already have an open dispute about this hire.",
  has_applicants: "People have applied to this opening, so it can't be deleted. Pause it instead.",
  no_seats: "All seats are in use. Buy a seat block or remove somebody first.",
  instructor_not_on_team: "Only your Team can be named. Add people through Hiring.",
};

/** The caution card under an applicant or a result after an offer (B-MA.8.6): their busy times. */
export const BUSY_WARNING_TEXT = "This overlaps a time already busy on their calendar.";

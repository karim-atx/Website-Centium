// Market + Share 3.0 · W4 · Hiring, the business side (B-MA.8.x, B-MA.6
// picker, B-MA.1 Hiring row). Gyms and studios only (`not_a_gym`).
//
// Every call here awaits Database stage DB8 (PLAN §2.2 DB8, api.md "Hiring
// (gyms only)"): until it lands PostgREST answers PGRST202 and the result is
// `pending`, which the screens show as their quiet designed state, never as
// an error and never as sample data. Writes return the documented error name
// (`HiringError`) so the screens can show the board's words.
//
// A business passes its id (a staff seat may hold several businesses).

import { marketRpc, marketRpcRaw, type MarketResult } from "../market/rpc";
import { isOffline } from "../network-error";
import { quoteHiringFee, type HiringFeeQuote, type OpeningType, type PayUnit } from "./fee";
import {
  HIRING_ERROR_TEXT,
  hiringErrorOf,
  parseApplications,
  parseHiringFees,
  parseInvites,
  parseOpening,
  parseOpenings,
  parseProCards,
  parseTeam,
  parseWindow,
  type Application,
  type ExistingTeamInvite,
  type ExistingTeamWindow,
  type HiringError,
  type HiringFee,
  type Opening,
  type OpeningStatus,
  type ProCard,
  type ProfessionalType,
  type TeamMember,
} from "./model";
import { rows } from "../market/parse";

export * from "./model";
export * from "./fee";

/** A write: done (with the row when the function returns one), or why not. */
export type HiringWrite<T = null> =
  | { ok: true; value: T }
  | { ok: false; pending?: boolean; offline?: boolean; error?: HiringError; message: string; details?: unknown };

/** Shared by the professional side (services/team-hiring). */
export async function hiringWrite<T>(fn: string, args: Record<string, unknown>, fallback: string, parse: (data: unknown) => T): Promise<HiringWrite<T>> {
  const res = await marketRpcRaw(fn, args);
  if ("thrown" in res) return { ok: false, offline: isOffline(res.thrown), message: fallback };
  if (res.error) {
    if (res.error.code === "PGRST202" || res.error.code === "42883") return { ok: false, pending: true, message: "Hiring is coming soon." };
    if (isOffline(res.error)) return { ok: false, offline: true, message: fallback };
    const k = hiringErrorOf(res.error);
    if (k) return { ok: false, error: k, message: HIRING_ERROR_TEXT[k], details: res.error.details };
    console.error(`[hiring] ${fn}:`, res.error.message);
    return { ok: false, message: fallback };
  }
  return { ok: true, value: parse(res.data) };
}

const none = () => null;

// ---------------------------------------------------------------- openings

/** my_openings(p_status): the business's openings with applicant counts. */
export function fetchMyOpenings(businessId: string, status: OpeningStatus | null = null): Promise<MarketResult<Opening[]>> {
  // awaiting DB stage DB8
  return marketRpc("my_openings", { p_business_id: businessId, p_status: status }, "Couldn't load your openings.", parseOpenings);
}

export interface OpeningDraft {
  type: OpeningType;
  title: string;
  description: string | null;
  classSeriesIds: string[];
  classSessionId: string | null;
  pay: number;
  payUnit: PayUnit;
  classesPerMonth: number | null;
  allowPayProposals: boolean;
  requirements: string[];
  positions: number;
}

/** create_opening ⟳ (idempotent by p_request_id). */
export function createOpening(businessId: string, d: OpeningDraft, requestId: string): Promise<HiringWrite<Opening | null>> {
  // awaiting DB stage DB8
  return hiringWrite(
    "create_opening",
    {
      p_business_id: businessId,
      p_type: d.type,
      p_title: d.title,
      p_description: d.description,
      p_class_series_ids: d.classSeriesIds,
      p_class_session_id: d.classSessionId,
      p_pay: d.pay,
      p_pay_unit: d.payUnit,
      p_classes_per_month: d.classesPerMonth,
      p_allow_pay_proposals: d.allowPayProposals,
      p_requirements: d.requirements,
      p_positions: d.positions,
      p_request_id: requestId,
    },
    "Couldn't post the opening. Check your connection and try again.",
    (data) => {
      const r = rows(data)[0];
      return r ? parseOpening(r) : null;
    },
  );
}

/** opening_applications(p_opening_id): applicants with their ProfessionalCard. */
export function fetchApplications(openingId: string): Promise<MarketResult<Application[]>> {
  // awaiting DB stage DB8
  return marketRpc("opening_applications", { p_opening_id: openingId }, "Couldn't load the applicants.", parseApplications);
}

export function shortlistApplication(applicationId: string): Promise<HiringWrite> {
  // awaiting DB stage DB8
  return hiringWrite("shortlist_application", { p_application_id: applicationId }, "Couldn't shortlist. Try again.", none);
}

export function declineApplication(applicationId: string): Promise<HiringWrite> {
  // awaiting DB stage DB8
  return hiringWrite("decline_application", { p_application_id: applicationId }, "Couldn't decline. Try again.", none);
}

// ---------------------------------------------------------------- offers

/** quote_hiring_fee: the server's quote (the confirmation shows it once it answers; fee.ts mirrors it). */
export function quoteFee(type: OpeningType, pay: number, unit: PayUnit, classesPerMonth: number | null): Promise<MarketResult<HiringFeeQuote | null>> {
  // awaiting DB stage DB8
  return marketRpc(
    "quote_hiring_fee",
    { p_type: type, p_pay: pay, p_pay_unit: unit, p_classes_per_month: classesPerMonth },
    "Couldn't work out the fee.",
    (data) => {
      const r = rows(data)[0];
      if (!r) return null;
      const base = Number(r.base);
      if (!Number.isFinite(base)) return null;
      const q = quoteHiringFee(type, base);
      return {
        ...q,
        percentAmount: Number(r.percent_amount ?? q.percentAmount),
        fee: Number(r.fee ?? q.fee),
        minimumApplied: r.minimum_applied == null ? q.minimumApplied : r.minimum_applied === true,
      };
    },
  );
}

export interface HireOfferDraft {
  professionalId: string;
  applicationId: string | null;
  openingId: string | null;
  type: OpeningType;
  title: string;
  classSeriesIds: string[];
  classSessionId: string | null;
  pay: number;
  payUnit: PayUnit;
  classesPerMonth: number | null;
  startsOn: string;
  message: string | null;
}

/** Busy times returned with an offer (business sees start / end only, no titles). */
export interface BusyTime {
  start: string;
  end: string;
}

/** send_hire_offer ⟳: conflicts come back as a warning, never blocking. */
export function sendHireOffer(businessId: string, d: HireOfferDraft, requestId: string): Promise<HiringWrite<{ offerId: string | null; conflicts: BusyTime[] }>> {
  // awaiting DB stage DB8
  return hiringWrite(
    "send_hire_offer",
    {
      p_business_id: businessId,
      p_professional_id: d.professionalId,
      p_application_id: d.applicationId,
      p_opening_id: d.openingId,
      p_type: d.type,
      p_title: d.title,
      p_class_series_ids: d.classSeriesIds,
      p_class_session_id: d.classSessionId,
      p_pay: d.pay,
      p_pay_unit: d.payUnit,
      p_classes_per_month: d.classesPerMonth,
      p_starts_on: d.startsOn,
      p_message: d.message,
      p_request_id: requestId,
    },
    "Couldn't send the offer. Check your connection and try again.",
    (data) => {
      const r = rows(data)[0] ?? {};
      const cs = Array.isArray(r.conflicts) ? (r.conflicts as Record<string, unknown>[]) : [];
      return {
        offerId: typeof r.id === "string" ? r.id : typeof r.hire_offer_id === "string" ? r.hire_offer_id : null,
        conflicts: cs.filter((c) => typeof c.start === "string" && typeof c.end === "string").map((c) => ({ start: c.start as string, end: c.end as string })),
      };
    },
  );
}

/** search_professionals(p_query, p_existing_team): ranked, open to gym work only, no contact fields. */
export function searchProfessionals(businessId: string, query: string, existingTeam = false): Promise<MarketResult<ProCard[]>> {
  // awaiting DB stage DB8 (and DB11 open_to_gym_work)
  return marketRpc(
    "search_professionals",
    { p_business_id: businessId, p_query: query.trim() || null, p_existing_team: existingTeam },
    "Couldn't search professionals.",
    parseProCards,
  );
}

// ---------------------------------------------------------------- team, fees

/** my_team: Team cards, hire dates and assigned classes. */
export function fetchMyTeam(businessId: string): Promise<MarketResult<TeamMember[]>> {
  // awaiting DB stage DB8
  return marketRpc("my_team", { p_business_id: businessId }, "Couldn't load your team.", parseTeam);
}

/** remove_from_team ⟳: ends hires, removes future events, clears the instructor on future sessions; no refund. */
export function removeFromTeam(businessId: string, professionalId: string, requestId: string): Promise<HiringWrite> {
  // awaiting DB stage DB8
  return hiringWrite("remove_from_team", { p_business_id: businessId, p_professional_id: professionalId, p_request_id: requestId }, "Couldn't remove them. Try again.", none);
}

/** my_hiring_fees (owner): base, basis, 8% amount, minimum, minimum_applied, fee, DUE / PAID. */
export function fetchHiringFees(businessId: string): Promise<MarketResult<HiringFee[]>> {
  // awaiting DB stage DB8
  return marketRpc("my_hiring_fees", { p_business_id: businessId }, "Couldn't load your hiring fees.", parseHiringFees);
}

// ---------------------------------------------------------------- existing team (D-31)

/** existing_team_window: opens at the verification date (or launch, if later), closes +30 days. */
export function fetchExistingTeamWindow(businessId: string): Promise<MarketResult<ExistingTeamWindow | null>> {
  // awaiting DB stage DB8
  return marketRpc("existing_team_window", { p_business_id: businessId }, "Couldn't load the existing-team window.", parseWindow);
}

/** add_existing_team ⟳ (window open): no hiring fee. */
export function addExistingTeam(businessId: string, professionalIds: string[], requestId: string): Promise<HiringWrite> {
  // awaiting DB stage DB8
  return hiringWrite("add_existing_team", { p_business_id: businessId, p_professional_ids: professionalIds, p_request_id: requestId }, "Couldn't add them. Try again.", none);
}

/** invite_existing_team ⟳: expires when the window closes. */
export function inviteExistingTeam(
  businessId: string,
  input: { emailOrPhone: string; name: string; professionalType: ProfessionalType },
  requestId: string,
): Promise<HiringWrite<ExistingTeamInvite | null>> {
  // awaiting DB stage DB8
  return hiringWrite(
    "invite_existing_team",
    { p_business_id: businessId, p_email_or_phone: input.emailOrPhone, p_name: input.name, p_professional_type: input.professionalType, p_request_id: requestId },
    "Couldn't send the invite. Try again.",
    (data) => parseInvites(data)[0] ?? null,
  );
}

// ---------------------------------------------------------------- code guard (B-MA.8.7)

export type CodeKind = "professional_code" | "professional_account" | "other";

/**
 * classify_code(p_code): every business code field asks first. A professional
 * client code → "Add professionals to your team through Hiring."; after the
 * window a professional account's email → "New professionals join through
 * Hiring." (D-33). `pending` until the stage lands: the field then behaves as
 * today (invite_employee decides).
 */
export function classifyCode(businessId: string, code: string): Promise<MarketResult<CodeKind>> {
  // awaiting DB stage DB8
  return marketRpc("classify_code", { p_business_id: businessId, p_code: code.trim() }, "Couldn't check this code.", (data) => {
    const r = rows(data)[0];
    const k = r ? (r.kind ?? r.code ?? r.classify_code) : typeof data === "string" ? data : null;
    return k === "professional_code" || k === "professional_account" ? k : "other";
  });
}

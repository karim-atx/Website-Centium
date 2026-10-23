// Market + Share 3.0 · Hiring, the business side (B-MA.8.x, B-MA.1 Hiring
// row, the B-MA.8.7 code guard).
//
// Database Release 2 (release/hiring-team-calendar-and-reviews abf4b2c +
// ff093b7; the migration comments and function definitions are the
// contract):
// - functions: business_may_hire, my_openings, create_opening,
//   opening_applicants, decide_application, quote_hiring_fee,
//   send_hire_offer, sent_hire_offers, check_conflicts, search_professionals,
//   my_team, remove_from_team, my_hiring_fees, existing_team_window,
//   add_existing_team, invite_existing_team, classify_code;
// - tables read under their RLS (SELECT granted to authenticated):
//   business_hires (readable by any signed-in account: the fact of a hire is
//   public), class_series / business_classes (insiders), business_employees
//   (the granted columns), platform_settings (the fee numbers).
// Gyms only: business_may_hire() is the server's one definition (business_type
// 'gym'); refusals carry ATXH codes (model.ts HiringError).

import { marketDb, marketRpc, marketRpcRaw, type MarketResult } from "../market/rpc";
import { isOffline } from "../network-error";
import { num, rows, str } from "../market/parse";
import { parseFeeQuote, parseFeeRules, type HiringFeeQuote, type HiringFeeRules, type OpeningType, type PayUnit } from "./fee";
import {
  HIRING_ERROR_TEXT,
  applicantCard,
  hhmmOf,
  hiringErrorOf,
  isoWeekdays,
  parseApplication,
  parseHiringFees,
  parseInvites,
  parseOpening,
  parseSearchRows,
  parseWindow,
  type Application,
  type ExistingTeamInvite,
  type ExistingTeamWindow,
  type HiringError,
  type HiringFee,
  type Opening,
  type OpeningExtras,
  type OpeningStatus,
  type ProCard,
  type ProfessionalType,
  type TeamClass,
  type TeamHire,
  type TeamMember,
} from "./model";

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
type Rows = { data: Record<string, unknown>[] | null; error: { code?: string; message: string } | null };
const uniq = (xs: (string | null | undefined)[]): string[] => [...new Set(xs.filter((x): x is string => !!x))];
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** A table read: its rows, or the failure as a MarketResult. */
async function tableRows(run: () => PromiseLike<Rows>, fallback: string): Promise<MarketResult<Record<string, unknown>[]>> {
  try {
    const r = await run();
    if (r.error) {
      if (isOffline(r.error)) return { ok: false, offline: true, message: fallback };
      console.error("[hiring]", fallback, r.error.message);
      return { ok: false, code: r.error.code, message: fallback };
    }
    return { ok: true, value: r.data ?? [] };
  } catch (e) {
    return { ok: false, offline: isOffline(e), message: fallback };
  }
}

// ---------------------------------------------------------------- rules

let rules: Promise<MarketResult<HiringFeeRules>> | null = null;

/** platform_settings' hiring numbers (one row, SELECT granted to authenticated). Cached for the session; a failure isn't cached. */
export function fetchHiringFeeRules(): Promise<MarketResult<HiringFeeRules>> {
  if (rules) return rules;
  const fallback = "Couldn't load the hiring fee rules.";
  const request = (async (): Promise<MarketResult<HiringFeeRules>> => {
    const r = await tableRows(() => marketDb.from("platform_settings").select("hiring_fee_pct, hiring_fee_min_role, hiring_fee_min_class").limit(1) as unknown as PromiseLike<Rows>, fallback);
    if (!r.ok) return r;
    const parsed = parseFeeRules(r.value[0]);
    return parsed ? { ok: true, value: parsed } : { ok: false, message: fallback };
  })().then((res) => {
    if (!res.ok) rules = null;
    return res;
  });
  rules = request;
  return request;
}

/** business_may_hire(p_business_id): the server's "gyms only" (business_type 'gym'). */
export function fetchMayHire(businessId: string): Promise<MarketResult<boolean>> {
  return marketRpc("business_may_hire", { p_business_id: businessId }, "Couldn't check Hiring for this business.", (d) => d === true);
}

// ---------------------------------------------------------------- people

/** Accepted, not revoked employments of these people at this business (business_employees' granted columns). */
async function onTeamOf(businessId: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const r = await tableRows(
    () => marketDb.from("business_employees").select("professional_id").eq("business_id", businessId).in("professional_id", ids).not("accepted_at", "is", null).is("revoked_at", null) as unknown as PromiseLike<Rows>,
    "team",
  );
  return new Set(r.ok ? r.value.map((x) => String(x.professional_id)) : []);
}

// ---------------------------------------------------------------- openings

/** The first upcoming session per series, and the slots' own sessions (business_classes, insiders). */
async function classFacts(businessId: string, seriesIds: string[], sessionIds: string[]): Promise<{ series: Map<string, { title: string; weekdays: number[]; startTime: string | null }>; next: Map<string, string>; sessions: Map<string, { title: string; at: string }> }> {
  const series = new Map<string, { title: string; weekdays: number[]; startTime: string | null }>();
  const next = new Map<string, string>();
  const sessions = new Map<string, { title: string; at: string }>();
  const today = localDay(new Date());
  const [s, upcoming, slots] = await Promise.all([
    seriesIds.length ? tableRows(() => marketDb.from("class_series").select("id, title, weekdays, start_time").eq("business_id", businessId).in("id", seriesIds) as unknown as PromiseLike<Rows>, "series") : null,
    seriesIds.length
      ? tableRows(
          () => marketDb.from("business_classes").select("series_id, event_date, start_time").eq("business_id", businessId).in("series_id", seriesIds).is("cancelled_at", null).gte("event_date", today).order("event_date").order("start_time").limit(200) as unknown as PromiseLike<Rows>,
          "sessions",
        )
      : null,
    sessionIds.length ? tableRows(() => marketDb.from("business_classes").select("id, title, event_date, start_time").eq("business_id", businessId).in("id", sessionIds) as unknown as PromiseLike<Rows>, "slots") : null,
  ]);
  if (s?.ok) for (const r of s.value) series.set(String(r.id), { title: str(r.title) ?? "", weekdays: isoWeekdays(r.weekdays), startTime: hhmmOf(r.start_time) });
  if (upcoming?.ok) for (const r of upcoming.value) {
    const id = String(r.series_id);
    const t = hhmmOf(r.start_time);
    if (!next.has(id) && str(r.event_date) && t) next.set(id, `${r.event_date}T${t}`);
  }
  if (slots?.ok) for (const r of slots.value) {
    const t = hhmmOf(r.start_time);
    if (str(r.event_date) && t) sessions.set(String(r.id), { title: str(r.title) ?? "", at: `${r.event_date}T${t}` });
  }
  return { series, next, sessions };
}

/**
 * my_openings(p_business_id, p_status) with the counts the badge is drawn
 * from (applicants, shortlisted, new_applicants), plus what the cards name:
 * the linked class (class_series / business_classes) and, for a filled
 * opening, who was hired and when (sent_hire_offers 'accepted' + the hire's
 * hired_at), and for a closed one when it closed (openings.updated_at, which
 * set_opening_status stamps; my_openings returns no date for it). An
 * enrichment read that fails leaves its line out, never the opening.
 */
export async function fetchMyOpenings(businessId: string, status: OpeningStatus | null = null): Promise<MarketResult<Opening[]>> {
  const base = await marketRpc("my_openings", { p_business_id: businessId, p_status: status }, "Couldn't load your openings.", rows);
  if (!base.ok) return base;
  const list = base.value.filter((r) => str(r.id));
  const seriesIds = uniq(list.flatMap((r) => (Array.isArray(r.class_series_ids) ? (r.class_series_ids as string[]) : [])));
  const sessionIds = uniq(list.map((r) => str(r.class_session_id)));
  const filled = list.some((r) => r.status === "filled");
  const closedIds = uniq(list.filter((r) => r.status === "closed").map((r) => str(r.id)));
  const [cf, acc, closed] = await Promise.all([
    classFacts(businessId, seriesIds, sessionIds),
    filled ? marketRpc("sent_hire_offers", { p_business_id: businessId, p_status: "accepted" }, "offers", rows) : null,
    closedIds.length ? tableRows(() => marketDb.from("openings").select("id, updated_at").in("id", closedIds) as unknown as PromiseLike<Rows>, "closed") : null,
  ]);
  const accepted = acc?.ok ? acc.value : [];
  const closedAt = new Map((closed?.ok ? closed.value : []).map((o) => [String(o.id), str(o.updated_at)]));
  const hiredAt = new Map<string, string>();
  if (accepted.length) {
    const h = await tableRows(() => marketDb.from("business_hires").select("hire_offer_id, hired_at").in("hire_offer_id", uniq(accepted.map((o) => str(o.id)))) as unknown as PromiseLike<Rows>, "hires");
    if (h.ok) for (const r of h.value) if (str(r.hired_at)) hiredAt.set(String(r.hire_offer_id), r.hired_at as string);
  }
  return {
    ok: true,
    value: list.map((r) => {
      const ids = Array.isArray(r.class_series_ids) ? (r.class_series_ids as string[]) : [];
      const sers = ids.map((i) => cf.series.get(i)).filter((x): x is NonNullable<typeof x> => !!x);
      const slot = str(r.class_session_id) ? cf.sessions.get(r.class_session_id as string) : undefined;
      const nexts = ids.map((i) => cf.next.get(i)).filter((x): x is string => !!x).sort();
      // The latest accepted offer for this opening names the hire on a filled card.
      const hire = accepted.filter((o) => o.opening_id === r.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
      const x: OpeningExtras = {
        className: slot?.title || sers[0]?.title || null,
        startsAt: slot?.at ?? nexts[0] ?? null,
        weekdays: [...new Set(sers.flatMap((s) => s.weekdays))].sort((a, b) => a - b),
        hiredName: hire ? str(hire.first_name) : null,
        hiredAt: hire ? (hiredAt.get(String(hire.id)) ?? null) : null,
        hiredPath: hire ? (hire.path === "direct" ? "direct" : "opening") : null,
        closedAt: r.status === "closed" ? (closedAt.get(String(r.id)) ?? null) : null,
      };
      return parseOpening(r, x);
    }),
  };
}

export interface OpeningDraft {
  type: OpeningType;
  title: string;
  /** openings.description: required by the table (10..4000 characters). */
  description: string;
  classSeriesIds: string[];
  classSessionId: string | null;
  /** The chosen classes in words (openings.schedule_label): a professional can't read the gym's class series. */
  scheduleLabel: string | null;
  pay: number;
  payUnit: PayUnit;
  classesPerMonth: number | null;
  allowPayProposals: boolean;
  requirements: string[];
  positions: number;
}

/** classes_per_month is constrained to per-class pay (the fee base); any other unit sends null. */
const perMonth = (unit: PayUnit, n: number | null): number | null => (unit === "per_class" ? n : null);

/** create_opening(...) → the openings row (no counts yet). */
export function createOpening(businessId: string, d: OpeningDraft): Promise<HiringWrite<Opening | null>> {
  return hiringWrite(
    "create_opening",
    {
      p_business_id: businessId,
      p_type: d.type,
      p_title: d.title,
      p_description: d.description,
      p_pay: d.pay,
      p_pay_unit: d.payUnit,
      p_classes_per_month: perMonth(d.payUnit, d.classesPerMonth),
      p_class_series_ids: d.classSeriesIds,
      p_class_session_id: d.classSessionId,
      p_schedule_label: d.scheduleLabel,
      p_allow_pay_proposals: d.allowPayProposals,
      p_requirements: d.requirements,
      p_positions: d.positions,
    },
    "Couldn't post the opening. Check your connection and try again.",
    (data) => {
      const r = rows(data)[0];
      return r && str(r.id) ? parseOpening(r) : null;
    },
  );
}

/**
 * opening_applicants(p_opening_id): the applications to one opening,
 * shortlisted first then undecided, each with the card (first name, photo,
 * specialty, professional_rating(), Centium hires; no contact fields), plus
 * whether they're on this business's team and, once HIRED, the accepted
 * offer's start and fee (my_hiring_fees' charged amount when the caller
 * holds `revenue`, else the quote the gym was shown).
 */
export async function fetchApplications(businessId: string, openingId: string): Promise<MarketResult<Application[]>> {
  const apps = await marketRpc("opening_applicants", { p_opening_id: openingId }, "Couldn't load the applicants.", rows);
  if (!apps.ok) return apps;
  const list = apps.value.filter((r) => str(r.application_id) && str(r.professional_id));
  const ids = uniq(list.map((r) => str(r.professional_id)));
  const hiredApps = list.some((r) => r.status === "hired");
  const [team, acc] = await Promise.all([
    onTeamOf(businessId, ids),
    hiredApps ? marketRpc("sent_hire_offers", { p_business_id: businessId, p_status: "accepted" }, "offers", rows) : null,
  ]);
  const offerByApp = new Map<string, Record<string, unknown>>();
  if (acc?.ok) for (const o of acc.value) if (str(o.application_id)) offerByApp.set(o.application_id as string, o);
  const feeByOffer = new Map<string, number>();
  if (offerByApp.size) {
    const [hires, fees] = await Promise.all([
      tableRows(() => marketDb.from("business_hires").select("id, hire_offer_id").in("hire_offer_id", uniq([...offerByApp.values()].map((o) => str(o.id)))) as unknown as PromiseLike<Rows>, "hires"),
      marketRpc("my_hiring_fees", { p_business_id: businessId }, "fees", rows),
    ]);
    const charged = new Map<string, number>();
    if (fees.ok) for (const f of fees.value) if (str(f.hire_id) && num(f.amount) != null) charged.set(f.hire_id as string, num(f.amount) as number);
    if (hires.ok) for (const h of hires.value) if (charged.has(String(h.id))) feeByOffer.set(String(h.hire_offer_id), charged.get(String(h.id)) as number);
  }
  return {
    ok: true,
    value: list.map((r) => {
      const pid = r.professional_id as string;
      const offer = offerByApp.get(String(r.application_id));
      const fee = offer ? (feeByOffer.get(String(offer.id)) ?? num(offer.quoted_fee)) : null;
      return parseApplication(r, openingId, applicantCard(r, team.has(pid)), { hireStartsOn: offer ? str(offer.starts_on) : null, fee });
    }),
  };
}

/** decide_application(p_application_id, p_status): shortlist or decline (offered / hired are the hiring path's, never a button). */
export function decideApplication(applicationId: string, status: "shortlisted" | "declined"): Promise<HiringWrite> {
  return hiringWrite("decide_application", { p_application_id: applicationId, p_status: status }, status === "shortlisted" ? "Couldn't shortlist. Try again." : "Couldn't decline. Try again.", none);
}

/**
 * set_opening_status(p_opening_id, p_status): Karim's Pause is "closed" and
 * Reopen is "open" (the contract has no separate pause); ATXH8 while an admin
 * has the opening hidden.
 */
export function setOpeningStatus(openingId: string, status: "open" | "closed"): Promise<HiringWrite> {
  return hiringWrite("set_opening_status", { p_opening_id: openingId, p_status: status }, status === "closed" ? "Couldn't pause this opening. Try again." : "Couldn't reopen this opening. Try again.", none);
}

// ---------------------------------------------------------------- offers

/** quote_hiring_fee(p_type, p_pay, p_pay_unit, p_classes_per_month): the fee the confirmation shows (platform_settings' rate and floors). */
export function quoteFee(type: OpeningType, pay: number, unit: PayUnit, classesPerMonth: number | null): Promise<MarketResult<HiringFeeQuote | null>> {
  return marketRpc(
    "quote_hiring_fee",
    { p_type: type, p_pay: pay, p_pay_unit: unit, p_classes_per_month: perMonth(unit, classesPerMonth) },
    "Couldn't work out the fee.",
    (data) => parseFeeQuote(type, rows(data)[0]),
  );
}

export interface HireOfferDraft {
  professionalId: string;
  applicationId: string | null;
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

/** Busy times on their calendar (a gym gets start / end only: check_conflicts answers no titles). */
export interface BusyTime {
  start: string;
  end: string;
}

/**
 * check_conflicts(p_professional_id, p_series_ids, p_from) as a gym: busy
 * times only, over the generation horizon. Empty with no series (a gym must
 * name at least one, or it is refused).
 */
export async function fetchBusyTimes(professionalId: string, seriesIds: string[], from: string | null): Promise<BusyTime[]> {
  if (!seriesIds.length) return [];
  const r = await marketRpc("check_conflicts", { p_professional_id: professionalId, p_series_ids: seriesIds, p_from: from }, "busy", rows);
  return r.ok ? r.value.filter((c) => str(c.starts_at) && str(c.ends_at)).map((c) => ({ start: c.starts_at as string, end: c.ends_at as string })) : [];
}

/**
 * send_hire_offer(...) → the business_hire_offers row (its quoted_* fee).
 * The board shows busy times as a warning, never blocking: check_conflicts
 * is asked alongside (the function itself does not return conflicts).
 */
export async function sendHireOffer(businessId: string, d: HireOfferDraft): Promise<HiringWrite<{ offerId: string | null; conflicts: BusyTime[] }>> {
  const [r, conflicts] = await Promise.all([
    hiringWrite(
      "send_hire_offer",
      {
        p_business_id: businessId,
        p_professional_id: d.professionalId,
        p_type: d.type,
        p_title: d.title,
        p_pay: d.pay,
        p_pay_unit: d.payUnit,
        p_starts_on: d.startsOn,
        p_classes_per_month: perMonth(d.payUnit, d.classesPerMonth),
        p_class_series_ids: d.classSeriesIds,
        p_class_session_id: d.classSessionId,
        p_message: d.message,
        p_application_id: d.applicationId,
      },
      "Couldn't send the offer. Check your connection and try again.",
      (data) => str(rows(data)[0]?.id),
    ),
    fetchBusyTimes(d.professionalId, d.classSeriesIds, d.startsOn),
  ]);
  return r.ok ? { ok: true, value: { offerId: r.value, conflicts } } : r;
}

/**
 * search_professionals(p_business_id, p_query, p_existing_team, p_limit):
 * the hiring search lists only professionals open to gym work; the
 * existing-team search lists every listed professional while the window is
 * open (ATXH19 after). Ranked by the server: Centium hires, then rating
 * (professional_rating()); no distance and no contact fields.
 */
export function searchProfessionals(businessId: string, query: string, existingTeam = false): Promise<MarketResult<ProCard[]>> {
  return marketRpc(
    "search_professionals",
    { p_business_id: businessId, p_query: query.trim() || null, p_existing_team: existingTeam, p_limit: 30 },
    "Couldn't search professionals.",
    parseSearchRows,
  );
}

// ---------------------------------------------------------------- team, fees

/**
 * my_team(p_business_id): the gym's team of PROFESSIONALS (front desk and
 * shop staff aren't on it), each with how they joined (source), the hires
 * behind them (hire_ids → business_hires) and their rating
 * (professional_rating()). Removed people come back with removed_at set; the
 * Team screen shows the current team only. The classes a member is named on
 * are their class series here (class_series), one row per weekday.
 */
export async function fetchMyTeam(businessId: string): Promise<MarketResult<TeamMember[]>> {
  const team = await marketRpc("my_team", { p_business_id: businessId }, "Couldn't load your team.", rows);
  if (!team.ok) return team;
  const current = team.value.filter((r) => str(r.professional_id) && !str(r.removed_at));
  if (!current.length) return { ok: true, value: [] };
  const ids = uniq(current.map((r) => str(r.professional_id)));
  const hireIds = uniq(current.flatMap((r) => (Array.isArray(r.hire_ids) ? (r.hire_ids as string[]) : [])));
  const [hires, series] = await Promise.all([
    hireIds.length
      ? tableRows(() => marketDb.from("business_hires").select("id, type, title, starts_on, hired_at, status").in("id", hireIds) as unknown as PromiseLike<Rows>, "Couldn't load your team.")
      : null,
    tableRows(() => marketDb.from("class_series").select("id, professional_id, title, weekdays, start_time").eq("business_id", businessId).in("professional_id", ids) as unknown as PromiseLike<Rows>, "Couldn't load your team."),
  ]);
  if (hires && !hires.ok) return hires;
  const hireById = new Map((hires?.ok ? hires.value : []).map((h) => [String(h.id), h]));
  return {
    ok: true,
    value: current.map((r) => {
      const pid = r.professional_id as string;
      const mine = Array.isArray(r.hire_ids) ? (r.hire_ids as string[]) : [];
      const own: TeamHire[] = mine
        .map((id) => hireById.get(id))
        .filter((h): h is Record<string, unknown> => !!h && h.status === "active")
        .map((h) => ({ id: String(h.id), title: str(h.title) ?? "", type: h.type === "class_slot" ? "class_slot" : "role", hiredAt: str(h.hired_at), startsOn: str(h.starts_on) }));
      const classes: TeamClass[] = (series.ok ? series.value : [])
        .filter((s) => s.professional_id === pid)
        .flatMap((s): TeamClass[] => {
          const days = isoWeekdays(s.weekdays);
          const base = { seriesId: str(s.id), title: str(s.title) ?? "", startTime: hhmmOf(s.start_time), label: null };
          return days.length ? days.map((weekday) => ({ ...base, weekday })) : [{ ...base, weekday: null }];
        })
        .filter((c) => c.title);
      return {
        professional: {
          id: pid,
          name: str(r.first_name)?.trim() ?? "",
          photoUrl: str(r.avatar_url),
          specialty: str(r.specialty),
          rating: num(r.average_rating),
          reviewCount: num(r.review_count) ?? 0,
          hiredViaCentiumCount: mine.length,
          distanceKm: null,
          onTeam: true,
          rank: null,
        },
        source: r.source === "hire" ? "hire" : "existing_team",
        firstAddedAt: str(r.first_added_at),
        hires: own,
        classes,
      } satisfies TeamMember;
    }),
  };
}

/**
 * remove_from_team(p_business_id, p_professional_id, p_reason): ends their
 * active hires today (status removed), revokes the employment, and clears
 * the instructor on the series and every future uncancelled session (the
 * classes stand and show "Instructor not listed"). No refund. Returns how
 * many sessions were left without a teacher.
 */
export function removeFromTeam(businessId: string, professionalId: string, reason: string | null = null): Promise<HiringWrite<number>> {
  return hiringWrite("remove_from_team", { p_business_id: businessId, p_professional_id: professionalId, p_reason: reason }, "Couldn't remove them. Try again.", (d) => num(d) ?? 0);
}

/** my_hiring_fees(p_business_id): the `revenue` permission; every fee with its whole arithmetic and its charge. */
export function fetchHiringFees(businessId: string): Promise<MarketResult<HiringFee[]>> {
  return marketRpc("my_hiring_fees", { p_business_id: businessId }, "Couldn't load your hiring fees.", parseHiringFees);
}

// ---------------------------------------------------------------- existing team (D-31)

/**
 * existing_team_window(p_business_id): greatest(the business's created_at,
 * platform_settings.existing_team_window_opens_at) + existing_team_window_days.
 * CLOSED, with no dates, until that start is set. "Free" means no hiring fee:
 * an existing-team addition still occupies a paid seat (ATXC0 without one).
 */
export function fetchExistingTeamWindow(businessId: string): Promise<MarketResult<ExistingTeamWindow | null>> {
  return marketRpc("existing_team_window", { p_business_id: businessId }, "Couldn't load the existing-team window.", parseWindow);
}

/** add_existing_team(p_business_id, p_professional_ids) → how many were added (already on the team isn't an error). */
export function addExistingTeam(businessId: string, professionalIds: string[]): Promise<HiringWrite<number>> {
  return hiringWrite("add_existing_team", { p_business_id: businessId, p_professional_ids: professionalIds }, "Couldn't add them. Try again.", (d) => num(d) ?? 0);
}

/**
 * invite_existing_team(p_business_id, p_contact, p_name, p_professional_type)
 * → the existing_team_invites row. No token: the invited person accepts by
 * their own email or phone; it expires when the window closes. One live
 * invite per contact (ATXH20).
 */
export function inviteExistingTeam(businessId: string, input: { emailOrPhone: string; name: string; professionalType: ProfessionalType }): Promise<HiringWrite<ExistingTeamInvite | null>> {
  return hiringWrite(
    "invite_existing_team",
    { p_business_id: businessId, p_contact: input.emailOrPhone.trim(), p_name: input.name.trim(), p_professional_type: input.professionalType },
    "Couldn't send the invite. Try again.",
    (data) => parseInvites(data)[0] ?? null,
  );
}

// ---------------------------------------------------------------- code guard (B-MA.8.7)

export type CodeKind = "professional_code" | "professional_account" | "other";

/** classify_code's kinds: a professional's client-sharing code or invite link is a professional's code. */
export function codeKindOf(kind: unknown): CodeKind {
  return kind === "client" || kind === "invite_link" ? "professional_code" : "other";
}

/**
 * classify_code(p_code) → client | invite_link | business_member | referral |
 * voucher | business | unknown, by lookup (leaks only the kind). A
 * professional's code → "Add professionals to your team through Hiring."
 * "professional_account" (an account email after the window, D-33) is
 * invite_employee's refusal, not this function's (services/business-team).
 */
export function classifyCode(code: string): Promise<MarketResult<CodeKind>> {
  return marketRpc("classify_code", { p_code: code.trim() }, "Couldn't check this code.", (data) => codeKindOf(typeof data === "string" ? data : null));
}

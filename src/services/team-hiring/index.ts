// Market + Share 3.0 · Hiring, the professional side (P-MA.5.1–5.4, P-MA.1
// Opportunities card, P-MA.2 "Open to gym work").
//
// Database Release 2 (abf4b2c + ff093b7; the migration comments and function
// definitions are the contract):
// - functions: opportunities (+ the class times and the gym's venue-only
//   rating since Database #38), apply_to_opening, my_applications (Database
//   #38), my_hire_offers, accept_hire_offer, decline_hire_offer,
//   check_conflicts (the professional asking about themselves gets titles),
//   my_work, my_calendar, my_team_invites, accept_existing_team_invite,
//   set_gym_work_available;
// - tables read under their RLS: business_hire_offers (the professional's
//   own: the class series an offer names), professional_profiles (own row:
//   open_to_gym_work).

import { currentUserId, marketDb, marketRpc, type MarketResult } from "../market/rpc";
import { isOffline } from "../network-error";
import { bool, num, rows, str } from "../market/parse";
import { hiringWrite, type HiringWrite } from "../hiring";
import { hhmmOf, parseInvites, payUnitOf, type ExistingTeamInvite, type Opening, type OpeningType, type PayUnit } from "../hiring/model";

export type { HiringWrite } from "../hiring";
export * from "./model";
import { composeMyApplications, parseOpportunity, type MyApplication, type Opportunity } from "./model";

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

type Rows = { data: Record<string, unknown>[] | null; error: { code?: string; message: string } | null };
const uniq = (xs: (string | null | undefined)[]): string[] => [...new Set(xs.filter((x): x is string => !!x))];
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function tableRows(run: () => PromiseLike<Rows>, fallback: string): Promise<MarketResult<Record<string, unknown>[]>> {
  try {
    const r = await run();
    if (r.error) {
      if (isOffline(r.error)) return { ok: false, offline: true, message: fallback };
      console.error("[team-hiring]", fallback, r.error.message);
      return { ok: false, code: r.error.code, message: fallback };
    }
    return { ok: true, value: r.data ?? [] };
  } catch (e) {
    return { ok: false, offline: isOffline(e), message: fallback };
  }
}

/**
 * opportunities(p_tab, p_type, p_radius_km, p_limit): open openings nearest
 * first. It takes no coordinates (the professional's own rounded location
 * is stored) and has no specialty parameter: a specialty filter matches the
 * opening's own words (title, description, schedule, requirements) here.
 * A gym with no venue comes back with distance_km null.
 */
export function fetchOpportunities(tab: "gyms" | "classes", f: OpportunityFilters): Promise<MarketResult<Opportunity[]>> {
  return marketRpc(
    "opportunities",
    { p_tab: tab, p_type: f.type, p_radius_km: f.distanceKm ?? 50, p_limit: 50 },
    "Couldn't load openings.",
    (data) => rows(data).map(parseOpportunity).filter((o) => o.id && matchesSpecialty(o, f.specialty)),
  );
}

/** A specialty chip against the opening's own words (the server takes no specialty). */
export function matchesSpecialty(o: Pick<Opening, "title" | "description" | "scheduleLabel" | "requirements">, specialty: string | null): boolean {
  if (!specialty) return true;
  const needle = specialty.trim().toLowerCase();
  return [o.title, o.description, o.scheduleLabel, ...o.requirements].some((t) => !!t && t.toLowerCase().includes(needle));
}

export interface ApplyInput {
  /** opening_applications.message: required, 1..2000 characters. */
  message: string;
  proposedPay: number | null;
  availabilityConfirmed: boolean;
  attachments: { kind: "credential" | "service" | "work_history" | "file"; refId: string | null; label: string }[];
}

/** apply_to_opening(p_opening_id, p_message, p_availability_confirmed, p_proposed_pay, p_attachments): once per opening. */
export function applyToOpening(openingId: string, input: ApplyInput): Promise<HiringWrite> {
  return hiringWrite(
    "apply_to_opening",
    {
      p_opening_id: openingId,
      p_message: input.message,
      p_availability_confirmed: input.availabilityConfirmed,
      p_proposed_pay: input.proposedPay,
      p_attachments: input.attachments.map((a) => ({ kind: a.kind, ref_id: a.refId, label: a.label })),
    },
    "Couldn't send your application. Check your connection and try again.",
    () => null,
  );
}

/**
 * My applications (Database #38): my_applications() — the caller's own
 * applications, offered first, each with its opening, its gym and the offer
 * it became (hire_offer_id, offer_status), still listed after the opening
 * closes — plus the direct offers (my_hire_offers path 'direct': no
 * application behind them). An application's card follows its offer when
 * the offer wasn't withdrawn (pending OFFERED, accepted HIRED, declined
 * DECLINED; the offer's own terms and start date from my_hire_offers), else
 * its own status with the proposed pay or the posted pay.
 */
export async function fetchMyApplications(): Promise<MarketResult<MyApplication[]>> {
  const fallback = "Couldn't load your applications.";
  const [apps, offers] = await Promise.all([marketRpc("my_applications", {}, fallback, rows), marketRpc("my_hire_offers", { p_status: null }, fallback, rows)]);
  if (!apps.ok) return apps;
  if (!offers.ok) return offers;
  return { ok: true, value: composeMyApplications(apps.value, offers.value) };
}

/** Clashes on accept: the professional sees titles and times (check_conflicts asked about themselves). */
export interface Clash {
  title: string;
  start: string;
  end: string;
}

/** check_conflicts(me, the offer's class series, its start) → what the offer would clash with. */
async function clashesFor(offerId: string): Promise<Clash[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const o = await tableRows(() => marketDb.from("business_hire_offers").select("class_series_ids, starts_on").eq("id", offerId).limit(1) as unknown as PromiseLike<Rows>, "offer");
  const row = o.ok ? o.value[0] : undefined;
  const ids = row && Array.isArray(row.class_series_ids) ? (row.class_series_ids as string[]) : [];
  if (!ids.length) return [];
  const today = localDay(new Date());
  const from = str(row?.starts_on) && (row?.starts_on as string) > today ? (row?.starts_on as string) : today;
  const r = await marketRpc("check_conflicts", { p_professional_id: uid, p_series_ids: ids, p_from: from }, "clashes", rows);
  return r.ok ? r.value.filter((c) => str(c.starts_at) && str(c.ends_at)).map((c) => ({ title: str(c.title) ?? "", start: c.starts_at as string, end: c.ends_at as string })) : [];
}

/**
 * accept_hire_offer(p_offer_id, p_ack_conflicts): the hire, the fee, the bill
 * line, the team place and the timetable in one transaction. ATXH15 lists
 * nothing, so the clashes are asked of check_conflicts and returned as
 * `details`; accepting again with p_ack_conflicts true keeps the agreement
 * and leaves the clashing sessions without an instructor.
 */
export async function acceptHireOffer(offerId: string, ackConflicts: boolean): Promise<HiringWrite> {
  const r = await hiringWrite("accept_hire_offer", { p_offer_id: offerId, p_ack_conflicts: ackConflicts }, "Couldn't accept the offer. Try again.", () => null);
  if (!r.ok && r.error === "conflicts") return { ...r, details: await clashesFor(offerId) };
  return r;
}

/** The clashes an accept refusal carries (acceptHireOffer's `details`). */
export function clashesOf(details: unknown): Clash[] {
  return (Array.isArray(details) ? details : [])
    .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : null))
    .filter((c): c is Record<string, unknown> => !!c && typeof c.start === "string" && typeof c.end === "string")
    .map((c) => ({ title: str(c.title) ?? "", start: c.start as string, end: c.end as string }));
}

/** decline_hire_offer(p_offer_id): the professional's own pending offer; the application is declined too. */
export function declineHireOffer(offerId: string): Promise<HiringWrite> {
  return hiringWrite("decline_hire_offer", { p_offer_id: offerId }, "Couldn't decline the offer. Try again.", () => null);
}

const DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const isoDayOf = (ymd: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return ((d.getDay() + 6) % 7) + 1;
};

/**
 * My work: my_work() (the caller's hires, active first: the gym, the role,
 * the agreed pay, classes_per_week) for the ACTIVE hires, with the classes
 * the agreement names (business_hire_offers.class_series_ids /
 * class_session_id) as they stand on the calendar for the next four weeks
 * (my_calendar: one row per series and weekday, "Every Monday · 30 min · 16
 * spots"). NEW is a role that hasn't started yet, SLOT a class slot, HIRED
 * the rest (the board's W() rows).
 */
export async function fetchMyWork(): Promise<MarketResult<WorkItem[]>> {
  const fallback = "Couldn't load your work.";
  const work = await marketRpc("my_work", {}, fallback, rows);
  if (!work.ok) return work;
  const active = work.value.filter((w) => str(w.hire_id) && w.status === "active");
  if (!active.length) return { ok: true, value: [] };
  const today = localDay(new Date());
  const to = new Date();
  to.setDate(to.getDate() + 27);
  const [hires, cal] = await Promise.all([
    tableRows(() => marketDb.from("business_hires").select("id, hire_offer_id").in("id", uniq(active.map((w) => str(w.hire_id)))) as unknown as PromiseLike<Rows>, fallback),
    marketRpc("my_calendar", { p_from: today, p_to: localDay(to) }, fallback, rows),
  ]);
  const offerOf = new Map((hires.ok ? hires.value : []).map((h) => [String(h.id), str(h.hire_offer_id)]));
  const named = await tableRows(
    () => marketDb.from("business_hire_offers").select("id, class_series_ids, class_session_id").in("id", uniq([...offerOf.values()])) as unknown as PromiseLike<Rows>,
    fallback,
  );
  const namedById = new Map((named.ok ? named.value : []).map((o) => [String(o.id), o]));
  const sessions = cal.ok ? cal.value : [];
  return {
    ok: true,
    value: active.map((w) => {
      const type: OpeningType = w.type === "class_slot" ? "class_slot" : "role";
      const n = namedById.get(String(offerOf.get(String(w.hire_id))));
      const series = new Set(n && Array.isArray(n.class_series_ids) ? (n.class_series_ids as string[]) : []);
      const slot = n ? str(n.class_session_id) : null;
      const mine = sessions.filter((s) => s.business_id === w.business_id && s.status !== "cancelled" && ((str(s.class_series_id) && series.has(s.class_series_id as string)) || (slot && s.class_id === slot)));
      const classes: WorkClass[] = [];
      const seen = new Set<string>();
      for (const s of mine) {
        const day = str(s.event_date) ? isoDayOf(s.event_date as string) : null;
        const key = type === "class_slot" ? String(s.class_id) : `${s.class_series_id}|${day}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const dur = num(s.duration_min);
        const cap = num(s.capacity);
        const tail = [dur != null ? `${dur} min` : null, cap != null ? `${cap} spots` : null].filter(Boolean);
        classes.push({
          title: str(s.title) ?? "",
          weekday: type === "class_slot" ? null : day,
          startTime: hhmmOf(s.start_time),
          label: type === "role" && day ? [`Every ${DAY_LONG[day - 1]}`, ...tail].join(" · ") : null,
        });
      }
      const startsOn = str(w.starts_on);
      return {
        hireId: w.hire_id as string,
        businessId: str(w.business_id) ?? "",
        businessName: str(w.business_name) ?? "",
        roleTitle: str(w.title) ?? "",
        type,
        since: startsOn,
        tag: type === "class_slot" ? "SLOT" : startsOn && startsOn > today ? "NEW" : "HIRED",
        classes,
        sessionsAWeek: type === "role" ? (num(w.classes_per_week) ?? 0) : 0,
        pay: num(w.pay),
        payUnit: payUnitOf(w.pay_unit, type),
      } satisfies WorkItem;
    }),
  };
}

/**
 * my_team_invites(): existing-team invitations addressed to the caller's own
 * email or phone, live and not yet accepted (id, business_id, business_name,
 * logo_url, name, professional_type, sent_at, expires_at). The replacement
 * for an invite token.
 */
export function fetchMyTeamInvites(): Promise<MarketResult<ExistingTeamInvite[]>> {
  return marketRpc("my_team_invites", {}, "Couldn't load your invitations.", parseInvites);
}

/**
 * accept_existing_team_invite(p_invite_id) → the employment id (null when
 * already on the team). Matched on the caller's own email or phone; ATXH21
 * expired; ATX08 somebody else's / accepted / a bad id. Since Database #38
 * the employment uses no paid seat (the caller is a professional), so the
 * seat cap (ATXC0) can't refuse it.
 */
export function acceptExistingTeamInvite(inviteId: string): Promise<HiringWrite> {
  return hiringWrite("accept_existing_team_invite", { p_invite_id: inviteId }, "Couldn't accept the invite. Try again.", () => null);
}

// ---------------------------------------------------------------- open to gym work (P-MA.2)

/** professional_profiles.open_to_gym_work, the caller's own row (false by default: gyms find nobody until they opt in). */
export async function fetchOpenToGymWork(): Promise<MarketResult<boolean>> {
  const fallback = "Couldn't load your gym-work setting.";
  const uid = await currentUserId();
  if (!uid) return { ok: false, message: fallback };
  const r = await tableRows(() => marketDb.from("professional_profiles").select("open_to_gym_work").eq("profile_id", uid).limit(1) as unknown as PromiseLike<Rows>, fallback);
  if (!r.ok) return r;
  return r.value[0] ? { ok: true, value: bool(r.value[0].open_to_gym_work) } : { ok: false, message: fallback };
}

/** set_gym_work_available(p_open) → the stored value. On: gyms' searches and direct offers; off stops both (pending offers stay). */
export function setOpenToGymWork(open: boolean): Promise<HiringWrite<boolean>> {
  return hiringWrite("set_gym_work_available", { p_open: open }, "Couldn't save. Check your connection and try again.", (d) => d === true);
}

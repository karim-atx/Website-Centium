// Release 3 · W6 MO19 v3 Practice insights: the numbers from the documented
// readers, by HANDOVER i ("Practice insights: clients coached, Sessions
// delivered, Average rating, Retention, Outcome, Years on Centium"). Pure.
//
// Readers: practice_insights() (DB-3: clients coached, active clients,
// sessions delivered, rating, review count, retention_90d_pct which the
// database leaves null below 5 starts, years); the stage history
// (professional_client_stage_history, own rows) for active clients over time
// and new / completed per month; the professional's own sessions and their
// outcomes (calendar_events, set_session_outcome) for sessions a week and
// no-show / late-cancel rates; pending_client_requests (own) for enquiries;
// professional_reviews (own, not deleted) for ratings by month.
// Outcomes need a goal measure per client that no reader gives, and income
// needs payments (out of scope), so those stay Coming soon / states only.

export type ClientStage = "onboarding" | "active" | "paused" | "completed";

export interface StageChange {
  clientId: string;
  toStage: ClientStage;
  changedAt: string;
}

/** A client's stage at a moment: their latest change at or before it (none = not a client yet). */
export function stageAt(history: StageChange[], clientId: string, at: string): ClientStage | null {
  let cur: StageChange | null = null;
  for (const h of history) if (h.clientId === clientId && h.changedAt <= at && (!cur || h.changedAt >= cur.changedAt)) cur = h;
  return cur ? cur.toStage : null;
}

export function activeAt(history: StageChange[], at: string, connected?: (clientId: string, at: string) => boolean): number {
  const ids = [...new Set(history.map((h) => h.clientId))];
  return ids.filter((id) => stageAt(history, id, at) === "active" && (!connected || connected(id, at))).length;
}

/** The last `n` calendar months ending with the one holding `today`: [start, end) ISO dates and a short label. */
export function lastMonths(today: string, n: number): { start: string; end: string; label: string; long: string }[] {
  const d = new Date(`${today}T00:00:00`);
  const out: { start: string; end: string; label: string; long: string }[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const s = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const e = new Date(d.getFullYear(), d.getMonth() - i + 1, 1);
    const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    out.push({ start: iso(s), end: iso(e), label: s.toLocaleDateString("en-US", { month: "short" }), long: s.toLocaleDateString("en-US", { month: "long" }) });
  }
  return out;
}

export interface MonthRoster {
  label: string;
  long: string;
  active: number;
  added: number;
  completed: number;
}

/** Active clients at each month's end (or today), clients who started, and clients who completed in it. */
export function rosterByMonth(history: StageChange[], today: string, months: number, nowIso: string): MonthRoster[] {
  const firstSeen = new Map<string, string>();
  for (const h of history) {
    const f = firstSeen.get(h.clientId);
    if (!f || h.changedAt < f) firstSeen.set(h.clientId, h.changedAt);
  }
  return lastMonths(today, months).map((m) => {
    const endIso = new Date(`${m.end}T00:00:00`).toISOString();
    const at = endIso < nowIso ? endIso : nowIso;
    const startIso = new Date(`${m.start}T00:00:00`).toISOString();
    return {
      label: m.label,
      long: m.long,
      active: activeAt(history, at),
      added: [...firstSeen.values()].filter((t) => t >= startIso && t < endIso).length,
      completed: history.filter((h) => h.toStage === "completed" && h.changedAt >= startIso && h.changedAt < endIso).length,
    };
  });
}

export type Outcome = "completed" | "no_show" | "late_cancel" | null;

export interface WeekSessions {
  start: string;
  delivered: number;
  noShowPct: number | null;
  lateCancelPct: number | null;
}

/** Monday of the week holding `iso`. */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Sessions a week (Monday-first) over `weeks` weeks to `today`: sessions with
 * a client that have started, minus no-shows and late cancels = delivered;
 * the rates are a share of those booked sessions.
 */
export function sessionsByWeek(sessions: { date: string; outcome: Outcome }[], today: string, weeks: number): WeekSessions[] {
  const lastMon = mondayOf(today);
  const out: WeekSessions[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const d = new Date(`${lastMon}T00:00:00`);
    d.setDate(d.getDate() - i * 7);
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const e = new Date(d);
    e.setDate(e.getDate() + 7);
    const end = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
    const inWeek = sessions.filter((s) => s.date >= start && s.date < end && s.date <= today);
    const ns = inWeek.filter((s) => s.outcome === "no_show").length;
    const lc = inWeek.filter((s) => s.outcome === "late_cancel").length;
    out.push({
      start,
      delivered: inWeek.length - ns - lc,
      noShowPct: inWeek.length ? Math.round((100 * ns) / inWeek.length) : null,
      lateCancelPct: inWeek.length ? Math.round((100 * lc) / inWeek.length) : null,
    });
  }
  return out;
}

export interface Funnel {
  enquiries: number;
  hired: number;
  hirePct: number | null;
  /** Hired at least 30 days ago and still active 30 days after: null when nobody is that old yet. */
  stayed: number | null;
  stayedOf: number;
}

export function funnel(requests: { clientId: string; status: "pending" | "accepted" | "rejected"; requestedAt: string; resolvedAt: string | null }[], history: StageChange[], nowIso: string): Funnel {
  const hired = requests.filter((r) => r.status === "accepted");
  const old = hired.filter((r) => r.resolvedAt && Date.parse(r.resolvedAt) + 30 * 86400000 <= Date.parse(nowIso));
  const stayed = old.filter((r) => stageAt(history, r.clientId, new Date(Date.parse(r.resolvedAt as string) + 30 * 86400000).toISOString()) === "active").length;
  return {
    enquiries: requests.length,
    hired: hired.length,
    hirePct: requests.length ? Math.round((100 * hired.length) / requests.length) : null,
    stayed: old.length ? stayed : null,
    stayedOf: old.length,
  };
}

export interface MonthRating {
  label: string;
  long: string;
  average: number | null;
  count: number;
}

export function ratingsByMonth(reviews: { rating: number; createdAt: string }[], today: string, months: number): MonthRating[] {
  return lastMonths(today, months).map((m) => {
    const s = new Date(`${m.start}T00:00:00`).toISOString();
    const e = new Date(`${m.end}T00:00:00`).toISOString();
    const inM = reviews.filter((r) => r.createdAt >= s && r.createdAt < e);
    return { label: m.label, long: m.long, count: inM.length, average: inM.length ? Math.round((10 * inM.reduce((a, r) => a + r.rating, 0)) / inM.length) / 10 : null };
  });
}

/** Weeks since a date (the "You started {n} weeks ago" line). */
export const weeksSince = (iso: string, nowIso: string) => Math.max(0, Math.floor((Date.parse(nowIso) - Date.parse(iso)) / (7 * 86400000)));

/** Trends need history: sessions after 4 weeks, retention after 3 months (MO19 v3 early data). */
export const SESSION_TREND_WEEKS = 4;
export const RETENTION_MIN_STARTS = 5;
export const OUTCOME_MIN_CLIENTS = 5;

/** No-show share of booked sessions (FINAL_PLAN 3 §1.8 8786 "No-shows: {n}% of sessions"); null with none. */
export function noShowShare(sessions: { outcome: Outcome }[]): number | null {
  if (!sessions.length) return null;
  return Math.round((100 * sessions.filter((s) => s.outcome === "no_show").length) / sessions.length);
}

export interface RetentionPoint {
  months: number;
  /** null below RETENTION_MIN_STARTS clients old enough. */
  pct: number | null;
  kept: number;
  of: number;
}

/**
 * "Still active after" (HANDOVER i Retention, generalised to 1, 3, 6 and 12
 * months): of the clients who started at least k months ago, the share
 * whose stage was Active k months after they started. Hidden (null) below 5
 * such clients, as practice_insights hides its 90-day figure.
 */
export function retentionCurve(history: StageChange[], nowIso: string, points = [1, 3, 6, 12]): RetentionPoint[] {
  const firstSeen = new Map<string, string>();
  for (const h of history) {
    const f = firstSeen.get(h.clientId);
    if (!f || h.changedAt < f) firstSeen.set(h.clientId, h.changedAt);
  }
  const now = Date.parse(nowIso);
  return points.map((k) => {
    let of = 0;
    let kept = 0;
    for (const [id, t0] of firstSeen) {
      const d = new Date(t0);
      d.setMonth(d.getMonth() + k);
      if (d.getTime() > now) continue;
      of += 1;
      if (stageAt(history, id, d.toISOString()) === "active") kept += 1;
    }
    return { months: k, of, kept, pct: of >= RETENTION_MIN_STARTS ? Math.round((100 * kept) / of) : null };
  });
}

/** "{n} new clients a month, {n} finishing." (FINAL_PLAN 3 §1.8 8753), averaged and rounded; null with no movement. */
export function rosterInsight(months: MonthRoster[]): string | null {
  if (!months.length) return null;
  const added = months.reduce((a, m) => a + m.added, 0);
  const done = months.reduce((a, m) => a + m.completed, 0);
  if (!added && !done) return null;
  const per = (n: number) => Math.round((n / months.length) * 10) / 10;
  return `${per(added)} new clients a month, ${per(done)} finishing.`;
}

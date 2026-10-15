// Release 3 · W2 Home (CL1) readers. Backend contract: Database HANDOVER_API.md
// "Release 3 · Professional UI backend", DB-3 (hub_trend, client_adherence)
// and the follow-up "Time off and the today bar" (hub_trend('today') counts the
// lane's items). Every number is computed in the database from what each client
// shares; a null is "No shared data yet", never 0.

import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";
import { rpc } from "./rpc";
import { getCalendar, fetchInvitees, type ClientCalendarEvent, type InviteeRow } from "../calendar";
import { expandOccurrences } from "../../components/calendar/occurrences";
import { fetchClientAccess } from "./access";

export type HubRange = "today" | "week" | "month";

export type Read<T> = { ok: true; data: T } | { ok: false; offline: boolean };

export interface TrendBucket {
  /** The bucket's start, as the database returns it (the professional's own day or hour). */
  start: string;
  pct: number | null;
  previousPct: number | null;
  planned: number;
}

/** hub_trend(p_range, p_client_id): 24 hours (today), 7 days Monday first (week) or the month's days. */
export async function fetchHubTrend(range: HubRange, clientId: string | null): Promise<Read<TrendBucket[]>> {
  const { data, error } = await rpc("hub_trend", { p_range: range, p_client_id: clientId });
  if (error) return { ok: false, offline: isOffline(error) };
  const rows = (data ?? []) as { bucket_start: string; pct: number | null; previous_pct: number | null; planned: number | null }[];
  return {
    ok: true,
    data: rows.map((r) => ({ start: r.bucket_start, pct: r.pct, previousPct: r.previous_pct, planned: r.planned ?? 0 })),
  };
}

/** client_adherence(p_client_id, p_days, p_until).pct, null when the client shares nothing it counts. */
export async function fetchAdherencePct(clientId: string, days: number, until: string): Promise<number | null | undefined> {
  const { data, error } = await rpc("client_adherence", { p_client_id: clientId, p_days: days, p_until: until });
  if (error) return undefined;
  const row = ((data ?? []) as { pct: number | null }[])[0];
  return row ? row.pct : null;
}

export type Trend = "up" | "down" | "flat" | "new";

export interface StripClient {
  clientId: string;
  trend: Trend | null;
}

/**
 * The client strip (CL1 "only clients who share the data are shown"): a
 * client shares when professional_client_access has any switch on, or an
 * imaging or single-result share. The arrow compares the last 7 days with the
 * 7 before (client_adherence); 5 points either way is up or down. A client
 * joined in the last 7 days is "new" (CL1 Early data).
 */
export async function fetchStrip(clients: { clientId: string; joinedAt: string }[], today: string): Promise<Read<StripClient[]>> {
  const weekAgo = shiftIso(today, -7);
  const out = await Promise.all(
    clients.map(async (c) => {
      const access = await fetchClientAccess(c.clientId);
      if (!access.ok) return { error: access.offline };
      const a = access.data;
      const sharing = !!a && (a.categories.length > 0 || a.imagingSharedCount > 0 || a.resultSharedCount > 0);
      if (!sharing) return null;
      if (c.joinedAt.slice(0, 10) > weekAgo) return { clientId: c.clientId, trend: "new" as Trend };
      const [cur, prev] = await Promise.all([fetchAdherencePct(c.clientId, 7, today), fetchAdherencePct(c.clientId, 7, weekAgo)]);
      let trend: Trend | null = null;
      if (typeof cur === "number" && typeof prev === "number") trend = cur - prev >= 5 ? "up" : prev - cur >= 5 ? "down" : "flat";
      return { clientId: c.clientId, trend };
    })
  );
  const failed = out.find((x): x is { error: boolean } => !!x && "error" in x);
  if (failed) return { ok: false, offline: failed.error };
  return { ok: true, data: out.filter((x): x is StripClient => !!x && !("error" in x)) };
}

export interface EndingProgramme {
  id: string;
  clientId: string;
  name: string;
  endsOn: string;
  /** Week n of m, when the programme has a length and a start. */
  week: { n: number; of: number } | null;
}

/** CL1 Full coaching card: active assignments of my templates ending within 14 days (HANDOVER i "Programme ending soon"). */
export async function fetchProgrammesEnding(me: string, today: string): Promise<Read<EndingProgramme[]>> {
  const { data, error } = await supabase
    .from("workout_template_assignments")
    .select("id, client_id, starts_on, ends_on, join_week, workout_templates!inner(name, duration_weeks, owner_id)")
    .is("ended_at", null)
    .eq("workout_templates.owner_id", me)
    .gte("ends_on", today)
    .lte("ends_on", shiftIso(today, 14))
    .order("ends_on", { ascending: true });
  if (error) return { ok: false, offline: isOffline(error) };
  type Row = {
    id: string;
    client_id: string;
    starts_on: string | null;
    ends_on: string | null;
    join_week: number | null;
    workout_templates: { name: string; duration_weeks: number | null } | null;
  };
  return {
    ok: true,
    data: ((data ?? []) as unknown as Row[]).map((r) => {
      const of = r.workout_templates?.duration_weeks ?? null;
      let week: EndingProgramme["week"] = null;
      if (of && r.starts_on) {
        const n = Math.floor(daysBetween(r.starts_on, today) / 7) + (r.join_week ?? 1);
        if (n >= 1 && n <= of) week = { n, of };
      }
      return { id: r.id, clientId: r.client_id, name: r.workout_templates?.name ?? "", endsOn: r.ends_on ?? today, week };
    }),
  };
}

export interface RangeSession {
  key: string;
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  title: string;
  location?: string;
  url?: string;
  /** The first client invited, for "Next 10:30 · {client}" and the preview. */
  client: InviteeRow | null;
  sourceKind?: string;
}

/**
 * The calendar track (HANDOVER i "Calendar track"): the professional's timed
 * events between `from` and `to`, repeats expanded, each with its first
 * invitee. Cancelled occurrences are dropped by expandOccurrences.
 */
export async function fetchSessions(me: string, from: string, to: string): Promise<{ ok: true; data: RangeSession[] } | { ok: false; message: string }> {
  const cal = await getCalendar(me);
  if (!cal.ok) return { ok: false, message: cal.message };
  const own = cal.events.filter((e: ClientCalendarEvent) => !e.allDay && !!e.startTime && (e.mine || e.scheduledForClient) && !e.invite);
  const occ = expandOccurrences(own, cal.exceptions, from, to);
  const invitees = await fetchInvitees([...new Set(occ.map((o) => o.id))]);
  return {
    ok: true,
    data: occ
      .map((o) => ({
        key: `${o.id}:${o.date}`,
        id: o.id,
        date: o.date,
        startTime: o.startTime,
        endTime: o.endTime,
        title: o.title,
        location: o.location,
        url: o.url,
        client: (invitees[o.id] ?? []).find((i) => i.status !== "declined") ?? null,
        sourceKind: o.sourceKind,
      }))
      .sort((a, b) => (a.date + (a.startTime ?? "")).localeCompare(b.date + (b.startTime ?? ""))),
  };
}

// ---------------------------------------------------------------------------

export function shiftIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localIso(d);
}

export function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);
}

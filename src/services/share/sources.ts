// Release 3 · W8 SH4 "What do you want to share?": where each card's facts
// come from, through readers earlier batches already use. Nothing here reads
// client health data; client wins come only from client_wins().
// - client_wins(null): every connected client's allowed wins (DB-8);
// - workout_templates (owner_id = me, select own) for programmes;
// - meal plan templates (services/pro/nutrition fetchTemplates);
// - courses (services/pro/courses fetchCourseCards, published only);
// - packages: hire plans with a session count (services/pro/profile
//   fetchServicePlans, active only);
// - professional_open_slots(p_professional, p_from, p_to, p_service_id)
//   (DB-4), this week only, per session type (see fetchWeekSlots);
// - the Community: my_forum_threads() (Release A; posts carry no author
//   column) plus forum_threads_readable for the body, published, under the
//   real name.

import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../network-error";
import { rpc } from "../pro/rpc";
import { fetchCourseCards } from "../pro/courses";
import { fetchTemplates } from "../pro/nutrition";
import { fetchServicePlans } from "../pro/profile";
import { clock12 } from "../../utils/time12";
import type { ClientWin, WinKind } from "../../components/share/shareCardModel";
import type { Read } from "./index";

const from = (table: string) => supabase.from(table as never);
const readFail = (error: unknown) => ({ ok: false as const, offline: isOffline(error) });

/** Every connected client's wins (client_wins with no client). */
export async function fetchAllWins(): Promise<Read<ClientWin[]>> {
  const { data, error } = await rpc("client_wins", { p_client_id: null });
  if (error) return readFail(error);
  const rows = (Array.isArray(data) ? data : []) as { win_id: string; client_id: string; kind: WinKind; occurred_at: string; value: Record<string, unknown> | null }[];
  return { ok: true, data: rows.map((r) => ({ winId: r.win_id, clientId: r.client_id, kind: r.kind, occurredAt: r.occurred_at, value: r.value ?? {} })).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)) };
}

export interface PromoItem {
  id: string;
  kind: "programme" | "meal_plan" | "course" | "package";
  title: string;
  sub: string;
  /** Facts for the card. */
  weeks?: number | null;
  level?: string | null;
  lessons?: number;
  price?: number;
  priceIsMonthly?: string | null;
  rating?: number | null;
  ratings?: number;
  sessions?: number | null;
  days?: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export async function fetchPromoItems(me: string, lane: "full_coaching" | "nutrition"): Promise<Read<PromoItem[]>> {
  const out: PromoItem[] = [];
  if (lane === "full_coaching") {
    const { data, error } = await from("workout_templates").select("id, name, duration_weeks, level, updated_at").eq("owner_id", me).order("updated_at", { ascending: false });
    if (error) return readFail(error);
    for (const r of (data ?? []) as unknown as { id: string; name: string; duration_weeks: number | null; level: string | null }[]) {
      out.push({ id: r.id, kind: "programme", title: r.name, sub: [r.duration_weeks ? plural(r.duration_weeks, "week", "weeks") : null, r.level].filter(Boolean).join(" · ") || "Programme", weeks: r.duration_weeks, level: r.level });
    }
  } else {
    const t = await fetchTemplates(me);
    if (!t.ok) return t;
    for (const p of t.data) out.push({ id: p.id, kind: "meal_plan", title: p.name, sub: plural(p.daysCount, "day", "days"), days: p.daysCount });
  }
  const c = await fetchCourseCards(me);
  if (!c.ok) return c;
  for (const k of c.data.filter((x) => x.status === "published")) {
    out.push({ id: k.id, kind: "course", title: k.title, sub: `Course · ${plural(k.weeks, "week", "weeks")} · ${plural(k.lessons, "lesson", "lessons")}`, weeks: k.weeks, lessons: k.lessons, level: k.level, price: k.priceCents / 100, rating: k.averageRating, ratings: k.ratings });
  }
  const s = await fetchServicePlans(me);
  if (!s.ok) return s;
  for (const p of s.data.filter((x) => x.active && x.sessionCount != null)) {
    out.push({ id: p.id, kind: "package", title: p.name, sub: `Package · ${plural(p.sessionCount ?? 0, "session", "sessions")}`, sessions: p.sessionCount, price: p.price, priceIsMonthly: p.billing });
  }
  return { ok: true, data: out };
}

/**
 * This week's open slots (Monday to Sunday, from now on), as "Tue 6:00 PM".
 * professional_open_slots needs a session type (ATXF4 without one), so the
 * starts of every active session type are merged, then thinned to slots that
 * don't overlap (the reader offers a start every 15 minutes). null data = no
 * session type.
 *
 * Kept per type although Release A made p_service_id optional (W8-7): on the
 * local stack the call without a type took 22-30 s against 8-15 s per type,
 * past the 8 s statement timeout either way, and one call puts every type's
 * work in one budget. Back to one call once the reader is fast (reported to
 * the Database session).
 */
export async function fetchWeekSlots(me: string, now: Date): Promise<Read<string[] | null>> {
  const svc = await from("appointment_services").select("id").eq("professional_id", me).eq("active", true);
  if (svc.error) return readFail(svc.error);
  const ids = ((svc.data ?? []) as unknown as { id: string }[]).map((r) => r.id);
  if (!ids.length) return { ok: true, data: null };
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const sun = new Date(d);
  sun.setDate(d.getDate() + (6 - ((d.getDay() + 6) % 7)));
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const starts = new Map<number, { s: Date; e: Date }>();
  for (const id of ids) {
    const { data, error } = await rpc("professional_open_slots", { p_professional: me, p_from: iso(d), p_to: iso(sun), p_service_id: id });
    if (error) return readFail(error);
    for (const r of (Array.isArray(data) ? data : []) as { starts_at: string; ends_at: string }[]) {
      const t = new Date(r.starts_at);
      const e = new Date(r.ends_at);
      const had = starts.get(t.getTime());
      if (t.getTime() > now.getTime() && (!had || e < had.e)) starts.set(t.getTime(), { s: t, e });
    }
  }
  const kept: Date[] = [];
  let free = 0;
  for (const x of [...starts.values()].sort((a, b) => a.s.getTime() - b.s.getTime())) {
    if (x.s.getTime() < free) continue;
    kept.push(x.s);
    free = x.e.getTime();
  }
  const times = kept.map((t) => `${t.toLocaleDateString("en-US", { weekday: "short" })} ${clock12(t)}`);
  return { ok: true, data: times };
}

export interface MyPost {
  id: string;
  body: string;
  title: string | null;
  categoryKey: string;
}

/**
 * My published Community posts under my real name, newest first. W8-6
 * (Database Release A 20261216090000): my_forum_threads() answers for the
 * caller only (id, title, category_key, status, created_at, reply_count;
 * author_id stays ungranted), so older posts are found too. It carries no
 * body or identity, so those come from forum_threads_readable by id; a
 * nickname post is never put under the real name.
 */
export async function fetchMyPosts(): Promise<Read<MyPost[]>> {
  const mine = await rpc("my_forum_threads", { p_limit: 50 });
  if (mine.error) return readFail(mine.error);
  const ids = ((Array.isArray(mine.data) ? mine.data : []) as { id: string; status: string }[]).filter((t) => t.status === "published").map((t) => t.id);
  if (!ids.length) return { ok: true, data: [] };
  const { data, error } = await from("forum_threads_readable").select("id, identity, title, body, category_key, status, withdrawn").in("id", ids);
  if (error) return readFail(error);
  const byId = new Map(((data ?? []) as unknown as { id: string; identity: string; title: string | null; body: string | null; category_key: string; status: string; withdrawn: boolean }[]).map((t) => [t.id, t]));
  const out: MyPost[] = [];
  for (const id of ids) {
    const t = byId.get(id);
    if (t && t.status === "published" && !t.withdrawn && t.identity === "real_name" && t.body) out.push({ id, body: t.body, title: t.title, categoryKey: t.category_key });
  }
  return { ok: true, data: out };
}

// Release 3 · W6 Courses for professionals (MO18 v3 Your courses, MO28
// Course stats and Create course). The author verbs stay in
// services/courses/author.ts (Database 24b7464); this file adds the reads
// the new screens need and the DB-6 drip writers.
//
// - courses (author's own rows, courses_read) for the three tabs;
// - course_stats(p_course_ids): enrolled, average rating, ratings. Only these
//   three numbers exist for an author: course_enrolments, course_lesson_progress
//   and course_certificates are readable by the learner only, so enrolments by
//   month, completion and drop-off have no reader (Coming soon, never sample);
// - course_ratings (course_ratings_read: any adult may read a readable course's
//   ratings) for the 5 to 1 distribution;
// - course_modules / course_lessons of the LIVE tree, for "{n} weeks · {n}
//   lessons" on the cards, plus opens_after_days for the Access step;
// - DB-6 drip: set_course_drip(p_course_id, p_mode 'all_at_once' | 'weekly',
//   p_weekday 1-7 | null) and set_module_opens_after(p_module_id, p_days 0-365)
//   (checked with psql: both owner-only, ATX08 otherwise, 22023 out of range);
// - DB-7 send_recommendation(p_thread_id, p_title, p_body, 'course', 'course',
//   p_ref_id) to suggest a published course in a client's chat, after
//   start_message_thread (services/messaging startThread).

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { rpc } from "./rpc";
import { t } from "../../i18n/core";
import type { Read, Write } from "./clients";
import type { CourseStatus } from "../courses/authorRules";

const fail = (error: unknown): { ok: false; offline: boolean } => ({ ok: false, offline: isOffline(error) });
const failed = (error: unknown, fallback: string): Write => ({ ok: false, message: isOffline(error) ? t(OFFLINE_MESSAGE) : fallback });

export type DripMode = "all_at_once" | "weekly";

export interface CourseCard {
  id: string;
  title: string;
  subtitle: string | null;
  level: string;
  categoryKey: string;
  coverColour: string;
  priceCents: number;
  status: CourseStatus;
  submittedAt: string | null;
  publishedAt: string | null;
  reviewReason: string | null;
  updatedAt: string;
  dripMode: DripMode;
  dripWeekday: number | null;
  weeks: number;
  lessons: number;
  enrolled: number;
  averageRating: number | null;
  ratings: number;
}

type CourseRow = {
  id: string;
  title: string;
  subtitle: string | null;
  level: string;
  category_key: string;
  cover_colour: string;
  price_cents: number;
  status: string;
  submitted_at: string | null;
  published_at: string | null;
  review_reason: string | null;
  updated_at: string;
  drip_mode: string;
  drip_weekday: number | null;
};

const CARD_COLUMNS =
  "id, title, subtitle, level, category_key, cover_colour, price_cents, status, submitted_at, published_at, review_reason, updated_at, drip_mode, drip_weekday";

/** Every course this professional wrote, with its live tree's counts and course_stats. */
export async function fetchCourseCards(userId: string): Promise<Read<CourseCard[]>> {
  const { data, error } = await supabase.from("courses").select(CARD_COLUMNS).eq("author_id", userId).order("updated_at", { ascending: false });
  if (error) return fail(error);
  const rows = (data ?? []) as unknown as CourseRow[];
  if (rows.length === 0) return { ok: true, data: [] };
  const ids = rows.map((r) => r.id);
  const [tree, stats] = await Promise.all([fetchLiveCounts(ids), fetchStats(ids)]);
  if (!tree.ok) return tree;
  if (!stats.ok) return stats;
  return {
    ok: true,
    data: rows.map((r) => {
      const s = stats.data.get(r.id);
      const c = tree.data.get(r.id);
      return {
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        level: r.level,
        categoryKey: r.category_key,
        coverColour: r.cover_colour,
        priceCents: r.price_cents,
        status: r.status as CourseStatus,
        submittedAt: r.submitted_at,
        publishedAt: r.published_at,
        reviewReason: r.review_reason,
        updatedAt: r.updated_at,
        dripMode: r.drip_mode === "weekly" ? "weekly" : "all_at_once",
        dripWeekday: r.drip_weekday,
        weeks: c?.weeks ?? 0,
        lessons: c?.lessons ?? 0,
        enrolled: s?.enrolled ?? 0,
        averageRating: s?.averageRating ?? null,
        ratings: s?.ratings ?? 0,
      };
    }),
  };
}

export async function fetchCourseCard(userId: string, courseId: string): Promise<Read<CourseCard | null>> {
  const r = await fetchCourseCards(userId);
  if (!r.ok) return r;
  return { ok: true, data: r.data.find((c) => c.id === courseId) ?? null };
}

/** Weeks and lessons of each course's LIVE tree (revision_id null). */
async function fetchLiveCounts(ids: string[]): Promise<Read<Map<string, { weeks: number; lessons: number }>>> {
  const { data: modules, error } = await supabase.from("course_modules").select("id, course_id").in("course_id", ids).is("revision_id", null);
  if (error) return fail(error);
  const mods = (modules ?? []) as { id: string; course_id: string }[];
  const out = new Map<string, { weeks: number; lessons: number }>();
  for (const m of mods) {
    const c = out.get(m.course_id) ?? { weeks: 0, lessons: 0 };
    c.weeks += 1;
    out.set(m.course_id, c);
  }
  if (mods.length === 0) return { ok: true, data: out };
  const { data: lessons, error: e2 } = await supabase.from("course_lessons").select("module_id").in("module_id", mods.map((m) => m.id));
  if (e2) return fail(e2);
  const courseOf = new Map(mods.map((m) => [m.id, m.course_id]));
  for (const l of (lessons ?? []) as { module_id: string }[]) {
    const c = out.get(courseOf.get(l.module_id) ?? "");
    if (c) c.lessons += 1;
  }
  return { ok: true, data: out };
}

async function fetchStats(ids: string[]): Promise<Read<Map<string, { enrolled: number; averageRating: number | null; ratings: number }>>> {
  const { data, error } = await rpc("course_stats", { p_course_ids: ids });
  if (error) return fail(error);
  const rows = (data ?? []) as { course_id: string; average_rating: number | string | null; ratings: number | string; enrolled: number | string }[];
  return {
    ok: true,
    data: new Map(
      rows.map((r) => [r.course_id, { enrolled: Number(r.enrolled ?? 0), averageRating: r.average_rating === null ? null : Number(r.average_rating), ratings: Number(r.ratings ?? 0) }])
    ),
  };
}

/** Every rating's stars, for the 5 to 1 bars. */
export async function fetchRatingStars(courseId: string): Promise<Read<number[]>> {
  const { data, error } = await supabase.from("course_ratings").select("stars").eq("course_id", courseId);
  if (error) return fail(error);
  return { ok: true, data: ((data ?? []) as { stars: number }[]).map((r) => Number(r.stars)) };
}

/** opens_after_days of each module of the tree being edited (live or a revision's). */
export async function fetchModuleOpensAfter(courseId: string, revisionId: string | null): Promise<Read<Map<string, number>>> {
  const q = supabase.from("course_modules").select("id, opens_after_days").eq("course_id", courseId);
  const { data, error } = await (revisionId ? q.eq("revision_id", revisionId) : q.is("revision_id", null));
  if (error) return fail(error);
  return { ok: true, data: new Map(((data ?? []) as { id: string; opens_after_days: number }[]).map((m) => [m.id, m.opens_after_days])) };
}

/** courses.drip_mode / drip_weekday (DB-6). */
export async function fetchDrip(courseId: string): Promise<Read<{ mode: DripMode; weekday: number | null }>> {
  const { data, error } = await supabase.from("courses").select("drip_mode, drip_weekday").eq("id", courseId).maybeSingle();
  if (error) return fail(error);
  const r = data as { drip_mode: string; drip_weekday: number | null } | null;
  return { ok: true, data: { mode: r?.drip_mode === "weekly" ? "weekly" : "all_at_once", weekday: r?.drip_weekday ?? null } };
}

/**
 * An open revision's drip (Database 20261124170000): open_course_revision
 * copies it, and on a published course set_course_drip /
 * set_module_opens_after write the open revision (ATX67 without one).
 */
export async function fetchRevisionDrip(revisionId: string): Promise<Read<{ mode: DripMode; weekday: number | null }>> {
  const { data, error } = await rpc("course_revision_drip", { p_revision_id: revisionId });
  if (error) return fail(error);
  const r = (Array.isArray(data) ? data[0] : data) as { drip_mode: string; drip_weekday: number | null } | undefined;
  return { ok: true, data: { mode: r?.drip_mode === "weekly" ? "weekly" : "all_at_once", weekday: r?.drip_weekday ?? null } };
}

/** set_course_drip, then each module's opens_after_days in order (the plan from courseModel.dripPlan). */
export async function saveDrip(courseId: string, mode: DripMode, weekday: number | null, plan: { moduleId: string; days: number }[]): Promise<Write> {
  const { error } = await rpc("set_course_drip", { p_course_id: courseId, p_mode: mode, p_weekday: weekday });
  if (error) return failed(error, t("Couldn't save how lessons unlock. Try again."));
  for (const p of plan) {
    const { error: e } = await rpc("set_module_opens_after", { p_module_id: p.moduleId, p_days: p.days });
    if (e) return failed(e, t("Couldn't save how lessons unlock. Try again."));
  }
  return { ok: true };
}

/** The number of questions in each quiz lesson (course_quiz_for_author, one row per option). */
export async function fetchQuizCounts(lessonIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  await Promise.all(
    lessonIds.map(async (id) => {
      const { data, error } = await rpc("course_quiz_for_author", { p_lesson_id: id });
      if (error) return;
      out.set(id, new Set(((data ?? []) as { question_id: string }[]).map((r) => r.question_id)).size);
    })
  );
  return out;
}

/** Suggest a published course in one client's chat: their thread (created if needed), then a course recommendation card. */
export async function suggestCourse(clientUserId: string, course: { id: string; title: string }): Promise<Write> {
  const { data: thread, error } = await rpc("start_message_thread", { p_other_user_id: clientUserId });
  const threadId = (thread as { id?: string } | null)?.id;
  if (error || !threadId) return failed(error, t("Couldn't open that chat. Try again."));
  const { error: e } = await rpc("send_recommendation", {
    p_thread_id: threadId,
    p_title: course.title.slice(0, 120),
    p_body: null,
    p_category: "course",
    p_ref_kind: "course",
    p_ref_id: course.id,
  });
  if (e) return failed(e, t("Couldn't send the suggestion. Try again."));
  return { ok: true };
}

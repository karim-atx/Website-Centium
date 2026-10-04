import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { describeCourseError, type AccessLevel, type CourseAction, type LessonKind, type Tier } from "./rules";

// Courses, the learner side (Database 99ec17b).
//
// READS are column-limited selects on the course tables (there are no
// readable views for courses); every WRITE is an RPC. Nothing here inserts
// through the REST API, so no Prefer: return=representation anywhere.
//
// ONLY THE PUBLISHED TREE: modules and lessons with revision_id null. A
// course's author can also read a pending revision's rows, which a learner's
// screen must never mix in.

export type Result<T> = { ok: true; value: T } | { ok: false; message: string; code?: string };

const GENERIC = "Something went wrong. Try again.";

function fail(error: { code?: string; message?: string }, action: CourseAction): { ok: false; message: string; code?: string } {
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  return { ok: false, message: describeCourseError(error, action) ?? GENERIC, code: error.code };
}

export interface CourseCategory {
  key: string;
  name: string;
  sortOrder: number;
}

export interface Course {
  id: string;
  authorId: string | null;
  title: string;
  subtitle: string | null;
  categoryKey: string;
  level: string;
  weeklyHours: number | null;
  learnPoints: string[];
  coverColour: string;
  priceCents: number;
  publishedAt: string | null;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  position: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  kind: LessonKind;
  title: string;
  position: number;
  minutes: number | null;
  videoId: string | null;
  body: string | null;
  passMark: number | null;
}

export interface Enrolment {
  id: string;
  courseId: string;
  tier: Tier;
  enrolledAt: string;
  lastLessonId: string | null;
  lastSeenAt: string | null;
}

const COURSE_COLUMNS =
  "id, author_id, title, subtitle, category_key, level, weekly_hours, learn_points, cover_colour, price_cents, published_at";

type CourseRow = {
  id: string;
  author_id: string | null;
  title: string;
  subtitle: string | null;
  category_key: string;
  level: string;
  weekly_hours: number | null;
  learn_points: string[] | null;
  cover_colour: string;
  price_cents: number;
  published_at: string | null;
};

const toCourse = (r: CourseRow): Course => ({
  id: r.id,
  authorId: r.author_id,
  title: r.title,
  subtitle: r.subtitle,
  categoryKey: r.category_key,
  level: r.level,
  weeklyHours: r.weekly_hours === null ? null : Number(r.weekly_hours),
  learnPoints: r.learn_points ?? [],
  coverColour: r.cover_colour,
  priceCents: r.price_cents,
  publishedAt: r.published_at,
});

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export async function fetchCourseCategories(): Promise<Result<CourseCategory[]>> {
  const { data, error } = await supabase.from("course_categories").select("key, name, sort_order").order("sort_order");
  if (error) return fail(error, "read");
  return { ok: true, value: (data ?? []).map((c) => ({ key: c.key, name: c.name, sortOrder: c.sort_order })) };
}

/** Every published course. An author's own drafts are readable too, and left out here on purpose. */
export async function fetchCatalogue(): Promise<Result<Course[]>> {
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) return fail(error, "read");
  return { ok: true, value: ((data ?? []) as CourseRow[]).map(toCourse) };
}

export async function fetchCourse(id: string): Promise<Result<Course | null>> {
  const { data, error } = await supabase.from("courses").select(COURSE_COLUMNS).eq("id", id).eq("status", "published").maybeSingle();
  if (error) return fail(error, "read");
  return { ok: true, value: data ? toCourse(data as CourseRow) : null };
}

/** First names of course authors, by id. Every published author is a verified professional. */
export async function fetchAuthorNames(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return out;
  const { data } = await supabase.from("public_profile_summary").select("id, first_name").in("id", unique);
  for (const r of data ?? []) if (r.id) out.set(r.id, r.first_name?.trim() || "Professional");
  return out;
}

export interface CourseStats {
  /** Rounded to one place by the server, so every client shows the same 4.8. */
  averageRating: number | null;
  ratings: number;
  enrolled: number;
}

/**
 * Ratings and enrolment counts for many courses at once.
 *
 * THIS REPLACES READING course_ratings WHOLE AND COUNTING IN THE BROWSER, which
 * is what was here while course_stats did not exist. The server-side version is
 * better on three counts, and only one of them is speed: it averages and rounds
 * in one place so no two screens can disagree about 4.8; it returns an enrolled
 * count that the client could not compute at all, because course_enrolments is
 * readable only for your own rows; and it is scoped by course_is_readable, so
 * it cannot be used to confirm that a draft course id exists or to watch a
 * competitor's sales.
 *
 * A course with no ratings comes back with averageRating null and 0 — not
 * absent — so a card can say "New" rather than nothing.
 */
export async function fetchCourseStats(courseIds: string[]): Promise<Map<string, CourseStats>> {
  const out = new Map<string, CourseStats>();
  if (courseIds.length === 0) return out;
  const { data } = await supabase.rpc("course_stats", { p_course_ids: courseIds });
  for (const r of data ?? []) {
    out.set(r.course_id, {
      averageRating: r.average_rating === null ? null : Number(r.average_rating),
      ratings: Number(r.ratings ?? 0),
      enrolled: Number(r.enrolled ?? 0),
    });
  }
  // A course the server said nothing about has nothing yet, which is a real
  // answer and not a missing one.
  for (const id of courseIds) {
    if (!out.has(id)) out.set(id, { averageRating: null, ratings: 0, enrolled: 0 });
  }
  return out;
}

/** Weeks and lessons of many courses at once, for cards and "Continue learning". */
export async function fetchTrees(courseIds: string[]): Promise<{ modules: CourseModule[]; lessons: Lesson[] }> {
  if (courseIds.length === 0) return { modules: [], lessons: [] };
  const { data: mods } = await supabase
    .from("course_modules")
    .select("id, course_id, title, position")
    .in("course_id", courseIds)
    .is("revision_id", null)
    .order("position");
  const modules: CourseModule[] = (mods ?? []).map((m) => ({ id: m.id, courseId: m.course_id, title: m.title, position: m.position }));
  if (modules.length === 0) return { modules, lessons: [] };
  const { data: les } = await supabase
    .from("course_lessons")
    .select("id, module_id, kind, title, position, minutes, video_id, body, pass_mark")
    .in("module_id", modules.map((m) => m.id))
    .is("revision_id", null)
    .order("position");
  const lessons: Lesson[] = (les ?? []).map((l) => ({
    id: l.id,
    moduleId: l.module_id,
    kind: l.kind as LessonKind,
    title: l.title,
    position: l.position,
    minutes: l.minutes,
    videoId: l.video_id,
    body: l.body,
    passMark: l.pass_mark,
  }));
  return { modules, lessons };
}

/** The lessons of a course in reading order: by week, then by position. */
export function orderedLessons(modules: CourseModule[], lessons: Lesson[], courseId: string): Lesson[] {
  const mods = modules.filter((m) => m.courseId === courseId).sort((a, b) => a.position - b.position);
  return mods.flatMap((m) => lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.position - b.position));
}

// ---------------------------------------------------------------------------
// The learner
// ---------------------------------------------------------------------------

export async function fetchMyEnrolments(userId: string): Promise<Enrolment[]> {
  const { data } = await supabase
    .from("course_enrolments")
    .select("id, course_id, tier, enrolled_at, last_lesson_id, last_seen_at")
    .eq("learner_id", userId)
    .order("last_seen_at", { ascending: false, nullsFirst: false });
  return (data ?? []).map((e) => ({
    id: e.id,
    courseId: e.course_id,
    tier: e.tier as Tier,
    enrolledAt: e.enrolled_at,
    lastLessonId: e.last_lesson_id,
    lastSeenAt: e.last_seen_at,
  }));
}

export async function fetchCompleted(enrolmentIds: string[]): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  if (enrolmentIds.length === 0) return out;
  const { data } = await supabase.from("course_lesson_progress").select("enrolment_id, lesson_id").in("enrolment_id", enrolmentIds);
  for (const r of data ?? []) {
    const s = out.get(r.enrolment_id) ?? new Set<string>();
    s.add(r.lesson_id);
    out.set(r.enrolment_id, s);
  }
  return out;
}

export async function fetchAccessLevel(courseId: string): Promise<AccessLevel> {
  const { data } = await supabase.rpc("course_access_level", { p_course_id: courseId });
  return data === "paid" || data === "free" ? data : "none";
}

/** Whether paid enrolment is open (the payments switch, off until payments launch). */
export async function fetchPaidOpen(): Promise<boolean> {
  const { data } = await supabase.rpc("paid_enrolment_is_open");
  return data === true;
}

export async function enrol(courseId: string, tier: Tier): Promise<Result<string>> {
  const { data, error } = await supabase.rpc("enrol_in_course", { p_course_id: courseId, p_tier: tier });
  if (error) return fail(error, tier === "paid" ? "paid" : "enrol");
  return { ok: true, value: data as string };
}

export async function completeLesson(lessonId: string): Promise<Result<null>> {
  const { error } = await supabase.rpc("complete_course_lesson", { p_lesson_id: lessonId });
  if (error) return fail(error, "complete");
  return { ok: true, value: null };
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: { id: string; body: string }[];
}

/** The quiz without its answer key (course_quiz never returns is_correct). */
export async function fetchQuiz(lessonId: string): Promise<Result<QuizQuestion[]>> {
  const { data, error } = await supabase.rpc("course_quiz", { p_lesson_id: lessonId });
  if (error) return fail(error, "quiz");
  const byId = new Map<string, QuizQuestion & { position: number }>();
  for (const r of data ?? []) {
    const q = byId.get(r.question_id) ?? { id: r.question_id, prompt: r.prompt, position: r.question_position, options: [] };
    q.options.push({ id: r.option_id, body: r.option_body });
    byId.set(r.question_id, q);
  }
  return { ok: true, value: [...byId.values()].sort((a, b) => a.position - b.position) };
}

export async function submitQuiz(lessonId: string, answers: Record<string, string>): Promise<Result<{ score: number; passed: boolean }>> {
  const { data, error } = await supabase.rpc("submit_course_quiz", { p_lesson_id: lessonId, p_answers: answers });
  if (error) return fail(error, "quiz");
  const row = (data ?? [])[0];
  return { ok: true, value: { score: row?.score_percent ?? 0, passed: !!row?.passed } };
}

export async function fetchBestAttempts(enrolmentId: string): Promise<Map<string, { score: number; passed: boolean }>> {
  const out = new Map<string, { score: number; passed: boolean }>();
  const { data } = await supabase.from("course_quiz_attempts").select("lesson_id, score_percent, passed").eq("enrolment_id", enrolmentId);
  for (const a of data ?? []) {
    const prev = out.get(a.lesson_id);
    if (!prev || a.score_percent > prev.score) out.set(a.lesson_id, { score: a.score_percent, passed: a.passed });
  }
  return out;
}

/** A short-lived link to a PDF lesson, for a buyer or the author only. */
export async function pdfLink(lessonId: string): Promise<Result<string>> {
  const { data: path, error } = await supabase.rpc("course_pdf_path", { p_lesson_id: lessonId });
  if (error || typeof path !== "string") return fail(error ?? {}, "pdf");
  const { data, error: signErr } = await supabase.storage.from("course-pdfs").createSignedUrl(path, 10 * 60, { download: true });
  if (signErr || !data) return { ok: false, message: "The PDF couldn't be opened. Try again." };
  return { ok: true, value: data.signedUrl };
}

export interface CourseQuestion {
  id: string;
  body: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
}

/** The course's questions and answers, which every buyer reads. Who asked is not shown. */
export async function fetchQuestions(courseId: string): Promise<CourseQuestion[]> {
  const { data } = await supabase
    .from("course_questions")
    .select("id, body, answer, answered_at, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((q) => ({ id: q.id, body: q.body, answer: q.answer, answeredAt: q.answered_at, createdAt: q.created_at }));
}

export async function askQuestion(courseId: string, body: string): Promise<Result<null>> {
  const { error } = await supabase.rpc("ask_course_question", { p_course_id: courseId, p_body: body.trim() });
  if (error) return fail(error, "ask");
  return { ok: true, value: null };
}

export async function fetchMyRating(courseId: string, userId: string): Promise<{ stars: number; body: string | null } | null> {
  const { data } = await supabase
    .from("course_ratings")
    .select("stars, body")
    .eq("course_id", courseId)
    .eq("learner_id", userId)
    .maybeSingle();
  return data ? { stars: data.stars, body: data.body } : null;
}

export async function rateCourse(courseId: string, stars: number, body: string): Promise<Result<null>> {
  const { error } = await supabase.rpc("rate_course", {
    p_course_id: courseId,
    p_stars: stars,
    ...(body.trim() ? { p_body: body.trim() } : {}),
  });
  if (error) return fail(error, "rate");
  return { ok: true, value: null };
}

export interface Certificate {
  id: string;
  serial: string;
  issuedAt: string;
  /** The learner's own "Share certificate" switch. OFF until they turn it on. */
  shared: boolean;
}

export async function fetchMyCertificate(enrolmentId: string): Promise<Certificate | null> {
  const { data } = await supabase
    .from("course_certificates")
    .select("id, serial, issued_at, shared")
    .eq("enrolment_id", enrolmentId)
    .maybeSingle();
  return data ? { id: data.id, serial: data.serial, issuedAt: data.issued_at, shared: data.shared } : null;
}

/**
 * The switch, per certificate rather than per account, so publishing one course
 * does not volunteer the rest.
 */
export async function setCertificateSharing(certificateId: string, shared: boolean): Promise<Result<null>> {
  const { error } = await supabase.rpc("set_certificate_sharing", {
    p_certificate_id: certificateId,
    p_shared: shared,
  });
  if (error) return fail(error, "read");
  return { ok: true, value: null };
}

export interface PublicCertificate {
  serial: string;
  learnerFirstName: string;
  courseTitle: string;
  /** Null when the professional has since deleted their account. */
  professionalName: string | null;
  /** A DATE, not a timestamp: the day is on the certificate, the minute is not. */
  completedOn: string;
}

/**
 * One shared certificate, by serial, for the public page.
 *
 * SIGNED OUT ON PURPOSE — course_certificate() is the only function in Courses
 * granted to anon, and it returns five fields and no sixth.
 *
 * NULL MEANS "WE COULD NOT FIND IT", AND MEANS NOTHING MORE. An unshared
 * certificate and a serial that never existed both answer with zero rows and no
 * error, deliberately: distinguishing them would tell a stranger that a given
 * certificate exists, which is the one thing the switch is there to prevent. So
 * this returns the same null for both, and the page must word it the same way.
 */
export async function fetchPublicCertificate(serial: string): Promise<Result<PublicCertificate | null>> {
  const { data, error } = await supabase.rpc("course_certificate", { p_serial: serial });
  if (error) return fail(error, "read");
  const r = (data ?? [])[0];
  if (!r) return { ok: true, value: null };
  return {
    ok: true,
    value: {
      serial: r.serial,
      learnerFirstName: r.learner_first_name,
      courseTitle: r.course_title,
      professionalName: r.professional_name,
      completedOn: r.completed_on,
    },
  };
}

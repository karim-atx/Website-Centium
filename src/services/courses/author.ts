import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { describeAuthorError, type AuthorAction, type CourseStatus, type RevisionStatus } from "./authorRules";
import type { LessonKind } from "./rules";
import { preparePdf } from "./pdf";

export * from "./authorRules";

// Courses, the author side (Database 24b7464).
//
// EVERY WRITE IS AN RPC, and there is no alternative: `courses` and its tree
// carry no INSERT, UPDATE or DELETE grant for any client role. The twenty
// builder verbs are the only way in, each one asking the same question —
// course_content_is_editable — at its own grain.
//
// WHICH TREE AM I EDITING. A course in draft or changes_requested is edited
// DIRECTLY: pass no revision id, and the verbs act on the live rows. A
// PUBLISHED course's live tree is editable by nobody, so it is edited through a
// revision — open one, pass its id to the course-level verbs, and act on the
// revision's own module and lesson ids for everything below. The two are not
// interchangeable and the database refuses the wrong one with ATX67, so
// `revisionId` is threaded through this file rather than remembered anywhere.
//
// A LESSON IS NEVER TOLD ITS OWN REVISION. It inherits its module's, because
// two rows disagreeing about which tree they belong to is a state nothing could
// render. That is why only the course-level verbs take p_revision_id at all.

export type Result<T> = { ok: true; value: T } | { ok: false; message: string; code?: string };
export type WriteResult = { ok: true } | { ok: false; message: string; code?: string };

function fail(error: { code?: string; message?: string }, action: AuthorAction) {
  if (isOffline(error)) return { ok: false as const, message: OFFLINE_MESSAGE };
  return { ok: false as const, message: describeAuthorError(error, action), code: error.code };
}

const done = { ok: true as const };

// ---------------------------------------------------------------------------
// The author's own courses
// ---------------------------------------------------------------------------

export interface AuthoredCourse {
  id: string;
  title: string;
  subtitle: string | null;
  categoryKey: string;
  level: string;
  weeklyHours: number | null;
  learnPoints: string[];
  coverColour: string;
  priceCents: number;
  status: CourseStatus;
  submittedAt: string | null;
  publishedAt: string | null;
  /** What the reviewer wrote when they sent it back. Cleared on publication. */
  reviewReason: string | null;
  updatedAt: string;
}

// review_reason and submitted_at are a column grant of their own
// (20261019000000): safe on the table because the row is readable only by its
// author or when published, and publishing clears the reason.
// ONE LITERAL, ON ONE LINE, deliberately. Split across a concatenation it
// widens to `string` and supabase-js loses the row type entirely, which costs
// every field below its checking.
const AUTHORED_COLUMNS =
  "id, title, subtitle, category_key, level, weekly_hours, learn_points, cover_colour, price_cents, status, submitted_at, published_at, review_reason, updated_at";

type AuthoredRow = {
  id: string;
  title: string;
  subtitle: string | null;
  category_key: string;
  level: string;
  weekly_hours: number | null;
  learn_points: string[] | null;
  cover_colour: string;
  price_cents: number;
  status: string;
  submitted_at: string | null;
  published_at: string | null;
  review_reason: string | null;
  updated_at: string;
};

const toAuthored = (r: AuthoredRow): AuthoredCourse => ({
  id: r.id,
  title: r.title,
  subtitle: r.subtitle,
  categoryKey: r.category_key,
  level: r.level,
  weeklyHours: r.weekly_hours === null ? null : Number(r.weekly_hours),
  learnPoints: r.learn_points ?? [],
  coverColour: r.cover_colour,
  priceCents: r.price_cents,
  status: r.status as CourseStatus,
  submittedAt: r.submitted_at,
  publishedAt: r.published_at,
  reviewReason: r.review_reason,
  updatedAt: r.updated_at,
});

/** Every course this professional has written, newest activity first. */
export async function fetchMyCourses(userId: string): Promise<Result<AuthoredCourse[]>> {
  const { data, error } = await supabase
    .from("courses")
    .select(AUTHORED_COLUMNS)
    .eq("author_id", userId)
    .order("updated_at", { ascending: false });
  if (error) return fail(error, "read");
  return { ok: true, value: (data ?? []).map(toAuthored) };
}

export async function fetchMyCourse(courseId: string): Promise<Result<AuthoredCourse | null>> {
  const { data, error } = await supabase.from("courses").select(AUTHORED_COLUMNS).eq("id", courseId).maybeSingle();
  if (error) return fail(error, "read");
  return { ok: true, value: data ? toAuthored(data) : null };
}

export async function createCourse(title: string, categoryKey: string, level: string): Promise<Result<string>> {
  const { data, error } = await supabase.rpc("create_course", {
    p_title: title,
    p_category_key: categoryKey,
    p_level: level,
  });
  if (error) return fail(error, "create");
  return { ok: true, value: data as string };
}

export interface CourseDetailsPatch {
  title?: string;
  subtitle?: string;
  categoryKey?: string;
  level?: string;
  weeklyHours?: number;
  learnPoints?: string[];
  coverColour?: string;
  priceCents?: number;
}

/**
 * NULL MEANS UNCHANGED, every field, which is why this builds its payload from
 * the keys actually present rather than spreading the whole shape. Price is the
 * one to be careful with: 0 is Free and is a real value, so it must survive a
 * falsy check that would drop it.
 */
export async function updateCourseDetails(
  courseId: string,
  patch: CourseDetailsPatch,
  revisionId: string | null
): Promise<WriteResult> {
  const { error } = await supabase.rpc("update_course_details", {
    p_course_id: courseId,
    p_title: patch.title ?? undefined,
    p_subtitle: patch.subtitle ?? undefined,
    p_category_key: patch.categoryKey ?? undefined,
    p_level: patch.level ?? undefined,
    p_weekly_hours: patch.weeklyHours ?? undefined,
    p_learn_points: patch.learnPoints ?? undefined,
    p_cover_colour: patch.coverColour ?? undefined,
    p_price_cents: patch.priceCents ?? undefined,
    p_revision_id: revisionId ?? undefined,
  });
  return error ? fail(error, "save") : done;
}

export async function submitForReview(courseId: string): Promise<WriteResult> {
  const { error } = await supabase.rpc("submit_course_for_review", { p_course_id: courseId });
  return error ? fail(error, "submit") : done;
}

// ---------------------------------------------------------------------------
// Weeks
// ---------------------------------------------------------------------------

export async function addModule(courseId: string, title: string, revisionId: string | null): Promise<Result<string>> {
  const { data, error } = await supabase.rpc("add_course_module", {
    p_course_id: courseId,
    p_title: title,
    p_revision_id: revisionId ?? undefined,
  });
  if (error) return fail(error, "save");
  return { ok: true, value: data as string };
}

export async function renameModule(moduleId: string, title: string): Promise<WriteResult> {
  const { error } = await supabase.rpc("rename_course_module", { p_module_id: moduleId, p_title: title });
  return error ? fail(error, "save") : done;
}

export async function removeModule(moduleId: string): Promise<WriteResult> {
  const { error } = await supabase.rpc("remove_course_module", { p_module_id: moduleId });
  return error ? fail(error, "save") : done;
}

/** The whole new order, every week exactly once — the database checks that. */
export async function reorderModules(
  courseId: string,
  moduleIds: string[],
  revisionId: string | null
): Promise<WriteResult> {
  const { error } = await supabase.rpc("reorder_course_modules", {
    p_course_id: courseId,
    p_module_ids: moduleIds,
    p_revision_id: revisionId ?? undefined,
  });
  return error ? fail(error, "save") : done;
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export async function addVideoLesson(
  moduleId: string,
  title: string,
  url: string,
  minutes: number | null
): Promise<Result<string>> {
  const { data, error } = await supabase.rpc("add_course_video_lesson", {
    p_module_id: moduleId,
    p_title: title,
    p_url: url,
    p_minutes: minutes ?? undefined,
  });
  if (error) return fail(error, "video");
  return { ok: true, value: data as string };
}

export async function addReadingLesson(
  moduleId: string,
  title: string,
  body: string,
  minutes: number | null
): Promise<Result<string>> {
  const { data, error } = await supabase.rpc("add_course_reading_lesson", {
    p_module_id: moduleId,
    p_title: title,
    p_body: body,
    p_minutes: minutes ?? undefined,
  });
  if (error) return fail(error, "save");
  return { ok: true, value: data as string };
}

export async function addQuizLesson(moduleId: string, title: string, passMark: number): Promise<Result<string>> {
  const { data, error } = await supabase.rpc("add_course_quiz_lesson", {
    p_module_id: moduleId,
    p_title: title,
    p_pass_mark: passMark,
  });
  if (error) return fail(error, "save");
  return { ok: true, value: data as string };
}

/**
 * Upload a PDF and attach it as a lesson, in the order the schema requires:
 * strip, claim a path, upload to it, then create the lesson — which is what
 * marks the claim attached.
 *
 * THE STRIPPING HAPPENS BEFORE THE CLAIM, so a file that cannot be cleaned
 * never reaches storage at all. The path is two random uuids because the path
 * IS the key to a private bucket; it is minted by the database, never here.
 */
export async function addPdfLesson(
  courseId: string,
  moduleId: string,
  title: string,
  file: Blob
): Promise<Result<string>> {
  const prepared = await preparePdf(file);
  if (!prepared.ok) return { ok: false, message: prepared.message };

  const { data: path, error: claimError } = await supabase.rpc("new_course_pdf_path", { p_course_id: courseId });
  if (claimError) return fail(claimError, "pdf");

  const { error: uploadError } = await supabase.storage
    .from("course-pdfs")
    .upload(path as string, new Blob([prepared.bytes as BufferSource], { type: "application/pdf" }), {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError) return fail(uploadError, "pdf");

  const { data, error } = await supabase.rpc("add_course_pdf_lesson", {
    p_module_id: moduleId,
    p_title: title,
    p_path: path as string,
  });
  if (error) return fail(error, "pdf");
  return { ok: true, value: data as string };
}

/** Replace a PDF lesson's file. Same order, and the lesson keeps its id. */
export async function replaceLessonPdf(courseId: string, lessonId: string, file: Blob): Promise<WriteResult> {
  const prepared = await preparePdf(file);
  if (!prepared.ok) return { ok: false, message: prepared.message };

  const { data: path, error: claimError } = await supabase.rpc("new_course_pdf_path", { p_course_id: courseId });
  if (claimError) return fail(claimError, "pdf");

  const { error: uploadError } = await supabase.storage
    .from("course-pdfs")
    .upload(path as string, new Blob([prepared.bytes as BufferSource], { type: "application/pdf" }), {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError) return fail(uploadError, "pdf");

  return updateLesson(lessonId, { pdfPath: path as string });
}

export interface LessonPatch {
  title?: string;
  minutes?: number;
  url?: string;
  body?: string;
  pdfPath?: string;
  passMark?: number;
}

/**
 * One update verb, kind-aware. Sending a field that does not belong to the
 * lesson's kind is a refusal, not a silent no-op — so the caller must send only
 * what this kind has.
 */
export async function updateLesson(lessonId: string, patch: LessonPatch): Promise<WriteResult> {
  const { error } = await supabase.rpc("update_course_lesson", {
    p_lesson_id: lessonId,
    p_title: patch.title ?? undefined,
    p_minutes: patch.minutes ?? undefined,
    p_url: patch.url ?? undefined,
    p_body: patch.body ?? undefined,
    p_pdf_path: patch.pdfPath ?? undefined,
    p_pass_mark: patch.passMark ?? undefined,
  });
  return error ? fail(error, patch.url !== undefined ? "video" : "save") : done;
}

export async function removeLesson(lessonId: string): Promise<WriteResult> {
  const { error } = await supabase.rpc("remove_course_lesson", { p_lesson_id: lessonId });
  return error ? fail(error, "save") : done;
}

export async function reorderLessons(moduleId: string, lessonIds: string[]): Promise<WriteResult> {
  const { error } = await supabase.rpc("reorder_course_lessons", {
    p_module_id: moduleId,
    p_lesson_ids: lessonIds,
  });
  return error ? fail(error, "save") : done;
}

// ---------------------------------------------------------------------------
// Quizzes
//
// The answer key is writable by the author and readable by nobody else: the
// two tables carry no client grant at all, and course_quiz() omits is_correct
// for learners. course_quiz_for_author() is how the author reads their own
// back — and it is scoped to AUTHORSHIP rather than editability, so a quiz on a
// published course can still be checked.
// ---------------------------------------------------------------------------

export interface AuthorQuizOption {
  id: string;
  body: string;
  position: number;
  isCorrect: boolean;
}

export interface AuthorQuizQuestion {
  id: string;
  prompt: string;
  position: number;
  options: AuthorQuizOption[];
}

export async function fetchQuizForAuthor(lessonId: string): Promise<Result<AuthorQuizQuestion[]>> {
  const { data, error } = await supabase.rpc("course_quiz_for_author", { p_lesson_id: lessonId });
  if (error) return fail(error, "read");

  // One row per option, left-joined — so a question with no options yet
  // arrives once with every option column null.
  const byQuestion = new Map<string, AuthorQuizQuestion>();
  for (const row of data ?? []) {
    let q = byQuestion.get(row.question_id);
    if (!q) {
      q = { id: row.question_id, prompt: row.prompt, position: row.question_position, options: [] };
      byQuestion.set(row.question_id, q);
    }
    if (row.option_id) {
      q.options.push({
        id: row.option_id,
        body: row.option_body ?? "",
        position: row.option_position ?? 0,
        isCorrect: row.is_correct ?? false,
      });
    }
  }
  return { ok: true, value: [...byQuestion.values()].sort((a, b) => a.position - b.position) };
}

export async function addQuizQuestion(lessonId: string, prompt: string): Promise<Result<string>> {
  const { data, error } = await supabase.rpc("add_course_quiz_question", {
    p_lesson_id: lessonId,
    p_prompt: prompt,
  });
  if (error) return fail(error, "save");
  return { ok: true, value: data as string };
}

export async function updateQuizQuestion(questionId: string, prompt: string): Promise<WriteResult> {
  const { error } = await supabase.rpc("update_course_quiz_question", {
    p_question_id: questionId,
    p_prompt: prompt,
  });
  return error ? fail(error, "save") : done;
}

export async function removeQuizQuestion(questionId: string): Promise<WriteResult> {
  const { error } = await supabase.rpc("remove_course_quiz_question", { p_question_id: questionId });
  return error ? fail(error, "save") : done;
}

/**
 * The WHOLE option set in one statement, because "exactly one is correct" is a
 * property of the set. A per-option verb cannot hold it: there is always a
 * moment between unticking one and ticking another when the question has none
 * or two, and replacing the set means that moment never exists.
 */
export async function setQuizOptions(
  questionId: string,
  options: { body: string; isCorrect: boolean }[]
): Promise<WriteResult> {
  const { error } = await supabase.rpc("set_course_quiz_options", {
    p_question_id: questionId,
    p_options: options.map((o) => ({ body: o.body, is_correct: o.isCorrect })),
  });
  return error ? fail(error, "options") : done;
}

// ---------------------------------------------------------------------------
// Revisions — editing a published course
// ---------------------------------------------------------------------------

export interface CourseRevision {
  id: string;
  status: RevisionStatus;
  /** True once the revision's tree differs from the live one. */
  contentChanged: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  createdAt: string;
  /** Header overrides. Null means "this revision does not change that field". */
  title: string | null;
  subtitle: string | null;
  categoryKey: string | null;
  level: string | null;
  weeklyHours: number | null;
  learnPoints: string[] | null;
  coverColour: string | null;
  priceCents: number | null;
}

/**
 * The open revision, or the most recent closed one if none is open.
 *
 * THE ONLY WAY TO READ ONE — course_revisions has no client grant. At most one
 * row comes back, and its header fields are null unless the revision changes
 * them, so they are overrides on top of the live course rather than its values.
 */
export async function fetchMyRevision(courseId: string): Promise<Result<CourseRevision | null>> {
  const { data, error } = await supabase.rpc("my_course_revision", { p_course_id: courseId });
  if (error) return fail(error, "read");
  const r = (data ?? [])[0];
  if (!r) return { ok: true, value: null };
  return {
    ok: true,
    value: {
      id: r.revision_id,
      status: r.status as RevisionStatus,
      contentChanged: r.content_changed,
      submittedAt: r.submitted_at,
      reviewedAt: r.reviewed_at,
      reviewReason: r.review_reason,
      createdAt: r.created_at,
      title: r.title,
      subtitle: r.subtitle,
      categoryKey: r.category_key,
      level: r.level,
      weeklyHours: r.weekly_hours === null ? null : Number(r.weekly_hours),
      learnPoints: r.learn_points,
      coverColour: r.cover_colour,
      priceCents: r.price_cents,
    },
  };
}

/** Copies the whole tree. Only a PUBLISHED course needs one. */
export async function openRevision(courseId: string): Promise<Result<string>> {
  const { data, error } = await supabase.rpc("open_course_revision", { p_course_id: courseId });
  if (error) return fail(error, "revision");
  return { ok: true, value: data as string };
}

export async function submitRevision(revisionId: string): Promise<WriteResult> {
  const { error } = await supabase.rpc("submit_course_revision", { p_revision_id: revisionId });
  return error ? fail(error, "submit") : done;
}

/** Abandons it and deletes the copied tree. The live course is never touched. */
export async function withdrawRevision(revisionId: string): Promise<WriteResult> {
  const { error } = await supabase.rpc("withdraw_course_revision", { p_revision_id: revisionId });
  return error ? fail(error, "revision") : done;
}

// ---------------------------------------------------------------------------
// The tree being edited, and what it earns
// ---------------------------------------------------------------------------

export interface BuilderLesson {
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

export interface BuilderModule {
  id: string;
  title: string;
  position: number;
}

/**
 * The weeks and lessons of ONE tree: the live one (revisionId null) or a
 * revision's. The filter is exact rather than "whatever belongs to the course",
 * because while a revision is open BOTH trees exist against the same course id
 * and showing them together is a screen nobody could read.
 */
export async function fetchBuilderTree(
  courseId: string,
  revisionId: string | null
): Promise<Result<{ modules: BuilderModule[]; lessons: BuilderLesson[] }>> {
  const moduleQuery = supabase
    .from("course_modules")
    .select("id, title, position")
    .eq("course_id", courseId)
    .order("position");
  const { data: modules, error: moduleError } = await (revisionId
    ? moduleQuery.eq("revision_id", revisionId)
    : moduleQuery.is("revision_id", null));
  if (moduleError) return fail(moduleError, "read");

  const ids = (modules ?? []).map((m) => m.id);
  if (ids.length === 0) return { ok: true, value: { modules: [], lessons: [] } };

  // pdf_path IS NOT IN THE SELECT, AND NOT BY OVERSIGHT. It is outside the
  // client column grant on course_lessons, because the path is the key to a
  // private bucket and anyone who could read it could mint a signed URL for a
  // course they never bought. Asking for it fails the whole read — which is
  // how this was found. The builder does not need it: a lesson is a PDF
  // because its kind says so, and course_lessons_shape_check guarantees a PDF
  // lesson has a file.
  const { data: lessons, error: lessonError } = await supabase
    .from("course_lessons")
    .select("id, module_id, kind, title, position, minutes, video_id, body, pass_mark")
    .in("module_id", ids)
    .order("position");
  if (lessonError) return fail(lessonError, "read");

  return {
    ok: true,
    value: {
      modules: (modules ?? []).map((m) => ({ id: m.id, title: m.title, position: m.position })),
      lessons: (lessons ?? []).map((l) => ({
        id: l.id,
        moduleId: l.module_id,
        kind: l.kind as LessonKind,
        title: l.title,
        position: l.position,
        minutes: l.minutes,
        videoId: l.video_id,
        body: l.body,
        passMark: l.pass_mark,
      })),
    },
  };
}

export interface NetEarnings {
  sales: number;
  grossCents: number;
  commissionCents: number;
  netCents: number;
}

/**
 * What this course has actually earned, net of the rate that applied to each
 * sale — not the current rate applied retrospectively.
 */
export async function fetchNetEarnings(courseId: string): Promise<Result<NetEarnings>> {
  const { data, error } = await supabase.rpc("course_net_earnings", { p_course_id: courseId });
  if (error) return fail(error, "read");
  const r = (data ?? [])[0];
  return {
    ok: true,
    value: {
      sales: Number(r?.sales ?? 0),
      grossCents: Number(r?.gross_cents ?? 0),
      commissionCents: Number(r?.commission_cents ?? 0),
      netCents: Number(r?.net_cents ?? 0),
    },
  };
}

/** The platform's current commission, for the price editor's estimate. */
export async function fetchCommissionPercent(): Promise<number | null> {
  const { data, error } = await supabase.rpc("course_commission_percent");
  if (error || data === null) return null;
  return Number(data);
}

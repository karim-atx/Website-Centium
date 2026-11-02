import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { stripPrivateExif } from "../storage/exif";
import { stageAndSubmit, withdrawPending } from "../moderation/images";
import { describeAuthorError, parseAudience, type AuthorAction, type CourseAudience } from "./authorRules";
import { describeCourseError } from "./rules";
import { t } from "../../i18n/core";

// Round D · the course gaps (Database 20261223030000, images 20261223050000):
// cover, description and focus, audience, Image and Check-in lessons, author
// stats. None of these calls or columns are in database.types.ts yet, so they
// go through a local untyped Rpc and `from(... as never)`, as other services do.
//
// IMAGES WAIT FOR APPROVAL. A cover is staged in image-staging and submitted
// as `course_cover` (the course id); once approved the Database copies it into
// the PUBLIC bucket course-covers and writes courses.cover_path. An Image
// lesson's image is submitted as `course_image` (the lesson id) and lands in
// the PRIVATE bucket course-images (course_lessons.image_path), read with a
// signed URL by whoever can read the lesson. No caller writes either column.

type RpcError = { code?: string; message: string };
type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: RpcError | null }> };
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase as unknown as Rpc).rpc(fn, args);
const from = (table: string) => supabase.from(table as never);

export type Result<T> = { ok: true; value: T } | { ok: false; message: string; code?: string };
export type WriteResult = { ok: true } | { ok: false; message: string; code?: string };

const authorFail = (error: RpcError, action: AuthorAction) =>
  isOffline(error) ? { ok: false as const, message: OFFLINE_MESSAGE } : { ok: false as const, message: describeAuthorError(error, action), code: error.code };
const readFail = (error: unknown) => ({ ok: false as const, message: isOffline(error) ? OFFLINE_MESSAGE : t("Couldn't load this. Try again.") });

const COVERS = "course-covers";
const IMAGES = "course-images";
const SIGN_SECONDS = 10 * 60;

// ---------------------------------------------------------------------------
// The course's own new columns
// ---------------------------------------------------------------------------

export interface CourseExtras {
  coverPath: string | null;
  description: string | null;
  focus: string | null;
  audience: CourseAudience;
  unpublishedAt: string | null;
}

type ExtrasRow = { id: string; cover_path: string | null; description: string | null; focus: string | null; audience: string | null; unpublished_at: string | null };
const toExtras = (r: ExtrasRow): CourseExtras => ({
  coverPath: r.cover_path || null,
  description: r.description || null,
  focus: r.focus || null,
  audience: parseAudience(r.audience),
  unpublishedAt: r.unpublished_at,
});

/** The Round D columns of many readable courses at once, by id. */
export async function fetchCourseExtras(ids: string[]): Promise<Map<string, CourseExtras>> {
  const out = new Map<string, CourseExtras>();
  if (ids.length === 0) return out;
  try {
    const { data, error } = await from("courses").select("id, cover_path, description, focus, audience, unpublished_at").in("id", ids);
    if (error) {
      console.warn("[courses] Could not read the course extras:", error.message);
      return out;
    }
    for (const r of (data ?? []) as unknown as ExtrasRow[]) out.set(r.id, toExtras(r));
  } catch (e) {
    console.warn("[courses] Could not read the course extras:", e);
  }
  return out;
}

/** The public URL of an approved cover, or null. */
export function coverUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(COVERS).getPublicUrl(path).data.publicUrl || null;
}

/**
 * The description and focus: on a draft straight onto the course, on a
 * published course into its open revision (revisionId). null leaves a field
 * as it is; "" clears it. Both are checked against the word lists (ATX60).
 */
export async function setCourseDescription(courseId: string, description: string | null, focus: string | null, revisionId: string | null): Promise<WriteResult> {
  const { error } = await rpc("set_course_description", {
    p_course_id: courseId,
    p_description: description,
    p_focus: focus,
    p_revision_id: revisionId,
  });
  return error ? authorFail(error, "description") : { ok: true };
}

/** What an open revision proposes: null = unchanged, "" = cleared. */
export async function fetchRevisionDescription(revisionId: string): Promise<{ description: string | null; focus: string | null }> {
  const { data, error } = await rpc("course_revision_description", { p_revision_id: revisionId });
  const r = (Array.isArray(data) ? data[0] : data) as { description: string | null; focus: string | null } | undefined;
  if (error || !r) return { description: null, focus: null };
  return { description: r.description, focus: r.focus };
}

/** Who can join, at once and without review. Selected: 1–500 of the author's active clients (ATX12). Returns the selected count. */
export async function setCourseAudience(courseId: string, audience: CourseAudience, memberIds: string[]): Promise<Result<number>> {
  const { data, error } = await rpc("set_course_audience", {
    p_course_id: courseId,
    p_audience: audience,
    p_member_ids: audience === "selected" ? memberIds : null,
  });
  if (error) return authorFail(error, "audience");
  return { ok: true, value: Number(data ?? 0) };
}

/** The selected members of the author's course (course_audience_members, author-only). */
export async function fetchAudienceMembers(courseId: string): Promise<Result<string[]>> {
  try {
    const { data, error } = await from("course_audience_members").select("member_id").eq("course_id", courseId);
    if (error) return readFail(error);
    return { ok: true, value: ((data ?? []) as unknown as { member_id: string }[]).map((r) => r.member_id) };
  } catch (e) {
    return readFail(e);
  }
}

// ---------------------------------------------------------------------------
// Images: the cover and an Image lesson's image
// ---------------------------------------------------------------------------

const MAX_BYTES = 5 * 1024 * 1024;
const MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_ACCEPT = [...MIME_TYPES, ".jpg", ".jpeg", ".png", ".webp"].join(",");

export function validateCourseImage(file: Pick<File, "type" | "size">): string | null {
  if (!MIME_TYPES.includes(file.type)) return t("Choose a JPEG, PNG or WebP image.");
  if (file.size > MAX_BYTES) return t("That image is too large. Pick one under 5 MB.");
  return null;
}

/** At most `edge` px on the long edge, re-encoded as JPEG. Never throws: a decode failure keeps the original. */
async function downscale(file: File, edge: number): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.type === "image/jpeg") {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], "image.jpg", { type: "image/jpeg" }) : file;
  } catch (e) {
    console.warn("[courses] Could not resize the image, uploading as picked:", e);
    return file;
  }
}

async function sendImage(uid: string, surface: "course_cover" | "course_image", recordId: string, file: File): Promise<WriteResult> {
  const invalid = validateCourseImage(file);
  if (invalid) return { ok: false, message: invalid };
  try {
    const prepared = await stripPrivateExif(await downscale(file, 1600));
    const r = await stageAndSubmit(uid, surface, recordId, prepared);
    return r.ok ? { ok: true } : { ok: false, message: r.message, code: r.code };
  } catch (e) {
    console.error("[courses] Could not send the image:", e);
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : t("That image couldn't be uploaded. Check your connection and try again.") };
  }
}

/** A new cover, for approval. The approved cover (or the colour) stays until it's approved. */
export const submitCourseCover = (uid: string, courseId: string, file: File) => sendImage(uid, "course_cover", courseId, file);
/** An Image lesson's image, for approval. */
export const submitLessonImage = (uid: string, lessonId: string, file: File) => sendImage(uid, "course_image", lessonId, file);
/** Takes back a cover or lesson image still waiting for approval. */
export const withdrawCourseImage = (surface: "course_cover" | "course_image", recordId: string) => withdrawPending(surface, recordId);

/**
 * Removes the approved cover at once, in any status (Database
 * 20261223060000, remove_course_cover). The colour shows again; a new cover
 * goes for approval like the first one. ATX08: not the author's course.
 */
export async function removeCourseCover(courseId: string): Promise<WriteResult> {
  const { error } = await rpc("remove_course_cover", { p_course_id: courseId });
  return error ? authorFail(error, "save") : { ok: true };
}

/** course_lessons.image_path of some lessons, by id (only approved images have one). */
export async function fetchLessonImagePaths(lessonIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (lessonIds.length === 0) return out;
  try {
    const { data, error } = await from("course_lessons").select("id, image_path").in("id", lessonIds);
    if (error) return out;
    for (const r of (data ?? []) as unknown as { id: string; image_path: string | null }[]) if (r.image_path) out.set(r.id, r.image_path);
  } catch {
    /* no image is shown */
  }
  return out;
}

/** A short-lived link to an Image lesson's image (private bucket), or null. */
export async function lessonImageUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  try {
    const { data, error } = await supabase.storage.from(IMAGES).createSignedUrl(path, SIGN_SECONDS);
    return error || !data?.signedUrl ? null : data.signedUrl;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The two new lesson kinds
// ---------------------------------------------------------------------------

export async function addImageLesson(moduleId: string, title: string, caption: string, minutes: number | null): Promise<Result<string>> {
  const { data, error } = await rpc("add_course_image_lesson", {
    p_module_id: moduleId,
    p_title: title,
    p_caption: caption.trim() ? caption : null,
    p_minutes: minutes,
  });
  if (error) return authorFail(error, "save");
  return { ok: true, value: String(data) };
}

export async function addCheckInLesson(moduleId: string, title: string, prompt: string, minutes: number | null): Promise<Result<string>> {
  const { data, error } = await rpc("add_course_check_in_lesson", {
    p_module_id: moduleId,
    p_title: title,
    p_prompt: prompt,
    p_minutes: minutes,
  });
  if (error) return authorFail(error, "check_in");
  return { ok: true, value: String(data) };
}

export interface CheckInAnswer {
  id: string;
  firstName: string;
  answer: string;
  updatedAt: string;
}

/** Every answer to the author's own Check-in lesson, newest first, with first names. The author only. */
export async function fetchCheckInAnswers(lessonId: string): Promise<Result<CheckInAnswer[]>> {
  const { data, error } = await rpc("course_check_in_answers_for_author", { p_lesson_id: lessonId });
  if (error) return authorFail(error, "check_in");
  return {
    ok: true,
    value: ((data ?? []) as { answer_id: string; learner_first_name: string | null; answer: string; updated_at: string }[]).map((r) => ({
      id: r.answer_id,
      firstName: r.learner_first_name?.trim() || t("A learner"),
      answer: r.answer,
      updatedAt: r.updated_at,
    })),
  };
}

/** The learner's answer (1–4,000 characters); answering again replaces it, and the lesson is completed. */
export async function submitCheckIn(lessonId: string, answer: string): Promise<WriteResult> {
  const { error } = await rpc("submit_course_check_in", { p_lesson_id: lessonId, p_answer: answer });
  if (!error) return { ok: true };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  return { ok: false, message: describeCourseError(error, "check_in") ?? t("Couldn't send your answer. Try again."), code: error.code };
}

/** The learner's own answer, or null. */
export async function fetchMyCheckIn(lessonId: string): Promise<{ answer: string; updatedAt: string } | null> {
  const { data, error } = await rpc("my_course_check_in", { p_lesson_id: lessonId });
  const r = (Array.isArray(data) ? data[0] : data) as { answer: string; updated_at: string } | undefined;
  return error || !r ? null : { answer: r.answer, updatedAt: r.updated_at };
}

// ---------------------------------------------------------------------------
// Author stats (counts only, never a learner's name)
// ---------------------------------------------------------------------------

export interface AuthorStats {
  enrolled: number;
  finished: number;
  /** Null with nobody enrolled. */
  completionPct: number | null;
  byMonth: { month: string; enrolled: number }[];
  dropOff: { lessonId: string; title: string; modulePosition: number; lessonPosition: number; learners: number }[];
}

export async function fetchAuthorStats(courseId: string): Promise<Result<AuthorStats>> {
  const { data, error } = await rpc("course_author_stats", { p_course_id: courseId });
  if (error) return isOffline(error) ? { ok: false, message: OFFLINE_MESSAGE } : { ok: false, message: t("Couldn't load the numbers. Try again.") };
  const r = (Array.isArray(data) ? data[0] : data) as
    | { enrolled: number; finished: number; completion_pct: number | null; by_month: unknown; drop_off: unknown }
    | undefined;
  const months = Array.isArray(r?.by_month) ? (r!.by_month as { month: string; enrolled: number }[]) : [];
  const drops = Array.isArray(r?.drop_off) ? (r!.drop_off as { lesson_id: string; title: string; module_position: number; lesson_position: number; learners: number }[]) : [];
  return {
    ok: true,
    value: {
      enrolled: Number(r?.enrolled ?? 0),
      finished: Number(r?.finished ?? 0),
      completionPct: r?.completion_pct == null ? null : Number(r.completion_pct),
      byMonth: months.map((m) => ({ month: String(m.month), enrolled: Number(m.enrolled ?? 0) })),
      dropOff: drops.map((d) => ({
        lessonId: d.lesson_id,
        title: d.title,
        modulePosition: Number(d.module_position),
        lessonPosition: Number(d.lesson_position),
        learners: Number(d.learners ?? 0),
      })),
    },
  };
}

export interface AuthorSummary {
  enrolled: number;
  finished: number;
  completionPct: number | null;
  unpublishedAt: string | null;
}

/** "{n}% complete" and unpublished_at for each of the caller's courses. Empty on failure (the cards just leave the line out). */
export async function fetchAuthorSummaries(): Promise<Map<string, AuthorSummary>> {
  const out = new Map<string, AuthorSummary>();
  const { data, error } = await rpc("course_author_summaries");
  if (error) return out;
  for (const r of (data ?? []) as { course_id: string; enrolled: number; finished: number; completion_pct: number | null; unpublished_at: string | null }[]) {
    out.set(r.course_id, {
      enrolled: Number(r.enrolled ?? 0),
      finished: Number(r.finished ?? 0),
      completionPct: r.completion_pct == null ? null : Number(r.completion_pct),
      unpublishedAt: r.unpublished_at,
    });
  }
  return out;
}

/** Which of the author's active clients are enrolled ("Already enrolled" in Share). */
export async function fetchEnrolledClients(courseId: string): Promise<Set<string>> {
  const { data, error } = await rpc("course_enrolled_clients", { p_course_id: courseId });
  if (error) return new Set();
  return new Set(((data ?? []) as { client_id: string }[]).map((r) => r.client_id));
}

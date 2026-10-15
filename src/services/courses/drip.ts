import { supabase } from "../../../lib/supabase/client";
import type { DripRow } from "../../components/courses/drip";

// Release 3 · DB-6 / CU25: a course that opens a week at a time, the
// learner's reads. Newer than the generated types, so the client is cast.
//
// - course_drip_schedule(p_course_id): every module's opening day for the
//   caller (null = open from the start).
// - course_lesson_is_open(p_lesson_id): whether a lesson is open to the
//   caller. A lesson that isn't is also hidden by course_lessons' RLS, so this
//   is how a locked lesson's page tells "not open yet" from "not available".
//
// A failed read is "no drip": the course looks exactly as it did before.

const db = supabase as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export async function fetchDripSchedule(courseId: string): Promise<DripRow[]> {
  const { data, error } = await db.rpc("course_drip_schedule", { p_course_id: courseId });
  if (error) {
    console.error("[courses] Could not load the drip schedule:", error.message);
    return [];
  }
  return ((data ?? []) as { module_id: string; module_position: number; opens_at: string | null; is_open: boolean }[]).map((r) => ({
    moduleId: r.module_id,
    position: r.module_position,
    opensAt: r.opens_at,
    isOpen: r.is_open,
  }));
}

/** False only when the lesson exists and isn't open to the caller yet. */
export async function fetchLessonIsOpen(lessonId: string): Promise<boolean> {
  const { data, error } = await db.rpc("course_lesson_is_open", { p_lesson_id: lessonId });
  return error ? true : data !== false;
}

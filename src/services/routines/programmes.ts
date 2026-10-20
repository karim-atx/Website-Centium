import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { ProgrammeAssignment } from "./programmeLogic";

// Release 3 · W7 (CU1): what the client's "From your coach" section reads.
//
// * workout_template_assignments: the client's own rows (policy
//   workout_template_assignments_select_client). FILTERED ON client_id
//   anyway, because a professional who is also somebody's client would
//   otherwise get the assignments of their own templates too (the
//   _select_professional policy).
// * workout_templates: name and duration_weeks of the templates assigned to
//   the client (policy workout_templates_select_assigned_client,
//   20261124180000). The assignment's template is not null and cascades, so
//   every assignment's template is readable.
// * calendar_events: the programme's sessions on the client's calendar
//   (source_template_assignment_id), for TODAY and "Week 3, day 2".

export interface ProgrammeData {
  assignments: ProgrammeAssignment[];
  /** Session days per assignment id (yyyy-mm-dd, ascending). */
  sessions: Record<string, string[]>;
}

export type ProgrammeRead = { ok: true; data: ProgrammeData } | { ok: false; message: string };

interface AssignmentRow {
  id: string;
  workout_template_id: string;
  routine_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  join_week: number | null;
  ended_at: string | null;
  assigned_at: string;
  created_at: string;
}

export async function fetchProgrammes(userId: string): Promise<ProgrammeRead> {
  const { data, error } = await supabase
    .from("workout_template_assignments")
    .select("id, workout_template_id, routine_id, starts_on, ends_on, join_week, ended_at, assigned_at, created_at")
    .eq("client_id", userId)
    .order("assigned_at", { ascending: true });
  if (error) {
    console.error("[programmes] Could not read assignments:", error.message);
    return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't load your coach's programmes." };
  }
  const rows = (data ?? []) as AssignmentRow[];
  if (rows.length === 0) return { ok: true, data: { assignments: [], sessions: {} } };

  const { data: templates, error: templatesError } = await supabase
    .from("workout_templates")
    .select("id, name, duration_weeks")
    .in("id", [...new Set(rows.map((r) => r.workout_template_id))]);
  if (templatesError) {
    console.error("[programmes] Could not read the programmes' templates:", templatesError.message);
    return { ok: false, message: isOffline(templatesError) ? OFFLINE_MESSAGE : "Couldn't load your coach's programmes." };
  }
  const templateById = new Map(((templates ?? []) as { id: string; name: string; duration_weeks: number | null }[]).map((t) => [t.id, t]));

  const assignments: ProgrammeAssignment[] = rows.flatMap((r) => {
    const t = templateById.get(r.workout_template_id);
    // Readable for every assignment of this client (see above); a row that
    // isn't is left out rather than shown under a made-up name.
    if (!t) return [];
    return [
      {
        id: r.id,
        routineId: r.routine_id,
        startsOn: r.starts_on,
        endsOn: r.ends_on,
        joinWeek: r.join_week ?? 1,
        endedAt: r.ended_at,
        assignedAt: r.assigned_at,
        createdAt: r.created_at,
        templateName: t.name,
        durationWeeks: t.duration_weeks,
      },
    ];
  });
  if (assignments.length === 0) return { ok: true, data: { assignments, sessions: {} } };

  const { data: events, error: eventsError } = await supabase
    .from("calendar_events")
    .select("event_date, source_template_assignment_id")
    .eq("owner_id", userId)
    .in(
      "source_template_assignment_id",
      assignments.map((a) => a.id)
    )
    .order("event_date", { ascending: true });
  if (eventsError) {
    console.error("[programmes] Could not read programme sessions:", eventsError.message);
    return { ok: false, message: isOffline(eventsError) ? OFFLINE_MESSAGE : "Couldn't load your coach's programmes." };
  }
  const sessions: Record<string, string[]> = {};
  for (const e of (events ?? []) as { event_date: string | null; source_template_assignment_id: string | null }[]) {
    const id = e.source_template_assignment_id;
    if (id && e.event_date) (sessions[id] ??= []).push(e.event_date.slice(0, 10));
  }
  return { ok: true, data: { assignments, sessions } };
}

/**
 * The professionals this client shares a category with (client_access_grants,
 * the client's own rows). Used to say "{coach} sees the swap" / "sees your
 * streaks" only when it is true. Fails to an empty set: the line is then left
 * out rather than claimed.
 */
export async function sharedWith(userId: string, category: "workout_activity" | "habits"): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("client_access_grants")
    .select("professional_id")
    .eq("client_id", userId)
    .eq("category", category)
    .eq("granted", true);
  if (error) {
    console.error("[programmes] Could not read sharing:", error.message);
    return new Set();
  }
  return new Set(((data ?? []) as { professional_id: string }[]).map((r) => r.professional_id));
}

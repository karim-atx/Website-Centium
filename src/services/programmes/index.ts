// Round D · week-by-day programmes (Database HANDOVER_API.md "Round D · PR 2",
// "Week-by-day programmes", migration 20261223020000).
//
// The four tables (programmes, programme_sessions, programme_assignments,
// programme_assignment_routines) are readable through their policies (the
// professional; the assigned client) and written ONLY through the calls
// below. None of it is in the generated types (gen:types is never run), so
// the client is cast at this boundary, as services/hires does.
//
// Professional: create_programme, update_programme, delete_programme (ends
// every active assignment first), set_programme_day (REPLACES that day; []
// clears it; own workouts only, ATX09), copy_programme_week (the target week
// is REPLACED), assign_programme_to_client (an active client, ATX12),
// end_programme_assignment. Both: programme_schedule, programme_progress
// (`done` is null for a professional without workout_activity consent).
// Client: my_programmes().

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { programmeErrorMessage, type ProgrammeSlot, type ProgressRow, type ScheduleRow } from "./model";
import { playlistSaveError } from "../music/playlistLink";

type PgError = { code?: string; message: string } | null;
type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: PgError }> };
type Query = PromiseLike<{ data: unknown; error: PgError }> & {
  select: (columns: string) => Query;
  eq: (column: string, value: unknown) => Query;
  in: (column: string, values: unknown[]) => Query;
  order: (column: string, options?: { ascending?: boolean }) => Query;
};
type Db = Rpc & { from: (table: string) => Query };
const db = (): Db => supabase as unknown as Db;

export type Read<T> = { ok: true; data: T } | { ok: false; offline: boolean };
export type Done<T = undefined> = { ok: true; data: T } | { ok: false; message: string };

const readFail = (error: unknown): { ok: false; offline: boolean } => ({ ok: false, offline: isOffline(error) });
const writeFail = (error: PgError, fallback: string): { ok: false; message: string } => ({
  ok: false,
  message: isOffline(error) ? OFFLINE_MESSAGE : programmeErrorMessage(error, fallback),
});

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface Programme {
  id: string;
  name: string;
  description: string | null;
  coachNote: string | null;
  durationWeeks: number;
  updatedAt: string;
  /** Round E: programmes.playlist_url, set through set_programme_playlist. */
  playlistUrl: string | null;
}

export interface ProgrammeAssignmentRow {
  id: string;
  programmeId: string;
  clientId: string;
  startsOn: string;
  joinWeek: number;
  endsOn: string;
  endedAt: string | null;
  assignedAt: string;
}

export interface MyProgramme {
  assignmentId: string;
  programmeId: string;
  name: string;
  description: string | null;
  coachNote: string | null;
  durationWeeks: number;
  joinWeek: number;
  startsOn: string;
  endsOn: string;
  /** null when today is outside the programme's dates. */
  currentWeek: number | null;
  currentDay: number | null;
  professionalId: string;
  professionalFirstName: string | null;
  /** Round E: the programme's playlist (my_programmes, Database 20261224050000), or null. */
  playlistUrl: string | null;
}

type ProgrammeDbRow = {
  id: string;
  name: string;
  description: string | null;
  coach_note: string | null;
  duration_weeks: number;
  updated_at: string;
  playlist_url?: string | null;
};
const toProgramme = (r: ProgrammeDbRow): Programme => ({
  id: r.id,
  name: r.name,
  description: r.description,
  coachNote: r.coach_note,
  durationWeeks: r.duration_weeks,
  updatedAt: r.updated_at,
  playlistUrl: r.playlist_url ?? null,
});

type AssignmentDbRow = {
  id: string;
  programme_id: string;
  client_id: string;
  starts_on: string;
  join_week: number;
  ends_on: string;
  ended_at: string | null;
  assigned_at: string;
};
const toAssignment = (r: AssignmentDbRow): ProgrammeAssignmentRow => ({
  id: r.id,
  programmeId: r.programme_id,
  clientId: r.client_id,
  startsOn: r.starts_on,
  joinWeek: r.join_week,
  endsOn: r.ends_on,
  endedAt: r.ended_at,
  assignedAt: r.assigned_at,
});

const ASSIGNMENT_COLUMNS = "id, programme_id, client_id, starts_on, join_week, ends_on, ended_at, assigned_at";

// ---------------------------------------------------------------------------
// Professional reads
// ---------------------------------------------------------------------------

/** The professional's own programmes, most recently changed first. */
export async function fetchOwnProgrammes(me: string): Promise<Read<Programme[]>> {
  const { data, error } = await db()
    .from("programmes")
    .select("id, name, description, coach_note, duration_weeks, updated_at, playlist_url")
    .eq("professional_id", me)
    .order("updated_at", { ascending: false });
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as ProgrammeDbRow[]).map(toProgramme) };
}

/** The sessions of these programmes (week, day, position, workout). */
export async function fetchProgrammeSlots(programmeIds: string[]): Promise<Read<Record<string, ProgrammeSlot[]>>> {
  if (programmeIds.length === 0) return { ok: true, data: {} };
  const { data, error } = await db()
    .from("programme_sessions")
    .select("programme_id, week, day, position, workout_template_id")
    .in("programme_id", programmeIds);
  if (error) return readFail(error);
  const out: Record<string, ProgrammeSlot[]> = {};
  for (const r of (data ?? []) as { programme_id: string; week: number; day: number; position: number; workout_template_id: string }[]) {
    (out[r.programme_id] ??= []).push({ week: r.week, day: r.day, position: r.position, workoutTemplateId: r.workout_template_id });
  }
  return { ok: true, data: out };
}

/** The professional's assignments (every client, or one), newest first. Ended ones included. */
export async function fetchProgrammeAssignments(me: string, clientId?: string): Promise<Read<ProgrammeAssignmentRow[]>> {
  let q = db().from("programme_assignments").select(ASSIGNMENT_COLUMNS).eq("professional_id", me);
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q.order("assigned_at", { ascending: false });
  if (error) return readFail(error);
  return { ok: true, data: ((data ?? []) as AssignmentDbRow[]).map(toAssignment) };
}

// ---------------------------------------------------------------------------
// Professional writes
// ---------------------------------------------------------------------------

export interface ProgrammeFields {
  name: string;
  durationWeeks: number;
  description: string;
  coachNote: string;
}

const fieldArgs = (f: ProgrammeFields) => ({
  p_name: f.name.trim(),
  p_duration_weeks: f.durationWeeks,
  p_description: f.description.trim() || null,
  p_coach_note: f.coachNote.trim() || null,
});

export async function createProgramme(f: ProgrammeFields): Promise<Done<string>> {
  const { data, error } = await db().rpc("create_programme", fieldArgs(f));
  if (error) return writeFail(error, "Couldn't create the programme. Try again.");
  return { ok: true, data: data as string };
}

export async function updateProgramme(id: string, f: ProgrammeFields): Promise<Done> {
  const { error } = await db().rpc("update_programme", { p_programme_id: id, ...fieldArgs(f) });
  if (error) return writeFail(error, "Couldn't save the programme. Try again.");
  return { ok: true, data: undefined };
}

/**
 * Round E: sets or clears (empty) a programme's playlist. Programmes take no
 * direct writes; set_programme_playlist checks the link (ATXN0 / ATXN1 / ATXN2)
 * and that the programme is the caller's (ATX08).
 */
export async function setProgrammePlaylist(id: string, url: string | null): Promise<Done> {
  const { error } = await db().rpc("set_programme_playlist", { p_programme_id: id, p_playlist_url: url || null });
  if (error) {
    const playlist = playlistSaveError(error.code);
    return playlist ? { ok: false, message: playlist } : writeFail(error, "Couldn't save the playlist. Try again.");
  }
  return { ok: true, data: undefined };
}

export async function deleteProgramme(id: string): Promise<Done> {
  const { error } = await db().rpc("delete_programme", { p_programme_id: id });
  if (error) return writeFail(error, "Couldn't delete the programme. Try again.");
  return { ok: true, data: undefined };
}

/** Replaces one day with these workouts, in order; [] clears it. */
export async function setProgrammeDay(id: string, week: number, day: number, workoutTemplateIds: string[]): Promise<Done> {
  const { error } = await db().rpc("set_programme_day", {
    p_programme_id: id,
    p_week: week,
    p_day: day,
    p_workout_template_ids: workoutTemplateIds,
  });
  if (error) return writeFail(error, "Couldn't save that day. Try again.");
  return { ok: true, data: undefined };
}

/** Replaces week `to` with a copy of week `from`; returns the sessions copied. */
export async function copyProgrammeWeek(id: string, from: number, to: number): Promise<Done<number>> {
  const { data, error } = await db().rpc("copy_programme_week", { p_programme_id: id, p_from_week: from, p_to_week: to });
  if (error) return writeFail(error, "Couldn't copy the week. Try again.");
  return { ok: true, data: (data as number) ?? 0 };
}

export async function assignProgramme(id: string, clientId: string, startsOn: string, joinWeek: number): Promise<Done<string>> {
  const { data, error } = await db().rpc("assign_programme_to_client", {
    p_programme_id: id,
    p_client_id: clientId,
    p_starts_on: startsOn,
    p_join_week: joinWeek,
  });
  if (error) return writeFail(error, "Couldn't assign the programme. Try again.");
  return { ok: true, data: data as string };
}

export async function endProgrammeAssignment(assignmentId: string): Promise<Done> {
  const { error } = await db().rpc("end_programme_assignment", { p_assignment_id: assignmentId });
  if (error) return writeFail(error, "Couldn't end the programme. Try again.");
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Both sides
// ---------------------------------------------------------------------------

export async function fetchProgrammeSchedule(assignmentId: string): Promise<Read<ScheduleRow[]>> {
  const { data, error } = await db().rpc("programme_schedule", { p_assignment_id: assignmentId });
  if (error) return readFail(error);
  return {
    ok: true,
    data: (
      (data ?? []) as {
        week: number;
        day: number;
        on_date: string;
        position: number;
        workout_template_id: string;
        workout_name: string;
        routine_id: string | null;
        done: boolean | null;
      }[]
    ).map((r) => ({
      week: r.week,
      day: r.day,
      onDate: r.on_date,
      position: r.position,
      workoutTemplateId: r.workout_template_id,
      workoutName: r.workout_name,
      routineId: r.routine_id,
      done: r.done,
    })),
  };
}

export async function fetchProgrammeProgress(assignmentId: string): Promise<Read<ProgressRow[]>> {
  const { data, error } = await db().rpc("programme_progress", { p_assignment_id: assignmentId });
  if (error) return readFail(error);
  return {
    ok: true,
    data: (
      (data ?? []) as {
        week: number;
        week_starts_on: string;
        workout_template_id: string;
        workout_name: string;
        planned: number;
        done: number | null;
      }[]
    ).map((r) => ({
      week: r.week,
      weekStartsOn: r.week_starts_on,
      workoutTemplateId: r.workout_template_id,
      workoutName: r.workout_name,
      planned: r.planned,
      done: r.done,
    })),
  };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export async function fetchMyProgrammes(): Promise<Read<MyProgramme[]>> {
  const { data, error } = await db().rpc("my_programmes");
  if (error) return readFail(error);
  return {
    ok: true,
    data: (
      (data ?? []) as {
        assignment_id: string;
        programme_id: string;
        name: string;
        description: string | null;
        coach_note: string | null;
        duration_weeks: number;
        join_week: number;
        starts_on: string;
        ends_on: string;
        current_week: number | null;
        current_day: number | null;
        professional_id: string;
        professional_first_name: string | null;
        playlist_url?: string | null;
      }[]
    ).map((r) => ({
      assignmentId: r.assignment_id,
      programmeId: r.programme_id,
      name: r.name,
      description: r.description,
      coachNote: r.coach_note,
      durationWeeks: r.duration_weeks,
      joinWeek: r.join_week,
      startsOn: r.starts_on,
      endsOn: r.ends_on,
      currentWeek: r.current_week,
      currentDay: r.current_day,
      professionalId: r.professional_id,
      professionalFirstName: r.professional_first_name,
      playlistUrl: r.playlist_url ?? null,
    })),
  };
}

// Release 3 · W5 Library › Programmes: the pure rules behind TR1, TR5, TR7,
// TR14 and TR22, kept out of the components so they can be tested.
//
// Data honesty (FINAL_PLAN 3): every line is built from stored values only.
// workout_templates stores one workout (its exercise list) and duration_weeks;
// it has no week-by-day schedule and no "workouts a week", so nothing here
// invents either.

import type { Exercise, LoggedExercise, WorkoutSession, WorkoutTemplate, WorkoutTemplateAssignment } from "../../../types";
import { signedNum } from "../proRules";
import { t, tn } from "../../../i18n/core";

const DAY = 86400000;
const toDate = (iso: string) => new Date(`${iso}T00:00:00`);
export const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (iso: string, n: number) => {
  const d = toDate(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY);


/** TR1 card meta: "{n} weeks · {n} exercises" from what the row stores. */
export function templateMeta(tpl: Pick<WorkoutTemplate, "durationWeeks" | "exercises">): string {
  const parts: string[] = [];
  if (tpl.durationWeeks) parts.push(tn(tpl.durationWeeks, "{n} week", "{n} weeks"));
  parts.push(tn(tpl.exercises.length, "{n} exercise", "{n} exercises"));
  return parts.join(" · ");
}

/** "{n} clients" / "{n} client" (TR1 COPY). */
export const clientsLabel = (n: number) => tn(n, "{n} client", "{n} clients");

/** Active = not ended (Release 3 end_template_assignment keeps the row with ended_at). */
export const isActive = (a: Pick<WorkoutTemplateAssignment, "endedAt">) => !a.endedAt;

/**
 * The programme end date, mirroring assign_template_to_client:
 * starts_on + ((duration_weeks - join_week + 1) × 7 - 1) days; null without a length.
 */
export function programmeEnd(startsOn: string, joinWeek: number, durationWeeks: number | null | undefined): string | null {
  if (!durationWeeks) return null;
  return addDays(startsOn, (durationWeeks - joinWeek + 1) * 7 - 1);
}

/**
 * The week the client is in today: floor(days since start ÷ 7) + join week,
 * capped by the length (W3's weekOf in services/pro/clients.ts, same rule).
 * null before the start or after the end.
 */
export function currentWeek(
  startsOn: string | null | undefined,
  joinWeek: number | undefined,
  durationWeeks: number | null | undefined,
  today: string
): { n: number; of: number | null } | null {
  if (!startsOn) return null;
  const days = daysBetween(startsOn, today);
  if (days < 0) return null;
  const n = Math.floor(days / 7) + (joinWeek ?? 1);
  if (durationWeeks && n > durationWeeks) return null;
  return { n, of: durationWeeks ?? null };
}

/** TR1 assigned row: "Week {n} of {n} · {n}% done"; parts drop out when unknown. */
export function assignedLine(week: { n: number; of: number | null } | null, pct: number | null | undefined): string | null {
  const parts: string[] = [];
  if (week) parts.push(week.of ? t("Week {n} of {of}", { n: week.n, of: week.of }) : t("Week {n}", { n: week.n }));
  if (typeof pct === "number") parts.push(t("{pct}% done", { pct }));
  return parts.length ? parts.join(" · ") : null;
}

/** The programme weeks the client covers: join week to the length (TR7 columns). */
export function programmeWeeks(a: Pick<WorkoutTemplateAssignment, "startsOn" | "joinWeek">, durationWeeks: number): { week: number; from: string; until: string }[] {
  if (!a.startsOn) return [];
  const join = a.joinWeek ?? 1;
  const out: { week: number; from: string; until: string }[] = [];
  for (let w = join; w <= durationWeeks; w += 1) {
    const from = addDays(a.startsOn, (w - join) * 7);
    out.push({ week: w, from, until: addDays(from, 6) });
  }
  return out;
}

export type WeekCell = "all" | "part" | "none" | "future";

/** TR7 legend: All done / Partly done / Not yet, from planned vs completed for that week. */
export function weekCell(planned: number | null, completed: number | null, future: boolean): WeekCell {
  if (future) return "future";
  if (!planned || completed == null) return "none";
  if (completed >= planned) return "all";
  return completed > 0 ? "part" : "none";
}

// ---------------------------------------------------------------------------
// TR14 targets per client
// ---------------------------------------------------------------------------

/** "John Doe 82.5 kg · Jane Smith 40 kg": clients with a computed weight only. */
export function targetsSummary(rows: { name: string; kg: number | null }[]): string | null {
  const parts = rows.filter((r) => r.kg != null).map((r) => t("{name} {kg} kg", { name: r.name, kg: fmtKg(r.kg!) }));
  return parts.length ? parts.join(" · ") : null;
}

export const fmtKg = (kg: number) => (Number.isInteger(kg) ? String(kg) : String(Math.round(kg * 10) / 10));

// ---------------------------------------------------------------------------
// TR22 the client's workout log against the targets
// ---------------------------------------------------------------------------

export interface Swap {
  from: string;
  to: string;
  reason: string | null;
}

/** Where parseSwaps finds names: the shape the client writes stores ids only. */
export interface SwapNames {
  /** The prescription the session ran against (its position order is the routine's). */
  prescribed: Pick<Exercise, "name" | "exerciseId" | "customExerciseId">[];
  /** The exercise library (catalog) and the professional's own custom movements. */
  catalog: { id: string; name: string }[];
  custom: { id?: string; name: string }[];
  /** The session's logged exercises (names are snapshots), position by position. */
  logged: { name: string }[];
}

/**
 * workout_sessions.swaps in the documented shape (HANDOVER_API, Release 3
 * follow-up 20261124160000), which the client logger writes:
 * [{ position, from_exercise_id, from_custom_exercise_id, to_exercise_id,
 *    to_custom_exercise_id, reason }]. Ids only, so names come from the
 * exercise library: the catalog, then the professional's own movements, then
 * the prescription (from) or the session's logged exercise at that position
 * (to, e.g. the client's own custom movement, which the professional can't
 * read). An element with no resolvable name on either side is skipped.
 */
export function parseSwaps(raw: unknown, names: SwapNames): Swap[] {
  if (!Array.isArray(raw)) return [];
  const id = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const byCatalog = new Map(names.catalog.map((c) => [c.id, c.name]));
  const byCustom = new Map(names.custom.filter((c) => !!c.id).map((c) => [c.id!, c.name]));
  const out: Swap[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    const pos = typeof o.position === "number" && Number.isInteger(o.position) && o.position >= 0 ? o.position : null;
    const fromEx = id(o.from_exercise_id);
    const fromCx = id(o.from_custom_exercise_id);
    const toEx = id(o.to_exercise_id);
    const toCx = id(o.to_custom_exercise_id);
    const planned =
      names.prescribed.find((p) => (fromEx && p.exerciseId === fromEx) || (fromCx && p.customExerciseId === fromCx)) ??
      (pos !== null ? names.prescribed[pos] : undefined);
    const from = (fromEx && byCatalog.get(fromEx)) || (fromCx && byCustom.get(fromCx)) || planned?.name || null;
    const loggedAt = pos !== null ? names.logged[pos]?.name : undefined;
    const to = (toEx && byCatalog.get(toEx)) || (toCx && byCustom.get(toCx)) || (loggedAt && loggedAt !== from ? loggedAt : null);
    if (!from || !to) continue;
    const reason = typeof o.reason === "string" && o.reason.trim() ? o.reason.trim() : null;
    out.push({ from, to, reason });
  }
  return out;
}

export type LogStatus = "planned" | "above" | "below" | "changed" | "skipped";

export interface LogRow {
  name: string;
  swapped: boolean;
  target: string | null;
  logged: string | null;
  status: LogStatus;
}

const doneSets = (ex: LoggedExercise) => ex.sets.filter((s) => (s.outcome ?? (s.completed ? "completed" : "skipped")) !== "skipped");

const kgText = (kg: number | null | undefined) => (kg == null ? null : kg === 0 ? null : t("{n} kg", { n: fmtKg(kg) }));

/** "Target 4 × 6 at 82.5 kg" (sets × reps, then the prescribed weight when there is one). */
export function targetText(ex: Exercise): string | null {
  const sets = ex.sets ?? ex.maxSets ?? ex.minSets;
  const reps = ex.reps ?? ex.maxReps ?? ex.minReps;
  if (!sets && !reps) return null;
  const w = kgText(ex.weightKg);
  return w ? t("Target {sets} × {reps} at {weight}", { sets: sets ?? "?", reps: reps ?? "?", weight: w }) : t("Target {sets} × {reps}", { sets: sets ?? "?", reps: reps ?? "?" });
}

/** "logged 3 × 8 at 28 kg": sets done × the most common reps, at the heaviest weight. */
export function loggedText(ex: LoggedExercise): string | null {
  const sets = doneSets(ex);
  if (sets.length === 0) return null;
  const reps = Math.max(...sets.map((s) => s.reps ?? 0));
  const top = Math.max(...sets.map((s) => s.weightKg ?? 0));
  return top > 0 ? t("logged {sets} × {reps} at {kg} kg", { sets: sets.length, reps, kg: fmtKg(top) }) : t("logged {sets} × {reps}", { sets: sets.length, reps });
}

/**
 * One row per prescribed exercise: matched to what was logged by name (or by
 * the swap that replaced it), then judged against the target: Skipped when
 * nothing was done, Changed when swapped, Above / Below on volume (sets ×
 * reps × weight, or sets × reps without a weight), else As planned.
 */
export function compareLog(prescribed: Exercise[], session: Pick<WorkoutSession, "exercises">, swaps: Swap[]): LogRow[] {
  const byName = new Map(session.exercises.map((e) => [e.name.toLowerCase(), e]));
  const used = new Set<string>();
  const rows: LogRow[] = [];
  for (const p of prescribed) {
    const swap = swaps.find((s) => s.from.toLowerCase() === p.name.toLowerCase());
    const logged = byName.get((swap ? swap.to : p.name).toLowerCase());
    if (logged) used.add(logged.name.toLowerCase());
    const target = targetText(p);
    const loggedLine = logged ? loggedText(logged) : null;
    if (!logged || !loggedLine) {
      rows.push({ name: swap ? swap.to : p.name, swapped: !!swap, target, logged: null, status: "skipped" });
      continue;
    }
    if (swap) {
      rows.push({ name: swap.to, swapped: true, target, logged: loggedLine, status: "changed" });
      continue;
    }
    const sets = doneSets(logged);
    const tSets = p.sets ?? p.maxSets ?? p.minSets ?? 0;
    const tReps = p.reps ?? p.maxReps ?? p.minReps ?? 0;
    const tW = p.weightKg && p.weightKg > 0 ? p.weightKg : 1;
    const tVol = tSets * tReps * tW;
    const vol = sets.reduce((sum, s) => sum + (s.reps ?? 0) * (p.weightKg && p.weightKg > 0 ? s.weightKg ?? 0 : 1), 0);
    const status: LogStatus = tVol === 0 ? "planned" : vol > tVol ? "above" : vol < tVol ? "below" : "planned";
    rows.push({ name: p.name, swapped: false, target, logged: loggedLine, status });
  }
  // Anything logged that the prescription doesn't name (and no swap explains).
  for (const e of session.exercises) {
    if (used.has(e.name.toLowerCase())) continue;
    const line = loggedText(e);
    if (line) rows.push({ name: e.name, swapped: false, target: null, logged: line, status: "changed" });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// TR7 top lifts this block
// ---------------------------------------------------------------------------

export interface TopLift {
  exercise: string;
  firstKg: number;
  lastKg: number;
  reps: number;
}

/**
 * The client's biggest change in top working weight between their first and
 * latest session of this programme, over exercises logged at least twice.
 */
export function topLift(sessions: Pick<WorkoutSession, "startedAt" | "exercises">[]): TopLift | null {
  const ordered = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const series = new Map<string, { kg: number; reps: number }[]>();
  for (const s of ordered) {
    for (const ex of s.exercises) {
      const sets = doneSets(ex).filter((x) => (x.weightKg ?? 0) > 0);
      if (!sets.length) continue;
      const best = sets.reduce((a, b) => ((b.weightKg ?? 0) > (a.weightKg ?? 0) ? b : a));
      const list = series.get(ex.name) ?? [];
      list.push({ kg: best.weightKg ?? 0, reps: best.reps ?? 0 });
      series.set(ex.name, list);
    }
  }
  let best: TopLift | null = null;
  for (const [exercise, list] of series) {
    if (list.length < 2) continue;
    const first = list[0];
    const last = list[list.length - 1];
    const delta = last.kg - first.kg;
    if (!best || Math.abs(delta) > Math.abs(best.lastKg - best.firstKg)) best = { exercise, firstKg: first.kg, lastKg: last.kg, reps: last.reps };
  }
  return best;
}

/** "+10 kg" / "−2.5 kg" / "0 kg" (COPY 6.3: true minus sign). */
export const deltaKg = (l: TopLift) => t("{n} kg", { n: signedNum(Math.round((l.lastKg - l.firstKg) * 10) / 10, fmtKg) });

/** True while a Library › Programmes sub-screen is open (?view=…); the Library page may hide its title and tabs then. */
export const programmesDetailOpen = (params: URLSearchParams) => !!params.get("view");

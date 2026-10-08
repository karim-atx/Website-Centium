import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { HabitIconKey } from "../../types";

export * from "./streak";
export * from "./icons";
import { toHabitIcon, validateHabitIcon } from "./icons";

// Habits, in public.habit_items and public.habit_completions.
//
// NO UPSERTS, and the grants are why rather than taste. habit_items grants
// UPDATE on (label, icon, position) ONLY — `owner_id`, `id` and `created_at`
// are INSERT-only, because they identify the row. `.upsert()` compiles to
// INSERT … ON CONFLICT DO UPDATE and its UPDATE branch writes every column in
// the payload, so it asks for a privilege that does not exist and comes back
// 42501. Every write below is an explicit INSERT or an explicit UPDATE.
//
// A COMPLETION IS PRESENT OR ABSENT, NEVER EDITED. habit_completions has no
// UPDATE grant and no update policy at all, and carries
// `unique (habit_item_id, completed_date)`. So ticking is an insert, unticking
// is a delete, and ticking twice in a day is a 23505 rather than a duplicate —
// which setCompletion treats as success, because the row it wanted is there.
//
// THE CLIENT SENDS THE DATE. Everything here takes an explicit yyyy-mm-dd
// rather than letting the database decide: `current_date` is the SERVER'S date
// in UTC, and 20260925010000 spent a whole migration removing that assumption
// from the cycle read path. A habit ticked at 9am in Auckland belongs to that
// morning, not to yesterday.

export interface HabitRow {
  id: string;
  label: string;
  icon: HabitIconKey;
  position: number;
}

export interface HabitsSnapshot {
  items: HabitRow[];
  /** Completion dates per habit id, within the window that was read. */
  completions: Record<string, string[]>;
}

// v6 MO1.1.1.1 / V6-143: a habit name is 1 to 40 characters and an account
// keeps up to 30 habits. The database still allows 80 characters and has no
// count or uniqueness rule (stage B3, PB-O-02), so the screen enforces these.
export const HABIT_LIMITS = { labelMax: 40, maxHabits: 30 } as const;

/** MO1.1.1.1 O3: the handover's duplicate-name line. */
export const DUPLICATE_HABIT = "You already have a habit with this name.";
/** MO1.1.1.1 O4 (OURS): at the 30-habit limit. */
export const TOO_MANY_HABITS = "You can keep up to 30 habits.";

/** True when the label matches another habit's name, ignoring case and outer spaces. */
export function isDuplicateLabel(label: string, others: { id: string; label: string }[], exceptId?: string): boolean {
  const key = label.trim().toLowerCase();
  return others.some((h) => h.id !== exceptId && h.label.trim().toLowerCase() === key);
}

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
export type WriteResult = { ok: true } | { ok: false; message: string };

function describe(error: PostgrestError): string {
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to save this.";
  }
  // A unique index on the name arrives with stage B3 (PB-O-02).
  if (code === "23505") return DUPLICATE_HABIT;
  if (code === "23514") return `Give the habit a name, up to ${HABIT_LIMITS.labelMax} characters.`;
  // 22P02: not a habit_icon value. validateHabitIcon catches it first; this
  // covers a build whose list ran ahead of the database.
  if (code === "22P02") return "That icon isn't available. Pick another one.";
  if (code === "42501") {
    return "You don't have permission to save this. Sign in again and try once more.";
  }
  return "Couldn't save that. Check your connection and try again.";
}

/** Mirrors habit_items' CHECK. Returns a sentence, or null. */
export function validateLabel(label: string): string | null {
  const trimmed = label.trim();
  if (trimmed.length < 1) return "Give the habit a name.";
  if (trimmed.length > HABIT_LIMITS.labelMax) {
    return `Keep the name under ${HABIT_LIMITS.labelMax} characters.`;
  }
  return null;
}

/**
 * Every habit and the days it was completed since `sinceDay`.
 *
 * TWO READS, NOT A JOIN, because the join would repeat every habit's label
 * once per completed day. The completions are keyed by habit id here so the
 * caller can ask "is this done today" and "how long is the run" without
 * another pass.
 *
 * A HABIT WITH NO COMPLETIONS STILL GETS AN ENTRY (an empty array), so a
 * caller never has to distinguish "no rows" from "habit I have not seen".
 */
export async function getHabits(userId: string, sinceDay: string): Promise<Result<HabitsSnapshot>> {
  const { data: items, error: itemsError } = await supabase
    .from("habit_items")
    .select("id, label, icon, position")
    .eq("owner_id", userId)
    .order("position", { ascending: true });

  if (itemsError) {
    console.error("[habits] Could not load habits:", itemsError.message);
    return { ok: false, message: describe(itemsError) };
  }

  const rows: HabitRow[] = (items ?? []).map((r) => ({
    id: r.id,
    label: r.label,
    icon: toHabitIcon(r.icon),
    position: r.position,
  }));
  const completions: Record<string, string[]> = {};
  for (const r of rows) completions[r.id] = [];

  if (rows.length === 0) return { ok: true, value: { items: rows, completions } };

  // RLS on habit_completions derives from the parent habit, so this needs no
  // owner filter of its own — it could not return somebody else's rows.
  const { data: done, error: doneError } = await supabase
    .from("habit_completions")
    .select("habit_item_id, completed_date")
    .in("habit_item_id", rows.map((r) => r.id))
    .gte("completed_date", sinceDay);

  if (doneError) {
    console.error("[habits] Could not load completions:", doneError.message);
    return { ok: false, message: describe(doneError) };
  }
  for (const c of done ?? []) {
    (completions[c.habit_item_id] ??= []).push(c.completed_date);
  }

  return { ok: true, value: { items: rows, completions } };
}

/** Adds a habit at the end of the list. */
export async function createHabit(
  userId: string,
  habit: { label: string; icon: HabitIconKey; position: number }
): Promise<Result<HabitRow>> {
  const invalid = validateLabel(habit.label) ?? validateHabitIcon(habit.icon);
  if (invalid) return { ok: false, message: invalid };

  const { data, error } = await supabase
    .from("habit_items")
    // The cast also covers the 12 Stage A1 icon values, which the generated
    // types (read from production) do not list until the enum ships there.
    .insert({
      owner_id: userId,
      label: habit.label.trim(),
      icon: habit.icon,
      position: habit.position,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .select("id, label, icon, position")
    .maybeSingle();

  if (error || !data) {
    console.error("[habits] Could not add the habit:", error?.message);
    return { ok: false, message: error ? describe(error) : "Couldn't add that habit." };
  }
  return {
    ok: true,
    value: { id: data.id, label: data.label, icon: toHabitIcon(data.icon), position: data.position },
  };
}

/** Saves a habit's name and icon (MO1.1.1 S5 Edit). UPDATE, never upsert:
 *  label and icon are both in the UPDATE grant; the colour waits for B3. */
export async function updateHabitRemote(id: string, patch: { label: string; icon: HabitIconKey }): Promise<WriteResult> {
  const invalid = validateLabel(patch.label) ?? validateHabitIcon(patch.icon);
  if (invalid) return { ok: false, message: invalid };

  const { error } = await supabase
    .from("habit_items")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ label: patch.label.trim(), icon: patch.icon } as any)
    .eq("id", id);

  if (error) {
    console.error("[habits] Could not update the habit:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

export async function deleteHabitRemote(id: string): Promise<WriteResult> {
  // Completions cascade from habit_items, so this is one statement.
  const { error } = await supabase.from("habit_items").delete().eq("id", id);
  if (error) {
    console.error("[habits] Could not remove the habit:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

/**
 * Ticks or unticks one habit for one day.
 *
 * 23505 IS SUCCESS HERE. The unique index means a second insert for the same
 * (habit, date) is refused — which happens when two tabs tick the same box, or
 * a tap is double-fired. The row the caller wanted exists either way, so
 * reporting a failure would be reporting a state that is not true.
 */
export async function setCompletion(
  habitId: string,
  date: string,
  done: boolean
): Promise<WriteResult> {
  if (done) {
    const { error } = await supabase
      .from("habit_completions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ habit_item_id: habitId, completed_date: date } as any);
    if (error && error.code !== "23505") {
      console.error("[habits] Could not tick the habit:", error.message);
      return { ok: false, message: describe(error) };
    }
    return { ok: true };
  }

  const { error } = await supabase
    .from("habit_completions")
    .delete()
    .eq("habit_item_id", habitId)
    .eq("completed_date", date);

  if (error) {
    console.error("[habits] Could not untick the habit:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true };
}

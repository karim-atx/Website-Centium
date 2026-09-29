import type { HabitIconKey, HabitItem, JournalEntry, JournalFolder } from "../../types";
import { createHabit, setCompletion } from "../habits";
import { createJournalEntry, createJournalFolder } from "../journal";

// The one-time move of habits and the journal out of this browser.
//
// WHEN IT RUNS, AND WHY IT CANNOT RUN TWICE. Three conditions, all required:
//
//   1. the server read SUCCEEDED and came back EMPTY for that kind. A failed
//      read is not an empty account — importing on top of one would duplicate
//      everything the user already has. Habits and the journal are judged
//      separately, so an account with server habits and a local-only journal
//      still gets its journal.
//   2. this browser still holds local rows worth moving.
//   3. this browser has not already decided, which the marker below records.
//
// After a successful upload the local keys are DELETED, so there is nothing
// left to import a second time even if the marker were lost. The marker exists
// for the other cases — nothing to import, or the server already had rows —
// where deleting is not obviously safe and re-checking every load is waste.
//
// ONE DEVICE DOES THE MOVE. A second browser holding its own stale copy finds
// the server non-empty and imports nothing; its local keys are cleared once
// the server read proves the data is safely elsewhere. That is the whole
// multi-device story: after this, both read the same rows.

export const IMPORT_MARKER = "mindImportDone";

/** What came across, and what could not. */
export interface ImportReport {
  habitsCreated: number;
  completionsCreated: number;
  foldersCreated: number;
  entriesCreated: number;
  /** Habits offered as suggestions instead of uploaded — see below. */
  starterHabitsSkipped: number;
  failures: string[];
}

/**
 * The untouched starter template, which is NOT the user's work.
 *
 * defaultHabits ships five habits with `done: false` and `streakDays: 0`. An
 * account that never opened the Habits tab has exactly those five, in that
 * order, untouched — and uploading them would turn a suggestion the app made
 * into five habits the user appears to have created, on every device they own,
 * forever. The Habits tab offers them as suggestions instead.
 *
 * A habit is "untouched starter" only if its id, label AND icon all match the
 * template and it has never been ticked. Rename one, tick one, or add a sixth
 * and that one is the user's — it comes across.
 */
const STARTER_IDS = new Set(["h1", "h2", "h3", "h4", "h5"]);
const STARTER_SHAPE: Record<string, { label: string; icon: HabitIconKey }> = {
  h1: { label: "Drink water", icon: "water" },
  h2: { label: "10,000 steps", icon: "steps" },
  h3: { label: "Workout", icon: "workout" },
  h4: { label: "Journal", icon: "journal" },
  h5: { label: "Meditate", icon: "meditation" },
};

export function isUntouchedStarter(h: HabitItem): boolean {
  if (!STARTER_IDS.has(h.id)) return false;
  const shape = STARTER_SHAPE[h.id];
  if (!shape) return false;
  return h.label === shape.label && h.icon === shape.icon && !h.done && h.streakDays === 0;
}

/**
 * Uploads this browser's habits.
 *
 * WHAT CROSSES, AND WHAT CANNOT:
 *   label, icon, order   → habit_items.label / icon / position. Exact.
 *   done                 → one habit_completions row dated `today`. Exact.
 *   streakDays           → NOT CARRIED, and not recoverable. It was a tap
 *                          counter: toggleHabit did `+1` on a tick and `-1` on
 *                          an untick and never reset on a missed day, so a
 *                          habit ticked once a month for a year read "12 day
 *                          streak". There are no dates behind it. Writing N
 *                          dated completion rows to reproduce the number would
 *                          be asserting the user completed the habit on days
 *                          nobody ever recorded — the same class of thing as a
 *                          seeded streak, which this repo has removed twice.
 *                          The new number is a real run of days and starts
 *                          from what is actually known: today.
 */
export async function importHabits(
  userId: string,
  local: HabitItem[],
  today: string
): Promise<Pick<ImportReport, "habitsCreated" | "completionsCreated" | "starterHabitsSkipped" | "failures">> {
  const failures: string[] = [];
  let habitsCreated = 0;
  let completionsCreated = 0;
  let starterHabitsSkipped = 0;

  let position = 0;
  for (const h of local) {
    if (isUntouchedStarter(h)) {
      starterHabitsSkipped++;
      continue;
    }
    const created = await createHabit(userId, { label: h.label, icon: h.icon, position: position++ });
    if (!created.ok) {
      failures.push(`Habit "${h.label}": ${created.message}`);
      continue;
    }
    habitsCreated++;

    if (h.done) {
      const ticked = await setCompletion(created.value.id, today, true);
      if (ticked.ok) completionsCreated++;
      else failures.push(`Today's tick for "${h.label}": ${ticked.message}`);
    }
  }

  return { habitsCreated, completionsCreated, starterHabitsSkipped, failures };
}

/**
 * Uploads this browser's journal.
 *
 * WHAT CROSSES, AND WHAT CANNOT:
 *   folder name, order   → journal_folders.name / position. Exact.
 *   title, text          → journal_entries.title / body. Exact, trimmed —
 *                          which the CHECKs require and the form already did.
 *   date                 → entry_date, exactly as written. This is the field
 *                          the brief cares most about and it survives intact:
 *                          the local date was already the user's own, and the
 *                          column now takes it rather than defaulting to the
 *                          server's.
 *   createdAt            → created_at, preserved (the column is insertable),
 *                          so ordering within a day is kept.
 *   EMPTY ENTRIES        → NOT CARRIED. An entry whose title or body is blank
 *                          after trimming is refused by the CHECK. The form
 *                          never allowed one, so this only catches rows from
 *                          before it did; each is reported by title.
 *   AN ENTRY WITH NO FOLDER → NOT CARRIED. folder_id is NOT NULL and the
 *                          orphan has nowhere to go; reported rather than
 *                          filed somewhere it never was.
 *
 * FOLDERS FIRST, THEN ENTRIES, because folder_id has to point at a row that
 * exists. Local ids are remapped to the new uuids through `idMap`.
 */
export async function importJournal(
  userId: string,
  folders: JournalFolder[],
  entries: JournalEntry[]
): Promise<Pick<ImportReport, "foldersCreated" | "entriesCreated" | "failures">> {
  const failures: string[] = [];
  const idMap = new Map<string, string>();
  let foldersCreated = 0;
  let entriesCreated = 0;

  // AN EMPTY FOLDER IS STILL THE USER'S. Folders are a structure somebody
  // chose; one with nothing in it yet is not noise.
  let position = 0;
  for (const f of folders) {
    const created = await createJournalFolder(userId, f.name, position++);
    if (!created.ok) {
      failures.push(`Folder "${f.name}": ${created.message}`);
      continue;
    }
    idMap.set(f.id, created.value.id);
    foldersCreated++;
  }

  // Oldest first, so created_at ordering within a day comes out the same way
  // round even if the column were ever to be ignored.
  const ordered = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const e of ordered) {
    const folderId = idMap.get(e.folderId);
    if (!folderId) {
      failures.push(`Entry "${e.title || "(untitled)"}": its folder is missing, so it was left behind.`);
      continue;
    }
    const created = await createJournalEntry({
      folderId,
      title: e.title,
      body: e.text,
      entryDate: e.date,
      createdAt: e.createdAt,
    });
    if (!created.ok) {
      failures.push(`Entry "${e.title || "(untitled)"}" (${e.date}): ${created.message}`);
      continue;
    }
    entriesCreated++;
  }

  return { foldersCreated, entriesCreated, failures };
}

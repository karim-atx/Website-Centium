import React, { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { Exercise, Routine, WorkoutBlock } from "../../types";
import { useApp } from "../../context/AppContext";
import { ExerciseLibrarySheet, type ExercisePick } from "./ExerciseLibrarySheet";
import { ExerciseSettingsSheet, type ExerciseSettingsPro } from "./ExerciseSettingsSheet";
import { BlockCard } from "./BlockCard";
import { BlockSettingsSheet } from "./BlockSettingsSheet";
import { GripVertical, Library, Link2, MessageSquarePlus, MessageSquareText, Search, Settings2, X } from "lucide-react";
import { FOLDER_SWATCHES } from "../../data/folderColors";
import { matchesSearch, searchKey } from "./LibraryParts";
import {
  canGroup,
  defaultBlockParams,
  groupExercises,
  groupIntoRuns,
  newBlockId,
  pruneBlocks,
  reorderByDrag,
  ungroupBlock,
} from "../../services/workout/blocks";
import { prescriptionLine } from "../../services/workout/prescription";

const colorOptions = FOLDER_SWATCHES.map((s) => s.color);

let localId = 0;
const blankExercise = (pick: ExercisePick): Exercise => ({
  id: `custom-ex-${Date.now()}-${localId++}`,
  name: pick.name,
  sets: 3,
  reps: 10,
  // No weight until one is set: never a silent 20 kg (2026-09-30).
  weightKg: null,
  muscleGroups: pick.muscleGroups,
  secondaryMuscleGroups: pick.secondaryMuscleGroups,
  classification: pick.classification,
  isCustom: pick.isCustom,
  // Carried from the pick so the save knows which library row this
  // prescribes — routine_exercises stores the reference, not the name.
  exerciseId: pick.exerciseId,
  customExerciseId: pick.customExerciseId,
});

/** What the professional builder hands back on Save (Release 3 · W5 TR3). */
export interface RoutineDraft {
  name: string;
  durationMin: number;
  exercises: Exercise[];
  blocks: WorkoutBlock[];
}

/**
 * Release 3 · W5 (TR3 / TR13, HANDOVER g): the professional's builder is this
 * sheet with these OPTIONAL props. Unset, the sheet is the client's Create
 * Routine exactly as before. Set, it:
 * - starts from `initial` (editing a template) and saves through `onSubmit`
 *   instead of addRoutine;
 * - hides Color (workout_templates has no colour column);
 * - shows each exercise's prescription line, a coach-note icon (CoachNote
 *   editor, coach_note ≤ 500) and supersets / AMRAP / EMOM blocks (block-aware
 *   drag, "Group into a superset", BlockSettingsSheet), as the old template
 *   sheet did;
 * - opens ExerciseSettingsSheet in pro mode;
 * - renders `extra` (the "For your clients" block, folder, programme length,
 *   note to client) under the exercise list.
 */
export interface RoutineSheetPro {
  title: string;
  initial?: Partial<RoutineDraft>;
  submitLabel: string;
  onSubmit: (draft: RoutineDraft) => Promise<string | undefined>;
  extra?: React.ReactNode;
  /** Pro-mode exercise settings for one exercise (targets row etc.). */
  settings?: (exercise: Exercise) => ExerciseSettingsPro;
}

const NOTE_MAX = 500;

export const CreateRoutineSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  folderId: string | null;
  pro?: RoutineSheetPro;
}> = ({ open, onClose, folderId, pro }) => {
  const { addRoutine, customExercises, exerciseCatalog } = useApp();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("45");
  const [color, setColor] = useState(colorOptions[0]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [blockDraft, setBlockDraft] = useState<{ block: WorkoutBlock; memberIds: string[] } | null>(null);
  const [groupProblem, setGroupProblem] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<{ id: string; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [settingsIndex, setSettingsIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pro mode: start from the template being edited each time the sheet opens.
  const initial = pro?.initial;
  useEffect(() => {
    if (!open || !pro) return;
    setName(initial?.name ?? "");
    setDuration(initial?.durationMin ? String(initial.durationMin) : "45");
    setExercises(initial?.exercises ?? []);
    setBlocks(initial?.blocks ?? []);
    setSelecting(false);
    setSelected([]);
    setGroupProblem(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const reset = () => {
    setName("");
    setDuration("45");
    setColor(colorOptions[0]);
    setExercises([]);
    setBlocks([]);
    setSelecting(false);
    setSelected([]);
    setGroupProblem(null);
    setSearchQuery("");
    setError(null);
  };

  const addExercise = (pick: ExercisePick) => {
    if (!pick.name.trim() || exercises.some((e) => e.name === pick.name.trim())) return;
    setExercises((prev) => [...prev, blankExercise({ ...pick, name: pick.name.trim() })]);
    setSearchQuery("");
  };

  const removeExercise = (id: string) =>
    setExercises((prev) => {
      const next = prev.filter((e) => e.id !== id);
      // Pro: removing a member can leave a superset of one, which the database
      // refuses; pruning here means the refusal never reaches it.
      if (pro) setBlocks((current) => pruneBlocks(next, current));
      return next;
    });

  const handleDrop = (targetIdx: number) => {
    if (dragIndex === null || dragIndex === targetIdx) return;
    setExercises((prev) => {
      // Pro: block-aware (reorderByDrag), so a drop never lands inside
      // somebody else's superset.
      if (pro) return reorderByDrag(prev, dragIndex, targetIdx);
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const fromCustom = customExercises
      .filter((e) => e.name.toLowerCase().includes(q))
      .map((e) => ({ name: e.name, classification: e.classification, isCustom: true as const, customExerciseId: e.id }));
    // The catalogue's aliases too ("rdl", "ohp"; B3 PB-O-33), as the Library does.
    const qKey = searchKey(searchQuery);
    const fromLibrary = exerciseCatalog
      .filter((e) => e.name.toLowerCase().includes(q) || matchesSearch(qKey, e.name, e.aliases))
      .map((e) => ({ name: e.name, classification: e.classification, isCustom: false as const, exerciseId: e.id }));
    return [...fromCustom, ...fromLibrary].slice(0, 6);
  }, [searchQuery, customExercises, exerciseCatalog]);

  const save = async () => {
    if (!name.trim() || exercises.length === 0) return;
    if (pro) {
      setSaving(true);
      setError(null);
      const message = await pro.onSubmit({
        name: name.trim(),
        durationMin: Number(duration) || 30,
        exercises,
        blocks: pruneBlocks(exercises, blocks),
      });
      setSaving(false);
      // The sheet stays open on failure, holding everything typed into it.
      if (message) {
        setError(message);
        return;
      }
      reset();
      onClose();
      return;
    }
    const routine: Omit<Routine, "id"> = {
      folderId,
      name: name.trim(),
      color,
      estimatedDurationMin: Number(duration) || 30,
      exercises,
    };
    setSaving(true);
    setError(null);
    const id = await addRoutine(routine);
    setSaving(false);
    // THE SHEET STAYS OPEN ON FAILURE, holding everything the user typed. It
    // used to close unconditionally, which was harmless while this was local
    // state and is not now that the save can be refused — closing would throw
    // away a routine that was never stored.
    if (!id) {
      setError("Couldn't save that routine. Check your connection and try again.");
      return;
    }
    reset();
    onClose();
  };

  /** The client's plain row, unchanged. */
  const clientRow = (ex: Exercise, i: number) => (
    <div
      key={ex.id}
      draggable
      onDragStart={() => setDragIndex(i)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => handleDrop(i)}
      className="tap flex items-center gap-2 bg-cream-soft rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing"
    >
      <GripVertical size={14} className="text-charcoal-faint shrink-0" />
      <button
        onClick={() => setSettingsIndex(i)}
        className="flex-1 flex items-center justify-between text-left min-w-0"
      >
        <span className="text-sm font-medium text-charcoal truncate">{ex.name}</span>
        <Settings2 size={13} className="text-charcoal-faint shrink-0 ml-2" />
      </button>
      <button onClick={() => removeExercise(ex.id)} className="tap text-charcoal-faint shrink-0">
        <X size={14} />
      </button>
    </div>
  );

  const noteIcon = (ex: Exercise) => {
    const has = !!ex.coachNote?.trim();
    return (
      <button
        type="button"
        onClick={() => setNoteFor({ id: ex.id, text: ex.coachNote ?? "" })}
        aria-label={has ? "Coach note added" : "Add coach note"}
        className="tap relative shrink-0 flex items-center justify-center before:absolute before:-inset-2 before:content-['']"
        style={{ color: has ? "rgb(var(--th-7d6bb5))" : "rgb(var(--c-charcoal-faint))" }}
      >
        {has ? <MessageSquareText size={15} /> : <MessageSquarePlus size={15} />}
      </button>
    );
  };

  /** Pro rows: selectable for grouping, prescription line, coach note icon. */
  const proRow = (ex: Exercise) => {
    const i = exercises.findIndex((e) => e.id === ex.id);
    const line = prescriptionLine(ex);
    const picked = selected.includes(ex.id);
    return (
      <div
        key={ex.id}
        draggable={!selecting}
        onDragStart={() => setDragIndex(i)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDrop(i)}
        className="tap flex items-center gap-2 bg-cream-soft rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing"
      >
        {selecting ? (
          <button
            onClick={() => setSelected((prev) => (prev.includes(ex.id) ? prev.filter((id) => id !== ex.id) : [...prev, ex.id]))}
            role="checkbox"
            aria-checked={picked}
            aria-label={`Select ${ex.name}`}
            className="tap flex items-center justify-center shrink-0"
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              border: `2px solid ${picked ? "rgb(var(--th-aea1dc))" : "rgb(var(--c-charcoal) / 0.2)"}`,
              background: picked ? "rgb(var(--th-aea1dc))" : "transparent",
            }}
          />
        ) : (
          <GripVertical size={14} className="text-charcoal-faint shrink-0" />
        )}
        <button onClick={() => setSettingsIndex(i)} className="flex-1 text-left min-w-0">
          <span className="block text-sm font-medium text-charcoal truncate">{ex.name}</span>
          {line && <span className="block text-[11px] text-charcoal-faint truncate">{line}</span>}
        </button>
        {noteIcon(ex)}
        <button onClick={() => setSettingsIndex(i)} aria-label={`Settings for ${ex.name}`} className="tap text-charcoal-faint shrink-0">
          <Settings2 size={14} />
        </button>
        <button onClick={() => removeExercise(ex.id)} aria-label={`Remove ${ex.name}`} className="tap text-charcoal-faint shrink-0">
          <X size={14} />
        </button>
      </div>
    );
  };

  const settingsExercise = settingsIndex !== null ? exercises[settingsIndex] : null;

  return (
    <>
      <BottomSheet
        open={open}
        onClose={() => {
          reset();
          onClose();
        }}
        title={pro ? pro.title : "Create Routine"}
      >
        <div className="space-y-5 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Routine name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Push Day"
              className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
              Estimated duration (min)
            </span>
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className="w-28 rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          {!pro && (
            <div>
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Color</span>
              <div className="flex flex-wrap gap-2">
                {FOLDER_SWATCHES.map(({ color: c, name }) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={name}
                    className="tap w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: c,
                      // A faint ring in the theme's ink, so a dark swatch (Black) still shows.
                      boxShadow: "inset 0 0 0 1px rgb(var(--c-charcoal) / 0.22)",
                      outline: color === c ? "2px solid rgb(var(--c-charcoal))" : "none",
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-2 block">
              Exercises {exercises.length > 0 && `(drag to reorder, tap for settings)`}
            </span>
            {pro && groupProblem && <p className="text-[11px] text-status-high mb-2">{groupProblem}</p>}
            <div className="space-y-1.5 mb-3">
              {pro
                ? groupIntoRuns(exercises, blocks).map((run) =>
                    run.block ? (
                      <div key={run.block.id} style={{ margin: "0 -12px" }}>
                        <BlockCard
                          block={run.block}
                          ordinal={run.ordinal}
                          members={run.members}
                          onHeaderClick={() => setBlockDraft({ block: run.block!, memberIds: run.members.map((m) => m.id) })}
                          renderMemberAction={(ex) => (
                            <span className="flex items-center shrink-0" style={{ gap: 10 }}>
                              {noteIcon(ex)}
                              <button
                                onClick={() => setSettingsIndex(exercises.findIndex((e) => e.id === ex.id))}
                                aria-label={`Settings for ${ex.name}`}
                                className="tap text-charcoal-faint shrink-0"
                              >
                                <Settings2 size={13} />
                              </button>
                            </span>
                          )}
                        />
                      </div>
                    ) : (
                      run.members.map(proRow)
                    )
                  )
                : exercises.map(clientRow)}
            </div>

            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for exercise…"
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 pl-9 pr-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-1 mb-2.5">
                {searchResults.map((r) => (
                  <button
                    key={r.name}
                    onClick={() =>
                      addExercise(
                        pro
                          ? {
                              name: r.name,
                              classification: r.classification,
                              isCustom: r.isCustom,
                              exerciseId: "exerciseId" in r ? r.exerciseId : undefined,
                              customExerciseId: "customExerciseId" in r ? r.customExerciseId : undefined,
                            }
                          : { name: r.name, classification: r.classification }
                      )
                    }
                    className="tap w-full flex items-center justify-between rounded-xl px-3 py-2 bg-primary-pale/60 hover:bg-primary-pale text-left"
                  >
                    <span className="text-sm font-medium text-charcoal">{r.name}</span>
                    <span className="text-xs font-semibold text-primary">+ Add</span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setLibraryOpen(true)}
              className="tap w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-charcoal/15 py-2.5 text-xs font-semibold text-charcoal-soft"
            >
              <Library size={14} /> Browse exercise library
            </button>

            {pro && exercises.length >= 2 && (
              <div className="flex items-center mt-3" style={{ gap: 12 }}>
                {selecting ? (
                  <>
                    <button
                      onClick={() => {
                        setSelecting(false);
                        setSelected([]);
                        setGroupProblem(null);
                      }}
                      className="tap text-[12.5px] font-semibold text-charcoal-soft"
                      style={{ minHeight: 44 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const check = canGroup(exercises, selected);
                        if (!check.ok) {
                          setGroupProblem(check.message);
                          return;
                        }
                        setGroupProblem(null);
                        setBlockDraft({ block: { id: newBlockId(), kind: "superset", ...defaultBlockParams("superset") }, memberIds: [...selected] });
                      }}
                      disabled={selected.length < 2}
                      className="tap text-[12.5px] font-semibold disabled:opacity-50"
                      style={{ minHeight: 44, color: "rgb(var(--thi-5f5093))" }}
                    >
                      Group as…
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setSelecting(true)}
                    className="tap flex items-center text-[13px] font-bold"
                    style={{ gap: 6, minHeight: 44, color: "rgb(var(--thi-5f5093))" }}
                  >
                    <Link2 size={15} /> Group into a superset
                  </button>
                )}
              </div>
            )}
          </div>

          {pro?.extra}

          {error && (
            <p className="text-[11.5px] font-semibold text-status-high text-center">{error}</p>
          )}

          <Button
            fullWidth
            size="lg"
            onClick={() => void save()}
            disabled={saving || !name.trim() || exercises.length === 0}
          >
            {saving ? "Saving…" : pro ? pro.submitLabel : "Save routine"}
          </Button>
        </div>
      </BottomSheet>

      <ExerciseLibrarySheet
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onPick={(pick) => addExercise(pick)}
        alreadyAdded={exercises.map((e) => e.name)}
      />

      <ExerciseSettingsSheet
        open={settingsIndex !== null}
        onClose={() => setSettingsIndex(null)}
        exercise={settingsExercise}
        onSave={(patch) => {
          if (settingsIndex === null) return;
          setExercises((prev) => prev.map((e, i) => (i === settingsIndex ? { ...e, ...patch } : e)));
        }}
        {...(pro
          ? {
              pro: settingsExercise ? pro.settings?.(settingsExercise) ?? {} : {},
              onDelete: () => settingsExercise && removeExercise(settingsExercise.id),
            }
          : {})}
      />

      {pro && (
        <>
          <BlockSettingsSheet
            key={blockDraft?.block.id ?? "none"}
            open={!!blockDraft}
            onClose={() => setBlockDraft(null)}
            block={blockDraft?.block ?? null}
            memberCount={blockDraft?.memberIds.length ?? 0}
            onSave={(block) => {
              const existing = blocks.some((b) => b.id === block.id);
              const nextExercises = existing ? exercises : groupExercises(exercises, blockDraft?.memberIds ?? [], block);
              const nextBlocks = existing ? blocks.map((b) => (b.id === block.id ? block : b)) : [...blocks, block];
              setExercises(nextExercises);
              setBlocks(pruneBlocks(nextExercises, nextBlocks));
              setSelecting(false);
              setSelected([]);
            }}
            onUngroup={
              blockDraft && blocks.some((b) => b.id === blockDraft.block.id)
                ? () => {
                    const nextExercises = ungroupBlock(exercises, blockDraft.block.id);
                    setExercises(nextExercises);
                    setBlocks(pruneBlocks(nextExercises, blocks));
                    setSelecting(false);
                    setSelected([]);
                  }
                : undefined
            }
          />

          <BottomSheet open={!!noteFor} onClose={() => setNoteFor(null)} title="Coach note">
            <div className="space-y-3 animate-fade-slide-up">
              <textarea
                value={noteFor?.text ?? ""}
                onChange={(e) => setNoteFor((n) => (n ? { ...n, text: e.target.value.slice(0, NOTE_MAX) } : n))}
                maxLength={NOTE_MAX}
                rows={4}
                aria-label="Coach note"
                className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
              <p className="text-[11px] text-charcoal-faint text-right tabular-nums">
                {(noteFor?.text.length ?? 0)}/{NOTE_MAX}
              </p>
              <Button
                fullWidth
                size="lg"
                onClick={() => {
                  if (noteFor) {
                    const text = noteFor.text.trim();
                    setExercises((prev) => prev.map((e) => (e.id === noteFor.id ? { ...e, coachNote: text || undefined } : e)));
                  }
                  setNoteFor(null);
                }}
              >
                Save
              </Button>
            </div>
          </BottomSheet>
        </>
      )}
    </>
  );
};

import React, { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { Exercise, WorkoutBlock, WorkoutTemplate } from "../../types";
import { useApp } from "../../context/AppContext";
import { ExerciseLibrarySheet, type ExercisePick } from "../workout/ExerciseLibrarySheet";
import { ExerciseSettingsSheet } from "../workout/ExerciseSettingsSheet";
import { BlockCard } from "../workout/BlockCard";
import { BlockSettingsSheet } from "../workout/BlockSettingsSheet";
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
import { GripVertical, Library, Search, Settings2, X } from "lucide-react";
import clsx from "clsx";

let localId = 0;
const blankExercise = (pick: ExercisePick): Exercise => ({
  id: `tmpl-ex-${Date.now()}-${localId++}`,
  name: pick.name,
  sets: 3,
  reps: 10,
  weightKg: 20,
  muscleGroups: pick.muscleGroups,
  classification: pick.classification,
  isCustom: pick.isCustom,
  // Carried from the pick so the save knows which library row this
  // prescribes — routine_exercises stores the reference, not the name.
  exerciseId: pick.exerciseId,
  customExerciseId: pick.customExerciseId,
});

// V6 (QA 6.0): the professional's Workout Template Builder — same
// routine-building UI as the client's Workout tab (CreateRoutineSheet), but
// produces a template assignable to one or more clients instead of a
// personal routine.
export const CreateWorkoutTemplateSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  defaultFolderId?: string | null;
  // V10 (QA 10.0): "Created templates have a 3 dot logo... gives the
  // option to duplicate, rename, edit template, and delete template" —
  // passing an existing template pre-fills the form and saves update it.
  editTemplate?: WorkoutTemplate | null;
}> = ({ open, onClose, defaultFolderId = null, editTemplate }) => {
  const { addWorkoutTemplate, updateWorkoutTemplate, customExercises, exerciseCatalog, workoutTemplateFolders } = useApp();
  const [name, setName] = useState(editTemplate?.name ?? "");
  const [exercises, setExercises] = useState<Exercise[]>(editTemplate?.exercises ?? []);
  const [blocks, setBlocks] = useState<WorkoutBlock[]>(editTemplate?.blocks ?? []);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [blockDraft, setBlockDraft] = useState<{ block: WorkoutBlock; memberIds: string[] } | null>(null);
  const [groupProblem, setGroupProblem] = useState<string | null>(null);
  const [notes, setNotes] = useState(editTemplate?.coachNote ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [settingsIndex, setSettingsIndex] = useState<number | null>(null);
  const [folderId, setFolderId] = useState<string | null>(editTemplate?.folderId ?? defaultFolderId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(editTemplate?.name ?? "");
      setExercises(editTemplate?.exercises ?? []);
      setBlocks(editTemplate?.blocks ?? []);
      setSelecting(false);
      setSelected([]);
      setGroupProblem(null);
      setNotes(editTemplate?.coachNote ?? "");
      setFolderId(editTemplate?.folderId ?? defaultFolderId);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editTemplate]);

  const reset = () => {
    setName("");
    setExercises([]);
    setBlocks([]);
    setSelecting(false);
    setSelected([]);
    setGroupProblem(null);
    setNotes("");
    setSearchQuery("");
    setFolderId(defaultFolderId);
  };

  const addExercise = (pick: ExercisePick) => {
    if (!pick.name.trim() || exercises.some((e) => e.name === pick.name.trim())) return;
    setExercises((prev) => [...prev, blankExercise({ ...pick, name: pick.name.trim() })]);
    setSearchQuery("");
  };

  const removeExercise = (id: string) =>
    setExercises((prev) => {
      const next = prev.filter((e) => e.id !== id);
      // Removing a member can leave a superset with one exercise, which the
      // database refuses. Pruning here means the refusal never reaches it.
      setBlocks((current) => pruneBlocks(next, current));
      return next;
    });

  /**
   * BLOCK-AWARE SINCE BLOCKS EXISTED. A plain splice — which this was — drops
   * an exercise wherever the finger lifted, including the middle of somebody
   * else's superset. That changes what the athlete is asked to do, and then
   * fails at COMMIT with ATX27 and takes every prescription with it. See
   * reorderByDrag for the four rules and the tests that hold them.
   */
  const handleDrop = (targetIdx: number) => {
    if (dragIndex === null || dragIndex === targetIdx) return;
    setExercises((prev) => reorderByDrag(prev, dragIndex, targetIdx));
    setDragIndex(null);
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const fromCustom = customExercises
      .filter((e) => e.name.toLowerCase().includes(q))
      .map((e) => ({ name: e.name, classification: e.classification, isCustom: true as const, customExerciseId: e.id }));
    const fromLibrary = exerciseCatalog
      .filter((e) => e.name.toLowerCase().includes(q))
      .map((e) => ({ name: e.name, classification: e.classification, isCustom: false as const, exerciseId: e.id }));
    return [...fromCustom, ...fromLibrary].slice(0, 6);
  }, [searchQuery, customExercises, exerciseCatalog]);

  /**
   * THIS SHEET AUTHORS A TEMPLATE AND NOTHING ELSE.
   *
   * It used to pick clients and a day here too, writing them onto the same
   * object — which is exactly the conflation the split removed: an assignment
   * is per client, with that client's own day, and pushing one is a separate
   * act that can destroy work and therefore asks first. The "Assign" action in
   * the builder does that.
   */
  const save = async () => {
    if (!name.trim() || exercises.length === 0) return;
    const payload = {
      name: name.trim(),
      exercises,
      blocks: pruneBlocks(exercises, blocks),
      folderId,
      coachNote: notes.trim() || undefined,
    };
    setSaving(true);
    setError(null);
    const message = editTemplate
      ? await updateWorkoutTemplate(editTemplate.id, payload)
      : await addWorkoutTemplate(payload);
    setSaving(false);
    // The sheet stays open on failure, holding everything typed into it.
    if (message) {
      setError(message);
      return;
    }
    reset();
    onClose();
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={() => {
          reset();
          onClose();
        }}
        title={editTemplate ? "Edit Workout Template" : "New Workout Template"}
      >
        <div className="space-y-5 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Template name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="12-Week Strength Block"
              className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-charcoal-soft">
                Exercises {exercises.length > 0 && `(drag to reorder, tap for settings)`}
              </span>
              {exercises.length >= 2 &&
                (selecting ? (
                  <span className="flex items-center" style={{ gap: 12 }}>
                    <button
                      onClick={() => {
                        setSelecting(false);
                        setSelected([]);
                        setGroupProblem(null);
                      }}
                      className="tap text-[11.5px] font-semibold text-charcoal-soft"
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
                        setBlockDraft({
                          block: { id: newBlockId(), kind: "superset", ...defaultBlockParams("superset") },
                          memberIds: [...selected],
                        });
                      }}
                      disabled={selected.length < 2}
                      className="tap text-[11.5px] font-semibold"
                      style={{ color: selected.length < 2 ? "#C9C2B8" : "#5F5093" }}
                    >
                      Group as…
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setSelecting(true)}
                    className="tap text-[11.5px] font-semibold text-primary-dark"
                  >
                    Group
                  </button>
                ))}
            </div>
            {groupProblem && (
              <p className="text-[11px] text-status-high mb-2">{groupProblem}</p>
            )}
            <div className="space-y-1.5 mb-3">
              {groupIntoRuns(exercises, blocks).map((run) =>
                run.block ? (
                  <div key={run.block.id} style={{ margin: "0 -12px" }}>
                    <BlockCard
                      block={run.block}
                      ordinal={run.ordinal}
                      members={run.members}
                      onHeaderClick={() =>
                        setBlockDraft({ block: run.block!, memberIds: run.members.map((m) => m.id) })
                      }
                      renderMemberAction={(ex) => (
                        <button
                          onClick={() => setSettingsIndex(exercises.findIndex((e) => e.id === ex.id))}
                          aria-label={`Settings for ${ex.name}`}
                          className="tap text-charcoal-faint shrink-0"
                        >
                          <Settings2 size={13} />
                        </button>
                      )}
                    />
                  </div>
                ) : (
                  run.members.map((ex) => {
                    const i = exercises.findIndex((e) => e.id === ex.id);
                    const line = prescriptionLine(ex);
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
                            onClick={() =>
                              setSelected((prev) =>
                                prev.includes(ex.id)
                                  ? prev.filter((id) => id !== ex.id)
                                  : [...prev, ex.id]
                              )
                            }
                            role="checkbox"
                            aria-checked={selected.includes(ex.id)}
                            aria-label={`Select ${ex.name}`}
                            className="tap flex items-center justify-center shrink-0"
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 5,
                              border: `2px solid ${selected.includes(ex.id) ? "#AEA1DC" : "rgba(36,31,27,0.2)"}`,
                              background: selected.includes(ex.id) ? "#AEA1DC" : "transparent",
                            }}
                          />
                        ) : (
                          <GripVertical size={14} className="text-charcoal-faint shrink-0" />
                        )}
                        <button
                          onClick={() => setSettingsIndex(i)}
                          className="flex-1 flex items-center justify-between text-left min-w-0"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-charcoal truncate">
                              {ex.name}
                            </span>
                            {line && (
                              <span className="block text-[11px] text-charcoal-faint truncate">
                                {line}
                              </span>
                            )}
                          </span>
                          <Settings2 size={13} className="text-charcoal-faint shrink-0 ml-2" />
                        </button>
                        <button
                          onClick={() => removeExercise(ex.id)}
                          aria-label={`Remove ${ex.name}`}
                          className="tap text-charcoal-faint shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })
                )
              )}
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
                    onClick={() => addExercise({ name: r.name, classification: r.classification })}
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
              <Library size={14} /> Browse exercise database
            </button>
          </div>

          {workoutTemplateFolders.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Folder</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFolderId(null)}
                  className={clsx(
                    "tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                    folderId === null
                      ? "bg-primary text-white border-primary"
                      : "bg-cream-soft border-transparent text-charcoal-soft"
                  )}
                >
                  Unfiled
                </button>
                {workoutTemplateFolders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFolderId(f.id)}
                    className={clsx(
                      "tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                      folderId === f.id
                        ? "bg-primary text-white border-primary"
                        : "bg-cream-soft border-transparent text-charcoal-soft"
                    )}
                  >
                    {f.parentId ? "↳ " : ""}
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}


          {/* V10 (QA 10.0): "Add a note section where anything the
              professional writes will be shown on the client UI in the
              coach note section." */}
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
              Note to client <span className="text-charcoal-faint font-normal">(read-only for them)</span>
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Focus on form this week, keep RPE under 8."
              rows={3}
              className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </label>

          {error && (
            <p className="text-[11.5px] font-semibold text-status-high text-center">{error}</p>
          )}

          <Button
            fullWidth
            size="lg"
            onClick={() => void save()}
            disabled={saving || !name.trim() || exercises.length === 0}
          >
            {saving ? "Saving…" : editTemplate ? "Save changes" : "Save template"}
          </Button>
        </div>
      </BottomSheet>

      <ExerciseLibrarySheet
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onPick={(pick) => addExercise(pick)}
        alreadyAdded={exercises.map((e) => e.name)}
      />

      <BlockSettingsSheet
        key={blockDraft?.block.id ?? "none"}
        open={!!blockDraft}
        onClose={() => setBlockDraft(null)}
        block={blockDraft?.block ?? null}
        memberCount={blockDraft?.memberIds.length ?? 0}
        onSave={(block) => {
          const existing = blocks.some((b) => b.id === block.id);
          const nextExercises = existing
            ? exercises
            : groupExercises(exercises, blockDraft?.memberIds ?? [], block);
          const nextBlocks = existing
            ? blocks.map((b) => (b.id === block.id ? block : b))
            : [...blocks, block];
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

      <ExerciseSettingsSheet
        open={settingsIndex !== null}
        onClose={() => setSettingsIndex(null)}
        exercise={settingsIndex !== null ? exercises[settingsIndex] : null}
        onSave={(patch) => {
          if (settingsIndex === null) return;
          setExercises((prev) => prev.map((e, i) => (i === settingsIndex ? { ...e, ...patch } : e)));
        }}
      />
    </>
  );
};

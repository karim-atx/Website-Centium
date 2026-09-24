import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { useApp } from "../../context/AppContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { CreateRoutineSheet } from "../../components/workout/CreateRoutineSheet";
import { ExerciseSettingsSheet } from "../../components/workout/ExerciseSettingsSheet";
import { BlockCard } from "../../components/workout/BlockCard";
import { prescriptionLine } from "../../services/workout/prescription";
import { ExerciseLibrarySheet, type ExercisePick } from "../../components/workout/ExerciseLibrarySheet";
import { WorkoutSessionSheet } from "../../components/workout/WorkoutSessionSheet";
import { BrowseProgramsSheet } from "../../components/workout/BrowseProgramsSheet";
import type { Exercise, Routine, RoutineFolder, WorkoutBlock } from "../../types";
import { BlockSettingsSheet } from "../../components/workout/BlockSettingsSheet";
import {
  canGroup,
  groupIntoRuns,
  defaultBlockParams,
  groupExercises,
  moveExercise,
  newBlockId,
  pruneBlocks,
  ungroupBlock,
} from "../../services/workout/blocks";
import { setRowCount } from "../../services/workout/session";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  MoreVertical,
  Play,
  Settings2,
  Trash2,
  X,
  Pencil,
  FolderTree,
  Plus,
  Repeat,
  Pause,
  Palette,
  ArrowUp,
  ArrowDown,
  Library,
  Check,
  Group,
} from "lucide-react";

const SWIPE_THRESHOLD = 50;

let addedExId = 0;
const blankExerciseFromPick = (pick: ExercisePick): Exercise => ({
  id: `added-ex-${Date.now()}-${addedExId++}`,
  name: pick.name,
  sets: 3,
  reps: 10,
  weightKg: 20,
  muscleGroups: pick.muscleGroups,
  secondaryMuscleGroups: pick.secondaryMuscleGroups,
  classification: pick.classification,
  isCustom: pick.isCustom,
  // Carried from the pick so the save knows which library row this
  // prescribes — routine_exercises stores the reference, not the name.
  exerciseId: pick.exerciseId,
  customExerciseId: pick.customExerciseId,
});

const folderColorOptions = ["#7D6BB5", "#6F9993", "#4C8FD1", "#9C4F7C", "#D9A441", "#241F1B"];


// Colour-coded folders (master handover, CentiumTabFrame "Color-coded
// folders"): each folder is a solid bar with a darker icon tile, and its
// routines sit beneath it as rows in a lighter shade of the same hue, with a
// matching accent bar and play button. A family is those five shades.
interface FolderFamily {
  head: string;
  tile: string;
  row: string;
  bar: string;
  play: string;
}

// The two families the handover specifies, literally.
const PURPLE: FolderFamily = { head: "#A797E3", tile: "#6E56C5", row: "#F0EEFE", bar: "#7C66CF", play: "#836BD6" };
const TEAL: FolderFamily = { head: "#8ABFB5", tile: "#4B786F", row: "#EBF4F3", bar: "#61958C", play: "#63968B" };

// A folder can still be given any of the six picker colours. The handover
// only has shades for lavender and teal; the other four are DERIVED, not
// from the handover: each keeps its picker colour's hue, and takes the
// saturation step and lightness the two specified families use for each
// role on average (saturation capped at the handover's own ~58%).
const FOLDER_FAMILIES: Record<string, FolderFamily> = {
  "#7D6BB5": PURPLE,
  "#6F9993": TEAL,
  "#4C8FD1": { head: "#84B1DE", tile: "#3277BB", row: "#EBF2FA", bar: "#488BCE", play: "#4E8FD0" },
  "#9C4F7C": { head: "#DE85B9", tile: "#AE3F80", row: "#FAEBF4", bar: "#C15594", play: "#C45998" },
  "#D9A441": { head: "#DEBF84", tile: "#BB8B32", row: "#FAF5EB", bar: "#CE9F48", play: "#D0A24E" },
  "#241F1B": { head: "#C4AF9E", tile: "#8E745F", row: "#F7F2ED", bar: "#A28974", play: "#A68D78" },
};

// A folder nobody has coloured (the seeded Strength and Hypertrophy among
// them) alternates the two handover families in folder order: Strength
// purple, Hypertrophy teal. Unfiled routines take purple.
const folderFamily = (folder: RoutineFolder | undefined, order: number): FolderFamily => {
  if (folder?.color && FOLDER_FAMILIES[folder.color]) return FOLDER_FAMILIES[folder.color];
  if (!folder) return PURPLE;
  return order % 2 === 0 ? PURPLE : TEAL;
};

export default function RoutinesTab() {
  const {
    routineFolders,
    routines,
    addRoutineFolder,
    renameRoutineFolder,
    deleteRoutineFolder,
    updateRoutineFolder,
    moveRoutineFolder,
    updateRoutine,
    deleteRoutine,
    routinesError,
    pausedSessions,
    clearPausedSession,
  } = useApp();
  /**
   * The last thing a folder or routine write refused to do.
   *
   * ONE SLOT, because only one of these is ever in flight: every control here
   * is a tap that completes before the next is possible. It carries the real
   * sentence from the service — including the two the folder trigger raises,
   * ATX16 for a folder filed inside its own subtree and ATX17 for one filed
   * under another account's folder — rather than a generic failure, because
   * both describe something the user asked for that cannot be done.
   */
  const [actionError, setActionError] = useState<string | null>(null);
  // Every write goes through here, so no call site can forget to report one.
  const run = (action: Promise<string | undefined>) => {
    void action.then((message) => setActionError(message ?? null));
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [createFolder, setCreateFolder] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(folderColorOptions[0]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [menuFolderId, setMenuFolderId] = useState<string | null>(null);
  // QA 11.0: "The three dots here should show an 'edit' option, to edit
  // things like Folder Color."
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [addingSubfolderTo, setAddingSubfolderTo] = useState<string | null>(null);
  const [subfolderName, setSubfolderName] = useState("");
  const [subfolderColor, setSubfolderColor] = useState(folderColorOptions[0]);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [pendingRoutine, setPendingRoutine] = useState<Routine | null>(null);
  // QA 12.0: "Removing a routine should prompt you as confirmation before
  // deleting" — same full-screen confirm pattern as pendingRoutine above.
  const [pendingDeleteRoutine, setPendingDeleteRoutine] = useState<Routine | null>(null);
  const [settingsExercise, setSettingsExercise] = useState<{ routineId: string; exercise: Exercise } | null>(null);
  // Master handover ("Color-coded folders": "Folders now open"): every
  // folder, the seeded Strength and Hypertrophy included, starts expanded.
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const toggleFolderCollapsed = (id: string) =>
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const unfiled = routines.filter((r) => !r.folderId);
  const topLevelFolders = routineFolders.filter((f) => !f.parentId);
  const childrenOf = (parentId: string) => routineFolders.filter((f) => f.parentId === parentId);

  // V7 (QA 7.0): "No two routines can be played simultaneously" — starting
  // a routine while a different one has an ongoing (paused) session warns
  // that the old one will be cancelled entirely.
  const startRoutine = (r: Routine) => {
    const otherOngoingId = Object.keys(pausedSessions).find((id) => id !== r.id);
    if (otherOngoingId) {
      setPendingRoutine(r);
    } else {
      setActiveRoutine(r);
    }
  };

  const confirmSwitchRoutine = () => {
    if (!pendingRoutine) return;
    Object.keys(pausedSessions).forEach((id) => {
      if (id !== pendingRoutine.id) clearPausedSession(id);
    });
    setActiveRoutine(pendingRoutine);
    setPendingRoutine(null);
  };

  const closeMenu = () => setMenuFolderId(null);

  // Iteration 6 "Team" §3.1: the floating "now playing" tile above the
  // bottom nav. The dc.html markup for this screen is a compact mini-
  // player (name, "Exercise N of total · ~M min left", a single
  // pause/resume control, one thin progress bar) — CHANGE_MANIFEST.md's
  // prose describes a much larger hero with separate Resume/Discard
  // buttons and a weekly-completion strip that isn't in the markup at
  // all, so this follows the markup (the literal-spec rule in CLAUDE.md).
  const pausedRoutineId = Object.keys(pausedSessions)[0];
  const pausedRoutine = pausedRoutineId ? routines.find((r) => r.id === pausedRoutineId) : undefined;
  const pausedSession = pausedRoutineId ? pausedSessions[pausedRoutineId] : undefined;
  let resumeInfo: { routine: Routine; exerciseIndex: number; minutesLeft: number; progress: number } | null = null;
  if (pausedRoutine && pausedSession) {
    const totalExercises = pausedRoutine.exercises.length || 1;
    // setRowCount rather than `e.sets`, which is optional now and absent for
    // an exercise nobody prescribed — the progress ring would have divided by
    // the number of exercises instead of the number of sets.
    const totalSets = pausedRoutine.exercises.reduce((s, e) => s + setRowCount(e).offered, 0) || 1;
    const completedSets = pausedSession.logged.reduce((s, e) => s + e.sets.filter((set) => set.completed).length, 0);
    const doneExercises = pausedSession.logged.filter((e) => e.sets.length > 0 && e.sets.every((set) => set.completed)).length;
    const progress = Math.min(1, completedSets / totalSets);
    resumeInfo = {
      routine: pausedRoutine,
      exerciseIndex: Math.min(totalExercises, doneExercises + 1),
      minutesLeft: Math.max(1, Math.round(pausedRoutine.estimatedDurationMin * (1 - progress))),
      progress,
    };
  }

  const FolderNode: React.FC<{ folder: RoutineFolder; depth: number }> = ({ folder, depth }) => {
    const folderRoutines = routines.filter((r) => r.folderId === folder.id);
    const subfolders = childrenOf(folder.id);
    const collapsed = collapsedFolders.has(folder.id);
    // Folder order: the folder's position in the account's folder list.
    const family = folderFamily(folder, routineFolders.indexOf(folder));

    return (
      <div className="flex flex-col gap-1.5" style={{ marginLeft: depth * 16 }}>
        <div
          className="flex items-center gap-[13px] justify-between rounded-[14px]"
          style={{ background: family.head, minHeight: 54, padding: "0 14px" }}
        >
          {renamingId === folder.id ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameDraft.trim()) {
                    run(renameRoutineFolder(folder.id, renameDraft.trim()));
                    setRenamingId(null);
                  }
                }}
                className="flex-1 rounded-lg bg-cream-card border border-charcoal/10 px-2 py-1 text-sm"
              />
              <button
                onClick={() => {
                  if (renameDraft.trim()) run(renameRoutineFolder(folder.id, renameDraft.trim()));
                  setRenamingId(null);
                }}
                className="text-xs font-semibold text-primary"
              >
                Save
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => toggleFolderCollapsed(folder.id)}
                className="tap flex items-center gap-[13px] flex-1 text-left min-w-0 self-stretch"
              >
                <span
                  className="w-[33px] h-[33px] rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: family.tile }}
                >
                  <Folder size={16} style={{ color: "#FFFFFF" }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-[7px]">
                    <span className="text-[15px] font-extrabold text-white truncate">{folder.name}</span>
                    {collapsed ? (
                      <ChevronRight size={15} strokeWidth={2.4} className="shrink-0" style={{ color: "#FFFFFF" }} />
                    ) : (
                      <ChevronDown size={15} strokeWidth={2.4} className="shrink-0" style={{ color: "#FFFFFF" }} />
                    )}
                  </span>
                  <span className="block text-[11.5px] mt-px" style={{ color: "rgba(255,255,255,0.86)" }}>
                    {folderRoutines.length} {folderRoutines.length === 1 ? "routine" : "routines"}
                  </span>
                </span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setMenuFolderId(menuFolderId === folder.id ? null : folder.id)}
                  className="tap flex shrink-0"
                  style={{ color: "#FFFFFF" }}
                  aria-label={`Options for ${folder.name}`}
                >
                  <MoreVertical size={17} />
                </button>
                {menuFolderId === folder.id && (
                  <div className="absolute right-0 top-7 z-20 w-48 bg-cream-card rounded-2xl shadow-lift border border-charcoal/[0.06] overflow-hidden animate-fade-slide-up">
                    <button
                      onClick={() => {
                        setRenamingId(folder.id);
                        setRenameDraft(folder.name);
                        closeMenu();
                      }}
                      className="tap w-full flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream-soft"
                    >
                      <Pencil size={13} /> Rename
                    </button>
                    {/* QA 11.0: "The three dots here should show an 'edit'
                        option, to edit things like Folder Color, or Routine
                        color." */}
                    <button
                      onClick={() => {
                        setEditingColorId(folder.id);
                        closeMenu();
                      }}
                      className="tap w-full flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream-soft"
                    >
                      <Palette size={13} /> Edit color
                    </button>
                    {/* QA 11.0: "The folders in routines should be given the
                        option to shuffle and re-order them." */}
                    <button
                      onClick={() => {
                        run(moveRoutineFolder(folder.id, "up"));
                        closeMenu();
                      }}
                      className="tap w-full flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream-soft"
                    >
                      <ArrowUp size={13} /> Move up
                    </button>
                    <button
                      onClick={() => {
                        run(moveRoutineFolder(folder.id, "down"));
                        closeMenu();
                      }}
                      className="tap w-full flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream-soft"
                    >
                      <ArrowDown size={13} /> Move down
                    </button>
                    <button
                      onClick={() => {
                        setAddingSubfolderTo(folder.id);
                        setSubfolderName("");
                        closeMenu();
                      }}
                      className="tap w-full flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream-soft"
                    >
                      <FolderTree size={13} /> Add subfolder
                    </button>
                    <button
                      onClick={() => {
                        setCreateFolder(folder.id);
                        setCreateOpen(true);
                        closeMenu();
                      }}
                      className="tap w-full flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream-soft"
                    >
                      <Plus size={13} /> Add routine
                    </button>
                    <button
                      onClick={() => {
                        run(deleteRoutineFolder(folder.id));
                        closeMenu();
                      }}
                      className="tap w-full flex items-center gap-2 px-4 py-2.5 text-sm text-status-high hover:bg-cream-soft"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
                {editingColorId === folder.id && (
                  <div className="absolute right-0 top-7 z-20 bg-cream-card rounded-2xl shadow-lift border border-charcoal/[0.06] p-3 animate-fade-slide-up">
                    <div className="flex gap-2 mb-2">
                      {folderColorOptions.map((c) => (
                        <button
                          key={c}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            run(updateRoutineFolder(folder.id, { color: c }));
                          }}
                          aria-label={`Color ${c}`}
                          className="tap w-7 h-7 rounded-full"
                          style={{
                            background: c,
                            outline: folder.color === c ? "2px solid rgb(var(--c-charcoal))" : "none",
                            outlineOffset: 2,
                          }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setEditingColorId(null);
                      }}
                      className="tap w-full text-center text-xs font-semibold text-charcoal-soft"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="flex flex-col gap-1.5">
            {folderRoutines.map((r) => (
              <RoutineRow
                key={r.id}
                routine={r}
                onStart={() => startRoutine(r)}
                isOngoing={!!pausedSessions[r.id]}
                onDelete={() => setPendingDeleteRoutine(r)}
                onSettings={(ex) => setSettingsExercise({ routineId: r.id, exercise: ex })}
                onDeleteExercise={(exId) =>
                  run(updateRoutine(r.id, { exercises: r.exercises.filter((e) => e.id !== exId) }))
                }
                onReplaceExercise={(exId, pick) =>
                  run(updateRoutine(r.id, {
                    exercises: r.exercises.map((e) =>
                      e.id === exId
                        ? { ...e, name: pick.name, muscleGroups: pick.muscleGroups, secondaryMuscleGroups: pick.secondaryMuscleGroups, classification: pick.classification, isCustom: pick.isCustom, exerciseId: pick.exerciseId, customExerciseId: pick.customExerciseId }
                        : e
                    ),
                  }))
                }
                onAddExercise={(pick) =>
                  run(updateRoutine(r.id, { exercises: [...r.exercises, blankExerciseFromPick(pick)] }))
                }
                onArrange={(exercises, blocks) => run(updateRoutine(r.id, { exercises, blocks }))}
                family={family}
              />
            ))}

            {addingSubfolderTo === folder.id && (
              <div className="mb-2" style={{ marginLeft: 16 }}>
                <div className="flex gap-2 mb-2">
                  <input
                    autoFocus
                    value={subfolderName}
                    onChange={(e) => setSubfolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && subfolderName.trim()) {
                        run(addRoutineFolder(subfolderName.trim(), folder.id, subfolderColor));
                        setAddingSubfolderTo(null);
                      }
                    }}
                    placeholder="Subfolder name…"
                    className="flex-1 rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={() => {
                      if (subfolderName.trim()) run(addRoutineFolder(subfolderName.trim(), folder.id, subfolderColor));
                      setAddingSubfolderTo(null);
                    }}
                    className="tap px-3 rounded-xl bg-primary text-white text-sm font-semibold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex gap-2">
                  {folderColorOptions.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSubfolderColor(c)}
                      aria-label={`Color ${c}`}
                      className="tap w-6 h-6 rounded-full"
                      style={{
                        background: c,
                        outline: subfolderColor === c ? "2px solid rgb(var(--c-charcoal))" : "none",
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {subfolders.map((sf) => (
              <FolderNode key={sf.id} folder={sf} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="animate-fade-slide-up"
      onClick={() => {
        if (menuFolderId) closeMenu();
        if (editingColorId) setEditingColorId(null);
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[9.5px] font-bold tracking-[.2em] uppercase" style={{ color: "#9A94B3" }}>Folders</p>
        <button
          // Tapping it again closes the new-folder form, discarding the draft.
          onClick={() => {
            if (newFolderOpen) setNewFolderName("");
            setNewFolderOpen((v) => !v);
          }}
          title="New folder"
          aria-label="New folder"
          aria-expanded={newFolderOpen}
          className="tap w-[30px] h-[30px] rounded-[9px] flex items-center justify-center"
          style={{ color: "#6B41EF", margin: "-4px -6px -4px 0" }}
        >
          <FolderPlus size={18} />
        </button>
      </div>

      {/* TWO DIFFERENT FAILURES, SAID DIFFERENTLY. actionError is something
          the user just asked for being refused — including a folder that
          cannot go where they put it — and is worth their attention.
          routinesError means the list itself could not be refreshed, so what
          is on screen is whatever this device had saved. */}
      <div className="space-y-1.5">
        {actionError && (
          <p className="text-[11.5px] font-semibold text-status-high mb-3">{actionError}</p>
        )}
        {routinesError && !actionError && (
          <p className="text-[11.5px] font-semibold text-status-high mb-3">
            Couldn't refresh your routines — showing what was saved on this device.
          </p>
        )}
      </div>

      {newFolderOpen && (
        <div className="mb-4">
          <div className="flex gap-2 mb-2">
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFolderName.trim()) {
                  run(addRoutineFolder(newFolderName.trim(), null, newFolderColor));
                  setNewFolderName("");
                  setNewFolderOpen(false);
                }
              }}
              placeholder="Folder name…"
              className="flex-1 rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={() => {
                if (newFolderName.trim()) run(addRoutineFolder(newFolderName.trim(), null, newFolderColor));
                setNewFolderName("");
                setNewFolderOpen(false);
              }}
              className="tap px-3 rounded-xl bg-primary text-white text-sm font-semibold"
            >
              Add
            </button>
          </div>
          <div className="flex gap-2">
            {folderColorOptions.map((c) => (
              <button
                key={c}
                onClick={() => setNewFolderColor(c)}
                aria-label={`Color ${c}`}
                className="tap w-6 h-6 rounded-full"
                style={{
                  background: c,
                  outline: newFolderColor === c ? "2px solid rgb(var(--c-charcoal))" : "none",
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3.5 mb-[17px]">
        {topLevelFolders.map((folder) => (
          <FolderNode key={folder.id} folder={folder} depth={0} />
        ))}

        {unfiled.length > 0 && (
          <div>
            <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">Unfiled</p>
            <div className="flex flex-col gap-1.5">
              {unfiled.map((r) => (
                <RoutineRow
                  key={r.id}
                  routine={r}
                  onStart={() => startRoutine(r)}
                isOngoing={!!pausedSessions[r.id]}
                  onDelete={() => setPendingDeleteRoutine(r)}
                  onSettings={(ex) => setSettingsExercise({ routineId: r.id, exercise: ex })}
                  onDeleteExercise={(exId) =>
                    run(updateRoutine(r.id, { exercises: r.exercises.filter((e) => e.id !== exId) }))
                  }
                  onReplaceExercise={(exId, pick) =>
                    run(updateRoutine(r.id, {
                      exercises: r.exercises.map((e) =>
                        e.id === exId
                          ? { ...e, name: pick.name, muscleGroups: pick.muscleGroups, secondaryMuscleGroups: pick.secondaryMuscleGroups, classification: pick.classification, isCustom: pick.isCustom, exerciseId: pick.exerciseId, customExerciseId: pick.customExerciseId }
                          : e
                      ),
                    }))
                  }
                  onAddExercise={(pick) =>
                    run(updateRoutine(r.id, { exercises: [...r.exercises, blankExerciseFromPick(pick)] }))
                  }
                  onArrange={(exercises, blocks) => run(updateRoutine(r.id, { exercises, blocks }))}
                  family={PURPLE}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* NOTHING HERE YET, AND SOMEWHERE TO START. An empty routines list used
          to offer one door — build a routine from scratch — which is the
          harder of the two for someone who has never written a training
          program. The nine curated programs existed but had no way in. */}
      {routines.length === 0 && (
        <Card className="text-center py-7 mb-4">
          <p className="text-sm font-semibold text-charcoal mb-1">No routines yet</p>
          <p className="text-[12.5px] text-charcoal-soft mb-4 px-4 leading-relaxed">
            Start from a ready-made program and change whatever you like, or build your own from
            scratch.
          </p>
          <Button size="sm" onClick={() => setBrowseOpen(true)}>
            <Library size={14} /> Browse starter programs
          </Button>
        </Card>
      )}

      {/* Master handover (CentiumTabFrame "Color-coded folders"): a 54px
          lavender "Create routine" and a 50px outlined "Browse starter
          programs", 9px apart. */}
      <div className="flex flex-col gap-[9px]">
        <button
          onClick={() => {
            setCreateFolder(null);
            setCreateOpen(true);
          }}
          className="tap w-full h-[54px] flex items-center justify-center gap-[9px] rounded-[14px] text-[14.5px] font-bold"
          style={{ background: "#EFEEFD", color: "#6B41EF" }}
        >
          <Plus size={17} /> Create routine
        </button>
        {routines.length > 0 && (
          <button
            onClick={() => setBrowseOpen(true)}
            className="tap w-full h-[50px] flex items-center justify-center gap-[9px] rounded-[14px] bg-white text-[14px] font-bold text-charcoal"
            style={{ border: "1px solid rgba(143,104,246,0.28)" }}
          >
            <Library size={17} style={{ color: "#5B5349" }} /> Browse starter programs
          </button>
        )}
      </div>

      <CreateRoutineSheet open={createOpen} onClose={() => setCreateOpen(false)} folderId={createFolder} />

      <BrowseProgramsSheet open={browseOpen} onClose={() => setBrowseOpen(false)} />

      <ExerciseSettingsSheet
        open={!!settingsExercise}
        onClose={() => setSettingsExercise(null)}
        exercise={settingsExercise?.exercise ?? null}
        routineId={settingsExercise?.routineId ?? null}
        onSave={(patch) => {
          if (!settingsExercise) return;
          const routine = routines.find((r) => r.id === settingsExercise.routineId);
          if (!routine) return;
          run(updateRoutine(routine.id, {
            exercises: routine.exercises.map((e) =>
              e.id === settingsExercise.exercise.id ? { ...e, ...patch } : e
            ),
          }));
        }}
        onDelete={() => {
          if (!settingsExercise) return;
          const routine = routines.find((r) => r.id === settingsExercise.routineId);
          if (!routine) return;
          run(updateRoutine(routine.id, {
            exercises: routine.exercises.filter((e) => e.id !== settingsExercise.exercise.id),
          }));
        }}
      />

      {activeRoutine && (
        <WorkoutSessionSheet
          open={!!activeRoutine}
          onClose={() => setActiveRoutine(null)}
          routineId={activeRoutine.id}
          routineName={activeRoutine.name}
          exercises={activeRoutine.exercises}
          blocks={activeRoutine.blocks}
          coachNote={activeRoutine.coachNote}
        />
      )}

      {/* QA 13.0: "When deleting a routine the dark blur behind the prompt
          is cut for some reason, please fix." This component's root carries
          `animate-fade-slide-up`, a transform-based animation — any
          non-none `transform` on an ancestor becomes the containing block
          for descendant `position: fixed` elements, clipping the backdrop
          to this component's box instead of the viewport. Portaling to
          `document.body` sidesteps the ancestor chain, same fix already
          applied to BottomSheet.tsx for the identical bug. */}
      {pendingRoutine &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div
              className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px] animate-fade-in"
              onClick={() => setPendingRoutine(null)}
            />
            <div className="relative w-full max-w-xs bg-cream rounded-3xl shadow-lift p-5 animate-pop">
              <p className="font-display font-semibold text-lg text-charcoal mb-1.5">Cancel ongoing routine?</p>
              <p className="text-sm text-charcoal-soft mb-5">
                Starting "{pendingRoutine.name}" will cancel your other ongoing routine entirely — its
                progress won't be saved.
              </p>
              <div className="flex gap-2.5">
                <Button variant="outline" fullWidth onClick={() => setPendingRoutine(null)}>
                  Keep going
                </Button>
                <Button fullWidth variant="teal" onClick={confirmSwitchRoutine}>
                  Start anyway
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {pendingDeleteRoutine &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div
              className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px] animate-fade-in"
              onClick={() => setPendingDeleteRoutine(null)}
            />
            <div className="relative w-full max-w-xs bg-cream rounded-3xl shadow-lift p-5 animate-pop">
              <p className="font-display font-semibold text-lg text-charcoal mb-1.5">Delete routine?</p>
              <p className="text-sm text-charcoal-soft mb-5">
                "{pendingDeleteRoutine.name}" and its exercises will be permanently removed. This can't be
                undone.
              </p>
              <div className="flex gap-2.5">
                <Button variant="outline" fullWidth onClick={() => setPendingDeleteRoutine(null)}>
                  Keep it
                </Button>
                <Button
                  fullWidth
                  variant="teal"
                  onClick={() => {
                    run(deleteRoutine(pendingDeleteRoutine.id));
                    setPendingDeleteRoutine(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {resumeInfo &&
        createPortal(
          <button
            onClick={() => startRoutine(resumeInfo!.routine)}
            className="tap fixed left-7 right-7 z-30 rounded-2xl bg-[#241F1B] px-[11px] py-[9px] text-left shadow-[0_10px_26px_rgba(0,0,0,0.22)]"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)" }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0"
                style={{ background: "var(--gradient-teal-hero)" }}
              >
                <img src="/icon-workFilled-white.png" alt="" className="w-[18px] h-[18px] object-contain block" />
              </span>
              <span className="flex-1 min-w-0 block">
                <span className="block text-[12px] font-bold tracking-[-0.01em] text-white whitespace-nowrap overflow-hidden text-ellipsis">
                  {resumeInfo.routine.name}
                </span>
                <span className="block mt-0.5 text-[9.5px] font-medium text-white/[0.58]">
                  Exercise {resumeInfo.exerciseIndex} of {resumeInfo.routine.exercises.length} · {resumeInfo.minutesLeft} min left
                </span>
              </span>
              <span className="w-[30px] h-[30px] rounded-full bg-teal flex items-center justify-center shrink-0">
                <Pause size={13} className="text-[#1D3B37]" fill="currentColor" />
              </span>
            </div>
            <div className="mt-2 h-0.5 rounded-full bg-white/[0.18] overflow-hidden">
              <div className="h-full bg-teal" style={{ width: `${Math.max(4, resumeInfo.progress * 100)}%` }} />
            </div>
          </button>,
          document.body
        )}
    </div>
  );
}

/**
 * One row's selection tick, during grouping.
 *
 * DISABLED FOR A ROW ALREADY IN A BLOCK rather than hidden, so the reason is
 * visible: you ungroup before you regroup, and a tick that simply was not
 * there would read as a bug.
 */
const SelectBox: React.FC<{
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}> = ({ checked, disabled, onChange, label }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    role="checkbox"
    aria-checked={checked}
    aria-label={`Select ${label}`}
    className="tap flex items-center justify-center shrink-0"
    style={{
      width: 20,
      height: 20,
      borderRadius: 6,
      border: `2px solid ${disabled ? "#D6D2CB" : checked ? "#AEA1DC" : "rgba(36,31,27,0.2)"}`,
      background: checked ? "#AEA1DC" : "transparent",
    }}
  >
    {checked && <Check size={12} strokeWidth={3} style={{ color: "#FFFFFF" }} />}
  </button>
);

const RoutineRow: React.FC<{
  routine: Routine;
  onStart: () => void;
  onDelete: () => void;
  onSettings: (ex: Exercise) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onReplaceExercise: (exerciseId: string, pick: ExercisePick) => void;
  onAddExercise: (pick: ExercisePick) => void;
  /** Rewrites the whole arrangement — order and grouping travel together. */
  onArrange: (exercises: Exercise[], blocks: WorkoutBlock[]) => void;
  /** The colours of the folder this routine sits in. */
  family: FolderFamily;
  isOngoing?: boolean;
}> = ({ routine, onStart, onDelete, onSettings, onDeleteExercise, onReplaceExercise, onAddExercise, onArrange, family, isOngoing }) => {
  const [expanded, setExpanded] = useState(false);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // --- grouping -------------------------------------------------------------
  //
  // SELECTION IS A MODE, entered on purpose. Adding a checkbox to every row all
  // the time would put a second meaning on a list whose rows already open an
  // editor, and grouping is not something anybody does by accident.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  /** The block being created or edited, and the members it will hold. */
  const [blockDraft, setBlockDraft] = useState<{ block: WorkoutBlock; memberIds: string[] } | null>(null);
  const [groupProblem, setGroupProblem] = useState<string | null>(null);

  const blocks = routine.blocks ?? [];

  const exitSelecting = () => {
    setSelecting(false);
    setSelected([]);
    setGroupProblem(null);
  };

  const startGrouping = () => {
    const check = canGroup(routine.exercises, selected);
    if (!check.ok) {
      setGroupProblem(check.message);
      return;
    }
    setGroupProblem(null);
    setBlockDraft({
      block: { id: newBlockId(), kind: "superset", ...defaultBlockParams("superset") },
      memberIds: [...selected],
    });
  };

  /** Saves a block — new or edited — and the membership that goes with it. */
  const commitBlock = (block: WorkoutBlock, memberIds: string[]) => {
    const existing = blocks.some((b) => b.id === block.id);
    const nextExercises = existing
      ? routine.exercises
      : groupExercises(routine.exercises, memberIds, block);
    const nextBlocks = existing
      ? blocks.map((b) => (b.id === block.id ? block : b))
      : [...blocks, block];
    onArrange(nextExercises, pruneBlocks(nextExercises, nextBlocks));
    exitSelecting();
  };

  const ungroup = (blockId: string) => {
    const nextExercises = ungroupBlock(routine.exercises, blockId);
    onArrange(nextExercises, pruneBlocks(nextExercises, blocks));
    exitSelecting();
  };

  /**
   * One step up or down, refused rather than fudged when it would break a
   * block. moveExercise returns the same array when the move is unavailable,
   * which is also what disables the control.
   */
  const move = (exerciseId: string, direction: "up" | "down") => {
    const next = moveExercise(routine.exercises, exerciseId, direction);
    if (next === routine.exercises) return;
    onArrange(next, blocks);
  };

  const canMove = (exerciseId: string, direction: "up" | "down") =>
    moveExercise(routine.exercises, exerciseId, direction) !== routine.exercises;

  // Swipe-left on an exercise row reveals Replace/Delete, Apple-UI style —
  // same pattern as the Food diary's swipe-to-delete.
  const onRowTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onRowTouchEnd = (e: React.TouchEvent, exId: string) => {
    if (!touchStart.current) return;
    e.stopPropagation();
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (dx < -SWIPE_THRESHOLD && Math.abs(dy) < 40) {
      setRevealedId(exId);
    } else if (dx > SWIPE_THRESHOLD) {
      setRevealedId(null);
    }
  };

  /** The up/down pair, shown on every row so order is editable at all. */
  const MoveControls: React.FC<{ exerciseId: string }> = ({ exerciseId }) => (
    <span className="flex shrink-0" style={{ gap: 2 }}>
      {(["up", "down"] as const).map((direction) => {
        const enabled = canMove(exerciseId, direction);
        const Icon = direction === "up" ? ArrowUp : ArrowDown;
        return (
          <button
            key={direction}
            onClick={() => move(exerciseId, direction)}
            disabled={!enabled}
            aria-label={`Move ${direction}`}
            className="tap flex items-center justify-center"
            style={{ width: 22, height: 22, color: enabled ? "#8C8378" : "#D6D2CB" }}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </span>
  );

  /** A member's row action: select it, or reorder and open its settings. */
  const memberAction = (ex: Exercise) =>
    selecting ? (
      <SelectBox
        checked={selected.includes(ex.id)}
        disabled={!!ex.blockId}
        onChange={() =>
          setSelected((prev) =>
            prev.includes(ex.id) ? prev.filter((id) => id !== ex.id) : [...prev, ex.id]
          )
        }
        label={ex.name}
      />
    ) : (
      <span className="flex items-center shrink-0" style={{ gap: 2 }}>
        <MoveControls exerciseId={ex.id} />
        <button
          onClick={() => onSettings(ex)}
          aria-label={`Settings for ${ex.name}`}
          className="tap text-charcoal-faint"
        >
          <Settings2 size={14} />
        </button>
      </span>
    );

  return (
    // Master handover (CentiumTabFrame "Color-coded folders"): a 54px row in
    // the lighter shade of its folder's hue, with the folder's accent bar
    // and play button. An ongoing (paused) routine keeps its coral pulse.
    <div className="rounded-[14px] overflow-hidden" style={{ background: family.row }}>
      <div className="flex items-center gap-[13px] min-h-[54px]" style={{ padding: "0 14px 0 0" }}>
        <span
          className={clsx("w-1 h-8 rounded-full shrink-0 block", isOngoing && "animate-pulse")}
          style={{ marginLeft: 15, background: isOngoing ? "#E9736A" : family.bar }}
        />
        <button onClick={() => setExpanded((v) => !v)} className="flex-1 text-left min-w-0">
          <p className="text-[14.5px] font-bold text-charcoal flex items-center gap-1.5 truncate">
            {routine.name}
            {isOngoing && (
              <span className="text-[10px] font-bold uppercase text-[#E9736A] flex items-center gap-1 shrink-0">
                <Pause size={10} fill="currentColor" /> Ongoing
              </span>
            )}
          </p>
          <p className="text-[11.5px] mt-0.5" style={{ color: "#8C8378" }}>
            {routine.exercises.length} exercises • ~{routine.estimatedDurationMin} min
          </p>
        </button>
        <button
          onClick={onStart}
          aria-label={isOngoing ? `Resume ${routine.name}` : `Start ${routine.name}`}
          className={clsx("tap w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0", isOngoing && "animate-pulse")}
          style={{ background: isOngoing ? "#E9736A" : family.play }}
        >
          {isOngoing ? (
            <Pause size={13} fill="#FFFFFF" style={{ color: "#FFFFFF" }} />
          ) : (
            <Play size={13} fill="#FFFFFF" style={{ color: "#FFFFFF", marginLeft: 1 }} />
          )}
        </button>
        <button onClick={onDelete} aria-label={`Remove ${routine.name}`} className="tap flex shrink-0" style={{ color: "#8C8378" }}>
          <X size={16} />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-charcoal/[0.06]">
          {/* GROUPING IS A MODE, entered here. The rows already open an
              editor on tap, so a permanent checkbox column would give every
              row two meanings; and nobody groups a superset by accident. */}
          <div
            className="flex items-center justify-between bg-cream-card px-4 py-2"
            style={{ borderBottom: "1px solid rgba(36,31,27,0.05)" }}
          >
            {selecting ? (
              <>
                <span className="text-[11px] text-charcoal-faint">
                  {selected.length === 0
                    ? "Pick exercises that sit next to each other."
                    : `${selected.length} selected`}
                </span>
                <span className="flex items-center" style={{ gap: 12 }}>
                  <button onClick={exitSelecting} className="tap text-[11.5px] font-semibold text-charcoal-soft">
                    Cancel
                  </button>
                  <button
                    onClick={startGrouping}
                    disabled={selected.length < 2}
                    className="tap text-[11.5px] font-semibold"
                    style={{ color: selected.length < 2 ? "#C9C2B8" : "#5F5093" }}
                  >
                    Group as…
                  </button>
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] text-charcoal-faint">
                  {routine.exercises.length}{" "}
                  {routine.exercises.length === 1 ? "exercise" : "exercises"}
                  {blocks.length > 0 && ` · ${blocks.length} ${blocks.length === 1 ? "block" : "blocks"}`}
                </span>
                <button
                  onClick={() => setSelecting(true)}
                  disabled={routine.exercises.length < 2}
                  className="tap flex items-center gap-1 text-[11.5px] font-semibold"
                  style={{ color: routine.exercises.length < 2 ? "#C9C2B8" : "#5F5093" }}
                >
                  <Group size={13} /> Group
                </button>
              </>
            )}
          </div>
          {groupProblem && (
            <p className="text-[11px] text-status-high bg-status-high-bg px-4 py-2">{groupProblem}</p>
          )}
          {/* GROUPED FOR RENDERING, FLAT UNDERNEATH. `position` is still the
              order and the contiguity rule still governs it; groupIntoRuns
              only walks consecutive members into runs, so a grouping the
              database would refuse shows as two cards rather than looking
              fine. */}
          {groupIntoRuns(routine.exercises, routine.blocks ?? []).map((run, runIdx) =>
            run.block ? (
              <BlockCard
                key={run.block.id}
                block={run.block}
                ordinal={run.ordinal}
                members={run.members}
                renderMemberAction={memberAction}
                onHeaderClick={() =>
                  setBlockDraft({
                    block: run.block!,
                    memberIds: run.members.map((m) => m.id),
                  })
                }
              />
            ) : (
              <div key={`solo-${runIdx}`} className="divide-y divide-charcoal/[0.04]">
                {run.members.map((ex) => {
                  const revealed = revealedId === ex.id;
                  const line = prescriptionLine(ex);
                  return (
                    <div key={ex.id} className="relative overflow-hidden">
                      {revealed && (
                        <div className="absolute inset-y-0 right-0 flex items-stretch z-0">
                          <button
                            onClick={() => setReplaceTarget(ex.id)}
                            aria-label={`Replace ${ex.name}`}
                            className="tap w-16 flex flex-col items-center justify-center gap-0.5 bg-primary text-white text-[10px] font-semibold"
                          >
                            <Repeat size={14} />
                            Replace
                          </button>
                          <button
                            onClick={() => {
                              onDeleteExercise(ex.id);
                              setRevealedId(null);
                            }}
                            aria-label={`Delete ${ex.name}`}
                            className="tap w-16 flex flex-col items-center justify-center gap-0.5 bg-[#C0392B] text-white text-[10px] font-semibold"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                      <div
                        onTouchStart={onRowTouchStart}
                        onTouchEnd={(ev) => onRowTouchEnd(ev, ex.id)}
                        onClick={() => revealed && setRevealedId(null)}
                        className="relative z-10 flex items-center justify-between px-4 py-2.5 bg-cream-card transition-transform duration-200"
                        style={{ transform: revealed ? "translateX(-128px)" : "translateX(0)" }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-charcoal">{ex.name}</p>
                          {/* Was `{sets} × {reps} · {weightKg}kg`, which showed
                              three of the twenty columns a prescription carries
                              and rendered a coach's 3–5 × 8–12 @ 75% as
                              "3 × 8 · 0kg". */}
                          {line && <p className="text-[11px] text-charcoal-faint">{line}</p>}
                        </div>
                        {memberAction(ex)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
          <button
            onClick={() => setAddExerciseOpen(true)}
            className="tap w-full flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-semibold text-primary bg-cream-card hover:bg-primary-pale/40"
          >
            <Plus size={13} /> Add exercise
          </button>
        </div>
      )}

      <BlockSettingsSheet
        key={blockDraft?.block.id ?? "none"}
        open={!!blockDraft}
        onClose={() => setBlockDraft(null)}
        block={blockDraft?.block ?? null}
        memberCount={blockDraft?.memberIds.length ?? 0}
        onSave={(block) => commitBlock(block, blockDraft?.memberIds ?? [])}
        onUngroup={
          blockDraft && blocks.some((b) => b.id === blockDraft.block.id)
            ? () => ungroup(blockDraft.block.id)
            : undefined
        }
      />

      <ExerciseLibrarySheet
        open={!!replaceTarget}
        onClose={() => setReplaceTarget(null)}
        onPick={(pick) => {
          if (replaceTarget) onReplaceExercise(replaceTarget, pick);
          setReplaceTarget(null);
          setRevealedId(null);
        }}
        alreadyAdded={[]}
      />

      <ExerciseLibrarySheet
        open={addExerciseOpen}
        onClose={() => setAddExerciseOpen(false)}
        onPick={(pick) => {
          onAddExercise(pick);
          setAddExerciseOpen(false);
        }}
        alreadyAdded={routine.exercises.map((e) => e.name)}
      />
    </div>
  );
};

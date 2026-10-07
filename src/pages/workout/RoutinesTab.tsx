import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { useApp } from "../../context/AppContext";
import { CyclePhaseStrip } from "../../components/cycle/CyclePhaseStrip";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { Button } from "../../components/ui/Button";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { SwipeActions } from "../../components/ui/SwipeActions";
import { CreateRoutineSheet } from "../../components/workout/CreateRoutineSheet";
import { ExerciseSettingsSheet } from "../../components/workout/ExerciseSettingsSheet";
import { BlockCard } from "../../components/workout/BlockCard";
import { prescriptionLine } from "../../services/workout/prescription";
import { ExerciseLibrarySheet, type ExercisePick } from "../../components/workout/ExerciseLibrarySheet";
import { WorkoutSessionSheet } from "../../components/workout/WorkoutSessionSheet";
import { BrowseProgramsSheet } from "../../components/workout/BrowseProgramsSheet";
import type { Exercise, Routine, RoutineFolder, WorkoutBlock } from "../../types";
import { folderFamily, mixHex, routineFamily, themedFamily, tintOn, type FolderFamily } from "../../data/folderColors";
import { useIsDark } from "../../hooks/useIsDark";

/**
 * Mobile v5.1 R3, dark mode (no light islands): routine rows and folder
 * headers take themedFamily's dark shades; the colours below are the rest, as
 * [light, dark]. The new-folder glyph and ongoing coral are lifted to read on
 * the dark page and rows (3:1 and 4.5:1); the select box's checked fill is the
 * dark primary with a near-black tick, as dark filled controls are.
 */
const ROUTINE_COLORS = {
  newFolder: ["rgb(var(--th-6b41ef))", "rgb(var(--th-9a8cd6))"],
  // Restore round 2 (user, 2026-10-07): the ongoing / paused routine coral, as on main.
  ongoing: ["#E9736A", "#EE8A82"],
  meta: ["#8C8378", "#B8B3C7"],
  checked: ["rgb(var(--th-aea1dc))", "rgb(var(--th-9a8cd6))"],
  tick: ["#FFFFFF", "#121317"],
  off: ["#D6D2CB", "#4A4D57"],
} as const;
const rc = (key: keyof typeof ROUTINE_COLORS, dark: boolean): string => ROUTINE_COLORS[key][dark ? 1 : 0];
import { ColorPopover, ColorSwatches, FolderHeader, InsertionLine, Placeholder, RenameField } from "../../components/folders/FolderParts";
import { folderColorOptions, withPlaceholder } from "../../components/folders/folderList";
import { BlockSettingsSheet } from "../../components/workout/BlockSettingsSheet";
import { moveId, routinesIn } from "../../services/routines/order";
import { useRoutineDrag, type DragItem, type DropTarget } from "./useRoutineDrag";
import { MAX_DEPTH_NOTE, canAddSubfolder, canMoveFolder } from "../../services/routines/folderDepth";
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
import {
  Copy,
  FolderPlus,
  GripVertical,
  MoreVertical,
  Play,
  Settings2,
  Trash2,
  Pencil,
  FolderTree,
  Plus,
  Repeat,
  Pause,
  Dumbbell,
  Palette,
  ArrowUp,
  ArrowDown,
  Library,
  Check,
  Group,
} from "lucide-react";


let addedExId = 0;
const blankExerciseFromPick = (pick: ExercisePick): Exercise => ({
  id: `added-ex-${Date.now()}-${addedExId++}`,
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


// Folder colour families live in data/folderColors (handover 2026-09-29 02),
// shared with the logger and History.

// WO1.1 menus, on the shared popup (02 "Popup / dropdown": row/folder ⋮ menus).
type FolderAction = "rename" | "color" | "duplicate" | "subfolder" | "routine" | "delete";
type RoutineAction = "rename" | "duplicate" | "delete";
const MENU_ICON = 15;
const FOLDER_MENU: { value: FolderAction; label: string; icon: React.ReactNode; destructive?: boolean }[] = [
  { value: "rename", label: "Rename", icon: <Pencil size={MENU_ICON} /> },
  { value: "color", label: "Edit color", icon: <Palette size={MENU_ICON} /> },
  { value: "duplicate", label: "Duplicate", icon: <Copy size={MENU_ICON} /> },
  { value: "subfolder", label: "Add subfolder", icon: <FolderTree size={MENU_ICON} /> },
  { value: "routine", label: "Add routine", icon: <Plus size={MENU_ICON} /> },
  { value: "delete", label: "Delete", icon: <Trash2 size={MENU_ICON} />, destructive: true },
];
const ROUTINE_MENU: { value: RoutineAction; label: string; icon: React.ReactNode; destructive?: boolean }[] = [
  { value: "rename", label: "Rename", icon: <Pencil size={MENU_ICON} /> },
  { value: "duplicate", label: "Duplicate", icon: <Copy size={MENU_ICON} /> },
  { value: "delete", label: "Delete", icon: <Trash2 size={MENU_ICON} />, destructive: true },
];

export default function RoutinesTab() {
  const {
    routineFolders,
    routines,
    addRoutineFolder,
    renameRoutineFolder,
    deleteRoutineFolder,
    updateRoutineFolder,
    reorderRoutineFolders,
    moveRoutineFolder,
    placeRoutine,
    duplicateRoutine,
    duplicateRoutineFolder,
    updateRoutine,
    deleteRoutine,
    routinesError,
    pausedSessions,
    clearPausedSession,
    activeSession,
    setActiveSession,
  } = useApp();
  const dark = useIsDark();
  // WO17: the ONGOING row mirrors the bar. A minimised session can be paused
  // and resumed from here; the clock is timestamps (startedAt, pausedAt,
  // pausedMs), so the logger and the bar read the same state back.
  // Restore round 2 (user, 2026-10-07): the row's ongoing / paused state and
  // its pause are back, as on main.
  const pauseActive = () =>
    setActiveSession((a) => (a && a.status === "running" ? { ...a, status: "paused", pausedAt: new Date().toISOString() } : a));
  const resumeActive = () =>
    setActiveSession((a) =>
      a && a.status === "paused"
        ? {
            ...a,
            status: "running",
            pausedMs: a.pausedMs + (a.pausedAt ? Math.max(0, Date.now() - Date.parse(a.pausedAt)) : 0),
            pausedAt: null,
          }
        : a
    );
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
  // A folder or a routine being renamed in place (ids are unique across both).
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [menu, setMenu] = useState<{ kind: "folder" | "routine"; id: string; anchor: HTMLElement } | null>(null);
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

  const siblingsOf = (parentId: string | null) => routineFolders.filter((f) => (f.parentId ?? null) === parentId);
  const unfiled = routinesIn(routines, null);

  // --- WO1.1 drag and drop ----------------------------------------------------
  const listRef = useRef<HTMLDivElement>(null);
  const onDrop = (item: DragItem, target: DropTarget) => {
    if (item.kind === "routine") {
      if (target.kind === "header") run(placeRoutine(item.id, target.folderId, Number.MAX_SAFE_INTEGER));
      else if (target.kind === "group") run(placeRoutine(item.id, target.folderId, target.index));
    } else if (target.kind === "into") {
      run(moveRoutineFolder(item.id, target.folderId, Number.MAX_SAFE_INTEGER));
    } else if (target.kind === "folders") {
      if (target.parentId === item.parentId) {
        const ids = siblingsOf(item.parentId).map((f) => f.id);
        const next = moveId(ids, item.id, target.index);
        if (next.some((id, i) => id !== ids[i])) run(reorderRoutineFolders(item.parentId, next));
      } else run(moveRoutineFolder(item.id, target.parentId, target.index));
    }
  };
  // Five levels deep at most, never into itself (folderDepth).
  const canNest = (folderId: string, parentId: string | null) => canMoveFolder(folderId, parentId, routineFolders);
  const { drag, pressProps, gripProps, onClickCapture } = useRoutineDrag(listRef, onDrop, canNest);
  const draggingRoutine = drag?.item.kind === "routine" ? drag.item.id : null;
  const draggingFolder = drag?.item.kind === "folder" ? drag.item.id : null;

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

  const onFolderAction = (folder: RoutineFolder, action: FolderAction) => {
    if (action === "rename") {
      setRenamingId(folder.id);
      setRenameDraft(folder.name);
    } else if (action === "color") setEditingColorId(folder.id);
    else if (action === "duplicate") run(duplicateRoutineFolder(folder.id));
    else if (action === "subfolder") {
      setAddingSubfolderTo(folder.id);
      setSubfolderName("");
    } else if (action === "routine") {
      setCreateFolder(folder.id);
      setCreateOpen(true);
    } else run(deleteRoutineFolder(folder.id));
  };

  const onRoutineAction = (routine: Routine, action: RoutineAction) => {
    if (action === "rename") {
      setRenamingId(routine.id);
      setRenameDraft(routine.name);
    } else if (action === "duplicate") run(duplicateRoutine(routine.id));
    else setPendingDeleteRoutine(routine);
  };

  const commitRename = (kind: "folder" | "routine", id: string) => {
    const name = renameDraft.trim();
    if (name) run(kind === "folder" ? renameRoutineFolder(id, name) : updateRoutine(id, { name }));
    setRenamingId(null);
  };

  const renderRoutine = (r: Routine, index: number, family: FolderFamily, hidden: boolean) => (
    <RoutineRow
      key={r.id}
      routine={r}
      hidden={hidden}
      onStart={() =>
        // A minimised session that is paused resumes its clock here; anything
        // else (a quit session, or a new start) opens the logger as before.
        activeSession?.routineId === r.id && activeSession.status === "paused" ? resumeActive() : startRoutine(r)
      }
      isOngoing={!!pausedSessions[r.id]}
      running={activeSession?.routineId === r.id && activeSession.status === "running"}
      onPause={pauseActive}
      onMenu={(anchor) => setMenu({ kind: "routine", id: r.id, anchor })}
      renaming={renamingId === r.id}
      renameDraft={renameDraft}
      onRenameDraft={setRenameDraft}
      onRenameCommit={() => commitRename("routine", r.id)}
      press={pressProps({ kind: "routine", id: r.id, folderId: r.folderId, index }, renamingId !== r.id)}
      grip={gripProps({ kind: "routine", id: r.id, folderId: r.folderId, index })}
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
  );

  /** A folder's routines (or Unfiled's), with the drop placeholder while dragging. */
  const renderGroup = (folderId: string | null, familyOf: (r: Routine) => FolderFamily) => {
    const group = routinesIn(routines, folderId);
    const at =
      drag?.item.kind === "routine" && drag.target.kind === "group" && drag.target.folderId === folderId
        ? drag.target.index
        : null;
    const rest = group.filter((r) => r.id !== draggingRoutine);
    return withPlaceholder(group, draggingRoutine, at).map((entry) =>
      entry.kind === "placeholder" ? (
        <Placeholder key="placeholder" gap={6} />
      ) : (
        renderRoutine(entry.item, entry.hidden ? group.indexOf(entry.item) : rest.indexOf(entry.item), familyOf(entry.item), entry.hidden)
      )
    );
  };

  /** A sibling group of folders, with the drop placeholder while a folder is dragged. */
  const renderFolders = (parentId: string | null, depth: number) => {
    const siblings = siblingsOf(parentId);
    const at =
      drag?.item.kind === "folder" && drag.target.kind === "folders" && drag.target.parentId === parentId
        ? drag.target.index
        : null;
    const rest = siblings.filter((f) => f.id !== draggingFolder);
    return withPlaceholder(siblings, draggingFolder, at).map((entry) =>
      entry.kind === "placeholder" ? (
        <Placeholder key="placeholder" gap={parentId === null ? 14 : 6} />
      ) : (
        renderFolder(entry.item, depth, entry.hidden ? siblings.indexOf(entry.item) : rest.indexOf(entry.item), entry.hidden)
      )
    );
  };

  // A render function, not a component defined in here: a component created
  // during render remounts its whole subtree on every render, which would drop
  // a drag (and every routine's expanded state) on each pointer move.
  const renderFolder = (folder: RoutineFolder, depth: number, index: number, hidden: boolean): React.ReactNode => {
    const folderRoutines = routinesIn(routines, folder.id);
    const collapsed = collapsedFolders.has(folder.id);
    // Folder order: the folder's position in the account's folder list.
    const family = themedFamily(folderFamily(folder, routineFolders.indexOf(folder)), dark);
    const item: DragItem = { kind: "folder", id: folder.id, parentId: folder.parentId ?? null, index };

    return (
      <div
        key={folder.id}
        data-dnd-folder-block
        data-flip={`f:${folder.id}`}
        className="flex flex-col gap-1.5"
        style={{ marginLeft: depth * 16, display: hidden ? "none" : undefined }}
      >
        <FolderHeader
          folder={folder}
          family={family}
          // WO1 #4b / WO1.1 #4 (decision 23): white ink as drawn.
          drawnInk
          count={folderRoutines.length}
          collapsed={collapsed}
          highlighted={(drag?.target.kind === "header" || drag?.target.kind === "into") && drag.target.folderId === folder.id}
          onToggle={() => toggleFolderCollapsed(folder.id)}
          onMenu={(anchor) => setMenu({ kind: "folder", id: folder.id, anchor })}
          renaming={renamingId === folder.id}
          renameDraft={renameDraft}
          onRenameDraft={setRenameDraft}
          onRenameCommit={() => commitRename("folder", folder.id)}
          press={pressProps(item, renamingId !== folder.id)}
          grip={gripProps(item)}
          colorEditor={
            editingColorId === folder.id && (
              <ColorPopover
                value={folder.color}
                onPick={(c) => run(updateRoutineFolder(folder.id, { color: c }))}
                onDone={() => setEditingColorId(null)}
              />
            )
          }
        />

        {!collapsed && (
          <div className="flex flex-col gap-1.5">
            <div data-dnd-group={folder.id} className="flex flex-col gap-1.5">
              {renderGroup(folder.id, () => family)}
            </div>

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
                    className="tap px-3 rounded-xl bg-primary-fill text-on-primary-fill text-sm font-semibold"
                  >
                    Add
                  </button>
                </div>
                <ColorSwatches value={subfolderColor} onPick={setSubfolderColor} size={24} />
              </div>
            )}

            <div data-dnd-folders={folder.id} className="flex flex-col gap-1.5 empty:hidden">
              {renderFolders(folder.id, depth + 1)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const menuFolder = menu?.kind === "folder" ? routineFolders.find((f) => f.id === menu.id) : undefined;
  const menuRoutine = menu?.kind === "routine" ? routines.find((r) => r.id === menu.id) : undefined;
  const dragFolder = draggingFolder ? routineFolders.find((f) => f.id === draggingFolder) : undefined;
  const dragRoutine = draggingRoutine ? routines.find((r) => r.id === draggingRoutine) : undefined;

  return (
    <div
      className="animate-fade-slide-up"
      onClick={() => {
        if (editingColorId) setEditingColorId(null);
      }}
    >
      {/* PAGE-LEVEL, which is why it is here and not in the three-dots menu:
          that menu belongs to one folder, and a cycle phase is a property of
          the person and the day. This row is the only slot in the tab with
          global scope. Restore round 2 (user, 2026-10-07): main's gating
          again; the strip itself shows the cycle phase (cycle offered,
          tracker on) or the pregnancy guidance (cycle offered, a pregnancy). */}
      <CyclePhaseStrip />

      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[9.5px] font-bold tracking-[.2em] uppercase" style={{ color: "rgb(var(--thi-9a94b3))" }}>Folders</p>
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
          style={{ color: rc("newFolder", dark), margin: "-4px -6px -4px 0" }}
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
            Couldn't refresh your routines. Showing what was saved on this device.
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
              className="tap px-3 rounded-xl bg-primary-fill text-on-primary-fill text-sm font-semibold"
            >
              Add
            </button>
          </div>
          <ColorSwatches value={newFolderColor} onPick={setNewFolderColor} size={24} />
        </div>
      )}

      <div ref={listRef} onClickCapture={onClickCapture} className="flex flex-col gap-3.5 mb-[17px]">
        <div data-dnd-folders="" className="flex flex-col gap-3.5 empty:hidden">
          {renderFolders(null, 0)}
        </div>

        {/* Shown while a routine is dragged even when empty, so a routine
            can be dropped out of every folder. */}
        {(unfiled.length > 0 || draggingRoutine) && (
          <div data-flip="unfiled">
            {/* Decision 23 (kept item 135): styled as the "Folders" label (9.5/700 #9A94B3 .2em). */}
            <p className="mb-[9px] text-[9.5px] font-bold tracking-[.2em] uppercase" style={{ color: "rgb(var(--thi-9a94b3))" }}>Unfiled</p>
            <div
              data-dnd-group=""
              className="flex flex-col gap-1.5"
              style={
                draggingRoutine &&
                unfiled.every((r) => r.id === draggingRoutine) &&
                !(drag?.target.kind === "group" && drag.target.folderId === null)
                  ? { minHeight: 54, borderRadius: 14, border: "1.5px dashed rgb(var(--c-charcoal) / 0.14)" }
                  : undefined
              }
            >
              {renderGroup(null, (r) => themedFamily(routineFamily(r, routineFolders), dark))}
            </div>
          </div>
        )}
      </div>

      {/* NOTHING HERE YET, AND SOMEWHERE TO START. An empty routines list used
          to offer one door — build a routine from scratch — which is the
          harder of the two for someone who has never written a training
          program. The nine curated programs existed but had no way in.
          D9 (Mobile v5.1 R3): that way in is now the pinned "Browse starter
          programs" below, always shown, so this card no longer repeats it. */}
      {/* Handover-complete pass: Foundations › Empty state (WO1 §4 "Empty:
          use Foundations › Empty state"): a 56 primary.tint tile with a 26
          thin-stroke glyph in primary.accent, title 15/700, one line 12.5/500
          text.muted, max width 260, centred. The glyph is unspecified; Dumbbell
          (the workout glyph) at the 1.25 thin stroke. */}
      {routines.length === 0 && (
        <div className="flex flex-col items-center text-center mx-auto mb-4" style={{ maxWidth: 260 }}>
          <span className="flex items-center justify-center bg-th-f0edf9 dark:bg-th-aea1dc/[0.14]" style={{ width: 56, height: 56, borderRadius: 14 }}>
            <Dumbbell size={26} strokeWidth={1.25} absoluteStrokeWidth className="text-th-7d67d9 dark:text-th-9a8cd6" />
          </span>
          <p className="mt-3 text-[15px] font-bold leading-5 text-charcoal">No routines yet</p>
          <p className="mt-1 text-[12.5px] font-medium leading-[18px] text-charcoal-faint">
            Start from a ready-made program, or build your own.
          </p>
        </div>
      )}

      {/* Mobile v5.1 WO1 / WO1.1: "Browse starter programs" (outline) over a
          filled "Create routine", pinned above the navbar, both overlaying the
          list, at the frame's 44 / r12 (handover-complete pass; was 48 / r14
          under C-01). Browse is the outline in every state (it was filled when
          there were no routines). The spacer lets the last routine scroll
          clear of both buttons: 172 for one CTA + 52 for the second (44 + 8),
          less the 112 the layout already pads. */}
      <div aria-hidden style={{ height: 112 }} />
      <PinnedCta
        size="base"
        above={{
          label: "Browse starter programs",
          icon: <Library size={17} className="text-charcoal-soft" />,
          // WO1 / WO1.1 measure a 9 pt icon gap here (the CTA default is 7).
          className: "!gap-[9px]",
          onClick: () => setBrowseOpen(true),
        }}
        primary={{
          label: "Create routine",
          icon: <Plus size={15} />,
          // WO1 #8 / WO1.1 #9: filled #A198DF (--c-fill-cta, primary.cta.alt),
          // 13.5/700 white, 44/r12, as drawn and as Add habit. Dark:
          // primary-fill with its near-black ink.
          className: "!text-[13.5px] !bg-[rgb(var(--c-fill-cta))]",
          onClick: () => {
            setCreateFolder(null);
            setCreateOpen(true);
          },
        }}
      />

      <PopupMenu<FolderAction>
        open={!!menuFolder}
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        options={
          menuFolder && !canAddSubfolder(menuFolder.id, routineFolders)
            ? FOLDER_MENU.map((o) => (o.value === "subfolder" ? { ...o, disabled: true, note: MAX_DEPTH_NOTE } : o))
            : FOLDER_MENU
        }
        onSelect={(action) => menuFolder && onFolderAction(menuFolder, action)}
      />
      <PopupMenu<RoutineAction>
        open={!!menuRoutine}
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        options={ROUTINE_MENU}
        onSelect={(action) => menuRoutine && onRoutineAction(menuRoutine, action)}
      />

      {drag && <InsertionLine listRef={listRef} />}
      {/* The lifted card follows the pointer (WO1.1 "While dragging"). */}
      {drag &&
        (dragRoutine || dragFolder) &&
        createPortal(
          <div
            aria-hidden
            className="fixed pointer-events-none"
            style={{
              zIndex: 55,
              left: drag.left,
              width: drag.width,
              top: drag.y - drag.offsetY,
              transform: "scale(1.03)",
              borderRadius: 14,
              boxShadow: "0 14px 30px rgb(var(--c-charcoal) / 0.18)",
            }}
          >
            {dragRoutine ? (
              <RoutineCardFace
                routine={dragRoutine}
                family={themedFamily(
                  dragRoutine.folderId
                    ? folderFamily(
                        routineFolders.find((f) => f.id === dragRoutine.folderId)!,
                        routineFolders.findIndex((f) => f.id === dragRoutine.folderId)
                      )
                    : routineFamily(dragRoutine, routineFolders),
                  dark
                )}
                isOngoing={!!pausedSessions[dragRoutine.id]}
              />
            ) : (
              <FolderHeader
                folder={dragFolder!}
                family={themedFamily(folderFamily(dragFolder!, routineFolders.indexOf(dragFolder!)), dark)}
                drawnInk
                count={routinesIn(routines, dragFolder!.id).length}
                collapsed={collapsedFolders.has(dragFolder!.id)}
              />
            )}
          </div>,
          document.body
        )}

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
                Starting "{pendingRoutine.name}" will cancel your other ongoing routine entirely. Its progress won't be saved.
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

    </div>
  );
}


type PressProps = Record<string, unknown>;
type GripProps = Record<string, unknown>;

/**
 * The routine card's top row (WO1.1 frame): accent bar, name and meta, play,
 * then ⋮ (replacing the ×, same icon, size and spacing as the folder's, in
 * the × grey) and the six-dot grip. Rendered bare as the lifted card.
 */
const RoutineCardFace: React.FC<{
  routine: Routine;
  family: FolderFamily;
  isOngoing?: boolean;
  running?: boolean;
  onPause?: () => void;
  onToggle?: () => void;
  onStart?: () => void;
  onMenu?: (anchor: HTMLElement) => void;
  renaming?: boolean;
  renameDraft?: string;
  onRenameDraft?: (v: string) => void;
  onRenameCommit?: () => void;
  press?: PressProps;
  grip?: GripProps;
}> = ({ routine, family, isOngoing, running, onPause, onToggle, onStart, onMenu, renaming, renameDraft, onRenameDraft, onRenameCommit, press, grip }) => {
  const dark = useIsDark();
  const gripProps = grip;
  return (
    <div
      data-drag-card
      {...press}
      className="flex items-center gap-[13px] min-h-[54px] rounded-[14px] select-none"
      style={{ padding: "0 14px 0 0", background: family.row, WebkitTouchCallout: "none" }}
    >
      <span
        className={clsx("w-1 h-8 rounded-full shrink-0 block", isOngoing && running && "animate-pulse")}
        style={{ marginLeft: 15, background: isOngoing ? rc("ongoing", dark) : family.bar }}
      />
      {renaming ? (
        <RenameField value={renameDraft ?? ""} onChange={(v) => onRenameDraft?.(v)} onCommit={() => onRenameCommit?.()} tone="dark" />
      ) : (
        <button onClick={onToggle} className="hit flex-1 text-left min-w-0">
          <p className="text-[14.5px] font-bold flex items-center gap-1.5 truncate" style={{ color: "rgb(var(--c-charcoal))" }}>
            {/* The name ellipsizes on its own so the state badge is never cut (D18). */}
            <span className="truncate min-w-0">{routine.name}</span>
            {isOngoing && (
              // WO17: the same running / paused state the bar shows.
              <span className="text-[10px] font-bold uppercase flex items-center gap-1 shrink-0" style={{ color: rc("ongoing", dark) }}>
                {running ? (
                  <>
                    <Play size={10} fill="currentColor" /> Ongoing
                  </>
                ) : (
                  <>
                    <Pause size={10} fill="currentColor" /> Paused
                  </>
                )}
              </span>
            )}
          </p>
          <p className="text-[11.5px] mt-0.5" style={{ color: rc("meta", dark) }}>
            {routine.exercises.length} exercises • ~{routine.estimatedDurationMin} min
          </p>
        </button>
      )}
      <button
        data-no-drag
        onClick={isOngoing && running ? onPause : onStart}
        aria-label={isOngoing ? (running ? `Pause ${routine.name}` : `Resume ${routine.name}`) : `Start ${routine.name}`}
        className={clsx("tap w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0", isOngoing && running && "animate-pulse")}
        style={{ background: isOngoing ? rc("ongoing", dark) : family.play }}
      >
        {isOngoing && running ? (
          <Pause size={13} fill="#FFFFFF" style={{ color: "#FFFFFF" }} />
        ) : (
          <Play size={13} fill="#FFFFFF" style={{ color: "#FFFFFF", marginLeft: 1 }} />
        )}
      </button>
      <button
        data-no-drag
        onClick={(e) => onMenu?.(e.currentTarget)}
        aria-label={`Options for ${routine.name}`}
        className="tap flex shrink-0"
        style={{ color: "rgb(var(--c-charcoal-faint))" }}
      >
        <MoreVertical size={17} />
      </button>
      <span
        {...gripProps}
        role="button"
        aria-label={`Drag ${routine.name}`}
        className="hit flex shrink-0"
        style={{ color: "rgb(var(--c-charcoal-faint))", ...(gripProps?.style as React.CSSProperties | undefined) }}
      >
        <GripVertical size={17} />
      </span>
    </div>
  );
};

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
}> = ({ checked, disabled, onChange, label }) => {
  const dark = useIsDark();
  return (
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
        border: `2px solid ${disabled ? rc("off", dark) : checked ? rc("checked", dark) : "rgb(var(--c-charcoal) / 0.2)"}`,
        background: checked ? rc("checked", dark) : "transparent",
      }}
    >
      {checked && <Check size={12} strokeWidth={3} style={{ color: rc("tick", dark) }} />}
    </button>
  );
};

const RoutineRow: React.FC<{
  routine: Routine;
  /** The one being dragged stays mounted, hidden (see useRoutineDrag). */
  hidden?: boolean;
  onStart: () => void;
  onMenu: (anchor: HTMLElement) => void;
  renaming: boolean;
  renameDraft: string;
  onRenameDraft: (v: string) => void;
  onRenameCommit: () => void;
  press: PressProps;
  grip: GripProps;
  onSettings: (ex: Exercise) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onReplaceExercise: (exerciseId: string, pick: ExercisePick) => void;
  onAddExercise: (pick: ExercisePick) => void;
  /** Rewrites the whole arrangement — order and grouping travel together. */
  onArrange: (exercises: Exercise[], blocks: WorkoutBlock[]) => void;
  /** The colours of the folder this routine sits in. */
  family: FolderFamily;
  isOngoing?: boolean;
  /** The ongoing session's clock is running (minimised to the WO17 bar). */
  running?: boolean;
  onPause?: () => void;
}> = ({ routine, hidden, onStart, onMenu, renaming, renameDraft, onRenameDraft, onRenameCommit, press, grip, onSettings, onDeleteExercise, onReplaceExercise, onAddExercise, onArrange, family, isOngoing, running, onPause }) => {
  const dark = useIsDark();
  const [expanded, setExpanded] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);

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
            style={{ width: 22, height: 22, color: enabled ? "rgb(var(--c-charcoal-faint))" : rc("off", dark) }}
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
    // WO1.1: ⋮ (Rename, Duplicate, Delete) replaces the ×; long-press or the
    // grip drags it.
    <div
      data-dnd-row
      data-flip={`r:${routine.id}`}
      className="relative rounded-[14px] overflow-hidden"
      style={{ background: family.row, display: hidden ? "none" : undefined }}
    >
      {/* WO1.1 handover note: "The outline takes the routine's accent colour".
          Width unspecified on the board; 1.5 px (decision D8). Drawn as an
          overlay so the open body's own backgrounds cannot cover it. */}
      {expanded && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-[14px]"
          style={{ border: `1.5px solid ${family.bar}` }}
        />
      )}
      <RoutineCardFace
        routine={routine}
        family={family}
        isOngoing={isOngoing}
        running={running}
        onPause={onPause}
        onToggle={() => setExpanded((v) => !v)}
        onStart={onStart}
        onMenu={onMenu}
        renaming={renaming}
        renameDraft={renameDraft}
        onRenameDraft={onRenameDraft}
        onRenameCommit={onRenameCommit}
        press={press}
        grip={grip}
      />
      {expanded && (
        <div className="border-t border-charcoal/[0.06]">
          {/* GROUPING IS A MODE, entered here. The rows already open an
              editor on tap, so a permanent checkbox column would give every
              row two meanings; and nobody groups a superset by accident. */}
          <div
            // WO1.1 measures this strip 32 tall over its hairline: 8 + a 16 line + 8.
            className="flex items-center justify-between bg-cream-card px-4 py-2 leading-4"
            style={{ borderBottom: "1px solid rgb(var(--c-charcoal) / 0.05)" }}
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
                    style={{ color: selected.length < 2 ? "rgb(var(--c-charcoal-disabled))" : "rgb(var(--c-primary-deep-text))" }}
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
                  style={{ color: routine.exercises.length < 2 ? "rgb(var(--c-charcoal-disabled))" : "rgb(var(--c-primary-deep-text))" }}
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
              <div
                /* WO1.1: the hairlines between exercise rows are the folder
                   colour as a light tint (#E8E6F5 on the lavender frame, its
                   play shade at about 18% on white); dark mode the same shade
                   as a tint on the card. */
                key={`solo-${runIdx}`}
                className="divide-y divide-[color:var(--ex-divider)]"
                style={{ "--ex-divider": dark ? tintOn(family.play, 0.2) : mixHex("#FFFFFF", family.play, 0.18) } as React.CSSProperties}
              >
                {run.members.map((ex) => {
                  const line = prescriptionLine(ex);
                  return (
                    // Decision 23 (kept item 133): Foundations "Swipe-row
                    // actions", the shared SwipeActions — Replace (Repeat 16 on
                    // rgba(174,161,220,.18)) and Delete (Trash2 16 on
                    // danger.tint), 56 tiles r14 gap 8; the row slides 128.
                    <div key={ex.id} className="bg-cream-card">
                    <SwipeActions
                      radius={0}
                      actions={[
                        { key: "replace", label: `Replace ${ex.name}`, icon: <Repeat size={16} />, onClick: () => setReplaceTarget(ex.id) },
                        { key: "delete", label: `Delete ${ex.name}`, icon: <Trash2 size={16} />, destructive: true, onClick: () => onDeleteExercise(ex.id) },
                      ]}
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 bg-cream-card">
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
                    </SwipeActions>
                    </div>
                  );
                })}
              </div>
            )
          )}
          <button
            onClick={() => setAddExerciseOpen(true)}
            // WO1.1 measures this row 38 tall (11 + a 16 line + 11).
            className="tap w-full flex items-center justify-center gap-1.5 px-4 py-[11px] text-xs font-semibold text-primary dark:text-primary-dark bg-cream-card hover:bg-primary-pale/40"
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

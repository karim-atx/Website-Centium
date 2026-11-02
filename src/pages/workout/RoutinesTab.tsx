import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { useApp } from "../../context/AppContext";
import { CyclePhaseStrip } from "../../components/cycle/CyclePhaseStrip";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { SwipeActions } from "../../components/ui/SwipeActions";
import { CreateRoutineSheet } from "../../components/workout/CreateRoutineSheet";
import { ExerciseSettingsSheet } from "../../components/workout/ExerciseSettingsSheet";
import { BlockCard } from "../../components/workout/BlockCard";
import { prescriptionLine } from "../../services/workout/prescription";
import { setTargetLines } from "../../services/workout/setTargets";
import { ExerciseLibrarySheet, type ExercisePick } from "../../components/workout/ExerciseLibrarySheet";
import { WorkoutSessionSheet } from "../../components/workout/WorkoutSessionSheet";
import { BrowseProgramsSheet } from "../../components/workout/BrowseProgramsSheet";
import type { Exercise, Routine, RoutineFolder, WorkoutBlock } from "../../types";
import { folderFamily, mixHex, partBFamily, partBInk, routineFamily, tintOn, type FolderFamily } from "../../data/folderColors";
import { Toast } from "../../components/ui/Toast";
import { useOnline } from "../../hooks/useOnline";
import { textPx, linePx } from "../../theme/textSize";
import { useIsDark } from "../../hooks/useIsDark";
import { t, tk, tn, tx } from "../../i18n/core";

/**
 * Dark mode: routine rows and folder headers take the v6 Part B folder shades
 * (partBFamily, WO1 #9-#46 / D7); the colours below are the rest, as
 * [light, dark]. The new-folder glyph is #6B41EF / dark #C3B3FB* (WO1 #8);
 * the ongoing coral is lifted to read on the dark rows (4.5:1); the select
 * box's checked fill is the dark primary with a near-black tick, as dark
 * filled controls are.
 */
const ROUTINE_COLORS = {
  newFolder: ["rgb(var(--th-6b41ef))", "#C3B3FB"],
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
  AlertCircle,
  Music2,
} from "lucide-react";
import { useCoachProgrammes } from "./useCoachProgrammes";
import { CoachSection } from "./CoachSection";
import { ProgrammeSection } from "./ProgrammeSection";
import { coachColor } from "./coachColors";
import { fullGroupIndex, shortDay } from "../../services/routines/programmeLogic";
import { ROUTINE_NAME_RULE } from "../../services/routines";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { Button } from "../../components/ui/Button";
import { MusicSection } from "../../components/music/MusicSection";
import { PlaylistField, playlistFieldValid } from "../../components/music/PlaylistField";
import { tidyPlaylistInput } from "../../services/music/playlistLink";


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
type RoutineAction = "rename" | "playlist" | "duplicate" | "delete";
const MENU_ICON = 15;
const FOLDER_MENU: { value: FolderAction; label: string; icon: React.ReactNode; destructive?: boolean }[] = [
  { value: "rename", label: tk("Rename"), icon: <Pencil size={MENU_ICON} /> },
  { value: "color", label: tk("Edit color"), icon: <Palette size={MENU_ICON} /> },
  { value: "duplicate", label: tk("Duplicate"), icon: <Copy size={MENU_ICON} /> },
  { value: "subfolder", label: tk("Add subfolder"), icon: <FolderTree size={MENU_ICON} /> },
  { value: "routine", label: tk("Add routine"), icon: <Plus size={MENU_ICON} /> },
  { value: "delete", label: tk("Delete"), icon: <Trash2 size={MENU_ICON} />, destructive: true },
];
const ROUTINE_MENU: { value: RoutineAction; label: string; icon: React.ReactNode; destructive?: boolean }[] = [
  { value: "rename", label: tk("Rename"), icon: <Pencil size={MENU_ICON} /> },
  // Round E: the routine's playlist (routines.playlist_url).
  { value: "playlist", label: tk("Playlist"), icon: <Music2 size={MENU_ICON} /> },
  { value: "duplicate", label: tk("Duplicate"), icon: <Copy size={MENU_ICON} /> },
  { value: "delete", label: tk("Delete"), icon: <Trash2 size={MENU_ICON} />, destructive: true },
];
// Release 3 · W7 (CU1 v4): a coach's folder and rows offer one thing, a copy
// of their own (cleanRoutineCopy: no coach notes, no assignment).
const COACH_MENU: { value: "copy"; label: string; icon: React.ReactNode }[] = [
  { value: "copy", label: tk("Save a copy"), icon: <Copy size={MENU_ICON} /> },
];
// The menus' labels in the app's language, read where they are shown.
const inLanguage = <O extends { label: string }>(options: O[]): O[] => options.map((o) => ({ ...o, label: t(o.label) }));

// The refusals that explain themselves stay as the inline line (see run()).
// A service may hand one back in English or already in the app's language.
const EXPLAINED = [
  tk("A folder can't be filed inside itself or one of its own subfolders."),
  tk("That folder belongs to a different account, so it can't be used as a parent."),
  tk("You don't have permission to do that."),
  ROUTINE_NAME_RULE,
  MAX_DEPTH_NOTE,
];
const explainsItself = (message: string) =>
  /filed inside itself|different account|levels deep at most|permission|name is 1 to/i.test(message) || EXPLAINED.some((k) => t(k) === message);

/** Updated banners the client has closed, by assignment id → the assigned_at they closed. */
const SEEN_KEY = "centium.coachUpdateSeen";
function readSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}
function writeSeen(seen: Record<string, string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // Private mode: the banner simply shows again next time.
  }
}

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
    retryRoutines,
    routinesHydrated,
    accessibility,
    pausedSessions,
    clearPausedSession,
    activeSession,
    setActiveSession,
    authUserId,
    today,
  } = useApp();
  const dark = useIsDark();
  const hc = !!accessibility.highContrast;
  const online = useOnline();
  // Release 3 · W7 (CU1): the coach's programmes, shown in their own section
  // above Folders and left out of the client's folders and Unfiled.
  const coach = useCoachProgrammes(routines, authUserId, today);
  const coachIds = coach.coachRoutineIds;
  const ownRoutines = coachIds.size ? routines.filter((r) => !coachIds.has(r.id)) : routines;
  // v6 WO1 O3 / O4: a write that failed, or one tried offline, says
  // "Couldn't save. Try again." in the shared toast.
  const [saveToast, setSaveToast] = useState(false);
  // The family in the current mode's shades (light: itself; dark: the Part B
  // literal values; High contrast: the lavender header #5B48B8).
  const shade = (f: FolderFamily) => partBFamily(f, dark, hc);
  // WO1 #6 / K1: the caps labels, #9A94B3 / dark #8A8698; High contrast ink.
  const capsInk = hc ? "rgb(var(--c-charcoal))" : dark ? "#8A8698" : "rgb(var(--thi-9a94b3))";
  // WO1 S2 / K6: the folder name is 1 to 40 characters, a routine's 1 to 60
  // (said here; Database B3 checks the same, PB-O-36).
  const FOLDER_NAME_MAX = 40;
  const ROUTINE_NAME_MAX = 60;
  // WO1 K6: the new-folder field, FO style (42 tall, r14, #F5F5F6 / #242730,
  // 0.5px #241F1B@6%), and its Add as the Create routine button (#53).
  const fieldClass =
    "flex-1 min-w-0 bg-cream-soft border-[0.5px] border-charcoal/[0.06] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20";
  const fieldStyle: React.CSSProperties = { height: 42, borderRadius: 14, padding: "0 12px", fontSize: textPx(13.5), lineHeight: linePx(20.3) };
  // The filled button #A198DF (--c-fill-cta); High contrast #5B48B8 with
  // white (WO1 O7, the primary fill).
  const ctaClass = hc ? "bg-primary-fill" : "bg-[rgb(var(--c-fill-cta))]";
  const popupButton: React.CSSProperties = { height: 48, borderRadius: 14, fontSize: textPx(14), fontWeight: 700 };
  const addStyle: React.CSSProperties = { height: 42, borderRadius: 12, padding: "0 16px", fontSize: textPx(13.5), fontWeight: 700 };
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
  // The folder-depth refusals explain why, so they stay as the inline line;
  // any other failure is the shared toast (WO1 O3). Offline, nothing is
  // tried (O4).
  const run = (action: Promise<string | undefined>) => {
    void action.then((message) => {
      // B3 (PB-O-36): the server's name rules say why too.
      if (message && explainsItself(message)) setActionError(message);
      else {
        setActionError(null);
        if (message) setSaveToast(true);
      }
    });
  };
  const guard = (fn: () => void) => () => {
    if (!online) {
      setSaveToast(true);
      return;
    }
    fn();
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [createFolder, setCreateFolder] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(folderColorOptions[0]);
  // A folder or a routine being renamed in place (ids are unique across both).
  const [renamingId, setRenamingId] = useState<string | null>(null);
  // Round E: the routine whose playlist is being edited, and the draft.
  const [playlistFor, setPlaylistFor] = useState<{ routine: Routine; draft: string; error: string | null; saving: boolean } | null>(null);
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
  // CU1: the coach folder / row ⋮ (Save a copy), Past programmes, closed Updated banners.
  const [coachMenu, setCoachMenu] = useState<{ routineId: string; anchor: HTMLElement } | null>(null);
  const [pastOpen, setPastOpen] = useState(false);
  const [seenUpdates, setSeenUpdates] = useState<Record<string, string>>(readSeen);
  // Master handover ("Color-coded folders": "Folders now open"): every
  // folder, the seeded Strength and Hypertrophy included, starts expanded.
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const toggleFolderCollapsed = (id: string) =>
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Something is saved on this device (or already read), so a failed read
  // keeps it on screen with the inline line (K9) instead of the Retry (O2).
  const hasCache = routines.length > 0 || routineFolders.length > 0;
  const siblingsOf = (parentId: string | null) => routineFolders.filter((f) => (f.parentId ?? null) === parentId);
  const unfiled = routinesIn(ownRoutines, null);

  // --- WO1.1 drag and drop ----------------------------------------------------
  const listRef = useRef<HTMLDivElement>(null);
  const onDrop = (item: DragItem, target: DropTarget) => {
    if (item.kind === "routine") {
      if (target.kind === "header") run(placeRoutine(item.id, target.folderId, Number.MAX_SAFE_INTEGER));
      else if (target.kind === "group")
        // The drop slot counts the rows on screen; placeRoutine counts the
        // whole group, coach routines included (CU1: they are listed above).
        run(
          placeRoutine(
            item.id,
            target.folderId,
            coachIds.size
              ? fullGroupIndex(routinesIn(routines, target.folderId).map((r) => r.id), coachIds, item.id, target.index)
              : target.index
          )
        );
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
    } else if (action === "playlist") setPlaylistFor({ routine, draft: routine.playlistUrl ?? "", error: null, saving: false });
    else if (action === "duplicate") run(duplicateRoutine(routine.id));
    else setPendingDeleteRoutine(routine);
  };

  const commitRename = (kind: "folder" | "routine", id: string) => {
    const name = renameDraft.trim().slice(0, kind === "folder" ? FOLDER_NAME_MAX : ROUTINE_NAME_MAX);
    if (name) run(kind === "folder" ? renameRoutineFolder(id, name) : updateRoutine(id, { name }));
    setRenamingId(null);
  };

  // WO1.3 S5: the library stays open after "+ Add", so several edits can
  // follow each other before the first save answers. updateRoutine rewrites
  // the routine's whole exercise list (clear, then insert), so two saves in
  // flight would race, and each would start from a stale list. Every
  // exercise-list write of one routine from its open card (add, delete,
  // replace, arrange) is therefore queued: each builds on the list the previous one
  // wrote, and runs after it.
  const writeChain = useRef(new Map<string, { list: Exercise[]; done: Promise<unknown> }>());
  const queueExercises = (
    r: Routine,
    next: (cur: Exercise[]) => { exercises: Exercise[]; blocks?: WorkoutBlock[] }
  ) => {
    if (!online) {
      setSaveToast(true);
      return;
    }
    const pending = writeChain.current.get(r.id);
    const out = next(pending?.list ?? r.exercises);
    // Blocks only when the edit is an arrangement (as before: the other edits
    // never sent them).
    const blocks = out.blocks;
    const done = (pending?.done ?? Promise.resolve())
      .then(() => updateRoutine(r.id, blocks ? { exercises: out.exercises, blocks } : { exercises: out.exercises }))
      .then((message) => {
        if (message) setSaveToast(true);
        if (writeChain.current.get(r.id)?.done === done) writeChain.current.delete(r.id);
      });
    writeChain.current.set(r.id, { list: out.exercises, done });
  };

  const renderRoutine = (
    r: Routine,
    index: number,
    family: FolderFamily,
    hidden: boolean,
    // CU1: a coach's routine row (no drag, its own meta line and ⋮ menu).
    coachRow?: { meta: string; today: boolean; onMenu: (anchor: HTMLElement) => void }
  ) => (
    <RoutineRow
      key={r.id}
      routine={r}
      hidden={hidden}
      metaText={coachRow?.meta}
      today={coachRow?.today}
      noGrip={!!coachRow}
      onStart={() =>
        // A minimised session that is paused resumes its clock here; anything
        // else (a quit session, or a new start) opens the logger as before.
        activeSession?.routineId === r.id && activeSession.status === "paused" ? resumeActive() : startRoutine(r)
      }
      isOngoing={!!pausedSessions[r.id]}
      running={activeSession?.routineId === r.id && activeSession.status === "running"}
      onPause={pauseActive}
      onMenu={coachRow ? coachRow.onMenu : (anchor) => setMenu({ kind: "routine", id: r.id, anchor })}
      renaming={!coachRow && renamingId === r.id}
      renameDraft={renameDraft}
      onRenameDraft={setRenameDraft}
      onRenameCommit={() => commitRename("routine", r.id)}
      press={coachRow ? undefined : pressProps({ kind: "routine", id: r.id, folderId: r.folderId, index }, renamingId !== r.id)}
      grip={coachRow ? undefined : gripProps({ kind: "routine", id: r.id, folderId: r.folderId, index })}
      onSettings={(ex) => setSettingsExercise({ routineId: r.id, exercise: ex })}
      onDeleteExercise={(exId) => queueExercises(r, (cur) => ({ exercises: cur.filter((e) => e.id !== exId) }))}
      onReplaceExercise={(exId, pick) =>
        queueExercises(r, (cur) => ({
          exercises: cur.map((e) =>
            e.id === exId
              ? { ...e, name: pick.name, muscleGroups: pick.muscleGroups, secondaryMuscleGroups: pick.secondaryMuscleGroups, classification: pick.classification, isCustom: pick.isCustom, exerciseId: pick.exerciseId, customExerciseId: pick.customExerciseId }
              : e
          ),
        }))
      }
      onAddExercise={(pick) => queueExercises(r, (cur) => ({ exercises: [...cur, blankExerciseFromPick(pick)] }))}
      onArrange={(exercises, blocks) => queueExercises(r, () => ({ exercises, blocks }))}
      family={family}
    />
  );

  /** A folder's routines (or Unfiled's), with the drop placeholder while dragging. */
  const renderGroup = (folderId: string | null, familyOf: (r: Routine) => FolderFamily) => {
    const group = routinesIn(ownRoutines, folderId);
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
    const folderRoutines = routinesIn(ownRoutines, folder.id);
    const collapsed = collapsedFolders.has(folder.id);
    // Folder order: the folder's position in the account's folder list.
    const family = shade(folderFamily(folder, routineFolders.indexOf(folder)));
    const item: DragItem = { kind: "folder", id: folder.id, parentId: folder.parentId ?? null, index };

    return (
      <div
        key={folder.id}
        data-dnd-folder-block
        data-flip={`f:${folder.id}`}
        className="flex flex-col gap-1.5"
        style={{ marginInlineStart: depth * 16, display: hidden ? "none" : undefined }}
      >
        <FolderHeader
          folder={folder}
          family={family}
          // WO1 #4b / WO1.1 #4 (decision 23): white ink as drawn.
          drawnInk
          themed
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
              <div className="mb-2" style={{ marginInlineStart: 16 }}>
                <div className="flex gap-2 mb-2">
                  <input
                    autoFocus
                    value={subfolderName}
                    maxLength={FOLDER_NAME_MAX}
                    aria-label={t("Subfolder name")}
                    onChange={(e) => setSubfolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && subfolderName.trim()) {
                        run(addRoutineFolder(subfolderName.trim(), folder.id, subfolderColor));
                        setAddingSubfolderTo(null);
                      }
                    }}
                    placeholder={t("Subfolder name…")}
                    className={fieldClass}
                    style={fieldStyle}
                  />
                  <button
                    onClick={() => {
                      if (subfolderName.trim()) run(addRoutineFolder(subfolderName.trim(), folder.id, subfolderColor));
                      setAddingSubfolderTo(null);
                    }}
                    className={`tap shrink-0 ${ctaClass} text-on-primary-fill`}
                    style={addStyle}
                  >
                    {t("Add")}
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

      {/* Round D · DT1: week-by-day programmes (today's workouts, the week view). */}
      <ProgrammeSection
        routines={routines}
        today={today}
        dark={dark}
        capsInk={capsInk}
        onStart={(r) => (activeSession?.routineId === r.id && activeSession.status === "paused" ? resumeActive() : startRoutine(r))}
      />

      <CoachSection
        coach={coach}
        dark={dark}
        capsInk={capsInk}
        shade={shade}
        collapsed={collapsedFolders}
        onToggle={toggleFolderCollapsed}
        seen={seenUpdates}
        onSeen={(a) => {
          const next = { ...seenUpdates, [a.id]: a.assignedAt };
          setSeenUpdates(next);
          writeSeen(next);
        }}
        onMenu={(routineId, anchor) => setCoachMenu({ routineId, anchor })}
        onPast={() => setPastOpen(true)}
        renderRow={(r, family, meta, isToday) =>
          renderRoutine(r, 0, family, false, { meta, today: isToday, onMenu: (anchor) => setCoachMenu({ routineId: r.id, anchor }) })
        }
      />

      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[9.5px] leading-[14.3px] font-bold tracking-[1.9px] uppercase" style={{ color: capsInk }}>{t("Folders")}</p>
        <button
          // Tapping it again closes the new-folder form, discarding the draft.
          onClick={() => {
            if (newFolderOpen) setNewFolderName("");
            setNewFolderOpen((v) => !v);
          }}
          title={t("New folder")}
          aria-label={t("New folder")}
          aria-expanded={newFolderOpen}
          // 30 × 30 r9 on a 44 hit area (WO1 #7).
          className="tap relative w-[30px] h-[30px] rounded-[9px] flex items-center justify-center before:absolute before:-inset-[7px] before:content-['']"
          style={{ color: rc("newFolder", dark), marginBlock: "-4px", marginInline: "0 -6px" }}
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
          <p className="text-[11.5px] font-semibold text-status-high mb-3">{t(actionError)}</p>
        )}
        {routinesError && !actionError && hasCache && (
          <p className="text-[11.5px] font-semibold text-status-high mb-3">
            {t("Couldn't refresh your routines. Showing what was saved on this device.")}
          </p>
        )}
      </div>

      {/* WO1 O2: nothing saved on this device and the read failed. */}
      {routinesError && !hasCache && (
        <div role="alert" className="flex flex-col items-center text-center mb-4" style={{ gap: 6, padding: "20px 0" }}>
          <p className="m-0 text-charcoal" style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 700 }}>
            {t("Couldn't load your routines.")}
          </p>
          <button
            type="button"
            onClick={retryRoutines}
            className="tap relative before:absolute before:-inset-[12px] before:content-['']"
            style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: dark ? "#C3B3FB" : hc ? "rgb(var(--c-primary-deep-text))" : "rgb(var(--thi-7d6bb5))" }}
          >
            {t("Retry")}
          </button>
        </div>
      )}

      {/* WO1 O1: loading rows while the first read is out and nothing is
          cached: 358 × 64, r14, #F5F5F6 / #242730, pulse 1.2 s (static under
          Reduce motion). */}
      {!routinesHydrated && !routinesError && !hasCache && (
        <div aria-hidden className="flex flex-col mb-4" style={{ gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-skeleton-pulse bg-cream-soft" style={{ height: 64, borderRadius: 14 }} />
          ))}
        </div>
      )}

      {newFolderOpen && (
        <div className="mb-4">
          <div className="flex gap-2 mb-2">
            <input
              autoFocus
              value={newFolderName}
              maxLength={FOLDER_NAME_MAX}
              aria-label={t("Folder name")}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFolderName.trim()) {
                  guard(() => run(addRoutineFolder(newFolderName.trim(), null, newFolderColor)))();
                  setNewFolderName("");
                  setNewFolderOpen(false);
                }
              }}
              placeholder={t("Folder name…")}
              className={fieldClass}
              style={fieldStyle}
            />
            <button
              onClick={() => {
                if (newFolderName.trim()) guard(() => run(addRoutineFolder(newFolderName.trim(), null, newFolderColor)))();
                setNewFolderName("");
                setNewFolderOpen(false);
              }}
              className={`tap shrink-0 ${ctaClass} text-on-primary-fill`}
              style={addStyle}
            >
              {t("Add")}
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
            <p className="mb-[9px] text-[9.5px] leading-[14.3px] font-bold tracking-[1.9px] uppercase" style={{ color: capsInk }}>{t("Unfiled")}</p>
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
              {renderGroup(null, (r) => shade(routineFamily(r, routineFolders)))}
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
      {/* CU1: counted without the coach's programmes, which sit above. */}
      {ownRoutines.length === 0 && (
        <div className="flex flex-col items-center text-center mx-auto mb-4" style={{ maxWidth: 260 }}>
          <span className="flex items-center justify-center bg-th-f0edf9 dark:bg-th-aea1dc/[0.14]" style={{ width: 56, height: 56, borderRadius: 14 }}>
            <Dumbbell size={26} strokeWidth={1.25} absoluteStrokeWidth className="text-th-7d67d9 dark:text-th-9a8cd6" />
          </span>
          <p className="mt-3 text-[15px] font-bold leading-5 text-charcoal">{t("No routines yet")}</p>
          <p className="mt-1 text-[12.5px] font-medium leading-[18px] text-charcoal-faint">
            {t("Start from a ready-made program, or build your own.")}
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
      {/* Round E: "Play your music" for the Workout area (Settings › Your
          music: the workout favourite, or the chosen app), under the list so
          it never pushes a routine down. */}
      <section aria-label={t("Music")} style={{ marginTop: 18 }}>
        <p className="mb-2.5 text-[9.5px] leading-[14.3px] font-bold tracking-[1.9px] uppercase" style={{ color: capsInk }}>{t("Music")}</p>
        <MusicSection moment="workout" />
      </section>

      <div aria-hidden style={{ height: 112 }} />
      <PinnedCta
        size="base"
        above={{
          label: t("Browse starter programs"),
          icon: <Library size={17} className="text-charcoal-soft" />,
          // WO1 / WO1.1 measure a 9 pt icon gap here (the CTA default is 7).
          // WO1 #51: the outline is 0.5px (X-09).
          className: "!gap-[9px] !border-[0.5px]",
          onClick: () => setBrowseOpen(true),
        }}
        primary={{
          label: t("Create routine"),
          // WO1 #54: drawn #FFFFFF in dark; V6-02 keeps the label's #0D0B1A.
          icon: <Plus size={15} />,
          // WO1 #8 / WO1.1 #9: filled #A198DF (--c-fill-cta, primary.cta.alt),
          // 13.5/700 white, 44/r12, as drawn and as Add habit. Dark:
          // primary-fill with its near-black ink.
          className: `!text-[13.5px] ${hc ? "" : "!bg-[rgb(var(--c-fill-cta))]"}`,
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
            ? inLanguage(FOLDER_MENU).map((o) => (o.value === "subfolder" ? { ...o, disabled: true, note: t(MAX_DEPTH_NOTE) } : o))
            : inLanguage(FOLDER_MENU)
        }
        onSelect={(action) => menuFolder && onFolderAction(menuFolder, action)}
      />
      <PopupMenu<RoutineAction>
        open={!!menuRoutine}
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        options={inLanguage(ROUTINE_MENU)}
        onSelect={(action) => menuRoutine && onRoutineAction(menuRoutine, action)}
      />
      <PopupMenu<"copy">
        open={!!coachMenu}
        anchor={coachMenu?.anchor ?? null}
        onClose={() => setCoachMenu(null)}
        options={inLanguage(COACH_MENU)}
        onSelect={() => coachMenu && guard(() => run(duplicateRoutine(coachMenu.routineId)))()}
      />

      {/* Round E: a routine's playlist, from its ⋮ menu. */}
      <BottomSheet
        open={!!playlistFor}
        onClose={() => setPlaylistFor(null)}
        title={t("Playlist")}
        footer={
          <Button
            fullWidth
            size="lg"
            disabled={!playlistFor || playlistFor.saving}
            onClick={() => {
              if (!playlistFor) return;
              const url = tidyPlaylistInput(playlistFor.draft);
              if (!playlistFieldValid(url)) return;
              if (!online) {
                setPlaylistFor({ ...playlistFor, error: t("You're offline. Try again when you're connected.") });
                return;
              }
              setPlaylistFor({ ...playlistFor, saving: true, error: null });
              void updateRoutine(playlistFor.routine.id, { playlistUrl: url || null }).then((message) => {
                if (message) setPlaylistFor((p) => (p ? { ...p, saving: false, error: t(message) } : p));
                else setPlaylistFor(null);
              });
            }}
          >
            {playlistFor?.saving ? t("Saving…") : t("Save")}
          </Button>
        }
      >
        {playlistFor && (
          <PlaylistField
            value={playlistFor.draft}
            onChange={(draft) => setPlaylistFor((p) => (p ? { ...p, draft, error: null } : p))}
            error={playlistFor.error}
            hint={t("Play it from {name} while you train.", { name: playlistFor.routine.name })}
          />
        )}
      </BottomSheet>

      {/* CU1 v4: the programmes that ended (ended_at, or past their last day). */}
      <BottomSheet open={pastOpen} onClose={() => setPastOpen(false)} title={t("Past programmes")}>
        <div className="flex flex-col" style={{ gap: 6 }}>
          {coach.past.map((p) => (
            <div key={p.id} style={{ padding: "12px 14px", borderRadius: 14, background: coachColor("soft", dark) }}>
              <p style={{ margin: 0, fontSize: textPx(13), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{p.name}</p>
              {p.endedOn && (
                <p style={{ margin: 0, fontSize: textPx(11.5), color: coachColor("faint", dark) }}>{t("Ended {date}", { date: shortDay(p.endedOn) })}</p>
              )}
            </div>
          ))}
        </div>
      </BottomSheet>

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
                family={shade(
                  dragRoutine.folderId
                    ? folderFamily(
                        routineFolders.find((f) => f.id === dragRoutine.folderId)!,
                        routineFolders.findIndex((f) => f.id === dragRoutine.folderId)
                      )
                    : routineFamily(dragRoutine, routineFolders)
                )}
                isOngoing={!!pausedSessions[dragRoutine.id]}
              />
            ) : (
              <FolderHeader
                folder={dragFolder!}
                family={shade(folderFamily(dragFolder!, routineFolders.indexOf(dragFolder!)))}
                drawnInk
                themed
                count={routinesIn(ownRoutines, dragFolder!.id).length}
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

      <Toast
        open={saveToast}
        message={t("Couldn't save. Try again.")}
        icon={<AlertCircle size={16} style={{ color: dark ? "#F09A8E" : "#C0392B" }} />}
        onExpire={() => setSaveToast(false)}
      />

      {/* WO1 K8 (and the routine delete confirm beside it): the shared
          centred popup, our geometry (342, r22, pad 20, buttons 48 r14), over
          the warm scrim. Copy unchanged. */}
      <CentredPopup
        open={!!pendingRoutine}
        onClose={() => setPendingRoutine(null)}
        geometry="ours"
        className="!p-5"
        alert
        title={t("Cancel ongoing routine?")}
        body={pendingRoutine ? t("Starting \"{name}\" will cancel your other ongoing routine entirely. Its progress won't be saved.", { name: pendingRoutine.name }) : undefined}
      >
        <div className="flex w-full mt-5" style={{ gap: 10 }}>
          <button type="button" onClick={() => setPendingRoutine(null)} className="tap flex-1 bg-cream-soft text-charcoal" style={popupButton}>
            {t("Keep going")}
          </button>
          <button type="button" onClick={confirmSwitchRoutine} className={`tap flex-1 ${ctaClass} text-on-primary-fill`} style={popupButton}>
            {t("Start anyway")}
          </button>
        </div>
      </CentredPopup>

      <CentredPopup
        open={!!pendingDeleteRoutine}
        onClose={() => setPendingDeleteRoutine(null)}
        geometry="ours"
        className="!p-5"
        alert
        title={t("Delete routine?")}
        body={pendingDeleteRoutine ? t("\"{name}\" and its exercises will be permanently removed. This can't be undone.", { name: pendingDeleteRoutine.name }) : undefined}
      >
        <div className="flex w-full mt-5" style={{ gap: 10 }}>
          <button type="button" onClick={() => setPendingDeleteRoutine(null)} className="tap flex-1 bg-cream-soft text-charcoal" style={popupButton}>
            {tx("Keep it", "routine")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (pendingDeleteRoutine) guard(() => run(deleteRoutine(pendingDeleteRoutine.id)))();
              setPendingDeleteRoutine(null);
            }}
            className="tap flex-1"
            style={{ ...popupButton, background: dark ? "#3C2A30" : "#FCEDEC", color: dark ? "#F09A8E" : "#B4372C" }}
          >
            {t("Delete")}
          </button>
        </div>
      </CentredPopup>
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
  /** CU1: a coach routine's meta ("Week 3, day 2 • 5 exercises • ~50 min"); unset = the routine's own. */
  metaText?: string;
  /** CU1: the TODAY badge (the programme has a session today). */
  today?: boolean;
  /** CU1: no drag grip (a coach's routine). */
  noGrip?: boolean;
}> = ({ routine, family, isOngoing, running, onPause, onToggle, onStart, onMenu, renaming, renameDraft, onRenameDraft, onRenameCommit, press, grip, metaText, today, noGrip }) => {
  const dark = useIsDark();
  // The play glyph: white, or the dark ink on a light dark-mode fill (V6-02).
  const playInk = isOngoing ? "#FFFFFF" : partBInk(family.play, dark);
  const gripProps = grip;
  return (
    <div
      data-drag-card
      {...press}
      className="flex items-center gap-[13px] min-h-[54px] rounded-[14px] select-none"
      style={{ paddingBlock: "0", paddingInline: "0 14px", background: family.row, WebkitTouchCallout: "none" }}
    >
      <span
        className={clsx("w-1 h-8 rounded-full shrink-0 block", isOngoing && running && "animate-pulse")}
        style={{ marginInlineStart: 15, background: isOngoing ? rc("ongoing", dark) : family.bar }}
      />
      {renaming ? (
        <RenameField value={renameDraft ?? ""} onChange={(v) => onRenameDraft?.(v)} onCommit={() => onRenameCommit?.()} tone="dark" />
      ) : (
        <button onClick={onToggle} className="hit flex-1 text-start min-w-0">
          <p className="text-[14.5px] font-bold flex items-center gap-1.5 truncate" style={{ color: "rgb(var(--c-charcoal))" }}>
            {/* The name ellipsizes on its own so the state badge is never cut (D18). */}
            <span className="truncate min-w-0">{routine.name}</span>
            {today && !isOngoing && (
              // CU1 v4: 10/800 .06em caps, r6, 1 × 6, white on the play colour
              // (the dark ink on a light dark-mode fill, as the play glyph).
              <span
                className="shrink-0 uppercase"
                style={{ fontSize: textPx(10), fontWeight: 800, letterSpacing: "0.06em", borderRadius: 6, padding: "1px 6px", lineHeight: linePx(15), background: family.play, color: partBInk(family.play, dark) }}
              >
                {t("Today")}
              </span>
            )}
            {isOngoing && (
              // WO17: the same running / paused state the bar shows.
              <span className="text-[10px] font-bold uppercase flex items-center gap-1 shrink-0" style={{ color: rc("ongoing", dark) }}>
                {running ? (
                  <>
                    <Play size={10} fill="currentColor" /> {t("Ongoing")}
                  </>
                ) : (
                  <>
                    <Pause size={10} fill="currentColor" /> {t("Paused")}
                  </>
                )}
              </span>
            )}
          </p>
          <p className="text-[11.5px] mt-0.5" style={{ color: rc("meta", dark) }}>
            {metaText ?? `${tn(routine.exercises.length, "{n} exercise", "{n} exercises")} • ${t("~{n} min", { n: routine.estimatedDurationMin })}`}
          </p>
        </button>
      )}
      <button
        data-no-drag
        onClick={isOngoing && running ? onPause : onStart}
        aria-label={isOngoing ? (running ? t("Pause {name}", { name: routine.name }) : t("Resume {name}", { name: routine.name })) : t("Start {name}", { name: routine.name })}
        className={clsx("tap w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0", isOngoing && running && "animate-pulse")}
        style={{ background: isOngoing ? rc("ongoing", dark) : family.play }}
      >
        {isOngoing && running ? (
          <Pause size={13} fill={playInk} style={{ color: playInk }} />
        ) : (
          <Play size={13} fill={playInk} style={{ color: playInk, marginInlineStart: 1 }} />
        )}
      </button>
      <button
        data-no-drag
        onClick={(e) => onMenu?.(e.currentTarget)}
        aria-label={t("Options for {name}", { name: routine.name })}
        className="tap flex shrink-0"
        style={{ color: "rgb(var(--c-charcoal-faint))" }}
      >
        <MoreVertical size={17} />
      </button>
      {!noGrip && (
        <span
          {...gripProps}
          role="button"
          aria-label={t("Drag {name}", { name: routine.name })}
          className="hit flex shrink-0"
          style={{ color: "rgb(var(--c-charcoal-faint))", ...(gripProps?.style as React.CSSProperties | undefined) }}
        >
          <GripVertical size={17} />
        </span>
      )}
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
      aria-label={t("Select {name}", { name: label })}
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
  press?: PressProps;
  grip?: GripProps;
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
  /** CU1: a coach routine's row (see RoutineCardFace). */
  metaText?: string;
  today?: boolean;
  noGrip?: boolean;
}> = ({ routine, hidden, onStart, onMenu, renaming, renameDraft, onRenameDraft, onRenameCommit, press, grip, onSettings, onDeleteExercise, onReplaceExercise, onAddExercise, onArrange, family, isOngoing, running, onPause, metaText, today, noGrip }) => {
  const dark = useIsDark();
  const [expanded, setExpanded] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  // Names added from the open library whose save may still be on its way,
  // so their rows already read "Added ✓" (WO1.3 S7).
  const [queuedNames, setQueuedNames] = useState<string[]>([]);

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
            aria-label={direction === "up" ? t("Move up") : t("Move down")}
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
          aria-label={t("Settings for {name}", { name: ex.name })}
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
        metaText={metaText}
        today={today}
        noGrip={noGrip}
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
                    ? t("Pick exercises that sit next to each other.")
                    : t("{n} selected", { n: selected.length })}
                </span>
                <span className="flex items-center" style={{ gap: 12 }}>
                  <button onClick={exitSelecting} className="tap text-[11.5px] font-semibold text-charcoal-soft">
                    {t("Cancel")}
                  </button>
                  <button
                    onClick={startGrouping}
                    disabled={selected.length < 2}
                    className="tap text-[11.5px] font-semibold"
                    style={{ color: selected.length < 2 ? "rgb(var(--c-charcoal-disabled))" : "rgb(var(--c-primary-deep-text))" }}
                  >
                    {t("Group as…")}
                  </button>
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] text-charcoal-faint">
                  {tn(routine.exercises.length, "{n} exercise", "{n} exercises")}
                  {blocks.length > 0 && ` · ${tn(blocks.length, "{n} block", "{n} blocks")}`}
                </span>
                <button
                  onClick={() => setSelecting(true)}
                  disabled={routine.exercises.length < 2}
                  className="tap flex items-center gap-1 text-[11.5px] font-semibold"
                  style={{ color: routine.exercises.length < 2 ? "rgb(var(--c-charcoal-disabled))" : "rgb(var(--c-primary-deep-text))" }}
                >
                  <Group size={13} /> {tx("Group", "action")}
                </button>
              </>
            )}
          </div>
          {groupProblem && (
            <p className="text-[11px] text-status-high bg-status-high-bg px-4 py-2">{t(groupProblem)}</p>
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
                        { key: "replace", label: t("Replace {name}", { name: ex.name }), icon: <Repeat size={16} />, onClick: () => setReplaceTarget(ex.id) },
                        { key: "delete", label: t("Delete {name}", { name: ex.name }), icon: <Trash2 size={16} />, destructive: true, onClick: () => onDeleteExercise(ex.id) },
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
                          {/* Round D (TR11): the coach's target RPE and note per set. */}
                          {setTargetLines(ex.setTargets).map((target) => (
                            <p key={target} className="text-[11px] text-charcoal-faint">{target}</p>
                          ))}
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
            <Plus size={13} /> {t("Add exercise")}
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
        mode="replace"
      />

      <ExerciseLibrarySheet
        open={addExerciseOpen}
        onClose={() => {
          setAddExerciseOpen(false);
          setQueuedNames([]);
        }}
        // WO1.3 S5: the sheet stays open for more; the row turns "Added ✓".
        onPick={(pick) => {
          setQueuedNames((q) => [...q, pick.name]);
          onAddExercise(pick);
        }}
        alreadyAdded={[...routine.exercises.map((e) => e.name), ...queuedNames]}
      />
    </div>
  );
};

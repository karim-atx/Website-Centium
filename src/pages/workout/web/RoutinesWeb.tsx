import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, ChevronDown, Copy, Dumbbell, Folder, FolderPlus, FolderTree, MoreVertical, GripVertical, Link2, Music2, Palette, Pause, Pencil, Play, Plus, Repeat, Settings2, Square, Trash2 } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { useIsDark } from "../../../hooks/useIsDark";
import { CyclePhaseStrip } from "../../../components/cycle/CyclePhaseStrip";
import { ReadinessCard } from "../../../components/readiness/ReadinessCard";
import { CentredPopup } from "../../../components/ui/CentredPopup";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { Button } from "../../../components/ui/Button";
import { Toast } from "../../../components/ui/Toast";
import { ColorPopover, ColorSwatches, InsertionLine, Placeholder, RenameField } from "../../../components/folders/FolderParts";
import { folderColorOptions, withPlaceholder } from "../../../components/folders/folderList";
import { ExerciseSettingsSheet } from "../../../components/workout/ExerciseSettingsSheet";
import { ExerciseLibrarySheet, type ExercisePick } from "../../../components/workout/ExerciseLibrarySheet";
import { WorkoutSessionSheet } from "../../../components/workout/WorkoutSessionSheet";
import { BlockSettingsSheet } from "../../../components/workout/BlockSettingsSheet";
import { MusicSection } from "../../../components/music/MusicSection";
import { PlaylistField, playlistFieldValid } from "../../../components/music/PlaylistField";
import { tidyPlaylistInput } from "../../../services/music/playlistLink";
import { folderFamily, partBFamily, routineFamily, type FolderFamily } from "../../../data/folderColors";
import { moveId, routinesIn } from "../../../services/routines/order";
import { MAX_DEPTH_NOTE, canAddSubfolder, canMoveFolder } from "../../../services/routines/folderDepth";
import { ROUTINE_NAME_RULE } from "../../../services/routines";
import { fullGroupIndex, shortDay } from "../../../services/routines/programmeLogic";
import { blockHeading, prescriptionLine } from "../../../services/workout/prescription";
import { setTargetLines } from "../../../services/workout/setTargets";
import { canGroup, defaultBlockParams, groupExercises, groupIntoRuns, moveExercise, newBlockId, pruneBlocks, ungroupBlock } from "../../../services/workout/blocks";
import type { Exercise, Routine, RoutineFolder, WorkoutBlock } from "../../../types";
import { useRoutineDrag, type DragItem, type DropTarget } from "../useRoutineDrag";
import { useCoachProgrammes } from "../useCoachProgrammes";
import { CoachSection } from "../CoachSection";
import { ProgrammeSection } from "../ProgrammeSection";
import { CentiumProgrammesEntry } from "../centium/CentiumProgrammesEntry";
import { coachColor } from "../coachColors";
import { EmptyCard } from "./parts";
import { borderCard, button40, capsLabel, popupButton } from "./styles";
import { t, tk, tn, tx } from "../../../i18n/core";

// Website viewport v1 · WC-WO.1 Routines (WC-WO Workout Web v13), from 1024px.
// The folders list (55%) beside the selected routine (45%, list-detail).
// Routines "nothing selected" is Option A (Karim, 7.2): with no routine
// selected the folders span the full width in two columns; a routine opens
// beside them when clicked, and clicking it again (or Esc) closes it. Its
// session logger opens in place of the detail (WC-WO.1.8, docked). The reads,
// writes and their refusals are the mobile RoutinesTab's, unchanged; the
// mobile tab itself is not touched. The programme, coach, cycle and music
// sections have no web design (WC-WO.5 "wait for v2", WC-WO.1.11 global
// rules): they show above and below the folders as on mobile.

type FolderAction = "rename" | "color" | "duplicate" | "subfolder" | "routine" | "delete";
type RoutineAction = "rename" | "playlist" | "duplicate" | "delete";
const MI = 16;
const FOLDER_MENU: { value: FolderAction; label: string; icon: React.ReactNode; destructive?: boolean }[] = [
  { value: "rename", label: tk("Rename"), icon: <Pencil size={MI} /> },
  { value: "color", label: tk("Edit color"), icon: <Palette size={MI} /> },
  { value: "duplicate", label: tk("Duplicate"), icon: <Copy size={MI} /> },
  { value: "subfolder", label: tk("Add subfolder"), icon: <FolderTree size={MI} /> },
  { value: "routine", label: tk("Add routine"), icon: <Plus size={MI} /> },
  { value: "delete", label: tk("Delete"), icon: <Trash2 size={MI} />, destructive: true },
];
const ROUTINE_MENU: { value: RoutineAction; label: string; icon: React.ReactNode; destructive?: boolean }[] = [
  { value: "rename", label: tk("Rename"), icon: <Pencil size={MI} /> },
  { value: "playlist", label: tk("Playlist"), icon: <Music2 size={MI} /> },
  { value: "duplicate", label: tk("Duplicate"), icon: <Copy size={MI} /> },
  { value: "delete", label: tk("Delete"), icon: <Trash2 size={MI} />, destructive: true },
];
const COACH_MENU: { value: "copy"; label: string; icon: React.ReactNode }[] = [{ value: "copy", label: tk("Save a copy"), icon: <Copy size={MI} /> }];
const inLanguage = <O extends { label: string }>(options: O[]): O[] => options.map((o) => ({ ...o, label: t(o.label) }));
/** The menu card is 220 wide (the PopupMenu adds 8 padding and a 1px border each side). */
const MENU_W = 202;

const EXPLAINED = [
  tk("A folder can't be filed inside itself or one of its own subfolders."),
  tk("That folder belongs to a different account, so it can't be used as a parent."),
  tk("You don't have permission to do that."),
  ROUTINE_NAME_RULE,
  MAX_DEPTH_NOTE,
];
const explainsItself = (message: string) =>
  /filed inside itself|different account|levels deep at most|permission|name is 1 to/i.test(message) || EXPLAINED.some((k) => t(k) === message);

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

let addedExId = 0;
const blankExerciseFromPick = (pick: ExercisePick): Exercise => ({
  id: `added-ex-${Date.now()}-${addedExId++}`,
  name: pick.name,
  sets: 3,
  reps: 10,
  weightKg: null,
  muscleGroups: pick.muscleGroups,
  secondaryMuscleGroups: pick.secondaryMuscleGroups,
  classification: pick.classification,
  isCustom: pick.isCustom,
  exerciseId: pick.exerciseId,
  customExerciseId: pick.customExerciseId,
});

/** The ongoing / paused coral (reference #E9736A). */
const CORAL = "#E9736A";
/** Where the sticky right column sits: under the 64 header and the 24 page gap. */
const STICKY_TOP = 88;
/** The column's height at rest (reference): the page below the header, the tabs and their gaps, less the 24 at the bottom. */
const COLUMN_OFFSET = 176;
const FOLDER_NAME_MAX = 40;
const ROUTINE_NAME_MAX = 60;

type Dnd = ReturnType<typeof useRoutineDrag>;

export default function RoutinesWeb({ onCreateRoutine }: { onCreateRoutine: (folderId: string | null) => void }) {
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
  const coach = useCoachProgrammes(routines, authUserId, today);
  const coachIds = coach.coachRoutineIds;
  const ownRoutines = coachIds.size ? routines.filter((r) => !coachIds.has(r.id)) : routines;
  const shade = (f: FolderFamily) => partBFamily(f, dark, hc);
  const capsInk = hc ? "rgb(var(--c-charcoal))" : dark ? "#8A8698" : "rgb(var(--thi-9a94b3))";

  const [saveToast, setSaveToast] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const run = (action: Promise<string | undefined>) => {
    void action.then((message) => {
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

  // --- web: the selected routine (Option A: nothing selected at first) ------
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(folderColorOptions[0]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [playlistFor, setPlaylistFor] = useState<{ routine: Routine; draft: string; error: string | null; saving: boolean } | null>(null);
  const [menu, setMenu] = useState<{ kind: "folder" | "routine"; id: string; anchor: HTMLElement } | null>(null);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [addingSubfolderTo, setAddingSubfolderTo] = useState<string | null>(null);
  const [subfolderName, setSubfolderName] = useState("");
  const [subfolderColor, setSubfolderColor] = useState(folderColorOptions[0]);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [pendingRoutine, setPendingRoutine] = useState<Routine | null>(null);
  const [pendingDeleteRoutine, setPendingDeleteRoutine] = useState<Routine | null>(null);
  const [stopFor, setStopFor] = useState<Routine | null>(null);
  const [settingsExercise, setSettingsExercise] = useState<{ routineId: string; exercise: Exercise } | null>(null);
  const [coachMenu, setCoachMenu] = useState<{ routineId: string; anchor: HTMLElement } | null>(null);
  const [pastOpen, setPastOpen] = useState(false);
  const [seenUpdates, setSeenUpdates] = useState<Record<string, string>>(readSeen);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [dock, setDock] = useState<HTMLDivElement | null>(null);

  const toggleFolderCollapsed = (id: string) =>
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selected = selectedId ? routines.find((r) => r.id === selectedId) ?? null : null;
  // The logger shows in the right column while it is open.
  const logging = !!activeRoutine;
  const hasRight = logging || !!selected;

  // Esc closes the detail (Option A: back to the two columns), unless a
  // sheet, popup or menu is open above the page.
  useEffect(() => {
    if (!selected || logging) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (document.querySelector(".fixed.inset-0:not(.pointer-events-none)")) return;
      setSelectedId(null);
    };
    // Capture: runs before a popup's own Esc closes it, so that Esc only closes the popup.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [selected, logging]);

  const pauseActive = () =>
    setActiveSession((a) => (a && a.status === "running" ? { ...a, status: "paused", pausedAt: new Date().toISOString() } : a));
  const resumeActive = () =>
    setActiveSession((a) =>
      a && a.status === "paused"
        ? { ...a, status: "running", pausedMs: a.pausedMs + (a.pausedAt ? Math.max(0, Date.now() - Date.parse(a.pausedAt)) : 0), pausedAt: null }
        : a
    );

  const hasCache = routines.length > 0 || routineFolders.length > 0;
  const siblingsOf = (parentId: string | null) => routineFolders.filter((f) => (f.parentId ?? null) === parentId);
  const unfiled = routinesIn(ownRoutines, null);

  // --- drag and drop: the mobile hook, one per column (its hit test reads
  // heights only, so the two Option A columns each keep their own list).
  const listRefA = useRef<HTMLDivElement>(null);
  const listRefB = useRef<HTMLDivElement>(null);
  const onDrop = (item: DragItem, target: DropTarget) => {
    if (item.kind === "routine") {
      if (target.kind === "header") run(placeRoutine(item.id, target.folderId, Number.MAX_SAFE_INTEGER));
      else if (target.kind === "group")
        run(
          placeRoutine(
            item.id,
            target.folderId,
            coachIds.size ? fullGroupIndex(routinesIn(routines, target.folderId).map((r) => r.id), coachIds, item.id, target.index) : target.index
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
  const canNest = (folderId: string, parentId: string | null) => canMoveFolder(folderId, parentId, routineFolders);
  // Option A: nothing selected splits the top-level folders over two columns
  // (the first half, then the rest with Unfiled); otherwise one column. The
  // second column's top-level drop slots count from the split.
  const topFolders = siblingsOf(null);
  const twoCols = !hasRight && topFolders.length > 0;
  const splitAt = twoCols ? Math.ceil(topFolders.length / 2) : topFolders.length;
  const colA = topFolders.slice(0, splitAt);
  const colB = topFolders.slice(splitAt);
  const dndA = useRoutineDrag(listRefA, onDrop, canNest);
  const dndB = useRoutineDrag(
    listRefB,
    (item, target) => onDrop(item, target.kind === "folders" && target.parentId === null ? { ...target, index: target.index + splitAt } : target),
    canNest
  );
  const drag = dndA.drag ?? dndB.drag;
  const draggingRoutine = drag?.item.kind === "routine" ? drag.item.id : null;
  const draggingFolder = drag?.item.kind === "folder" ? drag.item.id : null;

  const startRoutine = (r: Routine) => {
    const otherOngoingId = Object.keys(pausedSessions).find((id) => id !== r.id);
    setSelectedId(r.id);
    if (otherOngoingId) setPendingRoutine(r);
    else setActiveRoutine(r);
  };
  const confirmSwitchRoutine = () => {
    if (!pendingRoutine) return;
    Object.keys(pausedSessions).forEach((id) => {
      if (id !== pendingRoutine.id) clearPausedSession(id);
    });
    setActiveRoutine(pendingRoutine);
    setPendingRoutine(null);
  };
  // The row's play, as on mobile: a minimised paused session resumes its clock.
  const onRowPlay = (r: Routine) =>
    activeSession?.routineId === r.id && activeSession.status === "paused" ? resumeActive() : startRoutine(r);

  const onFolderAction = (folder: RoutineFolder, action: FolderAction) => {
    if (action === "rename") {
      setRenamingId(folder.id);
      setRenameDraft(folder.name);
    } else if (action === "color") setEditingColorId(folder.id);
    else if (action === "duplicate") run(duplicateRoutineFolder(folder.id));
    else if (action === "subfolder") {
      setAddingSubfolderTo(folder.id);
      setSubfolderName("");
    } else if (action === "routine") onCreateRoutine(folder.id);
    else run(deleteRoutineFolder(folder.id));
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

  // The mobile tab's queue for one routine's exercise-list writes (WO1.3 S5).
  const writeChain = useRef(new Map<string, { list: Exercise[]; done: Promise<unknown> }>());
  const queueExercises = (r: Routine, next: (cur: Exercise[]) => { exercises: Exercise[]; blocks?: WorkoutBlock[] }) => {
    if (!online) {
      setSaveToast(true);
      return;
    }
    const pending = writeChain.current.get(r.id);
    const out = next(pending?.list ?? r.exercises);
    const blocks = out.blocks;
    const done = (pending?.done ?? Promise.resolve())
      .then(() => updateRoutine(r.id, blocks ? { exercises: out.exercises, blocks } : { exercises: out.exercises }))
      .then((message) => {
        if (message) setSaveToast(true);
        if (writeChain.current.get(r.id)?.done === done) writeChain.current.delete(r.id);
      });
    writeChain.current.set(r.id, { list: out.exercises, done });
  };

  const familyOfRoutine = (r: Routine): FolderFamily => {
    const folder = r.folderId ? routineFolders.find((f) => f.id === r.folderId) : undefined;
    return shade(folder ? folderFamily(folder, routineFolders.indexOf(folder)) : routineFamily(r, routineFolders));
  };

  const renderRoutine = (
    dnd: Dnd,
    r: Routine,
    index: number,
    family: FolderFamily,
    hidden: boolean,
    coachRow?: { meta: string; today: boolean; onMenu: (anchor: HTMLElement) => void }
  ) => (
    <WebRoutineRow
      key={r.id}
      routine={r}
      family={family}
      hidden={hidden}
      selected={selectedId === r.id}
      onSelect={() => setSelectedId((id) => (id === r.id ? null : r.id))}
      onPlay={() => onRowPlay(r)}
      onPause={pauseActive}
      isOngoing={!!pausedSessions[r.id]}
      running={activeSession?.routineId === r.id && activeSession.status === "running"}
      onMenu={coachRow ? coachRow.onMenu : (anchor) => setMenu({ kind: "routine", id: r.id, anchor })}
      renaming={!coachRow && renamingId === r.id}
      renameDraft={renameDraft}
      onRenameDraft={setRenameDraft}
      onRenameCommit={() => commitRename("routine", r.id)}
      grip={coachRow ? undefined : dnd.gripProps({ kind: "routine", id: r.id, folderId: r.folderId, index })}
      metaText={coachRow?.meta}
      today={coachRow?.today}
    />
  );

  const renderGroup = (dnd: Dnd, folderId: string | null, familyOf: (r: Routine) => FolderFamily) => {
    const group = routinesIn(ownRoutines, folderId);
    const at = drag?.item.kind === "routine" && drag.target.kind === "group" && drag.target.folderId === folderId ? drag.target.index : null;
    const rest = group.filter((r) => r.id !== draggingRoutine);
    return withPlaceholder(group, draggingRoutine, at).map((entry) =>
      entry.kind === "placeholder" ? (
        <Placeholder key="placeholder" gap={8} />
      ) : (
        renderRoutine(dnd, entry.item, entry.hidden ? group.indexOf(entry.item) : rest.indexOf(entry.item), familyOf(entry.item), entry.hidden)
      )
    );
  };

  const renderFolders = (dnd: Dnd, parentId: string | null, depth: number, only?: RoutineFolder[]) => {
    const siblings = only ?? siblingsOf(parentId);
    const at = drag?.item.kind === "folder" && drag.target.kind === "folders" && drag.target.parentId === parentId ? drag.target.index : null;
    const rest = siblings.filter((f) => f.id !== draggingFolder);
    return withPlaceholder(siblings, draggingFolder, at).map((entry) =>
      entry.kind === "placeholder" ? (
        <Placeholder key="placeholder" gap={parentId === null ? 14 : 8} />
      ) : (
        renderFolder(dnd, entry.item, depth, entry.hidden ? siblings.indexOf(entry.item) : rest.indexOf(entry.item), entry.hidden)
      )
    );
  };

  const renderFolder = (dnd: Dnd, folder: RoutineFolder, depth: number, index: number, hidden: boolean): React.ReactNode => {
    const folderRoutines = routinesIn(ownRoutines, folder.id);
    const collapsed = collapsedFolders.has(folder.id);
    const family = shade(folderFamily(folder, routineFolders.indexOf(folder)));
    const item: DragItem = { kind: "folder", id: folder.id, parentId: folder.parentId ?? null, index };
    return (
      <div
        key={folder.id}
        data-dnd-folder-block
        data-flip={`f:${folder.id}`}
        className="flex flex-col"
        style={{ gap: 8, marginInlineStart: depth ? 20 : 0, display: hidden ? "none" : undefined }}
      >
        <WebFolderHead
          folder={folder}
          family={family}
          count={folderRoutines.length}
          collapsed={collapsed}
          highlighted={(drag?.target.kind === "header" || drag?.target.kind === "into") && drag.target.folderId === folder.id}
          menuOpen={menu?.kind === "folder" && menu.id === folder.id}
          onToggle={() => toggleFolderCollapsed(folder.id)}
          onMenu={(anchor) => setMenu({ kind: "folder", id: folder.id, anchor })}
          renaming={renamingId === folder.id}
          renameDraft={renameDraft}
          onRenameDraft={setRenameDraft}
          onRenameCommit={() => commitRename("folder", folder.id)}
          grip={dnd.gripProps(item)}
          colorEditor={
            editingColorId === folder.id && (
              <ColorPopover value={folder.color} onPick={(c) => run(updateRoutineFolder(folder.id, { color: c }))} onDone={() => setEditingColorId(null)} />
            )
          }
        />
        {!collapsed && (
          <div className="flex flex-col" style={{ gap: 8 }}>
            <div data-dnd-group={folder.id} className="flex flex-col" style={{ gap: 8 }}>
              {renderGroup(dnd, folder.id, () => family)}
            </div>
            {addingSubfolderTo === folder.id && (
              <div className="flex flex-col" style={{ gap: 10, marginInlineStart: 20 }}>
                <div className="flex" style={{ gap: 8 }}>
                  <input
                    autoFocus
                    value={subfolderName}
                    maxLength={FOLDER_NAME_MAX}
                    aria-label={t("Subfolder name")}
                    onChange={(e) => setSubfolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setAddingSubfolderTo(null);
                      if (e.key === "Enter" && subfolderName.trim()) {
                        guard(() => run(addRoutineFolder(subfolderName.trim(), folder.id, subfolderColor)))();
                        setAddingSubfolderTo(null);
                      }
                    }}
                    placeholder={t("Subfolder name…")}
                    style={fieldStyle}
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (subfolderName.trim()) guard(() => run(addRoutineFolder(subfolderName.trim(), folder.id, subfolderColor)))();
                      setAddingSubfolderTo(null);
                    }}
                    className="hover:scale-[0.98] active:scale-[0.96]"
                    style={addButton}
                  >
                    {t("Add")}
                  </button>
                </div>
                <ColorSwatches value={subfolderColor} onPick={setSubfolderColor} size={28} />
              </div>
            )}
            <div data-dnd-folders={folder.id} className="flex flex-col empty:hidden" style={{ gap: 8 }}>
              {renderFolders(dnd, folder.id, depth + 1)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderUnfiled = (dnd: Dnd) =>
    (unfiled.length > 0 || draggingRoutine) && (
      <div data-flip="unfiled" className="flex flex-col" style={{ gap: 8 }}>
        <p style={{ ...capsLabel(capsInk), margin: "6px 0 0" }}>{t("Unfiled")}</p>
        <div
          data-dnd-group=""
          className="flex flex-col"
          style={{
            gap: 8,
            ...(draggingRoutine && unfiled.every((r) => r.id === draggingRoutine) && !(drag?.target.kind === "group" && drag.target.folderId === null)
              ? { minHeight: 64, borderRadius: 14, border: "1.5px dashed rgba(36,31,27,0.14)" }
              : null),
          }}
        >
          {renderGroup(dnd, null, (r) => shade(routineFamily(r, routineFolders)))}
        </div>
      </div>
    );


  const menuFolder = menu?.kind === "folder" ? routineFolders.find((f) => f.id === menu.id) : undefined;
  const menuRoutine = menu?.kind === "routine" ? routines.find((r) => r.id === menu.id) : undefined;
  const dragFolder = draggingFolder ? routineFolders.find((f) => f.id === draggingFolder) : undefined;
  const dragRoutine = draggingRoutine ? routines.find((r) => r.id === draggingRoutine) : undefined;
  const empty = ownRoutines.length === 0 && routineFolders.length === 0;

  const loadingOrError = (
    <>
      {actionError && <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#C0392B" }}>{t(actionError)}</p>}
      {routinesError && !actionError && hasCache && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#C0392B" }}>{t("Couldn't refresh your routines. Showing what was saved on this device.")}</p>
      )}
      {routinesError && !hasCache && (
        <div role="alert" className="flex flex-col items-center text-center" style={{ gap: 6, padding: "20px 0" }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{t("Couldn't load your routines.")}</p>
          <button type="button" onClick={retryRoutines} style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#7D6BB5" }}>
            {t("Retry")}
          </button>
        </div>
      )}
      {!routinesHydrated && !routinesError && !hasCache && (
        <div aria-hidden className="flex flex-col" style={{ gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-skeleton-pulse" style={{ height: 64, borderRadius: 14, background: "#F5F5F6" }} />
          ))}
        </div>
      )}
    </>
  );

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: hasRight ? "minmax(0,55fr) minmax(0,45fr)" : "minmax(0,1fr)", gap: 24, alignItems: "start" }}
      onClick={() => {
        if (editingColorId) setEditingColorId(null);
      }}
    >
      {/* The folders column (both Option A columns when nothing is selected). */}
      <div className="min-w-0 flex flex-col" style={{ gap: 14 }}>
        <CyclePhaseStrip />
        <ReadinessCard web />
        <ProgrammeSection
          routines={routines}
          today={today}
          dark={dark}
          capsInk={capsInk}
          onStart={(r) => onRowPlay(r)}
        />
        <CentiumProgrammesEntry />
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
            renderRoutine(dndA, r, 0, family, false, { meta, today: isToday, onMenu: (anchor) => setCoachMenu({ routineId: r.id, anchor }) })
          }
        />

        <div className="flex items-center justify-between" style={{ flex: "none" }}>
          <p style={capsLabel(capsInk)}>{t("Folders")}</p>
          <button
            type="button"
            onClick={() => {
              if (newFolderOpen) setNewFolderName("");
              setNewFolderOpen((v) => !v);
            }}
            title={t("New folder")}
            aria-label={t("New folder")}
            aria-expanded={newFolderOpen}
            className="grid place-items-center hover:!bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ width: 36, height: 36, borderRadius: 10, background: newFolderOpen ? "#F0EDF9" : "transparent", color: "#6B41EF" }}
          >
            <FolderPlus size={20} />
          </button>
        </div>

        {loadingOrError}

        {newFolderOpen && (
          <div className="flex flex-col" style={{ gap: 10, flex: "none" }}>
            <div className="flex" style={{ gap: 8 }}>
              <input
                autoFocus
                value={newFolderName}
                maxLength={FOLDER_NAME_MAX}
                aria-label={t("Folder name")}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setNewFolderName("");
                    setNewFolderOpen(false);
                  }
                  if (e.key === "Enter" && newFolderName.trim()) {
                    guard(() => run(addRoutineFolder(newFolderName.trim(), null, newFolderColor)))();
                    setNewFolderName("");
                    setNewFolderOpen(false);
                  }
                }}
                placeholder={t("Folder name…")}
                style={fieldStyle}
                className={fieldClass}
              />
              <button
                type="button"
                onClick={() => {
                  if (newFolderName.trim()) guard(() => run(addRoutineFolder(newFolderName.trim(), null, newFolderColor)))();
                  setNewFolderName("");
                  setNewFolderOpen(false);
                }}
                className="hover:scale-[0.98] active:scale-[0.96]"
                style={addButton}
              >
                {t("Add")}
              </button>
            </div>
            <ColorSwatches value={newFolderColor} onPick={setNewFolderColor} size={28} />
          </div>
        )}

        {empty && routinesHydrated && !routinesError ? (
          // WC-WO.1 · empty: Foundations › Empty state on the grey card.
          <EmptyCard>
            <span className="grid place-items-center" style={{ width: 64, height: 64, borderRadius: 16, background: "#F0EDF9" }}>
              <Dumbbell size={30} strokeWidth={1.25} absoluteStrokeWidth style={{ color: "#7D67D9" }} />
            </span>
            <p style={{ margin: "14px 0 0", fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{t("No routines yet")}</p>
            <p style={{ margin: "4px 0 0", maxWidth: 300, fontSize: 15, lineHeight: "24px", fontWeight: 500, color: "#71685E" }}>
              {t("Start from a ready-made program, or build your own.")}
            </p>
          </EmptyCard>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: twoCols ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: "14px 24px", alignItems: "start" }}>
            <div ref={listRefA} onClickCapture={dndA.onClickCapture} className="min-w-0 flex flex-col" style={{ gap: 14 }}>
              <div data-dnd-folders="" className="flex flex-col empty:hidden" style={{ gap: 14 }}>
                {renderFolders(dndA, null, 0, twoCols ? colA : undefined)}
              </div>
              {!twoCols && renderUnfiled(dndA)}
            </div>
            {twoCols && (
              <div ref={listRefB} onClickCapture={dndB.onClickCapture} className="min-w-0 flex flex-col" style={{ gap: 14 }}>
                {colB.length > 0 && (
                  <div data-dnd-folders="" className="flex flex-col" style={{ gap: 14 }}>
                    {renderFolders(dndB, null, 0, colB)}
                  </div>
                )}
                {renderUnfiled(dndB)}
              </div>
            )}
          </div>
        )}

        {/* WC-WO.1.11 Play your music (global rules): the mobile section, under the list. */}
        <section aria-label={t("Music")} className="flex flex-col" style={{ gap: 10, marginTop: 4 }}>
          <p style={capsLabel(capsInk)}>{t("Music")}</p>
          <div style={{ maxWidth: 560 }}>
            <MusicSection moment="workout" />
          </div>
        </section>
      </div>

      {/* The right column: the docked logger, or the selected routine. */}
      {hasRight && (
        <div className="min-w-0" style={{ position: "sticky", top: STICKY_TOP }}>
          {logging ? (
            <div
              ref={setDock}
              data-web-logger
              style={{ ...borderCard, position: "relative", overflow: "hidden", height: `calc(100dvh - ${COLUMN_OFFSET}px)`, minHeight: 480 }}
            />
          ) : (
            selected && (
              <RoutineDetail
                key={selected.id}
                routine={selected}
                family={familyOfRoutine(selected)}
                folderName={selected.folderId ? routineFolders.find((f) => f.id === selected.folderId)?.name ?? null : null}
                ctl={
                  activeSession?.routineId === selected.id
                    ? activeSession.status === "running"
                      ? "running"
                      : "paused"
                    : "idle"
                }
                onPlay={() => startRoutine(selected)}
                onPause={pauseActive}
                onResume={() => {
                  resumeActive();
                  setActiveRoutine(selected);
                }}
                onStop={() => setStopFor(selected)}
                onSettings={(ex) => setSettingsExercise({ routineId: selected.id, exercise: ex })}
                onDeleteExercise={(exId) => queueExercises(selected, (cur) => ({ exercises: cur.filter((e) => e.id !== exId) }))}
                onReplaceExercise={(exId, pick) =>
                  queueExercises(selected, (cur) => ({
                    exercises: cur.map((e) =>
                      e.id === exId
                        ? { ...e, name: pick.name, muscleGroups: pick.muscleGroups, secondaryMuscleGroups: pick.secondaryMuscleGroups, classification: pick.classification, isCustom: pick.isCustom, exerciseId: pick.exerciseId, customExerciseId: pick.customExerciseId }
                        : e
                    ),
                  }))
                }
                onAddExercise={(pick) => queueExercises(selected, (cur) => ({ exercises: [...cur, blankExerciseFromPick(pick)] }))}
                onArrange={(exercises, blocks) => queueExercises(selected, () => ({ exercises, blocks }))}
              />
            )
          )}
        </div>
      )}

      <PopupMenu<FolderAction>
        open={!!menuFolder}
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        width={MENU_W}
        align="right"
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
        width={MENU_W}
        align="right"
        options={inLanguage(ROUTINE_MENU)}
        onSelect={(action) => menuRoutine && onRoutineAction(menuRoutine, action)}
      />
      <PopupMenu<"copy">
        open={!!coachMenu}
        anchor={coachMenu?.anchor ?? null}
        onClose={() => setCoachMenu(null)}
        width={MENU_W}
        align="right"
        options={inLanguage(COACH_MENU)}
        onSelect={() => coachMenu && guard(() => run(duplicateRoutine(coachMenu.routineId)))()}
      />

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

      <BottomSheet open={pastOpen} onClose={() => setPastOpen(false)} title={t("Past programmes")}>
        <div className="flex flex-col" style={{ gap: 6 }}>
          {coach.past.map((p) => (
            <div key={p.id} style={{ padding: "12px 14px", borderRadius: 14, background: coachColor("soft", dark) }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{p.name}</p>
              {p.endedOn && <p style={{ margin: 0, fontSize: 13, color: coachColor("faint", dark) }}>{t("Ended {date}", { date: shortDay(p.endedOn) })}</p>}
            </div>
          ))}
        </div>
      </BottomSheet>

      {drag && <InsertionLine listRef={dndA.drag ? listRefA : listRefB} />}
      {drag &&
        (dragRoutine || dragFolder) &&
        createPortal(
          <div
            aria-hidden
            className="fixed pointer-events-none"
            style={{ zIndex: 55, left: drag.left, width: drag.width, top: drag.y - drag.offsetY, transform: "scale(1.03)", borderRadius: 14, boxShadow: "0 14px 30px rgba(36,31,27,0.18)" }}
          >
            {dragRoutine ? (
              <WebRoutineRow routine={dragRoutine} family={familyOfRoutine(dragRoutine)} isOngoing={!!pausedSessions[dragRoutine.id]} />
            ) : (
              <WebFolderHead
                folder={dragFolder!}
                family={shade(folderFamily(dragFolder!, routineFolders.indexOf(dragFolder!)))}
                count={routinesIn(ownRoutines, dragFolder!.id).length}
                collapsed={collapsedFolders.has(dragFolder!.id)}
              />
            )}
          </div>,
          document.body
        )}

      <ExerciseSettingsSheet
        open={!!settingsExercise}
        onClose={() => setSettingsExercise(null)}
        exercise={settingsExercise?.exercise ?? null}
        routineId={settingsExercise?.routineId ?? null}
        onSave={(patch) => {
          if (!settingsExercise) return;
          const routine = routines.find((r) => r.id === settingsExercise.routineId);
          if (!routine) return;
          run(updateRoutine(routine.id, { exercises: routine.exercises.map((e) => (e.id === settingsExercise.exercise.id ? { ...e, ...patch } : e)) }));
        }}
        onDelete={() => {
          if (!settingsExercise) return;
          const routine = routines.find((r) => r.id === settingsExercise.routineId);
          if (!routine) return;
          run(updateRoutine(routine.id, { exercises: routine.exercises.filter((e) => e.id !== settingsExercise.exercise.id) }));
        }}
      />

      {activeRoutine && dock && (
        <WorkoutSessionSheet
          open
          dock={dock}
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

      {/* WC-WO.1.3: the centred popups (Cancel ongoing routine?, Delete routine?). */}
      <CentredPopup
        open={!!pendingRoutine}
        onClose={() => setPendingRoutine(null)}
        alert
        title={t("Cancel ongoing routine?")}
        body={pendingRoutine ? t("Starting \"{name}\" will cancel your other ongoing routine entirely. Its progress won't be saved.", { name: pendingRoutine.name }) : undefined}
      >
        <div className="flex w-full" style={{ gap: 10, marginTop: 20 }}>
          <button type="button" onClick={() => setPendingRoutine(null)} style={{ ...popupButton, background: "#F5F5F6", color: "#241F1B" }}>
            {t("Keep going")}
          </button>
          <button type="button" onClick={confirmSwitchRoutine} style={{ ...popupButton, background: "#A198DF", color: "#FFFFFF" }}>
            {t("Start anyway")}
          </button>
        </div>
      </CentredPopup>
      <CentredPopup
        open={!!pendingDeleteRoutine}
        onClose={() => setPendingDeleteRoutine(null)}
        alert
        title={t("Delete routine?")}
        body={pendingDeleteRoutine ? t("\"{name}\" and its exercises will be permanently removed. This can't be undone.", { name: pendingDeleteRoutine.name }) : undefined}
      >
        <div className="flex w-full" style={{ gap: 10, marginTop: 20 }}>
          <button type="button" onClick={() => setPendingDeleteRoutine(null)} style={{ ...popupButton, background: "#F5F5F6", color: "#241F1B" }}>
            {tx("Keep it", "routine")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (pendingDeleteRoutine) {
                if (selectedId === pendingDeleteRoutine.id) setSelectedId(null);
                guard(() => run(deleteRoutine(pendingDeleteRoutine.id)))();
              }
              setPendingDeleteRoutine(null);
            }}
            style={{ ...popupButton, background: "#FCEDEC", color: "#B4372C" }}
          >
            {t("Delete")}
          </button>
        </div>
      </CentredPopup>
      {/* WC-WO.1 Routine play controls · Stop → Quit workout? (the logger's
          own quit: the sets stay saved and the routine resumes from its row). */}
      <CentredPopup
        open={!!stopFor}
        onClose={() => setStopFor(null)}
        alert
        title={t("Quit workout?")}
        body={t("Your progress will be saved. You can resume this workout anytime.")}
      >
        <div className="flex w-full" style={{ gap: 10, marginTop: 20 }}>
          <button type="button" onClick={() => setStopFor(null)} style={{ ...popupButton, background: "#F5F5F6", color: "#241F1B" }}>
            {t("Keep going")}
          </button>
          <button
            type="button"
            onClick={() => {
              const r = stopFor;
              setStopFor(null);
              if (r) setActiveSession((prev) => (prev?.routineId === r.id ? null : prev));
            }}
            style={{ ...popupButton, background: "#FCEDEC", color: "#B4372C" }}
          >
            {t("Quit")}
          </button>
        </div>
      </CentredPopup>
    </div>
  );
}

const fieldClass = "flex-1 min-w-0 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-[#AEA1DC]/40";
const fieldStyle: React.CSSProperties = {
  height: 40,
  boxSizing: "border-box",
  borderRadius: 12,
  background: "#F5F5F6",
  border: "0.5px solid rgba(36,31,27,0.06)",
  padding: "0 14px",
  fontSize: 15,
  lineHeight: "24px",
};
const addButton: React.CSSProperties = { flex: "none", height: 40, padding: "0 18px", borderRadius: 12, border: "none", background: "#A198DF", color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600 };

type GripProps = Record<string, unknown> & { style?: React.CSSProperties };

/**
 * A folder header (reference): 64 min, r14, padding 0 16 0 12, gap 14, the
 * folder colour; a 40 r12 tile with a white folder 20; the name 17/24 800
 * white and a chevron 16 (2.4); the count 13/20 at 86%; ⋮ and the grip 20.
 */
const WebFolderHead: React.FC<{
  folder: RoutineFolder;
  family: FolderFamily;
  count: number;
  collapsed: boolean;
  highlighted?: boolean;
  menuOpen?: boolean;
  onToggle?: () => void;
  onMenu?: (anchor: HTMLElement) => void;
  renaming?: boolean;
  renameDraft?: string;
  onRenameDraft?: (v: string) => void;
  onRenameCommit?: () => void;
  grip?: GripProps;
  colorEditor?: React.ReactNode;
}> = ({ folder, family, count, collapsed, highlighted, menuOpen, onToggle, onMenu, renaming, renameDraft, onRenameDraft, onRenameCommit, grip, colorEditor }) => (
  <div
    data-drag-card
    data-dnd-header={onToggle ? folder.id : undefined}
    className="flex items-center select-none"
    style={{ gap: 14, minHeight: 64, borderRadius: 14, paddingBlock: 0, paddingInline: "12px 16px", background: family.head, boxShadow: highlighted || menuOpen ? `0 0 0 2px ${family.bar}` : "none" }}
  >
    <span className="grid place-items-center" style={{ width: 40, height: 40, borderRadius: 12, background: family.tile, flex: "none" }}>
      <Folder size={20} color="#FFFFFF" />
    </span>
    {renaming ? (
      <RenameField value={renameDraft ?? ""} onChange={(v) => onRenameDraft?.(v)} onCommit={() => onRenameCommit?.()} tone="light" ink="#FFFFFF" />
    ) : (
      <button type="button" onClick={onToggle} aria-expanded={!collapsed} className="flex-1 min-w-0 text-start self-stretch flex flex-col justify-center">
        <span className="flex items-center" style={{ gap: 6 }}>
          <span className="truncate" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 800, color: "#FFFFFF" }}>
            {folder.name}
          </span>
          <ChevronDown size={16} strokeWidth={2.4} style={{ color: "#FFFFFF", flex: "none", transform: collapsed ? "rotate(-90deg)" : undefined, transition: "transform .2s" }} className={collapsed ? "rtl:!rotate-90" : undefined} />
        </span>
        <span style={{ display: "block", fontSize: 13, lineHeight: "20px", color: "rgba(255,255,255,0.86)" }}>{tn(count, "{n} routine", "{n} routines")}</span>
      </button>
    )}
    <span className="relative flex" data-no-drag>
      <button type="button" onClick={(e) => onMenu?.(e.currentTarget)} aria-label={t("Folder options")} aria-haspopup="menu" className="flex" style={{ color: "#FFFFFF" }}>
        <MoreVertical size={20} />
      </button>
      {colorEditor}
    </span>
    {grip && (
      <span {...grip} role="button" aria-label={t("Drag folder")} className="flex" style={{ color: "#FFFFFF", cursor: "grab", ...(grip.style ?? {}) }}>
        <GripVertical size={20} />
      </span>
    )}
  </div>
);

/**
 * A routine row (reference): 64 min, r14, the folder's row tint; a 4 × 36
 * accent bar 16 from the edge; the name 17/24 700 (ellipsis) and the state
 * badge 11/16 700 caps; the meta 13/20 #8C8378; play 40 round with a 15
 * glyph; ⋮ and the grip 20 #A79E93. Selected: a 2px ring in the bar colour.
 */
const WebRoutineRow: React.FC<{
  routine: Routine;
  family: FolderFamily;
  hidden?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  isOngoing?: boolean;
  running?: boolean;
  onMenu?: (anchor: HTMLElement) => void;
  renaming?: boolean;
  renameDraft?: string;
  onRenameDraft?: (v: string) => void;
  onRenameCommit?: () => void;
  grip?: GripProps;
  metaText?: string;
  today?: boolean;
}> = ({ routine, family, hidden, selected, onSelect, onPlay, onPause, isOngoing, running, onMenu, renaming, renameDraft, onRenameDraft, onRenameCommit, grip, metaText, today }) => {
  const on = !!isOngoing;
  const meta = metaText ?? `${tn(routine.exercises.length, "{n} exercise", "{n} exercises")} • ${t("~{n} min", { n: routine.estimatedDurationMin })}`;
  return (
    <div
      data-dnd-row
      data-drag-card
      data-flip={`r:${routine.id}`}
      data-selected={selected || undefined}
      className="flex items-center select-none hover:brightness-[0.985]"
      style={{ gap: 14, minHeight: 64, borderRadius: 14, paddingInline: "0 16px", background: family.row, boxShadow: selected ? `0 0 0 2px ${family.bar}` : "none", display: hidden ? "none" : undefined }}
    >
      <span aria-hidden style={{ width: 4, height: 36, borderRadius: 999, marginInlineStart: 16, flex: "none", background: on ? CORAL : family.bar }} />
      {renaming ? (
        <RenameField value={renameDraft ?? ""} onChange={(v) => onRenameDraft?.(v)} onCommit={() => onRenameCommit?.()} tone="dark" />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={onSelect ? !!selected : undefined}
          className="flex-1 min-w-0 text-start self-stretch flex flex-col justify-center focus-visible:outline-none"
        >
          <span className="flex items-center min-w-0" style={{ gap: 8 }}>
            <span className="truncate min-w-0" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
              {routine.name}
            </span>
            {today && !on && (
              <span className="shrink-0 uppercase" style={{ fontSize: 11, lineHeight: "16px", fontWeight: 800, letterSpacing: "0.06em", borderRadius: 6, padding: "1px 6px", background: family.play, color: "#FFFFFF" }}>
                {t("Today")}
              </span>
            )}
            {on && (
              <span className="flex items-center shrink-0 uppercase" style={{ gap: 4, fontSize: 11, lineHeight: "16px", fontWeight: 700, letterSpacing: "0.04em", color: CORAL }}>
                {running ? <Play size={11} fill={CORAL} /> : <Pause size={11} fill={CORAL} />}
                {running ? t("Ongoing") : t("Paused")}
              </span>
            )}
          </span>
          <span className="truncate" style={{ display: "block", fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
            {meta}
          </span>
        </button>
      )}
      <button
        type="button"
        data-no-drag
        onClick={on && running ? onPause : onPlay}
        aria-label={on ? (running ? t("Pause {name}", { name: routine.name }) : t("Resume {name}", { name: routine.name })) : t("Start {name}", { name: routine.name })}
        className="grid place-items-center hover:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
        style={{ width: 40, height: 40, borderRadius: 999, flex: "none", background: on ? CORAL : family.play }}
      >
        {on && running ? <Pause size={15} fill="#FFFFFF" color="#FFFFFF" /> : <Play size={15} fill="#FFFFFF" color="#FFFFFF" style={{ marginInlineStart: 1 }} />}
      </button>
      <button type="button" data-no-drag onClick={(e) => onMenu?.(e.currentTarget)} aria-label={t("Options for {name}", { name: routine.name })} aria-haspopup="menu" className="flex" style={{ color: "#776E64" }}>
        <MoreVertical size={20} />
      </button>
      {grip && (
        <span {...grip} role="button" aria-label={t("Drag {name}", { name: routine.name })} className="flex" style={{ color: "#776E64", cursor: "grab", ...(grip.style ?? {}) }}>
          <GripVertical size={20} />
        </span>
      )}
    </div>
  );
};

/** Superset blocks (reference): #FBF1EB with #B4602F caps; the other kinds keep their BlockCard hue. */
const BLOCK_TONE: Record<WorkoutBlock["kind"], { bg: string; ink: string }> = {
  superset: { bg: "#FBF1EB", ink: "#B4602F" },
  amrap: { bg: "rgba(79,143,138,0.09)", ink: "#3C6B65" },
  emom: { bg: "rgba(63,110,147,0.08)", ink: "#3F6E93" },
  for_time: { bg: "rgba(138,88,120,0.08)", ink: "#8A5878" },
};

/**
 * The selected routine (reference aside): 1px #EEEDED r16, padding 20, gap
 * 16. The head: a 4 × 44 bar, the folder in caps, the name 20/28 700, the
 * meta; the play controls (Play · Pause + Stop · Resume + Stop, 40). Exercise
 * rows 56 min, r12, #F5F5F6 (hover #EFEFF1), grip and settings 16; blocks on
 * their tint with the caps heading. Add exercise (dashed) and Group under it.
 * The swipe actions of mobile are hover buttons here (Replace, Delete), and
 * the grip reorders (drag, or the arrow keys on it).
 */
const RoutineDetail: React.FC<{
  routine: Routine;
  family: FolderFamily;
  folderName: string | null;
  ctl: "idle" | "running" | "paused";
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSettings: (ex: Exercise) => void;
  onDeleteExercise: (id: string) => void;
  onReplaceExercise: (id: string, pick: ExercisePick) => void;
  onAddExercise: (pick: ExercisePick) => void;
  onArrange: (exercises: Exercise[], blocks: WorkoutBlock[]) => void;
}> = ({ routine, family, folderName, ctl, onPlay, onPause, onResume, onStop, onSettings, onDeleteExercise, onReplaceExercise, onAddExercise, onArrange }) => {
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [queuedNames, setQueuedNames] = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [blockDraft, setBlockDraft] = useState<{ block: WorkoutBlock; memberIds: string[] } | null>(null);
  const [groupProblem, setGroupProblem] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const blocks = routine.blocks ?? [];
  const exitSelecting = () => {
    setSelecting(false);
    setPicked([]);
    setGroupProblem(null);
  };
  const startGrouping = () => {
    const check = canGroup(routine.exercises, picked);
    if (!check.ok) {
      setGroupProblem(check.message);
      return;
    }
    setGroupProblem(null);
    setBlockDraft({ block: { id: newBlockId(), kind: "superset", ...defaultBlockParams("superset") }, memberIds: [...picked] });
  };
  const commitBlock = (block: WorkoutBlock, memberIds: string[]) => {
    const existing = blocks.some((b) => b.id === block.id);
    const nextExercises = existing ? routine.exercises : groupExercises(routine.exercises, memberIds, block);
    const nextBlocks = existing ? blocks.map((b) => (b.id === block.id ? block : b)) : [...blocks, block];
    onArrange(nextExercises, pruneBlocks(nextExercises, nextBlocks));
    exitSelecting();
  };
  const ungroup = (blockId: string) => {
    const nextExercises = ungroupBlock(routine.exercises, blockId);
    onArrange(nextExercises, pruneBlocks(nextExercises, blocks));
    exitSelecting();
  };
  /** Moves one exercise to another's place, one step at a time (a step that would break a block stops it). */
  const moveTo = (id: string, targetId: string) => {
    let list = routine.exercises;
    const target = list.findIndex((e) => e.id === targetId);
    for (let guardN = 0; guardN < list.length; guardN++) {
      const at = list.findIndex((e) => e.id === id);
      if (at === target) break;
      const next = moveExercise(list, id, at < target ? "down" : "up");
      if (next === list) break;
      list = next;
    }
    if (list !== routine.exercises) onArrange(list, blocks);
  };
  const step = (id: string, dir: "up" | "down") => {
    const next = moveExercise(routine.exercises, id, dir);
    if (next !== routine.exercises) onArrange(next, blocks);
  };

  const meta = `${tn(routine.exercises.length, "{n} exercise", "{n} exercises")} • ${t("~{n} min", { n: routine.estimatedDurationMin })}`;
  const fill: React.CSSProperties = { ...button40, background: family.play, color: "#FFFFFF", border: "none" };
  const stop: React.CSSProperties = { ...button40, background: "#FFFFFF", color: family.tile, border: `1.5px solid ${family.bar}` };

  const exRow = (ex: Exercise) => {
    const line = prescriptionLine(ex);
    const targets = setTargetLines(ex.setTargets);
    return (
      <div
        key={ex.id}
        onDragOver={(e) => {
          if (!dragId || dragId === ex.id) return;
          e.preventDefault();
          setOverId(ex.id);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId && dragId !== ex.id) moveTo(dragId, ex.id);
          setDragId(null);
          setOverId(null);
        }}
        className="group flex items-center hover:!bg-[#EFEFF1]"
        style={{ gap: 12, minHeight: 56, padding: "6px 12px", boxSizing: "border-box", borderRadius: 12, background: "#F5F5F6", boxShadow: overId === ex.id ? "inset 0 0 0 2px #AEA1DC" : "none", opacity: dragId === ex.id ? 0.5 : 1 }}
      >
        {selecting ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={picked.includes(ex.id)}
            disabled={!!ex.blockId}
            aria-label={t("Select {name}", { name: ex.name })}
            onClick={() => setPicked((p) => (p.includes(ex.id) ? p.filter((x) => x !== ex.id) : [...p, ex.id]))}
            className="grid place-items-center"
            style={{ width: 20, height: 20, borderRadius: 6, flex: "none", border: `2px solid ${ex.blockId ? "#D6D2CB" : picked.includes(ex.id) ? "#AEA1DC" : "rgba(36,31,27,0.2)"}`, background: picked.includes(ex.id) ? "#AEA1DC" : "transparent" }}
          >
            {picked.includes(ex.id) && <Check size={12} strokeWidth={3} color="#FFFFFF" />}
          </button>
        ) : (
          <span
            role="button"
            tabIndex={0}
            draggable
            aria-label={t("Drag {name}", { name: ex.name })}
            title={t("Drag {name}", { name: ex.name })}
            onDragStart={(e) => {
              setDragId(ex.id);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", ex.id);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                step(ex.id, e.key === "ArrowUp" ? "up" : "down");
              }
            }}
            className="flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ color: "#776E64", cursor: "grab", flex: "none" }}
          >
            <GripVertical size={16} />
          </span>
        )}
        <button type="button" onClick={() => !selecting && onSettings(ex)} className="flex-1 min-w-0 text-start">
          <span className="block truncate" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#241F1B" }}>
            {ex.name}
          </span>
          {line && <span className="block truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{line}</span>}
          {targets.map((x) => (
            <span key={x} className="block truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
              {x}
            </span>
          ))}
        </button>
        {!selecting && (
          <>
            <span className="hidden group-hover:flex group-focus-within:flex items-center" style={{ gap: 6 }}>
              <button type="button" onClick={() => setReplaceTarget(ex.id)} aria-label={t("Replace {name}", { name: ex.name })} title={t("Replace {name}", { name: ex.name })} className="grid place-items-center" style={{ width: 32, height: 32, borderRadius: 10, background: "#FFFFFF", color: "#5B5349" }}>
                <Repeat size={16} />
              </button>
              <button type="button" onClick={() => onDeleteExercise(ex.id)} aria-label={t("Delete {name}", { name: ex.name })} title={t("Delete {name}", { name: ex.name })} className="grid place-items-center" style={{ width: 32, height: 32, borderRadius: 10, background: "#FCEDEC", color: "#B4372C" }}>
                <Trash2 size={16} />
              </button>
            </span>
            <button type="button" onClick={() => onSettings(ex)} aria-label={t("Settings for {name}", { name: ex.name })} className="flex" style={{ color: "#776E64", flex: "none" }}>
              <Settings2 size={16} />
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <aside
      aria-label={routine.name}
      className="flex flex-col"
      style={{ ...borderCard, padding: 20, gap: 16, maxHeight: `calc(100dvh - ${COLUMN_OFFSET}px)`, minWidth: 0 }}
    >
      <div className="flex items-center" style={{ gap: 14, flex: "none" }}>
        <span aria-hidden style={{ width: 4, height: 44, borderRadius: 999, background: family.bar, flex: "none" }} />
        <div className="flex-1 min-w-0">
          <p className="truncate" style={capsLabel()}>{folderName ?? t("Unfiled")}</p>
          <h2 className="truncate" title={routine.name} style={{ margin: 0, fontSize: 20, lineHeight: "28px", fontWeight: 700, color: "#241F1B" }}>
            {routine.name}
          </h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{meta}</p>
        </div>
        <div className="flex" style={{ gap: 8, flex: "none" }}>
          {ctl === "idle" && (
            <button type="button" onClick={onPlay} aria-label={t("Start {name}", { name: routine.name })} className="hover:scale-[0.98] active:scale-[0.96]" style={fill}>
              <Play size={16} fill="#FFFFFF" />
              {t("Play")}
            </button>
          )}
          {ctl === "running" && (
            <button type="button" onClick={onPause} aria-label={t("Pause {name}", { name: routine.name })} className="hover:scale-[0.98] active:scale-[0.96]" style={fill}>
              <Pause size={16} fill="#FFFFFF" />
              {t("Pause")}
            </button>
          )}
          {ctl === "paused" && (
            <button type="button" onClick={onResume} aria-label={t("Resume {name}", { name: routine.name })} className="hover:scale-[0.98] active:scale-[0.96]" style={fill}>
              <Play size={16} fill="#FFFFFF" />
              {t("Resume")}
            </button>
          )}
          {ctl !== "idle" && (
            <button type="button" onClick={onStop} aria-label={t("Stop {name}", { name: routine.name })} className="hover:scale-[0.98] active:scale-[0.96]" style={stop}>
              <Square size={16} fill={family.tile} />
              {t("Stop")}
            </button>
          )}
        </div>
      </div>

      {(selecting || groupProblem) && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: groupProblem ? "#C0392B" : "#71685E", flex: "none" }}>
          {groupProblem ? t(groupProblem) : picked.length === 0 ? t("Pick exercises that sit next to each other.") : t("{n} selected", { n: picked.length })}
        </p>
      )}

      <div className="flex flex-col" style={{ flex: "0 1 auto", minHeight: 0, overflow: "auto", scrollbarWidth: "none", gap: 8 }}>
        {routine.exercises.length === 0 && (
          <p style={{ margin: 0, padding: "16px 0", textAlign: "center", fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{tn(0, "{n} exercise", "{n} exercises")}</p>
        )}
        {groupIntoRuns(routine.exercises, blocks).map((r, i) =>
          r.block ? (
            <div key={r.block.id} style={{ borderRadius: 12, background: BLOCK_TONE[r.block.kind].bg, padding: "10px 8px 8px" }}>
              <button
                type="button"
                onClick={() => setBlockDraft({ block: r.block!, memberIds: r.members.map((m) => m.id) })}
                className="text-start"
                style={{ display: "block", margin: "0 0 6px 4px", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: BLOCK_TONE[r.block.kind].ink }}
              >
                {blockHeading(r.block, r.ordinal)}
              </button>
              <div className="flex flex-col" style={{ gap: 6 }}>
                {r.members.map(exRow)}
              </div>
            </div>
          ) : (
            <React.Fragment key={`solo-${i}`}>{r.members.map(exRow)}</React.Fragment>
          )
        )}
      </div>

      <div className="flex" style={{ gap: 8, flex: "none" }}>
        {selecting ? (
          <>
            <button type="button" onClick={exitSelecting} className="flex-1 justify-center hover:!bg-[#FAFAFB]" style={{ ...button40, background: "#F5F5F6", color: "#241F1B", border: "none" }}>
              {t("Cancel")}
            </button>
            <button
              type="button"
              onClick={startGrouping}
              disabled={picked.length < 2}
              className="flex-1 justify-center disabled:opacity-50"
              style={{ ...button40, background: "#F0EDF9", color: "#5F5093", border: "none" }}
            >
              <Link2 size={16} />
              {t("Group as…")}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex-1 justify-center hover:!bg-[#FAFAFB]"
              style={{ ...button40, background: "none", border: "2px dashed rgba(36,31,27,0.15)", color: "#5B5349" }}
            >
              <Plus size={16} />
              {t("Add exercise")}
            </button>
            <button
              type="button"
              onClick={() => setSelecting(true)}
              disabled={routine.exercises.length < 2}
              className="disabled:opacity-50"
              style={{ ...button40, background: "#F0EDF9", color: "#5F5093", border: "none" }}
            >
              <Link2 size={16} />
              {tx("Group", "action")}
            </button>
          </>
        )}
      </div>

      <BlockSettingsSheet
        key={blockDraft?.block.id ?? "none"}
        open={!!blockDraft}
        onClose={() => setBlockDraft(null)}
        block={blockDraft?.block ?? null}
        memberCount={blockDraft?.memberIds.length ?? 0}
        onSave={(block) => commitBlock(block, blockDraft?.memberIds ?? [])}
        onUngroup={blockDraft && blocks.some((b) => b.id === blockDraft.block.id) ? () => ungroup(blockDraft.block.id) : undefined}
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
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setQueuedNames([]);
        }}
        onPick={(pick) => {
          setQueuedNames((q) => [...q, pick.name]);
          onAddExercise(pick);
        }}
        alreadyAdded={[...routine.exercises.map((e) => e.name), ...queuedNames]}
      />
    </aside>
  );
};

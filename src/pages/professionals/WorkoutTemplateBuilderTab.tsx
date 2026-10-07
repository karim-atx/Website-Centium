import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { CreateWorkoutTemplateSheet } from "../../components/professionals/CreateWorkoutTemplateSheet";
import type { WorkoutTemplate } from "../../types";
import { AssignTemplateSheet } from "../../components/professionals/AssignTemplateSheet";
import { UnverifiedProgramNotice } from "../../components/workout/UnverifiedProgramNotice";
import { BlockCard } from "../../components/workout/BlockCard";
import { groupIntoRuns } from "../../services/workout/blocks";
import { prescriptionLine } from "../../services/workout/prescription";
import { Plus, Trash2, ChevronDown, ChevronUp, FolderPlus, FolderTree, MoreVertical, Copy, Pencil, Palette, Settings2, Send } from "lucide-react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { ColorPopover, ColorSwatches, FolderHeader, InsertionLine, Placeholder } from "../../components/folders/FolderParts";
import { folderColorOptions, withPlaceholder } from "../../components/folders/folderList";
import { folderFamily, themedFamily } from "../../data/folderColors";
import { useIsDark } from "../../hooks/useIsDark";
import { moveId } from "../../services/routines/order";
import { MAX_DEPTH_NOTE, canAddSubfolder, canMoveFolder } from "../../services/routines/folderDepth";
import { useRoutineDrag, type DragItem, type DropTarget } from "../workout/useRoutineDrag";
import type { WorkoutTemplateFolder } from "../../types";
import { SessionDetail } from "../../components/workout/SessionDetail";
import { fetchClientSessionsForRoutines } from "../../services/professional-client";
import { formatDuration } from "../../services/workout";
import { formatDisplayDate } from "../../utils/date";
import type { WorkoutSession } from "../../types";

// The folder ⋮ menu: the Routines tab's, on the same shared popup, for the
// same folders (the two tables share one schema and one trigger). Moving a
// folder is by drag, as there.
type FolderAction = "rename" | "color" | "subfolder" | "template" | "delete";
const MENU_ICON = 15;
const FOLDER_MENU: { value: FolderAction; label: string; icon: React.ReactNode; destructive?: boolean }[] = [
  { value: "rename", label: "Rename", icon: <Pencil size={MENU_ICON} /> },
  { value: "color", label: "Edit color", icon: <Palette size={MENU_ICON} /> },
  { value: "subfolder", label: "Add subfolder", icon: <FolderTree size={MENU_ICON} /> },
  { value: "template", label: "Add template", icon: <Plus size={MENU_ICON} /> },
  { value: "delete", label: "Delete", icon: <Trash2 size={MENU_ICON} />, destructive: true },
];

export default function WorkoutTemplateBuilderTab() {
  const {
    workoutTemplates,
    addWorkoutTemplate,
    removeWorkoutTemplate,
    updateWorkoutTemplate,
    templateAssignments,
    templatesError,
    professionalClients,
    workoutTemplateFolders,
    addWorkoutTemplateFolder,
    deleteWorkoutTemplateFolder,
    renameWorkoutTemplateFolder,
    updateWorkoutTemplateFolder,
    reorderWorkoutTemplateFolders,
    moveWorkoutTemplateFolder,
  } = useApp();
  // Mobile v5.1 R3: folder headers take the family's shades for the current mode.
  const dark = useIsDark();
  const [createOpen, setCreateOpen] = useState(false);
  const [createFolderId, setCreateFolderId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [assigningTemplate, setAssigningTemplate] = useState<WorkoutTemplate | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [menuTemplateId, setMenuTemplateId] = useState<string | null>(null);
  const [renamingTemplate, setRenamingTemplate] = useState<WorkoutTemplate | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Folders start open, as routine folders do.
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(folderColorOptions[0]);
  const [folderMenu, setFolderMenu] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [folderRenameDraft, setFolderRenameDraft] = useState("");
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [addingSubfolderTo, setAddingSubfolderTo] = useState<string | null>(null);
  const [subfolderName, setSubfolderName] = useState("");
  const [subfolderColor, setSubfolderColor] = useState(folderColorOptions[0]);
  // Every folder write reports here, as on the Routines tab (run there).
  const run = (action: Promise<string | undefined>) => {
    void action.then((message) => setActionError(message ?? null));
  };

  const openCreateIn = (folderId: string | null) => {
    setCreateFolderId(folderId);
    setCreateOpen(true);
  };

  const toggleFolder = (id: string) =>
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const saveFolder = () => {
    if (!newFolderName.trim()) return;
    run(addWorkoutTemplateFolder(newFolderName.trim(), null, newFolderColor));
    setNewFolderName("");
    setNewFolderColor(folderColorOptions[0]);
    setNewFolderOpen(false);
  };

  const onFolderAction = (folder: WorkoutTemplateFolder, action: FolderAction) => {
    if (action === "rename") {
      setRenamingFolderId(folder.id);
      setFolderRenameDraft(folder.name);
    } else if (action === "color") setEditingColorId(folder.id);
    else if (action === "subfolder") {
      setAddingSubfolderTo(folder.id);
      setSubfolderName("");
    } else if (action === "template") openCreateIn(folder.id);
    else run(deleteWorkoutTemplateFolder(folder.id));
  };

  const commitFolderRename = (id: string) => {
    const name = folderRenameDraft.trim();
    if (name) run(renameWorkoutTemplateFolder(id, name));
    setRenamingFolderId(null);
  };

  const addSubfolder = (parentId: string) => {
    if (subfolderName.trim()) run(addWorkoutTemplateFolder(subfolderName.trim(), parentId, subfolderColor));
    setAddingSubfolderTo(null);
  };

  // --- Folder drag and drop: the Routines tab's hook and rules ----------------
  // Above, below or inside another folder (the middle half of its header),
  // five levels deep at most and never into itself (folderDepth). Templates
  // are not dragged: they have no stored order to drop them into.
  const listRef = useRef<HTMLDivElement>(null);
  const siblingsOf = (parentId: string | null) =>
    workoutTemplateFolders.filter((f) => (f.parentId ?? null) === parentId);
  const onDrop = (item: DragItem, target: DropTarget) => {
    if (item.kind !== "folder") return;
    if (target.kind === "into") run(moveWorkoutTemplateFolder(item.id, target.folderId, Number.MAX_SAFE_INTEGER));
    else if (target.kind === "folders") {
      if (target.parentId === item.parentId) {
        const ids = siblingsOf(item.parentId).map((f) => f.id);
        const next = moveId(ids, item.id, target.index);
        if (next.some((id, i) => id !== ids[i])) run(reorderWorkoutTemplateFolders(item.parentId, next));
      } else run(moveWorkoutTemplateFolder(item.id, target.parentId, target.index));
    }
  };
  const canNest = (folderId: string, parentId: string | null) => canMoveFolder(folderId, parentId, workoutTemplateFolders);
  const { drag, pressProps, gripProps, onClickCapture } = useRoutineDrag(listRef, onDrop, canNest);
  const draggingFolder = drag?.item.kind === "folder" ? drag.item.id : null;
  const dragFolder = draggingFolder ? workoutTemplateFolders.find((f) => f.id === draggingFolder) : undefined;


  // The expanded template's clients' real sessions.
  //
  // FETCHED ON EXPANSION, not on mount: a professional with thirty templates
  // and a roster of forty would otherwise pull every session either of them
  // has ever logged, to render a list nobody has opened.
  //
  // Keyed by the ROUTINE each assignment created, which is how a session
  // knows which template it belongs to — routine_id on workout_sessions
  // against routine_id on workout_template_assignments. An assignment with no
  // routine (one whose routine has since been deleted) contributes nothing to
  // ask about.
  //
  // THE ANSWER CARRIES THE QUESTION IT ANSWERS. Holding the template id
  // alongside the sessions means expanding a second template shows a loading
  // state rather than the first one's results — storing the map alone left
  // the previous template's sessions on screen, under the new one's name,
  // until the fetch came back.
  const [loaded, setLoaded] = useState<{ templateId: string; byClient: Record<string, WorkoutSession[]> } | null>(null);

  const expandedRoutineIds = useMemo(() => {
    if (!expandedId) return [] as string[];
    return templateAssignments
      .filter((a) => a.templateId === expandedId && a.routineId)
      .map((a) => a.routineId as string);
  }, [expandedId, templateAssignments]);

  useEffect(() => {
    if (!expandedId || expandedRoutineIds.length === 0) return;
    let cancelled = false;
    void fetchClientSessionsForRoutines(expandedRoutineIds).then((result) => {
      // A FAILED READ IS NOT AN EMPTY ONE. Rendering "no sessions logged yet"
      // because the network dropped tells a professional something false
      // about their client, which is the whole reason these reads report
      // failure rather than returning an empty map — so a failure leaves the
      // loading state up rather than replacing it with a wrong answer.
      if (cancelled || !result.ok) return;
      setLoaded({ templateId: expandedId, byClient: result.byClient });
    });
    return () => {
      cancelled = true;
    };
  }, [expandedId, expandedRoutineIds]);

  const sessionsFor = (templateId: string, clientId: string): WorkoutSession[] | undefined =>
    loaded?.templateId === templateId ? loaded.byClient[clientId] ?? [] : undefined;


  const templatesIn = (folderId: string | null) => workoutTemplates.filter((t) => (t.folderId ?? null) === folderId);

  const templateCard = (t: (typeof workoutTemplates)[number]) => {
          const expanded = expandedId === t.id;
          // Assignments are rows now, one per client, each with its own day.
          const assignments = templateAssignments.filter((a) => a.templateId === t.id);
          // c.clientId, NOT c.id. RosterClient.id is the
          // professional_clients row — the RELATIONSHIP — and an assignment
          // names the client's own user id, so comparing the two matched
          // nothing and every template read "0 clients assigned" however many
          // it had.
          const clients = professionalClients.filter((c) =>
            !!c.clientId && assignments.some((a) => a.clientId === c.clientId)
          );
          return (
            <div key={t.id} className="relative">
            <Card padded={false} className="overflow-hidden">
              <button
                onClick={() => {
                  setExpandedId(expanded ? null : t.id);
                  setMenuTemplateId(null);
                }}
                className="tap w-full flex items-center justify-between p-4 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-charcoal truncate">{t.name}</p>
                  <p className="text-xs text-charcoal-faint">
                    {t.exercises.length} exercises · {clients.length} client{clients.length !== 1 ? "s" : ""} assigned
                  </p>
                  {/* On the collapsed row too: a professional deciding whether
                      to build on a starter program should see it here, not
                      only after expanding. */}
                  <UnverifiedProgramNotice
                    isVerified={t.isVerified}
                    isPublic={t.isPublic}
                    variant="compact"
                    className="mt-0.5"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuTemplateId(menuTemplateId === t.id ? null : t.id);
                    }}
                    aria-label={`Options for ${t.name}`}
                    className="tap text-charcoal-faint"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {expanded ? <ChevronUp size={16} className="text-charcoal-faint" /> : <ChevronDown size={16} className="text-charcoal-faint" />}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-charcoal/[0.06] px-4 py-3.5 space-y-4">
                  <UnverifiedProgramNotice isVerified={t.isVerified} isPublic={t.isPublic} />
                  {t.coachNote && (
                    <p className="text-xs text-primary-dark bg-primary-pale rounded-xl px-3 py-2">
                      Note to client: {t.coachNote}
                    </p>
                  )}
                  {/* ONE LINE PER ASSIGNMENT, because the day belongs to the
                      client and not to the template. */}
                  {assignments.length > 0 && (
                    <div className="space-y-0.5">
                      {assignments.map((a) => {
                        const who = professionalClients.find((c) => c.id === a.clientId);
                        return (
                          <p key={a.id} className="text-xs text-charcoal-faint">
                            {who?.name ?? "A client"}
                            {a.assignedDay ? ` · ${a.assignedDay}` : " · no day set"}
                          </p>
                        );
                      })}
                    </div>
                  )}
                  <div>
                    <p className="section-label text-charcoal-faint mb-1.5">
                      Exercises
                    </p>
                    {/* V10 (QA 10.0): "It should show the full details, not
                        just the exercise. Replace the title of exercises
                        with something more expansive that not only shows
                        the exercise, but the sets, reps, and anything else
                        used when adding exercise." */}
                    {/* The fourth copy of a prescription renderer is gone with
                        the others. This one could not say a rep RANGE, which is
                        the field a professional is most likely to use — a
                        coach writing 8–12 saw "3 sets × 0 reps". */}
                    <div className="space-y-1.5">
                      {groupIntoRuns(t.exercises, t.blocks ?? []).map((run) =>
                        run.block ? (
                          <div key={run.block.id} style={{ margin: "0 -12px" }}>
                            <BlockCard block={run.block} ordinal={run.ordinal} members={run.members} />
                          </div>
                        ) : (
                          run.members.map((ex) => {
                            const line = prescriptionLine(ex);
                            return (
                              <div key={ex.id} className="bg-cream-soft rounded-xl px-3 py-2">
                                <p className="text-sm font-medium text-charcoal">{ex.name}</p>
                                {line && (
                                  <p className="text-[11px] text-charcoal-faint">{line}</p>
                                )}
                              </div>
                            );
                          })
                        )
                      )}
                    </div>
                  </div>

                  {clients.length === 0 ? (
                    <p className="text-xs text-charcoal-faint">Not assigned to anyone yet.</p>
                  ) : (
                    <div>
                      <p className="section-label text-charcoal-faint mb-1.5">
                        Client activity
                      </p>
                      {/* WHAT THEY ACTUALLY LOGGED, or an honest silence.
                          This block used to derive sets, reps, RPE, mood and
                          a sentence about exercises added or replaced from
                          `hash(template.id + client.id)` — stable, plausible,
                          and entirely invented. A professional reading "avg
                          RPE 8, mood 7/10" had no way to know none of it had
                          happened, and would coach against it.
                          The four states are the roster's, for the reason
                          utils/workoutDisplay spells out: a client who has
                          not shared workout activity must never be reported
                          as one who did not train. */}
                      <div className="space-y-2">
                        {clients.map((c) => {
                          const sessions = c.access.workoutActivity
                            ? sessionsFor(t.id, c.clientId!)
                            : [];
                          return (
                            <div key={c.id} className="bg-cream-soft rounded-xl px-3.5 py-3">
                              <p className="text-sm font-semibold text-charcoal mb-1.5">{c.name}</p>
                              {!c.access.workoutActivity ? (
                                <p className="text-[11px] text-charcoal-faint">
                                  Not sharing workout activity.
                                </p>
                              ) : sessions === undefined ? (
                                <p className="text-[11px] text-charcoal-faint">Loading sessions…</p>
                              ) : sessions.length === 0 ? (
                                <p className="text-[11px] text-charcoal-faint">
                                  No sessions logged yet.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {sessions.slice(0, 3).map((s) => (
                                    <div key={s.id}>
                                      <p className="text-[11px] font-semibold text-charcoal-soft">
                                        {formatDisplayDate(s.date)} · {formatDuration(s.durationSec)} ·{" "}
                                        {s.totalVolumeKg.toLocaleString()} kg
                                      </p>
                                      <SessionDetail session={s} />
                                    </div>
                                  ))}
                                  {sessions.length > 3 && (
                                    <p className="text-[10.5px] text-charcoal-faint">
                                      {sessions.length - 3} earlier session
                                      {sessions.length - 3 === 1 ? "" : "s"} not shown.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </Card>
            {menuTemplateId === t.id && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-4 top-14 z-10 w-40 bg-cream-card rounded-2xl shadow-lift overflow-hidden border border-charcoal/5"
              >
                {/* A CURATED PROGRAM OFFERS ONLY "DUPLICATE", because that is
                    the only one of these a professional can actually do.
                    workout_templates has no policy permitting anyone to write
                    a public row — a rename or a delete affects ZERO ROWS and
                    reports no error, measured — and the assign function
                    refuses a template whose owner is not the caller (ATX09,
                    which holds for a curated one because its owner is null).
                    Offering buttons that quietly do nothing is worse than not
                    offering them. */}
                {!t.isPublic && (
                  <>
                    <button
                      onClick={() => {
                        setRenamingTemplate(t);
                        setRenameDraft(t.name);
                        setMenuTemplateId(null);
                      }}
                      className="tap w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-charcoal hover:bg-cream-soft text-left"
                    >
                      <Pencil size={13} /> Rename
                    </button>
                    <button
                      onClick={() => {
                        setEditingTemplate(t);
                        setMenuTemplateId(null);
                      }}
                      className="tap w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-charcoal hover:bg-cream-soft text-left"
                    >
                      <Settings2 size={13} /> Edit template
                    </button>
                    <button
                      onClick={() => {
                        setAssigningTemplate(t);
                        setMenuTemplateId(null);
                      }}
                      className="tap w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-charcoal hover:bg-cream-soft text-left"
                    >
                      <Send size={13} /> Assign to clients
                    </button>
                  </>
                )}
                {/* DUPLICATING A CURATED PROGRAM IS ALLOWED, and is how a
                    professional starts from one: the copy is created with
                    their own owner_id and is_public false, which is the only
                    shape they may write. Assignments are not copied — they
                    belong to the original, not to the plan. */}
                <button
                  onClick={() => {
                    void addWorkoutTemplate({
                      name: `${t.name} (copy)`,
                      exercises: t.exercises,
                      folderId: t.folderId,
                      coachNote: t.coachNote,
                    }).then((message) => setActionError(message ?? null));
                    setMenuTemplateId(null);
                  }}
                  className="tap w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-charcoal hover:bg-cream-soft text-left"
                >
                  <Copy size={13} /> Duplicate
                </button>
                {!t.isPublic && (
                  <button
                    onClick={() => {
                      void removeWorkoutTemplate(t.id).then((message) =>
                        setActionError(message ?? null)
                      );
                      setMenuTemplateId(null);
                    }}
                    className="tap w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-ember-dark hover:bg-cream-soft text-left"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            )}
            </div>
    );
  };

  /** A sibling group of folders, with the drop placeholder while a folder is dragged. */
  const renderFolders = (parentId: string | null, depth: number): React.ReactNode => {
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

  // A render function, not a component (see RoutinesTab): a component made
  // during render would remount on every pointer move and drop the drag.
  const renderFolder = (folder: WorkoutTemplateFolder, depth: number, index: number, hidden: boolean): React.ReactNode => {
    const templates = templatesIn(folder.id);
    const collapsed = collapsedFolders.has(folder.id);
    const family = themedFamily(folderFamily(folder, workoutTemplateFolders.indexOf(folder)), dark);
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
          count={templates.length}
          noun={["template", "templates"]}
          collapsed={collapsed}
          highlighted={drag?.target.kind === "into" && drag.target.folderId === folder.id}
          onToggle={() => toggleFolder(folder.id)}
          onMenu={(anchor) => setFolderMenu({ id: folder.id, anchor })}
          renaming={renamingFolderId === folder.id}
          renameDraft={folderRenameDraft}
          onRenameDraft={setFolderRenameDraft}
          onRenameCommit={() => commitFolderRename(folder.id)}
          press={pressProps(item, renamingFolderId !== folder.id)}
          grip={gripProps(item)}
          colorEditor={
            editingColorId === folder.id && (
              <ColorPopover
                value={folder.color}
                onPick={(c) => run(updateWorkoutTemplateFolder(folder.id, { color: c }))}
                onDone={() => setEditingColorId(null)}
              />
            )
          }
        />

        {!collapsed && (
          <div className="flex flex-col gap-1.5">
            {templates.length > 0 && <div className="space-y-2.5">{templates.map(templateCard)}</div>}

            {addingSubfolderTo === folder.id && (
              <div className="mb-2" style={{ marginLeft: 16 }}>
                <div className="flex gap-2 mb-2">
                  <input
                    autoFocus
                    value={subfolderName}
                    onChange={(e) => setSubfolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && subfolderName.trim()) addSubfolder(folder.id);
                    }}
                    placeholder="Subfolder name…"
                    aria-label="Subfolder name"
                    className="flex-1 rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={() => addSubfolder(folder.id)}
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

  const menuFolder = folderMenu ? workoutTemplateFolders.find((f) => f.id === folderMenu.id) : undefined;

  const unfiledTemplates = templatesIn(null);

  return (
    <div
      onClick={() => {
        if (editingColorId) setEditingColorId(null);
      }}
    >
      {/* V10 (QA 10.0): "Rename the tab templates into something that
          pertains to workout templates and being able to track what the
          client logged when it came to working out." */}
      <PageHeader
        title="Training"
        subtitle="Build workout templates and track what clients log"
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNewFolderOpen(true)}
              className="tap w-10 h-10 rounded-full bg-cream-soft text-charcoal-soft flex items-center justify-center"
              aria-label="New folder"
            >
              <FolderPlus size={17} />
            </button>
            <button
              onClick={() => openCreateIn(null)}
              className="tap w-10 h-10 rounded-full bg-primary-fill text-on-primary-fill flex items-center justify-center shadow-soft"
              aria-label="New template"
            >
              <Plus size={18} />
            </button>
          </div>
        }
      />

      {/* A refused write the professional just asked for, and separately a
          list that could not be refreshed — different failures, said
          differently. */}
      {actionError && (
        <p className="text-[11.5px] font-semibold text-status-high mb-3">{actionError}</p>
      )}
      {templatesError && !actionError && (
        <p className="text-[11.5px] font-semibold text-status-high mb-3">
          Couldn't refresh your templates. Showing what was saved on this device.
        </p>
      )}

      <div ref={listRef} onClickCapture={onClickCapture} className="flex flex-col gap-3.5 mb-3.5">
        <div data-dnd-folders="" className="flex flex-col gap-3.5 empty:hidden">
          {renderFolders(null, 0)}
        </div>
      </div>
      <div className="space-y-2.5">
        {unfiledTemplates.map(templateCard)}
        {workoutTemplates.length === 0 && workoutTemplateFolders.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">No templates yet. Build your first one.</p>
          </Card>
        )}
      </div>

      <CreateWorkoutTemplateSheet
        key={createFolderId ?? "unfiled"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultFolderId={createFolderId}
      />

      <CreateWorkoutTemplateSheet
        open={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        editTemplate={editingTemplate}
      />

      <AssignTemplateSheet
        open={!!assigningTemplate}
        onClose={() => setAssigningTemplate(null)}
        template={assigningTemplate}
      />

      <BottomSheet open={!!renamingTemplate} onClose={() => setRenamingTemplate(null)} title="Rename Template">
        <div className="space-y-4 animate-fade-slide-up">
          <input
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button
            fullWidth
            size="lg"
            disabled={!renameDraft.trim()}
            onClick={() => {
              if (renamingTemplate) {
                void updateWorkoutTemplate(renamingTemplate.id, { name: renameDraft.trim() }).then(
                  (message) => setActionError(message ?? null)
                );
              }
              setRenamingTemplate(null);
            }}
          >
            Save name
          </Button>
        </div>
      </BottomSheet>

      <PopupMenu<FolderAction>
        open={!!menuFolder}
        anchor={folderMenu?.anchor ?? null}
        onClose={() => setFolderMenu(null)}
        options={
          menuFolder && !canAddSubfolder(menuFolder.id, workoutTemplateFolders)
            ? FOLDER_MENU.map((o) => (o.value === "subfolder" ? { ...o, disabled: true, note: MAX_DEPTH_NOTE } : o))
            : FOLDER_MENU
        }
        onSelect={(action) => menuFolder && onFolderAction(menuFolder, action)}
      />

      {drag && <InsertionLine listRef={listRef} />}
      {/* The lifted folder follows the pointer, as on the Routines tab. */}
      {drag &&
        dragFolder &&
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
              boxShadow: "0 14px 30px rgba(36,31,27,0.18)",
            }}
          >
            <FolderHeader
              folder={dragFolder}
              family={themedFamily(folderFamily(dragFolder, workoutTemplateFolders.indexOf(dragFolder)), dark)}
              count={templatesIn(dragFolder.id).length}
              noun={["template", "templates"]}
              collapsed={collapsedFolders.has(dragFolder.id)}
            />
          </div>,
          document.body
        )}

      <BottomSheet open={newFolderOpen} onClose={() => setNewFolderOpen(false)} title="New Folder">
        <div className="space-y-4 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Folder name</span>
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Strength blocks"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Color</span>
            <ColorSwatches value={newFolderColor} onPick={setNewFolderColor} size={28} />
          </div>

          <Button fullWidth size="lg" onClick={saveFolder} disabled={!newFolderName.trim()}>
            Create folder
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

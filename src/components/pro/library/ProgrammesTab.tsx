import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardList, Copy, Pencil, Plus, Search, Send, Settings2, SlidersHorizontal, Trash2, UserRound } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import type { Exercise, WorkoutTemplate } from "../../../types";
import { BottomSheet } from "../../ui/BottomSheet";
import { Button } from "../../ui/Button";
import { PopupMenu, type PopupMenuOption } from "../../ui/PopupMenu";
import { UnverifiedProgramNotice } from "../../workout/UnverifiedProgramNotice";
import { fetchAdherence } from "../../../services/pro/library";
import { todayLocal } from "../../../utils/date";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { StatusRing } from "../StatusRing";
import { EmptyState } from "../EmptyState";
import { Chip, ListCard, SectionHead } from "../client/kit";
import { AssignSheet } from "./AssignSheet";
import { ClientCopyView } from "./ClientCopyView";
import { ExercisesPanel } from "./ExercisesPanel";
import { ProgrammeDetail } from "./ProgrammeDetail";
import { ProgressView } from "./ProgressView";
import { TargetsSheet } from "./TargetsSheet";
import { TemplateEditor } from "./TemplateEditor";
import { TemplateFolders } from "./TemplateFolders";
import { WorkoutLogView } from "./WorkoutLogView";
import { DetailHeader, ErrorLine, Fab, FilterChip, LibCard, SquareBtn } from "./libraryUi";
import { assignedLine, clientsLabel, currentWeek, isActive, templateMeta } from "./libraryModel";

/**
 * Release 3 · W5 Library › Programmes (TR1 v7), the content under the
 * Library title and the Programmes / Meal plans tabs (pages/pro/Library.tsx).
 *
 * - Search "Search programmes and workouts" + the Filter square (All /
 *   Assigned / Not assigned), chips Programmes / Workouts / Exercises.
 * - Programmes: TEMPLATES (the latest three, "See all {n}" opens every
 *   template in its folders: TemplateFolders, the old builder's folder tree),
 *   then ASSIGNED TO CLIENTS with the StatusRing (client_adherence over 14
 *   days, as W3; a dash when nothing it counts is shared) and "All
 *   assignments".
 * - Workouts: the templates without a programme length.
 * - Exercises: the exercise database and custom exercises (ExercisesPanel).
 * - The "+" (56, 20 from the right, 104 up, as Food's): New programme, or
 *   Create exercise on the Exercises chip (its label shows on long press).
 *
 * Sub-screens are search params on this route, so Back works:
 *   ?view=all | assignments | template&id= | progress&id= | copy&id= (assignment) | log&id= (session)
 * The lead's Library page can hide its title and tabs while `view` is set
 * (libraryModel programmesDetailOpen).
 *
 * The template ⋮ (kept from the old builder): Rename, Edit template, Assign to
 * clients, Duplicate, Delete; a curated starter program offers Duplicate only
 * (no policy lets a professional write a public row, and the assign function
 * refuses it with ATX09) and carries UnverifiedProgramNotice.
 */
type ChipKey = "programmes" | "workouts" | "exercises";
type FilterKey = "all" | "assigned" | "unassigned";
type MenuAction = "rename" | "edit" | "assign" | "progress" | "duplicate" | "delete";

export const ProgrammesTab: React.FC = () => {
  const {
    workoutTemplates,
    workoutTemplateFolders,
    templateAssignments,
    templatesError,
    professionalClients,
    addWorkoutTemplate,
    updateWorkoutTemplate,
    removeWorkoutTemplate,
  } = useApp();
  const [params, setParams] = useSearchParams();
  const view = params.get("view");
  const viewId = params.get("id");
  const go = (next: Record<string, string> | null) => {
    const p = new URLSearchParams(params);
    p.delete("view");
    p.delete("id");
    if (next) for (const [k, v] of Object.entries(next)) p.set(k, v);
    setParams(p);
  };
  const back = () => window.history.back();

  const [chip, setChip] = useState<ChipKey>("programmes");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const filterRef = useRef<HTMLButtonElement>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ template: WorkoutTemplate; anchor: HTMLElement } | null>(null);
  const [renaming, setRenaming] = useState<WorkoutTemplate | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [editor, setEditor] = useState<{ template: WorkoutTemplate | null; folderId: string | null } | null>(null);
  const [assign, setAssign] = useState<{ templateId: string; preselected?: string[] } | null>(null);
  const [targets, setTargets] = useState<{ template: WorkoutTemplate; exercise: Exercise } | null>(null);
  const [pendingAssign, setPendingAssign] = useState<{ before: Set<string>; assignTo: string[] } | null>(null);
  const [creatingExercise, setCreatingExercise] = useState(false);
  const [fabLabel, setFabLabel] = useState(false);
  const pressTimer = useRef<number | null>(null);

  const own = workoutTemplates.filter((t) => !t.isPublic);
  const active = templateAssignments.filter(isActive);
  const clientCount = (t: WorkoutTemplate) => new Set(active.filter((a) => a.templateId === t.id).map((a) => a.clientId)).size;
  const today = todayLocal();

  // After saving a new template with clients under "Assign to": open TR5 with them picked.
  useEffect(() => {
    if (!pendingAssign) return;
    const created = workoutTemplates.find((t) => !pendingAssign.before.has(t.id) && !t.isPublic);
    if (!created) return;
    if (pendingAssign.assignTo.length) setAssign({ templateId: created.id, preselected: pendingAssign.assignTo });
    setPendingAssign(null);
  }, [pendingAssign, workoutTemplates]);

  // The assigned list's rings: client_adherence over 14 days, once per client.
  const activeClientIds = useMemo(() => [...new Set(active.map((a) => a.clientId))].sort(), [active]);
  const [rings, setRings] = useState<Record<string, number | null>>({});
  const ringKey = activeClientIds.join(",");
  useEffect(() => {
    let cancelled = false;
    void Promise.all(activeClientIds.map(async (id) => [id, await fetchAdherence(id, 14, today)] as const)).then((rows) => {
      if (cancelled) return;
      setRings(Object.fromEntries(rows.map(([id, r]) => [id, r.ok && r.data ? r.data.pct : null])));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringKey]);

  const q = query.trim().toLowerCase();
  const templateMatches = (t: WorkoutTemplate) => {
    if (q && !t.name.toLowerCase().includes(q)) return false;
    if (filter === "assigned") return clientCount(t) > 0;
    if (filter === "unassigned") return clientCount(t) === 0;
    return true;
  };
  const visible = workoutTemplates.filter(templateMatches);
  const latest = [...visible].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);

  const clientName = (id: string) => professionalClients.find((c) => c.clientId === id)?.name ?? "";
  const assignedRows = active
    .map((a) => ({ a, t: workoutTemplates.find((t) => t.id === a.templateId) }))
    .filter((r): r is { a: typeof r.a; t: WorkoutTemplate } => !!r.t && !!clientName(r.a.clientId))
    .filter((r) => !q || r.t.name.toLowerCase().includes(q) || clientName(r.a.clientId).toLowerCase().includes(q));

  const menuOptions = (t: WorkoutTemplate, inDetail: boolean): PopupMenuOption<MenuAction>[] =>
    t.isPublic
      ? [{ value: "duplicate", label: "Duplicate", icon: <Copy size={15} /> }]
      : [
          { value: "rename", label: "Rename", icon: <Pencil size={15} /> },
          { value: "edit", label: "Edit template", icon: <Settings2 size={15} /> },
          { value: "assign", label: "Assign to clients", icon: <Send size={15} /> },
          ...(inDetail && clientCount(t) > 0 ? [{ value: "progress" as const, label: "Progress", icon: <ClipboardList size={15} /> }] : []),
          { value: "duplicate", label: "Duplicate", icon: <Copy size={15} /> },
          { value: "delete", label: "Delete", icon: <Trash2 size={15} />, destructive: true },
        ];

  const onMenu = (t: WorkoutTemplate, action: MenuAction) => {
    if (action === "rename") {
      setRenaming(t);
      setRenameDraft(t.name);
    } else if (action === "edit") setEditor({ template: t, folderId: t.folderId ?? null });
    else if (action === "assign") setAssign({ templateId: t.id });
    else if (action === "progress") go({ view: "progress", id: t.id });
    else if (action === "duplicate") {
      // A curated program is duplicated into the professional's own (owner_id
      // set, is_public false: the only shape they may write); assignments are
      // not copied.
      void addWorkoutTemplate({
        name: `${t.name} (copy)`,
        exercises: t.exercises,
        blocks: t.blocks,
        folderId: t.isPublic ? null : t.folderId,
        coachNote: t.coachNote,
        durationMin: t.durationMin,
        durationWeeks: t.durationWeeks ?? null,
      }).then((m) => setActionError(m ?? null));
    } else {
      void removeWorkoutTemplate(t.id).then((m) => {
        setActionError(m ?? null);
        if (!m && view) go(null);
      });
    }
  };

  const card = (t: WorkoutTemplate) => {
    const n = clientCount(t);
    const folder = t.folderId ? workoutTemplateFolders.find((f) => f.id === t.folderId) : undefined;
    const colour = folder?.color;
    return (
      <LibCard
        key={t.id}
        icon={ClipboardList}
        colour={colour}
        title={t.name}
        sub={templateMeta(t)}
        meta={
          t.isPublic ? (
            <UnverifiedProgramNotice isVerified={t.isVerified} isPublic={t.isPublic} variant="compact" />
          ) : (
            <>
              {n > 0 && <Chip label={clientsLabel(n)} />}
              {n === 0 && <Chip label="Template" tone="pau" />}
            </>
          )
        }
        onOpen={() => go({ view: "template", id: t.id })}
        onMenu={(anchor) => setMenu({ template: t, anchor })}
      />
    );
  };

  const assignedList = (rows: typeof assignedRows, more: boolean) =>
    rows.length === 0 ? (
      <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>Not assigned to anyone yet.</p>
    ) : (
      <ListCard
        rows={rows.map(({ a, t }) => ({
          key: a.id,
          icon: UserRound,
          title: `${clientName(a.clientId)} · ${t.name}`,
          meta: assignedLine(currentWeek(a.startsOn, a.joinWeek, t.durationWeeks, today), rings[a.clientId]) ?? undefined,
          trailing: <StatusRing value={rings[a.clientId] ?? null} lane="full_coaching" scale={0.85} />,
          onClick: () => go({ view: "template", id: t.id }),
        }))}
        more={more ? { label: "All assignments", onClick: () => go({ view: "assignments" }) } : undefined}
      />
    );

  // ----- sub-screens -------------------------------------------------------
  const sheets = (
    <>
      <TemplateEditor
        open={!!editor}
        onClose={() => setEditor(null)}
        template={editor?.template ?? null}
        defaultFolderId={editor?.folderId ?? null}
        onSaved={(id, assignTo, before) => {
          if (id && assignTo.length) setAssign({ templateId: id, preselected: assignTo });
          else if (!id) setPendingAssign({ before, assignTo });
        }}
        onTargets={editor?.template ? (exercise) => setTargets({ template: editor.template!, exercise }) : undefined}
      />
      <AssignSheet open={!!assign} onClose={() => setAssign(null)} template={workoutTemplates.find((t) => t.id === assign?.templateId) ?? null} preselected={assign?.preselected} />
      <TargetsSheet open={!!targets} onClose={() => setTargets(null)} template={targets?.template ?? null} exercise={targets?.exercise ?? null} />
      <PopupMenu<MenuAction>
        open={!!menu}
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        options={menu ? menuOptions(menu.template, view === "template") : []}
        onSelect={(a) => menu && onMenu(menu.template, a)}
      />
      <BottomSheet open={!!renaming} onClose={() => setRenaming(null)} title="Rename Template">
        <div className="space-y-4 animate-fade-slide-up">
          <input
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            aria-label="Template name"
            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button
            fullWidth
            size="lg"
            disabled={!renameDraft.trim()}
            onClick={() => {
              if (renaming) void updateWorkoutTemplate(renaming.id, { name: renameDraft.trim() }).then((m) => setActionError(m ?? null));
              setRenaming(null);
            }}
          >
            Save name
          </Button>
        </div>
      </BottomSheet>
    </>
  );

  const errors = (
    <>
      {/* A refused write and a list that couldn't refresh are different failures, said differently. */}
      {actionError && <ErrorLine>{actionError}</ErrorLine>}
      {templatesError && !actionError && <ErrorLine>Couldn't refresh your templates. Showing what was saved on this device.</ErrorLine>}
    </>
  );

  const viewTemplate = viewId ? workoutTemplates.find((t) => t.id === viewId) : undefined;
  const viewAssignment = viewId ? templateAssignments.find((a) => a.id === viewId) : undefined;

  if (view === "template" && viewTemplate) {
    return (
      <>
        {errors}
        <ProgrammeDetail
          template={viewTemplate}
          onBack={back}
          onAssign={() => setAssign({ templateId: viewTemplate.id })}
          onMenu={(anchor) => setMenu({ template: viewTemplate, anchor })}
          onProgress={() => go({ view: "progress", id: viewTemplate.id })}
          onOpenCopy={(id) => go({ view: "copy", id })}
          onOpenLog={(id) => go({ view: "log", id })}
        />
        {sheets}
      </>
    );
  }
  if (view === "progress" && viewTemplate) {
    return <ProgressView template={viewTemplate} onBack={back} />;
  }
  if (view === "copy" && viewAssignment) {
    const t = workoutTemplates.find((x) => x.id === viewAssignment.templateId);
    if (t)
      return (
        <>
          {errors}
          <ClientCopyView assignment={viewAssignment} template={t} onBack={back} onEditTemplate={() => setEditor({ template: t, folderId: t.folderId ?? null })} />
          {sheets}
        </>
      );
  }
  if (view === "log" && viewId) {
    return <WorkoutLogView sessionId={viewId} template={null} onBack={back} />;
  }
  if (view === "all") {
    return (
      <>
        <DetailHeader title="Templates" onBack={back} />
        {errors}
        <TemplateFolders templates={visible} renderTemplate={card} onAddTemplate={(folderId) => setEditor({ template: null, folderId })} onError={setActionError} />
        <Fab label="New programme" icon={Plus} onClick={() => setEditor({ template: null, folderId: null })} />
        {sheets}
      </>
    );
  }
  if (view === "assignments") {
    return (
      <>
        <DetailHeader title="Assigned to clients" onBack={back} />
        {assignedList(assignedRows, false)}
        {sheets}
      </>
    );
  }

  // ----- the list (TR1) ----------------------------------------------------
  const workouts = visible.filter((t) => !t.durationWeeks);
  const empty = own.length === 0 && workoutTemplateFolders.length === 0;

  return (
    <div style={{ paddingBottom: 96 }}>
      <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
        <label className="flex-1 min-w-0 flex items-center" style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", gap: 8 }}>
          <Search size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF, flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={chip === "exercises" ? "Search exercises…" : "Search programmes and workouts"}
            aria-label={chip === "exercises" ? "Search exercises" : "Search programmes and workouts"}
            className="flex-1 min-w-0 bg-transparent focus:outline-none placeholder:text-charcoal-faint"
            style={{ fontSize: textPx(14), color: INK.ch }}
          />
        </label>
        {chip !== "exercises" && (
          <SquareBtn ref={filterRef} icon={SlidersHorizontal} label="Filter" on={filter !== "all"} count={filter !== "all" ? 1 : undefined} onClick={() => setFilterAnchor(filterRef.current)} />
        )}
      </div>
      <div className="flex scroll-row no-scrollbar" style={{ gap: 6, marginBottom: 14 }}>
        <FilterChip label="Programmes" on={chip === "programmes"} onClick={() => setChip("programmes")} />
        <FilterChip label="Workouts" on={chip === "workouts"} onClick={() => setChip("workouts")} />
        <FilterChip label="Exercises" on={chip === "exercises"} onClick={() => setChip("exercises")} />
      </div>
      {errors}

      {chip === "programmes" &&
        (empty ? (
          <EmptyState icon={ClipboardList} title="No templates yet. Build your first one." />
        ) : (
          <>
            <SectionHead label="Templates" right={visible.length > 3 || workoutTemplateFolders.length ? `See all ${visible.length}` : undefined} onRight={() => go({ view: "all" })} />
            {latest.length === 0 ? <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>No matches.</p> : latest.map(card)}
            <SectionHead label="Assigned to clients" className="mt-2" />
            {assignedList(assignedRows.slice(0, 3), assignedRows.length > 3)}
          </>
        ))}

      {chip === "workouts" && (workouts.length === 0 ? <EmptyState icon={ClipboardList} title={q ? "No matches." : "No templates yet. Build your first one."} /> : workouts.map(card))}

      {chip === "exercises" && <ExercisesPanel query={query} templates={workoutTemplates} creating={creatingExercise} onCreatingChange={setCreatingExercise} />}

      {chip === "exercises" && fabLabel && (
        <span
          role="tooltip"
          className="fixed z-30 bottom-[calc(env(safe-area-inset-bottom)+170px+var(--active-bar,0px))] right-[calc(var(--app-gutter)+20px)]"
          style={{ background: INK.ch, color: INK.card, borderRadius: 10, padding: "6px 10px", fontSize: textPx(12), fontWeight: 700 }}
        >
          Create exercise
        </span>
      )}
      <div
        onPointerDown={() => {
          if (chip !== "exercises") return;
          pressTimer.current = window.setTimeout(() => setFabLabel(true), 500);
        }}
        onPointerUp={() => {
          if (pressTimer.current) window.clearTimeout(pressTimer.current);
          window.setTimeout(() => setFabLabel(false), 1200);
        }}
        onPointerLeave={() => pressTimer.current && window.clearTimeout(pressTimer.current)}
      >
        <Fab
          label={chip === "exercises" ? "Create exercise" : "New programme"}
          icon={Plus}
          onClick={() => (chip === "exercises" ? setCreatingExercise(true) : setEditor({ template: null, folderId: null }))}
        />
      </div>

      <PopupMenu<FilterKey>
        open={!!filterAnchor}
        anchor={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        selected={filter}
        options={[
          { value: "all", label: "All templates" },
          { value: "assigned", label: "Assigned" },
          { value: "unassigned", label: "Not assigned" },
        ]}
        onSelect={setFilter}
      />
      {sheets}
    </div>
  );
};

export default ProgrammesTab;

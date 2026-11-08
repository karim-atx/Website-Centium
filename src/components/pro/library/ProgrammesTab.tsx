import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ClipboardList, Copy, Dumbbell, Pencil, Plus, Search, Send, Settings2, SlidersHorizontal, Trash2, UserRound } from "lucide-react";
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
import { WeekProgrammesSection, WeekProgrammeView } from "../programmes/WeekProgrammes";
import { DetailHeader, ErrorLine, Fab, FilterChip, LibCard, SquareBtn } from "./libraryUi";
import { assignedLine, clientsLabel, currentWeek, isActive, templateMeta } from "./libraryModel";
import { t, tn } from "../../../i18n/core";
import { useIsWeb, useWebLayout } from "../../web/useWebLayout";
import { ProPageBodyWeb } from "../web/ProPageWeb";
import { AssignedListWeb, EmptyPanelWeb, LibSectionHeadWeb, LibraryChipsWeb, LibraryHeaderWeb, WorkoutCardWeb } from "../web/ProgrammeWeb";

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

export const ProgrammesTab: React.FC<{
  /** Website viewport: the Library tabs, when the list renders as the web page (its own header with search and the action). */
  webTabs?: React.ReactNode;
}> = ({ webTabs }) => {
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
  const web = useIsWeb();
  const { rail } = useWebLayout();

  const own = workoutTemplates.filter((w) => !w.isPublic);
  const active = templateAssignments.filter(isActive);
  const clientCount = (tpl: WorkoutTemplate) => new Set(active.filter((a) => a.templateId === tpl.id).map((a) => a.clientId)).size;
  const today = todayLocal();

  // After saving a new template with clients under "Assign to": open TR5 with them picked.
  useEffect(() => {
    if (!pendingAssign) return;
    const created = workoutTemplates.find((w) => !pendingAssign.before.has(w.id) && !w.isPublic);
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
  const templateMatches = (tpl: WorkoutTemplate) => {
    if (q && !tpl.name.toLowerCase().includes(q)) return false;
    if (filter === "assigned") return clientCount(tpl) > 0;
    if (filter === "unassigned") return clientCount(tpl) === 0;
    return true;
  };
  const visible = workoutTemplates.filter(templateMatches);
  const latest = [...visible].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);

  const clientName = (id: string) => professionalClients.find((c) => c.clientId === id)?.name ?? "";
  const assignedRows = active
    .map((a) => ({ a, tpl: workoutTemplates.find((w) => w.id === a.templateId) }))
    .filter((r): r is { a: typeof r.a; tpl: WorkoutTemplate } => !!r.tpl && !!clientName(r.a.clientId))
    .filter((r) => !q || r.tpl.name.toLowerCase().includes(q) || clientName(r.a.clientId).toLowerCase().includes(q));

  const menuOptions = (tpl: WorkoutTemplate, inDetail: boolean): PopupMenuOption<MenuAction>[] =>
    tpl.isPublic
      ? [{ value: "duplicate", label: t("Duplicate"), icon: <Copy size={15} /> }]
      : [
          { value: "rename", label: t("Rename"), icon: <Pencil size={15} /> },
          { value: "edit", label: t("Edit template"), icon: <Settings2 size={15} /> },
          { value: "assign", label: t("Assign to clients"), icon: <Send size={15} /> },
          ...(inDetail && clientCount(tpl) > 0 ? [{ value: "progress" as const, label: t("Progress"), icon: <ClipboardList size={15} /> }] : []),
          { value: "duplicate", label: t("Duplicate"), icon: <Copy size={15} /> },
          { value: "delete", label: t("Delete"), icon: <Trash2 size={15} />, destructive: true },
        ];

  const onMenu = (tpl: WorkoutTemplate, action: MenuAction) => {
    if (action === "rename") {
      setRenaming(tpl);
      setRenameDraft(tpl.name);
    } else if (action === "edit") setEditor({ template: tpl, folderId: tpl.folderId ?? null });
    else if (action === "assign") setAssign({ templateId: tpl.id });
    else if (action === "progress") go({ view: "progress", id: tpl.id });
    else if (action === "duplicate") {
      // A curated program is duplicated into the professional's own (owner_id
      // set, is_public false: the only shape they may write); assignments are
      // not copied.
      void addWorkoutTemplate({
        name: t("{name} (copy)", { name: tpl.name }),
        exercises: tpl.exercises,
        blocks: tpl.blocks,
        folderId: tpl.isPublic ? null : tpl.folderId,
        coachNote: tpl.coachNote,
        durationMin: tpl.durationMin,
        durationWeeks: tpl.durationWeeks ?? null,
      }).then((m) => setActionError(m ?? null));
    } else {
      void removeWorkoutTemplate(tpl.id).then((m) => {
        setActionError(m ?? null);
        if (!m && view) go(null);
      });
    }
  };

  const card = (tpl: WorkoutTemplate) => {
    const n = clientCount(tpl);
    const folder = tpl.folderId ? workoutTemplateFolders.find((f) => f.id === tpl.folderId) : undefined;
    const colour = folder?.color;
    return (
      <LibCard
        key={tpl.id}
        icon={ClipboardList}
        colour={colour}
        title={tpl.name}
        sub={templateMeta(tpl)}
        meta={
          tpl.isPublic ? (
            <UnverifiedProgramNotice isVerified={tpl.isVerified} isPublic={tpl.isPublic} variant="compact" />
          ) : (
            <>
              {n > 0 && <Chip label={clientsLabel(n)} />}
              {n === 0 && <Chip label={t("Template")} tone="pau" />}
            </>
          )
        }
        onOpen={() => go({ view: "template", id: tpl.id })}
        onMenu={(anchor) => setMenu({ template: tpl, anchor })}
      />
    );
  };

  const assignedList = (rows: typeof assignedRows, more: boolean) =>
    rows.length === 0 ? (
      <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>{t("Not assigned to anyone yet.")}</p>
    ) : (
      <ListCard
        rows={rows.map(({ a, tpl }) => ({
          key: a.id,
          icon: UserRound,
          title: `${clientName(a.clientId)} · ${tpl.name}`,
          meta: assignedLine(currentWeek(a.startsOn, a.joinWeek, tpl.durationWeeks, today), rings[a.clientId]) ?? undefined,
          trailing: <StatusRing value={rings[a.clientId] ?? null} lane="full_coaching" scale={0.85} />,
          onClick: () => go({ view: "template", id: tpl.id }),
        }))}
        more={more ? { label: t("All assignments"), onClick: () => go({ view: "assignments" }) } : undefined}
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
      <AssignSheet open={!!assign} onClose={() => setAssign(null)} template={workoutTemplates.find((w) => w.id === assign?.templateId) ?? null} preselected={assign?.preselected} />
      <TargetsSheet open={!!targets} onClose={() => setTargets(null)} template={targets?.template ?? null} exercise={targets?.exercise ?? null} />
      <PopupMenu<MenuAction>
        open={!!menu}
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        options={menu ? menuOptions(menu.template, view === "template") : []}
        onSelect={(a) => menu && onMenu(menu.template, a)}
      />
      <BottomSheet open={!!renaming} onClose={() => setRenaming(null)} title={t("Rename Template")}>
        <div className="space-y-4 animate-fade-slide-up">
          <input
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            aria-label={t("Template name")}
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
            {t("Save name")}
          </Button>
        </div>
      </BottomSheet>
    </>
  );

  const errors = (
    <>
      {/* A refused write and a list that couldn't refresh are different failures, said differently. */}
      {actionError && <ErrorLine>{t(actionError)}</ErrorLine>}
      {templatesError && !actionError && <ErrorLine>{t("Couldn't refresh your templates. Showing what was saved on this device.")}</ErrorLine>}
    </>
  );

  const viewTemplate = viewId ? workoutTemplates.find((w) => w.id === viewId) : undefined;
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
    const tpl = workoutTemplates.find((x) => x.id === viewAssignment.templateId);
    if (tpl)
      return (
        <>
          {errors}
          <ClientCopyView assignment={viewAssignment} template={tpl} onBack={back} onEditTemplate={() => setEditor({ template: tpl, folderId: tpl.folderId ?? null })} />
          {sheets}
        </>
      );
  }
  // Round D · DT1: week-by-day programmes (components/pro/programmes).
  if ((view === "programme" || view === "programme-client") && viewId) {
    return <WeekProgrammeView view={view} id={viewId} onBack={back} onOpenAssignment={(id) => go({ view: "programme-client", id })} />;
  }
  if (view === "log" && viewId) {
    return <WorkoutLogView sessionId={viewId} template={null} onBack={back} />;
  }
  if (view === "all") {
    return (
      <>
        <DetailHeader title={t("Templates")} onBack={back} />
        {errors}
        <TemplateFolders templates={visible} renderTemplate={card} onAddTemplate={(folderId) => setEditor({ template: null, folderId })} onError={setActionError} />
        <Fab label={t("New programme")} icon={Plus} onClick={() => setEditor({ template: null, folderId: null })} />
        {sheets}
      </>
    );
  }
  if (view === "assignments" && web && webTabs) {
    // Website viewport (WP-LI.5 all; WP-LI Library Extras Web): the Library header and tabs, the back circle with
    // PROGRAMMES / All assignments and the count, then one card of rows 2 across (1 on the rail).
    const cols = rail ? 1 : 2;
    const clients = new Set(assignedRows.map(({ a }) => a.clientId)).size;
    return (
      <div>
        <LibraryHeaderWeb
          query={query}
          onQuery={setQuery}
          placeholder={t("Search programmes and workouts")}
          action={{ label: t("New programme"), icon: Plus, onClick: () => setEditor({ template: null, folderId: null }) }}
        />
        <ProPageBodyWeb>
          {webTabs}
          <div className="flex items-center" style={{ gap: 10, marginBottom: 16 }}>
            <button type="button" onClick={back} aria-label={t("Back")} className="tap flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 999, border: "1px solid rgba(36,31,27,0.11)" }}>
              <ChevronLeft size={18} strokeWidth={2} aria-hidden style={{ color: "#5B5349" }} />
            </button>
            <div className="min-w-0">
              <p style={{ margin: 0, fontSize: 12, lineHeight: "16px", fontWeight: 600, letterSpacing: "0.11em", textTransform: "uppercase", color: "#71685E" }}>{t("Programmes")}</p>
              <h2 style={{ margin: 0, fontSize: 22, lineHeight: "28px", fontWeight: 700, letterSpacing: "-0.02em", color: "#241F1B" }}>{t("All assignments")}</h2>
            </div>
            <span style={{ marginInlineStart: "auto", fontSize: 13, lineHeight: "20px", color: "#71685E", whiteSpace: "nowrap" }}>{tn(clients, "{n} client on a programme", "{n} clients on a programme")}</span>
          </div>
          {assignedRows.length === 0 ? (
            <p style={{ fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{t("Not assigned to anyone yet.")}</p>
          ) : (
            <div className="grid" style={{ boxSizing: "border-box", borderRadius: 20, border: "1px solid rgba(36,31,27,0.08)", padding: "0 20px", gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, columnGap: 32 }}>
              {assignedRows.map(({ a, tpl }, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => go({ view: "template", id: tpl.id })}
                  className="flex items-center text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
                  style={{ gap: 16, minHeight: 72, borderBottom: i < assignedRows.length - cols ? "1px solid rgba(36,31,27,0.06)" : "none" }}
                >
                  <span className="flex shrink-0 items-center justify-center" style={{ width: 44, height: 44, borderRadius: 11, background: "#F0EDF9" }}>
                    <UserRound size={20} strokeWidth={1.75} aria-hidden style={{ color: "#7D6BB5" }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{`${clientName(a.clientId)} · ${tpl.name}`}</span>
                    <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{assignedLine(currentWeek(a.startsOn, a.joinWeek, tpl.durationWeeks, today), rings[a.clientId]) ?? ""}</span>
                  </span>
                  <StatusRing value={rings[a.clientId] ?? null} lane="full_coaching" />
                </button>
              ))}
            </div>
          )}
          {sheets}
        </ProPageBodyWeb>
      </div>
    );
  }
  if (view === "assignments") {
    return (
      <>
        <DetailHeader title={t("Assigned to clients")} onBack={back} />
        {assignedList(assignedRows, false)}
        {sheets}
      </>
    );
  }

  // ----- the list (TR1) ----------------------------------------------------
  const workouts = visible.filter((w) => !w.durationWeeks);
  const empty = own.length === 0 && workoutTemplateFolders.length === 0;

  // Website viewport (WP-LI.1, WP-LI.6; WP-LI Library Extras Web): the page header carries the search, Filter and
  // the primary action (New programme, or Create exercise on the Exercises chip) instead of the floating button;
  // the chips are 3 equal pills; Programmes keeps its sections in columns, Workouts are cards 3 across (2 on the
  // rail), Exercises the panel's web list.
  if (web && webTabs) {
    return (
      <div>
        <LibraryHeaderWeb
          query={query}
          onQuery={setQuery}
          placeholder={chip === "exercises" ? t("Search exercises…") : t("Search programmes and workouts")}
          filter={chip !== "exercises" ? { on: filter !== "all", onClick: (a) => setFilterAnchor(a) } : undefined}
          action={chip === "exercises" ? { label: t("Create exercise"), icon: Plus, onClick: () => setCreatingExercise(true) } : { label: t("New programme"), icon: Plus, onClick: () => setEditor({ template: null, folderId: null }) }}
        />
        <ProPageBodyWeb>
          {webTabs}
          <LibraryChipsWeb<ChipKey>
            items={[
              { key: "programmes", label: t("Programmes") },
              { key: "workouts", label: t("Workouts") },
              { key: "exercises", label: t("Exercises") },
            ]}
            active={chip}
            onChange={setChip}
          />
          {errors}
          {/* WP-LI Library Web v2: Templates as cards 3 across (2 on the rail), then Assigned to clients below; the
              repo's week-by-day programmes keep their section above. */}
          {chip === "programmes" && (
            <div className="flex flex-col" style={{ gap: 24 }}>
              <WeekProgrammesSection query={query} onOpen={(id) => go({ view: "programme", id })} />
              {empty ? (
                <EmptyPanelWeb line={t("No templates yet. Build your first one.")} minHeight={rail ? 420 : 520} />
              ) : (
                <>
                  <section aria-label={t("Templates")}>
                    <LibSectionHeadWeb label={t("Templates")} right={visible.length > 3 || workoutTemplateFolders.length ? t("See all {n}", { n: visible.length }) : undefined} onRight={() => go({ view: "all" })} />
                    {latest.length === 0 ? (
                      <p style={{ fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{t("No matches.")}</p>
                    ) : (
                      <div className="grid" style={{ gridTemplateColumns: `repeat(${rail ? 2 : 3},minmax(0,1fr))`, gap: 24 }}>
                        {latest.map((tpl) => {
                          const n = clientCount(tpl);
                          const folder = tpl.folderId ? workoutTemplateFolders.find((f) => f.id === tpl.folderId) : undefined;
                          return (
                            <WorkoutCardWeb
                              key={tpl.id}
                              icon={ClipboardList}
                              colour={folder?.color}
                              title={tpl.name}
                              sub={templateMeta(tpl)}
                              chip={tpl.isPublic ? null : n > 0 ? { label: clientsLabel(n), template: false } : { label: t("Template"), template: true }}
                              extra={tpl.isPublic ? <UnverifiedProgramNotice isVerified={tpl.isVerified} isPublic={tpl.isPublic} variant="compact" /> : undefined}
                              onOpen={() => go({ view: "template", id: tpl.id })}
                              onMenu={(anchor) => setMenu({ template: tpl, anchor })}
                            />
                          );
                        })}
                      </div>
                    )}
                  </section>
                  <section aria-label={t("Assigned to clients")}>
                    <LibSectionHeadWeb label={t("Assigned to clients")} />
                    {assignedRows.length === 0 ? (
                      <p style={{ fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{t("Not assigned to anyone yet.")}</p>
                    ) : (
                      <AssignedListWeb
                        rows={assignedRows.slice(0, 3).map(({ a, tpl }) => ({
                          key: a.id,
                          title: `${clientName(a.clientId)} · ${tpl.name}`,
                          line: assignedLine(currentWeek(a.startsOn, a.joinWeek, tpl.durationWeeks, today), rings[a.clientId]) ?? undefined,
                          trailing: <StatusRing value={rings[a.clientId] ?? null} lane="full_coaching" scale={48 / 56} />,
                          onClick: () => go({ view: "template", id: tpl.id }),
                        }))}
                        more={assignedRows.length > 3 ? { label: t("All assignments"), onClick: () => go({ view: "assignments" }) } : undefined}
                      />
                    )}
                  </section>
                </>
              )}
            </div>
          )}
          {chip === "workouts" &&
            (workouts.length === 0 ? (
              <EmptyPanelWeb line={q ? t("No matches.") : t("No templates yet. Build your first one.")} minHeight={rail ? 420 : 520} />
            ) : (
              <div className="grid" style={{ gridTemplateColumns: `repeat(${rail ? 2 : 3},minmax(0,1fr))`, gap: 24 }}>
                {workouts.map((tpl) => {
                  const n = clientCount(tpl);
                  const folder = tpl.folderId ? workoutTemplateFolders.find((f) => f.id === tpl.folderId) : undefined;
                  return (
                    <WorkoutCardWeb
                      key={tpl.id}
                      icon={Dumbbell}
                      colour={folder?.color}
                      title={tpl.name}
                      sub={templateMeta(tpl)}
                      chip={tpl.isPublic ? null : n > 0 ? { label: clientsLabel(n), template: false } : { label: t("Template"), template: true }}
                      extra={tpl.isPublic ? <UnverifiedProgramNotice isVerified={tpl.isVerified} isPublic={tpl.isPublic} variant="compact" /> : undefined}
                      onOpen={() => go({ view: "template", id: tpl.id })}
                      onMenu={(anchor) => setMenu({ template: tpl, anchor })}
                    />
                  );
                })}
              </div>
            ))}
          {chip === "exercises" && <ExercisesPanel query={query} templates={workoutTemplates} creating={creatingExercise} onCreatingChange={setCreatingExercise} />}
        </ProPageBodyWeb>
        <PopupMenu<FilterKey>
          open={!!filterAnchor}
          anchor={filterAnchor}
          onClose={() => setFilterAnchor(null)}
          selected={filter}
          options={[
            { value: "all", label: t("All templates") },
            { value: "assigned", label: t("Assigned") },
            { value: "unassigned", label: t("Not assigned") },
          ]}
          onSelect={setFilter}
        />
        {sheets}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 96 }}>
      <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
        <label className="flex-1 min-w-0 flex items-center" style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", gap: 8 }}>
          <Search size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF, flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={chip === "exercises" ? t("Search exercises…") : t("Search programmes and workouts")}
            aria-label={chip === "exercises" ? t("Search exercises") : t("Search programmes and workouts")}
            className="flex-1 min-w-0 bg-transparent focus:outline-none placeholder:text-charcoal-faint"
            style={{ fontSize: textPx(14), color: INK.ch }}
          />
        </label>
        {chip !== "exercises" && (
          <SquareBtn ref={filterRef} icon={SlidersHorizontal} label={t("Filter")} on={filter !== "all"} count={filter !== "all" ? 1 : undefined} onClick={() => setFilterAnchor(filterRef.current)} />
        )}
      </div>
      <div className="flex scroll-row no-scrollbar" style={{ gap: 6, marginBottom: 14 }}>
        <FilterChip label={t("Programmes")} on={chip === "programmes"} onClick={() => setChip("programmes")} />
        <FilterChip label={t("Workouts")} on={chip === "workouts"} onClick={() => setChip("workouts")} />
        <FilterChip label={t("Exercises")} on={chip === "exercises"} onClick={() => setChip("exercises")} />
      </div>
      {errors}

      {chip === "programmes" && <WeekProgrammesSection query={query} onOpen={(id) => go({ view: "programme", id })} />}
      {chip === "programmes" &&
        (empty ? (
          <EmptyState icon={ClipboardList} title={t("No templates yet. Build your first one.")} />
        ) : (
          <>
            <SectionHead label={t("Templates")} right={visible.length > 3 || workoutTemplateFolders.length ? t("See all {n}", { n: visible.length }) : undefined} onRight={() => go({ view: "all" })} />
            {latest.length === 0 ? <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>{t("No matches.")}</p> : latest.map(card)}
            <SectionHead label={t("Assigned to clients")} className="mt-2" />
            {assignedList(assignedRows.slice(0, 3), assignedRows.length > 3)}
          </>
        ))}

      {chip === "workouts" && (workouts.length === 0 ? <EmptyState icon={ClipboardList} title={q ? t("No matches.") : t("No templates yet. Build your first one.")} /> : workouts.map(card))}

      {chip === "exercises" && <ExercisesPanel query={query} templates={workoutTemplates} creating={creatingExercise} onCreatingChange={setCreatingExercise} />}

      {chip === "exercises" && fabLabel && (
        <span
          role="tooltip"
          className="fixed z-30 bottom-[calc(env(safe-area-inset-bottom)+170px+var(--active-bar,0px))] end-[calc(var(--app-gutter)+20px)]"
          style={{ background: INK.ch, color: INK.card, borderRadius: 10, padding: "6px 10px", fontSize: textPx(12), fontWeight: 700 }}
        >
          {t("Create exercise")}
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
          label={chip === "exercises" ? t("Create exercise") : t("New programme")}
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
          { value: "all", label: t("All templates") },
          { value: "assigned", label: t("Assigned") },
          { value: "unassigned", label: t("Not assigned") },
        ]}
        onSelect={setFilter}
      />
      {sheets}
    </div>
  );
};

export default ProgrammesTab;

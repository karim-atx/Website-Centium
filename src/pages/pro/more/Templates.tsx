import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CircleCheck, ClipboardList, EllipsisVertical, FileText, Pencil, Plus, Trash2, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useProSubtype } from "../../../hooks/useProSubtype";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { SubPage } from "../../../components/pro/profile/kit";
import { usePaneSpan } from "../../../components/web/paneFill";
import { SegmentedTabs } from "../../../components/ui/SegmentedTabs";
import { PinnedCta } from "../../../components/ui/PinnedCta";
import { PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { INK, NO_ICON_SCALE } from "../../../components/pro/proInk";
import { ComingSoon } from "../../../components/pro/ComingSoon";
import { EmptyState } from "../../../components/pro/EmptyState";
import { ListSkeleton, OfflineLine, ProCardSkeleton, ProError } from "../../../components/pro/states";
import { PRO_ROUTES, type ProLane } from "../../../components/pro/subtypeLanes";
import { TemplateEditor } from "../../../components/pro/library/TemplateEditor";
import { AssignSheet } from "../../../components/pro/library/AssignSheet";
import { isActive, templateMeta } from "../../../components/pro/library/libraryModel";
import { NewPlanSheet } from "../../../components/pro/nutrition/LibraryHome";
import { itemMacros } from "../../../components/pro/nutrition/itemFacts";
import { mealPlansHref } from "../../../components/pro/nutrition/nav";
import { sumMacros, templateLine } from "../../../components/pro/nutrition/nutritionModel";
import { templateMeta as noteMeta } from "../../../components/pro/forms/noteTemplateModel";
import { TopToast } from "../../../components/pro/forms/moKit";
import { EditTemplateSheet } from "./NoteTemplates";
import { createTemplate, deleteTemplate, fetchAssignments, fetchTemplates, type Assignment, type MealPlan } from "../../../services/pro/nutrition";
import { deleteNoteTemplate, fetchMyNoteTemplates, type NoteTemplateRow, type TemplateKind } from "../../../services/pro/noteTemplates";
import type { WorkoutTemplate } from "../../../types";
import { t, tk, tn } from "../../../i18n/core";

type Tab = "programmes" | "meal-plans" | "notes" | "referrals";
const TAB_LABEL: Record<Tab, string> = { programmes: tk("Programmes"), "meal-plans": tk("Meal plans"), notes: tk("Notes"), referrals: tk("Referral letters") };
/** The tabs per lane (capability matrix: programmes Full coaching only, meal plans hidden for Clinical overview). */
const LANE_TABS: Record<ProLane, Tab[]> = {
  full_coaching: ["programmes", "meal-plans", "notes"],
  nutrition: ["meal-plans", "notes"],
  clinical_overview: ["notes", "referrals"],
};
const NOTE_KIND: Record<ProLane, TemplateKind> = { full_coaching: "training", nutrition: "nutrition", clinical_overview: "clinical" };
const usedBy = (n: number) => (n > 0 ? tn(n, "Used by {n} client", "Used by {n} clients") : null);

const SkeletonRow: React.FC = () => <ProCardSkeleton lines={2} />;
type Load<T> = { list: T[] | null; state: "loading" | "ok" | "error" | "offline" };
type Menu = { kind: "programme" | "meal" | "note"; id: string; name: string; anchor: HTMLElement };

/**
 * Release 3 · MO10 Templates (/app/more/templates; gen/more.js templates):
 * pageHead "Templates" / "Reuse what works"; segTabs (h38, 12, 14 under) with
 * the lane's tabs; one card per template (card fill, 1px card border, r20,
 * pad 14 16, 8 apart, gap 12; the 36 tile r11 #F0EDF9 / dark
 * rgba(174,161,220,0.14) with a 17 / 1.75 primary.accent glyph; title 14 /
 * 600; line 12 text.faint "{meta} · Used by {n} clients"; the ⋮ 16 / 2
 * text.faint); the pinned CTA "New template" with its plus.
 *
 * - Programmes (Full coaching): the professional's own workout templates
 *   (AppContext workoutTemplates, as Library › Programmes), "{n} weeks · {n}
 *   exercises" (libraryModel templateMeta: sessions a week aren't stored),
 *   used by = clients with an active assignment. New template is the Library's
 *   TemplateEditor (and its Assign sheet for clients picked there); a card
 *   opens the template in Library.
 * - Meal plans: meal_plans templates with "{n} days · {n} to {n} kcal"
 *   (templateLine, as NU1), used by = active meal_plan_assignments. New
 *   template is NU1's New meal plan sheet, then the builder; a card opens the
 *   builder.
 * - Notes: note_templates (MO21's rows and its edit sheet): "{n} sections";
 *   there's no usage count column, so no "Used by".
 * - Referral letters (Clinical overview): no table (Coming soon).
 * The ⋮ offers Edit and Delete (with a confirmation), the actions each home
 * screen already has. ?tab= picks the opening tab.
 */
// WP-MO.16 web: the Templates frame's own tabs (track #F5F5F6, 4 padding, r12; tabs r9; on white with #5F5093).
const TPL_TABS = {
  light: { activeFill: "#FFFFFF", activeInk: "#5F5093", idleFill: "transparent", idleInk: "#5B5349" },
  trackStyle: { background: "#F5F5F6", borderRadius: 12, padding: 4, gap: 4 },
  tabRadius: 9,
  idleWeight: 600,
};

export default function Templates() {
  const navigate = useNavigate();
  const { lane } = useProSubtype();
  const [params, setParams] = useSearchParams();
  const { authUserId: me, workoutTemplates, templateAssignments, templatesError, removeWorkoutTemplate, recipes, customMeals } = useApp();
  const tabs = lane ? LANE_TABS[lane] : [];
  const asked = params.get("tab") as Tab | null;
  const tab: Tab | null = asked && tabs.includes(asked) ? asked : tabs[0] ?? null;
  const setTab = (t: Tab) => {
    const p = new URLSearchParams(params);
    p.set("tab", t);
    setParams(p, { replace: true });
  };

  const [meals, setMeals] = useState<Load<MealPlan>>({ list: null, state: "loading" });
  const [mealUse, setMealUse] = useState<Assignment[]>([]);
  const [notes, setNotes] = useState<Load<NoteTemplateRow>>({ list: null, state: "loading" });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const wantsMeals = tabs.includes("meal-plans");
  useEffect(() => {
    if (!me || !wantsMeals) return;
    let live = true;
    void Promise.all([fetchTemplates(me), fetchAssignments(me)]).then(([t, a]) => {
      if (!live) return;
      setMeals(t.ok ? { list: t.data, state: "ok" } : (m) => ({ list: m.list, state: t.offline ? "offline" : "error" }));
      if (a.ok) setMealUse(a.data);
    });
    return () => {
      live = false;
    };
  }, [me, wantsMeals, nonce]);

  useEffect(() => {
    if (!me) return;
    let live = true;
    void fetchMyNoteTemplates(me).then((r) => {
      if (!live) return;
      setNotes(r.ok ? { list: r.data, state: "ok" } : (m) => ({ list: m.list, state: r.offline ? "offline" : "error" }));
    });
    return () => {
      live = false;
    };
  }, [me, nonce]);

  // Sheets and menus
  const [editor, setEditor] = useState(false);
  const [assign, setAssign] = useState<{ templateId: string; preselected: string[] } | null>(null);
  const [pendingAssign, setPendingAssign] = useState<{ before: Set<string>; assignTo: string[] } | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [noteEdit, setNoteEdit] = useState<NoteTemplateRow | "new" | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [deleting, setDeleting] = useState<Omit<Menu, "anchor"> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A new programme saved with clients under "Assign to": open the Assign sheet with them (as Library does).
  useEffect(() => {
    if (!pendingAssign) return;
    const created = workoutTemplates.find((t) => !pendingAssign.before.has(t.id) && !t.isPublic);
    if (!created) return;
    if (pendingAssign.assignTo.length) setAssign({ templateId: created.id, preselected: pendingAssign.assignTo });
    setPendingAssign(null);
  }, [pendingAssign, workoutTemplates]);

  const programmes = useMemo(() => workoutTemplates.filter((t) => !t.isPublic).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [workoutTemplates]);
  const programmeUse = (t: WorkoutTemplate) => new Set(templateAssignments.filter((a) => isActive(a) && a.templateId === t.id).map((a) => a.clientId)).size;
  const mealUseOf = (id: string) => new Set(mealUse.filter((a) => a.templateId === id).map((a) => a.clientId)).size;
  const src = useMemo(() => ({ recipes, customMeals }), [recipes, customMeals]);

  const openProgramme = (id: string) => navigate(`${PRO_ROUTES.library}/programmes?view=template&id=${encodeURIComponent(id)}`);
  const openMeal = (id: string) => lane && navigate(mealPlansHref(lane, "plans", { plan: id }));

  const inPane = usePaneSpan();
  const newTemplate = () => {
    setError(null);
    if (tab === "programmes") setEditor(true);
    else if (tab === "meal-plans") setCreatingPlan(true);
    else if (tab === "notes") setNoteEdit("new");
  };

  const remove = async (d: Omit<Menu, "anchor">) => {
    setError(null);
    if (d.kind === "programme") {
      const m = await removeWorkoutTemplate(d.id);
      if (m) setError(m);
      return;
    }
    const r = d.kind === "meal" ? await deleteTemplate(d.id) : await deleteNoteTemplate(d.id);
    if (!r.ok) setError(r.message);
    reload();
  };

  const menuOptions: PopupMenuOption<"edit" | "delete">[] = [
    { value: "edit", label: t("Edit template"), icon: <Pencil size={15} /> },
    { value: "delete", label: t("Delete"), icon: <Trash2 size={15} />, destructive: true },
  ];

  const skeleton = <ListSkeleton rows={3} row={SkeletonRow} />;

  let body: React.ReactNode = null;
  if (tab === "programmes") {
    body = programmes.length ? (
      programmes.map((t) => (
        <TplCard
          key={t.id}
          icon={ClipboardList}
          title={t.name}
          line={[templateMeta(t), usedBy(programmeUse(t))].filter(Boolean).join(" · ")}
          onOpen={() => openProgramme(t.id)}
          onMenu={(anchor) => setMenu({ kind: "programme", id: t.id, name: t.name, anchor })}
        />
      ))
    ) : (
      <EmptyState icon={ClipboardList} title={t("No programmes yet")} line={t("Make one with New template, then assign it to clients.")} />
    );
    if (templatesError) body = (
      <>
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginBottom: 8 }}>{t("Couldn't refresh your templates. Showing what was saved on this device.")}</p>
        {body}
      </>
    );
  } else if (tab === "meal-plans") {
    body = !meals.list ? (
      meals.state === "loading" ? skeleton : meals.state === "offline" ? <OfflineLine /> : <ProError onRetry={reload} />
    ) : meals.list.length ? (
      meals.list.map((p) => {
        const totals = p.days.map((d) => sumMacros(d.items.map((it) => itemMacros(it, src))).kcal);
        return (
          <TplCard
            key={p.id}
            icon={UtensilsCrossed}
            title={p.name}
            line={[templateLine(p.daysCount, totals, p.kcalTarget), usedBy(mealUseOf(p.id))].filter(Boolean).join(" · ")}
            onOpen={() => openMeal(p.id)}
            onMenu={(anchor) => setMenu({ kind: "meal", id: p.id, name: p.name, anchor })}
          />
        );
      })
    ) : (
      <EmptyState icon={UtensilsCrossed} title={t("No meal plans yet")} line={t("Make one with New template, then assign it to clients.")} />
    );
  } else if (tab === "notes") {
    body = !notes.list ? (
      notes.state === "loading" ? skeleton : notes.state === "offline" ? <OfflineLine /> : <ProError onRetry={reload} />
    ) : notes.list.length ? (
      notes.list.map((n) => (
        <TplCard key={n.id} icon={FileText} title={n.title} line={noteMeta(n.body)} onOpen={() => setNoteEdit(n)} onMenu={(anchor) => setMenu({ kind: "note", id: n.id, name: n.title, anchor })} />
      ))
    ) : (
      <EmptyState icon={FileText} title={t("No templates yet")} line={t("Make one with New template. It shows in the Templates filter when you write a note on a client's page.")} />
    );
  } else if (tab === "referrals") {
    body = <ComingSoon line={t("Letters to dietitians, trainers and physios.")} />;
  }

  const offlineLine = (tab === "meal-plans" && meals.list && meals.state === "offline") || (tab === "notes" && notes.list && notes.state === "offline");

  const canAdd = !!tab && tab !== "referrals";
  const content = (
    <>
      {tabs.length > 1 && tab && (
        <SegmentedTabs className={inPane ? "mb-5" : "mb-[14px]"} items={tabs.map((tab) => ({ key: tab, label: t(TAB_LABEL[tab]) }))} activeKey={tab} onChange={(k) => setTab(k as Tab)} tabHeight={inPane ? 32 : 38} labelSize={inPane ? 15 : 12} {...(inPane ? TPL_TABS : null)} />
      )}
      {offlineLine && <OfflineLine />}
      {error && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginBottom: 8 }}>
          {error}
        </p>
      )}
      {body}
      {canAdd && !inPane && <PinnedCta primary={{ label: t("New template"), icon: <Plus size={15} strokeWidth={2} aria-hidden />, onClick: newTemplate }} />}

      <TemplateEditor
        open={editor}
        onClose={() => setEditor(false)}
        template={null}
        defaultFolderId={null}
        onSaved={(id, assignTo, before) => {
          if (id && assignTo.length) setAssign({ templateId: id, preselected: assignTo });
          else if (!id) setPendingAssign({ before, assignTo });
        }}
      />
      <AssignSheet open={!!assign} onClose={() => setAssign(null)} template={workoutTemplates.find((t) => t.id === assign?.templateId) ?? null} preselected={assign?.preselected} />
      <NewPlanSheet
        open={creatingPlan}
        onClose={() => setCreatingPlan(false)}
        onCreate={async (name, days) => {
          if (!me) return t("Sign in again.");
          const r = await createTemplate(me, name, days);
          if (!r.ok) return r.message;
          setCreatingPlan(false);
          openMeal(r.id);
          return null;
        }}
      />
      {lane && (
        <EditTemplateSheet
          open={noteEdit !== null}
          row={noteEdit === "new" ? null : noteEdit}
          kind={NOTE_KIND[lane]}
          onClose={() => setNoteEdit(null)}
          onSaved={(text) => {
            setNoteEdit(null);
            setToast(text);
            reload();
          }}
        />
      )}
      <PopupMenu<"edit" | "delete">
        open={!!menu}
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        options={menuOptions}
        onSelect={(a) => {
          const m = menu;
          setMenu(null);
          if (!m) return;
          if (a === "delete") return setDeleting({ kind: m.kind, id: m.id, name: m.name });
          if (m.kind === "programme") openProgramme(m.id);
          else if (m.kind === "meal") openMeal(m.id);
          else setNoteEdit(notes.list?.find((n) => n.id === m.id) ?? null);
        }}
      />
      <ConfirmCard
        open={!!deleting}
        title={t("Delete {name}?", { name: deleting?.name ?? t("this template") })}
        subtitle={deleting?.kind === "note" ? undefined : t("Clients already on it keep their own copy.")}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const d = deleting;
          setDeleting(null);
          if (d) void remove(d);
        }}
      />
      <TopToast icon={CircleCheck} text={toast} onDone={() => setToast(null)} />
    </>
  );

  // WP-MO.16 web (WP-MO Templates Web): the Templates kicker over Reuse what works (28/36), New template in the
  // header (40 high, r14, #9A8CD6, plus 18, 15/24 600), 20 above the tabs; no pinned button.
  if (inPane)
    return (
      <div style={{ paddingBottom: 32 }}>
        <div className="flex items-end justify-between" style={{ gap: 16, marginBottom: 20 }}>
          <div className="flex-1 min-w-0">
            <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8C8378" }}>{t("Templates")}</p>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.03em", color: "#241F1B" }}>{t("Reuse what works")}</h1>
          </div>
          {canAdd && (
            <button type="button" onClick={newTemplate} className="flex items-center shrink-0 hover:opacity-90" style={{ height: 40, padding: "0 18px", borderRadius: 14, gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: "#9A8CD6", color: "#FFFFFF", whiteSpace: "nowrap" }}>
              <Plus size={18} strokeWidth={2} aria-hidden />
              {t("New template")}
            </button>
          )}
        </div>
        {content}
      </div>
    );
  return (
    <SubPage title={t("Templates")} subtitle={t("Reuse what works")} bottomPad={172}>
      {content}
    </SubPage>
  );
}

/** more.js templates: one template card. */
const TplCard: React.FC<{ icon: LucideIcon; title: string; line: string; onOpen: () => void; onMenu: (anchor: HTMLElement) => void }> = ({ icon: Icon, title, line, onOpen, onMenu }) => {
  const dark = useIsDark();
  return (
    <div className="flex items-center" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "14px 16px", marginBottom: 8, gap: 12 }}>
      <button type="button" onClick={onOpen} className="tap flex-1 min-w-0 flex items-center text-start" style={{ gap: 12 }}>
        <span aria-hidden className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: dark ? "rgba(174,161,220,0.14)" : "#F0EDF9" }}>
          <Icon size={17} strokeWidth={1.75} style={{ color: INK.prAccent, ...NO_ICON_SCALE }} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>
            {title}
          </span>
          <span className="block" style={{ fontSize: textPx(12), color: INK.chF }}>
            {line}
          </span>
        </span>
      </button>
      <button type="button" aria-label={t("{title} options", { title })} onClick={(e) => onMenu(e.currentTarget)} className="tap flex items-center justify-center shrink-0" style={{ width: 44, height: 44, marginBlock: "-12px", marginInline: "-8px -14px" }}>
        <EllipsisVertical size={16} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
      </button>
    </div>
  );
};


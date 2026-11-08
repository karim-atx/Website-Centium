import React, { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, ChevronRight, EllipsisVertical, Plus, Salad, SlidersHorizontal, Target, UserRound, UtensilsCrossed } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsWeb, useWebLayout } from "../../web/useWebLayout";
import { ProPageBodyWeb } from "../web/ProPageWeb";
import { LibraryHeaderWeb, LibSectionHeadWeb } from "../web/ProgrammeWeb";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { PopupMenu } from "../../ui/PopupMenu";
import { ConfirmCard } from "../../ui/ConfirmCard";
import { DeleteConfirmWeb } from "../web/DeleteConfirmWeb";
import { INK, NO_ICON_SCALE } from "../proInk";
import { SectionHead } from "../client/kit";
import { StatusRing } from "../StatusRing";
import { EmptyState } from "../EmptyState";
import { ListSkeleton, OfflineLine, ProError } from "../states";
import { todayLocal } from "../../../utils/date";
import { fetchAdherencePct } from "../../../services/pro/home";
import { createTemplate, deleteTemplate, fetchAssignments, fetchTemplates, type Assignment, type MealPlan } from "../../../services/pro/nutrition";
import type { ProLane } from "../subtypeLanes";
import { NuFab, SearchField, SquareButton } from "./kit";
import { useNuRoster } from "./hooks";
import { itemMacros } from "./itemFacts";
import { sumMacros, templateLine, weekOfPlan } from "./nutritionModel";
import { useNutritionOverview } from "./useNutritionOverview";
import { AssignSheet } from "./AssignSheet";
import type { NuArea } from "./nav";
import { appLocale } from "../../../i18n/format";
import { t, tn, tx } from "../../../i18n/core";

/**
 * Release 3 · NU1 v6 "Meal plans library" (Nutrition) and "Library › Meal
 * plans" (Full coaching), source gen r6c.js nuLibrary6 through r9.js
 * withPlans9 / libCard9 and r10.js nuLibrary10:
 * - Nutrition only: the three boxes (r16, pad 10, gap 6, icon 16 / 1.75,
 *   number 18 / 800, label 10.5 / 600; the first on primary pale): Journals
 *   to review (days waiting for your feedback, NU5), Recipes (yours, NU9),
 *   "{n} set" Targets (clients whose targets you set, NU8). Each opens its
 *   area.
 * - Search ("Search meal plans and recipes") and the Filter square.
 * - TEMPLATES with See all: cards (libCard9: r20, pad 16, gap 14, tile 42
 *   r13 in the plan's colour at 16%, icon 19 / 1.75, title 16 / 800, line 13
 *   text.soft "{n} days · {n} to {n} kcal" from the day totals, chips 11.5
 *   "{n} clients" and "Template", ⋮ 18 / 2).
 * - ASSIGNED: "{client_name} · {meal_plan_name}", "Week {n} · {n}% on plan"
 *   (client_adherence over 14 days, HANDOVER i) and the StatusRing (neutral
 *   with a dash when there's no data).
 * - The "+" (New meal plan): NuFab, bottom left (FINAL_PLAN W5).
 * Full coaching's Library renders the title and the Programmes / Meal plans
 * tabs above this; Nutrition gets the "Meal plans" title here.
 */
const PLAN_COLOURS = ["#6F9993", "#7D6BB5", "#D9A441"];
const TEMPLATES_SHOWN = 3;
type Show = "all" | "templates" | "assigned";

export const LibraryHome: React.FC<{
  lane: ProLane;
  onArea: (area: NuArea) => void;
  onOpenPlan: (planId: string) => void;
  /** Website viewport: the tabs the web page shows under its header (Library's or the Meal plans areas). */
  webTabs?: React.ReactNode;
}> = ({ lane, onArea, onOpenPlan, webTabs }) => {
  const { authUserId, recipes, customMeals } = useApp();
  const dark = useIsDark();
  const nutrition = lane === "nutrition";
  // Website viewport (WP-NU-MP.1): the web page header carries the title.
  const web = useIsWeb();
  const webRail = useWebLayout().rail;
  const today = todayLocal();
  const [templates, setTemplates] = useState<{ list: MealPlan[] | null; error: boolean; offline: boolean }>({ list: null, error: false, offline: false });
  const [assigned, setAssigned] = useState<Assignment[] | null>(null);
  const [nonce, setNonce] = useState(0);
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<Show>("all");
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [seeAll, setSeeAll] = useState(false);
  const [menu, setMenu] = useState<{ plan: MealPlan; anchor: HTMLElement } | null>(null);
  const [assigning, setAssigning] = useState<MealPlan | null>(null);
  const [deleting, setDeleting] = useState<MealPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rings, setRings] = useState<Record<string, number | null>>({});
  const overview = useNutritionOverview(nutrition ? lane : null);
  const { clients } = useNuRoster(lane);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void Promise.all([fetchTemplates(authUserId), fetchAssignments(authUserId)]).then(([t, a]) => {
      if (!live) return;
      setTemplates((prev) => (t.ok ? { list: t.data, error: false, offline: false } : { list: prev.list, error: true, offline: t.offline }));
      if (a.ok) setAssigned(a.data);
      if (!a.ok) setTemplates((prev) => ({ ...prev, error: true, offline: a.offline }));
    });
    return () => {
      live = false;
    };
  }, [authUserId, nonce]);

  useEffect(() => {
    if (!assigned?.length) return;
    let live = true;
    const ids = [...new Set(assigned.map((a) => a.clientId))];
    void Promise.all(ids.map(async (id) => [id, await fetchAdherencePct(id, 14, today)] as const)).then((pairs) => live && setRings(Object.fromEntries(pairs.map(([id, v]) => [id, typeof v === "number" ? v : null]))));
    return () => {
      live = false;
    };
  }, [assigned, today]);

  const nameOf = (id: string) => clients?.find((c) => c.clientId === id)?.name ?? t("Client");
  const src = useMemo(() => ({ recipes, customMeals }), [recipes, customMeals]);
  const term = query.trim().toLowerCase();
  const tList = (templates.list ?? []).filter((p) => !term || p.name.toLowerCase().includes(term));
  const aList = (assigned ?? []).filter((a) => !term || a.name.toLowerCase().includes(term) || nameOf(a.clientId).toLowerCase().includes(term));
  const rMatches = term ? recipes.filter((r) => r.title.toLowerCase().includes(term)) : [];
  const shownTemplates = seeAll || term ? tList : tList.slice(0, TEMPLATES_SHOWN);
  const countFor = (id: string) => (assigned ?? []).filter((a) => a.templateId === id).length;
  const loading = templates.list === null && !templates.error;
  const none = templates.list !== null && templates.list.length === 0 && (assigned ?? []).length === 0;

  const overlays = (
    <>
    <PopupMenu
      open={!!filterAnchor}
      anchor={filterAnchor}
      onClose={() => setFilterAnchor(null)}
      heading={t("Show")}
      options={[
        { value: "all", label: t("All") },
        { value: "templates", label: t("Templates") },
        { value: "assigned", label: t("Assigned") },
      ]}
      selected={show}
      align="right"
      width={180}
      // WP-NU-MP.10: the web menus draw plain rows (no row borders).
      variant={web ? "plain" : undefined}
      webRows={web}
      onSelect={(v) => {
        setShow(v as Show);
        setFilterAnchor(null);
      }}
    />
    <PopupMenu
      open={!!menu}
      anchor={menu?.anchor ?? null}
      onClose={() => setMenu(null)}
      options={[
        { value: "edit", label: t("Edit") },
        { value: "assign", label: t("Assign to clients") },
        { value: "delete", label: t("Delete"), destructive: true },
      ]}
      align="right"
      width={190}
      variant={web ? "plain" : undefined}
      webRows={web}
      onSelect={(v) => {
        const p = menu?.plan;
        setMenu(null);
        if (!p) return;
        if (v === "edit") onOpenPlan(p.id);
        else if (v === "assign") setAssigning(p);
        else setDeleting(p);
      }}
    />
    <AssignSheet
      open={!!assigning}
      onClose={() => setAssigning(null)}
      template={assigning}
      lane={lane}
      assignments={assigned ?? []}
      onAssigned={(n) => {
        setMsg(tn(n, "Assigned to 1 client.", "Assigned to {n} clients."));
        setNonce((x) => x + 1);
      }}
    />
    {(() => {
      const props = {
        open: !!deleting,
        title: deleting ? t("Delete {name}?", { name: deleting.name }) : t("Delete this meal plan?"),
        onCancel: () => setDeleting(null),
        onConfirm: async () => {
          const p = deleting;
          setDeleting(null);
          if (!p) return;
          const r = await deleteTemplate(p.id);
          if (!r.ok) setMsg(r.message);
          setNonce((x) => x + 1);
        },
      };
      return web ? (
        <DeleteConfirmWeb {...props} line={t("Clients already on it keep their own copy.")} />
      ) : (
        <ConfirmCard {...props} subtitle={t("Clients already on it keep their own copy.")} />
      );
    })()}
    <NewPlanSheet
      open={creating}
      onClose={() => setCreating(false)}
      onCreate={async (name, days) => {
        if (!authUserId) return t("Sign in again.");
        const r = await createTemplate(authUserId, name, days);
        if (!r.ok) return r.message;
        setCreating(false);
        onOpenPlan(r.id);
        return null;
      }}
    />
    </>
  );

  // Website viewport (WP-NU-MP.1, WP-NU Meal Plans Web v3; WP-LI.2, WP-LI Library Web v2): its own page from 1024px.
  // The header carries the search, Filter and New meal plan (no floating button); then the tabs; Nutrition's three
  // boxes 3 across (80 high, 64 on the rail); Templates | Assigned as two columns of 72 row cards; Full coaching's
  // Food journals, Recipes and Targets as three outlined 44 buttons.
  if (web) {
    const boxes = [
      ["journals", BookOpenCheck, overview.loading ? "–" : String(overview.waiting.length), t("Journals to review")],
      ["recipes", Salad, String(recipes.length), t("Recipes")],
      ["targets", Target, overview.loading ? "–" : tx("{n} set", "targets", { n: Object.values(overview.targets).filter(Boolean).length }), t("Targets")],
    ] as const;
    return (
      <div>
        <LibraryHeaderWeb
          title={nutrition ? t("Meal plans") : t("Library")}
          query={query}
          onQuery={setQuery}
          placeholder={t("Search meal plans and recipes")}
          filter={{ on: show !== "all" || !!filterAnchor, onClick: (el) => setFilterAnchor(filterAnchor ? null : el) }}
          action={{ label: t("New meal plan"), icon: Plus, onClick: () => setCreating(true) }}
        />
        <ProPageBodyWeb>
          {webTabs}
          {nutrition && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 24, marginBottom: 24 }}>
              {boxes.map(([area, Icon, value, label], i) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => onArea(area)}
                  aria-label={t("{label}, {value}", { label, value })}
                  className="flex min-w-0 items-center text-start hover:shadow-[inset_0_0_0_1px_#AEA1DC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
                  style={{ height: webRail ? 64 : 80, boxSizing: "border-box", gap: 16, padding: "0 20px", borderRadius: 16, background: i === 0 ? "#F0EDF9" : "#F5F5F6" }}
                >
                  <Icon size={24} strokeWidth={1.75} aria-hidden style={{ color: i === 0 ? "#5F5093" : "#5B5349", flexShrink: 0 }} />
                  <span style={{ fontSize: 28, lineHeight: "36px", fontWeight: 800, color: "#241F1B", whiteSpace: "nowrap" }}>{value}</span>
                  <span className="truncate" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5B5349" }}>{label}</span>
                </button>
              ))}
            </div>
          )}
          {templates.error && templates.offline && <OfflineLine />}
          {templates.error && !templates.offline && (
            <div style={{ marginBottom: 16 }}>
              <ProError onRetry={() => setNonce((n) => n + 1)} />
            </div>
          )}
          {loading ? (
            <ListSkeleton rows={3} />
          ) : none ? (
            <section className="flex flex-col items-center justify-center text-center" style={{ minHeight: `max(360px, calc(100dvh - ${64 + (webRail ? 48 : 64) + 56 + (nutrition ? (webRail ? 64 : 80) + 24 : 0)}px))`, boxSizing: "border-box", borderRadius: 24, background: "#FAFAFB", border: "1px solid rgba(36,31,27,0.08)", padding: 40 }}>
              <span className="flex items-center justify-center" style={{ width: 112, height: 112, borderRadius: 32, background: "#F0EDF9" }}>
                <UtensilsCrossed size={52} strokeWidth={1.5} aria-hidden style={{ color: "#7D6BB5" }} />
              </span>
              <p style={{ margin: "24px 0 0", fontSize: 28, lineHeight: "36px", fontWeight: 700, color: "#241F1B" }}>{t("No meal plans yet")}</p>
              <p style={{ margin: "8px 0 0", maxWidth: 440, fontSize: 15, lineHeight: "24px", fontWeight: 500, color: "#71685E" }}>{t("Build a template once, then give each client their own copy.")}</p>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex items-center justify-center hover:bg-[#8E7FD0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
                style={{ marginTop: 28, width: "100%", maxWidth: 360, height: 44, borderRadius: 16, background: "#9A8CD6", color: "#241F1B", gap: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
              >
                <Plus size={20} strokeWidth={2} aria-hidden />
                {t("New meal plan")}
              </button>
            </section>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: show === "all" ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)", gap: 24, alignItems: "start" }}>
              {show !== "assigned" && (
                <section aria-label={t("Templates")} className="min-w-0">
                  <LibSectionHeadWeb label={t("Templates")} right={!term && tList.length > TEMPLATES_SHOWN ? (seeAll ? t("Show less") : t("See all")) : undefined} onRight={() => setSeeAll((v) => !v)} />
                  {shownTemplates.length === 0 ? (
                    <p style={{ fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{term ? t("No templates match.") : t("No templates yet.")}</p>
                  ) : (
                    <div className="flex flex-col" style={{ gap: 12 }}>
                      {shownTemplates.map((p, i) => {
                        const col = PLAN_COLOURS[i % PLAN_COLOURS.length];
                        const n = countFor(p.id);
                        const totals = p.days.map((d) => sumMacros(d.items.map((it) => itemMacros(it, src))).kcal);
                        const chips = (
                          <span className="flex flex-wrap" style={{ gap: 5, marginTop: webRail ? 8 : 0, flexShrink: 0 }}>
                            {n > 0 && <ChipWeb label={tn(n, "{n} client", "{n} clients")} tone="pr" />}
                            <ChipWeb label={t("Template")} tone="pau" />
                          </span>
                        );
                        return (
                          <div key={p.id} className="flex items-center hover:bg-[#FAFAFB]" style={{ minHeight: 72, boxSizing: "border-box", gap: 16, borderRadius: 20, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", padding: "9px 8px 9px 20px" }}>
                            <button type="button" onClick={() => onOpenPlan(p.id)} className="flex min-w-0 flex-1 items-center text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]" style={{ gap: 16 }}>
                              <span className="flex shrink-0 items-center justify-center" style={{ width: 52, height: 52, borderRadius: 16, background: `${col}29` }}>
                                <UtensilsCrossed size={24} strokeWidth={1.75} aria-hidden style={{ color: col }} />
                              </span>
                              <span className="flex min-w-0 flex-1 flex-col">
                                <span style={{ fontSize: 17, lineHeight: "24px", fontWeight: 600, letterSpacing: "-0.01em", color: "#241F1B", overflowWrap: "anywhere" }}>{p.name}</span>
                                <span style={{ marginTop: 2, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{templateLine(p.daysCount, totals, p.kcalTarget)}</span>
                                {webRail && chips}
                              </span>
                              {!webRail && chips}
                            </button>
                            <button type="button" aria-label={t("{name} options", { name: p.name })} onClick={(e) => setMenu({ plan: p, anchor: e.currentTarget })} className="flex shrink-0 items-center justify-center hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]" style={{ width: 40, height: 40, borderRadius: 999 }}>
                              <EllipsisVertical size={18} strokeWidth={2} aria-hidden style={{ color: "#71685E" }} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
              {show !== "templates" && (
                <section aria-label={t("Assigned")} className="min-w-0">
                  <LibSectionHeadWeb label={t("Assigned")} />
                  {aList.length === 0 ? (
                    <p style={{ fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{term ? t("No assigned plans match.") : t("No meal plans assigned yet.")}</p>
                  ) : (
                    <div className="flex flex-col" style={{ gap: 12 }}>
                      {aList.map((a) => {
                        const wk = weekOfPlan(a.startsOn, today);
                        const pct = rings[a.clientId];
                        const line = [wk ? t("Week {n}", { n: wk }) : t("Starts {date}", { date: new Date(`${a.startsOn}T00:00:00`).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" }) }), pct != null ? t("{pct}% on plan", { pct }) : null].filter(Boolean).join(" · ");
                        return (
                          <button key={a.id} type="button" onClick={() => onOpenPlan(a.planId)} className="flex items-center text-start hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]" style={{ minHeight: 72, boxSizing: "border-box", gap: 16, borderRadius: 20, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", padding: "10px 20px" }}>
                            <span className="flex shrink-0 items-center justify-center" style={{ width: 44, height: 44, borderRadius: 11, background: "#F0EDF9" }}>
                              <UserRound size={20} strokeWidth={1.75} aria-hidden style={{ color: "#7D6BB5" }} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#241F1B", overflowWrap: "anywhere" }}>{`${nameOf(a.clientId)} · ${a.name}`}</span>
                              <span className="block" style={{ marginTop: 2, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{line}</span>
                            </span>
                            <StatusRing value={pct ?? null} lane={lane} scale={48 / 56} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
          {!nutrition && !none && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 16 }}>
              {(
                [
                  ["journals", BookOpenCheck, t("Food journals")],
                  ["recipes", Salad, t("Recipes")],
                  ["targets", Target, t("Targets")],
                ] as const
              ).map(([area, Icon, label]) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => onArea(area)}
                  className="flex items-center justify-center whitespace-nowrap hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
                  style={{ height: 44, boxSizing: "border-box", padding: "0 16px", gap: 8, borderRadius: 14, border: "1.5px solid #AEA1DC", color: "#5F5093", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
                >
                  <Icon size={20} strokeWidth={2} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          )}
          {msg && (
            <p role="status" style={{ marginTop: 12, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5B5349" }}>
              {msg}
            </p>
          )}
        </ProPageBodyWeb>
        {overlays}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 72 }}>
      {nutrition && !web && <h1 style={{ marginBottom: 13, fontSize: textPx(19), lineHeight: 1.5, fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch }}>{t("Meal plans")}</h1>}
      {nutrition && (
        <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
          {(
            [
              ["journals", BookOpenCheck, overview.loading ? "–" : String(overview.waiting.length), t("Journals to review")],
              ["recipes", Salad, String(recipes.length), t("Recipes")],
              ["targets", Target, overview.loading ? "–" : tx("{n} set", "targets", { n: Object.values(overview.targets).filter(Boolean).length }), t("Targets")],
            ] as const
          ).map(([area, Icon, value, label], i) => (
            <button
              key={area}
              type="button"
              onClick={() => onArea(area)}
              aria-label={t("{label}, {value}", { label, value })}
              className="tap flex-1 min-w-0 flex flex-col text-start"
              style={{ borderRadius: 16, background: i === 0 ? INK.prPale : INK.soft, padding: 10, gap: 6 }}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden style={{ color: i === 0 ? INK.prDeep : INK.chS, ...NO_ICON_SCALE }} />
              <span style={{ fontSize: textPx(18), fontWeight: 800, color: INK.ch, lineHeight: 1 }}>{value}</span>
              <span style={{ fontSize: textPx(10.5), fontWeight: 600, color: INK.chS }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
        <SearchField value={query} onChange={setQuery} placeholder={t("Search meal plans and recipes")} />
        <SquareButton icon={SlidersHorizontal} label={t("Filter")} on={show !== "all" || !!filterAnchor} expanded={!!filterAnchor} onClick={(el) => setFilterAnchor(filterAnchor ? null : el)} />
      </div>
      {templates.error && templates.offline && <OfflineLine />}
      {templates.error && !templates.offline && (
        <div style={{ marginBottom: 12 }}>
          <ProError onRetry={() => setNonce((n) => n + 1)} />
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={3} />
      ) : none ? (
        <EmptyState icon={UtensilsCrossed} title={t("No meal plans yet")} line={t("Build a template once, then give each client their own copy.")}>
          <CtaButton size="page" label={t("New meal plan")} onClick={() => setCreating(true)} />
        </EmptyState>
      ) : (
        <>
          {show !== "assigned" && (
            <section aria-label={t("Templates")}>
              <SectionHead label={t("Templates")} right={!term && tList.length > TEMPLATES_SHOWN ? (seeAll ? t("Show less") : t("See all")) : undefined} onRight={() => setSeeAll((v) => !v)} />
              {shownTemplates.length === 0 ? (
                <p style={{ fontSize: textPx(12.5), color: INK.chF, padding: "4px 0 12px" }}>{term ? t("No templates match.") : t("No templates yet.")}</p>
              ) : (
                shownTemplates.map((p, i) => {
                  const col = PLAN_COLOURS[i % PLAN_COLOURS.length];
                  const n = countFor(p.id);
                  const totals = p.days.map((d) => sumMacros(d.items.map((it) => itemMacros(it, src))).kcal);
                  return (
                    <div key={p.id} className="flex items-start" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 16, marginBottom: 10, gap: 14 }}>
                      <button type="button" onClick={() => onOpenPlan(p.id)} className="tap flex-1 min-w-0 flex items-start text-start" style={{ gap: 14 }}>
                        <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 13, background: `${col}29` }}>
                          <UtensilsCrossed size={19} strokeWidth={1.75} aria-hidden style={{ color: col, ...NO_ICON_SCALE }} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block" style={{ fontSize: textPx(16), fontWeight: 800, lineHeight: 1.3, letterSpacing: "-0.01em", color: INK.ch, overflowWrap: "anywhere" }}>{p.name}</span>
                          <span className="block" style={{ fontSize: textPx(13), lineHeight: 1.45, color: INK.chS, marginTop: 2 }}>{templateLine(p.daysCount, totals, p.kcalTarget)}</span>
                          <span className="flex flex-wrap" style={{ gap: 5, marginTop: 8 }}>
                            {n > 0 && <Chip11 label={tn(n, "{n} client", "{n} clients")} tone="pr" />}
                            <Chip11 label={t("Template")} tone="pau" />
                          </span>
                        </span>
                      </button>
                      <button type="button" aria-label={t("{name} options", { name: p.name })} onClick={(e) => setMenu({ plan: p, anchor: e.currentTarget })} className="tap flex items-center justify-center shrink-0" style={{ width: 44, height: 44, marginBlock: "-12px 0", marginInline: "0 -14px" }}>
                        <EllipsisVertical size={18} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
                      </button>
                    </div>
                  );
                })
              )}
            </section>
          )}

          {show !== "templates" && (
            <section aria-label={t("Assigned")} style={{ marginTop: 6 }}>
              <SectionHead label={t("Assigned")} />
              {aList.length === 0 ? (
                <p style={{ fontSize: textPx(12.5), color: INK.chF, padding: "4px 0 12px" }}>{term ? t("No assigned plans match.") : t("No meal plans assigned yet.")}</p>
              ) : (
                <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "4px 14px", marginBottom: 12 }}>
                  {aList.map((a, i) => {
                    const wk = weekOfPlan(a.startsOn, today);
                    const pct = rings[a.clientId];
                    const line = [wk ? t("Week {n}", { n: wk }) : t("Starts {date}", { date: new Date(`${a.startsOn}T00:00:00`).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" }) }), pct != null ? t("{pct}% on plan", { pct }) : null].filter(Boolean).join(" · ");
                    return (
                      <button key={a.id} type="button" onClick={() => onOpenPlan(a.planId)} className="tap w-full flex items-center text-start" style={{ gap: 12, padding: "11px 0", borderBottom: i < aList.length - 1 ? `1px solid ${INK.b06}` : "none" }}>
                        <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 11, background: dark ? "rgba(174,161,220,0.14)" : "#F0EDF9" }}>
                          <UserRound size={16} strokeWidth={1.75} aria-hidden style={{ color: INK.prAccent }} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block" style={{ fontSize: textPx(15), fontWeight: 700, lineHeight: 1.35, color: INK.ch, overflowWrap: "anywhere" }}>{`${nameOf(a.clientId)} · ${a.name}`}</span>
                          <span className="block" style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.45, marginTop: 2 }}>{line}</span>
                        </span>
                        <StatusRing value={pct ?? null} lane={lane} />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {rMatches.length > 0 && (
            <section aria-label={t("Recipes")} style={{ marginTop: 6 }}>
              <SectionHead label={t("Recipes")} right={t("See all")} onRight={() => onArea("recipes")} />
              <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "4px 14px", marginBottom: 12 }}>
                {rMatches.slice(0, 5).map((r, i) => (
                  <button key={r.id} type="button" onClick={() => onArea("recipes")} className="tap w-full flex items-center text-start" style={{ gap: 12, padding: "11px 0", minHeight: 44, borderBottom: i < Math.min(5, rMatches.length) - 1 ? `1px solid ${INK.b06}` : "none" }}>
                    <span className="flex-1 min-w-0" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>{r.title}</span>
                    <ChevronRight size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
                  </button>
                ))}
              </div>
            </section>
          )}
          {!nutrition && (
            <div className="flex flex-wrap" style={{ gap: 8, marginTop: 6 }}>
              <CtaButton size="base" variant="outline" icon={<BookOpenCheck size={15} />} label={t("Food journals")} onClick={() => onArea("journals")} />
              <CtaButton size="base" variant="outline" icon={<Salad size={15} />} label={t("Recipes")} onClick={() => onArea("recipes")} />
              <CtaButton size="base" variant="outline" icon={<Target size={15} />} label={t("Targets")} onClick={() => onArea("targets")} />
            </div>
          )}
        </>
      )}
      {msg && (
        <p role="status" style={{ marginTop: 10, fontSize: textPx(12), fontWeight: 600, color: INK.chS }}>
          {msg}
        </p>
      )}

      <NuFab label={t("New meal plan")} onClick={() => setCreating(true)} />

      {overlays}
    </div>
  );
};

const Chip11: React.FC<{ label: string; tone: "pr" | "pau" }> = ({ label, tone }) => (
  <span className="whitespace-nowrap" style={{ fontSize: textPx(11.5), fontWeight: 700, padding: "2px 8px", borderRadius: 9999, background: tone === "pr" ? INK.prPale : INK.soft, color: tone === "pr" ? INK.prDeep : INK.chF }}>
    {label}
  </span>
);

/** The web row chips: 13/20 700, padding 2 8. */
const ChipWeb: React.FC<{ label: string; tone: "pr" | "pau" }> = ({ label, tone }) => (
  <span className="whitespace-nowrap" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, padding: "2px 8px", borderRadius: 9999, background: tone === "pr" ? "#F0EDF9" : "#F5F5F6", color: tone === "pr" ? "#5F5093" : "#71685E" }}>
    {label}
  </span>
);

const DAY_CHOICES = [7, 14, 28];

export const NewPlanSheet: React.FC<{ open: boolean; onClose: () => void; onCreate: (name: string, days: number) => Promise<string | null> }> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setName("");
      setDays(7);
      setErr(null);
    }
  }, [open]);
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("New meal plan")}
      footer={
        <CtaButton
          className="w-full"
          size="sheet"
          label={t("Create")}
          loading={busy}
          disabled={!name.trim()}
          onClick={async () => {
            setBusy(true);
            const e = await onCreate(name, days);
            setBusy(false);
            if (e) setErr(e);
          }}
        />
      }
    >
      <label className="block" style={{ marginBottom: 14 }}>
        <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
          {t("Name")}
        </span>
        <input
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          className="w-full outline-none"
          style={{ height: 44, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", fontSize: textPx(14), color: INK.ch }}
        />
      </label>
      <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>{t("Length")}</p>
      <div className="flex" style={{ gap: 8 }}>
        {DAY_CHOICES.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={days === d}
            onClick={() => setDays(d)}
            className="tap flex-1"
            style={{ minHeight: 44, borderRadius: 12, fontSize: textPx(13), fontWeight: days === d ? 700 : 500, background: days === d ? INK.fill : INK.soft, color: days === d ? INK.onFill : INK.ch }}
          >
            {tn(d, "{n} day", "{n} days")}
          </button>
        ))}
      </div>
      {err && (
        <p role="alert" style={{ marginTop: 10, fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
          {err}
        </p>
      )}
    </BottomSheet>
  );
};

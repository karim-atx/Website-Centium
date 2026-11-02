import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChefHat, CircleAlert, CookingPot, EllipsisVertical, MoreHorizontal, Plus, UserPlus, UtensilsCrossed } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useClientAccess } from "../../../hooks/useClientAccess";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { CentredPopup } from "../../ui/CentredPopup";
import { ConfirmCard } from "../../ui/ConfirmCard";
import { CtaButton } from "../../ui/PinnedCta";
import { PopupMenu } from "../../ui/PopupMenu";
import { MacroSplitEditor } from "../../food/MacroSplitEditor";
import { PlaylistField, playlistFieldValid } from "../../music/PlaylistField";
import { PlaylistCard } from "../../music/PlaylistCard";
import { INK, NO_ICON_SCALE } from "../proInk";
import { RoundBtn } from "../client/kit";
import { EmptyState } from "../EmptyState";
import { OfflineLine, ProCardSkeleton, ProError } from "../states";
import { todayLocal } from "../../../utils/date";
import {
  addItem,
  deleteItem,
  deleteTemplate,
  endAssignment,
  fetchAssignmentForPlan,
  fetchConflicts,
  fetchPlan,
  replaceItem,
  templateDayId,
  updatePlanMeta,
  type Assignment,
  type ItemDraft,
  type MealPlan,
  type PlanItem,
} from "../../../services/pro/nutrition";
import type { ProLane } from "../subtypeLanes";
import { AddItemSheet, BlockedActions, ConflictTile, type AddContext } from "./AddItemSheet";
import { DietStrip, Flag, NuHead } from "./kit";
import { MACRO_COLOUR, conflictBody, conflictTitle } from "./nuFormat";
import { useDietaryNeeds, useNuRoster, useTileBg } from "./hooks";
import { itemLine, itemMacros } from "./itemFacts";
import { SLOT_LABEL, SLOT_ORDER, dayLabels, dayTotalView, planDayFor, sumMacros, worstConflict, type ConflictRow, type MealSlot } from "./nutritionModel";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";

/**
 * Release 3 · NU2 v3 "Meal-plan builder · visual day total" (source gen
 * r6c.js nuBuilder6, r7.js nuBuilder7, r13.js dayTotal13), with NU11 "Allergy
 * blocked" and NU12 "Restriction, confirm" (r7.js nuConflict7) on a flagged
 * item, and NU3 / NU4 for adding (AddItemSheet).
 *
 * One builder for a template (no client: no flags, days "Day n") and for a
 * client's copy (assign_meal_plan made it; the copy is the professional's own
 * meal_plans row, so its items can be swapped here: per-client swaps). Day
 * by meal: Breakfast, Lunch, Snacks, Dinner, each "+ Add food". The day
 * total (HANDOVER i "Day total ring"): kcal ÷ the plan's target on a 112
 * ring (r 46, stroke 10), protein, carbs and fat bars beneath against the
 * plan's split; a macro is over above 103%.
 *
 * meal_plan_assignments.swaps is not written: only the client can update
 * that row (backend gap, reported). Swaps change the client's copy itself.
 */
export const PlanBuilder: React.FC<{ planId: string; lane: ProLane; onBack: () => void; onAssign: (plan: MealPlan) => void; onDeleted: () => void }> = ({ planId, lane, onBack, onAssign, onDeleted }) => {
  const { recipes, customMeals } = useApp();
  const dark = useIsDark();
  const tile = useTileBg();
  const today = todayLocal();
  const [state, setState] = useState<{ plan: MealPlan | null; error: boolean; offline: boolean } | null>(null);
  const [assignment, setAssignment] = useState<(Assignment & { endedAt: string | null }) | null>(null);
  const [nonce, setNonce] = useState(0);
  const [day, setDay] = useState<number | null>(null);
  const [adding, setAdding] = useState<{ slot: MealSlot; swap: PlanItem | null } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [itemMenu, setItemMenu] = useState<{ item: PlanItem; anchor: HTMLElement } | null>(null);
  const [flagged, setFlagged] = useState<{ item: PlanItem; row: ConflictRow } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "end" | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Record<string, ConflictRow[] | null>>({});
  const asked = useRef(new Set<string>());
  const moreRef = useRef<HTMLButtonElement | null>(null);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    let live = true;
    void fetchPlan(planId).then((r) => {
      if (!live) return;
      setState((prev) => (r.ok ? { plan: r.data, error: false, offline: false } : { plan: prev?.plan ?? null, error: true, offline: r.offline }));
    });
    return () => {
      live = false;
    };
  }, [planId, nonce]);

  const plan = state?.plan ?? null;
  const clientId = plan?.clientId ?? null;
  useEffect(() => {
    if (!clientId) return;
    let live = true;
    void fetchAssignmentForPlan(planId).then((r) => live && r.ok && setAssignment(r.data));
    return () => {
      live = false;
    };
  }, [planId, clientId]);

  const { clients } = useNuRoster(lane);
  const client = clients?.find((c) => c.clientId === clientId) ?? null;
  const access = useClientAccess(clientId);
  const diet = useDietaryNeeds(clientId, clientId ? access : null);
  const startsOn = clientId ? assignment?.startsOn ?? null : null;

  const days = plan?.days ?? [];
  const current = day ?? (startsOn && plan ? planDayFor(startsOn, plan.daysCount, today) ?? 1 : 1);
  const theDay = days.find((d) => d.dayIndex === current) ?? null;
  const src = useMemo(() => ({ recipes, customMeals }), [recipes, customMeals]);

  // food_conflicts for the day's items (a client's copy only).
  useEffect(() => {
    if (!clientId || !theDay) return;
    const todo = theDay.items.filter((i) => i.kind && i.refId && !asked.current.has(`${i.kind}:${i.refId}`));
    if (!todo.length) return;
    todo.forEach((i) => asked.current.add(`${i.kind}:${i.refId}`));
    let live = true;
    void Promise.all(todo.map(async (i) => [`${i.kind}:${i.refId}`, await fetchConflicts(clientId, { kind: i.kind!, refId: i.refId! }, i.name)] as const)).then(
      (pairs) => live && setConflicts((p) => ({ ...p, ...Object.fromEntries(pairs) }))
    );
    return () => {
      live = false;
    };
  }, [clientId, theDay]);

  if (!state) {
    return (
      <div className="flex flex-col" style={{ gap: 12 }}>
        <ProCardSkeleton lines={1} height={60} />
        <ProCardSkeleton lines={4} height={160} />
        <ProCardSkeleton lines={3} height={120} />
      </div>
    );
  }
  if (!plan) {
    return (
      <div>
        <NuHead title={t("Meal plan")} onBack={onBack} />
        {state.error ? <ProError onRetry={reload} /> : <EmptyState icon={UtensilsCrossed} title={t("This meal plan isn't available")} line={t("It may have been deleted.")} />}
      </div>
    );
  }

  const isCopy = !!plan.clientId;
  const firstName = client?.firstName ?? "";
  const clientName = client?.name ?? "";
  const labels = (i: number) => dayLabels(i, startsOn);
  const flagOf = (i: PlanItem) => (clientId && i.kind ? worstConflict(conflicts[`${i.kind}:${i.refId}`] ?? []) : null);
  const items = theDay?.items ?? [];
  const total = sumMacros(items.map((i) => itemMacros(i, src)));
  const view = dayTotalView(total, plan);

  const addCtx: AddContext | null =
    adding && theDay
      ? {
          clientId,
          clientName: isCopy ? clientName : null,
          firstName: isCopy ? firstName : null,
          planName: plan.name,
          dayShort: labels(theDay.dayIndex).short,
          slot: adding.slot,
          templateId: isCopy ? plan.sourcePlanId : null,
          swapItemName: adding.swap?.name ?? null,
        }
      : null;

  const submitItem = async (draft: ItemDraft, alsoTemplate: boolean): Promise<string | null> => {
    if (!theDay) return t("Pick a day first.");
    const r = adding?.swap ? await replaceItem(adding.swap.id, draft) : await addItem(theDay.id, draft);
    if (!r.ok) return r.message;
    if (alsoTemplate && plan.sourcePlanId) {
      const tDay = await templateDayId(plan.sourcePlanId, theDay.dayIndex);
      const tr = tDay ? await addItem(tDay, draft) : { ok: false as const, message: t("The template has no matching day.") };
      if (!tr.ok) setMsg(t("Added to {name}'s plan. The template couldn't be updated: {message}", { name: firstName, message: tr.message }));
    }
    reload();
    return null;
  };

  const removeItem = async (item: PlanItem) => {
    setBusy(true);
    const r = await deleteItem(item.id);
    setBusy(false);
    if (!r.ok) setMsg(r.message);
    reload();
  };

  const menuOptions = [
    { value: "rename", label: t("Rename") },
    { value: "targets", label: t("Plan targets") },
    // Round E: the plan's cook-along playlist.
    { value: "playlist", label: plan.playlistUrl ? t("Playlist") : t("Add a playlist") },
    ...(isCopy ? [] : [{ value: "assign", label: t("Assign to clients") }]),
    isCopy ? { value: "end", label: firstName ? t("End {name}'s plan", { name: firstName }) : t("End this plan"), destructive: true } : { value: "delete", label: t("Delete template"), destructive: true },
  ];

  return (
    <div>
      <NuHead
        title={plan.name}
        eyebrow={isCopy ? t("{name}'s copy", { name: clientName }) : t("Template")}
        onBack={onBack}
        right={
          <div className="flex shrink-0" style={{ gap: 8 }}>
            {!isCopy && <RoundBtn icon={UserPlus} label={t("Assign")} onClick={() => onAssign(plan)} />}
            <RoundBtn ref={moreRef} icon={MoreHorizontal} label={t("More")} expanded={!!menuAnchor} onClick={() => moreRef.current && setMenuAnchor(moreRef.current)} />
          </div>
        }
      />
      {state.error && state.offline && <OfflineLine />}
      {state.error && !state.offline && (
        <div style={{ marginBottom: 12 }}>
          <ProError onRetry={reload} />
        </div>
      )}
      {isCopy && <DietStrip name={clientName} {...diet} />}
      {isCopy && assignment?.endedAt && (
        <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 10 }}>{t("This plan has ended. Changes won't reach the client.")}</p>
      )}

      {/* Day tabs (r6b tabsScroll6, h 34) */}
      <div role="tablist" aria-label={t("Day")} className="flex items-center overflow-x-auto no-scrollbar" style={{ background: "rgb(var(--c-seg-track))", borderRadius: 16, padding: 6, gap: 5, marginBottom: 12 }}>
        {days.map((d) => {
          const on = d.dayIndex === current;
          return (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setDay(d.dayIndex)}
              className="tap relative flex items-center whitespace-nowrap before:absolute before:inset-x-0 before:-inset-y-[5px] before:content-['']"
              style={{ flex: "1 0 auto", minHeight: 34, minWidth: 44, padding: "0 12px", borderRadius: 12, justifyContent: "center", fontSize: textPx(12.5), fontWeight: 700, background: on ? "rgb(var(--c-seg-active))" : "var(--c-pro-tab-idle)", color: on ? "rgb(var(--c-on-primary-fill))" : "var(--c-pro-tab-idle-ink)" }}
            >
              {labels(d.dayIndex).tab}
            </button>
          );
        })}
      </div>

      {/* Day total (r13 dayTotal13) */}
      {theDay && <DayTotal heading={labels(theDay.dayIndex).total} view={view} empty={items.length === 0} showOver={lane === "nutrition"} dark={dark} />}

      {theDay &&
        SLOT_ORDER.map((slot) => {
          const list = items.filter((i) => i.slot === slot);
          const kcal = Math.round(sumMacros(list.map((i) => itemMacros(i, src))).kcal);
          return (
            <section key={slot} style={{ marginBottom: 10 }} aria-label={t(SLOT_LABEL[slot])}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6, gap: 8 }}>
                <h2 style={{ fontSize: textPx(13), fontWeight: 800, color: INK.ch, whiteSpace: "nowrap" }}>
                  {t(SLOT_LABEL[slot])} <span style={{ fontWeight: 600, fontSize: textPx(11.5), color: INK.chF }}>{t("{n} kcal", { n: kcal.toLocaleString(appLocale("en-GB")) })}</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setAdding({ slot, swap: null })}
                  aria-label={t("Add food to {meal}", { meal: t(SLOT_LABEL[slot]) })}
                  className="tap flex items-center relative before:absolute before:-inset-3 before:content-['']"
                  style={{ gap: 3, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}
                >
                  <Plus size={12} strokeWidth={2.4} aria-hidden style={NO_ICON_SCALE} />
                  {t("Add food")}
                </button>
              </div>
              {list.length > 0 && (
                <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 16, padding: "2px 12px" }}>
                  {list.map((it, i) => {
                    const m = itemMacros(it, src);
                    const f = flagOf(it);
                    const Icon = it.kind === "recipe" ? ChefHat : it.kind === "custom_meal" ? CookingPot : UtensilsCrossed;
                    return (
                      <div key={it.id} className="flex items-center" style={{ gap: 10, padding: "9px 0", borderTop: i ? `1px solid ${INK.b06}` : "none" }}>
                        <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: 10, background: tile }}>
                          <Icon size={14} strokeWidth={1.9} aria-hidden style={{ color: INK.prAccent }} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>
                            {it.name}
                            <Flag row={f} onClick={f && f.kind !== "preference" ? () => setFlagged({ item: it, row: f }) : undefined} />
                          </span>
                          <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>{itemLine(it, m)}</span>
                        </span>
                        <button
                          type="button"
                          aria-label={t("{name} options", { name: it.name })}
                          onClick={(e) => setItemMenu({ item: it, anchor: e.currentTarget })}
                          className="tap flex items-center justify-center shrink-0"
                          style={{ width: 44, height: 44, marginInlineEnd: -12 }}
                        >
                          <EllipsisVertical size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

      {msg && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 8 }}>
          {msg}
        </p>
      )}

      <PopupMenu
        open={!!menuAnchor}
        anchor={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        options={menuOptions}
        align="right"
        width={200}
        onSelect={(v) => {
          setMenuAnchor(null);
          if (v === "rename") setRenaming(true);
          else if (v === "targets") setTargetsOpen(true);
          else if (v === "playlist") setPlaylistOpen(true);
          else if (v === "assign") onAssign(plan);
          else if (v === "delete") setConfirm("delete");
          else if (v === "end") setConfirm("end");
        }}
      />
      <PopupMenu
        open={!!itemMenu}
        anchor={itemMenu?.anchor ?? null}
        onClose={() => setItemMenu(null)}
        options={[
          { value: "swap", label: t("Swap") },
          { value: "remove", label: t("Remove"), destructive: true },
        ]}
        align="right"
        width={160}
        onSelect={(v) => {
          const it = itemMenu?.item;
          setItemMenu(null);
          if (!it) return;
          if (v === "swap") setAdding({ slot: it.slot, swap: it });
          else void removeItem(it);
        }}
      />

      {addCtx && (
        <AddItemSheet open={!!adding} onClose={() => setAdding(null)} ctx={addCtx} needs={isCopy ? diet : null} onSubmit={submitItem} />
      )}

      {/* NU11 / NU12 on an item already in the copy */}
      <CentredPopup
        open={!!flagged}
        onClose={() => setFlagged(null)}
        iconBare
        icon={<ConflictTile red={flagged?.row.kind === "allergy_confirmed"} />}
        title={flagged ? conflictTitle(flagged.item.name, flagged.row) : ""}
        body={flagged ? conflictBody(firstName, flagged.row) : undefined}
      >
        {flagged?.row.kind === "allergy_confirmed" ? (
          <BlockedActions
            first={firstName}
            onSwap={() => {
              const it = flagged.item;
              setFlagged(null);
              setAdding({ slot: it.slot, swap: it });
            }}
            onKeepOut={() => {
              const it = flagged.item;
              setFlagged(null);
              void removeItem(it);
            }}
          />
        ) : (
          <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
            <CtaButton
              size="page"
              label={t("Choose a swap")}
              onClick={() => {
                const it = flagged!.item;
                setFlagged(null);
                setAdding({ slot: it.slot, swap: it });
              }}
            />
            <CtaButton size="page" variant="secondary" label={t("Keep it")} onClick={() => setFlagged(null)} />
          </div>
        )}
      </CentredPopup>

      <RenameSheet open={renaming} name={plan.name} onClose={() => setRenaming(false)} onSave={async (name) => {
        const r = await updatePlanMeta(plan.id, { name });
        if (r.ok) reload();
        return r.ok ? null : r.message;
      }} />
      <PlanTargetsSheet open={targetsOpen} plan={plan} onClose={() => setTargetsOpen(false)} onSaved={reload} />
      <PlanPlaylistSheet
        open={playlistOpen}
        url={plan.playlistUrl}
        isCopy={isCopy}
        onClose={() => setPlaylistOpen(false)}
        onSave={async (url) => {
          const r = await updatePlanMeta(plan.id, { playlistUrl: url });
          if (r.ok) reload();
          return r.ok ? null : r.message;
        }}
      />

      <ConfirmCard
        open={confirm === "delete"}
        title={t("Delete {name}?", { name: plan.name })}
        subtitle={t("Clients already on it keep their own copy.")}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          setBusy(true);
          const r = await deleteTemplate(plan.id);
          setBusy(false);
          setConfirm(null);
          if (r.ok) onDeleted();
          else setMsg(r.message);
        }}
      />
      <ConfirmCard
        open={confirm === "end"}
        title={t("End {name}'s plan?", { name: firstName })}
        subtitle={t("It stops today. Nothing is deleted.")}
        confirmLabel={t("End plan")}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!assignment) return setConfirm(null);
          setBusy(true);
          const r = await endAssignment(assignment.id);
          setBusy(false);
          setConfirm(null);
          if (r.ok) onDeleted();
          else setMsg(r.message);
        }}
      />
    </div>
  );
};

/** r13 dayTotal13. */
const DayTotal: React.FC<{ heading: string; view: ReturnType<typeof dayTotalView>; empty: boolean; showOver: boolean; dark: boolean }> = ({ heading, view, empty, showOver, dark }) => {
  const R = 46;
  const C = 2 * Math.PI * R;
  const f = view.fraction ?? 0;
  const over = view.macros.filter((m) => m.over && m.target !== null);
  return (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 14, marginBottom: 12 }}>
      <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 8 }}>{heading}</p>
      <div className="flex items-center flex-wrap" style={{ gap: 14 }}>
        <div className="relative shrink-0" style={{ width: 112, height: 112 }}>
          <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden>
            <circle cx="56" cy="56" r={R} fill="none" stroke={dark ? "rgba(245,243,250,0.10)" : "rgba(36,31,27,0.07)"} strokeWidth="10" />
            {f > 0 && <circle cx="56" cy="56" r={R} fill="none" stroke={dark ? "#C3B3FB" : "#7D6BB5"} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(C * f).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 56 56)" />}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center" role="img" aria-label={view.target ? t("{n} of {target} kcal", { n: view.kcal, target: view.target }) : t("{n} kcal", { n: view.kcal })}>
            <span style={{ fontSize: textPx(22), fontWeight: 800, letterSpacing: "-0.02em", color: INK.ch, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{view.kcal.toLocaleString(appLocale("en-GB"))}</span>
            <span style={{ fontSize: textPx(10.5), color: INK.chF, marginTop: 3 }}>{view.target ? t("of {n} kcal", { n: Math.round(view.target).toLocaleString(appLocale("en-GB")) }) : empty ? t("Nothing planned yet") : t("No target set")}</span>
            {view.left !== null && (
              <span style={{ fontSize: textPx(10.5), fontWeight: 700, color: view.left >= 0 ? INK.good : INK.hi }}>{view.left >= 0 ? t("{n} left", { n: view.left.toLocaleString(appLocale("en-GB")) }) : t("{n} over", { n: Math.abs(view.left).toLocaleString(appLocale("en-GB")) })}</span>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col" style={{ minWidth: 150, gap: 10 }}>
          {view.macros.map((m) => (
            <div key={m.key}>
              <div className="flex justify-between items-baseline" style={{ gap: 6 }}>
                <span className="flex items-center" style={{ gap: 6, fontSize: textPx(12), fontWeight: 700, color: INK.ch }}>
                  <span aria-hidden style={{ width: 8, height: 8, borderRadius: 3, background: MACRO_COLOUR[m.key] }} />
                  {m.label}
                </span>
                <span style={{ fontSize: textPx(12), fontVariantNumeric: "tabular-nums", color: m.over ? INK.hi : INK.chS, whiteSpace: "nowrap" }}>
                  <b style={{ color: m.over ? INK.hi : INK.ch }}>{m.value}</b>
                  {m.target !== null ? ` / ${t("{n} g", { n: m.target })}` : ` ${t("g")}`}
                </span>
              </div>
              <span className="block relative overflow-hidden" style={{ height: 7, borderRadius: 9999, background: INK.soft, marginTop: 4 }}>
                <span className="block" style={{ width: `${((m.fraction ?? 0) * 100).toFixed(0)}%`, height: "100%", borderRadius: 9999, background: m.over ? INK.hi : MACRO_COLOUR[m.key] }} />
              </span>
            </div>
          ))}
        </div>
      </div>
      {showOver &&
        over.map((m) => (
          <p key={m.key} className="flex" style={{ gap: 6, fontSize: textPx(11.5), color: INK.hi, fontWeight: 600, marginTop: 10 }}>
            <CircleAlert size={13} strokeWidth={2} aria-hidden style={{ flexShrink: 0, marginTop: 2, ...NO_ICON_SCALE }} />
            {t("{macro} {n} g over.", { macro: m.label, n: m.value - (m.target ?? 0) })}
          </p>
        ))}
    </div>
  );
};

const RenameSheet: React.FC<{ open: boolean; name: string; onClose: () => void; onSave: (name: string) => Promise<string | null> }> = ({ open, name, onClose, onSave }) => {
  const [v, setV] = useState(name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setV(name);
      setErr(null);
    }
  }, [open, name]);
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("Rename")}
      footer={
        <CtaButton
          className="w-full"
          size="sheet"
          label={t("Save")}
          loading={busy}
          disabled={!v.trim()}
          onClick={async () => {
            setBusy(true);
            const e = await onSave(v);
            setBusy(false);
            if (e) setErr(e);
            else onClose();
          }}
        />
      }
    >
      <input
        value={v}
        maxLength={80}
        onChange={(e) => setV(e.target.value)}
        aria-label={t("Meal plan name")}
        className="w-full outline-none"
        style={{ height: 44, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", fontSize: textPx(14), color: INK.ch }}
      />
      {err && (
        <p role="alert" style={{ marginTop: 8, fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
          {err}
        </p>
      )}
    </BottomSheet>
  );
};

/**
 * Round E · the plan's playlist (meal_plans.playlist_url, Database
 * 20261224030000): the shared "Playlist (optional)" field and, once the link
 * is one the shared rule accepts, the card members will see. Clients see it
 * with the plan as "{your name}'s playlist"; a template's is copied to each
 * client's plan when it is assigned (later changes don't reach copies already
 * made). Designed here on RenameSheet's pattern; empty removes it.
 */
const PlanPlaylistSheet: React.FC<{ open: boolean; url: string | null; isCopy: boolean; onClose: () => void; onSave: (url: string | null) => Promise<string | null> }> = ({
  open,
  url,
  isCopy,
  onClose,
  onSave,
}) => {
  const [v, setV] = useState(url ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setV(url ?? "");
      setErr(null);
    }
  }, [open, url]);
  const ok = playlistFieldValid(v);
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("Playlist")}
      footer={
        <CtaButton
          className="w-full"
          size="sheet"
          label={!v && url ? t("Remove playlist") : t("Save")}
          loading={busy}
          disabled={!ok || v === (url ?? "")}
          onClick={async () => {
            setBusy(true);
            const e = await onSave(v || null);
            setBusy(false);
            if (e) setErr(e);
            else onClose();
          }}
        />
      }
    >
      <div className="flex flex-col" style={{ gap: 12 }}>
        <PlaylistField
          value={v}
          onChange={(x) => {
            setV(x);
            if (err) setErr(null);
          }}
          error={err}
          hint={isCopy ? t("Shown with this client's plan.") : t("Shown with the plan. Clients you assign it to get it with their copy.")}
          labelStyle={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS }}
          inputStyle={{ background: INK.soft, borderRadius: 12, fontSize: textPx(14), fontWeight: 400 }}
        />
        {v && ok && <PlaylistCard url={v} heading={t("Your playlist")} />}
      </div>
    </BottomSheet>
  );
};

/** The plan's own calorie target and split (meal_plans.kcal_target and *_pct), which the day total measures against. */
const PlanTargetsSheet: React.FC<{ open: boolean; plan: MealPlan; onClose: () => void; onSaved: () => void }> = ({ open, plan, onClose, onSaved }) => {
  const [kcal, setKcal] = useState("");
  const [split, setSplit] = useState({ proteinPct: 30, carbsPct: 45, fatPct: 25 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setKcal(plan.kcalTarget ? String(Math.round(plan.kcalTarget)) : "");
    if (plan.proteinPct != null && plan.carbsPct != null && plan.fatPct != null) setSplit({ proteinPct: plan.proteinPct, carbsPct: plan.carbsPct, fatPct: plan.fatPct });
    setErr(null);
  }, [open, plan]);
  const n = Number(kcal);
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("Plan targets")}
      footer={
        <CtaButton
          className="w-full"
          size="sheet"
          label={t("Save")}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            const r = await updatePlanMeta(plan.id, { kcalTarget: n > 0 ? n : null, proteinPct: split.proteinPct, carbsPct: split.carbsPct, fatPct: split.fatPct });
            setBusy(false);
            if (!r.ok) return setErr(r.message);
            onSaved();
            onClose();
          }}
        />
      }
    >
      <label className="block" style={{ marginBottom: 14 }}>
        <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
          {t("Daily calories")}
        </span>
        <span className="flex items-center" style={{ gap: 8 }}>
          <input
            value={kcal}
            inputMode="numeric"
            onChange={(e) => setKcal(e.target.value.replace(/\D/g, "").slice(0, 5))}
            aria-label={t("Daily calories")}
            className="outline-none"
            style={{ width: 128, height: 44, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", fontSize: textPx(18), fontWeight: 700, color: INK.ch }}
          />
          <span style={{ fontSize: textPx(14), color: INK.chF }}>{t("kcal / day")}</span>
        </span>
      </label>
      <MacroSplitEditor split={split} calories={n > 0 ? n : 0} onChange={setSplit} squares />
      {err && (
        <p role="alert" style={{ marginTop: 8, fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
          {err}
        </p>
      )}
    </BottomSheet>
  );
};

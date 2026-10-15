import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Apple, BookOpenCheck, ClipboardPlus, Dumbbell, Pencil, Plus, Target, UtensilsCrossed } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { CtaButton } from "../../ui/PinnedCta";
import { Toggle } from "../../ui/Toggle";
import { BottomSheet } from "../../ui/BottomSheet";
import { INK } from "../proInk";
import { LockLine } from "../LockLine";
import { mealPlansHref } from "../nutrition/nav";
import { itemMacros } from "../nutrition/itemFacts";
import { SLOT_ORDER } from "../nutrition/nutritionModel";
import { fetchPlan } from "../../../services/pro/nutrition";
import { ProCardSkeleton, ProError } from "../states";
import { Card, Chip, ListCard, SectionHead, SoftLine, type ListRow, type Tone } from "./kit";
import { fmtDay } from "./clientFormat";
import type { ClientPageData } from "./useClientPage";
import type { ProLane } from "../subtypeLanes";
import { PRO_ROUTES } from "../subtypeLanes";
import {
  assignHabit,
  fetchAdherenceRow,
  fetchClientMealPlan,
  fetchClientProgrammes,
  fetchClientTargets,
  fetchDayItems,
  type ClientMealPlan,
  type ClientProgramme,
  type ClientTargets,
} from "../../../services/pro/clientPage";
import { setNutritionCoaching } from "../../../services/pro/clients";
import { mondayFirstWeek, DAY_SHORT } from "../../../utils/week";
import type { AccessCategory } from "../../../services/pro/access";

/**
 * Release 3 · CL2 v4 Tab 2 Plan (Full coaching) and Meal plan (Nutrition),
 * "larger plan text" (source gen/r9.js clientPagePlan9 over r6b cpTab6 and
 * r7 nutriSection7):
 * - the plan card: eyebrow 10.5 / 600 caps 0.11em, name 16 / 800, the line
 *   12 text.faint, the status chip; Full coaching's week bar (8 high r9999,
 *   gap 4: done primary, this week #7D6BB5 / dark primary.dark, ahead soft);
 *   Edit {name}'s copy (secondary) and Assign another (outline), both to
 *   Library (W5 builds the editors);
 * - This week (Workout activity): each day with planned items, Done / Today /
 *   Missed;
 * - Past programmes (ended assignments, DB-3);
 * - Nutrition (Full coaching): "Include nutrition coaching" (r14 soft row,
 *   professional_clients.nutrition_coaching) and, when on, the meal plan,
 *   targets and food journal rows; off: "Off for {name}. Nutrition sections
 *   are hidden.";
 * - Nutrition lane: the meal plan card with the macro split bars, today's
 *   meals (meal_plan_detail), the targets you set (my_client_nutrition_targets,
 *   NU8) and the food journal (NU5 / NU6, behind the Food diary switch); the
 *   rows open the W5 Meal plans screens.
 */
export const PlanTab: React.FC<{ data: ClientPageData; lane: ProLane; onAsk: (c: AccessCategory) => void }> = ({ data, lane, onAsk }) => {
  const { authUserId } = useApp();
  const { clientId } = data;
  const [programmes, setProgrammes] = useState<{ list: ClientProgramme[] | null; error: boolean }>({ list: null, error: false });
  const [meal, setMeal] = useState<{ plan: ClientMealPlan | null; error: boolean } | null>(null);
  const [targets, setTargets] = useState<ClientTargets | null | undefined>(undefined);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    if (lane === "full_coaching") void fetchClientProgrammes(authUserId, clientId).then((r) => live && setProgrammes(r.ok ? { list: r.data, error: false } : { list: null, error: true }));
    void fetchClientMealPlan(authUserId, clientId).then((r) => live && setMeal(r.ok ? { plan: r.data, error: false } : { plan: null, error: true }));
    void fetchClientTargets(clientId).then((r) => live && setTargets(r.ok ? r.data : null));
    return () => {
      live = false;
    };
  }, [authUserId, clientId, lane, nonce]);

  if (lane === "nutrition") {
    return <MealPlanSection data={data} meal={meal} targets={targets} retry={() => setNonce((n) => n + 1)} onAsk={onAsk} standalone lane={lane} />;
  }
  return (
    <>
      <ProgrammeSection data={data} programmes={programmes} retry={() => setNonce((n) => n + 1)} onAsk={onAsk} />
      <NutritionSection data={data} meal={meal} targets={targets} onAsk={onAsk} retry={() => setNonce((n) => n + 1)} />
    </>
  );
};

function weekOfProgramme(p: ClientProgramme, today: string): number | null {
  if (!p.startsOn) return null;
  const days = Math.round((new Date(`${today}T00:00:00`).getTime() - new Date(`${p.startsOn}T00:00:00`).getTime()) / 86400000);
  if (days < 0) return null;
  return Math.floor(days / 7) + (p.joinWeek ?? 1);
}

const ProgrammeSection: React.FC<{ data: ClientPageData; programmes: { list: ClientProgramme[] | null; error: boolean }; retry: () => void; onAsk: (c: AccessCategory) => void }> = ({ data, programmes, retry, onAsk }) => {
  const navigate = useNavigate();
  const dark = useIsDark();
  const { access, clientId, today, firstName } = data;
  const [adh, setAdh] = useState<number | null | undefined>(undefined);
  const [week, setWeek] = useState<{ day: string; planned: number; completed: number }[] | null | undefined>(undefined);
  const shares = access.has("workout_activity");
  useEffect(() => {
    if (!shares) return;
    let live = true;
    void fetchAdherenceRow(clientId, 14, today).then((r) => live && setAdh(r.ok ? r.data?.pct ?? null : null));
    void fetchDayItems(clientId, mondayFirstWeek(today)).then((r) => live && setWeek(r.ok ? r.data : null));
    return () => {
      live = false;
    };
  }, [clientId, shares, today]);

  if (programmes.error && !programmes.list) return <ProError onRetry={retry} />;
  if (!programmes.list) return <ProCardSkeleton lines={3} height={160} />;
  const active = programmes.list.find((p) => !p.endedAt) ?? null;
  const past = programmes.list.filter((p) => !!p.endedAt);
  const toLibrary = () => navigate(`${PRO_ROUTES.library}/programmes`);
  const n = active ? weekOfProgramme(active, today) : null;
  const of = active?.durationWeeks ?? null;
  const chip: { label: string; tone: Tone } | null = adh == null ? null : adh >= 70 ? { label: "On track", tone: "act" } : adh >= 40 ? { label: "Slipping", tone: "req" } : { label: "Off track", tone: "att" };

  return (
    <>
      {active ? (
        <Card>
          <div className="flex justify-between items-start" style={{ gap: 8 }}>
            <div className="min-w-0">
              <p style={{ fontSize: textPx(10.5), fontWeight: 600, letterSpacing: "0.11em", textTransform: "uppercase", color: INK.chF }}>Programme</p>
              <p style={{ fontSize: textPx(16), fontWeight: 800, color: INK.ch, marginTop: 2, overflowWrap: "anywhere" }}>{active.name}</p>
              <p style={{ fontSize: textPx(12), color: INK.chF }}>{[n && of ? `Week ${Math.min(n, of)} of ${of}` : n ? `Week ${n}` : null, active.endsOn ? `ends ${fmtDay(active.endsOn)}` : null, `${firstName}'s copy`].filter(Boolean).join(" · ")}</p>
            </div>
            {chip && <Chip label={chip.label} tone={chip.tone} />}
          </div>
          {of && n && (
            <div aria-hidden className="grid" style={{ gridTemplateColumns: `repeat(${of}, minmax(0, 1fr))`, gap: 4, marginTop: 12 }}>
              {Array.from({ length: of }, (_, i) => (
                <span key={i} style={{ height: 8, borderRadius: 9999, background: i + 1 < n ? INK.pr : i + 1 === n ? (dark ? "rgb(var(--th-c3b3fb))" : "#7D6BB5") : INK.soft }} />
              ))}
            </div>
          )}
          <div className="flex flex-wrap" style={{ gap: 8, marginTop: 12 }}>
            <CtaButton className="flex-1 min-w-[150px]" size="base" variant="secondary" icon={<Pencil size={15} />} label={`Edit ${firstName}'s copy`} onClick={toLibrary} />
            <CtaButton className="flex-1 min-w-[150px]" size="base" variant="outline" icon={<ClipboardPlus size={15} />} label="Assign another" onClick={toLibrary} />
          </div>
        </Card>
      ) : (
        <Card>
          <p style={{ fontSize: textPx(10.5), fontWeight: 600, letterSpacing: "0.11em", textTransform: "uppercase", color: INK.chF }}>Programme</p>
          <p style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, marginTop: 4 }}>{`No programme assigned to ${firstName} yet.`}</p>
          <div className="flex" style={{ marginTop: 10 }}>
            <CtaButton size="base" variant="secondary" icon={<ClipboardPlus size={15} />} label="Assign a programme" onClick={toLibrary} />
          </div>
        </Card>
      )}

      <SectionHead label="This week" />
      {!shares ? (
        <LockLine
          className="mb-3"
          what="Workout activity"
          clientFirstName={firstName}
          action={
            <button type="button" onClick={() => onAsk("workout_activity")} className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(11.5), fontWeight: 700, color: INK.prDeep }}>
              Ask to share
            </button>
          }
        />
      ) : week === undefined ? (
        <ProCardSkeleton lines={3} />
      ) : !week || week.every((d) => d.planned === 0) ? (
        <SoftLine icon={Dumbbell}>No workouts planned this week.</SoftLine>
      ) : (
        <ListCard
          rows={week
            .map((d, i) => ({ ...d, label: DAY_SHORT[i] }))
            .filter((d) => d.planned > 0)
            .map((d): ListRow => {
              const done = d.completed >= d.planned;
              const isToday = d.day === today;
              const chipEl = done ? <Chip label="Done" tone="done" /> : isToday ? <Chip label="Today" tone="pr" /> : d.day < today ? <Chip label="Missed" tone="att" /> : undefined;
              return {
                key: d.day,
                icon: Dumbbell,
                title: `${d.label} · ${d.planned} workout${d.planned === 1 ? "" : "s"}`,
                meta: done ? `${d.completed} of ${d.planned} logged` : isToday ? "Planned for today" : d.day < today ? `${d.completed} of ${d.planned} logged` : "Planned",
                trailing: chipEl,
              };
            })}
        />
      )}

      {past.length > 0 && (
        <>
          <SectionHead label="Past programmes" />
          <ListCard rows={past.map((p) => ({ key: p.id, icon: Dumbbell, title: p.name, meta: `Ended ${fmtDay(p.endedAt, true)}` }))} />
        </>
      )}
      <HabitAssign data={data} />
    </>
  );
};

const HabitAssign: React.FC<{ data: ClientPageData }> = ({ data }) => {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <div className="flex" style={{ marginBottom: 12 }}>
        <CtaButton size="base" variant="outline" icon={<Plus size={15} />} label="Assign a habit" onClick={() => { setLabel(""); setMsg(null); setOpen(true); }} />
      </div>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Assign a habit"
        footer={
          <CtaButton
            size="sheet"
            className="w-full"
            label="Assign"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const r = await assignHabit(data.clientId, label);
              setBusy(false);
              if (!r.ok) return setMsg(r.message);
              setOpen(false);
              data.reload();
            }}
          />
        }
      >
        <p style={{ fontSize: textPx(12.5), color: INK.chS, marginBottom: 12 }}>{`${data.firstName} can tick it off and archive it, but not rename it.`}</p>
        <input
          value={label}
          maxLength={60}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Walk 30 min"
          aria-label="Habit"
          className="w-full outline-none placeholder:text-charcoal-faint"
          style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", fontSize: textPx(14), color: INK.ch }}
        />
        {msg && (
          <p role="alert" style={{ marginTop: 8, fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
            {msg}
          </p>
        )}
      </BottomSheet>
    </>
  );
};

const NutritionSection: React.FC<{
  data: ClientPageData;
  meal: { plan: ClientMealPlan | null; error: boolean } | null;
  targets: ClientTargets | null | undefined;
  onAsk: (c: AccessCategory) => void;
  retry: () => void;
}> = ({ data, meal, targets, onAsk, retry }) => {
  const navigate = useNavigate();
  const { rel, firstName, stage } = data;
  const [on, setOn] = useState<boolean>(stage?.nutritionCoaching ?? true);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (stage) setOn(stage.nutritionCoaching);
  }, [stage]);
  const toggle = async (v: boolean) => {
    if (!rel) return;
    setOn(v);
    setErr(null);
    const r = await setNutritionCoaching(rel.id, v);
    if (!r.ok) {
      setOn(!v);
      setErr(r.message);
    } else data.reload();
  };
  return (
    <>
      <SectionHead label="Nutrition" right={on ? "Open builder" : undefined} onRight={on ? () => navigate(`${PRO_ROUTES.library}/meal-plans`) : undefined} />
      <div className="flex items-center justify-between" style={{ gap: 16, borderRadius: 14, background: INK.soft, padding: "10px 12px", marginBottom: on ? 10 : 6 }}>
        <span className="min-w-0">
          <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>Include nutrition coaching</span>
          <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF }}>{on ? `Meal plan, targets and journal review for ${firstName}` : `Off for ${firstName}. Nutrition sections are hidden.`}</span>
        </span>
        <Toggle checked={on} onChange={(v) => void toggle(v)} label="Include nutrition coaching" />
      </div>
      {err && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginBottom: 8 }}>
          {err}
        </p>
      )}
      {on && <MealPlanSection data={data} meal={meal} targets={targets} retry={retry} onAsk={onAsk} lane="full_coaching" />}
    </>
  );
};

const SLOT_LABEL: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack", snacks: "Snacks" };

const MealPlanSection: React.FC<{
  data: ClientPageData;
  meal: { plan: ClientMealPlan | null; error: boolean } | null;
  targets: ClientTargets | null | undefined;
  retry: () => void;
  onAsk: (c: AccessCategory) => void;
  standalone?: boolean;
  lane: ProLane;
}> = ({ data, meal, targets, retry, onAsk, standalone, lane }) => {
  const navigate = useNavigate();
  const { today, firstName } = data;
  const { recipes, customMeals } = useApp();
  const [items, setItems] = useState<{ slot: string; name: string; kcal: number | null; protein: number | null }[] | null | undefined>(undefined);
  const plan = meal?.plan ?? null;
  const dayIndex = plan && plan.startsOn && plan.daysCount ? Math.max(0, Math.round((new Date(`${today}T00:00:00`).getTime() - new Date(`${plan.startsOn}T00:00:00`).getTime()) / 86400000)) % plan.daysCount : null;
  useEffect(() => {
    if (!standalone || !plan || dayIndex === null) return;
    let live = true;
    // day_index is 1-based (meal_plan_days). Each item scaled to its portion with the
    // builder's own math (meal_plan_detail returns per-serving facts, not item totals).
    void fetchPlan(plan.planId).then((r) => {
      if (!live) return;
      if (!r.ok || !r.data) return setItems(r.ok ? [] : null);
      const day = r.data.days.find((d) => d.dayIndex === dayIndex + 1);
      setItems(
        (day?.items ?? [])
          .slice()
          .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.position - b.position)
          .map((it) => {
            const m = itemMacros(it, { recipes, customMeals });
            return { slot: it.slot, name: it.name, kcal: m ? m.kcal : null, protein: m ? m.p : null };
          })
      );
    });
    return () => {
      live = false;
    };
  }, [standalone, plan, dayIndex, recipes, customMeals]);

  if (!meal) return <ProCardSkeleton lines={3} />;
  if (meal.error) return <ProError onRetry={retry} />;
  // W5: the rows open the Meal plans area (Nutrition's tab, Full coaching's Library › Meal plans).
  const toPlans = () => navigate(mealPlansHref(lane, "plans"));
  const toCopy = () => (plan ? navigate(mealPlansHref(lane, "plans", { plan: plan.planId })) : toPlans());
  const toTargets = () => navigate(mealPlansHref(lane, "targets", { client: data.clientId }));
  const toJournal = () => navigate(mealPlansHref(lane, "journals", { client: data.clientId }));
  const diaryShared = data.access.has("food_diary");
  const weekN = plan?.startsOn ? Math.floor(Math.max(0, Math.round((new Date(`${today}T00:00:00`).getTime() - new Date(`${plan.startsOn}T00:00:00`).getTime()) / 86400000)) / 7) + 1 : null;
  const kcal = plan?.kcal ? `${Math.round(plan.kcal).toLocaleString("en-GB")} kcal` : null;

  // my_client_nutrition_targets: the targets you set, no switch needed.
  const targetsRow: ListRow =
    targets === undefined
      ? { key: "t", icon: Target, title: "Targets", meta: "Loading…" }
      : !targets
        ? { key: "t", icon: Target, title: "No targets set by you", meta: "Set calories and macros", onClick: toTargets }
        : {
            key: "t",
            icon: Target,
            title: "Targets set by you",
            meta: [targets.calories ? `${Math.round(targets.calories).toLocaleString("en-GB")} kcal` : null, targets.proteinPct ? `${targets.proteinPct}% protein` : null, targets.locked ? `locked for ${firstName}` : null].filter(Boolean).join(" · "),
            onClick: toTargets,
          };
  // The diary reaches you only through the Food diary switch.
  const journalRow: ListRow = diaryShared
    ? { key: "j", icon: BookOpenCheck, title: "Food journal", meta: "Review and feedback", onClick: toJournal }
    : {
        key: "j",
        icon: BookOpenCheck,
        title: "Food journal",
        meta: "Food diary isn't shared.",
        trailing: (
          <button type="button" onClick={() => onAsk("food_diary")} className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(11.5), fontWeight: 700, color: INK.prDeep }}>
            Ask to share
          </button>
        ),
      };

  if (!standalone) {
    return (
      <ListCard
        rows={[
          plan
            ? { key: "mp", icon: UtensilsCrossed, title: [plan.name, kcal].filter(Boolean).join(" · "), meta: macroLine(plan), onClick: toCopy }
            : { key: "mp", icon: UtensilsCrossed, title: "No meal plan yet", meta: "Assign one from Meal plans", onClick: toPlans },
          targetsRow,
          journalRow,
        ]}
      />
    );
  }

  return (
    <>
      <Card>
        {plan ? (
          <>
            <div className="flex justify-between items-start" style={{ gap: 8 }}>
              <div className="min-w-0">
                <p style={{ fontSize: textPx(10.5), fontWeight: 600, letterSpacing: "0.11em", textTransform: "uppercase", color: INK.chF }}>Meal plan</p>
                <p style={{ fontSize: textPx(16), fontWeight: 800, color: INK.ch, marginTop: 2, overflowWrap: "anywhere" }}>{plan.name}</p>
                <p style={{ fontSize: textPx(12), color: INK.chF }}>{[weekN ? `Week ${weekN}` : null, kcal, plan.endsOn ? `ends ${fmtDay(plan.endsOn)}` : null].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            {[
              ["Protein", plan.proteinPct, "#7D6BB5"],
              ["Carbs", plan.carbsPct, "#AEA1DC"],
              ["Fat", plan.fatPct, "#A2C8C2"],
            ]
              .filter(([, p]) => p != null)
              .map(([label, pct, colour]) => {
                const g = plan.kcal && pct != null ? Math.round((plan.kcal * (pct as number)) / 100 / (label === "Fat" ? 9 : 4)) : null;
                return (
                  <div key={label as string} className="grid items-center" style={{ gridTemplateColumns: "56px 1fr 52px", gap: 8, marginTop: 10, fontSize: textPx(12) }}>
                    <span style={{ fontWeight: 600, color: INK.ch }}>{label}</span>
                    <span style={{ height: 6, borderRadius: 9999, background: INK.soft, overflow: "hidden" }}>
                      <span className="block" style={{ width: `${Math.min(100, (pct as number) * 2)}%`, height: "100%", background: colour as string }} />
                    </span>
                    <span style={{ textAlign: "right", color: INK.chS }}>{g != null ? `${g} g` : `${pct}%`}</span>
                  </div>
                );
              })}
            <div className="flex flex-wrap" style={{ gap: 8, marginTop: 14 }}>
              <CtaButton className="flex-1 min-w-[150px]" size="base" variant="secondary" icon={<Pencil size={15} />} label="Edit plan" onClick={toCopy} />
              <CtaButton className="flex-1 min-w-[150px]" size="base" variant="outline" icon={<ClipboardPlus size={15} />} label="Assign another" onClick={toPlans} />
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: textPx(10.5), fontWeight: 600, letterSpacing: "0.11em", textTransform: "uppercase", color: INK.chF }}>Meal plan</p>
            <p style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, marginTop: 4 }}>{`No meal plan assigned to ${firstName} yet.`}</p>
            <div className="flex" style={{ marginTop: 10 }}>
              <CtaButton size="base" variant="secondary" icon={<ClipboardPlus size={15} />} label="Assign a meal plan" onClick={toPlans} />
            </div>
          </>
        )}
      </Card>
      {plan && dayIndex !== null && (
        <>
          <SectionHead label={new Date(`${today}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" })} />
          {items === undefined ? (
            <ProCardSkeleton lines={3} />
          ) : !items || items.length === 0 ? (
            <SoftLine icon={Apple}>Nothing planned for today.</SoftLine>
          ) : (
            <ListCard
              rows={items.map((it, i) => ({
                key: `${i}`,
                icon: Apple,
                title: `${SLOT_LABEL[it.slot] ?? it.slot} · ${it.name}`,
                meta: [it.kcal != null ? `${Math.round(it.kcal)} kcal` : null, it.protein != null ? `${Math.round(it.protein)} g protein` : null].filter(Boolean).join(" · "),
              }))}
            />
          )}
        </>
      )}
      <SectionHead label="Targets and journal" />
      <ListCard rows={[targetsRow, journalRow]} />
    </>
  );
};

function macroLine(p: ClientMealPlan): string {
  const parts = [p.proteinPct != null ? `${p.proteinPct}% protein` : null, p.carbsPct != null ? `${p.carbsPct}% carbs` : null, p.fatPct != null ? `${p.fatPct}% fat` : null, p.startsOn ? `since ${fmtDay(p.startsOn)}` : null];
  return parts.filter(Boolean).join(" · ");
}

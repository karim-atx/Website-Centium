import React, { useEffect, useMemo, useState } from "react";
import { Check, Lock, Target } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useClientAccess } from "../../../hooks/useClientAccess";
import { textPx } from "../../../theme/textSize";
import { CtaButton } from "../../ui/PinnedCta";
import { Toggle } from "../../ui/Toggle";
import GoalsPanel, { type GoalsPanelPro } from "../../../pages/food/GoalsPanel";
import { buildMetricReadings } from "../../../services/health-metrics/series";
import { INK } from "../proInk";
import { LockLine } from "../LockLine";
import { EmptyState } from "../EmptyState";
import { ComingSoonPill } from "../ComingSoon";
import { ListSkeleton, OfflineLine, ProCardSkeleton, ProError } from "../states";
import { Avatar } from "../client/kit";
import { DietaryNeedsCard } from "../client/DietaryNeedsCard";
import { fmtDay } from "../client/clientFormat";
import { todayLocal } from "../../../utils/date";
import { askToShare } from "../../../services/pro/clientPage";
import { fetchBodyBasics, fetchClientGoal, fetchMyTargets, fetchWeightSeries, saveTargets, type BodyBasics, type ClientGoal, type MyTargets } from "../../../services/pro/nutrition";
import type { ProLane } from "../subtypeLanes";
import type { AccessCategory } from "../../../services/pro/access";
import { NuHead } from "./kit";
import { MACRO_COLOUR } from "./nuFormat";
import { useNuRoster } from "./hooks";
import { macroGrams, shiftDate, splitTotalOk, tdeeView } from "./nutritionModel";
import { useNutritionOverview } from "./useNutritionOverview";

/**
 * Release 3 · NU8 v3 "Targets · weight goal rate and TDEE" (source gen
 * r14.js nuTargets14 / goalCards14 over r7.js nuTargets7, r6c.js nuTargets6)
 * and, for Clinical overview, "Nutrition targets · read only"
 * (nuTargetsRO14). HANDOVER h: the targets ARE the client Goals panel cards
 * (pages/food/GoalsPanel.tsx in its `pro` mode, optional props only): weight
 * goal, desired weight, weekly rate, weight trend with reach date, TDEE
 * (Mifflin-St Jeor) with maintenance and target, the daily target stepper and
 * the macro split (MacroSplitEditor). Saved with
 * set_client_nutrition_targets (lock on by default: the client sees an
 * Existing plan, locked; ATXG8 on their side).
 *
 * Data, each behind its own consent:
 * - the targets I set: my_client_nutrition_targets (no switch needed, only
 *   mine, only while connected), with my weight goal, rate and target weight
 *   (Release A, 20261216040000);
 * - the client's own weight goal and rate: nutrition_goals, Progress switch
 *   (LockLine otherwise; never guessed), the starting point until I set mine;
 * - the target weight is MINE (Release A, W5-3d): set with
 *   p_desired_weight_kg and never prefilled from the client's own, because
 *   saving it would read as endorsing their number (the database stopped
 *   inheriting it for the same reason). Cleared or Maintain saves none;
 * - weigh-ins: health_metrics weight, Weight switch;
 * - TDEE (Release A, W5-3c): client_body_basics (age in years, sex, height,
 *   activity; Weight or Progress, no row otherwise) with the latest weigh-in,
 *   Mifflin-St Jeor via calculateTDEEFromParts (tdeeView). Any input missing,
 *   the card names it instead of estimating. Not wired: the frame's
 *   chevron on the activity word (a professional override has no column).
 * Micronutrient targets (Nutrition only): no table yet, Coming soon.
 * Not drawn: r6c's separate "Daily calorie target" card, which repeats the
 * Daily target stepper's value with a second input.
 */
interface Draft {
  weightGoal: "lose" | "gain" | "maintain";
  weeklyRateKg: number;
  targetCalories: number;
  macroSplit: { proteinPct: number; carbsPct: number; fatPct: number };
  desiredWeightKg?: number;
}

function useTargetsData(clientId: string, access: ReturnType<typeof useClientAccess>, nonce: number) {
  const progress = access.has("progress");
  const weightShared = access.has("weight");
  const [state, setState] = useState<{ key: string; mine: MyTargets | null; goal: ClientGoal | null; weights: Record<string, number> | null; basics: BodyBasics | null; error: boolean; offline: boolean } | null>(null);
  const key = `${clientId}|${progress}|${weightShared}|${nonce}`;
  useEffect(() => {
    if (access.loading) return;
    let live = true;
    const since = shiftDate(todayLocal(), -90);
    // client_body_basics returns no row unless Weight or Progress is on, so it isn't asked otherwise.
    const basicsShared = progress || weightShared;
    void Promise.all([
      fetchMyTargets(clientId),
      progress ? fetchClientGoal(clientId) : Promise.resolve(null),
      weightShared ? fetchWeightSeries(clientId, since) : Promise.resolve(null),
      basicsShared ? fetchBodyBasics(clientId) : Promise.resolve(null),
    ]).then(([m, g, w, b]) => {
      if (!live) return;
      const bad = [m, g, w, b].find((x) => x && !x.ok) as { ok: false; offline: boolean } | undefined;
      setState({
        key: `${clientId}|${progress}|${weightShared}|${nonce}`,
        mine: m.ok ? m.data : null,
        goal: g && g.ok ? g.data : null,
        weights: w && w.ok ? w.data : null,
        basics: b && b.ok ? b.data : null,
        error: !!bad,
        offline: !!bad?.offline,
      });
    });
    return () => {
      live = false;
    };
  }, [clientId, progress, weightShared, nonce, access.loading]);
  return { data: state && state.key === key ? state : null, stale: state, progress, weightShared };
}

export const TargetsEditor: React.FC<{ lane: ProLane; clientId: string; onBack: () => void }> = ({ lane, clientId, onBack }) => {
  const { clients } = useNuRoster(lane);
  const client = clients?.find((c) => c.clientId === clientId) ?? null;
  const access = useClientAccess(clientId);
  const [nonce, setNonce] = useState(0);
  const { data, stale, progress } = useTargetsData(clientId, access, nonce);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [goalTouched, setGoalTouched] = useState(false);
  const [lock, setLock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [asked, setAsked] = useState<Set<AccessCategory>>(new Set());
  const first = client?.firstName ?? "";

  // Start from what I set, else the client's own targets (Progress), else
  // nothing chosen yet. The target weight only ever starts from mine.
  useEffect(() => {
    if (!data) return;
    const m = data.mine;
    const g = data.goal;
    const rate = m?.weeklyRateKg ?? g?.weeklyRateKg ?? 0;
    setDraft({
      weightGoal: m?.weightGoal ?? g?.weightGoal ?? "maintain",
      weeklyRateKg: rate > 0 ? rate : 0.5,
      targetCalories: Math.round(m?.calories ?? g?.calories ?? 0),
      macroSplit: m ? { proteinPct: m.proteinPct, carbsPct: m.carbsPct, fatPct: m.fatPct } : g ? { proteinPct: g.proteinPct, carbsPct: g.carbsPct, fatPct: g.fatPct } : { proteinPct: 30, carbsPct: 45, fatPct: 25 },
      desiredWeightKg: m?.desiredWeightKg ?? undefined,
    });
    setGoalTouched(false);
    setLock(m ? m.locked : true);
  }, [data]);

  const weight = useMemo(() => (data?.weights ? buildMetricReadings("weight", data.weights) : null), [data]);
  const ask = (c: AccessCategory) =>
    void askToShare(clientId, c).then((r) => {
      if (r.ok) setAsked((s) => new Set(s).add(c));
      else setMsg({ ok: false, text: r.message });
    });
  const askBtn = (c: AccessCategory) => (
    <button type="button" disabled={asked.has(c)} onClick={() => ask(c)} className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(11.5), fontWeight: 700, color: asked.has(c) ? INK.chF : INK.prDeep }}>
      {asked.has(c) ? "Asked" : "Ask to share"}
    </button>
  );

  const head = <NuHead eyebrow={client?.name ?? ""} title="Targets and dietary needs" onBack={onBack} />;
  if (!data || !draft) {
    return (
      <div>
        {head}
        {stale?.error && !stale.offline ? <ProError onRetry={() => setNonce((n) => n + 1)} /> : <ProCardSkeleton lines={5} height={260} />}
      </div>
    );
  }

  const est = tdeeView(data.basics, weight?.current ?? null, !!data.weights, first);
  // My own goal and rate are known once I've set them, not only with Progress.
  const goalKnown = goalTouched || progress || !!data.mine?.weightGoal;
  const pro: GoalsPanelPro = {
    goal: draft,
    onChange: (g) => {
      if (g.weightGoal !== draft.weightGoal || g.weeklyRateKg !== draft.weeklyRateKg) setGoalTouched(true);
      setDraft({ ...draft, ...g });
    },
    readOnly: false,
    weight,
    weightLocked: <LockLine what="Weight" clientFirstName={first || "Your client"} action={askBtn("weight")} />,
    tdee: est.tdee,
    tdeeMissing: est.tdee === null ? { title: est.title, line: est.line } : { title: "", line: "" },
    tdeeBasis: est.tdee === null ? undefined : est.basis,
    lockNote: (
      <div style={{ marginTop: 10 }}>
        {!progress && (
          <div style={{ marginBottom: 8 }}>
            <LockLine what="Progress" clientFirstName={first || "Your client"} action={askBtn("progress")} />
          </div>
        )}
        <p style={{ fontSize: textPx(10.5), color: INK.chF }}>
          {lock ? `${first} sees this as an Existing plan, locked to you.` : `${first} can still change these targets.`}
        </p>
      </div>
    ),
    desiredWeightEditable: true,
    weightGoalUnknown: !goalKnown,
    today: todayLocal(),
  };

  const save = async () => {
    if (!splitTotalOk(draft.macroSplit.proteinPct, draft.macroSplit.carbsPct, draft.macroSplit.fatPct)) return setMsg({ ok: false, text: "Protein, carbs and fat must add up to 100%." });
    setBusy(true);
    setMsg(null);
    const r = await saveTargets(clientId, {
      calories: draft.targetCalories,
      proteinPct: draft.macroSplit.proteinPct,
      carbsPct: draft.macroSplit.carbsPct,
      fatPct: draft.macroSplit.fatPct,
      // Unchanged and unknown: the database keeps the client's own.
      weightGoal: goalKnown ? draft.weightGoal : null,
      weeklyRateKg: goalKnown ? draft.weeklyRateKg : null,
      // Mine only, and only with a direction: Maintain or a cleared field saves none.
      desiredWeightKg: goalKnown && draft.weightGoal !== "maintain" && draft.desiredWeightKg ? draft.desiredWeightKg : null,
      lock,
    });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setMsg({ ok: true, text: `Saved. ${first} has been notified.` });
    setNonce((n) => n + 1);
  };

  return (
    <div>
      {head}
      {data.error && data.offline && <OfflineLine />}
      {data.error && !data.offline && (
        <div style={{ marginBottom: 12 }}>
          <ProError onRetry={() => setNonce((n) => n + 1)} />
        </div>
      )}
      <DietaryNeedsCard clientId={clientId} firstName={first || "Your client"} access={access} onAsk={() => ask("allergies_dietary")} asked={asked.has("allergies_dietary")} />
      <GoalsPanel pro={pro} />
      <div className="flex items-center justify-between" style={{ gap: 12, marginTop: 10, background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 16, padding: "11px 14px 12px" }}>
        <span className="min-w-0">
          <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch }}>Lock these targets</span>
          <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>{`Only you can change them while ${first}'s plan is locked.`}</span>
        </span>
        <Toggle checked={lock} onChange={setLock} label="Lock these targets" />
      </div>
      {lane === "nutrition" && (
        <div style={{ marginTop: 10, background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 16, padding: "11px 14px 12px" }}>
          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            <p style={{ fontSize: textPx(10.5), fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgb(var(--th-6d50d3))" }}>Micronutrient targets</p>
            <ComingSoonPill />
          </div>
          <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 6 }}>Sodium, fibre and vitamin targets per client.</p>
        </div>
      )}
      {data.mine && <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 10 }}>{`You set these on ${fmtDay(data.mine.setAt, true)}.`}</p>}
      {msg && (
        <p role={msg.ok ? "status" : "alert"} style={{ marginTop: 10, fontSize: textPx(12), fontWeight: 600, color: msg.ok ? INK.good : INK.hi }}>
          {msg.text}
        </p>
      )}
      <div className="flex" style={{ marginTop: 14 }}>
        <CtaButton className="flex-1" size="page" icon={<Check size={15} />} label={`Save and notify ${first}`} loading={busy} disabled={!(draft.targetCalories > 0)} onClick={() => void save()} />
      </div>
    </div>
  );
};

/**
 * NU8 for Clinical overview (read only), exported for the Insights / client
 * page mount (agent C or the lead): `<TargetsReadOnly clientId={id} />`.
 * A doctor sets no targets, so this reads the client's current
 * nutrition_goals row, which needs the Progress switch (LockLine otherwise),
 * plus weigh-ins behind Weight. "Read only. Set on {date}." says when; the
 * setter's name isn't readable for another professional (gap).
 */
export const TargetsReadOnly: React.FC<{ clientId: string; firstName?: string; showHead?: boolean; onBack?: () => void; clientName?: string }> = ({ clientId, firstName, showHead, onBack, clientName }) => {
  const access = useClientAccess(clientId);
  const dark = useIsDark();
  const [nonce, setNonce] = useState(0);
  const { data, stale, progress } = useTargetsData(clientId, access, nonce);
  const first = firstName || "This client";
  const weight = useMemo(() => (data?.weights ? buildMetricReadings("weight", data.weights) : null), [data]);
  const head = showHead ? <NuHead eyebrow="Nutrition targets" title={clientName ?? ""} onBack={onBack} /> : null;

  if (access.loading || (!data && !stale?.error)) return <div>{head}<ProCardSkeleton lines={5} height={240} /></div>;
  if (!data) return <div>{head}<ProError onRetry={() => setNonce((n) => n + 1)} /></div>;
  if (!progress) return <div>{head}<LockLine what="Nutrition targets" clientFirstName={first} /></div>;
  const g = data.goal;
  if (!g) return <div>{head}<EmptyState icon={Target} title="No targets set" line={`${first} hasn't set nutrition targets yet.`} /></div>;
  const split = { proteinPct: g.proteinPct, carbsPct: g.carbsPct, fatPct: g.fatPct };
  const grams = macroGrams(g.calories, split);
  const est = tdeeView(data.basics, weight?.current ?? null, !!data.weights, first);
  const pro: GoalsPanelPro = {
    goal: { weightGoal: g.weightGoal, weeklyRateKg: g.weeklyRateKg, targetCalories: Math.round(g.calories), macroSplit: split, desiredWeightKg: g.desiredWeightKg ?? undefined },
    onChange: () => undefined,
    readOnly: true,
    weight,
    weightLocked: <LockLine what="Weight" clientFirstName={first} />,
    tdee: est.tdee,
    tdeeMissing: est.tdee === null ? { title: est.title, line: est.line } : { title: "", line: "" },
    tdeeBasis: est.tdee === null ? undefined : est.basis,
    lockNote: (
      <p className="flex items-center" style={{ gap: 6, marginTop: 10, fontSize: textPx(11.5), color: INK.chF }}>
        <Lock size={12} strokeWidth={2} aria-hidden />
        {g.setByProfessionalId ? `Read only. Set by a professional on ${fmtDay(g.createdAt)}.` : `Read only. Set by ${first} on ${fmtDay(g.createdAt)}.`}
      </p>
    ),
    hideMacros: true,
    today: todayLocal(),
  };
  return (
    <div>
      {head}
      {data.error && data.offline && <OfflineLine />}
      <GoalsPanel pro={pro} />
      <div style={{ marginTop: 10, background: INK.card, border: `1px solid ${dark ? "rgba(238,239,242,0.08)" : "#E7E6E6"}`, borderRadius: 16, padding: "11px 14px 12px" }}>
        <p style={{ fontSize: textPx(10.5), fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: dark ? "#B7ABDE" : "#6D50D3", marginBottom: 10 }}>Macro distribution</p>
        <div className="flex overflow-hidden" style={{ height: 14, borderRadius: 9999, gap: 2 }} role="img" aria-label={`Protein ${split.proteinPct}%, carbs ${split.carbsPct}%, fat ${split.fatPct}%`}>
          {(
            [
              [split.proteinPct, MACRO_COLOUR.p],
              [split.carbsPct, MACRO_COLOUR.c],
              [split.fatPct, MACRO_COLOUR.f],
            ] as const
          ).map(([p, col], i) => (
            <span key={i} className="flex items-center justify-center" style={{ flex: p, background: col, fontSize: textPx(9), fontWeight: 800, color: "#FFFFFF" }}>{`${Math.round(p)}%`}</span>
          ))}
        </div>
        <div className="flex flex-wrap" style={{ gap: 12, marginTop: 8, fontSize: textPx(11), color: INK.chS }}>
          <span>{`Protein ${grams.p} g`}</span>
          <span>{`Carbs ${grams.c} g`}</span>
          <span>{`Fat ${grams.f} g`}</span>
        </div>
      </div>
    </div>
  );
};

/** The Targets area without a client: who has targets you set (NU1 "Targets" box). */
export const TargetsList: React.FC<{ lane: ProLane; onBack: () => void; onOpen: (clientId: string) => void }> = ({ lane, onBack, onOpen }) => {
  const o = useNutritionOverview(lane);
  return (
    <div>
      <NuHead title="Targets" onBack={onBack} />
      {o.error && !o.offline && <ProError onRetry={o.retry} />}
      {o.error && o.offline && <OfflineLine />}
      {o.loading ? (
        <ListSkeleton rows={4} />
      ) : o.clients.length === 0 ? (
        <EmptyState icon={Target} title="No clients yet" line={lane === "nutrition" ? "Targets you set for clients show here." : "Turn on nutrition coaching from a client's Plan tab to set targets."} />
      ) : (
        <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "4px 14px" }}>
          {o.clients.map((c, i) => {
            const t = o.targets[c.clientId];
            return (
              <button key={c.clientId} type="button" onClick={() => onOpen(c.clientId)} className="tap w-full flex items-center text-left" style={{ gap: 12, padding: "11px 0", minHeight: 44, borderBottom: i < o.clients.length - 1 ? `1px solid ${INK.b06}` : "none" }}>
                <Avatar name={c.name} url={c.avatarUrl} size={34} />
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>{c.name}</span>
                  <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>
                    {t ? `${Math.round(t.calories).toLocaleString("en-GB")} kcal · ${Math.round(t.proteinPct)}% protein${t.locked ? " · locked" : ""}` : "Not set by you"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useId, useMemo, useState } from "react";
import { Check, Equal, Lock, Target, TrendingDown, TrendingUp } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useClientAccess } from "../../../hooks/useClientAccess";
import { textPx } from "../../../theme/textSize";
import { CtaButton } from "../../ui/PinnedCta";
import { Toggle } from "../../ui/Toggle";
import { SelectableBox } from "../../ui/SelectableBox";
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
import { appLocale } from "../../../i18n/format";
import { t, tx } from "../../../i18n/core";
import { useWebLayout } from "../../web/useWebLayout";
import { ExtrasCapWeb, ExtrasCardWeb, ExtrasGridWeb, ExtrasHeadWeb, ExtrasLockWeb, ExtrasStatsWeb } from "../insights/extrasWeb";

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

/** `pane` (website viewport, WP-NU-MP.4): the editor column of the web list-detail, without its back button. */
export const TargetsEditor: React.FC<{ lane: ProLane; clientId: string; onBack: () => void; pane?: boolean }> = ({ lane, clientId, onBack, pane }) => {
  const { clients } = useNuRoster(lane);
  const client = clients?.find((c) => c.clientId === clientId) ?? null;
  const access = useClientAccess(clientId);
  const { rail } = useWebLayout();
  const [nonce, setNonce] = useState(0);
  const { data, stale, progress } = useTargetsData(clientId, access, nonce);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [goalTouched, setGoalTouched] = useState(false);
  const [lock, setLock] = useState(true);
  const lockSubId = useId();
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
      {asked.has(c) ? t("Asked") : t("Ask to share")}
    </button>
  );

  const head = <NuHead eyebrow={client?.name ?? ""} title={t("Targets and dietary needs")} onBack={pane ? undefined : onBack} />;
  // Website viewport (WP-NU-MP.4, WP-NU Meal Plans Web v3 isTargets): the editor is one #FAFAFB
  // section (r20): a white 14 24 head (the caps name and the 22/28 title on one baseline), the
  // body (16 24, the panel in two columns 12 apart, one on the rail) and a white 14 24 footer
  // with the set-on line and the 44 Save button.
  const webHead = (
    <div className="flex items-baseline flex-wrap" style={{ columnGap: 12, padding: "14px 24px", borderBottom: "1px solid rgba(36,31,27,0.06)", background: "#FFFFFF" }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#71685E" }}>{client?.name ?? ""}</p>
      <h2 style={{ margin: 0, fontSize: 22, lineHeight: "28px", fontWeight: 700, letterSpacing: "-0.02em", color: "#241F1B" }}>{t("Targets and dietary needs")}</h2>
    </div>
  );
  const webShell = (body: React.ReactNode, footer?: React.ReactNode) => (
    <section aria-label={t("Targets and dietary needs")} className="min-w-0 flex flex-col overflow-hidden" style={{ boxSizing: "border-box", borderRadius: 20, background: "#FAFAFB", border: "1px solid rgba(36,31,27,0.08)" }}>
      {webHead}
      <div style={{ padding: "16px 24px" }}>{body}</div>
      {footer}
    </section>
  );
  if (!data || !draft) {
    const body = stale?.error && !stale.offline ? <ProError onRetry={() => setNonce((n) => n + 1)} /> : <ProCardSkeleton lines={5} height={260} />;
    if (pane) return webShell(body);
    return (
      <div>
        {head}
        {body}
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
    weightLocked: <LockLine what={t("Weight")} clientFirstName={first || t("Your client")} action={askBtn("weight")} />,
    tdee: est.tdee,
    tdeeMissing: est.tdee === null ? { title: est.title, line: est.line } : { title: "", line: "" },
    tdeeBasis: est.tdee === null ? undefined : est.basis,
    lockNote: (
      <div style={{ marginTop: 10 }}>
        {!progress && (
          <div style={{ marginBottom: 8 }}>
            <LockLine what={t("Progress")} clientFirstName={first || t("Your client")} action={askBtn("progress")} />
          </div>
        )}
        {/* On web the footer carries this line (WP-NU-MP.4). */}
        {!pane && (
          <p style={{ fontSize: textPx(10.5), color: INK.chF }}>
            {lock ? t("{name} sees this as an Existing plan, locked to you.", { name: first }) : t("{name} can still change these targets.", { name: first })}
          </p>
        )}
      </div>
    ),
    desiredWeightEditable: true,
    weightGoalUnknown: !goalKnown,
    today: todayLocal(),
  };

  const save = async () => {
    if (!splitTotalOk(draft.macroSplit.proteinPct, draft.macroSplit.carbsPct, draft.macroSplit.fatPct)) return setMsg({ ok: false, text: t("Protein, carbs and fat must add up to 100%.") });
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
    setMsg({ ok: true, text: t("Saved. {name} has been notified.", { name: first }) });
    setNonce((n) => n + 1);
  };

  if (pane) {
    const card: React.CSSProperties = { boxSizing: "border-box", background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", borderRadius: 16, padding: "12px 18px" };
    return webShell(
      <div className="flex flex-col" style={{ gap: 12 }}>
        {data.error && data.offline && <OfflineLine />}
        {data.error && !data.offline && <ProError onRetry={() => setNonce((n) => n + 1)} />}
        {/* Safety: the allergies and dietary needs stay in full above the targets (the frame shows a one-line note in the head). */}
        <DietaryNeedsCard clientId={clientId} firstName={first || t("Your client")} access={access} onAsk={() => ask("allergies_dietary")} asked={asked.has("allergies_dietary")} />
        <div className="grid items-start" style={{ gridTemplateColumns: rail ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 12 }}>
          <div className="min-w-0">
            <GoalsPanel pro={{ ...pro, webPart: "goals" }} />
          </div>
          <div className="min-w-0 flex flex-col" style={{ gap: 12 }}>
            <GoalsPanel pro={{ ...pro, webPart: "macros" }} />
            {/* FP: the card is the switch, so a tap anywhere on it toggles. */}
            <SelectableBox
              kind="switch"
              selected={lock}
              onToggle={() => setLock(!lock)}
              label={t("Lock these targets")}
              describedBy={lockSubId}
              className="flex items-center justify-between"
              style={{ ...card, gap: 12 }}
            >
              <span className="min-w-0">
                <span className="block" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>{t("Lock these targets")}</span>
                <span id={lockSubId} className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{t("Only you can change them while {name}'s plan is locked.", { name: first })}</span>
              </span>
              <Toggle decorative checked={lock} />
            </SelectableBox>
            {lane === "nutrition" && (
              <div style={card}>
                <div className="flex items-center justify-between" style={{ gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6D50D3" }}>{t("Micronutrient targets")}</p>
                  <ComingSoonPill web />
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{t("Sodium, fibre and vitamin targets per client.")}</p>
              </div>
            )}
          </div>
        </div>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} style={{ margin: 0, fontSize: 13, fontWeight: 600, color: msg.ok ? INK.good : INK.hi }}>
            {msg.text}
          </p>
        )}
      </div>,
      <div className="flex items-center" style={{ gap: 16, padding: "14px 24px", borderTop: "1px solid rgba(36,31,27,0.06)", background: "#FFFFFF" }}>
        <span className="flex-1 min-w-0" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
          {data.mine ? `${t("You set these on {date}.", { date: fmtDay(data.mine.setAt, true) })} ` : ""}
          {lock ? t("{name} sees this as an Existing plan, locked to you.", { name: first }) : t("{name} can still change these targets.", { name: first })}
        </span>
        <CtaButton size="page" icon={<Check size={18} />} label={t("Save and notify {name}", { name: first })} loading={busy} disabled={!(draft.targetCalories > 0)} onClick={() => void save()} />
      </div>
    );
  }

  return (
    <div>
      {head}
      {data.error && data.offline && <OfflineLine />}
      {data.error && !data.offline && (
        <div style={{ marginBottom: 12 }}>
          <ProError onRetry={() => setNonce((n) => n + 1)} />
        </div>
      )}
      <DietaryNeedsCard clientId={clientId} firstName={first || t("Your client")} access={access} onAsk={() => ask("allergies_dietary")} asked={asked.has("allergies_dietary")} />
      <GoalsPanel pro={pro} />
      {/* FP: the card is the switch, so a tap anywhere on it toggles. */}
      <SelectableBox
        kind="switch"
        selected={lock}
        onToggle={() => setLock(!lock)}
        label={t("Lock these targets")}
        describedBy={lockSubId}
        className="flex items-center justify-between"
        style={{ gap: 12, marginTop: 10, background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 16, padding: "11px 14px 12px" }}
      >
        <span className="min-w-0">
          <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch }}>{t("Lock these targets")}</span>
          <span id={lockSubId} className="block" style={{ fontSize: textPx(11), color: INK.chF }}>{t("Only you can change them while {name}'s plan is locked.", { name: first })}</span>
        </span>
        <Toggle decorative checked={lock} />
      </SelectableBox>
      {lane === "nutrition" && (
        <div style={{ marginTop: 10, background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 16, padding: "11px 14px 12px" }}>
          <div className="flex items-center justify-between" style={{ gap: 8 }}>
            <p style={{ fontSize: textPx(10.5), fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgb(var(--th-6d50d3))" }}>{t("Micronutrient targets")}</p>
            <ComingSoonPill />
          </div>
          <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 6 }}>{t("Sodium, fibre and vitamin targets per client.")}</p>
        </div>
      )}
      {data.mine && <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 10 }}>{t("You set these on {date}.", { date: fmtDay(data.mine.setAt, true) })}</p>}
      {msg && (
        <p role={msg.ok ? "status" : "alert"} style={{ marginTop: 10, fontSize: textPx(12), fontWeight: 600, color: msg.ok ? INK.good : INK.hi }}>
          {msg.text}
        </p>
      )}
      <div className="flex" style={{ marginTop: 14 }}>
        <CtaButton className="flex-1" size="page" icon={<Check size={15} />} label={t("Save and notify {name}", { name: first })} loading={busy} disabled={!(draft.targetCalories > 0)} onClick={() => void save()} />
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
/** `web` (website viewport, WP-CO-IN.7; only the web Insights page passes it): the Extras cards, 4 across (2 on the rail). */
export const TargetsReadOnly: React.FC<{ clientId: string; firstName?: string; showHead?: boolean; onBack?: () => void; clientName?: string; web?: boolean }> = ({ clientId, firstName, showHead, onBack, clientName, web }) => {
  const access = useClientAccess(clientId);
  const dark = useIsDark();
  const { rail } = useWebLayout();
  const [nonce, setNonce] = useState(0);
  const { data, stale, progress } = useTargetsData(clientId, access, nonce);
  const first = firstName || t("This client");
  const weight = useMemo(() => (data?.weights ? buildMetricReadings("weight", data.weights) : null), [data]);
  const head = web ? <ExtrasHeadWeb eyebrow={t("Nutrition targets")} title={clientName ?? ""} onBack={onBack} backLabel={t("Back")} /> : showHead ? <NuHead eyebrow={t("Nutrition targets")} title={clientName ?? ""} onBack={onBack} /> : null;

  if (access.loading || (!data && !stale?.error)) return <div>{head}<ProCardSkeleton lines={5} height={240} /></div>;
  if (!data) return <div>{head}<ProError onRetry={() => setNonce((n) => n + 1)} /></div>;
  if (!progress) return <div>{head}<LockLine what={t("Nutrition targets")} clientFirstName={first} /></div>;
  const g = data.goal;
  if (!g) return <div>{head}<EmptyState icon={Target} title={t("No targets set")} line={t("{name} hasn't set nutrition targets yet.", { name: first })} /></div>;
  const split = { proteinPct: g.proteinPct, carbsPct: g.carbsPct, fatPct: g.fatPct };
  const grams = macroGrams(g.calories, split);
  const est = tdeeView(data.basics, weight?.current ?? null, !!data.weights, first);
  if (web) {
    // WP-CO-IN.7 (Extras): Weight goal across; Current weight | Daily target | TDEE estimate (2 wide); Macro distribution across; the lock note.
    const setLine = g.setByProfessionalId ? t("Read only. Set by a professional on {date}.", { date: fmtDay(g.createdAt) }) : t("Read only. Set by {name} on {date}.", { name: first, date: fmtDay(g.createdAt) });
    const GOALS = [
      ["lose", TrendingDown, t("Lose weight")],
      ["maintain", Equal, tx("Maintain", "weight goal")],
      ["gain", TrendingUp, t("Gain weight")],
    ] as const;
    const hist = weight?.history ?? [];
    const cur = weight?.current ?? null;
    const kg = (n: number) => String(Math.round(n * 10) / 10);
    const eta = cur != null && g.desiredWeightKg != null && g.weeklyRateKg > 0 && g.weightGoal !== "maintain" && Math.abs(cur - g.desiredWeightKg) > 0.05 ? shiftDate(todayLocal(), Math.round((Math.abs(cur - g.desiredWeightKg) / g.weeklyRateKg) * 7)) : null;
    const diff = est.tdee != null ? Math.round(g.calories - est.tdee) : null;
    const n0 = (n: number) => Math.round(n).toLocaleString(appLocale("en-GB"));
    return (
      <div>
        {head}
        {data.error && data.offline && <OfflineLine />}
        <ExtrasGridWeb cols={4} railCols={2} gap="24px">
          <ExtrasCardWeb span="1 / -1">
            <ExtrasCapWeb>{t("Weight goal")}</ExtrasCapWeb>
            <div role="radiogroup" aria-label={t("Weight goal")} aria-readonly style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
              {GOALS.map(([k, Icon, label]) => {
                const on = g.weightGoal === k;
                return (
                  <span key={k} role="radio" aria-checked={on} style={{ height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 15, fontWeight: 600, background: on ? "#AEA1DC" : INK.soft, color: on ? "#241F1B" : INK.chS, whiteSpace: "nowrap" }}>
                    <Icon size={13} strokeWidth={2.2} aria-hidden />
                    {label}
                  </span>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24, marginTop: 16 }}>
              {(
                [
                  [t("Weekly rate"), g.weightGoal === "maintain" ? "–" : t("{n} kg a week", { n: kg(g.weeklyRateKg) }), null],
                  [t("Desired weight"), g.desiredWeightKg != null ? t("{n} kg", { n: kg(g.desiredWeightKg) }) : "–", eta ? t("About {date} at this rate", { date: fmtDay(eta) }) : null],
                ] as const
              ).map(([label, v, v2]) => (
                <div key={label} style={{ minWidth: 0, borderRadius: 14, background: INK.soft, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: INK.ch, whiteSpace: "nowrap" }}>{label}</span>
                  <span style={{ flex: "none", textAlign: "end" }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: INK.ch, whiteSpace: "nowrap" }}>{v}</span>
                    {v2 && <span style={{ display: "block", fontSize: 13, color: INK.chF, whiteSpace: "nowrap" }}>{v2}</span>}
                  </span>
                </div>
              ))}
            </div>
          </ExtrasCardWeb>
          <ExtrasCardWeb span="span 1" stretch>
            <ExtrasCapWeb>{t("Current weight")}</ExtrasCapWeb>
            {data.weights ? (
              <ExtrasStatsWeb
                top={0}
                fill
                stats={[
                  {
                    label: hist.length ? t("Last logged {date}", { date: fmtDay(hist[hist.length - 1].date) }) : t("No weigh-ins yet"),
                    value: cur != null ? kg(cur) : "–",
                    unit: cur != null ? t("kg") : undefined,
                    sub: cur != null && hist.length > 1 ? t("{delta} kg since {date}", { delta: `${cur - hist[0].value >= 0 ? "+" : "−"}${kg(Math.abs(cur - hist[0].value))}`, date: fmtDay(hist[0].date) }) : undefined,
                  },
                ]}
              />
            ) : (
              <LockLine what={t("Weight")} clientFirstName={first} />
            )}
          </ExtrasCardWeb>
          <ExtrasCardWeb span="span 1" stretch>
            <ExtrasCapWeb>{t("Daily target")}</ExtrasCapWeb>
            <ExtrasStatsWeb top={0} fill stats={[{ label: t("Calories"), value: n0(g.calories), unit: t("kcal") }]} />
          </ExtrasCardWeb>
          <ExtrasCardWeb span={rail ? "1 / -1" : "span 2"} stretch>
            <ExtrasCapWeb>{t("TDEE estimate")}</ExtrasCapWeb>
            {est.tdee != null ? (
              <ExtrasStatsWeb
                top={0}
                fill
                stats={[
                  { label: t("Maintenance"), value: n0(est.tdee), unit: t("kcal"), sub: est.basis },
                  { label: t("Target"), value: n0(g.calories), unit: t("kcal"), sub: diff ? t("{n} a day", { n: `${diff > 0 ? "+" : "−"}${n0(Math.abs(diff))}` }) : undefined, ink: "#5F5093" },
                ]}
              />
            ) : (
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: INK.ch }}>{est.title}</p>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: INK.chF }}>{est.line}</p>
              </div>
            )}
          </ExtrasCardWeb>
          <ExtrasCardWeb span="1 / -1">
            <ExtrasCapWeb>{t("Macro distribution")}</ExtrasCapWeb>
            <div className="flex overflow-hidden" style={{ height: 20, borderRadius: 999, gap: 2 }} role="img" aria-label={t("Protein {p}%, carbs {c}%, fat {f}%", { p: split.proteinPct, c: split.carbsPct, f: split.fatPct })}>
              {(
                [
                  [split.proteinPct, "#7D6BB5"],
                  [split.carbsPct, "#8175C2"],
                  [split.fatPct, "#4274D7"],
                ] as const
              ).map(([p, col], i) => (
                <span key={i} className="flex items-center justify-center" style={{ flex: p, background: col, fontSize: 11, fontWeight: 800, color: "#FFFFFF" }}>{`${Math.round(p)}%`}</span>
              ))}
            </div>
            <div className="flex flex-wrap" style={{ gap: 12, marginTop: 8, fontSize: 13, color: INK.chS }}>
              <span>{t("Protein {n} g", { n: grams.p })}</span>
              <span>{t("Carbs {n} g", { n: grams.c })}</span>
              <span>{t("Fat {n} g", { n: grams.f })}</span>
            </div>
          </ExtrasCardWeb>
          <ExtrasCardWeb span="1 / -1">
            <ExtrasLockWeb>{setLine}</ExtrasLockWeb>
          </ExtrasCardWeb>
        </ExtrasGridWeb>
      </div>
    );
  }
  const pro: GoalsPanelPro = {
    goal: { weightGoal: g.weightGoal, weeklyRateKg: g.weeklyRateKg, targetCalories: Math.round(g.calories), macroSplit: split, desiredWeightKg: g.desiredWeightKg ?? undefined },
    onChange: () => undefined,
    readOnly: true,
    weight,
    weightLocked: <LockLine what={t("Weight")} clientFirstName={first} />,
    tdee: est.tdee,
    tdeeMissing: est.tdee === null ? { title: est.title, line: est.line } : { title: "", line: "" },
    tdeeBasis: est.tdee === null ? undefined : est.basis,
    lockNote: (
      <p className="flex items-center" style={{ gap: 6, marginTop: 10, fontSize: textPx(11.5), color: INK.chF }}>
        <Lock size={12} strokeWidth={2} aria-hidden />
        {g.setByProfessionalId ? t("Read only. Set by a professional on {date}.", { date: fmtDay(g.createdAt) }) : t("Read only. Set by {name} on {date}.", { name: first, date: fmtDay(g.createdAt) })}
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
        <p style={{ fontSize: textPx(10.5), fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: dark ? "#B7ABDE" : "#6D50D3", marginBottom: 10 }}>{t("Macro distribution")}</p>
        <div className="flex overflow-hidden" style={{ height: 14, borderRadius: 9999, gap: 2 }} role="img" aria-label={t("Protein {p}%, carbs {c}%, fat {f}%", { p: split.proteinPct, c: split.carbsPct, f: split.fatPct })}>
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
          <span>{t("Protein {n} g", { n: grams.p })}</span>
          <span>{t("Carbs {n} g", { n: grams.c })}</span>
          <span>{t("Fat {n} g", { n: grams.f })}</span>
        </div>
      </div>
    </div>
  );
};

/** The Targets area without a client: who has targets you set (NU1 "Targets" box). */
/** `pane` (website viewport, WP-NU-MP.4): the list column of the web list-detail: no head, the open client tinted. */
export const TargetsList: React.FC<{ lane: ProLane; onBack: () => void; onOpen: (clientId: string) => void; pane?: { selected: string | null } }> = ({ lane, onBack, onOpen, pane }) => {
  const o = useNutritionOverview(lane);
  return (
    <div>
      {!pane && <NuHead title={t("Targets")} onBack={onBack} />}
      {o.error && !o.offline && <ProError onRetry={o.retry} />}
      {o.error && o.offline && <OfflineLine />}
      {o.loading ? (
        <ListSkeleton rows={4} />
      ) : o.clients.length === 0 ? (
        <EmptyState icon={Target} title={t("No clients yet")} line={lane === "nutrition" ? t("Targets you set for clients show here.") : t("Turn on nutrition coaching from a client's Plan tab to set targets.")} />
      ) : pane ? (
        // WP-NU-MP.4 (WP-NU Meal Plans Web v3): rows 64 (padding 0 14, r14), avatar 44, the name 15/24 600,
        // the line 13/20 with the lock; the open client #F0EDF9 with the 2 #AEA1DC ring on the avatar.
        <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 8 }}>
          {o.clients.map((c) => {
            const tg = o.targets[c.clientId];
            const on = pane.selected === c.clientId;
            return (
              <button key={c.clientId} type="button" onClick={() => onOpen(c.clientId)} aria-current={on || undefined} className="w-full flex items-center text-start hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ gap: 14, padding: "0 14px", minHeight: 64, borderRadius: 14, background: on ? INK.prPale : "transparent" }}>
                <span className="shrink-0" style={{ borderRadius: 9999, boxShadow: on ? "0 0 0 2px #AEA1DC" : "none" }}>
                  <Avatar name={c.name} url={c.avatarUrl} size={44} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>{c.name}</span>
                  <span className="flex items-center" style={{ gap: 6, fontSize: 13, lineHeight: "20px", color: INK.chF, whiteSpace: "nowrap", overflow: "hidden" }}>
                    <span className="truncate">
                      {tg ? (tg.locked ? t("{kcal} kcal · {pct}% protein · locked", { kcal: Math.round(tg.calories).toLocaleString(appLocale("en-GB")), pct: Math.round(tg.proteinPct) }) : t("{kcal} kcal · {pct}% protein", { kcal: Math.round(tg.calories).toLocaleString(appLocale("en-GB")), pct: Math.round(tg.proteinPct) })) : t("Not set by you")}
                    </span>
                    {tg?.locked && <Lock size={12} strokeWidth={2} aria-hidden className="shrink-0" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "4px 14px" }}>
          {o.clients.map((c, i) => {
            const tg = o.targets[c.clientId];
            return (
              <button key={c.clientId} type="button" onClick={() => onOpen(c.clientId)} className="tap w-full flex items-center text-start" style={{ gap: 12, padding: "11px 0", minHeight: 44, borderBottom: i < o.clients.length - 1 ? `1px solid ${INK.b06}` : "none" }}>
                <Avatar name={c.name} url={c.avatarUrl} size={34} />
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>{c.name}</span>
                  <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>
                    {tg ? (tg.locked ? t("{kcal} kcal · {pct}% protein · locked", { kcal: Math.round(tg.calories).toLocaleString(appLocale("en-GB")), pct: Math.round(tg.proteinPct) }) : t("{kcal} kcal · {pct}% protein", { kcal: Math.round(tg.calories).toLocaleString(appLocale("en-GB")), pct: Math.round(tg.proteinPct) })) : t("Not set by you")}
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

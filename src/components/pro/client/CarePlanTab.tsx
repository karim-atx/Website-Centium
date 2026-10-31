import React, { useState } from "react";
import { Activity, Bell, CalendarClock, CalendarPlus, ChevronLeft, ChevronRight, ClipboardPlus, Eye, EyeOff, FileText, History, Lightbulb, Maximize2, Pencil, Plus, Send, Target, Trash2, UtensilsCrossed } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton, PinnedCta } from "../../ui/PinnedCta";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { Toggle } from "../../ui/Toggle";
import { PopupMenu } from "../../ui/PopupMenu";
import { INK } from "../proInk";
import { EmptyState } from "../EmptyState";
import { ComingSoonPill } from "../ComingSoon";
import { OfflineLine, ProCardSkeleton, ProError } from "../states";
import { Card, Chip, ListCard, SectionHead, type ListRow } from "./kit";
import { fmtDay } from "./clientFormat";
import { DietaryNeedsCard } from "./DietaryNeedsCard";
import { useLabCatalogue } from "../../health/useLabCatalogue";
import type { ClientPageData } from "./useClientPage";
import {
  addCareItem,
  addFollowUp,
  createCarePlan,
  deleteCareItem,
  publishCarePlan,
  renameCarePlan,
  setFollowUpStatus,
  updateCareItem,
  type CareItem,
  type CarePlan,
  type FollowUp,
} from "../../../services/pro/clientPage";

/**
 * Release 3 · Care plan (Clinical overview only). CL2 v4 Tab 2 (source
 * gen/r7.js carePlan7 / carePlanEmpty7), CL5 Edit sheet (carePlanSheet7),
 * CL6 Full-page editor (carePlanEditor7), CL7 Review history
 * (carePlanHistory7), on DB-6 care_plans, care_plan_items (goal,
 * recommendation with visible_to_client, monitoring with a threshold),
 * care_plan_versions and follow_ups. "Save and mark reviewed" is
 * publish_care_plan: a new version, and the client is told.
 *
 * What the schema doesn't hold is left out rather than invented: no stored
 * start or next-review date (Started is the plan's creation, Next review the
 * next planned follow-up), no recommendation category column (the CL5
 * segment is kept as the text's lead word, "Nutrition: …"), and Referrals are
 * the care network's (W6).
 */

const REC_KINDS = ["Nutrition", "Activity", "Sleep", "Other"] as const;
const METRICS: { value: string; label: string; unit: string }[] = [
  { value: "systolic", label: "Systolic BP", unit: "mmHg" },
  { value: "diastolic", label: "Diastolic BP", unit: "mmHg" },
  { value: "weight", label: "Weight", unit: "kg" },
];

function metricLabel(metric: string | null, catalogueNames: Record<string, string>): string {
  if (!metric) return "Metric";
  const known = METRICS.find((m) => m.value === metric);
  if (known) return known.label;
  const key = metric.replace(/^lab:/, "");
  if (catalogueNames[key]) return catalogueNames[key];
  const lab = metric.replace(/^lab:/, "").replace(/_/g, " ");
  return lab.charAt(0).toUpperCase() + lab.slice(1);
}

function splitRec(body: string): { kind: string; text: string } {
  const m = /^(Nutrition|Activity|Sleep|Other|Medication|Clinical reasoning): (.*)$/s.exec(body);
  return m ? { kind: m[1], text: m[2] } : { kind: "Recommendation", text: body };
}

const EyeTag: React.FC<{ on: boolean; name: string }> = ({ on, name }) => (
  <span className="inline-flex items-center whitespace-nowrap" style={{ gap: 3, fontSize: textPx(10), fontWeight: 700, color: on ? INK.tealDark : INK.chF }}>
    {on ? <Eye size={11} strokeWidth={2} aria-hidden /> : <EyeOff size={11} strokeWidth={2} aria-hidden />}
    {on ? `${name} sees` : "Only you"}
  </span>
);

export const CarePlanTab: React.FC<{ data: ClientPageData; onNotes: () => void; onCalendar: () => void; onAskDiet: () => void; dietAsked: boolean }> = ({ data, onNotes, onCalendar, onAskDiet, dietAsked }) => {
  const dark = useIsDark();
  const lab = useLabCatalogue();
  const names = Object.fromEntries((lab.catalogue ?? []).map((c) => [c.key, c.displayName]));
  const { carePlan, firstName, clientId, today } = data;
  const [sheet, setSheet] = useState(false);
  const [editor, setEditor] = useState(false);
  const [history, setHistory] = useState(false);
  const [followEl, setFollowEl] = useState<{ el: HTMLElement; f: FollowUp } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!carePlan) return <ProCardSkeleton lines={4} height={260} />;
  if (carePlan.error && !carePlan.plan) return <ProError onRetry={data.reloadCarePlan} />;
  const plan = carePlan.plan;

  if (!plan) {
    return (
      <>
        <EmptyState icon={ClipboardPlus} title="No care plan yet" line={`Set goals, write recommendations for ${firstName}, choose what to monitor and plan follow-ups.`} />
        <div className="flex" style={{ margin: "4px 0 16px" }}>
          <CtaButton className="flex-1" size="page" icon={<Plus size={15} />} label="Create care plan" onClick={() => setSheet(true)} />
        </div>
        <SectionHead label="Dietary needs" />
        <DietaryNeedsCard clientId={clientId} firstName={firstName} access={data.access} compact onAsk={onAskDiet} asked={dietAsked} />
        <CarePlanSheet open={sheet} onClose={() => setSheet(false)} data={data} plan={null} onFull={() => setSheet(false)} />
      </>
    );
  }

  const goals = plan.items.filter((i) => i.kind === "goal");
  const recs = plan.items.filter((i) => i.kind === "recommendation");
  const mons = plan.items.filter((i) => i.kind === "monitoring");
  const upcoming = plan.followUps.filter((f) => f.status === "planned" || f.status === "booked");
  const nextReview = upcoming[0] ?? null;
  const lastReviewed = plan.versions[0]?.createdAt ?? null;
  const visibleRecs = recs.filter((r) => r.visibleToClient).length;

  return (
    <>
      {carePlan.offline && <OfflineLine />}
      <Card>
        <div className="flex justify-between items-start" style={{ gap: 8 }}>
          <div className="min-w-0">
            <p style={{ fontSize: textPx(10.5), fontWeight: 600, letterSpacing: "0.11em", textTransform: "uppercase", color: INK.chF }}>Care plan</p>
            <p style={{ fontSize: textPx(16), fontWeight: 800, color: INK.ch, marginTop: 2, overflowWrap: "anywhere" }}>{plan.title}</p>
          </div>
          <Chip label={plan.status === "active" ? "Active" : "Closed"} tone={plan.status === "active" ? "act" : "pau"} />
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
          {[
            ["Started", fmtDay(plan.createdAt, true)],
            ["Last reviewed", lastReviewed ? fmtDay(lastReviewed) : "Not yet"],
            ["Next review", nextReview ? fmtDay(nextReview.dueOn) : "Not set"],
          ].map(([k, v], i) => (
            <div key={k} style={{ borderRadius: 12, background: i === 2 ? INK.prPale : INK.soft, padding: "8px 10px" }}>
              <p style={{ fontSize: textPx(10), fontWeight: 600, color: INK.chF }}>{k}</p>
              <p style={{ fontSize: textPx(12.5), fontWeight: 800, color: i === 2 ? INK.prDeep : INK.ch, whiteSpace: "nowrap" }}>{v}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap" style={{ gap: 8, marginTop: 12 }}>
          <CtaButton className="flex-1 min-w-[150px]" size="base" variant="secondary" icon={<Pencil size={15} />} label="Edit plan" onClick={() => setSheet(true)} />
          <CtaButton className="flex-1 min-w-[150px]" size="base" variant="outline" icon={<History size={15} />} label="Review history" onClick={() => setHistory(true)} />
        </div>
        {!plan.publishedAt && <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 10 }}>{`Not published yet. ${firstName} sees the plan once you mark it reviewed.`}</p>}
      </Card>

      <SectionHead label="Goals" />
      {goals.length ? (
        <ListCard rows={goals.map((g) => ({ key: g.id, icon: Target, title: g.body, trailing: <EyeTag on={g.visibleToClient} name={firstName} /> }))} />
      ) : (
        <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 12 }}>No goals yet.</p>
      )}

      <SectionHead label={`Recommendations for ${firstName}`} />
      {recs.length ? (
        <div style={{ marginBottom: 12 }}>
          {recs.map((r) => {
            const { kind, text } = splitRec(r.body);
            return (
              <div key={r.id} className="flex" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 16, padding: "10px 12px", marginBottom: 6, gap: 10 }}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: 10, background: dark ? "rgba(174,161,220,0.14)" : "#F0EDF9" }}>
                  <Lightbulb size={14} strokeWidth={1.9} aria-hidden style={{ color: INK.prAccent }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex justify-between" style={{ gap: 6 }}>
                    <span style={{ fontSize: textPx(12.5), fontWeight: 800, color: INK.ch }}>{kind}</span>
                    <EyeTag on={r.visibleToClient} name={firstName} />
                  </span>
                  <span className="block" style={{ fontSize: textPx(12), color: INK.chS, lineHeight: 1.45, marginTop: 2, overflowWrap: "anywhere" }}>
                    {text}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 12 }}>No recommendations yet.</p>
      )}

      <SectionHead label="Monitoring" />
      {mons.length ? (
        <ListCard
          rows={mons.map((m) => {
            const metric = METRICS.find((x) => x.value === m.metric);
            const flag = [m.thresholdHigh != null ? `over ${m.thresholdHigh}` : null, m.thresholdLow != null ? `under ${m.thresholdLow}` : null].filter(Boolean).join(" or ");
            return {
              key: m.id,
              icon: Activity,
              title: metricLabel(m.metric, names),
              meta: (
                <span className="inline-flex items-center" style={{ gap: 4 }}>
                  <Bell size={11} strokeWidth={2} aria-hidden />
                  {flag ? `Flag if ${flag}${metric ? ` ${metric.unit}` : ""}` : m.body}
                </span>
              ),
            };
          })}
        />
      ) : (
        <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 12 }}>Nothing monitored yet.</p>
      )}

      <SectionHead label="Follow-ups" right="Calendar" onRight={onCalendar} />
      {plan.followUps.length ? (
        <ListCard
          rows={plan.followUps.map((f): ListRow => {
            const chip =
              f.status === "done" ? <Chip label="Done" tone="done" /> : f.status === "cancelled" ? <Chip label="Cancelled" tone="pau" /> : f.dueOn <= today ? <Chip label={f.dueOn === today ? "Today" : "Due"} tone="att" /> : null;
            const open = f.status === "planned" || f.status === "booked";
            return {
              key: f.id,
              icon: CalendarClock,
              title: f.note || "Follow-up",
              meta: f.dueOn === today ? "Today" : fmtDay(f.dueOn, true),
              trailing: (
                <span className="flex items-center" style={{ gap: 6 }}>
                  {chip}
                  {open && (
                    <button type="button" aria-label={`Update ${f.note || "follow-up"}`} aria-haspopup="menu" onClick={(e) => setFollowEl({ el: e.currentTarget, f })} className="tap flex items-center justify-center" style={{ width: 32, height: 44 }}>
                      <ChevronRight size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
                    </button>
                  )}
                </span>
              ),
            };
          })}
        />
      ) : (
        <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 12 }}>No follow-ups planned.</p>
      )}

      <SectionHead label="Referrals" />
      <ListCard rows={[{ key: "ref", icon: Send, title: "Referrals", meta: "From your care network", trailing: <ComingSoonPill /> }]} />

      <SectionHead label="Dietary needs" />
      <DietaryNeedsCard clientId={clientId} firstName={firstName} access={data.access} onAsk={onAskDiet} asked={dietAsked} />

      <SectionHead label="Linked notes" right="All notes" onRight={onNotes} />
      <ListCard rows={[{ key: "notes", icon: FileText, title: "Clinical notes", meta: `Your notes about ${firstName}`, onClick: onNotes }]} />

      <SectionHead label={`Shared with ${firstName}`} />
      <ListCard
        rows={[
          { key: "g", icon: Target, title: "Goals", meta: goals.length ? `${firstName} sees ${goals.filter((g) => g.visibleToClient).length} of ${goals.length}` : "None yet" },
          { key: "r", icon: Lightbulb, title: "Recommendations", meta: recs.length ? `${visibleRecs} of ${recs.length} visible` : "None yet" },
          { key: "f", icon: CalendarClock, title: "Follow-ups and review date", meta: plan.publishedAt ? `${firstName} sees these` : "After you publish" },
          { key: "m", icon: Activity, title: "Monitoring thresholds", meta: "Only you" },
        ]}
      />
      <div className="flex flex-wrap" style={{ gap: 8, marginBottom: 12 }}>
        <CtaButton className="flex-1 min-w-[150px]" size="base" variant="secondary" icon={<Plus size={15} />} label="Add recommendation" onClick={() => setSheet(true)} />
        <CtaButton className="flex-1 min-w-[150px]" size="base" variant="outline" icon={<CalendarPlus size={15} />} label="Add follow-up" onClick={() => setEditor(true)} />
      </div>
      {msg && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
          {msg}
        </p>
      )}

      <PopupMenu
        open={!!followEl}
        onClose={() => setFollowEl(null)}
        anchor={followEl?.el ?? null}
        options={[
          { value: "done", label: "Mark done" },
          { value: "cancelled", label: "Cancel follow-up", destructive: true },
        ]}
        onSelect={async (v) => {
          if (!followEl) return;
          const r = await setFollowUpStatus(followEl.f.id, v as FollowUp["status"]);
          if (!r.ok) setMsg(r.message);
          else data.reloadCarePlan();
        }}
        width={200}
        align="right"
      />
      <CarePlanSheet open={sheet} onClose={() => setSheet(false)} data={data} plan={plan} onFull={() => { setSheet(false); setEditor(true); }} />
      <ReviewHistorySheet open={history} onClose={() => setHistory(false)} plan={plan} />
      {editor && <CarePlanEditor data={data} plan={plan} onClose={() => setEditor(false)} />}
    </>
  );
};

// ---------------------------------------------------------------------------
// CL5 · Edit sheet
// ---------------------------------------------------------------------------

const fieldStyle: React.CSSProperties = { width: "100%", height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", fontSize: textPx(14), color: INK.ch };
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
    {children}
  </span>
);

const CarePlanSheet: React.FC<{ open: boolean; onClose: () => void; data: ClientPageData; plan: CarePlan | null; onFull: () => void }> = ({ open, onClose, data, plan, onFull }) => {
  const { authUserId } = useApp();
  const { firstName, clientId } = data;
  const [title, setTitle] = useState(plan?.title ?? "");
  const [review, setReview] = useState("");
  const [goal, setGoal] = useState("");
  const [recKind, setRecKind] = useState<(typeof REC_KINDS)[number]>("Nutrition");
  const [rec, setRec] = useState("");
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!authUserId) return;
    setBusy(true);
    setError(null);
    let planId = plan?.id ?? null;
    if (!planId) {
      const c = await createCarePlan(authUserId, clientId, title || "Care plan");
      if (!c.ok) {
        setBusy(false);
        return setError(c.message);
      }
      planId = c.id;
    } else if (title.trim() && title.trim() !== plan?.title) {
      const r = await renameCarePlan(planId, title);
      if (!r.ok) {
        setBusy(false);
        return setError(r.message);
      }
    }
    let pos = plan?.items.length ?? 0;
    if (goal.trim()) {
      const r = await addCareItem(planId, { kind: "goal", body: goal, visibleToClient: true }, pos++);
      if (!r.ok) return (setBusy(false), setError(r.message));
    }
    if (rec.trim()) {
      const r = await addCareItem(planId, { kind: "recommendation", body: `${recKind}: ${rec.trim()}`, visibleToClient: visible }, pos++);
      if (!r.ok) return (setBusy(false), setError(r.message));
    }
    if (review) {
      const r = await addFollowUp(planId, review, "Care plan review");
      if (!r.ok) return (setBusy(false), setError(r.message));
    }
    setBusy(false);
    setGoal("");
    setRec("");
    setReview("");
    data.reloadCarePlan();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={plan ? "Edit care plan" : "New care plan"} footer={<CtaButton size="sheet" className="w-full" label={plan ? "Save changes" : "Create care plan"} loading={busy} onClick={() => void save()} />}>
      <div className="flex flex-col" style={{ gap: 14 }}>
        <label className="block">
          <FieldLabel>Plan name</FieldLabel>
          <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Blood pressure care" style={fieldStyle} className="outline-none placeholder:text-charcoal-faint" />
        </label>
        <label className="block">
          <FieldLabel>Next review</FieldLabel>
          <input type="date" value={review} min={data.today} onChange={(e) => setReview(e.target.value)} style={fieldStyle} className="outline-none" />
        </label>
        <label className="block">
          <FieldLabel>Add a goal</FieldLabel>
          <input value={goal} maxLength={1000} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Blood pressure under 130/80" style={fieldStyle} className="outline-none placeholder:text-charcoal-faint" />
        </label>
        <div>
          <FieldLabel>Recommendation</FieldLabel>
          <SegmentedTabs items={REC_KINDS.map((k) => ({ key: k, label: k }))} activeKey={recKind} onChange={(k) => setRecKind(k as (typeof REC_KINDS)[number])} tabHeight={34} labelSize={11.5} className="mb-2" />
          <textarea
            value={rec}
            maxLength={900}
            onChange={(e) => setRec(e.target.value)}
            rows={3}
            aria-label="Recommendation"
            placeholder={`What should ${firstName} do?`}
            className="w-full outline-none placeholder:text-charcoal-faint"
            style={{ minHeight: 72, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "10px 12px", fontSize: textPx(14), color: INK.ch, lineHeight: 1.45 }}
          />
        </div>
        <div className="flex items-center justify-between" style={{ gap: 16, borderRadius: 12, background: INK.soft, padding: "10px 12px" }}>
          <span style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>{`${firstName} can see this`}</span>
          <Toggle checked={visible} onChange={setVisible} label={`${firstName} can see this`} />
        </div>
        {error && (
          <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
            {error}
          </p>
        )}
        {plan && (
          <button type="button" onClick={onFull} className="tap flex items-center" style={{ gap: 4, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep, minHeight: 44 }}>
            <Maximize2 size={13} strokeWidth={2} aria-hidden />
            Open full editor
          </button>
        )}
      </div>
    </BottomSheet>
  );
};

// ---------------------------------------------------------------------------
// CL6 · Full-page editor
// ---------------------------------------------------------------------------

const CarePlanEditor: React.FC<{ data: ClientPageData; plan: CarePlan; onClose: () => void }> = ({ data, plan, onClose }) => {
  const dark = useIsDark();
  const { firstName, name, clientId } = data;
  const lab = useLabCatalogue();
  const names = Object.fromEntries((lab.catalogue ?? []).map((c) => [c.key, c.displayName]));
  const [title, setTitle] = useState(plan?.title ?? "");
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [metric, setMetric] = useState("systolic");
  const [hi, setHi] = useState("");
  const [lo, setLo] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = plan?.items ?? [];

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null);
    const r = await fn();
    if (!r.ok) setError(r.message ?? "Couldn't save. Try again.");
    else data.reloadCarePlan();
    return r.ok;
  };

  const sections: { key: string; icon: typeof Target; title: string; sub: string; visible: boolean | null }[] = [
    { key: "goal", icon: Target, title: "Goals", sub: `${items.filter((i) => i.kind === "goal").length} goals`, visible: true },
    { key: "recommendation", icon: Lightbulb, title: "Recommendations", sub: `${items.filter((i) => i.kind === "recommendation").length} · ${items.filter((i) => i.kind === "recommendation" && i.visibleToClient).length} visible to ${firstName}`, visible: true },
    { key: "monitoring", icon: Activity, title: "Monitoring", sub: `${items.filter((i) => i.kind === "monitoring").length} metrics`, visible: false },
    { key: "follow", icon: CalendarClock, title: "Follow-ups", sub: `${plan.followUps.filter((f) => f.status === "planned" || f.status === "booked").length} scheduled`, visible: true },
    { key: "diet", icon: UtensilsCrossed, title: "Dietary needs", sub: `From ${firstName}'s sharing · read only`, visible: null },
  ];

  const itemRow = (it: CareItem) => (
    <div key={it.id} className="flex items-center" style={{ gap: 8, padding: "8px 0", borderTop: `1px solid ${INK.b06}` }}>
      <span className="flex-1 min-w-0" style={{ fontSize: textPx(13), color: INK.ch, overflowWrap: "anywhere" }}>
        {it.kind === "monitoring" ? `${metricLabel(it.metric, names)}: ${it.body}` : splitRec(it.body).text}
      </span>
      {it.kind !== "monitoring" && <Toggle checked={it.visibleToClient} onChange={(v) => void run(() => updateCareItem(it.id, { visibleToClient: v }))} label={`${firstName} can see this`} />}
      <button type="button" aria-label="Remove" onClick={() => void run(() => deleteCareItem(it.id))} className="tap flex items-center justify-center" style={{ width: 36, height: 44 }}>
        <Trash2 size={15} strokeWidth={2} aria-hidden style={{ color: INK.hi }} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 55, background: "rgb(var(--c-cream))" }} role="dialog" aria-label="Edit care plan">
      <div className="mx-auto" style={{ maxWidth: 430, padding: "16px 16px 180px" }}>
        <div className="flex items-start" style={{ gap: 10, marginBottom: 13 }}>
          <button type="button" onClick={onClose} aria-label="Back" className="tap flex items-center justify-center shrink-0" style={{ width: 44, height: 44, marginInlineStart: -10 }}>
            <ChevronLeft size={18} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
          </button>
          <div className="min-w-0">
            <p style={{ fontSize: textPx(10.5), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.11em", color: INK.chF, marginBottom: 2 }}>{name}</p>
            <h2 style={{ fontSize: textPx(19), fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch }}>Edit care plan</h2>
          </div>
        </div>
        <label className="block" style={{ marginBottom: 16 }}>
          <FieldLabel>Plan name</FieldLabel>
          <input
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title.trim() !== plan.title && void run(() => renameCarePlan(plan.id, title))}
            style={fieldStyle}
            className="outline-none"
          />
        </label>
        <SectionHead label="Sections" />
        <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "2px 12px" }}>
          {sections.map((s, i) => (
            <div key={s.key} style={{ borderBottom: i < sections.length - 1 ? `1px solid ${INK.b06}` : "none" }}>
              <button type="button" aria-expanded={open === s.key} onClick={() => { setOpen((o) => (o === s.key ? null : s.key)); setDraft(""); }} className="tap w-full flex items-center text-start" style={{ gap: 10, padding: "11px 0", minHeight: 52 }}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: 10, background: dark ? "rgba(174,161,220,0.14)" : "#F0EDF9" }}>
                  <s.icon size={14} strokeWidth={1.9} aria-hidden style={{ color: INK.prAccent }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch }}>{s.title}</span>
                  <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>{s.sub}</span>
                </span>
                {s.visible !== null && <EyeTag on={s.visible} name={firstName} />}
                <ChevronRight size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF, transform: open === s.key ? "rotate(90deg)" : undefined }} />
              </button>
              {open === s.key && (
                <div style={{ paddingBottom: 12 }}>
                  {(s.key === "goal" || s.key === "recommendation" || s.key === "monitoring") && items.filter((it) => it.kind === s.key).map(itemRow)}
                  {s.key === "follow" &&
                    plan.followUps.map((f) => (
                      <div key={f.id} className="flex items-center" style={{ gap: 8, padding: "8px 0", borderTop: `1px solid ${INK.b06}`, fontSize: textPx(13), color: INK.ch }}>
                        <span className="flex-1">{`${fmtDay(f.dueOn, true)} · ${f.note || "Follow-up"}`}</span>
                        <span style={{ fontSize: textPx(11), color: INK.chF }}>{f.status === "planned" ? "Planned" : f.status === "booked" ? "Booked" : f.status === "done" ? "Done" : "Cancelled"}</span>
                      </div>
                    ))}
                  {s.key === "diet" && <DietaryNeedsCard clientId={clientId} firstName={firstName} access={data.access} onAsk={() => undefined} />}
                  {(s.key === "goal" || s.key === "recommendation") && (
                    <div className="flex" style={{ gap: 8, marginTop: 8 }}>
                      <input value={draft} maxLength={900} onChange={(e) => setDraft(e.target.value)} placeholder={s.key === "goal" ? "Add a goal" : "Add a recommendation"} aria-label={s.key === "goal" ? "Add a goal" : "Add a recommendation"} style={{ ...fieldStyle, flex: 1 }} className="outline-none placeholder:text-charcoal-faint" />
                      <button
                        type="button"
                        aria-label="Add"
                        disabled={!draft.trim()}
                        onClick={async () => {
                          if (await run(() => addCareItem(plan.id, { kind: s.key as "goal" | "recommendation", body: s.key === "recommendation" ? `Other: ${draft.trim()}` : draft, visibleToClient: true }, items.length))) setDraft("");
                        }}
                        className="tap flex items-center justify-center shrink-0"
                        style={{ width: 44, height: 40, borderRadius: 12, background: INK.prPale }}
                      >
                        <Plus size={16} strokeWidth={2} aria-hidden style={{ color: INK.prDeep }} />
                      </button>
                    </div>
                  )}
                  {s.key === "monitoring" && (
                    <div className="flex flex-col" style={{ gap: 8, marginTop: 8 }}>
                      <select value={metric} onChange={(e) => setMetric(e.target.value)} aria-label="Metric" style={fieldStyle} className="outline-none">
                        {METRICS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex" style={{ gap: 8 }}>
                        <input inputMode="decimal" value={hi} onChange={(e) => setHi(e.target.value)} placeholder="Flag if over" aria-label="Flag if over" style={fieldStyle} className="outline-none placeholder:text-charcoal-faint" />
                        <input inputMode="decimal" value={lo} onChange={(e) => setLo(e.target.value)} placeholder="Flag if under" aria-label="Flag if under" style={fieldStyle} className="outline-none placeholder:text-charcoal-faint" />
                      </div>
                      <CtaButton
                        size="base"
                        variant="secondary"
                        label="Add to monitoring"
                        disabled={!hi && !lo}
                        onClick={async () => {
                          const h = hi ? Number(hi) : null;
                          const l = lo ? Number(lo) : null;
                          if ((h !== null && !Number.isFinite(h)) || (l !== null && !Number.isFinite(l))) return setError("Use numbers for the thresholds.");
                          const label = METRICS.find((m) => m.value === metric)?.label ?? metric;
                          const ok = await run(() => addCareItem(plan.id, { kind: "monitoring", body: `Watch ${label.toLowerCase()}`, visibleToClient: false, metric, thresholdHigh: h, thresholdLow: l }, items.length));
                          if (ok) {
                            setHi("");
                            setLo("");
                          }
                        }}
                      />
                    </div>
                  )}
                  {s.key === "follow" && (
                    <div className="flex flex-col" style={{ gap: 8, marginTop: 8 }}>
                      <input type="date" value={due} min={data.today} onChange={(e) => setDue(e.target.value)} aria-label="Due on" style={fieldStyle} className="outline-none" />
                      <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Kidney function bloods" aria-label="Follow-up" style={fieldStyle} className="outline-none placeholder:text-charcoal-faint" />
                      <CtaButton
                        size="base"
                        variant="secondary"
                        label="Add follow-up"
                        disabled={!due}
                        onClick={async () => {
                          if (await run(() => addFollowUp(plan.id, due, note))) {
                            setDue("");
                            setNote("");
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: 10 }}>{`Saving creates a new version. ${firstName} is told when the parts they can see change.`}</p>
        {error && (
          <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 8 }}>
            {error}
          </p>
        )}
      </div>
      <PinnedCta
        primary={{
          label: "Save and mark reviewed",
          loading: busy,
          onClick: async () => {
            setBusy(true);
            setError(null);
            const r = await publishCarePlan(plan.id, "");
            setBusy(false);
            if (!r.ok) return setError(r.message);
            data.reloadCarePlan();
            onClose();
          },
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// CL7 · Review history
// ---------------------------------------------------------------------------

const ReviewHistorySheet: React.FC<{ open: boolean; onClose: () => void; plan: CarePlan }> = ({ open, onClose, plan }) => {
  const { user } = useApp();
  const [viewing, setViewing] = useState<string | null>(null);
  const me = user.firstName?.trim() || "You";
  const last = plan.versions.length - 1;
  return (
    <BottomSheet open={open} onClose={onClose} title="Review history">
      {plan.versions.length === 0 ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chF }}>No versions yet. "Save and mark reviewed" saves the first one.</p>
      ) : (
        plan.versions.map((v, i) => (
          <div key={v.id} style={{ padding: "10px 0", borderBottom: i < last ? `1px solid ${INK.b06}` : "none" }}>
            <div className="flex" style={{ gap: 12 }}>
              <span aria-hidden style={{ width: 10, height: 10, marginTop: 5, borderRadius: 9999, background: i === 0 ? INK.pr : INK.soft, border: `2px solid ${i === 0 ? INK.pr : INK.b10}`, flexShrink: 0 }} />
              <span className="flex-1 min-w-0">
                <span className="block" style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>{`Version ${v.version}${i === last ? " · Created" : " · Reviewed"}`}</span>
                {v.note && <span className="block" style={{ fontSize: textPx(12), color: INK.chS }}>{v.note}</span>}
                <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>{`${fmtDay(v.createdAt, true)} · ${me}`}</span>
              </span>
              {i > 0 && (
                <button type="button" onClick={() => setViewing((x) => (x === v.id ? null : v.id))} aria-expanded={viewing === v.id} className="tap shrink-0" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, minHeight: 44 }}>
                  View
                </button>
              )}
            </div>
            {viewing === v.id && (
              <ul style={{ marginBlock: "6px 0", marginInline: "22px 0", fontSize: textPx(12), color: INK.chS, lineHeight: 1.5 }}>
                {(v.snapshot.items ?? []).map((it, j) => (
                  <li key={j}>{`${it.kind === "goal" ? "Goal" : it.kind === "recommendation" ? "Recommendation" : "Monitoring"}: ${it.kind === "recommendation" ? splitRec(it.body).text : it.body}`}</li>
                ))}
                {!(v.snapshot.items ?? []).length && <li>No items in this version.</li>}
              </ul>
            )}
          </div>
        ))
      )}
    </BottomSheet>
  );
};

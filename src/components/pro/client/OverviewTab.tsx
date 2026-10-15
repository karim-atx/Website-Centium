import React, { useEffect, useMemo, useState } from "react";
import { Activity, CalendarPlus, Dumbbell, HeartPulse, Lock, MessageCircle, Moon, Pencil, Scale, Sprout, UtensilsCrossed } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { textPx } from "../../../theme/textSize";
import { CtaButton } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { ProChart } from "../ProChart";
import { LockLine } from "../LockLine";
import { ProCardSkeleton } from "../states";
import { Card, ListCard, NumBox, SectionHead, SharedChips, SoftLine, type ListRow } from "./kit";
import { fmtDay } from "./clientFormat";
import type { ClientPageData } from "./useClientPage";
import type { ProLane } from "../subtypeLanes";
import { fetchAdherenceRow, fetchDayItems, fetchHabits, fetchPregnancySummary, type ClientHabit } from "../../../services/pro/clientPage";
import { saveCommunicationPreferences, type CommunicationPreferences } from "../../../services/pro/clients";
import { fetchClientCyclePhase } from "../../../services/cycle";
import { PHASE_LABEL, PHASE_UNAVAILABLE, phaseThemeColor } from "../../../services/cycle/guidance";
import type { CyclePhase } from "../../../services/cycle/types";
import { fetchClientSocialHandles } from "../../../services/profile/socialHandles";
import { instagramUrl, xUrl, type SocialHandles } from "../../../services/profile/socialHandleRules";
import { shiftIso } from "../../../services/pro/home";
import { mondayFirstWeek } from "../../../utils/week";
import type { AccessCategory } from "../../../services/pro/access";

/**
 * Release 3 · CL2 v3 Tab 1 Overview (source gen/r6b.js cpTab6 'Overview'),
 * on data the client shares:
 * - three number boxes (ui.js numBox; "–" with "After a week" in the first
 *   week, the frame's early-data state);
 * - the six-week chart (ProChart; Full coaching and Nutrition: completed vs
 *   planned items per week from client_adherence; Clinical overview: weekly
 *   systolic and diastolic from the shared blood pressure readings);
 * - Recent activity from the roster's gated reads;
 * - Shared with you (profile.js sharedRow) and the LockLine for what isn't;
 * - About (FINAL_PLAN 2.4, the old ClientDetailSheet extras): communication
 *   preferences (saved on the relationship), social handles
 *   (client_social_handles), cycle phase and "pregnant, week n" only with the
 *   switch on (Karim's answer 2), and Habits (Habits switch; hidden for
 *   Clinical overview, HANDOVER d).
 * The empty new-client state (CL2 v3 "Empty, new client"): the sky card,
 * the lock line and Next steps.
 */

const SHARED_SETS: Record<ProLane, { label: string; cats: AccessCategory[] }[]> = {
  full_coaching: [
    { label: "Workouts", cats: ["workout_activity"] },
    { label: "Food diary", cats: ["food_diary"] },
    { label: "Weight", cats: ["weight"] },
    { label: "Progress", cats: ["progress"] },
    { label: "Habits", cats: ["habits"] },
    { label: "Vitals", cats: ["health_metrics"] },
  ],
  nutrition: [
    { label: "Food diary", cats: ["food_diary"] },
    { label: "Weight", cats: ["weight"] },
    { label: "Workouts", cats: ["workout_activity"] },
    { label: "Lab results", cats: ["lab_results"] },
    { label: "Vitals", cats: ["health_metrics"] },
  ],
  clinical_overview: [
    { label: "Vitals", cats: ["health_metrics"] },
    { label: "Weight", cats: ["weight"] },
    { label: "Blood pressure", cats: ["blood_pressure"] },
    { label: "Food diary", cats: ["food_diary"] },
    { label: "Workouts", cats: ["workout_activity"] },
    { label: "Lab results", cats: ["lab_results"] },
  ],
};

function joinWords(list: string[]): string {
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

export const OverviewTab: React.FC<{ data: ClientPageData; lane: ProLane; onMessage: () => void; onSchedule: () => void; onAsk: (c: AccessCategory) => void }> = ({ data, lane, onMessage, onSchedule, onAsk }) => {
  const { access, rel, firstName, today } = data;
  const joined = (data.stage?.joinedAt ?? rel?.joinedAt ?? "").slice(0, 10);
  const early = !!joined && joined > shiftIso(today, -7);
  const sharesAnything = !!access.access && (access.access.categories.length > 0 || access.access.imagingSharedCount > 0 || access.access.resultSharedCount > 0);
  const isNew = data.stage?.stage === "onboarding" && !sharesAnything;

  const singles = access.access?.resultSharedCount ?? 0;
  const sets = SHARED_SETS[lane].map((s) => ({ label: s.label, on: s.cats.some((c) => access.has(c)) }));
  if (singles > 0 && !access.has("lab_results")) sets.push({ label: singles === 1 ? "1 result shared" : `${singles} results shared`, on: true });
  const unshared = sets.filter((s) => !s.on && !(s.label === "Lab results" && singles > 0)).map((s) => s.label);

  if (access.loading) return <ProCardSkeleton lines={4} height={300} />;

  if (isNew) {
    return (
      <>
        <div className="flex" style={{ borderRadius: 20, background: INK.skyPale, padding: "14px 16px", marginBottom: 12, gap: 12 }}>
          <Sprout size={18} strokeWidth={2} aria-hidden style={{ color: INK.sky, flexShrink: 0 }} />
          <span>
            <span className="block" style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>{`New ${lane === "clinical_overview" ? "patient" : "client"}`}</span>
            <span className="block" style={{ fontSize: textPx(12), color: INK.chS, lineHeight: 1.45 }}>{`Goals, history and shared data appear once ${firstName} shares them with you.`}</span>
          </span>
        </div>
        <SectionHead label="Shared with you" />
        <SoftLine icon={Lock}>{`${firstName} hasn't shared any data yet. You see only what ${firstName} chooses to share.`}</SoftLine>
        <SectionHead label="Next steps" />
        <ListCard
          rows={[
            { key: "book", icon: CalendarPlus, title: lane === "clinical_overview" ? "Book a first appointment" : "Book a first session", meta: "From your calendar", onClick: onSchedule },
            { key: "hello", icon: MessageCircle, title: "Say hello", meta: "Messages are open", onClick: onMessage },
          ]}
        />
        <AboutCard data={data} lane={lane} />
      </>
    );
  }

  return (
    <>
      <Numbers data={data} lane={lane} early={early} />
      <WeeksChart data={data} lane={lane} early={early} />
      <RecentActivity data={data} lane={lane} />
      <SectionHead label="Shared with you" />
      <div style={{ marginBottom: 8 }}>
        <SharedChips items={sets} />
      </div>
      {unshared.length > 0 && (
        <LockLine
          className="mb-3"
          what={joinWords(unshared)}
          clientFirstName={firstName}
          action={
            unshared.length === 1 ? (
              <button
                type="button"
                onClick={() => onAsk(SHARED_SETS[lane].find((s) => s.label === unshared[0])!.cats[0])}
                className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']"
                style={{ fontSize: textPx(11.5), fontWeight: 700, color: INK.prDeep }}
              >
                Ask to share
              </button>
            ) : undefined
          }
        />
      )}
      <AboutCard data={data} lane={lane} />
      {lane !== "clinical_overview" && <HabitsCard data={data} lane={lane} onAsk={() => onAsk("habits")} />}
    </>
  );
};

// ---------------------------------------------------------------------------

const Numbers: React.FC<{ data: ClientPageData; lane: ProLane; early: boolean }> = ({ data, lane, early }) => {
  const { rel, access, clientId, today } = data;
  const [adh, setAdh] = useState<{ pct: number | null } | null | undefined>(undefined);
  const [week, setWeek] = useState<{ planned: number; completed: number } | null | undefined>(undefined);
  const counted = lane === "full_coaching" ? access.has("workout_activity") : lane === "nutrition" ? access.has("food_diary") : false;

  useEffect(() => {
    if (lane === "clinical_overview" || !counted) return;
    let live = true;
    void fetchAdherenceRow(clientId, 14, today).then((r) => live && setAdh(r.ok ? (r.data ? { pct: r.data.pct } : null) : null));
    const days = lane === "full_coaching" ? mondayFirstWeek(today) : Array.from({ length: 7 }, (_, i) => shiftIso(today, i - 6));
    void fetchDayItems(clientId, days).then((r) => {
      if (!live) return;
      if (!r.ok) return setWeek(null);
      const sum = r.data.reduce((a, d) => ({ planned: a.planned + d.planned, completed: a.completed + d.completed }), { planned: 0, completed: 0 });
      setWeek(sum.planned ? sum : null);
    });
    return () => {
      live = false;
    };
  }, [clientId, lane, counted, today]);

  const dash = (label: string) => <NumBox key={label} label={label} value="–" sub={early ? "After a week" : "No shared data yet"} />;
  const weight = access.has("weight") && rel?.lastWeightKg != null ? <NumBox key="w" label="Weight" value={`${rel.lastWeightKg}`} sub="kg, latest" /> : dash("Weight");

  let boxes: React.ReactNode[];
  if (lane === "clinical_overview") {
    const bp = access.has("blood_pressure") ? rel?.bloodPressure?.[0] : undefined;
    const v = access.has("health_metrics") ? rel?.vitals : undefined;
    boxes = [
      bp ? <NumBox key="bp" label="Blood pressure" value={`${bp.systolic}/${bp.diastolic}`} sub={fmtDay(bp.recordedAt)} /> : dash("Blood pressure"),
      v?.stepsAvg != null ? <NumBox key="st" label="Steps" value={v.stepsAvg.toLocaleString("en-GB")} sub="Daily average" /> : dash("Steps"),
      v?.sleepHours != null ? <NumBox key="sl" label="Sleep" value={`${Math.floor(v.sleepHours)}h ${Math.round((v.sleepHours % 1) * 60)}m`} sub="Nightly average" /> : dash("Sleep"),
    ];
  } else {
    const adhLabel = lane === "nutrition" ? "Plan adherence" : "Adherence";
    const wkLabel = lane === "nutrition" ? "Targets met" : "Workouts";
    boxes = [
      early || !counted ? dash(adhLabel) : adh === undefined ? <NumBox key="a" label={adhLabel} value="…" /> : adh?.pct != null ? <NumBox key="a" label={adhLabel} value={`${adh.pct}%`} sub="Last 14 days" /> : dash(adhLabel),
      !counted ? dash(wkLabel) : week === undefined ? <NumBox key="wk" label={wkLabel} value="…" /> : week ? <NumBox key="wk" label={wkLabel} value={`${week.completed} of ${week.planned}`} sub={lane === "nutrition" ? "Days, last 7" : "This week"} /> : dash(wkLabel),
      weight,
    ];
  }
  return (
    <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
      {boxes}
    </div>
  );
};

const WeeksChart: React.FC<{ data: ClientPageData; lane: ProLane; early: boolean }> = ({ data, lane, early }) => {
  const { access, clientId, today, rel, firstName } = data;
  const [rows, setRows] = useState<({ planned: number; completed: number } | null)[] | null>(null);
  const counted = lane === "full_coaching" ? access.has("workout_activity") : lane === "nutrition" ? access.has("food_diary") : false;
  useEffect(() => {
    if (lane === "clinical_overview" || !counted || early) return;
    let live = true;
    const ends = [5, 4, 3, 2, 1, 0].map((w) => shiftIso(today, -7 * w));
    void Promise.all(ends.map((e) => fetchAdherenceRow(clientId, 7, e))).then((res) => live && setRows(res.map((r) => (r.ok && r.data ? { planned: r.data.planned, completed: r.data.completed } : null))));
    return () => {
      live = false;
    };
  }, [clientId, lane, counted, early, today]);

  const x = ["W1", "W2", "W3", "W4", "W5", "W6"];
  if (lane === "clinical_overview") {
    if (!access.has("blood_pressure")) return null;
    const readings = rel?.bloodPressure ?? [];
    const weekly = [5, 4, 3, 2, 1, 0].map((w) => {
      const from = shiftIso(today, -7 * w - 6);
      const to = shiftIso(today, -7 * w);
      const r = readings.filter((b) => b.recordedAt.slice(0, 10) >= from && b.recordedAt.slice(0, 10) <= to);
      return r.length ? { s: Math.round(r.reduce((a, b) => a + b.systolic, 0) / r.length), d: Math.round(r.reduce((a, b) => a + b.diastolic, 0) / r.length), n: r.length } : null;
    });
    if (weekly.filter(Boolean).length < 2) {
      return (
        <Card>
          <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>Blood pressure, last 6 weeks</p>
          <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 10 }}>{readings.length ? "Trends start after two weeks of readings." : `${firstName} hasn't logged blood pressure yet.`}</p>
        </Card>
      );
    }
    const vals = weekly.flatMap((w) => (w ? [w.s, w.d] : []));
    return (
      <div style={{ marginBottom: 12 }}>
        <ProChart
          title="Blood pressure, last 6 weeks"
          x={x}
          min={Math.max(0, Math.min(...vals) - 10)}
          max={Math.max(...vals) + 10}
          series={[
            { key: "s", label: "Systolic", type: "line", color: "rgb(var(--th-7d6bb5))", values: weekly.map((w) => w?.s ?? null) },
            { key: "d", label: "Diastolic", type: "line", color: INK.tealDark, values: weekly.map((w) => w?.d ?? null) },
          ]}
          tooltip={(i) => (weekly[i] ? { title: x[i], lines: [`${weekly[i]!.s}/${weekly[i]!.d} · avg of ${weekly[i]!.n}`] } : null)}
          summary="Weekly average blood pressure over six weeks."
        />
      </div>
    );
  }

  const title = lane === "nutrition" ? "Calorie targets met, last 6 weeks" : "Workouts completed, last 6 weeks";
  if (!counted) return null;
  if (early) {
    return (
      <Card pad="16px">
        <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>{title}</p>
        <div className="flex items-end" style={{ gap: 6, height: 60, marginTop: 12 }} aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="flex-1" style={{ height: i === 5 ? "40%" : "100%", borderRadius: 6, ...(i === 5 ? { background: INK.pr } : { border: `1.5px dashed ${INK.b10}` }) }} />
          ))}
        </div>
        <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 10 }}>Trends start after the first full week.</p>
      </Card>
    );
  }
  if (!rows) return <ProCardSkeleton lines={3} height={200} />;
  if (rows.every((r) => !r || r.planned === 0)) {
    return (
      <Card>
        <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>{title}</p>
        <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 10 }}>{lane === "nutrition" ? "Nothing planned in these weeks." : "No workouts planned in these weeks."}</p>
      </Card>
    );
  }
  const max = Math.max(1, ...rows.map((r) => Math.max(r?.planned ?? 0, r?.completed ?? 0)));
  return (
    <div style={{ marginBottom: 12 }}>
      <ProChart
        title={title}
        x={x}
        min={0}
        max={max}
        series={[
          { key: "done", label: "Actual", type: "line", color: "rgb(var(--th-7d6bb5))", values: rows.map((r) => r?.completed ?? null) },
          { key: "plan", label: "Planned", type: "line", color: INK.tealDark, dashed: true, values: rows.map((r) => r?.planned ?? null) },
        ]}
        tooltip={(i) => (rows[i] ? { title: x[i], lines: [`${rows[i]!.completed} of ${rows[i]!.planned} done`] } : null)}
        summary={`${title}: ${rows.map((r, i) => `${x[i]} ${r?.completed ?? 0} of ${r?.planned ?? 0}`).join(", ")}.`}
      />
    </div>
  );
};

const RecentActivity: React.FC<{ data: ClientPageData; lane: ProLane }> = ({ data }) => {
  const { rel, access } = data;
  const rows: ListRow[] = [];
  if (access.has("workout_activity") && rel?.workout) rows.push({ key: "w", icon: Dumbbell, title: "Logged a workout", meta: rel.workout.trainedToday ? "Today" : fmtDay(rel.workout.lastSessionDate) });
  if (access.has("food_diary") && rel?.nutrition)
    rows.push({ key: "f", icon: UtensilsCrossed, title: `Logged ${rel.nutrition.entryCount} item${rel.nutrition.entryCount === 1 ? "" : "s"}`, meta: `${fmtDay(rel.nutrition.lastLoggedDate)} · ${Math.round(rel.nutrition.calories).toLocaleString("en-GB")} kcal` });
  if (access.has("weight") && rel?.lastWeightKg != null) rows.push({ key: "kg", icon: Scale, title: `Weighed in at ${rel.lastWeightKg} kg`, meta: "Latest reading" });
  if (access.has("blood_pressure") && rel?.bloodPressure?.[0]) rows.push({ key: "bp", icon: HeartPulse, title: `Shared a BP reading: ${rel.bloodPressure[0].systolic}/${rel.bloodPressure[0].diastolic}`, meta: fmtDay(rel.bloodPressure[0].recordedAt) });
  if (!rows.length) return null;
  return (
    <>
      <SectionHead label="Recent activity" />
      <ListCard rows={rows.slice(0, 3)} />
    </>
  );
};

// ---------------------------------------------------------------------------

const PREF_FIELDS: { key: keyof CommunicationPreferences; label: string; placeholder: string; short: string }[] = [
  { key: "pronouns", label: "Pronouns", placeholder: "e.g. she/her", short: "Pronouns" },
  { key: "contactStyle", label: "Preferred contact style", placeholder: "e.g. Direct and brief", short: "Contact style" },
  { key: "reminderPreference", label: "Reminder preference", placeholder: "e.g. Weekly, not daily", short: "Reminders" },
  { key: "communicationBoundaries", label: "Communication boundaries", placeholder: "e.g. No messages after 8 PM", short: "Boundaries" },
];

const AboutCard: React.FC<{ data: ClientPageData; lane: ProLane }> = ({ data }) => {
  const { updateProfessionalClient } = useApp();
  const { rel, access, clientId } = data;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CommunicationPreferences>({ pronouns: null, contactStyle: null, reminderPreference: null, communicationBoundaries: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [social, setSocial] = useState<{ for: string; value: SocialHandles } | null>(null);
  const [phase, setPhase] = useState<string | null | undefined>(undefined);
  const [preg, setPreg] = useState<{ pregnant: boolean; week: number | null } | null | undefined>(undefined);
  const phaseOn = access.has("cycle_phase");
  const pregOn = access.has("pregnancy");

  useEffect(() => {
    let live = true;
    void fetchClientSocialHandles(clientId).then((h) => live && setSocial(h ? { for: clientId, value: h } : null));
    return () => {
      live = false;
    };
  }, [clientId]);
  useEffect(() => {
    if (!phaseOn) return;
    let live = true;
    void fetchClientCyclePhase(clientId).then((r) => live && setPhase(r.ok ? r.phase : null));
    return () => {
      live = false;
    };
  }, [clientId, phaseOn]);
  useEffect(() => {
    if (!pregOn) return;
    let live = true;
    void fetchPregnancySummary(clientId).then((r) => live && setPreg(r.ok ? r.data : null));
    return () => {
      live = false;
    };
  }, [clientId, pregOn]);

  const current: CommunicationPreferences = useMemo(
    () => ({ pronouns: rel?.pronouns ?? null, contactStyle: rel?.contactStyle ?? null, reminderPreference: rel?.reminderPreference ?? null, communicationBoundaries: rel?.communicationBoundaries ?? null }),
    [rel]
  );
  const anyPref = PREF_FIELDS.some((f) => current[f.key]);
  const handles = social && social.for === clientId ? social.value : null;

  const save = async () => {
    if (!rel) return;
    setBusy(true);
    setError(null);
    const r = await saveCommunicationPreferences(rel.id, draft);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    updateProfessionalClient(rel.id, {
      pronouns: draft.pronouns?.trim() || undefined,
      contactStyle: draft.contactStyle?.trim() || undefined,
      reminderPreference: draft.reminderPreference?.trim() || undefined,
      communicationBoundaries: draft.communicationBoundaries?.trim() || undefined,
    });
    setEditing(false);
  };

  const label: React.CSSProperties = { fontSize: textPx(10.5), fontWeight: 600, letterSpacing: "0.11em", textTransform: "uppercase", color: INK.chF };
  const pregnancyWord = preg?.pregnant ? (preg.week ? `Pregnant, week ${preg.week}` : "Pregnant") : null;

  return (
    <>
      <SectionHead label="About" />
      <Card>
        <div className="flex items-center justify-between" style={{ gap: 8 }}>
          <p style={label}>Communication preferences</p>
          {rel && (
            <button
              type="button"
              onClick={() => {
                if (editing) return setEditing(false);
                setDraft(current);
                setError(null);
                setEditing(true);
              }}
              className="tap inline-flex items-center relative before:absolute before:-inset-3 before:content-['']"
              style={{ gap: 4, fontSize: textPx(11), fontWeight: 700, color: INK.prDeep }}
            >
              {!editing && <Pencil size={11} strokeWidth={2.2} aria-hidden />}
              {editing ? "Cancel" : "Edit"}
            </button>
          )}
        </div>
        {editing ? (
          <div className="flex flex-col" style={{ gap: 10, marginTop: 10 }}>
            {PREF_FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
                  {f.label}
                </span>
                <input
                  value={draft[f.key] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  maxLength={120}
                  className="w-full outline-none placeholder:text-charcoal-faint focus:ring-2 focus:ring-primary/20"
                  style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", fontSize: textPx(14), color: INK.ch }}
                />
              </label>
            ))}
            {error && (
              <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
                {error}
              </p>
            )}
            <CtaButton size="base" label="Save" loading={busy} onClick={() => void save()} />
          </div>
        ) : anyPref ? (
          <div className="flex flex-col" style={{ gap: 4, marginTop: 8 }}>
            {PREF_FIELDS.filter((f) => current[f.key]).map((f) => (
              <p key={f.key} style={{ fontSize: textPx(13), color: INK.chS, overflowWrap: "anywhere" }}>
                <span style={{ fontWeight: 600, color: INK.ch }}>{f.short}:</span> {current[f.key]}
              </p>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 8 }}>Nothing set yet.</p>
        )}

        {handles && (handles.instagram || handles.x) && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${INK.b06}` }}>
            <p style={label}>Social</p>
            <div className="flex flex-wrap" style={{ gap: "6px 16px", marginTop: 8 }}>
              {handles.instagram && (
                <a href={instagramUrl(handles.instagram)} target="_blank" rel="noopener noreferrer" aria-label={`Instagram @${handles.instagram} (opens in a new tab)`} className="underline underline-offset-2" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch }}>
                  Instagram @{handles.instagram}
                </a>
              )}
              {handles.x && (
                <a href={xUrl(handles.x)} target="_blank" rel="noopener noreferrer" aria-label={`X @${handles.x} (opens in a new tab)`} className="underline underline-offset-2" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch }}>
                  X @{handles.x}
                </a>
              )}
            </div>
          </div>
        )}

        {(phaseOn || pregOn) && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${INK.b06}` }}>
            <p className="flex items-center" style={{ ...label, gap: 6 }}>
              <Moon size={12} strokeWidth={2} aria-hidden />
              Cycle
            </p>
            <div className="flex flex-wrap" style={{ gap: 6, marginTop: 8 }}>
              {phaseOn &&
                (phase === undefined ? (
                  <span style={{ fontSize: textPx(12), color: INK.chF }}>Loading…</span>
                ) : phase === null ? (
                  <span style={{ fontSize: textPx(12), color: INK.chF }}>Couldn't load the cycle phase.</span>
                ) : phase === "unavailable" ? (
                  <span style={{ fontSize: textPx(12), color: INK.chF }}>{PHASE_UNAVAILABLE}</span>
                ) : (
                  <span className="inline-block" style={{ fontSize: textPx(11), fontWeight: 700, borderRadius: 9999, padding: "4px 10px", color: phaseThemeColor(phase as CyclePhase), background: phaseThemeColor(phase as CyclePhase, 0.12) }}>
                    {`${PHASE_LABEL[phase as CyclePhase] ?? phase}${phase === "menstrual" || phase === "pregnant" || phase === "hormonal_contraception" ? "" : " phase"}`}
                  </span>
                ))}
              {pregOn && preg !== undefined && pregnancyWord && (
                <span className="inline-block" style={{ fontSize: textPx(11), fontWeight: 700, borderRadius: 9999, padding: "4px 10px", background: INK.soft, color: INK.ch }}>
                  {pregnancyWord}
                </span>
              )}
              {pregOn && preg !== undefined && !pregnancyWord && !phaseOn && <span style={{ fontSize: textPx(12), color: INK.chF }}>No pregnancy recorded.</span>}
            </div>
          </div>
        )}
      </Card>
    </>
  );
};

const HabitsCard: React.FC<{ data: ClientPageData; lane: ProLane; onAsk: () => void }> = ({ data, onAsk }) => {
  const { authUserId } = useApp();
  const { access, clientId, today, firstName } = data;
  const [habits, setHabits] = useState<ClientHabit[] | null | undefined>(undefined);
  const on = access.has("habits");
  useEffect(() => {
    if (!on || !authUserId) return;
    let live = true;
    void fetchHabits(authUserId, clientId, shiftIso(today, -13)).then((r) => live && setHabits(r.ok ? r.data : null));
    return () => {
      live = false;
    };
  }, [on, authUserId, clientId, today]);

  return (
    <>
      <SectionHead label="Habits" />
      {!on ? (
        <LockLine
          className="mb-3"
          what="Habits"
          clientFirstName={firstName}
          action={
            <button type="button" onClick={onAsk} className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(11.5), fontWeight: 700, color: INK.prDeep }}>
              Ask to share
            </button>
          }
        />
      ) : habits === undefined ? (
        <ProCardSkeleton lines={2} />
      ) : habits === null ? (
        <SoftLine icon={Activity}>Couldn't load habits.</SoftLine>
      ) : habits.length === 0 ? (
        <SoftLine icon={Activity}>{`${firstName} isn't tracking any habits yet.`}</SoftLine>
      ) : (
        <ListCard
          rows={habits.map((h) => {
            let streak = 0;
            for (let i = 0; i < 14; i++) {
              if (h.doneDates.includes(shiftIso(today, -i))) streak++;
              else if (i > 0) break;
            }
            return {
              key: h.id,
              icon: Activity,
              title: h.label,
              meta: `${h.doneDates.length} of the last 14 days${streak > 1 ? ` · ${streak} days in a row` : ""}`,
              trailing: h.assignedByMe ? <span style={{ fontSize: textPx(10.5), fontWeight: 700, color: INK.tealDark }}>From you</span> : undefined,
            };
          })}
        />
      )}
    </>
  );
};

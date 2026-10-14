import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Info, Plus } from "lucide-react";
import { FixedHeader } from "../../components/ui/FixedHeader";
import { SegmentedTabs, type SegmentedTabItem } from "../../components/ui/SegmentedTabs";
import { PinnedSlot } from "../../components/ui/PinnedCta";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { Toast } from "../../components/ui/Toast";
import { useApp } from "../../context/AppContext";
import { CycleRing, PhaseBar } from "../../components/cycle/CycleRing";
import { CycleScrubber } from "../../components/cycle/CycleScrubber";
import { HormoneGraph } from "../../components/cycle/HormoneGraph";
import { LogDaySheet } from "../../components/cycle/LogDaySheet";
import { CycleInsightsTab } from "../../components/cycle/CycleInsightsTab";
import { CycleSettingsTab } from "../../components/cycle/CycleSettingsTab";
import { CycleSharingPage } from "../../components/cycle/CycleSharingPage";
import { TurnOffTrackingPopup } from "../../components/cycle/TurnOffTrackingPopup";
import { CycleCard, CycleFooter, CycleTitleRow, PopupButtons, Skeleton, hair, type, useCycleMode } from "../../components/cycle/cycleUi";
import { PregnancyOverview } from "../../components/pregnancy/PregnancyOverview";
import { StartPregnancyPage } from "../../components/pregnancy/StartPregnancyPage";
import { EndPregnancySheet } from "../../components/pregnancy/EndPregnancySheet";
import { deleteAllCycleData } from "../../services/cycle";
import { fetchMyGrants } from "../../services/consent";
import type { CyclePhase } from "../../services/cycle/types";
import { shiftDay } from "../../services/cycle/insights";
import { daysBetween, ovulationDayFrom } from "../../services/cycle/hormones";
import * as G from "../../services/cycle/guidance";
import * as PG from "../../services/pregnancy/guidance";
import { hasInAppHistory, useBack } from "../../hooks/useBack";
import { heroPatternGenericUrl } from "../../utils/assetUrls";

// The cycle tracker (HE1.10 Cycle · HE1.10.a Insights · HE1.10.b Settings,
// with HE1.10.b.1 and .b.3 as pages inside it and .b.4 / .b.5 as popups).
//
// THREE TABS, ONE PREDICTION. Overview, Insights and Settings all read the
// same `my_cycle_prediction()` row and the same logs, so they cannot disagree
// — and none of them re-derives a phase, a date or a confidence. The only
// arithmetic on this screen is backwards-looking (services/cycle/insights) or
// decorative (services/cycle/hormones).
//
// EVERY SENTENCE COMES FROM services/cycle/guidance, imported as `G`, so a
// reader can see at a glance that nothing on this page writes its own copy.
//
// THE TAB AND THE SUB-PAGE ARE IN THE URL (?tab=, ?page=): a sub-page is a
// history entry, so Back pops to Settings, and Contraception's Back falls
// back to this Settings tab when there is nothing to pop (V6-79). The page's
// own Back pops, or goes to Health (HE1).

type Tab = "overview" | "insights" | "settings";
const TABS: Tab[] = ["overview", "insights", "settings"];
const tabsFor = (pregnant: boolean): SegmentedTabItem[] => [
  { key: "overview", label: pregnant ? "Pregnancy" : "Cycle" },
  { key: "insights", label: "Insights" },
  { key: "settings", label: "Settings" },
];

const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const monthShort = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
/** "4 to 10 Oct" or "28 Sep to 2 Oct": a range, always (the database gives one). */
function shortRange(from: string, to: string): string {
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  if (from === to) return `${f.getDate()} ${monthShort(f)}`;
  if (f.getMonth() === t.getMonth()) return `${f.getDate()} to ${t.getDate()} ${monthShort(t)}`;
  return `${f.getDate()} ${monthShort(f)} to ${t.getDate()} ${monthShort(t)}`;
}
/** The same range with full month names, for the screen-reader sentence. */
function longRange(from: string, to: string): string {
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  const m = (d: Date) => d.toLocaleDateString("en-GB", { month: "long" });
  if (from === to) return `${f.getDate()} ${m(f)}`;
  if (f.getMonth() === t.getMonth()) return `${f.getDate()} to ${t.getDate()} ${m(t)}`;
  return `${f.getDate()} ${m(f)} to ${t.getDate()} ${m(t)}`;
}
/** "Thu 15 Oct". */
const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${d.getDate()} ${monthShort(d)}`;
};

export default function Cycle() {
  const navigate = useNavigate();
  const back = useBack("/app/health");
  const [params, setParams] = useSearchParams();
  const {
    authUserId,
    cycleSettings,
    cycleSettingsLoaded,
    cycleLogs,
    cyclePrediction,
    reloadCycle,
    saveCycleSettingsAndReload,
    pregnancy,
    lastEndedPregnancy,
    reloadPregnancy,
    cycleOffered,
    setCycleTracking,
    myTimezone,
    contraceptionPlan,
    recoverySensitive,
    recoveryModePending,
    colorTheme,
  } = useApp();
  const { dark, hc } = useCycleMode();

  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "overview";
  const page = params.get("page");

  const [offsetDays, setOffsetDays] = useState(0);
  const [logOpen, setLogOpen] = useState(false);
  const [logDate, setLogDate] = useState(todayISO());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [turnOffOpen, setTurnOffOpen] = useState(false);
  const [endPregnancyOpen, setEndPregnancyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sharedWith, setSharedWith] = useState<number | null>(null);

  const today = todayISO();
  const prediction = cyclePrediction;
  const settings = cycleSettings;
  // Recovery-sensitive mode hides the day count and the countdown (V6-18,
  // HE1.10 States "Other"). Pending counts as on until the account's setting
  // is known, so nothing flashes.
  const recovery = recoverySensitive || recoveryModePending;

  const setTab = (t: Tab) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (t === "overview") next.delete("tab");
        else next.set("tab", t);
        next.delete("page");
        return next;
      },
      { replace: true }
    );
  /** A sub-page is pushed, so Back pops to where it was opened from. */
  const openPage = (pg: "start-pregnancy" | "sharing") =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", pg);
      return next;
    });
  const closePage = () => {
    if (hasInAppHistory()) navigate(-1);
    else setParams({ tab: "settings" }, { replace: true });
  };

  // "Who can see your cycle phase" value: how many professionals see either
  // cycle category. Read once per visit to Settings (same grants table).
  useEffect(() => {
    if (tab !== "settings" || !authUserId) return;
    let live = true;
    void fetchMyGrants(authUserId).then((r) => {
      if (!live || r.status !== "ok") return;
      const n = Object.values(r.grants).filter((g) => g.cycle_phase === true || g.pregnancy === true).length;
      setSharedWith(n);
    });
    return () => {
      live = false;
    };
  }, [tab, authUserId]);

  const saveSettings = async (patch: Parameters<typeof saveCycleSettingsAndReload>[0]): Promise<boolean> => {
    setBusy(true);
    const result = await saveCycleSettingsAndReload(patch);
    setBusy(false);
    // Save fails: the value reverts (nothing local was changed) and the
    // shared-state toast says so (HE1.10.b O2).
    if (!result.ok) setToast(result.message ?? "Couldn't save. Try again.");
    return result.ok;
  };
  // MO11 / Task R: on/off goes through setCycleTracking (tracker_chosen_at).
  const turnOn = async () => {
    setBusy(true);
    const result = await setCycleTracking(true);
    setBusy(false);
    if (!result.ok) setToast(result.message ?? "Couldn't save. Try again.");
  };
  const onTrackerChange = (on: boolean) => {
    if (on) void turnOn();
    else setTurnOffOpen(true); // HE1.10.b.5 first; the switch moves only after Turn off.
  };

  const openLog = (date: string) => {
    setLogDate(date);
    setLogOpen(true);
  };

  // MO11: not offered the section (a male profile that has not opted in):
  // the page is not reachable from the app, and a direct link goes to Health.
  // WAIT FOR THE SETTINGS FIRST: until they load "not offered" is unknown.
  if (!cycleOffered) {
    if (!cycleSettingsLoaded) return null;
    return <Navigate to="/app/health" replace />;
  }

  // --- the sub-pages --------------------------------------------------------
  if (page === "start-pregnancy") {
    return (
      <StartPregnancyPage
        onBack={closePage}
        onStarted={() => {
          reloadPregnancy();
          reloadCycle();
          setParams({}, { replace: true });
        }}
      />
    );
  }
  if (page === "sharing") return <CycleSharingPage onBack={closePage} />;

  const header = (withTabs: boolean) => (
    <FixedHeader paddingBottom={withTabs ? 14 : 10} fillClassName="bg-cream dark:bg-[#1C1F28]">
      <CycleTitleRow title={G.PAGE_TITLE} onBack={back} />
      {withTabs && (
        <SegmentedTabs
          className="mt-3"
          items={tabsFor(pregnancy !== null)}
          activeKey={tab}
          onChange={(k) => setTab(k as Tab)}
          size="compact"
          darkTone="partB"
          idleInk="rgb(var(--c-charcoal-soft))"
        />
      )}
    </FixedHeader>
  );

  // The hero card (HE1.10 #8-#9): 358 × 180 r22 #F4F1FB (dark #2B2C3A, *
  // derived; other themes the generated primary tint) with the static p6
  // petal ring, drawn as a mask over the theme primary-deep so it themes.
  const heroBg = dark ? "rgb(var(--th-2b2c3a))" : colorTheme === "centium" ? "#F4F1FB" : "rgb(var(--th-f3f1fc))";
  const hero = (children: React.ReactNode, opts?: { pad?: string; label?: string; busy?: boolean }) => {
    const url = heroPatternGenericUrl(6);
    return (
      <section
        aria-label={opts?.label}
        aria-busy={opts?.busy || undefined}
        className="relative overflow-hidden"
        data-cycle-hero=""
        style={{ marginTop: 2, borderRadius: 22, minHeight: 180, padding: opts?.pad ?? "10px 0", background: heroBg }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          data-hero-pattern=""
          style={{
            background: "rgb(var(--c-primary-dark))",
            opacity: hc ? 0.5 : 1,
            WebkitMaskImage: `url(${url})`,
            maskImage: `url(${url})`,
            WebkitMaskSize: "cover",
            maskSize: "cover",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
        <div className="relative">{children}</div>
      </section>
    );
  };

  /** A centred card in the hero (OURS-cycle-empty-states #2, #3, #5). */
  const heroMessage = (title: string, body: React.ReactNode, action?: React.ReactNode) =>
    hero(
      <div className="text-center flex flex-col items-center justify-center" style={{ minHeight: 160, padding: "0 24px" }}>
        <p className="text-charcoal" style={type(15, 22.5, 700)}>
          {title}
        </p>
        <div className="text-charcoal-soft" style={type(12, 18, 400, { marginTop: 4 })}>
          {body}
        </div>
        {action}
      </div>,
      { pad: "20px 0" }
    );

  const startPregnancyLink = (
    <button type="button" onClick={() => openPage("start-pregnancy")} className="tap w-full text-primary-dark" style={{ marginTop: 6, minHeight: 44, ...type(13, 19.5, 700) }}>
      {PG.START_TITLE}
    </button>
  );

  const pinnedCta = (primary: { label: string; onClick: () => void }, backToToday?: { active: boolean; onClick: () => void }) => (
    <PinnedSlot>
      <div className="flex" style={{ gap: 8 }}>
        <button
          type="button"
          onClick={primary.onClick}
          data-cta="log"
          className="tap min-w-0 inline-flex items-center justify-center bg-fill-pinned text-on-primary-fill active:brightness-[0.92]"
          style={{ flex: backToToday ? "201.1 1 0" : "1 1 0", height: 48, borderRadius: 14, gap: 8, ...type(14, 21, 700) }}
        >
          <Plus size={16} aria-hidden style={{ color: "rgb(var(--c-on-primary-fill))" }} />
          <span className="truncate">{primary.label}</span>
        </button>
        {backToToday && (
          // HE1.10 #49 / HE1.10.d #49: always shown; on today a paler,
          // not-tappable fill (#F6F4FC / #B3A9DE; dark #262932 / #575170, *
          // derived), away from today #EFECF9 with #7D6BB5 (dark #303141 /
          // #C3B3FB). Animates back (the ring's own turn); static under
          // Reduce motion.
          <button
            type="button"
            onClick={backToToday.onClick}
            disabled={!backToToday.active}
            aria-disabled={!backToToday.active || undefined}
            data-cta="today"
            className="tap min-w-0 inline-flex items-center justify-center"
            style={{
              flex: "148.9 1 0",
              height: 48,
              borderRadius: 14,
              ...type(14, 21, 700),
              background: backToToday.active ? (dark ? "rgb(var(--th-303141))" : "rgb(var(--th-efecf9))") : dark ? "#262932" : "#F6F4FC",
              color: backToToday.active ? "rgb(var(--c-primary-dark))" : dark ? "#575170" : "#B3A9DE",
              cursor: backToToday.active ? undefined : "default",
            }}
          >
            <span className="truncate">{G.BACK_TO_TODAY}</span>
          </button>
        )}
      </div>
    </PinnedSlot>
  );

  const sheets = (
    <>
      <LogDaySheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        date={logDate}
        onSaved={reloadCycle}
        onStartPregnancy={
          pregnancy
            ? undefined
            : () => {
                setLogOpen(false);
                openPage("start-pregnancy");
              }
        }
      />
      {pregnancy && (
        <EndPregnancySheet
          open={endPregnancyOpen}
          onClose={() => setEndPregnancyOpen(false)}
          pregnancyId={pregnancy.id}
          onEnded={() => {
            reloadPregnancy();
            reloadCycle();
          }}
        />
      )}
      <TurnOffTrackingPopup open={turnOffOpen} onClose={() => setTurnOffOpen(false)} onError={(m) => setToast(m)} />
      {/* HE1.10.b.4: centred popup 350 r24 pad 20; DELETE_ALL_BODY verbatim
          in a red-tint box (#FCEDEC, dark #3C2A30) with Info 16; Keep my
          data / Delete everything (#C0392B). A failure keeps the popup open
          with the line. After delete: the Cycle tab with the setup card. */}
      <CentredPopup
        open={confirmDelete}
        onClose={() => {
          if (!busy) {
            setConfirmDelete(false);
            setDeleteError(null);
          }
        }}
        title={G.DELETE_ALL_TITLE}
        geometry="partB"
        align="start"
      >
        <div className="flex" style={{ marginTop: -4, gap: 10, padding: "12px 14px", borderRadius: 14, background: dark ? "#3C2A30" : "#FCEDEC" }}>
          <Info size={16} aria-hidden className="shrink-0 text-status-high" style={{ marginTop: 1 }} />
          <p className="text-charcoal" style={type(12.5, 18.8, 400)}>
            {G.DELETE_ALL_BODY}
          </p>
        </div>
        {deleteError && (
          <p role="alert" className="text-status-high" style={type(11.5, 17.3, 600, { marginTop: 10 })}>
            {deleteError}
          </p>
        )}
        <div style={{ marginTop: 16 }}>
          <PopupButtons
            cancel={G.DELETE_ALL_KEEP}
            onCancel={() => {
              setConfirmDelete(false);
              setDeleteError(null);
            }}
            confirm={G.DELETE_ALL_CONFIRM}
            destructive
            busy={busy}
            onConfirm={async () => {
              setBusy(true);
              setDeleteError(null);
              const result = await deleteAllCycleData();
              setBusy(false);
              if (!result.ok) {
                setDeleteError(G.DELETE_ALL_FAILED);
                return;
              }
              setConfirmDelete(false);
              reloadCycle();
              reloadPregnancy();
              setOffsetDays(0);
              setTab("overview");
            }}
          />
        </div>
      </CentredPopup>
      <Toast open={toast !== null} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );

  // --- no settings row at all ----------------------------------------------
  //
  // NEVER OPENED THE TRACKER: a male profile that has not opted in (the
  // seeding effect in AppContext creates the row for female and other). The
  // one switch this account can reach is here, because writing the row is
  // what brings the tabs into existence.
  if (cycleSettingsLoaded && !settings && !pregnancy) {
    return (
      <div className="animate-fade-slide-up" style={{ paddingBottom: 96 }}>
        {header(false)}
        {heroMessage(
          G.TRACKER_OFF_TITLE,
          G.TRACKER_OFF_BODY,
          <button
            type="button"
            disabled={busy}
            onClick={() => void turnOn()}
            className="tap bg-fill-pinned text-on-primary-fill disabled:opacity-40"
            style={{ marginTop: 14, height: 48, borderRadius: 14, padding: "0 20px", ...type(14, 21, 700) }}
          >
            {G.TRACKER_OFF_CTA}
          </button>
        )}
        {startPregnancyLink}
        <CycleFooter />
        {sheets}
      </div>
    );
  }

  // --- loading (HE1.10 O1): header and tabs at once, the hero as a ring
  // placeholder and chip skeletons.
  if (!settings) {
    return (
      <div style={{ paddingBottom: 96 }}>
        {header(true)}
        {hero(
          <div className="flex items-center justify-center" style={{ height: 160 }}>
            <span aria-hidden className="block rounded-full animate-skeleton-pulse" style={{ width: 127, height: 127, border: `8px solid ${dark ? "#242730" : "#F5F5F6"}` }} />
          </div>,
          { label: "Loading", busy: true }
        )}
        <div className="flex justify-center" style={{ gap: 6, marginTop: 8 }}>
          <Skeleton width={70} height={24} radius={12} />
          <Skeleton width={112} height={24} radius={12} />
          <Skeleton width={100} height={24} radius={12} />
        </div>
      </div>
    );
  }

  const trackerOff = !settings.trackerEnabled;

  // --- the selected day -----------------------------------------------------
  const selectedDate = shiftDay(today, offsetDays);
  const cycleLength = settings.typicalCycleLength;
  const currentDay = prediction?.cycleDay ?? 1;
  // The scrubber moves through the CYCLE, so day 1 + offset wraps at the
  // predicted length rather than running off the end of it.
  const selectedDay = ((((currentDay - 1 + offsetDays) % cycleLength) + cycleLength) % cycleLength) + 1;
  const ovulationDay = ovulationDayFrom(prediction?.cycleDay ?? null, today, prediction?.ovulationEstimate ?? null);
  const isNatural = prediction !== null && prediction.phase !== "hormonal_contraception" && prediction.phase !== "pregnant";

  /** Which phase a given cycle day falls in, for colouring the ring. */
  const phaseOfDay = (day: number): CyclePhase => {
    if (!isNatural) return prediction?.phase ?? "menstrual";
    if (day <= settings.typicalPeriodLength) return "menstrual";
    if (ovulationDay !== null) {
      if (day >= ovulationDay - 1 && day <= ovulationDay + 1) return "ovulatory";
      return day < ovulationDay ? "follicular" : "luteal";
    }
    const ovu = cycleLength - settings.lutealLength;
    if (day >= ovu - 1 && day <= ovu + 1) return "ovulatory";
    return day < ovu ? "follicular" : "luteal";
  };
  const selectedPhase = phaseOfDay(selectedDay);
  const phaseName = G.PHASE_LABEL[selectedPhase];

  // --- the centre text (repo headline rule, on three lines) ------------------
  // Away from today: the date, "Day N", the phase. On a period day "Period ·
  // Day N". Otherwise "Period in N days" and the day. Recovery-sensitive
  // mode: no day count and no countdown, only the date and the phase.
  let lines: [string, string, string] = ["", "", ""];
  let spoken = "";
  if (prediction) {
    if (recovery) {
      lines = [offsetDays === 0 ? "Today" : dayLabel(selectedDate), phaseName, ""];
      spoken = `${phaseName} phase.`;
    } else if (offsetDays !== 0) {
      lines = [dayLabel(selectedDate), `Day ${selectedDay}`, phaseName];
      spoken = `Cycle day ${selectedDay} of about ${cycleLength}. ${dayLabel(selectedDate)}. ${phaseName} phase.`;
    } else if (selectedPhase === "menstrual" && isNatural) {
      lines = ["Period", `Day ${selectedDay}`, ""];
      spoken = `Cycle day ${selectedDay} of about ${cycleLength}. Period, day ${selectedDay}.`;
    } else if (prediction.nextPeriodStart) {
      const days = daysBetween(today, prediction.nextPeriodStart);
      lines = days <= 0 ? ["Period", "due", `Day ${selectedDay}`] : ["Period in", `${days} day${days === 1 ? "" : "s"}`, `Day ${selectedDay}`];
      spoken = `Cycle day ${selectedDay} of about ${cycleLength}. ${days <= 0 ? "Period due" : `Period in ${days} day${days === 1 ? "" : "s"}`}. ${phaseName} phase.`;
    } else {
      lines = ["", `Day ${selectedDay}`, phaseName];
      spoken = `Cycle day ${selectedDay} of about ${cycleLength}. ${phaseName} phase.`;
    }
    if (prediction.nextPeriodFrom && prediction.nextPeriodTo)
      spoken += ` Next period expected ${longRange(prediction.nextPeriodFrom, prediction.nextPeriodTo)}, an estimate.`;
  }

  const relative = offsetDays === 0 ? "" : offsetDays > 0 ? `in ${offsetDays} day${offsetDays === 1 ? "" : "s"}` : `${-offsetDays} day${offsetDays === -1 ? "" : "s"} ago`;
  const scrubLabel = recovery
    ? offsetDays === 0
      ? "Today"
      : dayLabel(selectedDate)
    : offsetDays === 0
      ? `Today · Day ${selectedDay}`
      : `Day ${selectedDay} · ${relative}`;
  const scrubValueText = `${recovery ? "" : `Day ${selectedDay}, `}${phaseName.toLowerCase()}, ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })}`;

  const selectDay = (day: number) => {
    let delta = day - selectedDay;
    if (delta > cycleLength / 2) delta -= cycleLength;
    if (delta < -cycleLength / 2) delta += cycleLength;
    setOffsetDays(Math.max(-cycleLength, Math.min(cycleLength, offsetDays + delta)));
  };

  const chip = (label: React.ReactNode, kind: "phase" | "fertile" | "confidence") => (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full"
      data-chip={kind}
      style={{
        height: 24,
        padding: "0 10px",
        ...type(11, 16.5, 700),
        background: kind === "phase" ? "rgb(var(--c-primary) / 0.22)" : "rgb(var(--c-cream-soft))",
        color: kind === "phase" ? "rgb(var(--c-primary-deep-text))" : kind === "fertile" ? "rgb(var(--c-charcoal-soft))" : "rgb(var(--c-charcoal-faint))",
      }}
    >
      {label}
    </span>
  );

  // ================= OVERVIEW =================
  let overview: React.ReactNode = null;
  if (tab === "overview") {
    if (pregnancy) {
      // K1: THE PREGNANCY VIEW REPLACES THE CYCLE VIEW, rather than sitting
      // above it. A ring predicting a period beside a pregnancy week count
      // would be two answers to one question.
      overview = <PregnancyOverview pregnancy={pregnancy} onLogDay={() => openLog(today)} hero={hero} />;
    } else if (!prediction) {
      overview = (
        <>
          {trackerOff
            ? lastEndedPregnancy?.outcome === "loss"
              ? heroMessage(
                  PG.LOSS_TITLE,
                  <>
                    <p>{PG.LOSS_BODY}</p>
                    <p style={{ marginTop: 6 }}>{PG.LOSS_SUPPORT}</p>
                  </>,
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void turnOn()}
                    className="tap bg-fill-pinned text-on-primary-fill disabled:opacity-40"
                    style={{ marginTop: 14, height: 48, borderRadius: 14, padding: "0 20px", ...type(14, 21, 700) }}
                  >
                    {PG.LOSS_RESUME}
                  </button>
                )
              : heroMessage(
                  G.TRACKER_OFF_TITLE,
                  G.TRACKER_OFF_KEEPS_DATA,
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void turnOn()}
                    className="tap bg-fill-pinned text-on-primary-fill disabled:opacity-40"
                    style={{ marginTop: 14, height: 48, borderRadius: 14, padding: "0 20px", ...type(14, 21, 700) }}
                  >
                    {G.TURN_BACK_ON}
                  </button>
                )
            : heroMessage(G.SETUP_TITLE, G.SETUP_BODY)}
          {startPregnancyLink}
          <CycleFooter />
          {!trackerOff && pinnedCta({ label: G.LOG_THIS_DAY, onClick: () => openLog(today) })}
        </>
      );
    } else {
      overview = (
        <>
          {hero(
            <CycleRing
              cycleLength={cycleLength}
              selectedDay={selectedDay}
              phaseOfDay={phaseOfDay}
              lines={lines}
              hideNumber={recovery}
              onSelectDay={selectDay}
              ariaLabel={spoken}
            />,
            { label: "Cycle" }
          )}

          <div className="flex flex-wrap items-center justify-center" style={{ gap: 6, marginTop: 8 }}>
            {chip(phaseName, "phase")}
            {/* The fertile window as a RANGE, labelled an estimate, and only
                for a natural cycle (K5). */}
            {isNatural &&
              prediction.fertileFrom &&
              prediction.fertileTo &&
              chip(
                <>
                  Fertile {shortRange(prediction.fertileFrom, prediction.fertileTo)}
                  <span className="sr-only">, estimate</span>
                </>,
                "fertile"
              )}
            {prediction.confidence && chip(G.CONFIDENCE_LABEL[prediction.confidence], "confidence")}
          </div>

          {isNatural && (
            <div style={{ marginTop: 14 }}>
              <PhaseBar phases={G.PHASE_BAR} active={selectedPhase} />
            </div>
          )}

          <div style={{ marginTop: isNatural ? 17 : 22 }}>
            <CycleScrubber
              min={-cycleLength}
              max={cycleLength}
              value={offsetDays}
              onChange={setOffsetDays}
              centreLabel={scrubLabel}
              valueText={scrubValueText}
            />
          </div>

          {/* The hormone card (#29-#37). K5: hormonal contraception or a
              pregnancy shows the repo sentence instead of curves. */}
          <CycleCard padding="12px 14px" style={{ marginTop: 14 }}>
            {prediction.phase === "hormonal_contraception" ? (
              <p className="text-charcoal-soft" style={type(12, 18, 400)}>
                {G.HORMONE_HIDDEN_CONTRACEPTION}
              </p>
            ) : prediction.phase === "pregnant" ? (
              <p className="text-charcoal-soft" style={type(12, 18, 400)}>
                {G.HORMONE_HIDDEN_PREGNANT}
              </p>
            ) : ovulationDay !== null ? (
              <HormoneGraph cycleLength={cycleLength} ovulationDay={ovulationDay} selectedDay={selectedDay} hideDayLabel={recovery} />
            ) : (
              <p className="text-charcoal-soft" style={type(12, 18, 400)}>
                {G.NO_PREDICTION}
              </p>
            )}
          </CycleCard>

          {/* Below the fold (#38-#46): top hairline, pad 16 0 0. */}
          <div style={{ marginTop: 22, paddingTop: 16, borderTop: `0.5px solid ${hair(dark, hc)}` }}>
            <p className="text-center text-charcoal-soft" style={type(12, 18, 400, { padding: "0 8px" })}>
              {G.PHASE_DESCRIPTION[selectedPhase]}
            </p>
            {prediction.confidence && (
              <p className="text-center text-charcoal-faint" style={type(10.5, 15.8, 400, { marginTop: 4 })}>
                {G.CONFIDENCE_WHY[prediction.confidence]}
              </p>
            )}
            {/* THE RANGE, NOT JUST THE DATE: next_period_from..to is what the
                function actually predicts. */}
            {prediction.nextPeriodFrom && prediction.nextPeriodTo && (
              <p className="text-center text-charcoal" style={type(12.5, 18.8, 700, { marginTop: 12 })}>
                Next period expected {shortRange(prediction.nextPeriodFrom, prediction.nextPeriodTo)}
              </p>
            )}
            <CycleFooter />
          </div>

          {pinnedCta(
            { label: G.LOG_THIS_DAY, onClick: () => openLog(selectedDate) },
            { active: offsetDays !== 0, onClick: () => setOffsetDays(0) }
          )}
        </>
      );
    }
  }

  const pinned = tab === "overview" && !pregnancy && !(trackerOff && !prediction);

  return (
    <div className="animate-fade-slide-up" style={{ paddingBottom: pinned ? 176 : 96 }} data-cycle-page="main">
      {header(true)}

      {overview}

      {tab === "insights" && <CycleInsightsTab logs={cycleLogs} lutealLength={settings.lutealLength} prediction={prediction} />}

      {tab === "settings" && (
        <CycleSettingsTab
          settings={settings}
          busy={busy}
          save={saveSettings}
          onTrackerChange={onTrackerChange}
          pregnancy={pregnancy}
          lastEndedPregnancy={lastEndedPregnancy}
          today={today}
          method={contraceptionPlan?.method ?? null}
          timezone={myTimezone?.timezone ?? null}
          sharedWith={sharedWith}
          onStartPregnancy={() => openPage("start-pregnancy")}
          onEndPregnancy={() => setEndPregnancyOpen(true)}
          onResume={() => void turnOn()}
          onContraception={() => navigate("/app/contraception")}
          onReminders={() => navigate("/app/settings/notifications")}
          onTimezone={() => navigate("/app/settings#timezone")}
          onSharing={() => openPage("sharing")}
          onDeleteAll={() => setConfirmDelete(true)}
        />
      )}

      {sheets}
    </div>
  );
}

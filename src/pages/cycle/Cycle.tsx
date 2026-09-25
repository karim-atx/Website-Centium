import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { SegmentedTabs, type SegmentedTabItem } from "../../components/ui/SegmentedTabs";
import { useApp } from "../../context/AppContext";
import { CycleRing, PhaseBar } from "../../components/cycle/CycleRing";
import { PHASE_COLOR } from "../../services/cycle/guidance";
import { HormoneGraph } from "../../components/cycle/HormoneGraph";
import { LogDaySheet } from "../../components/cycle/LogDaySheet";
import { browserTimezone, deleteAllCycleData, knownTimezones } from "../../services/cycle";
import {
  CONDITIONS,
  SETTINGS_LIMITS,
  type Condition,
  type CyclePhase,
} from "../../services/cycle/types";
import { cycleStats, hasEnoughForInsights, shiftDay, symptomGrid } from "../../services/cycle/insights";
import { daysBetween, ovulationDayFrom } from "../../services/cycle/hormones";
import * as G from "../../services/cycle/guidance";
import * as PG from "../../services/pregnancy/guidance";
import { PregnancyOverview } from "../../components/pregnancy/PregnancyOverview";
import { StartPregnancySheet } from "../../components/pregnancy/StartPregnancySheet";
import { EndPregnancySheet } from "../../components/pregnancy/EndPregnancySheet";
import { gestationOn } from "../../services/pregnancy";
import { ChevronLeft, ChevronRight, Info, Plus, Trash2 } from "lucide-react";

// The cycle tracker.
//
// THREE TABS, ONE PREDICTION. Overview, Insights and Settings all read the
// same `my_cycle_prediction()` row and the same logs, so they cannot disagree
// — and none of them re-derives a phase, a date or a confidence. The only
// arithmetic on this screen is backwards-looking (services/cycle/insights) or
// decorative (services/cycle/hormones).
//
// EVERY SENTENCE COMES FROM services/cycle/guidance, imported as `G` so that
// a reader can see at a glance that nothing on this page writes its own copy.

type Tab = "overview" | "insights" | "settings";
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

export default function Cycle() {
  const navigate = useNavigate();
  const {
    user,
    cycleSettings,
    cycleSettingsLoaded,
    cycleLogs,
    cyclePrediction,
    reloadCycle,
    saveCycleSettingsAndReload,
    pregnancy,
    lastEndedPregnancy,
    reloadPregnancy,
  } = useApp();

  const [tab, setTab] = useState<Tab>("overview");
  const [offsetDays, setOffsetDays] = useState(0);
  const [logOpen, setLogOpen] = useState(false);
  const [logDate, setLogDate] = useState(todayISO());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [startPregnancyOpen, setStartPregnancyOpen] = useState(false);
  const [endPregnancyOpen, setEndPregnancyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();
  const prediction = cyclePrediction;
  const settings = cycleSettings;

  // SWITCHED OFF IS NOT THE SAME AS NOTHING LOGGED YET, and the difference
  // decides which of the three "no prediction" screens this is.
  // my_cycle_prediction() returns nothing for all of them.
  const trackerOff = settings !== null && !settings.trackerEnabled;

  // --- no settings row at all ----------------------------------------------
  //
  // NEVER OPENED THE TRACKER, which for a female or other profile lasts about
  // one render — the seeding effect in AppContext creates the row. It persists
  // for a male profile, which gets no row created for it, and that is the case
  // this branch is really for: a full-page setup card, because there is no row
  // for a Settings tab to edit yet.
  if (cycleSettingsLoaded && !settings && !pregnancy) {
    return (
      <div className="animate-fade-slide-up">
        <BackRow onBack={() => navigate(-1)} />
        <Card className="text-center py-8">
          <p className="text-[15px] font-bold text-charcoal mb-1.5">{G.SETUP_TITLE}</p>
          <p className="text-[12.5px] text-charcoal-soft leading-relaxed px-2 mb-4">{G.SETUP_BODY}</p>
          <Button
            onClick={() => {
              setLogDate(today);
              setLogOpen(true);
            }}
          >
            <Plus size={14} /> {G.SETUP_CTA}
          </Button>
        </Card>
        <button
          onClick={() => setStartPregnancyOpen(true)}
          className="tap w-full mt-2 py-2 text-[12px] font-semibold text-primary-dark"
        >
          {PG.START_TITLE}
        </button>
        <p className="mt-2 text-[10.5px] text-charcoal-faint text-center">{G.DISCLAIMER}</p>
        <LogDaySheet
          open={logOpen}
          onClose={() => setLogOpen(false)}
          date={logDate}
          onSaved={reloadCycle}
          onStartPregnancy={() => {
            setLogOpen(false);
            setStartPregnancyOpen(true);
          }}
        />
        <StartPregnancySheet
          open={startPregnancyOpen}
          onClose={() => setStartPregnancyOpen(false)}
          onStarted={() => {
            reloadPregnancy();
            reloadCycle();
          }}
        />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="animate-fade-slide-up">
        <BackRow onBack={() => navigate(-1)} />
        <Card className="text-center py-8">
          <p className="text-sm text-charcoal-faint">Loading…</p>
        </Card>
      </div>
    );
  }

  // --- the selected day -----------------------------------------------------
  const selectedDate = shiftDay(today, offsetDays);
  const cycleLength = settings.typicalCycleLength;
  const currentDay = prediction?.cycleDay ?? 1;
  // The scrubber moves through the CYCLE, so day 1 + offset wraps at the
  // predicted length rather than running off the end of it.
  const selectedDay = ((currentDay - 1 + offsetDays) % cycleLength + cycleLength) % cycleLength + 1;

  const ovulationDay = ovulationDayFrom(
    prediction?.cycleDay ?? null,
    today,
    prediction?.ovulationEstimate ?? null
  );
  const isNatural =
    prediction !== null &&
    prediction.phase !== "hormonal_contraception" &&
    prediction.phase !== "pregnant";

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

  // --- the headline ---------------------------------------------------------
  let headline: string;
  let subline: string | null = null;
  if (!prediction) {
    headline = "";
  } else if (prediction.phase === "pregnant") {
    headline = prediction.pregnancyWeek !== null ? `Week ${prediction.pregnancyWeek}` : "Pregnant";
    subline = prediction.trimester !== null ? `Trimester ${prediction.trimester}` : null;
  } else if (offsetDays !== 0) {
    headline = `Day ${selectedDay}`;
    subline = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } else if (selectedPhase === "menstrual") {
    headline = `Period · Day ${selectedDay}`;
  } else if (prediction.nextPeriodStart) {
    const days = daysBetween(today, prediction.nextPeriodStart);
    headline = days <= 0 ? "Period due" : `Period in ${days} day${days === 1 ? "" : "s"}`;
    subline = `Day ${selectedDay}`;
  } else {
    headline = `Day ${selectedDay}`;
  }

  const stats = cycleStats(cycleLogs);
  const grid = symptomGrid(cycleLogs, settings.lutealLength);
  const enoughForInsights = hasEnoughForInsights(cycleLogs);

  const saveSettings = async (patch: Parameters<typeof saveCycleSettingsAndReload>[0]) => {
    setBusy(true);
    setError(null);
    const result = await saveCycleSettingsAndReload(patch);
    setBusy(false);
    if (!result.ok) setError(result.message ?? "Couldn't save that.");
  };

  return (
    <div className="animate-fade-slide-up">
      <BackRow onBack={() => navigate(-1)} />
      <SegmentedTabs
        items={tabsFor(pregnancy !== null)}
        activeKey={tab}
        onChange={(k) => setTab(k as Tab)}
      />

      {error && (
        <p className="mt-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {error}
        </p>
      )}

      {/* ================= OVERVIEW ================= */}
      {/* THE PREGNANCY VIEW REPLACES THE CYCLE VIEW, rather than sitting above
          it. A ring predicting a period beside a pregnancy week count would be
          two answers to one question — which is also why the database's
          prediction reports 'pregnant' and nothing else. */}
      {tab === "overview" && pregnancy && (
        <PregnancyOverview
          pregnancy={pregnancy}
          onLogDay={() => {
            setLogDate(today);
            setLogOpen(true);
          }}
        />
      )}

      {/* NO PREDICTION YET, WITH THE TABS STILL THERE. This used to be a
          page-wide takeover, which hid Settings — and with it the tracker
          switch, the time zone and the way in to contraception — from anybody
          who had not logged a period, and stranded anybody who switched the
          tracker off with no route back to the switch. It is tab content now.
          Three different cards, because "off", "after a loss" and "nothing
          logged yet" are three different things to say. */}
      {tab === "overview" && !pregnancy && !prediction && (
        <div className="mt-4">
          {!trackerOff ? (
            <>
              <Card className="text-center py-8">
                <p className="text-[15px] font-bold text-charcoal mb-1.5">{G.SETUP_TITLE}</p>
                <p className="text-[12.5px] text-charcoal-soft leading-relaxed px-2 mb-4">
                  {G.SETUP_BODY}
                </p>
                <Button
                  onClick={() => {
                    setLogDate(today);
                    setLogOpen(true);
                  }}
                >
                  <Plus size={14} /> {G.SETUP_CTA}
                </Button>
              </Card>
              <button
                onClick={() => setStartPregnancyOpen(true)}
                className="tap w-full mt-2 py-2 text-[12px] font-semibold text-primary-dark"
              >
                {PG.START_TITLE}
              </button>
              <p className="mt-2 text-[10.5px] text-charcoal-faint text-center">{G.DISCLAIMER}</p>
            </>
          ) : lastEndedPregnancy?.outcome === "loss" ? (
            <Card className="text-center py-7">
              <p className="text-[15px] font-bold text-charcoal mb-1.5">{PG.LOSS_TITLE}</p>
              <p className="text-[12.5px] text-charcoal-soft leading-relaxed px-2">
                {PG.LOSS_BODY}
              </p>
              <p className="mt-2 text-[12.5px] text-charcoal-soft leading-relaxed px-2 mb-4">
                {PG.LOSS_SUPPORT}
              </p>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void saveSettings({ trackerEnabled: true })}
              >
                {PG.LOSS_RESUME}
              </Button>
            </Card>
          ) : (
            <Card className="text-center py-7">
              <p className="text-[13px] font-bold text-charcoal mb-1.5">Cycle tracking is off</p>
              <p className="text-[12.5px] text-charcoal-soft leading-relaxed px-2 mb-4">
                {G.TRACKER_OFF_KEEPS_DATA}
              </p>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void saveSettings({ trackerEnabled: true })}
              >
                Turn it back on
              </Button>
            </Card>
          )}
        </div>
      )}

      {tab === "overview" && !pregnancy && prediction && (
        <div className="mt-4">
          <CycleRing
            cycleLength={cycleLength}
            selectedDay={selectedDay}
            phaseOfDay={phaseOfDay}
            headline={headline}
            subline={subline}
          />

          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 mb-1">
            <span
              className="text-[11px] font-bold rounded-full px-2.5 py-1"
              style={{ color: PHASE_COLOR[selectedPhase], background: `${PHASE_COLOR[selectedPhase]}1F` }}
            >
              {G.PHASE_LABEL[selectedPhase]}
            </span>
            {/* The fertile window as a RANGE, because that is how the database
                gives it — a single "fertile day" would be a precision the
                estimate does not have. */}
            {isNatural && prediction.fertileFrom && prediction.fertileTo && (
              <span className="text-[11px] font-semibold rounded-full px-2.5 py-1 bg-cream-soft text-charcoal-soft">
                Fertile {shortRange(prediction.fertileFrom, prediction.fertileTo)}
              </span>
            )}
            {prediction.confidence && (
              <span className="text-[11px] font-semibold rounded-full px-2.5 py-1 bg-cream-soft text-charcoal-faint">
                {G.CONFIDENCE_LABEL[prediction.confidence]}
              </span>
            )}
          </div>

          <p className="text-[11px] text-charcoal-soft text-center leading-relaxed px-3 mb-1">
            {G.PHASE_DESCRIPTION[selectedPhase]}
          </p>
          {prediction.confidence && (
            <p className="text-[10.5px] text-charcoal-faint text-center mb-3">
              {G.CONFIDENCE_WHY[prediction.confidence]}
            </p>
          )}

          {/* THE RANGE, NOT JUST THE DATE. next_period_from..to is what the
              function actually predicts; printing only next_period_start would
              drop the uncertainty it went to the trouble of computing. */}
          {prediction.nextPeriodFrom && prediction.nextPeriodTo && (
            <p className="text-[11px] text-charcoal-soft text-center mb-3">
              Next period expected {shortRange(prediction.nextPeriodFrom, prediction.nextPeriodTo)}
            </p>
          )}

          {isNatural && <PhaseBar phases={G.PHASE_BAR} active={selectedPhase} />}

          {/* --- the scrubber --- */}
          <div className="mt-4">
            <input
              type="range"
              min={-cycleLength}
              max={cycleLength}
              value={offsetDays}
              onChange={(e) => setOffsetDays(Number(e.target.value))}
              aria-label="Move through the cycle"
              className="w-full accent-primary"
            />
            <div className="flex items-center justify-between mt-1">
              <button
                onClick={() => setOffsetDays(0)}
                disabled={offsetDays === 0}
                className="tap text-[11px] font-semibold text-primary-dark disabled:opacity-40"
              >
                Back to today
              </button>
              <button
                onClick={() => {
                  setLogDate(selectedDate);
                  setLogOpen(true);
                }}
                className="tap text-[11px] font-semibold text-primary-dark"
              >
                Log this day
              </button>
            </div>
          </div>

          {/* --- the hormone illustration --- */}
          <Card className="mt-4">
            {prediction.phase === "hormonal_contraception" ? (
              <p className="text-[11.5px] leading-relaxed text-charcoal-soft">
                {G.HORMONE_HIDDEN_CONTRACEPTION}
              </p>
            ) : prediction.phase === "pregnant" ? (
              <p className="text-[11.5px] leading-relaxed text-charcoal-soft">
                {G.HORMONE_HIDDEN_PREGNANT}
              </p>
            ) : ovulationDay !== null ? (
              <HormoneGraph
                cycleLength={cycleLength}
                ovulationDay={ovulationDay}
                selectedDay={selectedDay}
              />
            ) : (
              <p className="text-[11.5px] leading-relaxed text-charcoal-soft">
                {G.NO_PREDICTION}
              </p>
            )}
          </Card>

          <p className="mt-4 text-[10.5px] font-semibold text-charcoal-faint text-center">
            {G.DISCLAIMER}
          </p>
          <p className="mt-1 text-[10px] leading-[1.45] text-charcoal-faint text-center px-2">
            {G.DISCLAIMER_LONG}
          </p>
        </div>
      )}

      {/* ================= INSIGHTS ================= */}
      {tab === "insights" && (
        <div className="mt-4">
          {!enoughForInsights ? (
            <Card className="text-center py-7">
              <p className="text-[12.5px] text-charcoal-soft leading-relaxed px-2">
                {G.INSIGHTS_TOO_LITTLE}
              </p>
            </Card>
          ) : (
            <>
              <Card className="mb-3">
                <p className="text-[11px] font-bold text-charcoal mb-2.5">Cycle length</p>
                <div className="flex items-end gap-1.5 h-[70px]">
                  {stats.history.map((c) => {
                    const max = Math.max(...stats.history.map((h) => h.days));
                    return (
                      <div key={c.startDate} className="flex-1 flex flex-col items-center justify-end">
                        <span className="text-[9.5px] font-bold text-charcoal tabular-nums mb-1">
                          {c.days}
                        </span>
                        <div
                          className="w-full rounded-t-[3px]"
                          style={{ height: `${(c.days / max) * 48}px`, background: PHASE_COLOR.luteal }}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10px] text-charcoal-faint text-center">
                  Last {stats.history.length} cycle{stats.history.length === 1 ? "" : "s"}, in days
                </p>
              </Card>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <Stat label="Avg cycle" value={stats.averageCycle} unit="days" />
                <Stat label="Avg period" value={stats.averagePeriod} unit="days" />
                <Stat label="Variation" value={stats.variationDays} unit="days" />
              </div>

              {prediction !== null && prediction.flags.length > 0 && (
                <Card className="mb-3">
                  <p className="text-[11px] font-bold text-charcoal mb-2">{G.FLAGS_HEADING}</p>
                  <div className="space-y-2.5">
                    {prediction.flags.map((f) => (
                      <div key={f}>
                        <p className="text-[12px] font-semibold text-charcoal">{G.FLAG_TITLE[f]}</p>
                        <p className="text-[11px] text-charcoal-soft leading-snug">
                          {G.FLAG_BODY[f]} {G.FLAG_ADVICE}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card>
                <p className="text-[11px] font-bold text-charcoal mb-2.5">Symptoms by phase</p>
                {grid.symptoms.length === 0 ? (
                  <p className="text-[11.5px] text-charcoal-soft leading-relaxed">
                    {G.SYMPTOM_GRID_TOO_LITTLE}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10.5px]" style={{ minWidth: 300 }}>
                      <thead>
                        <tr>
                          <th className="text-left font-semibold text-charcoal-faint pb-1.5">Symptom</th>
                          {G.PHASE_BAR.map((p) => (
                            <th key={p} className="font-semibold text-charcoal-faint pb-1.5 px-1">
                              {G.PHASE_LABEL[p]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {grid.symptoms.map((sym) => (
                          <tr key={sym}>
                            <td className="py-1 text-charcoal font-medium">{G.SYMPTOM_LABEL[sym]}</td>
                            {G.PHASE_BAR.map((p) => {
                              const n = grid.counts[sym]?.[p] ?? 0;
                              return (
                                <td key={p} className="py-1 px-1 text-center tabular-nums">
                                  <span
                                    className="inline-flex items-center justify-center w-6 h-6 rounded-md font-bold"
                                    style={{
                                      background: n > 0 ? `${PHASE_COLOR[p]}22` : "transparent",
                                      color: n > 0 ? PHASE_COLOR[p] : "rgb(var(--c-charcoal-disabled))",
                                    }}
                                  >
                                    {n || "·"}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {/* ================= SETTINGS ================= */}
      {tab === "settings" && (
        <div className="mt-4">
          <Card className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-charcoal">Cycle tracking</p>
              <p className="text-[11px] text-charcoal-faint leading-snug">
                {settings.trackerEnabled ? G.TRACKER_OFF_KEEPS_DATA : "Switch it on to start tracking."}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={settings.trackerEnabled}
              aria-label="Cycle tracking"
              disabled={busy}
              onClick={() => void saveSettings({ trackerEnabled: !settings.trackerEnabled })}
              className={`tap shrink-0 w-11 h-6 rounded-full transition-colors ${
                settings.trackerEnabled ? "bg-primary" : "bg-charcoal/20"
              }`}
            >
              <span
                className="block w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: settings.trackerEnabled ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </Card>

          <Card className="mb-3">
            <NumberRow
              label="Typical cycle length"
              unit="days"
              value={settings.typicalCycleLength}
              min={SETTINGS_LIMITS.cycleLength.min}
              max={SETTINGS_LIMITS.cycleLength.max}
              disabled={busy}
              onChange={(v) => void saveSettings({ typicalCycleLength: v })}
            />
            <NumberRow
              label="Typical period length"
              unit="days"
              value={settings.typicalPeriodLength}
              min={SETTINGS_LIMITS.periodLength.min}
              max={SETTINGS_LIMITS.periodLength.max}
              disabled={busy}
              onChange={(v) => void saveSettings({ typicalPeriodLength: v })}
            />
            <NumberRow
              label="Luteal length"
              unit="days"
              value={settings.lutealLength}
              min={SETTINGS_LIMITS.lutealLength.min}
              max={SETTINGS_LIMITS.lutealLength.max}
              disabled={busy}
              onChange={(v) => void saveSettings({ lutealLength: v })}
            />
          </Card>

          {/* --- pregnancy --- */}
          <Card className="mb-3">
            {pregnancy ? (
              <>
                <p className="text-[13px] font-bold text-charcoal">Pregnancy tracking</p>
                {(() => {
                  const g = gestationOn(today, pregnancy);
                  return g ? (
                    <p className="mt-0.5 text-[11px] text-charcoal-faint">
                      Week {g.week} · day {g.day} · trimester {g.trimester}
                    </p>
                  ) : null;
                })()}
                <button
                  onClick={() => setEndPregnancyOpen(true)}
                  className="tap mt-2.5 text-[12px] font-semibold text-primary-dark"
                >
                  {PG.END_TITLE}
                </button>
              </>
            ) : (
              <>
                <p className="text-[13px] font-bold text-charcoal">{PG.START_TITLE}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-charcoal-faint">
                  {PG.START_BODY}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2.5"
                  onClick={() => setStartPregnancyOpen(true)}
                >
                  <Plus size={13} /> Start
                </Button>
              </>
            )}
          </Card>

          {/* AFTER A LOSS, THE ONE THING THIS SCREEN OFFERS IS A WAY BACK.
              Predictions are paused by tracker_enabled being false, which is
              the switch at the top of this tab — this card says so in words
              and turns it back on, so nobody has to work out that the general
              "Cycle tracking" toggle is the thing standing between them and
              their estimates. */}
          {!pregnancy &&
            lastEndedPregnancy?.outcome === "loss" &&
            !settings.trackerEnabled && (
              <Card className="mb-3">
                <p className="text-[13px] font-bold text-charcoal">{PG.LOSS_TITLE}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-charcoal-soft">
                  {PG.LOSS_BODY}
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-charcoal-soft">
                  {PG.LOSS_SUPPORT}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2.5"
                  disabled={busy}
                  onClick={() => void saveSettings({ trackerEnabled: true })}
                >
                  {PG.LOSS_RESUME}
                </Button>
              </Card>
            )}

          {/* AFTER A BIRTH, predictions are already running again — this says
              how rough they will be rather than offering a switch. */}
          {!pregnancy &&
            lastEndedPregnancy?.outcome === "birth" &&
            lastEndedPregnancy.postpartumUntil !== null &&
            lastEndedPregnancy.postpartumUntil >= today && (
              <Card className="mb-3">
                <p className="text-[13px] font-bold text-charcoal">{PG.POSTPARTUM_TITLE}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-charcoal-soft">
                  {PG.POSTPARTUM_BODY}
                </p>
              </Card>
            )}

          {/* --- time zone --- */}
          <Card className="mb-3">
            <p className="text-[13px] font-bold text-charcoal">{G.TIMEZONE_TITLE}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-charcoal-faint">
              {G.TIMEZONE_BODY}
            </p>
            <TimezoneRow
              value={settings.timezone}
              disabled={busy}
              onChange={(tz) => void saveSettings({ timezone: tz })}
            />
          </Card>

          {/* --- contraception --- */}
          <button
            onClick={() => navigate("/app/contraception")}
            className="tap w-full mb-3"
          >
            <Card className="flex items-center justify-between gap-3">
              <div className="min-w-0 text-left">
                <p className="text-[13px] font-bold text-charcoal">Contraception</p>
                <p className="text-[11px] text-charcoal-faint leading-snug">
                  Set up a method, log it, and choose reminders.
                </p>
              </div>
              <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
            </Card>
          </button>


          <Card className="mb-3">
            <p className="text-[11px] font-bold text-charcoal mb-2">Conditions</p>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => {
                const on = settings.conditions.includes(c);
                return (
                  <Chip
                    key={c}
                    active={on}
                    onClick={() =>
                      void saveSettings({
                        conditions: on
                          ? settings.conditions.filter((x) => x !== c)
                          : ([...settings.conditions, c] as Condition[]),
                      })
                    }
                  >
                    {G.CONDITION_LABEL[c]}
                  </Chip>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] leading-[1.45] text-charcoal-faint">{G.CONDITIONS_HELP}</p>
          </Card>

          <button
            onClick={() => setConfirmDelete(true)}
            className="tap w-full flex items-center justify-center gap-1.5 py-3 text-[12.5px] font-semibold text-status-high"
          >
            <Trash2 size={14} /> {G.DELETE_ALL_TITLE}
          </button>
        </div>
      )}

      <BottomSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={G.DELETE_ALL_TITLE}
      >
        <div className="animate-fade-slide-up">
          <div className="flex gap-2.5 rounded-2xl bg-status-high-bg px-3.5 py-3 mb-4">
            <Info size={15} className="text-status-high shrink-0 mt-0.5" />
            <p className="text-[12px] leading-[1.5] text-charcoal">{G.DELETE_ALL_BODY}</p>
          </div>
          <div className="flex gap-2">
            <Button fullWidth variant="secondary" onClick={() => setConfirmDelete(false)}>
              Keep my data
            </Button>
            <Button
              fullWidth
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const result = await deleteAllCycleData();
                setBusy(false);
                setConfirmDelete(false);
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                reloadCycle();
                setTab("overview");
                setOffsetDays(0);
              }}
            >
              {G.DELETE_ALL_CONFIRM}
            </Button>
          </div>
        </div>
      </BottomSheet>

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
                setStartPregnancyOpen(true);
              }
        }
      />

      <StartPregnancySheet
        open={startPregnancyOpen}
        onClose={() => setStartPregnancyOpen(false)}
        onStarted={() => {
          reloadPregnancy();
          reloadCycle();
          setTab("overview");
        }}
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

      {/* Kept so the page reads correctly for an account whose profile says
          male — the tracker is available to anyone who switches it on. */}
      {user.sex === "male" && settings.trackerEnabled && <span className="sr-only">Cycle tracking is on.</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------

function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="tap flex items-center gap-1 mb-2 text-[12px] font-semibold text-charcoal-soft">
      <ChevronLeft size={15} /> Back
    </button>
  );
}

/**
 * The zone picker.
 *
 * A <select> OF THE ENGINE'S OWN LIST, not a hand-kept one, because the
 * database validates against pg_timezone_names and a stale hard-coded list
 * would offer names the write then refuses. Where the engine cannot enumerate
 * them, the only options are whatever is stored and the device's own — which
 * is what almost everybody wants anyway, and is reachable in one tap either
 * way.
 */
function TimezoneRow({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (tz: string) => void;
}) {
  const device = browserTimezone();
  const all = knownTimezones();
  const options = all.length > 0 ? all : [...new Set([value, device].filter(Boolean) as string[])];

  return (
    <>
      <select
        value={value}
        disabled={disabled}
        aria-label={G.TIMEZONE_TITLE}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2.5 rounded-xl bg-cream-soft px-3.5 py-2.5 text-[13px] text-charcoal disabled:opacity-50"
      >
        {/* A zone the engine does not list — set on another device, or since
            renamed — would otherwise vanish from its own picker. */}
        {!options.includes(value) && <option value={value}>{value}</option>}
        {options.map((tz) => (
          <option key={tz} value={tz}>
            {tz.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {device && device !== value && (
        <button
          onClick={() => onChange(device)}
          disabled={disabled}
          className="tap mt-1.5 text-[11.5px] font-semibold text-primary-dark disabled:opacity-40"
        >
          {G.TIMEZONE_USE_DEVICE} ({device.replace(/_/g, " ")})
        </button>
      )}
    </>
  );
}

function Stat({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="text-center bg-cream-soft rounded-xl py-2.5">
      {/* A NULL IS A DASH, never a zero: a zero-day cycle is not a cycle. */}
      <p className="text-[15px] font-bold text-charcoal tabular-nums">{value ?? "—"}</p>
      <p className="text-[9.5px] text-charcoal-faint">
        {label}
        {value !== null && ` · ${unit}`}
      </p>
    </div>
  );
}

function NumberRow({
  label,
  unit,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <p className="text-[12.5px] text-charcoal">{label}</p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label}`}
          className="tap w-7 h-7 rounded-full bg-cream-soft text-charcoal font-bold disabled:opacity-40"
        >
          −
        </button>
        <span className="text-[13px] font-bold text-charcoal tabular-nums w-12 text-center">
          {value} {unit === "days" ? "d" : unit}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label}`}
          className="tap w-7 h-7 rounded-full bg-cream-soft text-charcoal font-bold disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

/** "26–28 Sep" or "28 Sep – 2 Oct" — a range, always. */
function shortRange(from: string, to: string): string {
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  const day = (d: Date) => d.getDate();
  const month = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
  if (from === to) return `${day(f)} ${month(f)}`;
  if (f.getMonth() === t.getMonth()) return `${day(f)}–${day(t)} ${month(t)}`;
  return `${day(f)} ${month(f)} – ${day(t)} ${month(t)}`;
}

import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { ProfessionalClient, ProfessionalSubtype } from "../../types";
import {
  UtensilsCrossed,
  Dumbbell,
  Scale,
  TrendingUp,
  HeartPulse,
  Activity,
  ClipboardList,
  Check,
  X as XIcon,
  UserMinus,
  MessageCircle,
  Droplet,
  Stethoscope,
  Ruler,
  Moon,
} from "lucide-react";
import {
  averageReading,
  BP_CATEGORIES,
  categoryCounts,
  classifyBloodPressure,
} from "../../services/blood-pressure/classify";
import {
  BP_CATEGORY_COLOR,
  BP_CATEGORY_LABEL,
  BP_NONE_LOGGED,
  BP_NOT_SHARED,
} from "../../services/blood-pressure/guidance";
import {
  PHASE_COLOR,
  PHASE_LABEL,
  PHASE_NOT_SHARED,
  PHASE_UNAVAILABLE,
  PREGNANCY_NOT_SHARED,
} from "../../services/cycle/guidance";
import { TRIMESTER_ORDINAL } from "../../services/pregnancy/guidance";
import type { CyclePhase } from "../../services/cycle/types";
import { ACCESS_CATEGORIES, accessKeyFor } from "../../services/consent";
import { MEASUREMENT_SITES } from "../../services/measurements/sites";
import { GOAL_LABEL } from "../../services/measurements/trend";
import { PERSON_ICON } from "../../utils/icons";
import { formatDisplayDate } from "../../utils/date";
import { HealthDataPending } from "./HealthDataPending";
import { ClientClinicalRecords, type ClinicalFileRequest } from "./ClientClinicalRecords";
import { FileViewerSheet } from "../health/FileViewerSheet";
import { nutritionLine } from "../../utils/nutritionDisplay";

const activityTypeLabel: Record<string, string> = {
  cardio: "Cardio",
  strength: "Strength training",
  both: "Cardio + Strength",
};

// V7 (QA 7.0): clinical notes are "highlighted and colored based on the
// category written" in the client dashboard's Health Metrics section.
// QA 13.0: comorbidities/previous surgeries/medications moved out of here —
// they're no longer professional-typed free text, they're synced read-only
// from `client.medicalHistory` (see the block below), same as
// HealthMetricsTab.tsx.
const noteFields: {
  key: "currentInjuries" | "personalityType";
  label: string;
  className: string;
}[] = [
  { key: "currentInjuries", label: "Current injuries", className: "bg-gold-pale text-charcoal" },
  { key: "personalityType", label: "Personality type", className: "bg-charcoal/[0.06] text-charcoal-soft" },
];

export const ClientDetailSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  client: ProfessionalClient | null;
  professionalSubtype?: ProfessionalSubtype;
}> = ({ open, onClose, client, professionalSubtype }) => {
  const {
    assignProgramToClient,
    assignFoodTemplateToClient,
    removeProfessionalClient,
    clientHealthNotes,
    workoutTemplates,
    customMeals,
    updateProfessionalClient,
  } = useApp();
  const [assigningProgram, setAssigningProgram] = useState(false);
  const [assigningTemplate, setAssigningTemplate] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ClinicalFileRequest | null>(null);
  const [editingPrefs, setEditingPrefs] = useState(false);

  if (!client) return null;

  // Now calls disconnect_client_relationship(). The two-tap confirm is
  // unchanged; only what the second tap does has changed — it ends a real
  // relationship server-side rather than splicing a local array.
  const handleRemove = async () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      setTimeout(() => setConfirmRemove(false), 3000);
      return;
    }
    setRemoveError(null);
    const result = await removeProfessionalClient(client.id);
    if (!result.ok) {
      setRemoveError(result.message ?? "Could not remove that client. Try again.");
      setConfirmRemove(false);
      return;
    }
    onClose();
  };

  const isDietitian = professionalSubtype === "dietitian";

  // DERIVED FROM ACCESS_CATEGORIES, not restated here. This list was written
  // out by hand and went stale the moment the consent split added lab_results
  // and medical_history: it showed five of the seven categories, so a
  // professional checking what they were allowed to see got an answer missing
  // the two most sensitive entries -- and once medical history is actually
  // rendered above, an unlisted category would be shown without ever being
  // named. Deriving it means the next category to be added cannot be
  // forgotten here, and the labels stay identical to the ones the client
  // agreed to rather than drifting into a second wording.
  const accessIcons: Record<string, typeof UtensilsCrossed> = {
    foodDiary: UtensilsCrossed,
    workoutActivity: Dumbbell,
    weight: Scale,
    progress: TrendingUp,
    healthMetrics: HeartPulse,
    labResults: Droplet,
    medicalHistory: Stethoscope,
  };
  const accessRows: { key: keyof ProfessionalClient["access"]; label: string; icon: typeof UtensilsCrossed }[] =
    ACCESS_CATEGORIES.map((c) => ({
      key: accessKeyFor[c.category] as keyof ProfessionalClient["access"],
      label: c.label,
      icon: accessIcons[accessKeyFor[c.category]] ?? ClipboardList,
    }));

  const note = clientHealthNotes[client.id] ?? {};
  const activeNotes = noteFields.filter((f) => note[f.key]?.trim());

  return (
    <>
    <BottomSheet open={open} onClose={onClose} hideHeader>
      <div className="space-y-5 animate-fade-slide-up">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
            <PERSON_ICON size={20} className="text-primary-dark" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-charcoal">
                {client.prefix ? `${client.prefix} ` : ""}
                {client.name}
              </p>
            </div>
            <p className="text-xs text-charcoal-faint">Client since {formatDisplayDate(client.joinedAt)}</p>
          </div>
        </div>

        {/* Task X: NOTHING HERE SAYS WHETHER A CLIENT HAS RECOVERY-SENSITIVE
            MODE ON, and nothing changes because of it. It is the client's
            private setting (recovery_mode_settings, owner-only); the demo
            switch, badge, "Meal rhythm" view and "Clinical data" panel that
            used to stand in for it are gone. Every client is shown the same
            way, governed only by what they chose to share. */}

        {/* V7 (QA 7.0): performance summary — metrics important to the
            professional at a glance, before the per-section detail below.
            QA 12.0 recovery-sensitive: "remove from the nutritionist's
            primary dashboard: Large calorie totals... Weight-loss
            progress... Automated 'under/over target' alerts... Unsolicited
            feedback generated from calories, food quantity, or body
            metrics." Calories and weight move to the restricted Clinical
            data panel further down instead of showing here by default. */}
        {/* Only when there is genuinely nothing to show. Previously gated on
            `lastWeightKg`, which meant a client actively sharing their food
            diary was still told their data was "coming soon". */}
        {!client.access.foodDiary &&
          client.lastWeightKg === undefined &&
          !client.access.workoutActivity && (
            <HealthDataPending label="Client activity & nutrition" />
          )}

        <div className="grid grid-cols-2 gap-2.5">
          {client.access.foodDiary && (
            <div className="bg-cream-soft rounded-2xl p-3.5">
              {/* Kept as "Calories consumed", not renamed to "Food diary":
                  the standalone Food Diary card below already owns that
                  heading, and the two showing the same title read as a
                  duplicate rather than a summary and a detail. They do show
                  the same figure — that redundancy predates this change and
                  is left alone rather than redesigned here. */}
              <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
                Calories consumed
              </p>
              {/* Was `(lastCaloriesKcal ?? 0).toLocaleString()` — a confident
                  zero for a client whose intake was simply unknown. */}
              <p className="text-lg font-bold text-charcoal">
                {client.nutrition
                  ? `${client.nutrition.calories.toLocaleString()} kcal`
                  : nutritionLine(client.access, client.nutrition)}
              </p>
              {client.nutrition && (
                <p className="text-[11px] text-charcoal-faint mt-0.5">
                  {formatDisplayDate(client.nutrition.lastLoggedDate)}
                </p>
              )}
            </div>
          )}
          {client.access.workoutActivity && (
            <div className="bg-cream-soft rounded-2xl p-3.5">
              <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
                Workout logged
              </p>
              {/* Was a bare Today / "Not yet" with a cross icon. "Not yet"
                  read as a verdict on someone who might simply have trained
                  yesterday, and the cross made it a scolding. The date states
                  the same fact without either. */}
              {client.workout ? (
                <p
                  className={`text-lg font-bold flex items-center gap-1 ${
                    client.workout.trainedToday ? "text-primary-dark" : "text-charcoal"
                  }`}
                >
                  {client.workout.trainedToday && <Check size={16} />}
                  {client.workout.trainedToday
                    ? "Today"
                    : formatDisplayDate(client.workout.lastSessionDate)}
                </p>
              ) : (
                <p className="text-sm font-semibold text-charcoal-soft">
                  {client.workout === null ? "No sessions yet" : "Loading workouts…"}
                </p>
              )}
            </div>
          )}
          {client.lastWeightKg !== undefined && (
            <div className="bg-cream-soft rounded-2xl p-3.5">
              <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
                Current weight
              </p>
              <p className="text-lg font-bold text-charcoal">
                {client.access.weight ? `${client.lastWeightKg} kg` : "–"}
              </p>
            </div>
          )}
        </div>

        {client.access.foodDiary && (
          <div className="bg-cream-soft rounded-2xl p-4">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              Food Diary
            </p>
            {client.nutrition ? (
              <>
                <p className="text-xl font-bold text-charcoal">
                  {client.nutrition.calories.toLocaleString()} kcal
                </p>
                <p className="text-xs text-charcoal-faint">
                  {formatDisplayDate(client.nutrition.lastLoggedDate)} ·{" "}
                  {client.nutrition.entryCount} item
                  {client.nutrition.entryCount === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-charcoal-faint mt-1">
                  {Math.round(client.nutrition.protein)}g protein · {Math.round(client.nutrition.carbs)}g carbs ·{" "}
                  {Math.round(client.nutrition.fat)}g fat
                </p>
              </>
            ) : (
              // The old markup printed "0 kcal / Last logged day" here
              // unconditionally, so an unknown diary read as a measured zero.
              <p className="text-sm font-semibold text-charcoal-soft">
                {nutritionLine(client.access, client.nutrition)}
              </p>
            )}
          </div>
        )}
        {isDietitian ? (
          // Activity level comes from the client's own profile and is not
          // read here yet — hidden rather than rendered blank.
          client.activityLevel && (
            <div className="bg-cream-soft rounded-2xl p-4">
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
                Activity Level
              </p>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-primary" />
                <span className="text-sm font-semibold text-charcoal capitalize">
                  {client.activityLevel.replace("_", " ")}
                </span>
                {client.activityType && (
                  <span className="text-xs text-charcoal-faint">
                    · {activityTypeLabel[client.activityType]}
                  </span>
                )}
              </div>
            </div>
          )
        ) : (
          client.access.workoutActivity && (
            <div className="bg-cream-soft rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
                  Workout Activity
                </p>
                <button
                  onClick={() => setAssigningProgram((v) => !v)}
                  className="text-xs font-semibold text-primary"
                >
                  {client.assignedProgramName ? "Change" : "Assign"}
                </button>
              </div>
              <p className="text-sm font-semibold text-charcoal">
                {client.assignedProgramName ?? "No program assigned yet"}
              </p>
              {assigningProgram && (
                // V9 (QA 9.0): "Assigning workout... template should only
                // show templates created in the templates... page" — was
                // the generic mock workoutPrograms catalog, not anything
                // this professional actually built in Templates.
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {workoutTemplates.length === 0 ? (
                    <p className="text-xs text-charcoal-faint">
                      No templates yet. Build one in the Templates tab.
                    </p>
                  ) : (
                    workoutTemplates.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          assignProgramToClient(client.id, p.name);
                          setAssigningProgram(false);
                        }}
                        className="tap text-xs font-semibold bg-primary-pale text-primary-dark rounded-full px-3 py-1.5"
                      >
                        {p.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        )}

        <div className="bg-cream-soft rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
              Food Template
            </p>
            <button
              onClick={() => setAssigningTemplate((v) => !v)}
              className="text-xs font-semibold text-primary"
            >
              {client.assignedFoodTemplateName ? "Change" : "Assign"}
            </button>
          </div>
          <p className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
            <ClipboardList size={14} className="text-charcoal-faint" />
            {client.assignedFoodTemplateName ?? "No template assigned yet"}
          </p>
          {assigningTemplate && (
            // V9 (QA 9.0): "...food template should only show templates
            // created in... the meal plans page" — the professional's own
            // customMeals (built in Meal Plans), not the generic food catalog.
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {customMeals.length === 0 ? (
                <p className="text-xs text-charcoal-faint">
                  No meal plans yet. Build one in the Meal Plans tab.
                </p>
              ) : (
                customMeals.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      assignFoodTemplateToClient(client.id, f.title);
                      setAssigningTemplate(false);
                    }}
                    className="tap text-xs font-semibold bg-primary-pale text-primary-dark rounded-full px-3 py-1.5"
                  >
                    {f.title}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {client.access.weight && (
          <div className="bg-cream-soft rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1">Weight</p>
              {/* NO READING, NO NUMBER. `{client.lastWeightKg} kg` rendered a
                  bare "kg" for a client who has logged none, and the trend
                  beside it read `?? 0` — so a client with no weight history at
                  all was shown a downward arrow and a zero, which is a finding
                  nobody measured. */}
              <p className="text-xl font-bold text-charcoal">
                {client.lastWeightKg != null ? `${client.lastWeightKg} kg` : "–"}
              </p>
            </div>
            {client.weightTrend != null && (
              <span
                className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                  client.weightTrend <= 0
                    ? "text-primary-deep-text bg-primary-pale"
                    : "text-charcoal-soft dark:text-teal-deep-text bg-teal-pale"
                }`}
              >
                {client.weightTrend <= 0 ? "↓" : "↑"} {Math.abs(client.weightTrend)} kg
              </span>
            )}
          </div>
        )}

        {/* V8 (QA 8.0): "clinical notes must show on the client dashboard
            regardless of the healthMetrics sharing toggle" — that toggle only
            controls the client's own auto-synced tracking data; the
            professional's private clinical notes aren't something the client
            shares or withholds, so they render unconditionally below. */}
        {/* Opens for ANY of the four reasons independently. It previously
            keyed off healthMetrics, notes, or a non-empty medical history --
            so a client sharing only their bloods, or sharing medical history
            with nothing yet recorded in it, would have had the whole section
            hidden and no way to tell it existed. Each grant stands alone. */}
        {(client.access.healthMetrics ||
          client.access.bodyMeasurements ||
          client.access.medicalHistory ||
          client.access.labResults ||
          client.access.bloodPressure ||
          client.access.cyclePhase ||
          client.access.pregnancy ||
          activeNotes.length > 0) && (
          <div className="bg-cream-soft rounded-2xl p-4">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
              <HeartPulse size={13} /> Health Metrics
            </p>
            {/* SLEEP AND STEPS, AVERAGED FROM REAL ROWS. What stood here was
                `healthSummary` — a body fat percentage, a sleep average and a
                step average, typed as optional and assigned by nothing, so
                the figures never appeared and the type promised them anyway.
                Body fat moves out of this block entirely: it is a
                body-measurement and rides on that grant, not on vitals. */}
            {client.access.healthMetrics ? (
              client.vitals ? (
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-sm font-bold text-charcoal">
                      {client.vitals.sleepHours != null ? `${client.vitals.sleepHours}h` : "–"}
                    </p>
                    <p className="text-[10px] text-charcoal-faint">Sleep avg</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-charcoal">
                      {client.vitals.stepsAvg != null ? client.vitals.stepsAvg.toLocaleString() : "–"}
                    </p>
                    <p className="text-[10px] text-charcoal-faint">Steps avg</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-charcoal-faint">Loading…</p>
              )
            ) : (
              <p className="text-xs text-charcoal-faint">Not sharing activity &amp; vitals.</p>
            )}

            {/* BODY MEASUREMENTS, BEHIND THEIR OWN CATEGORY. Database
                20260924320000 kept these out of the vitals policy on purpose:
                adding them would have retroactively widened every existing
                health_metrics grant, so a client who ticked a box meaning
                "steps, water, sleep" would have started sharing their waist
                without touching anything. Sharing vitals shows nothing here. */}
            <div className="mt-3 pt-3 border-t border-charcoal/[0.06]">
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                <Ruler size={13} /> Body measurements
              </p>
              {!client.access.bodyMeasurements ? (
                <p className="text-xs text-charcoal-faint">Not sharing body measurements.</p>
              ) : !client.measurements ? (
                <p className="text-xs text-charcoal-faint">Loading…</p>
              ) : Object.keys(client.measurements).length === 0 ? (
                <p className="text-xs text-charcoal-faint">No measurements logged yet.</p>
              ) : (
                <div className="flex flex-wrap" style={{ gap: 8 }}>
                  {MEASUREMENT_SITES.filter((site) => client.measurements?.[site.type]).map((site) => {
                    const reading = client.measurements![site.type]!;
                    return (
                      <div
                        key={site.type}
                        className="bg-cream-soft rounded-xl"
                        style={{ padding: "8px 11px", minWidth: 86 }}
                      >
                        <p className="text-sm font-bold text-charcoal">
                          {reading.value}
                          <span className="text-[10px] font-medium text-charcoal-faint">
                            {site.unit === "%" ? "%" : " cm"}
                          </span>
                        </p>
                        <p className="text-[10px] text-charcoal-faint">{site.label}</p>
                        {/* WO16: the client's goal for this measurement, when set. */}
                        {reading.goal && (
                          <p className="text-[10px] text-charcoal-faint">
                            Goal: <span className="font-semibold text-charcoal">{GOAL_LABEL[reading.goal]}</span>
                          </p>
                        )}
                        {/* Null on a first reading: there is nothing to have
                            changed from, and +0.0 would claim a stability
                            nobody measured. */}
                        {reading.change != null && reading.change !== 0 && (
                          <p
                            className="text-[10px] font-semibold"
                            style={{ color: reading.change > 0 ? "#8A5878" : "rgb(var(--thi-3c6b65))" }}
                          >
                            {reading.change > 0 ? "+" : ""}
                            {reading.change}
                            {site.unit === "%" ? "%" : " cm"}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Blood pressure, on its own grant for the same reason body
                measurements is: 20260924410000 gave it a separate policy so a
                client already sharing vitals did not begin sharing this the
                moment the column existed. Sharing vitals shows nothing here. */}
            <div className="mt-3 pt-3 border-t border-charcoal/[0.06]">
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                <Activity size={13} /> Blood pressure
              </p>
              {/* FOUR STATES, FOUR SENTENCES — not sharing, not fetched,
                  sharing with nothing recorded, and data. Collapsing the
                  middle two would tell a professional their client has
                  measured nothing when the request simply has not returned. */}
              {!client.access.bloodPressure ? (
                <p className="text-xs text-charcoal-faint">{BP_NOT_SHARED}</p>
              ) : !client.bloodPressure ? (
                <p className="text-xs text-charcoal-faint">Loading…</p>
              ) : client.bloodPressure.length === 0 ? (
                <p className="text-xs text-charcoal-faint">{BP_NONE_LOGGED}</p>
              ) : (
                (() => {
                  const readings = client.bloodPressure;
                  const latest = readings[0];
                  const week = readings.filter(
                    (r) => new Date(r.recordedAt).getTime() >= Date.now() - 7 * 86400000
                  );
                  const weekAvg = averageReading(week);
                  const counts = categoryCounts(readings);
                  const latestCategory = classifyBloodPressure(latest.systolic, latest.diastolic);
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-2 mb-2.5">
                        <div className="text-center bg-cream-card rounded-xl py-2">
                          <p className="text-sm font-bold text-charcoal tabular-nums">
                            {latest.systolic}/{latest.diastolic}
                          </p>
                          <p className="text-[10px]" style={{ color: BP_CATEGORY_COLOR[latestCategory] }}>
                            {BP_CATEGORY_LABEL[latestCategory]}
                          </p>
                        </div>
                        <div className="text-center bg-cream-card rounded-xl py-2">
                          <p className="text-sm font-bold text-charcoal tabular-nums">
                            {weekAvg ? `${weekAvg.systolic}/${weekAvg.diastolic}` : "–"}
                          </p>
                          <p className="text-[10px] text-charcoal-faint">7-day average</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {BP_CATEGORIES.filter((c) => counts[c] > 0).map((c) => (
                          <span
                            key={c}
                            className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                            style={{ color: BP_CATEGORY_COLOR[c], background: `${BP_CATEGORY_COLOR[c]}1A` }}
                          >
                            {BP_CATEGORY_LABEL[c]} · {counts[c]}
                          </span>
                        ))}
                      </div>
                    </>
                  );
                })()
              )}
            </div>

            {/* Cycle phase — ONE WORD, and only when it was granted.
                client_cycle_phase() returns a single enum value and this reads
                nothing else: no dates, no cycle day, no logs, no symptoms. The
                tables are never queried from here, and RLS would refuse it if
                they were. */}
            {(client.access.cyclePhase || client.access.pregnancy) && (
              <div className="mt-3 pt-3 border-t border-charcoal/[0.06]">
                <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                  <Moon size={13} /> Cycle
                </p>
                {!client.access.cyclePhase ? (
                  <p className="text-xs text-charcoal-faint">{PHASE_NOT_SHARED}</p>
                ) : client.cyclePhase === undefined ? (
                  <p className="text-xs text-charcoal-faint">Loading…</p>
                ) : client.cyclePhase === "unavailable" ? (
                  // SHARED, BUT NOTHING TO SHOW — different from not sharing,
                  // and reporting it as "not sharing" would blame the client
                  // for a gap they did not create.
                  <p className="text-xs text-charcoal-faint">{PHASE_UNAVAILABLE}</p>
                ) : (
                  <span
                    className="inline-block text-[11px] font-bold rounded-full px-2.5 py-1"
                    style={{
                      color: PHASE_COLOR[client.cyclePhase as CyclePhase],
                      background: `${PHASE_COLOR[client.cyclePhase as CyclePhase]}1F`,
                    }}
                  >
                    {PHASE_LABEL[client.cyclePhase as CyclePhase]}
                  </span>
                )}

                {client.access.pregnancy && (
                  <div className="mt-2.5">
                    {client.pregnancy === undefined ? (
                      <p className="text-xs text-charcoal-faint">Loading…</p>
                    ) : client.pregnancy.status === "pregnant" ? (
                      <span className="inline-block text-[11px] font-bold rounded-full px-2.5 py-1 bg-cream-soft text-charcoal">
                        Pregnant
                        {client.pregnancy.trimester !== null &&
                          ` · ${
                            TRIMESTER_ORDINAL[client.pregnancy.trimester as 1 | 2 | 3] ??
                            `trimester ${client.pregnancy.trimester}`
                          }`}
                      </span>
                    ) : (
                      <p className="text-xs text-charcoal-faint">No pregnancy recorded.</p>
                    )}
                  </div>
                )}
                {!client.access.pregnancy && client.access.cyclePhase && (
                  <p className="mt-2 text-[10.5px] text-charcoal-faint">{PREGNANCY_NOT_SHARED}</p>
                )}
              </div>
            )}

            {/* QA 13.0: "Anything added by the client in the health tab
                from past comorbidities, previous surgeries, medications...
                should also appear here." Blood work and imaging now sit
                alongside it, all three from one component shared with
                HealthMetricsTab rather than copied into both. */}
            {(client.access.medicalHistory || client.access.labResults) && (
              <div className="mt-3 pt-3 border-t border-charcoal/[0.06]">
                <ClientClinicalRecords client={client} onOpenFile={setViewing} />
              </div>
            )}

            {activeNotes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-charcoal/[0.06] space-y-2">
                <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide">
                  Clinical notes
                </p>
                {activeNotes.map((f) => (
                  <div key={f.key} className={`rounded-xl px-3 py-2 ${f.className}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{f.label}</p>
                    <p className="text-sm font-medium">{note[f.key]}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* "The dashboard should also show the client's preferred contact
            style, pronouns if provided, reminder preferences, and
            communication boundaries." Editable here since this prototype
            has no client-side form feeding these fields in yet. */}
        <div className="bg-cream-soft rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide flex items-center gap-1.5">
              <MessageCircle size={13} /> Communication preferences
            </p>
            <button onClick={() => setEditingPrefs((v) => !v)} className="text-xs font-semibold text-primary">
              {editingPrefs ? "Done" : "Edit"}
            </button>
          </div>
          {editingPrefs ? (
            <div className="space-y-2.5">
              {(
                [
                  { key: "pronouns" as const, label: "Pronouns", placeholder: "e.g. she/her" },
                  { key: "contactStyle" as const, label: "Preferred contact style", placeholder: "e.g. Direct and brief" },
                  { key: "reminderPreference" as const, label: "Reminder preference", placeholder: "e.g. Weekly, not daily" },
                  { key: "communicationBoundaries" as const, label: "Communication boundaries", placeholder: "e.g. No messages after 8pm" },
                ]
              ).map((f) => (
                <label key={f.key} className="block">
                  <span className="text-[11px] font-semibold text-charcoal-faint mb-1 block">{f.label}</span>
                  <input
                    value={client[f.key] ?? ""}
                    onChange={(e) => updateProfessionalClient(client.id, { [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full rounded-xl bg-cream-card border border-charcoal/10 px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              ))}
            </div>
          ) : client.pronouns || client.contactStyle || client.reminderPreference || client.communicationBoundaries ? (
            <div className="space-y-1.5 text-sm text-charcoal-soft">
              {client.pronouns && <p>Pronouns: {client.pronouns}</p>}
              {client.contactStyle && <p>Contact style: {client.contactStyle}</p>}
              {client.reminderPreference && <p>Reminders: {client.reminderPreference}</p>}
              {client.communicationBoundaries && <p>Boundaries: {client.communicationBoundaries}</p>}
            </div>
          ) : (
            <p className="text-xs text-charcoal-faint">Nothing set yet.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
            What you can see
          </p>
          <p className="text-[11px] text-charcoal-faint mb-3">
            The client controls this from their side. You can only view what they've shared.
          </p>
          <div className="space-y-1">
            {accessRows.map((r) => {
              const granted = client.access[r.key];
              return (
                <div key={r.key} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <r.icon size={15} className="text-charcoal-soft" />
                    <span className="text-sm text-charcoal">{r.label}</span>
                  </div>
                  <span
                    className={`flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${
                      granted ? "text-primary-dark bg-primary-pale" : "text-charcoal-faint bg-cream-card"
                    }`}
                  >
                    {granted ? <Check size={11} /> : <XIcon size={11} />}
                    {granted ? "Shared" : "Not shared"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {removeError && (
          <p className="text-xs font-semibold text-status-high text-center">{removeError}</p>
        )}
        <Button
          variant="outline"
          fullWidth
          onClick={handleRemove}
          className="!border-teal/30 !text-teal-dark"
        >
          <UserMinus size={14} />
          {confirmRemove ? "Tap again to confirm" : "Remove client"}
        </Button>
      </div>
    </BottomSheet>

    {/* Sibling of the sheet, not a child: a BottomSheet portals to <body>,
        so nesting one inside another would tie the viewer to the parent
        sheet unmounting. */}
    <FileViewerSheet
      open={viewing !== null}
      onClose={() => setViewing(null)}
      path={viewing?.path ?? null}
      bucket={viewing?.bucket ?? "medical-imaging"}
      label={viewing?.label ?? "File"}
    />
    </>
  );
};

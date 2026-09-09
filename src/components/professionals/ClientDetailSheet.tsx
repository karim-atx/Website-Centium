import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Toggle } from "../ui/Toggle";
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
  HeartHandshake,
  Lock,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Droplet,
  Stethoscope,
} from "lucide-react";
import { ACCESS_CATEGORIES, accessKeyFor } from "../../services/consent";
import { PERSON_ICON } from "../../utils/icons";
import { formatDisplayDate } from "../../utils/date";
import { HealthDataPending } from "./HealthDataPending";
import { ClientClinicalRecords, type ClinicalFileRequest } from "./ClientClinicalRecords";
import { FileViewerSheet } from "../health/FileViewerSheet";
import { nutritionLine, nutritionLineRecoverySensitive } from "../../utils/nutritionDisplay";

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
  const [clinicalOpen, setClinicalOpen] = useState(false);
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
              {client.recoverySensitive && (
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-primary-dark bg-primary-pale rounded-full px-1.5 py-0.5">
                  <HeartHandshake size={9} /> Recovery-sensitive
                </span>
              )}
            </div>
            <p className="text-xs text-charcoal-faint">Client since {formatDisplayDate(client.joinedAt)}</p>
          </div>
        </div>

        {/* No real bridge from a client's own account to this specific
            record (same limitation as elsewhere) — toggled here as a
            stand-in for what would otherwise sync from the client side. */}
        <div className="flex items-center justify-between bg-cream-soft rounded-2xl px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-semibold text-charcoal-soft">
            <HeartHandshake size={14} /> Recovery-sensitive mode (demo toggle)
          </span>
          <Toggle
            checked={!!client.recoverySensitive}
            onChange={(v) => updateProfessionalClient(client.id, { recoverySensitive: v })}
            label="Recovery-sensitive mode"
          />
        </div>

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

        <div className={client.recoverySensitive ? "grid grid-cols-1 gap-2.5" : "grid grid-cols-2 gap-2.5"}>
          {!client.recoverySensitive && client.access.foodDiary && (
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
                  {client.workout === null
                    ? client.recoverySensitive
                      ? "Sharing workouts"
                      : "No sessions yet"
                    : "Loading workouts…"}
                </p>
              )}
            </div>
          )}
          {!client.recoverySensitive && client.lastWeightKg !== undefined && (
            <div className="bg-cream-soft rounded-2xl p-3.5">
              <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
                Current weight
              </p>
              <p className="text-lg font-bold text-charcoal">
                {client.access.weight ? `${client.lastWeightKg} kg` : "—"}
              </p>
            </div>
          )}
        </div>

        {client.access.foodDiary && !client.recoverySensitive && (
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
        {client.access.foodDiary && client.recoverySensitive && (
          <div className="bg-cream-soft rounded-2xl p-4">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              Meal rhythm
            </p>
            {/* Was the hardcoded sentence "Meals logged on schedule", which
                asserted adherence for every recovery-sensitive client
                regardless of what they had logged — a clinical claim with no
                data behind it, on exactly the client group where QA 12.0 is
                most careful about inference. */}
            <p className="text-sm font-semibold text-charcoal">
              {nutritionLineRecoverySensitive(client.access, client.nutrition)}
            </p>
            <p className="text-xs text-charcoal-faint">Neutral view — no calorie totals shown</p>
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
                      No templates yet — build one in the Templates tab.
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
                  No meal plans yet — build one in the Meal Plans tab.
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

        {/* QA 12.0: "Weight-loss progress, BMI-centric dashboards,
            body-composition charts... remove from the nutritionist's
            primary dashboard" for a recovery-sensitive client. */}
        {client.access.weight && !client.recoverySensitive && (
          <div className="bg-cream-soft rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1">Weight</p>
              <p className="text-xl font-bold text-charcoal">{client.lastWeightKg} kg</p>
            </div>
            <span
              className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                (client.weightTrend ?? 0) <= 0 ? "text-primary-dark bg-primary-pale" : "text-teal-dark bg-teal-pale"
              }`}
            >
              {(client.weightTrend ?? 0) <= 0 ? "↓" : "↑"} {Math.abs(client.weightTrend ?? 0)} kg
            </span>
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
          client.access.medicalHistory ||
          client.access.labResults ||
          activeNotes.length > 0) && (
          <div className="bg-cream-soft rounded-2xl p-4">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
              <HeartPulse size={13} /> Health Metrics
            </p>
            {client.access.healthMetrics ? (
              client.healthSummary ? (
                <div className={client.recoverySensitive ? "grid grid-cols-2 gap-2 text-center" : "grid grid-cols-3 gap-2 text-center"}>
                  {/* QA 12.0: body-composition (body fat %) is exactly the
                      kind of body-measurement figure to hide by default. */}
                  {!client.recoverySensitive && (
                    <div>
                      <p className="text-sm font-bold text-charcoal">{client.healthSummary.bodyFatPct}%</p>
                      <p className="text-[10px] text-charcoal-faint">Body fat</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-charcoal">{client.healthSummary.sleepHours}h</p>
                    <p className="text-[10px] text-charcoal-faint">Sleep avg</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-charcoal">
                      {client.healthSummary.stepsAvg.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-charcoal-faint">Steps avg</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-charcoal-faint">No health data shared yet.</p>
              )
            ) : (
              <p className="text-xs text-charcoal-faint">Client isn't sharing auto-synced health data.</p>
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

        {/* QA 12.0: "If calories, weight, biometrics, or intake estimates
            are genuinely clinically required, move them to a restricted
            Clinical data panel... ideally a client-visible explanation
            such as: 'Your nutritionist can view clinician-only plan
            targets to support your agreed care plan. These are not
            displayed in your app.'" Collapsed by default — an explicit
            tap is required to reveal the actual numbers. */}
        {client.recoverySensitive && (client.access.foodDiary || client.access.weight) && (
          <div className="bg-status-caution-bg rounded-2xl p-4">
            <button
              onClick={() => setClinicalOpen((v) => !v)}
              className="tap w-full flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-charcoal uppercase tracking-wide">
                <Lock size={12} /> Clinical data
              </span>
              {clinicalOpen ? <ChevronUp size={14} className="text-charcoal-faint" /> : <ChevronDown size={14} className="text-charcoal-faint" />}
            </button>
            {!clinicalOpen ? (
              <p className="text-[11px] text-charcoal-faint mt-1.5 leading-relaxed">
                Calorie and weight figures are hidden by default for this client. Expand only if genuinely
                required to support their care plan.
              </p>
            ) : (
              <div className="mt-3 pt-3 border-t border-charcoal/10 grid grid-cols-2 gap-2.5">
                {client.access.foodDiary && (
                  <div>
                    <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
                      Calories consumed
                    </p>
                    {/* The one surface where a recovery-sensitive client's
                        actual figure is allowed, per QA 12.0's "if genuinely
                        clinically required, move them to a restricted
                        Clinical data panel" — and it is behind a deliberate
                        tap. Stating a plain absence is acceptable here for
                        the same reason: this panel is opened on purpose, not
                        encountered in passing. */}
                    {client.nutrition ? (
                      <>
                        <p className="text-sm font-bold text-charcoal">
                          {client.nutrition.calories.toLocaleString()} kcal
                        </p>
                        <p className="text-[10px] text-charcoal-faint">
                          {formatDisplayDate(client.nutrition.lastLoggedDate)}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-charcoal-soft">
                        {nutritionLine(client.access, client.nutrition)}
                      </p>
                    )}
                  </div>
                )}
                {client.access.weight && (
                  <div>
                    <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
                      Current weight
                    </p>
                    <p className="text-sm font-bold text-charcoal">{client.lastWeightKg} kg</p>
                  </div>
                )}
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
            The client controls this from their side — you can only view what they've shared.
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

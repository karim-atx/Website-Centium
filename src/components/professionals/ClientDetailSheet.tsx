import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { ProfessionalClient, ProfessionalSubtype } from "../../types";
import { workoutPrograms } from "../../data/mockWorkouts";
import { mockFoods } from "../../data/mockFoods";
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
} from "lucide-react";
import { PERSON_ICON } from "../../utils/icons";

const activityTypeLabel: Record<string, string> = {
  cardio: "Cardio",
  strength: "Strength training",
  both: "Cardio + Strength",
};

// V7 (QA 7.0): clinical notes are "highlighted and colored based on the
// category written" in the client dashboard's Health Metrics section.
const noteFields: {
  key: "comorbidities" | "previousSurgeries" | "medications" | "currentInjuries" | "personalityType";
  label: string;
  className: string;
}[] = [
  { key: "comorbidities", label: "Comorbidities", className: "bg-teal-pale text-teal-dark" },
  { key: "previousSurgeries", label: "Previous surgeries", className: "bg-berry/10 text-berry" },
  { key: "medications", label: "Medications", className: "bg-primary-pale text-primary-dark" },
  { key: "currentInjuries", label: "Current injuries", className: "bg-gold-pale text-charcoal" },
  { key: "personalityType", label: "Personality type", className: "bg-charcoal/[0.06] text-charcoal-soft" },
];

export const ClientDetailSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  client: ProfessionalClient | null;
  professionalSubtype?: ProfessionalSubtype;
}> = ({ open, onClose, client, professionalSubtype }) => {
  const { assignProgramToClient, assignFoodTemplateToClient, removeProfessionalClient, clientHealthNotes } = useApp();
  const [assigningProgram, setAssigningProgram] = useState(false);
  const [assigningTemplate, setAssigningTemplate] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!client) return null;

  const handleRemove = () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      setTimeout(() => setConfirmRemove(false), 3000);
      return;
    }
    removeProfessionalClient(client.id);
    onClose();
  };

  const isDietitian = professionalSubtype === "dietitian";

  const accessRows: { key: keyof ProfessionalClient["access"]; label: string; icon: typeof UtensilsCrossed }[] = [
    { key: "foodDiary", label: "Food Diary", icon: UtensilsCrossed },
    { key: "workoutActivity", label: "Workout Activity", icon: Dumbbell },
    { key: "weight", label: "Weight", icon: Scale },
    { key: "progress", label: "Progress", icon: TrendingUp },
    { key: "healthMetrics", label: "Health Metrics", icon: HeartPulse },
  ];

  const note = clientHealthNotes[client.id] ?? {};
  const activeNotes = noteFields.filter((f) => note[f.key]?.trim());

  return (
    <BottomSheet open={open} onClose={onClose} hideHeader>
      <div className="space-y-5 animate-fade-slide-up">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
            <PERSON_ICON size={20} className="text-primary-dark" />
          </span>
          <div>
            <p className="font-semibold text-charcoal">
              {client.prefix ? `${client.prefix} ` : ""}
              {client.name}
            </p>
            <p className="text-xs text-charcoal-faint">Client since {client.joinedAt}</p>
          </div>
        </div>

        {/* V7 (QA 7.0): performance summary — metrics important to the
            professional at a glance, before the per-section detail below. */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-cream-soft rounded-2xl p-3.5">
            <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
              Calories consumed
            </p>
            <p className="text-lg font-bold text-charcoal">
              {client.access.foodDiary ? `${client.lastCaloriesKcal.toLocaleString()} kcal` : "—"}
            </p>
          </div>
          <div className="bg-cream-soft rounded-2xl p-3.5">
            <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
              Workout logged
            </p>
            <p
              className={`text-lg font-bold flex items-center gap-1 ${
                client.workoutLoggedToday ? "text-primary-dark" : "text-charcoal-faint"
              }`}
            >
              {client.workoutLoggedToday ? <Check size={16} /> : <XIcon size={16} />}
              {client.workoutLoggedToday ? "Today" : "Not yet"}
            </p>
          </div>
          <div className="bg-cream-soft rounded-2xl p-3.5">
            <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
              Current weight
            </p>
            <p className="text-lg font-bold text-charcoal">
              {client.access.weight ? `${client.lastWeightKg} kg` : "—"}
            </p>
          </div>
          <div className="bg-cream-soft rounded-2xl p-3.5">
            <p className="text-[10px] font-semibold text-charcoal-faint uppercase tracking-wide mb-1">
              Health metrics
            </p>
            <p className="text-lg font-bold text-charcoal">
              {client.access.healthMetrics && client.healthSummary ? "Shared" : "Not shared"}
            </p>
          </div>
        </div>

        {client.access.foodDiary && (
          <div className="bg-cream-soft rounded-2xl p-4">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              Food Diary
            </p>
            <p className="text-xl font-bold text-charcoal">{client.lastCaloriesKcal.toLocaleString()} kcal</p>
            <p className="text-xs text-charcoal-faint">Last logged day</p>
          </div>
        )}

        {isDietitian ? (
          <div className="bg-cream-soft rounded-2xl p-4">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
              Activity Level
            </p>
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-primary" />
              <span className="text-sm font-semibold text-charcoal capitalize">
                {client.activityLevel.replace("_", " ")}
              </span>
              <span className="text-xs text-charcoal-faint">· {activityTypeLabel[client.activityType]}</span>
            </div>
          </div>
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
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {workoutPrograms.map((p) => (
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
                  ))}
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
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {mockFoods.slice(0, 6).map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    assignFoodTemplateToClient(client.id, `${f.name}-based plan`);
                    setAssigningTemplate(false);
                  }}
                  className="tap text-xs font-semibold bg-primary-pale text-primary-dark rounded-full px-3 py-1.5"
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {client.access.weight && (
          <div className="bg-cream-soft rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-1">Weight</p>
              <p className="text-xl font-bold text-charcoal">{client.lastWeightKg} kg</p>
            </div>
            <span
              className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                client.weightTrend <= 0 ? "text-primary-dark bg-primary-pale" : "text-teal-dark bg-teal-pale"
              }`}
            >
              {client.weightTrend <= 0 ? "↓" : "↑"} {Math.abs(client.weightTrend)} kg
            </span>
          </div>
        )}

        {/* V8 (QA 8.0): "clinical notes must show on the client dashboard
            regardless of the healthMetrics sharing toggle" — that toggle only
            controls the client's own auto-synced tracking data; the
            professional's private clinical notes aren't something the client
            shares or withholds, so they render unconditionally below. */}
        {(client.access.healthMetrics || activeNotes.length > 0) && (
          <div className="bg-cream-soft rounded-2xl p-4">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
              <HeartPulse size={13} /> Health Metrics
            </p>
            {client.access.healthMetrics ? (
              client.healthSummary ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm font-bold text-charcoal">{client.healthSummary.bodyFatPct}%</p>
                    <p className="text-[10px] text-charcoal-faint">Body fat</p>
                  </div>
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
  );
};

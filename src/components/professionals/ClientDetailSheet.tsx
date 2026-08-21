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
} from "lucide-react";

const activityTypeLabel: Record<string, string> = {
  cardio: "Cardio",
  strength: "Strength training",
  both: "Cardio + Strength",
};

export const ClientDetailSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  client: ProfessionalClient | null;
  professionalSubtype?: ProfessionalSubtype;
}> = ({ open, onClose, client, professionalSubtype }) => {
  const { assignProgramToClient, assignFoodTemplateToClient } = useApp();
  const [assigningProgram, setAssigningProgram] = useState(false);
  const [assigningTemplate, setAssigningTemplate] = useState(false);

  if (!client) return null;

  const isDietitian = professionalSubtype === "dietitian";

  const accessRows: { key: keyof ProfessionalClient["access"]; label: string; icon: typeof UtensilsCrossed }[] = [
    { key: "foodDiary", label: "Food Diary", icon: UtensilsCrossed },
    { key: "workoutActivity", label: "Workout Activity", icon: Dumbbell },
    { key: "weight", label: "Weight", icon: Scale },
    { key: "progress", label: "Progress", icon: TrendingUp },
    { key: "healthMetrics", label: "Health Metrics", icon: HeartPulse },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title={client.name}>
      <div className="space-y-5 animate-fade-slide-up">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{client.avatarEmoji}</span>
          <div>
            <p className="font-semibold text-charcoal">{client.name}</p>
            <p className="text-xs text-charcoal-faint">Client since {client.joinedAt}</p>
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
              <Activity size={16} className="text-sohati" />
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
                  className="text-xs font-semibold text-sohati"
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
                      className="tap text-xs font-semibold bg-sohati-pale text-sohati-dark rounded-full px-3 py-1.5"
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
              className="text-xs font-semibold text-sohati"
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
                  className="tap text-xs font-semibold bg-sohati-pale text-sohati-dark rounded-full px-3 py-1.5"
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
                client.weightTrend <= 0 ? "text-sohati-dark bg-sohati-pale" : "text-ember-dark bg-ember-pale"
              }`}
            >
              {client.weightTrend <= 0 ? "↓" : "↑"} {Math.abs(client.weightTrend)} kg
            </span>
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
                      granted ? "text-sohati-dark bg-sohati-pale" : "text-charcoal-faint bg-cream-card"
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

        <Button variant="outline" fullWidth onClick={onClose}>
          Close
        </Button>
      </div>
    </BottomSheet>
  );
};

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import type { ActivityLevel, Goal, Sex, TrackPreference } from "../../types";
import { WelcomeStep } from "./WelcomeStep";
import { AboutYouStep } from "./AboutYouStep";
import { GoalStep } from "./GoalStep";
import { ActivityStep } from "./ActivityStep";
import { TrackingStep } from "./TrackingStep";
import { ReadyStep } from "./ReadyStep";

export interface OnboardingDraft {
  firstName: string;
  age: string;
  sex: Sex;
  heightCm: string;
  weightKg: string;
  goals: Goal[];
  activityLevel: ActivityLevel | null;
  tracking: TrackPreference[];
}

const initialDraft: OnboardingDraft = {
  firstName: "",
  age: "",
  sex: "female",
  heightCm: "",
  weightKg: "",
  goals: [],
  activityLevel: null,
  tracking: [],
};

const TOTAL_STEPS = 6;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const { completeOnboarding } = useApp();
  const navigate = useNavigate();

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = () => {
    completeOnboarding({
      firstName: draft.firstName || "Friend",
      age: Number(draft.age) || 28,
      sex: draft.sex,
      heightCm: Number(draft.heightCm) || 170,
      weightKg: Number(draft.weightKg) || 70,
      goals: draft.goals.length ? draft.goals : ["improve_health"],
      activityLevel: draft.activityLevel || "moderate",
      tracking: draft.tracking.length ? draft.tracking : ["nutrition", "workouts"],
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {step > 0 && (
        <div className="px-6 pt-6 flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors duration-300"
              style={{ background: i <= step - 1 ? "#1B6B52" : "#EFE7D8" }}
            />
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col px-6 pt-8 pb-10 max-w-md mx-auto w-full">
        {step === 0 && <WelcomeStep onNext={next} />}
        {step === 1 && (
          <AboutYouStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />
        )}
        {step === 2 && <GoalStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />}
        {step === 3 && (
          <ActivityStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />
        )}
        {step === 4 && (
          <TrackingStep draft={draft} setDraft={setDraft} onNext={next} onBack={back} />
        )}
        {step === 5 && <ReadyStep draft={draft} onFinish={finish} />}
      </div>
    </div>
  );
}

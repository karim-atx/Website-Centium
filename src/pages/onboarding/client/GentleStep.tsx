import React from "react";
import { CalendarHeart, HeartHandshake } from "lucide-react";
import type { OnboardingDraft } from "../Onboarding";
import { ObFooter, ObStep } from "../shell/ObShell";
import { ObToggleList } from "../shell/ObBlocks";
import { OB_STRINGS, useOnboardingFlow } from "../shell/flow";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

// v6 (OB-092…095): Client lane · Step 2 of 4 · A gentler start
// (BizOnboardingV10 second client block, step "gentle"). V6-08 (a): the
// handover's title and description for the recovery-sensitive toggle, and the
// app's "relationship with food" paragraph kept under the subtitle, word for
// word (safety wording is never changed as a side effect). The "Entirely
// optional" line is removed, as V6-08 (a) decided. Advanced health stays out
// of onboarding (D11), so two toggles. V6-153: cycle tracking is offered to
// everyone; turning it on records the opt-in at finish.
//
// QA 12.0: framed as a private, low-pressure preference, never a clinical
// yes/no, and nobody is asked to explain why they turn it on.

export const GentleStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const flow = useOnboardingFlow();
  return (
    <ObStep
      lane="client"
      step="gentle"
      title="A gentler start"
      subtitle="Everyone starts somewhere different. Choose what feels right for you, and change it anytime later."
      onBack={onBack}
      footer={<ObFooter error={!flow?.online ? OB_STRINGS.offlineStep : null} errorTone="info" primary={{ label: "Continue", onClick: onNext }} />}
    >
      <p className="ob-tg-para">
        Some people find calorie counts, weight numbers, or streaks unhelpful, or genuinely hard, for their relationship with food. If that's true for you right now, we can leave those out.
      </p>
      <ObToggleList
        title="You can change these anytime"
        items={[
          {
            key: "rs",
            icon: HeartHandshake,
            title: "Take it easy on numbers",
            desc: "We'll keep weight, calories and streaks out of view, so you can focus on how you feel. Meals become about notes, hunger and fullness.",
            caption: "Recovery-sensitive experience",
            effect: "Next: weight goals and trackers stay hidden, and food tracking turns gentler.",
            on: draft.recoverySensitive,
            onChange: (on) => setDraft((d) => ({ ...d, recoverySensitive: on })),
          },
          {
            key: "cy",
            icon: CalendarHeart,
            title: "Get to know your cycle",
            desc: "Note your periods and how you feel through the month. It's private, just for you.",
            caption: "Cycle tracking",
            effect: "Next: adds cycle to your goals and tracking.",
            on: draft.cycleTracking,
            onChange: (on) => setDraft((d) => ({ ...d, cycleTracking: on })),
          },
        ]}
      />
    </ObStep>
  );
};

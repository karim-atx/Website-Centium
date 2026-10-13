import React, { useState } from "react";
import { Heart, HeartHandshake, Info } from "lucide-react";
import type { OnboardingDraft } from "../Onboarding";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { ObFooter, ObStep } from "../shell/ObShell";
import { ObGoalTiles, ObMenu, ObRowLink, ObScale, ObSectionLabel, ObTip } from "../shell/ObBlocks";
import { OB_STRINGS, useOnboardingFlow } from "../shell/flow";
import { ACTIVITIES, ACTIVITY_SCALE, MAX_GOAL_AREAS, goalAreas, type GoalArea } from "./clientModel";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

// v6 (OB-096…102, 113…130): Client lane · Step 3 of 4 · Goals and activity
// (BizOnboardingV10 second client block, step "goals"): six goal areas, up to
// three (the rest dim with a tip at three), each with a Refine sheet of
// sub-goals; the five-step activity scale (Resting…Athlete map to the
// activity_level enum); "Activities you enjoy" pop-up (profiles.
// preferred_activities, B5). A gentler start shapes the areas: weight goals
// hidden, "Eat with ease"; cycle tracking adds "Understand my cycle".

export const GoalsStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const flow = useOnboardingFlow();
  const flags = { rs: draft.recoverySensitive, cy: draft.cycleTracking };
  const areas = goalAreas(flags);
  const picked = draft.goalAreas;
  // The tip and the dimmed tiles appear when a fourth area is tried (OB-100);
  // three picked on their own read as OB-096, nothing dimmed.
  const [capHit, setCapHit] = useState(false);
  const cap = capHit && picked.length >= MAX_GOAL_AREAS;
  const [refine, setRefine] = useState<GoalArea | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actsEl, setActsEl] = useState<HTMLButtonElement | null>(null);

  const subsOf = (a: GoalArea) => (draft.subGoals[a] ?? []).filter((s) => areas.find((d) => d.key === a)?.subs.includes(s));

  const toggleArea = (a: GoalArea) => {
    if (!picked.includes(a) && picked.length >= MAX_GOAL_AREAS) {
      setCapHit(true);
      return;
    }
    if (picked.includes(a)) setCapHit(false);
    setDraft((d) => {
      if (d.goalAreas.includes(a)) return { ...d, goalAreas: d.goalAreas.filter((x) => x !== a) };
      if (d.goalAreas.length >= MAX_GOAL_AREAS) return d;
      const def = areas.find((x) => x.key === a);
      // A newly picked area starts with its first sub-goal, so "Refine · 1"
      // and the save always have something to store.
      const subs = d.subGoals[a]?.length ? d.subGoals[a] : def ? def.subs.slice(0, 1) : [];
      return { ...d, goalAreas: [...d.goalAreas, a], subGoals: { ...d.subGoals, [a]: subs } };
    });
  };

  const toggleSub = (a: GoalArea, s: string) =>
    setDraft((d) => {
      const cur = d.subGoals[a] ?? [];
      return { ...d, subGoals: { ...d.subGoals, [a]: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] } };
    });

  const tipText = [flags.rs ? "Weight goals are hidden." : "", flags.cy ? "Cycle is in Health." : ""].filter(Boolean).join(" ");
  const level = ACTIVITY_SCALE.find((l) => l.value === draft.activityLevel) ?? null;
  const actLabels = ACTIVITIES.filter((a) => draft.activities.includes(a.key)).map((a) => a.label);
  const refineDef = refine ? areas.find((a) => a.key === refine) : null;

  return (
    <ObStep
      lane="client"
      step="goals"
      title="Goals and activity"
      subtitle="Pick what matters most right now. Your Home is built around it."
      onBack={onBack}
      footer={<ObFooter error={!flow?.online ? OB_STRINGS.offlineStep : null} errorTone="info" primary={{ label: "Continue", onClick: onNext }} />}
    >
      <ObSectionLabel title="Your goals" tag={`Pick up to 3 · ${picked.length} picked`} tagTone="accent" margin="0 2px 12px" />
      <ObGoalTiles
        items={areas.map((a) => {
          const on = picked.includes(a.key);
          return {
            key: a.key,
            icon: a.icon,
            title: a.title,
            on,
            dim: cap && !on,
            refine: `Refine · ${subsOf(a.key).length}`,
            onToggle: () => toggleArea(a.key),
            onRefine: () => setRefine(a.key),
          };
        })}
      />
      {cap ? (
        <ObTip icon={Info} margin="-6px 0 14px" role="status">
          That's 3. Untick one to swap it for another.
        </ObTip>
      ) : tipText ? (
        <ObTip icon={HeartHandshake} margin="-6px 0 14px">
          {tipText}
        </ObTip>
      ) : null}
      <ObSectionLabel title="How active you are" tag="Optional" margin="4px 2px 12px" />
      <ObScale
        label="How active you are"
        items={ACTIVITY_SCALE}
        value={draft.activityLevel}
        onChange={(v) => setDraft((d) => ({ ...d, activityLevel: d.activityLevel === v ? null : v }))}
        caption={level ? { title: level.label, desc: level.desc } : null}
      />
      <ObRowLink
        ref={setActsEl}
        icon={Heart}
        title="Activities you enjoy"
        desc={actLabels.length ? actLabels.join(", ") : "Tap to choose, optional"}
        expanded={menuOpen}
        onClick={() => setMenuOpen(true)}
      />
      {menuOpen && (
        <ObMenu
          title="Activities you enjoy"
          anchor={actsEl}
          options={ACTIVITIES.map((a) => ({ key: a.key, label: a.label, on: draft.activities.includes(a.key) }))}
          onToggle={(k) =>
            setDraft((d) => ({ ...d, activities: d.activities.includes(k) ? d.activities.filter((x) => x !== k) : [...d.activities, k] }))
          }
          onClose={() => {
            setMenuOpen(false);
            actsEl?.focus();
          }}
        />
      )}
      {refineDef && (
        <BottomSheet
          open={!!refine}
          onClose={() => setRefine(null)}
          title={refineDef.title}
          bodyPadding={{ top: 18, right: 20, bottom: 12, left: 20 }}
          footer={
            <div className="ob-vars">
              <button
                type="button"
                className="ob-btn tap"
                style={{ background: "var(--ob-fill)", color: "var(--ob-on-fill)" }}
                onClick={() => setRefine(null)}
              >
                Done
              </button>
            </div>
          }
        >
          <div className="ob-vars" style={{ marginBottom: 12 }}>
            <p className="ob-label" style={{ marginBottom: 6 }}>
              Pick any that fit
            </p>
            <div className="ob-chips" role="group" aria-label="Pick any that fit">
              {refineDef.subs.map((s) => {
                const on = subsOf(refineDef.key).includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    className="ob-chip-b hit"
                    onClick={() => toggleSub(refineDef.key, s)}
                    style={{ minHeight: 36, padding: "8px 12px", lineHeight: "16px", fontWeight: 600 }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </BottomSheet>
      )}
    </ObStep>
  );
};

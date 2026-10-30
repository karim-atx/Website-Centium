import React, { useEffect, useState } from "react";
import { HeartHandshake } from "lucide-react";
import type { OnboardingDraft } from "../Onboarding";
import type { TrackPreference } from "../../../types";
import { ObFooter, ObStep } from "../shell/ObShell";
import { ObSectionLabel, ObTip, ObTrackRows, type ObTrackRow } from "../shell/ObBlocks";
import { OB_STRINGS, useOnboardingFlow } from "../shell/flow";
import { recommendedTracking, trackDef, trackGroups } from "./clientModel";
import { t, tk } from "../../../i18n/core";

interface Props {
  draft: OnboardingDraft;
  setDraft: React.Dispatch<React.SetStateAction<OnboardingDraft>>;
  onNext: () => void;
  onBack: () => void;
}

// v6 (OB-103…108, 131/132): Client lane · Step 4 of 4 · What to track
// (BizOnboardingV10 second client block, step "track"): "Recommended for you"
// switches, then "More to track" groups that open into switches. A gentler
// start (kept rule, QA 12.0/13.0): weight and body composition are not
// offered, Nutrition reads "Meals and eating patterns", Hunger and fullness
// joins Food; cycle tracking adds Cycle. Hunger and fullness has no tracker
// yet (B5 open item), so its switch is shown disabled.

const SOON = tk("Coming soon");

export const TrackStep: React.FC<Props> = ({ draft, setDraft, onNext, onBack }) => {
  const flow = useOnboardingFlow();
  const flags = { rs: draft.recoverySensitive, cy: draft.cycleTracking };
  const rec = recommendedTracking(flags);
  const groups = trackGroups(flags);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  // Until the user changes a row, what is on is the recommended set for what
  // they chose on A gentler start.
  const recKey = rec.join(",");
  useEffect(() => {
    if (!draft.trackingTouched) setDraft((d) => ({ ...d, tracking: recommendedTracking({ rs: d.recoverySensitive, cy: d.cycleTracking }) }));
  }, [recKey, draft.trackingTouched, setDraft]);

  const on = (k: TrackPreference) => draft.tracking.includes(k);
  const set = (k: TrackPreference, value: boolean) =>
    setDraft((d) => ({
      ...d,
      trackingTouched: true,
      tracking: value ? (d.tracking.includes(k) ? d.tracking : [...d.tracking, k]) : d.tracking.filter((x) => x !== k),
    }));

  const recRows: ObTrackRow[] = rec.map((k) => {
    const def = trackDef(k, flags);
    return { kind: "toggle", key: k, icon: def.icon, title: t(def.label), desc: t(def.desc), on: on(k), onChange: (v) => set(k, v) };
  });

  const groupRows: ObTrackRow[] = [];
  for (const g of groups) {
    const offered = g.items;
    const n = offered.filter((k) => on(k) && !trackDef(k, flags).soon).length;
    const open = openGroup === g.key;
    groupRows.push({
      kind: "group",
      key: `g-${g.key}`,
      icon: g.icon,
      title: t(g.title),
      count: t("{n} of {total} on", { n, total: offered.length }),
      open,
      controls: `ob-track-${g.key}`,
      onToggle: () => setOpenGroup((o) => (o === g.key ? null : g.key)),
    });
    if (open) {
      for (const k of offered) {
        const def = trackDef(k, flags);
        groupRows.push({
          kind: "toggle",
          key: `${g.key}-${k}`,
          icon: def.icon,
          title: t(def.label),
          desc: def.soon ? t(SOON) : undefined,
          on: !def.soon && on(k),
          disabled: def.soon,
          iconBg: "card",
          onChange: (v) => set(k, v),
        });
      }
    }
  }

  const tip = [flags.rs ? t("Weight and body measurements are hidden.") : "", flags.cy ? t("Cycle is recommended.") : ""].filter(Boolean).join(" ");

  return (
    <ObStep
      lane="client"
      step="track"
      title={t("What to track")}
      subtitle={t("You can change this anytime in Settings.")}
      onBack={onBack}
      footer={<ObFooter error={!flow?.online ? t(OB_STRINGS.offlineStep) : null} errorTone="info" primary={{ label: t("Finish"), onClick: onNext }} />}
    >
      <ObSectionLabel title={t("Recommended for you")} tag={t("{n} on", { n: rec.filter(on).length })} tagTone="accent" margin="0 2px 10px" />
      <ObTrackRows rows={recRows} marginBottom={16} />
      <ObSectionLabel title={t("More to track")} margin="0 2px 10px" />
      <ObTrackRows rows={groupRows} marginBottom={8} />
      {tip && (
        <ObTip icon={HeartHandshake} margin="4px 0 0">
          {tip}
        </ObTip>
      )}
    </ObStep>
  );
};

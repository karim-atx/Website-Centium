import { useState } from "react";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { BreathingRunner } from "../../components/mind/BreathingRunner";
import { PoseSequence, type Pose } from "../../components/mind/PoseSequence";
import { breathingPatterns, stretchList, yogaPoses } from "../../data/mockMindContent";

type SubTab = "breathing" | "stretching" | "yoga";

// Meditation, mobile v5.1 MO1.1.4: its own page (/app/mind/meditation) rather
// than a bottom sheet, opened from the Meditation tile on Mind.
//
// LIGHT MODE keeps the colours of the chips these segmented controls replace,
// as on Journal and Achievements.

// Mobile v5.1 R3, dark mode (no light islands): the level pills sit on a
// surface.soft row. Advanced is danger.tint #3C2A30 / danger #FF6B5E (4.8:1),
// intermediate gold.tint #3A342C / gold.text #CAB082 (5.9:1); beginner has no
// board value, so it is its green #3F9165 at 16% on the row with the text
// lifted to 4.5:1 (#6BAA88).
const difficultyColor: Record<string, string> = {
  beginner: "text-[#3F9165] bg-[#E3F3E9] dark:text-[#6BAA88] dark:bg-th-283838",
  intermediate: "text-[#B08A2E] bg-[#FBF1DD] dark:text-[#CAB082] dark:bg-[#3A342C]",
  advanced: "text-[#C0392B] bg-[#FBE7E4] dark:text-[#FF6B5E] dark:bg-[#3C2A30]",
};

const CHIP_LIGHT = {
  activeFill: "rgb(var(--c-primary-fill))",
  activeInk: "rgb(var(--c-on-primary-fill))",
  idleFill: "rgb(var(--c-cream-card))",
  idleInk: "rgb(var(--c-charcoal-soft))",
};

/** Yoga poses have no durations in the content; each holds 30 s (A15). */
const YOGA_SECONDS = 30;

const stretches: Pose[] = stretchList.map((s) => ({
  id: s.id,
  name: s.name,
  meta: `${s.target} · ${s.type} · ${s.seconds}s`,
  seconds: s.seconds,
  instructions: s.instructions,
}));

const poses: Pose[] = yogaPoses.map((p) => ({
  id: p.id,
  name: p.name,
  meta: p.subtitle,
  seconds: YOGA_SECONDS,
  instructions: p.instructions,
  image: p.image,
  difficulty: { label: p.difficulty, className: difficultyColor[p.difficulty] },
}));

export default function MeditationPage() {
  const [subTab, setSubTab] = useState<SubTab>("breathing");
  const [patternId, setPatternId] = useState(breathingPatterns[0].id);
  const pattern = breathingPatterns.find((p) => p.id === patternId)!;

  return (
    <div className="animate-fade-slide-up">
      <SegmentedTabs
        items={[
          { key: "breathing", label: "Breathing" },
          { key: "stretching", label: "Stretching" },
          { key: "yoga", label: "Yoga" },
        ]}
        activeKey={subTab}
        onChange={(k) => setSubTab(k as SubTab)}
        light={CHIP_LIGHT}
        className="mb-4"
      />

      {subTab === "breathing" && (
        <div>
          <SegmentedTabs
            size="compact"
            wrapLabels
            items={breathingPatterns.map((p) => ({ key: p.id, label: p.name }))}
            activeKey={patternId}
            onChange={setPatternId}
            light={CHIP_LIGHT}
          />
          <p className="mt-3 mb-4 px-3 text-center text-[12.5px] leading-relaxed text-charcoal-muted">{pattern.desc}</p>
          <BreathingRunner pattern={pattern} />
        </div>
      )}
      {subTab === "stretching" && <PoseSequence key="stretching" poses={stretches} />}
      {subTab === "yoga" && <PoseSequence key="yoga" poses={poses} />}

      {/* The page's own padding covers 112 of the 172 a pinned row needs. */}
      <div aria-hidden style={{ height: 60 }} />
    </div>
  );
}

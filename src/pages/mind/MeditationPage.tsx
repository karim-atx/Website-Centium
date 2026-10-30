import { useState } from "react";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { MindHeader } from "../../components/mind/MindHeader";
import { BreathingRunner } from "../../components/mind/BreathingRunner";
import { PoseSequence, type Pose } from "../../components/mind/PoseSequence";
import { MusicSection } from "../../components/music/MusicSection";
import { useApp } from "../../context/AppContext";
import { breathingPatterns, stretchList, yogaPoses } from "../../data/mockMindContent";

type SubTab = "breathing" | "stretching" | "yoga";

// Meditation, v6 MO1.1.4 / MO1.1.4.1 / MO1.1.4.2: its own page
// (/app/mind/meditation), opened from the Meditation tile on Mind.
//
// THE FIXED AREA (MO1.1.4 #1, S6): the header, the Breathing / Stretching /
// Yoga tabs and, on Breathing, the pattern tabs stay fixed while the content
// scrolls under them (the shared FixedHeader inside MindHeader: fill and
// hairline only once content is under it). Pad 24 16 12 16: the header sits
// 16 above the main track (#6 at y 106.5), the pattern track 16 under it
// (#8 at y 178.5), and the area ends 12 under the last track.
//
// The segmented controls: active #A79AD5 / white (dark #A991FE / #0D0B1A),
// idle #F5F4FE with #5B5349 labels; dark track and idle tab #303141 with
// #B8B3C7 labels (#6, #7: darkTone "partB").

// The level pills (MO1.1.4.2 #14, #25): beginner #3F9165 on #E3F3E9, dark
// #7FC79C on #192A20 (literal). Intermediate and advanced are not drawn and
// keep their v5.1 values (K1): intermediate #B08A2E on #FBF1DD / dark #CAB082
// on #3A342C; advanced #C0392B on #FBE7E4 / dark #FF6B5E on #3C2A30.
const difficultyColor: Record<string, string> = {
  beginner: "text-[#3F9165] bg-[#E3F3E9] dark:text-[#7FC79C] dark:bg-[#192A20]",
  intermediate: "text-[#B08A2E] bg-[#FBF1DD] dark:text-[#CAB082] dark:bg-[#3A342C]",
  advanced: "text-[#C0392B] bg-[#FBE7E4] dark:text-[#FF6B5E] dark:bg-[#3C2A30]",
};

const IDLE_INK = "rgb(var(--c-charcoal-soft))";

/** Yoga poses have no durations in the content (their ring reads "Hold"); K5. */
const YOGA_SECONDS = 30;

const stretches: Pose[] = stretchList.map((s) => ({
  id: s.id,
  name: s.name,
  meta: `${s.target} · ${s.type} · ${s.seconds}s`,
  seconds: s.seconds,
  instructions: s.instructions,
  art: s.art,
}));

const poses: Pose[] = yogaPoses.map((p) => ({
  id: p.id,
  name: p.name,
  meta: p.subtitle,
  seconds: YOGA_SECONDS,
  instructions: p.instructions,
  art: p.art,
  difficulty: { label: p.difficulty, className: difficultyColor[p.difficulty] },
}));

export default function MeditationPage() {
  const { accessibility } = useApp();
  const [subTab, setSubTab] = useState<SubTab>("breathing");
  const [patternId, setPatternId] = useState(breathingPatterns[0].id);
  const pattern = breathingPatterns.find((p) => p.id === patternId)!;
  // O6: tab labels never wrap under Larger text; the pattern row scrolls sideways.
  const larger = accessibility.largerText;

  return (
    <div className="animate-fade-slide-up">
      <MindHeader section="meditation" paddingBottom={12} headerGap={16}>
        {/* The frames draw 16 between the header and the main track (#5 ends
            y 90.5, #6 at 106.5): MindHeader headerGap. */}
        <div>
          {/* #6-#7: 358 × 56 track, 112 × 44 tabs, 12.5/15 700. */}
          <SegmentedTabs
            items={[
              { key: "breathing", label: "Breathing" },
              { key: "stretching", label: "Stretching" },
              { key: "yoga", label: "Yoga" },
            ]}
            activeKey={subTab}
            onChange={(k) => setSubTab(k as SubTab)}
            idleInk={IDLE_INK}
            darkTone="partB"
            lineHeight={15}
          />
          {subTab === "breathing" && (
            // #8-#9: 358 × 52 track 16 under the main one, 40 tall tabs,
            // 11.5/13.8 700; two centred lines ("Simple Deep Breathing").
            <SegmentedTabs
              className="mt-4"
              tabHeight={40}
              labelSize={11.5}
              lineHeight={13.8}
              wrapLabels={!larger}
              scroll={larger}
              items={breathingPatterns.map((p) => ({ key: p.id, label: p.name }))}
              activeKey={patternId}
              onChange={setPatternId}
              idleInk={IDLE_INK}
              darkTone="partB"
            />
          )}
        </div>
      </MindHeader>

      {subTab === "breathing" && (
        <div>
          {/* #10: 12/17 400 #8C8378 / #B8B3C7, 350 wide (m 0 4), right under
              the fixed area's 12 bottom padding; 12 above the flower (#11 at
              y 288.5). */}
          <p className="mb-3 px-1 text-center text-[12px] leading-[17px] text-charcoal-muted">{pattern.desc}</p>
          <BreathingRunner pattern={pattern} />
        </div>
      )}
      {subTab === "stretching" && <PoseSequence key="stretching" kind="stretching" poses={stretches} />}
      {subTab === "yoga" && <PoseSequence key="yoga" kind="yoga" poses={poses} />}

      {/* Round E: Play your music (the member's Mind favourite, or their music app). */}
      <MusicSection moment="mind" className="mt-6" />

      {/* Breathing's pinned row: the page's own padding covers 112 of the
          168 a 44 pt pinned row needs. Stretching and Yoga have none. */}
      {subTab === "breathing" && <div aria-hidden style={{ height: 56 }} />}
    </div>
  );
}

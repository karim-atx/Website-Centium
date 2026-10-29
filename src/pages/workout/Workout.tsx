import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SegmentedTabs, type SegmentedTabItem } from "../../components/ui/SegmentedTabs";
import { FixedHeader } from "../../components/ui/FixedHeader";
import RoutinesTab from "./RoutinesTab";
import LibraryTab from "./LibraryTab";
import HistoryTab from "./HistoryTab";
import MetricsTab from "./MetricsTab";
import { PersonalRecordReviewSheet } from "../../components/workout/PersonalRecordReviewSheet";

type Tab = "routines" | "library" | "history" | "metrics";

const tabLabels: Record<Tab, string> = {
  routines: "Routines",
  library: "Library",
  history: "History",
  metrics: "Metrics",
};

// Master handover, CentiumTabFrame `tabsWorkout`: the segmented bar with the
// frame's own flex-weights (1 / 0.94 / 0.96 / 0.95) and idle label ink.
// v6 WO1 #3-#5: dark track and idle tabs #303141 with #B8B3C7 (darkTone
// "partB"); `idleInk` is the light label only.
const tabWeights: Record<Tab, number> = { routines: 1, library: 0.94, history: 0.96, metrics: 0.95 };
const workoutTabs: SegmentedTabItem[] = (["routines", "library", "history", "metrics"] as Tab[]).map((t) => ({
  key: t,
  label: tabLabels[t],
  weight: tabWeights[t],
}));

export default function Workout() {
  // Round D · TR22: ?tab=history opens History (the workout_log_reply notice's link).
  const [params] = useSearchParams();
  const linked = params.get("tab");
  const [tab, setTab] = useState<Tab>(linked === "history" ? "history" : "routines");
  // A new link while the page is open (adjusted during render, not in an effect).
  const [seenLink, setSeenLink] = useState(params.toString());
  if (seenLink !== params.toString()) {
    setSeenLink(params.toString());
    if (linked === "history") setTab("history");
  }

  return (
    <div>
      {/* v6 WO1 #1-#5 / WO1.s: the "Workout" title and the four tabs stay
          fixed on scroll for every tab (FixedHeader: transparent at rest,
          #FFFFFF / dark #121317 with a 1px hairline once content is under it).
          Fixed area 390 × 136.5: the shell's 24 on top, title 19/28.5 700
          ls -0.6 with 12 under it, the 56 track, 16 at the bottom. */}
      <FixedHeader paddingBottom={16}>
        <h1 className="m-0 mb-3 text-[19px] leading-[28.5px] font-bold tracking-[-0.6px] text-charcoal">Workout</h1>
        <SegmentedTabs
          items={workoutTabs}
          activeKey={tab}
          onChange={(key) => setTab(key as Tab)}
          // #5B5349, #111111 under High contrast (WO1 O7).
          idleInk="rgb(var(--c-charcoal-soft))"
          darkTone="partB"
        />
      </FixedHeader>

      {tab === "routines" && <RoutinesTab />}
      {tab === "library" && <LibraryTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "metrics" && <MetricsTab />}

      {/* One-time, and rendered here rather than on Home because this is where
          personal records live and are edited. It shows itself only when this
          device actually has old local records to review. */}
      <PersonalRecordReviewSheet />
    </div>
  );
}

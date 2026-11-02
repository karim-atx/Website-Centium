import { tk } from "../../i18n/core";
export type Tab = "diary" | "goals" | "prep";

// Item 7 (mobile handoff): the segmented tab bar's three Food tabs, in the
// order they already appear in Food.tsx, with the handoff's own literal
// flex-weights so the trio exactly fills the track (Diary / Goals & Macros
// / Custom, renamed from Meal Prep by FO3.2). v6 FO1 S1: one fixed header on
// every Food tab draws them, so GoalsPanel no longer has its own copy.
export const foodTabs: { key: Tab; label: string; weight: number }[] = [
  { key: "diary", label: tk("Diary"), weight: 0.8 },
  { key: "goals", label: tk("Goals & Macros"), weight: 1.08 },
  { key: "prep", label: tk("Custom"), weight: 0.86 },
];

export type Tab = "diary" | "goals" | "prep";

// Item 7 (mobile handoff): the segmented tab bar's three Food tabs, in the
// order they already appear in Food.tsx, with the handoff's own literal
// flex-weights so the trio exactly fills the track (Diary / Goals & Macros
// / Meal Prep). Shared by Food.tsx and GoalsPanel.tsx (item 8's own tab bar)
// so they can't drift into two different copies of the same three tabs.
export const foodTabs: { key: Tab; label: string; weight: number }[] = [
  { key: "diary", label: "Diary", weight: 0.8 },
  { key: "goals", label: "Goals & Macros", weight: 1.08 },
  { key: "prep", label: "Meal Prep", weight: 0.86 },
];

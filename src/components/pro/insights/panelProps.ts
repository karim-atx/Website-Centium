import type { UseClientAccess } from "../../../hooks/useClientAccess";
import type { AccessCategory } from "../../../services/pro/access";
import type { ProLane } from "../subtypeLanes";
import type { ChartRange } from "./insightsModel";

/** What every Insights tab panel gets from InsightsScreen. */
export interface PanelProps {
  clientId: string;
  firstName: string;
  name: string;
  lane: ProLane;
  access: UseClientAccess;
  /** The chart range (W M 3M Y), shared by the tab's charts. */
  range: ChartRange;
  onRange: (r: ChartRange) => void;
  /** The page range (Today, Week, Month): the boxes' window. */
  pageRange: PageRange;
  today: string;
  asked: AccessCategory[];
  onAsk: (c: AccessCategory) => void;
  /** Opens this client's page on a tab (notes, care plan). */
  openClient: (tab?: string) => void;
}

/** The chart range a page range starts at. */
export const chartRangeFor = (r: PageRange): ChartRange => (r === "month" ? "M" : "W");

export type PageRange = "today" | "week" | "month";
export const PAGE_RANGE_DAYS: Record<PageRange, number> = { today: 1, week: 7, month: 30 };

/** What each category is called on the badges and lock lines (the app's own consent words). */
export const CATEGORY_LABEL: Partial<Record<AccessCategory, string>> = {
  health_metrics: "Activity & vitals",
  workout_activity: "Workout activity",
  food_diary: "Food diary",
  blood_pressure: "Blood pressure",
  weight: "Weight",
  body_measurements: "Body measurements",
  lab_results: "Lab results",
  progress: "Progress",
};

export type InsightsTab = "activity" | "nutrition" | "vitals" | "biomarkers";

export const tabsForLane = (lane: ProLane): InsightsTab[] => (lane === "full_coaching" ? ["activity", "nutrition", "vitals"] : ["activity", "nutrition", "vitals", "biomarkers"]);

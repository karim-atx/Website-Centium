import type { HealthMetric, BloodPanel, Streak, HabitItem } from "../types";

const days = (n: number) => {
  const arr: string[] = [];
  const today = new Date("2026-08-20");
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
};

const weightHistory = [107.6, 107.3, 107.1, 106.9, 106.8, 106.6, 106.4];
const stepsHistory = [7200, 9100, 6400, 10200, 8800, 9600, 8421];
const sleepHistory = [6.8, 7.2, 7.5, 6.9, 7.8, 7.1, 7.7];
// V10 (QA 10.0): "Replace the body fat % with heart rate" — resting bpm.
const heartRateHistory = [71, 69, 70, 67, 68, 66, 68];
const caloriesHistory = [2180, 2410, 1990, 2560, 2290, 2470, 2340];

export const healthMetrics: HealthMetric[] = [
  {
    type: "weight",
    label: "Weight",
    unit: "kg",
    current: 106.4,
    trend: -0.6,
    history: days(7).map((date, i) => ({ date, value: weightHistory[i] })),
  },
  {
    type: "heartRate",
    label: "Heart Rate",
    unit: "bpm",
    current: 68,
    trend: -2,
    history: days(7).map((date, i) => ({ date, value: heartRateHistory[i] })),
  },
  {
    type: "steps",
    label: "Steps",
    unit: "steps",
    current: 8421,
    trend: 620,
    history: days(7).map((date, i) => ({ date, value: stepsHistory[i] })),
  },
  {
    type: "sleep",
    label: "Sleep",
    unit: "h",
    current: 7.7,
    trend: 0.3,
    history: days(7).map((date, i) => ({ date, value: sleepHistory[i] })),
  },
  {
    type: "caloriesBurned",
    label: "Calories burned",
    unit: "kcal",
    current: 2340,
    trend: -70,
    history: days(7).map((date, i) => ({ date, value: caloriesHistory[i] })),
  },
];

export const bloodPanel: BloodPanel = {
  date: "August 2026",
  markers: [
    {
      id: "hba1c",
      name: "HbA1c",
      value: 5.6,
      unit: "%",
      range: "4.0 – 5.6",
      status: "normal",
      history: [
        { date: "2026-02", value: 5.8 },
        { date: "2026-05", value: 5.7 },
        { date: "2026-08", value: 5.6 },
      ],
    },
    {
      id: "ldl",
      name: "LDL",
      value: 1.93,
      unit: "g/L",
      range: "< 1.90",
      status: "high",
      history: [
        { date: "2026-02", value: 2.1 },
        { date: "2026-05", value: 2.0 },
        { date: "2026-08", value: 1.93 },
      ],
    },
    {
      id: "hdl",
      name: "HDL",
      value: 1.2,
      unit: "g/L",
      range: "> 1.00",
      status: "normal",
      history: [
        { date: "2026-02", value: 1.1 },
        { date: "2026-05", value: 1.15 },
        { date: "2026-08", value: 1.2 },
      ],
    },
    {
      id: "trig",
      name: "Triglycerides",
      value: 1.1,
      unit: "g/L",
      range: "< 1.50",
      status: "normal",
      history: [
        { date: "2026-02", value: 1.3 },
        { date: "2026-05", value: 1.2 },
        { date: "2026-08", value: 1.1 },
      ],
    },
    {
      id: "vitd",
      name: "Vitamin D",
      value: 28,
      unit: "ng/mL",
      range: "30 – 100",
      status: "low",
      history: [
        { date: "2026-02", value: 22 },
        { date: "2026-05", value: 25 },
        { date: "2026-08", value: 28 },
      ],
    },
  ],
};

// V4: these four are auto-derived from real logging activity (see
// recomputeAutoStreaks in AppContext) — no goal, not user-editable.
export const streaks: Streak[] = [
  { id: "s1", label: "Logging streak", days: 7, goalDays: 30, auto: true },
  { id: "s2", label: "Movement streak", days: 12, goalDays: 30, auto: true },
  { id: "s3", label: "Workout streak", days: 4, goalDays: 8, auto: true },
  { id: "s4", label: "Nutrition streak", days: 21, goalDays: 30, auto: true },
];

export const defaultHabits: HabitItem[] = [
  { id: "h1", label: "Drink water", icon: "water", done: true, streakDays: 12 },
  { id: "h2", label: "10,000 steps", icon: "steps", done: true, streakDays: 7 },
  { id: "h3", label: "Workout", icon: "workout", done: true, streakDays: 4 },
  { id: "h4", label: "Journal", icon: "journal", done: false, streakDays: 0 },
  { id: "h5", label: "Meditate", icon: "meditation", done: false, streakDays: 0 },
];

// V10 (QA 10.0): "take inspiration from health metric apps when it comes to
// what to put in the detailed widget of the heart rate" — resting/average
// plus a daily low/high range, Apple-Health-inspired (not copied).
export const heartRateDetail = {
  resting: 68,
  average: 74,
  low: 58,
  high: 142,
  zoneMinutes: { rest: 1180, fatBurn: 180, cardio: 55, peak: 25 },
};

export const sleepDetail = {
  score: 82,
  remMin: 96,
  deepMin: 78,
  lightMin: 210,
  awakeMin: 18,
  summary: "Solid night overall — deep sleep was a little below your weekly average.",
};

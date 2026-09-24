import type { HealthMetric, BloodPanel, HabitItem } from "../types";

// Still demo data — these values are invented. Only the DATES are real, so
// a chart labelled as the last n days is actually the last n days; every
// consumer reads this history positionally, never by date key.
const days = (n: number) => {
  const arr: string[] = [];
  const today = new Date();
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

// THE FOUR AUTO STREAKS ARE NOT SEEDED HERE ANY MORE. They used to be, with
// days of 7/12/4/21 — and because they were a usePersistentState INITIAL
// value, every account saw those four numbers on its very first paint, before
// the server had been asked anything, and kept them for good if the read
// failed. An account that had logged nothing in its life was told it had a
// 21-day nutrition streak.
//
// AppContext starts the list empty instead, so nothing is claimed until the
// database answers. The labels and categories the hydration builds its four
// rows from live in services/streaks, which is where the nightly sweep's own
// vocabulary is defined; this file never held the authoritative copy.

// A STARTER TEMPLATE, NOT A CLAIM. Habits are local-only — nothing hydrates
// them — so these five are a genuine default worth offering a new account.
// What was NOT worth offering was their state: three arrived already ticked
// for today, carrying streaks of 12, 7 and 4 days. A habit somebody has never
// seen has been kept for zero days and was not done this morning.
export const defaultHabits: HabitItem[] = [
  { id: "h1", label: "Drink water", icon: "water", done: false, streakDays: 0 },
  { id: "h2", label: "10,000 steps", icon: "steps", done: false, streakDays: 0 },
  { id: "h3", label: "Workout", icon: "workout", done: false, streakDays: 0 },
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

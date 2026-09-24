import type { HabitItem } from "../types";

// WHAT IS LEFT OF THIS FILE, and what left it.
//
// It used to hold every number the Health tab drew. `healthMetrics` gave five
// metrics a seven-day history each — 107.6 down to 106.4 kg, 7,200 to 8,421
// steps — with real dates stapled on, so a chart labelled "last 7 days" showed
// the last seven days of invented readings to every account. `sleepDetail`
// gave everyone a sleep score of 82 and 96 minutes of REM. `heartRateDetail`
// gave everyone a resting 68, a 58–142 range and four "time in zone" figures.
// `bloodPanel` carried five lab markers with reference ranges, dated
// "August 2026", and was imported by nothing at all.
//
// They are replaced by real reads: services/health-metrics for the series,
// services/sleep-details for the stage breakdown, and services/labs for the
// markers — each of which shows an empty state rather than a number when
// there is nothing recorded.
//
// Only the habit template survives, because it is not a claim about anybody.

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

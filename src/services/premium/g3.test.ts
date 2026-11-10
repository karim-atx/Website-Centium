import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptLabel,
  addDays,
  canAccept,
  canGoToWeek,
  compareErrorText,
  comparePairReady,
  compareRowsView,
  defaultSummaryPeriod,
  failKind,
  contentCacheKey,
  g3On,
  g3State,
  groupByWeek,
  groupPrompts,
  lastWeekStart,
  libraryKind,
  mondayOf,
  notADiagnosisLine,
  parseCompare,
  parseContentLines,
  parseDoctorSummary,
  parseLibrary,
  parseMyProgrammes,
  parsePromptLibrary,
  parsePromptOfTheDay,
  parseProgrammes,
  parseSessions,
  parseSuggestions,
  parseTrend,
  parseWeeklyReview,
  promptHeading,
  reviewLines,
  scriptSteps,
  sessionAccess,
  sessionDate,
  sessionDone,
  startDateValid,
  startErrorText,
  startWindow,
  stepAt,
  suggestionLine,
  summaryErrorText,
  summaryFileName,
  summaryPeriodValid,
  summarySections,
  trendKey,
  trendLocked,
  trendResults,
} from "./g3.ts";
import { setActiveLanguage } from "../../i18n/core.ts";
import { surgeryDate } from "../../utils/recordDates.ts";

const ON = { premiumOn: true, premium: false };
const PREMIUM = { premiumOn: true, premium: true };
const OFF = { premiumOn: false, premium: false };

// ---- hidden while off ----

test("the switch off, loading or unknown hides G3; on shows it", () => {
  assert.equal(g3On(null), false);
  assert.equal(g3On(undefined), false);
  assert.equal(g3On(OFF), false);
  assert.equal(g3On(ON), true);
  assert.deepEqual(g3State(null, { kind: "ready", value: 1 }), { kind: "hidden" });
  assert.deepEqual(g3State(OFF, { kind: "ready", value: 1 }), { kind: "hidden" });
  assert.deepEqual(g3State(ON, null), { kind: "loading" });
  assert.deepEqual(g3State(ON, { kind: "ready", value: 1 }), { kind: "ready", value: 1 });
});

test("ATXQ0 and a missing function hide; ATXQ1 is the locked state; anything else is an error", () => {
  assert.equal(failKind({ code: "ATXQ0" }), "hidden");
  assert.equal(failKind({ code: "P0001", message: "ATXQ0: that is not available yet" }), "hidden");
  assert.equal(failKind({ code: "PGRST202" }), "hidden");
  assert.equal(failKind({ code: "42883" }), "hidden");
  assert.equal(failKind({ status: 404 }), "hidden");
  assert.equal(failKind({ code: "ATXQ1" }), "premium");
  assert.equal(failKind({ message: "ATXQ1: journal prompts are part of Centium Premium" }), "premium");
  assert.equal(failKind({ code: "ATX08" }), "error");
  assert.equal(failKind({ code: "500" }), "error");
});

// ---- programmes ----

test("programmes, sessions and my programmes parse; a locked session carries no content", () => {
  const [p] = parseProgrammes([
    {
      programme_id: "p1", slug: "strength-foundations", title: "Strength Foundations", for_whom: "beginners", length_text: "8 weeks", equipment: "dumbbells",
      description: "Learn", how_it_runs: null, warm_up: "5 min", progression: [{ weeks: "1–2", effort: "RPE 6", what_to_do: "Learn" }, { weeks: "x" }],
      free_preview: "Free preview: week 1.", suggested_next: null, weeks: 8, sessions_per_week: 3, sessions: 24, free_sessions: 3, locked: true,
    },
    { slug: "no-id" },
  ]);
  assert.equal(p.title, "Strength Foundations");
  assert.equal(p.progression.length, 1);
  assert.equal(p.locked, true);
  assert.equal(p.howItRuns, null);

  const s = parseSessions([
    { session_number: 4, week: 2, day_offset: 0, title: "Workout B", effort: "RPE 6", items: [{ name: "Split squat", amount: "3 × 8", rest: "90 s", notes: "Hold a chair" }], free: false, locked: true },
    { session_number: 1, week: 1, day_offset: 0, title: "Workout A", effort: "RPE 6", note: "Learn", items: [{ name: "Goblet squat", amount: "3 × 8–10", rest: "90 s", notes: null }], free: true, locked: false },
  ]);
  assert.deepEqual(s.map((x) => x.number), [1, 4]);
  assert.equal(s[0].items?.[0].name, "Goblet squat");
  assert.equal(s[1].items, null);
  assert.equal(s[1].effort, null);
  assert.equal(sessionAccess(s[0]), "open");
  assert.equal(sessionAccess(s[1]), "locked");

  const [m] = parseMyProgrammes([{ start_id: "s1", programme_id: "p1", slug: "x", title: "X", starts_on: "2026-11-02", sessions: 24, done: 1, done_sessions: [1], next_session_number: 2, next_on: "2026-11-04", next_locked: false }]);
  assert.equal(m.nextSessionNumber, 2);
  assert.equal(m.nextOn, "2026-11-04");
  assert.deepEqual(m.doneSessions, [1]);
  // done_sessions: whole positive numbers, in order, no repeats; missing reads as none
  const [odd] = parseMyProgrammes([{ start_id: "s2", programme_id: "p1", starts_on: "2026-11-02", done_sessions: [1, 2, 5, "7", 5, 0, -1, 2.5, null] }]);
  assert.deepEqual(odd.doneSessions, [1, 2, 5, 7]);
  const [none] = parseMyProgrammes([{ start_id: "s3", programme_id: "p1", starts_on: "2026-11-02" }]);
  assert.deepEqual(none.doneSessions, []);
});

test("the preview is the open sessions: a week of locked sessions reads locked; dates follow starts_on + week and day", () => {
  const s = parseSessions([
    { session_number: 1, week: 1, day_offset: 0, title: "A", free: true, locked: false, items: [] },
    { session_number: 2, week: 1, day_offset: 2, title: "B", free: true, locked: false, items: [] },
    { session_number: 3, week: 2, day_offset: 0, title: "A", free: false, locked: true },
  ]);
  const w = groupByWeek(s);
  assert.deepEqual(w.map((x) => [x.week, x.locked]), [[1, false], [2, true]]);
  assert.equal(sessionDate("2026-11-02", s[1]), "2026-11-04");
  assert.equal(sessionDate("2026-11-02", s[2]), "2026-11-09");
  // Premium: nothing locked.
  const open = parseSessions([{ session_number: 3, week: 2, day_offset: 0, title: "A", free: false, locked: false, items: [] }]);
  assert.equal(sessionAccess(open[0]), "open");
});

test("a start day is today to 30 days ahead", () => {
  assert.deepEqual(startWindow("2026-11-02"), { min: "2026-11-02", max: "2026-12-02" });
  assert.equal(startDateValid("2026-11-02", "2026-11-02"), true);
  assert.equal(startDateValid("2026-12-02", "2026-11-02"), true);
  assert.equal(startDateValid("2026-12-03", "2026-11-02"), false);
  assert.equal(startDateValid("2026-11-01", "2026-11-02"), false);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(startErrorText("ATX10"), "You're already following this programme.");
  assert.equal(startErrorText("22023"), "Choose a day from today to 30 days ahead.");
});

test("a session reads done from done_sessions, out of order too; what was marked here wins", () => {
  // Sessions 1, 2 and 5 done; 3 and 4 not (the count-based guess read 5 as not done).
  const p = { doneSessions: [1, 2, 5] };
  const none = new Map<number, boolean>();
  assert.equal(sessionDone(1, p, none), true);
  assert.equal(sessionDone(2, p, none), true);
  assert.equal(sessionDone(3, p, none), false);
  assert.equal(sessionDone(4, p, none), false);
  assert.equal(sessionDone(5, p, none), true);
  assert.equal(sessionDone(6, p, none), false);
  assert.equal(sessionDone(1, p, new Map([[1, false]])), false);
  assert.equal(sessionDone(4, p, new Map([[4, true]])), true);
  assert.equal(sessionDone(1, { doneSessions: [] }, none), false);
  assert.equal(sessionDone(1, null, none), false);
});

// ---- the library ----

test("the library: free sessions open, locked ones carry no script or phases", () => {
  const l = parseLibrary([
    { content_id: "c1", slug: "settle-in", title: "Settle in", content_type: "meditation", minutes: 3, access: "free", locked: false, phases: null, script: "Close your eyes." },
    { content_id: "c2", slug: "box-breathing", title: "Box breathing", content_type: "breathing", minutes: 4, access: "free", locked: false, phases: [{ label: "Breathe in", seconds: 4 }, { label: "Hold", seconds: 4 }], script: "Breathe." },
    { content_id: "c4", slug: "longer-out-breath", title: "Longer out-breath", content_type: "breathing", minutes: 5, access: "premium", locked: true, phases: null, script: null },
  ]);
  assert.deepEqual(l.map((x) => [x.slug, x.locked]), [["settle-in", false], ["box-breathing", false], ["longer-out-breath", true]]);
  assert.equal(l[1].phases?.length, 2);
  assert.equal(l[2].script, null);
  assert.equal(l[2].type, "breathing");
  assert.equal(libraryKind("box-breathing"), "box_breathing");
  assert.equal(libraryKind("before-training-focus"), "before_training_focus");
  assert.equal(libraryKind("1"), "meditation_library");
});

test("a script becomes timed steps that add up to the session; a quotation stays one step", () => {
  const script = 'Place a hand on your chest. Breathe slowly. Say silently: "This is hard. Many people feel this way. May I be patient with myself." Breathe with those words for a few minutes.';
  const steps = scriptSteps(script, 8);
  assert.equal(steps.length, 4);
  assert.ok(steps[2].text.startsWith("Say silently:") && steps[2].text.endsWith('myself."'));
  assert.equal(steps.reduce((a, s) => a + s.seconds, 0), 480);
  assert.ok(steps.every((s) => s.seconds >= 5));
  assert.deepEqual(stepAt(steps, 0), { index: 0, progress: 0, finished: false });
  assert.equal(stepAt(steps, 480).finished, true);
  assert.deepEqual(scriptSteps("", 3), []);
});

test("content lines by key", () => {
  const l = parseContentLines([{ key: "programme_safety", text: "If you have a health condition" }, { key: "session_support", text: "You don't have to manage it alone." }]);
  assert.equal(l.programmeSafety, "If you have a health condition");
  assert.equal(l.effortGuide, null);
  assert.equal(l.sessionSupport, "You don't have to manage it alone.");
});

// ---- journal prompts ----

test("the prompt library groups by group, locked prompts have no text; the prompt of the day", () => {
  const rows = parsePromptLibrary([
    { number: 2, group_key: "reflection", group_title: "Reflection", prompt_position: 2, text: null, locked: true },
    { number: 1, group_key: "reflection", group_title: "Reflection", prompt_position: 1, text: null, locked: true },
    { number: 11, group_key: "gratitude", group_title: "Gratitude", prompt_position: 1, text: null, locked: true },
  ]);
  const g = groupPrompts(rows);
  assert.deepEqual(g.map((x) => [x.title, x.prompts.map((p) => p.number)]), [["Reflection", [1, 2]], ["Gratitude", [11]]]);
  assert.ok(rows.every((r) => r.locked && r.text === null));
  assert.deepEqual(parsePromptOfTheDay([{ number: 5, group_key: "reflection", group_title: "Reflection", text: "What did you learn?" }]), { number: 5, groupTitle: "Reflection", text: "What did you learn?" });
  assert.equal(parsePromptOfTheDay([]), null);
  assert.equal(promptHeading("x".repeat(250)).length, 200);
});

// ---- the weekly review ----

test("the review: counts always, numbers only when not hidden", () => {
  const base = { week_start: "2026-10-26", week_end: "2026-11-01", days_logged: 5, workouts: 3, habit_check_ins: 9, meditation_sessions: 2, journal_entries: 1, water_goal_days: 4 };
  const open = parseWeeklyReview({ ...base, numbers_hidden: false, average_steps: 8123.4, average_sleep_minutes: 440, meditation_minutes: 18 })!;
  const l = reviewLines(open);
  assert.equal(l.counts.length, 6);
  assert.deepEqual(l.numbers.map((n) => n.key), ["average_steps", "average_sleep", "meditation_minutes"]);
  assert.equal(l.numbers[0].value, "8123");
  assert.equal(l.numbers[1].value, "7 h 20 min");

  // Recovery-sensitive mode: never a number, even if one arrived.
  const hidden = parseWeeklyReview({ ...base, numbers_hidden: true, average_steps: 9000, average_sleep_minutes: null, meditation_minutes: null })!;
  assert.equal(hidden.averageSteps, null);
  assert.deepEqual(reviewLines(hidden).numbers, []);
  assert.equal(reviewLines(hidden).counts.length, 6);

  // Null numbers outside the mode are simply left out.
  assert.deepEqual(reviewLines(parseWeeklyReview({ ...base, numbers_hidden: false, average_steps: null })!).numbers, []);
  assert.equal(parseWeeklyReview(null), null);
});

test("weeks: Monday to Sunday, last week by default, no further forward than last week", () => {
  assert.equal(mondayOf("2026-11-02"), "2026-11-02"); // a Monday
  assert.equal(mondayOf("2026-11-08"), "2026-11-02"); // its Sunday
  assert.equal(lastWeekStart("2026-11-04"), "2026-10-26");
  assert.equal(canGoToWeek("2026-10-26", "2026-11-04"), true);
  assert.equal(canGoToWeek("2026-11-02", "2026-11-04"), false);
});

// ---- target suggestions ----

test("suggestions: steps and water can be accepted, calories and protein only ever say check your target", () => {
  const s = parseSuggestions([
    { kind: "steps", current_target: 8000, suggested: 9000, reason: "met_5_of_7" },
    { kind: "water", current_target: 2000, suggested: 2250, reason: "met_5_of_7" },
    { kind: "calories", current_target: null, suggested: 1800, reason: "check_your_target" },
    { kind: "protein", current_target: null, suggested: null, reason: "check_your_target" },
    { kind: "sleep", suggested: 1 },
  ]);
  assert.deepEqual(s.map((x) => x.kind), ["steps", "water", "calories", "protein"]);
  assert.equal(s[2].suggested, null, "never a number for calories");
  assert.deepEqual(s.map(canAccept), [true, true, false, false]);
  assert.equal(acceptLabel(s[0]), "Make 9000 steps my goal");
  assert.equal(acceptLabel(s[1], (n) => n.toLocaleString("en-US")), "Make 2,250 ml my goal");
  assert.equal(acceptLabel(s[2]), null);
  assert.equal(parseSuggestions([]).length, 0);
});

test("suggestion wording by reason is neutral, and calories and protein carry no number", () => {
  assert.equal(suggestionLine({ kind: "steps", reason: "met_5_of_7" }), "You reached your step goal on 5 or more days last week.");
  assert.match(suggestionLine({ kind: "steps", reason: "met_2_or_fewer" })!, /might suit/);
  assert.equal(suggestionLine({ kind: "water", reason: "met_5_of_7" }), "You reached your water goal on 5 or more days last week.");
  for (const kind of ["calories", "protein"] as const) {
    const line = suggestionLine({ kind, reason: "check_your_target" })!;
    assert.match(line, /check that your target still suits you/);
    assert.doesNotMatch(line, /\d{2,}/);
  }
  assert.equal(suggestionLine({ kind: "water", reason: "met_2_or_fewer" }), null);
  for (const kind of ["steps", "water", "calories", "protein"] as const)
    for (const reason of ["met_5_of_7", "met_2_or_fewer", "check_your_target"] as const) {
      const line = suggestionLine({ kind, reason });
      if (line) assert.doesNotMatch(line, /\b(fail|bad|lazy|should|must|only)\b/i, `${kind}:${reason}`);
    }
});

// ---- the doctor summary ----

const SUMMARY = {
  generated_at: "2026-11-02T10:00:00Z",
  period: { from: "2026-08-04", to: "2026-11-02" },
  numbers_hidden: false,
  person: { first_name: "Sara", age: 34, sex: "female" },
  medications: [{ name: "Metformin", dose: "500 mg", route: "oral", times: ["08:00", "20:00"], notes: null }],
  allergies: [{ allergen: "Penicillin", severity: "severe", note: null }],
  conditions: ["Type 2 diabetes"],
  surgeries: [{ name: "Appendectomy", date: "2015-03-01" }],
  blood_pressure: { readings: 3, average_systolic: 121, average_diastolic: 79, latest: { systolic: 118, diastolic: 76, pulse: 64, at: "2026-11-01T08:00:00Z" } },
  weight: { first: { kg: 70.2, on: "2026-08-10" }, latest: { kg: 69.4, on: "2026-10-30" } },
  lab_results: [{ marker: "HbA1c", value: 6.1, unit: "%", range_low: 4, range_high: 5.6, status: "high", on: "2026-10-01" }],
  cycle: null,
};

test("the doctor summary's sections: every part in order, weight only when given, cycle only when tracking", () => {
  const s = parseDoctorSummary(SUMMARY)!;
  const sections = summarySections(s);
  assert.deepEqual(sections.map((x) => x.key), ["person", "medications", "allergies", "conditions", "surgeries", "blood_pressure", "weight", "lab_results"]);
  assert.deepEqual(sections[0].lines, ["Name: Sara", "Age: 34", "Sex: female"]);
  assert.equal(sections[1].lines[0], "Metformin · 500 mg · oral · 08:00, 20:00");
  assert.equal(sections[5].lines[0], "3 readings in this period");
  assert.equal(sections[5].lines[1], "Average: 121/79 mmHg");
  assert.match(sections[5].lines[2], /^Latest: 118\/76 mmHg · pulse 64 · 2026-11-01$/);
  assert.deepEqual(sections[6].lines, ["First: 70.2 kg · 2026-08-10", "Latest: 69.4 kg · 2026-10-30"]);
  assert.equal(sections[7].lines[0], "HbA1c: 6.1 % · above range · range 4–5.6 · 2026-10-01");

  // Recovery-sensitive mode: weight null, the section is left out.
  const rec = summarySections(parseDoctorSummary({ ...SUMMARY, numbers_hidden: true, weight: null })!);
  assert.ok(!rec.some((x) => x.key === "weight"));

  // Tracking the cycle adds its section.
  const cyc = summarySections(parseDoctorSummary({ ...SUMMARY, cycle: { typical_cycle_length: 28, typical_period_length: 5, conditions: ["PCOS"] } })!);
  assert.deepEqual(cyc.at(-1)!.lines, ["Typical cycle: 28 days", "Typical period: 5 days", "PCOS"]);

  // Nothing recorded: empty lines, each section says so.
  const empty = summarySections(parseDoctorSummary({ period: {}, person: null, medications: [], allergies: [], conditions: [], surgeries: [], blood_pressure: { readings: 0 }, weight: null, lab_results: [] })!);
  assert.ok(empty.every((x) => x.lines.length === 0 && !!x.empty));
  assert.equal(parseDoctorSummary(null), null);
});

test("the summary's surgeries print each date at its precision (Database #62's date_precision)", () => {
  const day = (ymd: string) => `day(${ymd})`; // stands in for the page's full-date format
  const s = parseDoctorSummary({
    ...SUMMARY,
    surgeries: [
      { name: "Tonsillectomy", date: "2001-01-01", date_precision: "year" },
      { name: "Appendectomy", date: "2019-06-14", date_precision: "day" },
      { name: "Knee arthroscopy", date: "2025-03-01", date_precision: "month" },
      { name: "Bunion", date: "2020-02-02" }, // no date_precision: a summary from before #62
      { name: "Wisdom teeth", date: "2018-05-05", date_precision: "decade" }, // unknown: full date
    ],
  })!;
  assert.deepEqual(s.surgeries.map((x) => x.datePrecision), ["year", "day", "month", "day", "day"]);
  const lines = summarySections(s, day).find((x) => x.key === "surgeries")!.lines;
  assert.equal(lines[0], "Tonsillectomy · 2001");
  // A full date is the page's day format, exactly as before.
  assert.equal(lines[1], "Appendectomy · day(2019-06-14)");
  assert.equal(lines[2], "Knee arthroscopy · Mar 2025");
  assert.equal(lines[3], "Bunion · day(2020-02-02)");
  assert.equal(lines[4], "Wisdom teeth · day(2018-05-05)");
});

test("a month-only surgery is the month and year in Arabic too, as the History tab shows it", () => {
  setActiveLanguage("ar");
  try {
    const s = parseDoctorSummary({ ...SUMMARY, surgeries: [{ name: "Knee", date: "2025-03-01", date_precision: "month" }] })!;
    const line = summarySections(s).find((x) => x.key === "surgeries")!.lines[0];
    const historyTab = surgeryDate({ date: "2025-03-01", datePrecision: "month" });
    assert.equal(line, `Knee · ${historyTab}`);
    assert.match(historyTab, /2025/);
    assert.doesNotMatch(historyTab, /Mar/);
  } finally {
    setActiveLanguage("en");
  }
});

test("surgeryDate, moved to utils/recordDates, gives the History tab the same dates as before", () => {
  assert.equal(surgeryDate({ date: "2026-07-14", datePrecision: "day" }), "Jul 14, 2026");
  assert.equal(surgeryDate({ date: "2026-07-14" }), "Jul 14, 2026");
  assert.equal(surgeryDate({ date: "2026-07-01", datePrecision: "month" }), "Jul 2026");
  assert.equal(surgeryDate({ date: "2026-01-01", datePrecision: "year" }), "2026");
});

test("the summary's period, file name and lines", () => {
  assert.deepEqual(defaultSummaryPeriod("2026-11-02"), { from: "2026-08-04", to: "2026-11-02" });
  assert.equal(summaryPeriodValid("2024-11-02", "2026-11-02", "2026-11-02"), true);
  assert.equal(summaryPeriodValid("2024-11-01", "2026-11-02", "2026-11-02"), false);
  assert.equal(summaryPeriodValid("2026-11-03", "2026-11-02", "2026-11-02"), false);
  assert.equal(summaryPeriodValid("2026-10-01", "2026-11-03", "2026-11-02"), false);
  assert.equal(summaryFileName("2026-11-02"), "centium-doctor-summary-2026-11-02.pdf");
  assert.equal(notADiagnosisLine(), "For your doctor. Not a diagnosis.");
  assert.equal(summaryErrorText("22023"), "Choose a period of up to two years.");
});

// ---- comparison and trends ----

test("the comparison rows: both values, the change, and the change in % only when given", () => {
  const rows = compareRowsView(
    parseCompare([
      { marker_key: "hba1c", name: "HbA1c", unit: "%", value_a: 6.4, value_b: 6.1, change: -0.3, change_pct: -4.7, status_a: "high", status_b: "high" },
      { marker_key: "ldl", name: "LDL", unit: "mmol/L", value_a: 2.8, value_b: 2.8, change: 0, change_pct: 0, status_a: "normal", status_b: "normal" },
      { marker_key: "glucose", name: "Glucose", unit: "mg/dL", value_a: 90, value_b: 5.4, change: null, change_pct: null, status_a: "normal", status_b: "normal" },
      { marker_key: "tsh", name: "TSH", unit: "mIU/L", value_a: null, value_b: 2.1, change: null, change_pct: null, status_a: null, status_b: "normal" },
      { marker_key: "zero", name: "Zero", unit: "x", value_a: 0, value_b: 1, change: 1, change_pct: null, status_a: null, status_b: null },
    ])
  );
  assert.deepEqual(
    rows.map((r) => [r.name, r.a, r.b, r.change, r.changePct]),
    [
      ["HbA1c", "6.4", "6.1", "−0.3", "−4.7%"],
      ["LDL", "2.8", "2.8", "0", "0%"],
      ["Glucose", "90", "5.4", null, null],
      ["TSH", "–", "2.1", null, null],
      ["Zero", "0", "1", "+1", null],
    ]
  );
  assert.equal(compareErrorText("ATX08"), "Choose two of your own reports.");
  assert.equal(comparePairReady("a", "b"), true);
  assert.equal(comparePairReady("a", "a"), false);
  assert.equal(comparePairReady(null, "b"), false);
});

test("biomarker trends: Premium with the switch on and more than one reading; off or Premium shows today's chart", () => {
  assert.equal(trendLocked(ON, 3), true);
  assert.equal(trendLocked(ON, 1), false, "a single reading stays visible");
  assert.equal(trendLocked(PREMIUM, 3), false);
  assert.equal(trendLocked(OFF, 3), false);
  assert.equal(trendLocked(null, 3), false);
  assert.equal(trendKey({ markerKey: "HbA1c", name: "x" }), "hba1c");
  assert.equal(trendKey({ markerKey: null, name: " Vitamin D " }), "vitamin d");
});

test("the trend reader's points line up with the page's results", () => {
  const results = [
    { id: "r1", panelId: "p1", date: "2026-01-01", value: 6.4, unit: "%", status: "high" as const, reportName: "Jan" },
    { id: "r2", panelId: null, date: "2026-06-01", value: 6.1, unit: "%", status: "high" as const, reportName: null },
  ];
  const points = parseTrend([
    { result_date: "2026-06-01", value: 6.1, unit: "%", status: "high", panel_id: null },
    { result_date: "2026-01-01", value: 6.4, unit: "%", status: "high", panel_id: "p1" },
    { result_date: "2026-09-01", value: 5.9, unit: "%", status: "high", panel_id: "p9" },
  ]);
  const out = trendResults(points, results);
  assert.deepEqual(out.map((r) => r.id), ["r1", "r2", "trend-2"]);
  assert.equal(out[2].value, 5.9);
  assert.deepEqual(trendResults([], results), results);
});

test("the content readers keep each answer under the account and the app language (G fixes 3)", () => {
  // the content answers in the member's language, so English and Arabic never share a copy
  assert.notEqual(contentCacheKey("u1", "en", "programmes"), contentCacheKey("u1", "ar", "programmes"));
  assert.notEqual(contentCacheKey("u1", "en"), contentCacheKey("u1", "ar"));
  // nor do two accounts, or two reads
  assert.notEqual(contentCacheKey("u1", "ar", "library"), contentCacheKey("u2", "ar", "library"));
  assert.notEqual(contentCacheKey("u1", "ar", "library"), contentCacheKey("u1", "ar", "prompt-library"));
  assert.equal(contentCacheKey("u1", "ar", "sessions:p1"), contentCacheKey("u1", "ar", "sessions:p1"));
  // a key is never a prefix of another account's or language's
  assert.equal(contentCacheKey("u1", "en", "mine").startsWith(`${contentCacheKey("u1", "ar", "")}`), false);
});

test("FQ: the doctor summary prints the member's own Other allergies, quoted, after the standard ones", () => {
  const s = parseDoctorSummary({ ...SUMMARY, other_allergies: [{ label: "Kiwi", severity: "severe", note: null }, { label: "", severity: "mild" }] })!;
  assert.deepEqual(s.otherAllergies, [{ label: "Kiwi", severity: "severe", note: null }]);
  const allergies = summarySections(s).find((x) => x.key === "allergies")!;
  assert.deepEqual(allergies.lines, ["Penicillin · severe", "“⁨Kiwi⁩” · severe"]);
  // A summary from today's database has no other_allergies: nothing extra.
  assert.deepEqual(parseDoctorSummary(SUMMARY)!.otherAllergies, []);
});

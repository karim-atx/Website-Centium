import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  answerTriggersSafety,
  dueLine,
  dueShort,
  firstPartMissing,
  formReminder,
  groupReminders,
  BODY_MEASURE_UNITS,
  isBodyMeasure,
  itemsOf,
  longDate,
  missingMessage,
  missingRequired,
  nextOccurrence,
  parseNumber,
  partQuestions,
  partsOf,
  popupQueue,
  referralBody,
  referralTitle,
  referralReminder,
  resumePart,
  scaleColumns,
  scaleValues,
  sessionLevel,
  sessionReminder,
  sessionTitle,
  shareReminder,
  showDoctorFollowUp,
  visibleAnswers,
  visibleQuestions,
  type ClientQuestion,
  type Reminder,
} from "./logic";
import { DOCTOR_FOLLOW_UP, SEE_WARNING_SIGNS } from "../../components/client-forms/copy";

let n = 0;
const q = (over: Partial<ClientQuestion>): ClientQuestion => ({
  id: `q${(n += 1)}`,
  position: n,
  type: "text",
  prompt: "Anything else?",
  unit: null,
  required: false,
  options: null,
  scaleMin: null,
  scaleMax: null,
  safetyTopic: null,
  safetyTrigger: null,
  ...over,
});

// The built-in Weekly check-in (create_weekly_check_in_template), in order.
const template = () => [
  q({ type: "number", prompt: "Weight", unit: "kg" }),
  q({ type: "photo", prompt: "Progress photos" }),
  q({ type: "scale", prompt: "How was your energy this week?", required: true, scaleMin: 1, scaleMax: 5 }),
  q({ type: "scale", prompt: "How well did you sleep?", required: true, scaleMin: 1, scaleMax: 5 }),
  q({ type: "scale", prompt: "Any pain this week? (0 none, 10 severe)", required: true, scaleMin: 0, scaleMax: 10, safetyTopic: "pain", safetyTrigger: { min: 4 } }),
  q({ type: "choice", prompt: "Any new injury?", required: true, options: ["No", "Yes"], safetyTopic: "injury", safetyTrigger: { answers: ["Yes"] } }),
  q({ type: "choice", prompt: "Have you been unwell?", required: true, options: ["No", "Yes"], safetyTopic: "illness", safetyTrigger: { answers: ["Yes"] } }),
  q({ type: "text", prompt: "Any symptoms that worry you?", safetyTopic: "symptoms" }),
  q({ type: "text", prompt: "Anything else for your coach?" }),
];

describe("J12: recovery-sensitive mode hides exactly form_question_is_body_measure", () => {
  it("lists every unit of the database rule, and only those", () => {
    assert.deepEqual([...BODY_MEASURE_UNITS], ["kg", "g", "lb", "lbs", "st", "cm", "mm", "m", "in", "inch", "inches", "ft"]);
    for (const unit of ["kg", "g", "lb", "lbs", "st", "cm", "mm", "m", "in", "inch", "inches", "ft"]) {
      assert.equal(isBodyMeasure("number", unit), true, unit);
      // lower(btrim(unit)): case and surrounding spaces don't matter.
      assert.equal(isBodyMeasure("number", ` ${unit.toUpperCase()} `), true, unit);
      // Only a number question.
      for (const type of ["scale", "choice", "multi", "text", "photo", "date"]) assert.equal(isBodyMeasure(type, unit), false, `${type} ${unit}`);
    }
  });

  it("hides nothing else: other units, no unit, the prompt's wording, or a safety topic don't change it", () => {
    for (const unit of ["%", "kgs", "kilos", "pounds", "stone", "sessions", "steps", "bpm", "", null, undefined]) assert.equal(isBodyMeasure("number", unit), false, String(unit));
    // btrim trims spaces only.
    assert.equal(isBodyMeasure("number", "\tkg"), false);
    assert.equal(isBodyMeasure("text", null), false);
    // The rule is exact: a safety-marked body measure is hidden too; a weight-worded text question isn't.
    const safetyWeight = q({ type: "number", prompt: "Weight", unit: "kg", safetyTopic: "symptoms" });
    const wordy = q({ type: "text", prompt: "What do you weigh now?" });
    const pain = q({ type: "choice", prompt: "Any pain in your hips?", options: ["No", "Yes"], safetyTopic: "pain" });
    assert.deepEqual(visibleQuestions([safetyWeight, wordy, pain], true).map((x) => x.id), [wordy.id, pain.id]);
  });

  it("filters only in recovery-sensitive mode, keeps order, and drops hidden answers so they're never sent", () => {
    const qs = template().reverse();
    assert.equal(visibleQuestions(qs, false).length, 9);
    const shown = visibleQuestions(qs, true);
    assert.equal(shown.length, 8);
    assert.ok(!shown.some((x) => x.prompt === "Weight"));
    assert.deepEqual(shown.map((x) => x.position), [...shown.map((x) => x.position)].sort((a, b) => a - b));
    const weight = qs.find((x) => x.prompt === "Weight")!;
    const energy = qs.find((x) => x.prompt.startsWith("How was"))!;
    const sent = visibleAnswers({ [weight.id]: 81.9, [energy.id]: 4 }, shown);
    assert.deepEqual(sent, { [energy.id]: 4 });
  });

  it("makes a hidden question not required", () => {
    const req = q({ type: "number", prompt: "Weight", unit: "kg", required: true });
    const shown = visibleQuestions([req], true);
    assert.deepEqual(missingRequired(shown, {}), []);
    assert.deepEqual(missingRequired(visibleQuestions([req], false), {}), [req.id]);
  });
});

describe("parts and items (CU6 part 1 of 3)", () => {
  it("groups measurement fields into one numbered entry", () => {
    const items = itemsOf([q({ type: "number", prompt: "Weight", unit: "kg" }), q({ type: "number", prompt: "Waist", unit: "cm" }), q({ type: "number", prompt: "Hips", unit: "cm" }), q({ type: "photo", prompt: "Progress photos" })]);
    assert.equal(items.length, 2);
    assert.equal(items[0].kind, "measures");
    assert.equal(items[0].questions.length, 3);
  });

  it("splits the built-in check-in into measurements and photos, then fours", () => {
    const parts = partsOf(itemsOf(template()));
    assert.deepEqual(parts.map((p) => partQuestions(p).length), [2, 4, 3]);
  });

  it("keeps a short form in one part", () => {
    assert.equal(partsOf(itemsOf([q({}), q({}), q({})])).length, 1);
    assert.deepEqual(partsOf([]), [[]]);
  });

  it("chunks a form with no measurements by four", () => {
    assert.deepEqual(partsOf(itemsOf(Array.from({ length: 9 }, () => q({})))).map((p) => p.length), [4, 4, 1]);
  });

  it("resumes where the draft was left", () => {
    const qs = template();
    const parts = partsOf(itemsOf(qs));
    assert.equal(resumePart(parts, {}), 0);
    // Part 1 done (photos optional and empty): part 2.
    assert.equal(resumePart(parts, { [qs[0].id]: 80 }), 1);
    // Part 2 started, required answers still missing: part 2.
    assert.equal(resumePart(parts, { [qs[0].id]: 80, [qs[2].id]: 3 }), 1);
    const all = Object.fromEntries(qs.map((x) => [x.id, "x"]));
    assert.equal(resumePart(parts, all), 2);
  });

  it("finds the first part with a required answer missing", () => {
    const qs = template();
    const parts = partsOf(itemsOf(qs));
    assert.equal(firstPartMissing(parts, {}), 1);
    const answers = Object.fromEntries(qs.filter((x) => x.required).map((x) => [x.id, 1]));
    assert.equal(firstPartMissing(parts, answers), -1);
    assert.equal(firstPartMissing(parts, { ...answers, [qs[5].id]: "  " }), 1);
  });

  it("writes the CU6 required-answer message", () => {
    assert.equal(missingMessage(q({ type: "number", prompt: "Hips", unit: "cm" })), "Add your hips measurement to continue");
    assert.equal(missingMessage(q({ type: "photo", prompt: "Photo" })), "Add a photo to continue");
    assert.equal(missingMessage(q({ type: "choice", prompt: "Any new injury?" })), "Answer this question to continue");
  });

  it("lays out scales and parses numbers", () => {
    assert.deepEqual(scaleValues({ scaleMin: 1, scaleMax: 5 }), [1, 2, 3, 4, 5]);
    assert.equal(scaleValues({ scaleMin: 0, scaleMax: 10 }).length, 11);
    assert.deepEqual(scaleValues({ scaleMin: 5, scaleMax: 5 }), []);
    assert.equal(scaleColumns(5), 5);
    assert.equal(scaleColumns(10), 5);
    assert.equal(scaleColumns(11), 6);
    assert.equal(parseNumber("81,9"), 81.9);
    assert.equal(parseNumber(""), null);
    assert.equal(parseNumber("abc"), null);
  });
});

describe("safety follow-up (DECISIONS Safety; mirrors form_answer_triggers_safety)", () => {
  const [, , , , pain, injury, ill, symptoms, other] = template();

  it("mirrors the database's trigger rules", () => {
    assert.equal(answerTriggersSafety(pain, 3), false);
    assert.equal(answerTriggersSafety(pain, 4), true);
    assert.equal(answerTriggersSafety(injury, "No"), false);
    assert.equal(answerTriggersSafety(injury, "Yes"), true);
    assert.equal(answerTriggersSafety(injury, ["No", "Yes"]), true);
    assert.equal(answerTriggersSafety(symptoms, " none "), false);
    assert.equal(answerTriggersSafety(symptoms, "N/A"), false);
    assert.equal(answerTriggersSafety(symptoms, "Dizzy after runs"), true);
    assert.equal(answerTriggersSafety(other, "Dizzy after runs"), false);
    assert.equal(answerTriggersSafety(ill, null), false);
    // No trigger: any positive number (the fixture's "Any pain or injury? (0 = none)").
    const bare = q({ type: "scale", safetyTopic: "pain", scaleMin: 0, scaleMax: 5 });
    assert.equal(answerTriggersSafety(bare, 0), false);
    assert.equal(answerTriggersSafety(bare, 1), true);
  });

  it("follows the database's flag and never hides it", () => {
    const qs = [pain, injury];
    assert.equal(showDoctorFollowUp({ safety_flag: true }, qs, {}), true);
    assert.equal(showDoctorFollowUp({ safety_flag: false }, qs, { [pain.id]: 1, [injury.id]: "No" }), false);
    // The mirror only adds to a returned row; it never decides without one.
    assert.equal(showDoctorFollowUp({ safety_flag: false }, qs, { [injury.id]: "Yes" }), true);
    assert.equal(showDoctorFollowUp(null, qs, { [injury.id]: "Yes" }), false);
  });

  it("reuses the Mood check-in's exact wording", () => {
    const src = readFileSync(new URL("../../components/health-checks/CheckInSheet.tsx", import.meta.url), "utf8");
    assert.ok(src.includes(DOCTOR_FOLLOW_UP), "talk to a doctor line");
    assert.ok(src.includes(SEE_WARNING_SIGNS), "warning signs button");
  });
});

describe("dates", () => {
  const now = new Date(2026, 9, 15, 9, 0);
  it("writes due lines in 12-hour time", () => {
    assert.equal(dueLine(new Date(2026, 9, 15, 20, 0).toISOString(), now), "Due today 8:00 PM");
    assert.equal(dueLine(new Date(2026, 9, 16, 14, 14).toISOString(), now), "Due tomorrow 2:14 PM");
    assert.equal(dueLine(new Date(2026, 9, 18, 18, 0).toISOString(), now), "Due Sunday 6:00 PM");
    assert.equal(dueLine(new Date(2026, 9, 30, 18, 0).toISOString(), now), "Due 30 Oct 6:00 PM");
    assert.equal(dueLine(new Date(2026, 9, 14, 18, 0).toISOString(), now), "Was due yesterday 6:00 PM");
    assert.equal(dueShort(new Date(2026, 9, 15, 20, 0).toISOString(), now), "due 8:00 PM");
    assert.equal(dueShort(new Date(2026, 9, 16, 20, 0).toISOString(), now), "due tomorrow 8:00 PM");
    assert.equal(dueLine(null, now), "");
  });

  it("finds the next check-in of a schedule", () => {
    const due = new Date(2026, 9, 18, 18, 0).toISOString();
    assert.equal(longDate(nextOccurrence("weekly:7@18:00", due)!), "Sunday 25 Oct");
    assert.equal(longDate(nextOccurrence("daily@08:00", due)!), "Monday 19 Oct");
    assert.equal(nextOccurrence(null, due), null);
    assert.equal(nextOccurrence("monthly", due), null);
  });
});

describe("Home reminders and the pop-up queue (CU5, CU23, CU26)", () => {
  const now = new Date(2026, 9, 15, 10, 0);
  const r = (over: Partial<Reminder> & { key: string }): Reminder => ({ kind: "x", level: 3, at: 0, proId: "p1", proName: "Rami", tone: "pr", title: "", detail: "", action: "", ...over });

  it("writes the check-in card: not started, then saved", () => {
    const qs = template();
    const base = { assignmentId: "a1", kind: "check_in" as const, title: "Weekly check-in", dueAt: new Date(2026, 9, 15, 20, 0).toISOString(), proId: "p1", proName: "Rami", questions: qs };
    const fresh = formReminder({ ...base, answers: {}, hasDraft: false }, now);
    assert.equal(fresh.title, "Thursday check-in is due");
    assert.equal(fresh.detail, "Due today 8:00 PM · 2 minutes");
    assert.equal(fresh.action, "Start");
    const saved = formReminder({ ...base, answers: { [qs[0].id]: 80, [qs[1].id]: ["a"] }, hasDraft: true }, now);
    assert.equal(saved.title, "Continue your check-in");
    assert.equal(saved.detail, "Part 2 of 3 · saved · due 8:00 PM");
    assert.equal(saved.action, "Continue");
  });

  it("writes the intake card", () => {
    const qs = Array.from({ length: 16 }, () => q({}));
    const answers = Object.fromEntries(qs.slice(0, 9).map((x) => [x.id, "a"]));
    const base = { assignmentId: "a2", kind: "intake" as const, title: "Strength coaching intake", dueAt: null, proId: "p1", proName: "Rami", questions: qs };
    const c = formReminder({ ...base, answers, hasDraft: true }, now);
    assert.equal(c.title, "Finish your intake for Rami");
    assert.equal(c.detail, "9 of 16 done · saved");
    assert.equal(formReminder({ ...base, answers: {}, hasDraft: false }, now).detail, "16 questions · 4 minutes");
  });

  it("groups by professional, most urgent first", () => {
    const groups = groupReminders([
      r({ key: "form:1", level: 3, at: 5 }),
      r({ key: "session:1", level: 1, at: 9 }),
      r({ key: "form:2", level: 3, at: 1, proId: "p2", proName: "Dana" }),
      r({ key: "referral:1", level: 2, at: 1 }),
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].proName, "Rami");
    assert.deepEqual(groups[0].items.map((x) => x.key), ["session:1", "referral:1", "form:1"]);
    assert.deepEqual(groups[1].items.map((x) => x.key), ["form:2"]);
  });

  it("queues at most two pop-ups per open, session first, referral next, never a due form", () => {
    const all = [r({ key: "form:1", level: 3 }), r({ key: "referral:1", level: 2, at: 1 }), r({ key: "referral:2", level: 2, at: 2 }), r({ key: "session:1", level: 1, at: 50 })];
    assert.deepEqual(popupQueue(all, new Set(), new Set()).map((x) => x.key), ["session:1", "referral:1"]);
    assert.deepEqual(popupQueue(all, new Set(["session:1"]), new Set()).map((x) => x.key), ["referral:1"]);
    assert.deepEqual(popupQueue(all, new Set(["session:1", "referral:1"]), new Set()), []);
    assert.deepEqual(popupQueue(all, new Set(), new Set(["session:1"])).map((x) => x.key), ["referral:1", "referral:2"]);
  });

  it("takes other kinds by level (room for CU29)", () => {
    const all = [r({ key: "share:1", kind: "share_win", level: 2, at: 0 }), r({ key: "referral:1", level: 2, at: 1 })];
    assert.deepEqual(popupQueue(all, new Set(), new Set()).map((x) => x.kind), ["share_win", "x"]);
  });

  it("rates today's sessions", () => {
    const at = (h: number, m = 0) => new Date(2026, 9, 15, h, m).toISOString();
    assert.equal(sessionLevel(at(10, 30), at(11, 30), now), 1);
    assert.equal(sessionLevel(at(18), at(19), now), 3);
    assert.equal(sessionLevel(at(8), at(9), now), null);
    assert.equal(sessionLevel(new Date(2026, 9, 16, 10).toISOString(), new Date(2026, 9, 16, 11).toISOString(), now), null);
    assert.equal(sessionTitle("Rami", at(10, 30), now), "Session with Rami in 30 min");
    assert.equal(sessionTitle("Rami", at(18), now), "Session with Rami at 6:00 PM");
    const s = sessionReminder({ id: "s1", proId: "p1", proName: "Rami", serviceName: "Technique session", startsAt: at(10, 30), endsAt: at(11, 30) }, now)!;
    assert.equal(s.detail, "Today 10:30 AM · Technique session");
    assert.equal(s.level, 1);
  });

  it("writes the referral lines without naming data the backend doesn't share", () => {
    const ref = { id: "c1", fromId: "p1", fromName: "Rami", toName: "Dana", reason: "Nutrition support", createdAt: "2026-10-15T08:00:00Z" };
    const rem = referralReminder(ref);
    assert.equal(rem.level, 2);
    assert.equal(rem.title, "Rami wants to refer you to Dana");
    assert.equal(referralTitle(ref), rem.title);
    assert.equal(referralBody(ref), "If you agree, Dana gets Rami's referral and the reason for it. Nothing else is shared.");
    assert.equal(referralBody({ ...ref, toName: null }), "To another professional. If you agree, they get Rami's referral and the reason for it. Nothing else is shared.");
    assert.equal(referralReminder({ ...ref, toName: null }).title, "Rami wants to refer you");
  });

  it("writes the CU29 share request as a level-2 reminder queued with the others", () => {
    const s = shareReminder({ id: "sr1", proId: "p1", proName: "Rami", createdAt: "2026-10-15T07:00:00Z", winTitle: "New PR · Back squat" });
    assert.equal(s.key, "share:sr1");
    assert.equal(s.kind, "share_request");
    assert.equal(s.level, 2);
    assert.equal(s.tone, "pr");
    assert.equal(s.title, "Rami would like to share your win");
    assert.equal(s.detail, "New PR · Back squat");
    assert.equal(s.action, "Review");
    const all = [s, r({ key: "session:1", level: 1, at: 99 }), referralReminder({ id: "c1", fromId: "p2", fromName: "Dana", toName: null, reason: "x", createdAt: "2026-10-15T08:00:00Z" })];
    assert.deepEqual(popupQueue(all, new Set(), new Set()).map((x) => x.key), ["session:1", "share:sr1"]);
  });
});

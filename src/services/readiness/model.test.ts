import { test } from "node:test";
import assert from "node:assert/strict";
import { answerLines, callNumbers, canSend, clearanceDateOk, EMPTY_ANSWERS, memberHeadingKey, NOTE_MAX, submitArgs, toggleKey, word, type ReadinessAnswers } from "./model";

const full: ReadinessAnswers = { exercisesRegularly: true, conditions: ["none"], warningSigns: ["none"], intensity: "light_moderate", note: "" };

test("None of these stands alone; another option clears it", () => {
  assert.deepEqual(toggleKey([], "diabetes"), ["diabetes"]);
  assert.deepEqual(toggleKey(["diabetes"], "kidney"), ["diabetes", "kidney"]);
  assert.deepEqual(toggleKey(["diabetes", "kidney"], "none"), ["none"]);
  assert.deepEqual(toggleKey(["none"], "kidney"), ["kidney"]);
  assert.deepEqual(toggleKey(["kidney"], "kidney"), []);
  assert.deepEqual(toggleKey(["none"], "none"), []);
});

test("sendable only with every question answered; the note is optional and limited", () => {
  assert.equal(canSend(EMPTY_ANSWERS), false);
  assert.equal(canSend(full), true);
  assert.equal(canSend({ ...full, exercisesRegularly: false }), true);
  assert.equal(canSend({ ...full, conditions: [] }), false);
  assert.equal(canSend({ ...full, warningSigns: [] }), false);
  assert.equal(canSend({ ...full, intensity: null }), false);
  assert.equal(canSend({ ...full, note: "x".repeat(NOTE_MAX) }), true);
  assert.equal(canSend({ ...full, note: "x".repeat(NOTE_MAX + 1) }), false);
});

test("the call's arguments: answer keys as given, an empty note is null", () => {
  assert.equal(submitArgs(EMPTY_ANSWERS), null);
  assert.deepEqual(submitArgs({ ...full, conditions: ["diabetes", "kidney"], warningSigns: ["heartbeat"], intensity: "vigorous", note: "  knee op in March  " }), {
    p_exercises_regularly: true,
    p_conditions: ["diabetes", "kidney"],
    p_warning_signs: ["heartbeat"],
    p_intensity: "vigorous",
    p_note: "knee op in March",
  });
  assert.equal(submitArgs({ ...full, note: "   " })?.p_note, null);
});

test("the clearance date is optional and never after today", () => {
  assert.equal(clearanceDateOk("", "2026-11-08"), true);
  assert.equal(clearanceDateOk("2026-11-08", "2026-11-08"), true);
  assert.equal(clearanceDateOk("2026-10-01", "2026-11-08"), true);
  assert.equal(clearanceDateOk("2026-11-09", "2026-11-08"), false);
  assert.equal(clearanceDateOk("8/11/2026", "2026-11-08"), false);
});

test("the member's heading: the outcome's title, or Cleared by a doctor", () => {
  assert.equal(memberHeadingKey("see_doctor", "see_doctor"), "outcome.see_doctor.title");
  assert.equal(memberHeadingKey("start_light", "cleared_by_doctor"), "pro.label.cleared_by_doctor");
});

test("answers back into the form's own words, in order, the note last", () => {
  const texts = {
    "q1.prompt": "Do you currently exercise regularly?",
    "q1.yes": "Yes",
    "q1.no": "No",
    "q2.prompt": "Has a doctor ever told you that you have any of these?",
    "q2.diabetes": "Diabetes (type 1 or type 2)",
    "q2.kidney": "A kidney condition",
    "q2.none": "None of these",
    "q3.prompt": "Do you have any of these, at rest or during activity?",
    "q3.none": "None of these",
    "q4.prompt": "How hard do you want to exercise?",
    "q4.vigorous": "Vigorous: hard enough that talking in full sentences is difficult",
    "note.prompt": "Anything else your trainer should know?",
  };
  assert.deepEqual(answerLines(texts, { exercisesRegularly: false, conditions: ["diabetes", "kidney"], warningSigns: ["none"], intensity: "vigorous", note: " Knee " }), [
    { prompt: texts["q1.prompt"], answer: "No" },
    { prompt: texts["q2.prompt"], answer: "Diabetes (type 1 or type 2); A kidney condition" },
    { prompt: texts["q3.prompt"], answer: "None of these" },
    { prompt: texts["q4.prompt"], answer: texts["q4.vigorous"] },
    { prompt: texts["note.prompt"], answer: "Knee" },
  ]);
  // A missing word never shows a key.
  assert.equal(word(texts, "q9.prompt"), "");
  assert.deepEqual(answerLines({}, { exercisesRegularly: true, conditions: ["none"], warningSigns: null, intensity: null, note: null }), []);
});

test("the urgent numbers line gives its numbers, in English and Arabic", () => {
  assert.deepEqual(callNumbers("In Lebanon, call the Red Cross on 140 or 112."), ["140", "112"]);
  assert.deepEqual(callNumbers("في لبنان، اتصل بالصليب الأحمر على 140 أو على 112."), ["140", "112"]);
  assert.deepEqual(callNumbers(null), []);
});

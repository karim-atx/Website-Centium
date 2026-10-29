import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  answerFor,
  answerText,
  conditionLine,
  conditionParents,
  conditionProblem,
  conditionValues,
  conditionWords,
  diffQuestions,
  fromRow,
  parseSchedule,
  pickedAnswer,
  profileFieldsFor,
  questionProblem,
  questionsFor,
  safetyBanner,
  scheduleLine,
  scheduleString,
  sectionNumber,
  showIfRow,
  toRow,
  topicsPhrase,
  typeLabel,
  withoutQuestion,
  type FormTemplate,
} from "./formModel";
import { askedQuestions, numberBoxes, parseResponseNotes, responseMarker, responseWarning, seriesOverTime, weekNumber, type PositionedQuestion } from "./reviewModel";
import { checkInLine, intakeLine, templateMetaLine, templatesFor } from "./formsList";
import { bodyOf, sectionsOf, templateMeta } from "./noteTemplateModel";

const q = (over: Partial<PositionedQuestion> & { id: string }): PositionedQuestion => ({
  saved: true,
  type: "number",
  prompt: "Weight",
  unit: "kg",
  required: false,
  options: null,
  scaleMin: null,
  scaleMax: null,
  safetyTopic: null,
  safetyTrigger: null,
  sectionTitle: null,
  showIf: null,
  profileField: null,
  position: 0,
  ...over,
});

describe("question types", () => {
  it("maps the frame's types onto the seven stored ones", () => {
    const yn = questionsFor("yesno")[0];
    assert.deepEqual([yn.type, yn.options], ["choice", ["Yes", "No"]]);
    const sc = questionsFor("scale")[0];
    assert.deepEqual([sc.type, sc.scaleMin, sc.scaleMax], ["scale", 1, 10]);
    assert.deepEqual(questionsFor("body").map((x) => [x.prompt, x.unit]), [
      ["Weight", "kg"],
      ["Waist", "cm"],
      ["Hips", "cm"],
    ]);
    const long = questionsFor("long")[0];
    assert.equal(long.type, "long_text");
    assert.equal(typeLabel(long), "Long text");
    assert.equal(typeLabel({ type: "choice", options: ["Yes", "No"], scaleMin: null, scaleMax: null }), "Yes or no");
    assert.equal(typeLabel({ type: "scale", options: null, scaleMin: 0, scaleMax: 10 }), "Scale 0 to 10");
  });

  it("says what's missing before a save", () => {
    assert.equal(questionProblem({ ...questionsFor("short")[0] }), "Write the question.");
    assert.equal(questionProblem({ ...questionsFor("single")[0], prompt: "Days?" }), "Add at least two answers.");
    assert.equal(questionProblem({ ...questionsFor("single")[0], prompt: "Days?", options: ["2", "2"] }), "Each answer once.");
    assert.equal(questionProblem({ ...questionsFor("single")[0], prompt: "Days?", options: ["2", "3", " "] }), null);
  });

  it("writes only the columns a type uses and keeps the safety marking", () => {
    const pain = q({ id: "p", type: "scale", prompt: "Any pain?", unit: "x", scaleMin: 0, scaleMax: 10, safetyTopic: "pain", safetyTrigger: { min: 4 } });
    assert.deepEqual(toRow(pain, 3), {
      position: 3,
      type: "scale",
      prompt: "Any pain?",
      unit: null,
      required: false,
      options: null,
      scale_min: 0,
      scale_max: 10,
      safety_topic: "pain",
      safety_trigger: { min: 4 },
      section_title: null,
      show_if: null,
      profile_field: null,
    });
  });

  it("diffs saved and draft questions into inserts, updates and deletes", () => {
    const a = q({ id: "a" });
    const b = q({ id: "b", prompt: "Waist", unit: "cm" });
    const c = questionsFor("date")[0];
    const d = diffQuestions([a, b], [{ ...b }, { ...a, prompt: "Body weight" }, { ...c, prompt: "When?" }]);
    assert.deepEqual(d.remove, []);
    assert.deepEqual(d.update.map((u) => u.id).sort(), ["a", "b"]);
    assert.equal((d.insert).length, 1);
    assert.deepEqual(diffQuestions([a, b], [a]).remove, ["b"]);
  });
});

describe("schedules", () => {
  it("round-trips the database's schedule strings, Monday = 1", () => {
    assert.equal(scheduleString({ isoDay: 7, time: "18:00" }), "weekly:7@18:00");
    assert.equal(scheduleString({ isoDay: null, time: "08:30" }), "daily@08:30");
    assert.deepEqual(parseSchedule("weekly:1@07:05"), { isoDay: 1, time: "07:05", every: 1 });
    assert.deepEqual(parseSchedule("daily@08:30"), { isoDay: null, time: "08:30" });
    assert.equal(parseSchedule("weekly:8@07:05"), null);
    assert.equal(scheduleLine({ isoDay: 7, time: "18:00" }), "Every week · Sunday 6:00 PM");
  });

  it("writes and reads every 2 and every 4 weeks (Round D)", () => {
    assert.equal(scheduleString({ isoDay: 3, time: "09:00", every: 2 }), "every2weeks:3@09:00");
    assert.equal(scheduleString({ isoDay: 5, time: "18:30", every: 4 }), "every4weeks:5@18:30");
    assert.equal(scheduleString({ isoDay: 5, time: "18:30", every: 1 }), "weekly:5@18:30");
    assert.deepEqual(parseSchedule("every2weeks:3@09:00"), { isoDay: 3, time: "09:00", every: 2 });
    assert.deepEqual(parseSchedule("every4weeks:5@18:30"), { isoDay: 5, time: "18:30", every: 4 });
    assert.equal(parseSchedule("every3weeks:1@09:00"), null);
    assert.equal(scheduleLine({ isoDay: 1, time: "09:00", every: 2 }), "Every 2 weeks · Monday 9:00 AM");
    assert.equal(scheduleLine({ isoDay: null, time: "08:00" }), "Every day · 8:00 AM");
  });
});

describe("sections, conditions and profile fields (Round D)", () => {
  const yes = q({ id: "a", type: "choice", prompt: "Any allergies?", unit: null, options: ["Yes", "No"] });
  const which = q({ id: "b", type: "multi", prompt: "Which ones?", unit: null, options: ["Peanuts", "Gluten"], position: 1 });
  const notes = q({ id: "c", type: "text", prompt: "Anything else?", unit: null, position: 2 });

  it("offers earlier choice, multiple choice and scale questions, with a condition of their own or not (chains)", () => {
    const withCond = { ...which, showIf: { questionId: "a", op: "equals" as const, value: "Yes" } };
    assert.deepEqual(conditionParents([yes, withCond, notes], 2).map((x) => x.id), ["a", "b"]);
    assert.deepEqual(conditionParents([yes, which, notes], 0), []);
    // A question others depend on may take a condition itself.
    assert.deepEqual(conditionParents([yes, which, { ...notes, showIf: { questionId: "b", op: "includes", value: "Gluten" } }], 1).map((x) => x.id), ["a"]);
    // The text question is never a parent.
    assert.deepEqual(conditionParents([yes, notes, which], 2).map((x) => x.id), ["a"]);
  });

  it("keeps a template's conditions (not_equals, excludes, in, chains) valid and unchanged", () => {
    const days = q({ id: "d", type: "choice", prompt: "Days a week?", unit: null, options: ["0", "1–2", "3–4"], position: 0 });
    const mins = q({ id: "m", type: "choice", prompt: "How long?", unit: null, options: ["Yes", "No"], position: 1, showIf: { questionId: "d", op: "not_equals", value: "0" } });
    const what = q({ id: "w", type: "long_text", prompt: "What changed?", unit: null, position: 2, showIf: { questionId: "m", op: "equals", value: "Yes" } });
    const meds = q({ id: "x", type: "multi", prompt: "Which?", unit: null, options: ["None", "Vitamins"], position: 3 });
    const more = q({ id: "y", type: "long_text", prompt: "Tell more", unit: null, position: 4, showIf: { questionId: "x", op: "excludes", value: "None" } });
    const plan = q({ id: "p", type: "choice", prompt: "Did you do them?", unit: null, options: ["Every day", "Some days", "Not this week"], position: 5 });
    const hard = q({ id: "h", type: "long_text", prompt: "What made it hard?", unit: null, position: 6, showIf: { questionId: "p", op: "in", value: ["Some days", "Not this week"] } });
    const draft = [days, mins, what, meds, more, plan, hard];
    draft.forEach((_, i) => assert.equal(conditionProblem(draft, i), null, `question ${i}`));
    assert.equal(conditionLine(draft, mins), 'Only ask if "Days a week?" is not 0');
    assert.equal(conditionLine(draft, more), 'Only ask if "Which?" doesn\'t include None');
    assert.equal(conditionLine(draft, hard), 'Only ask if "Did you do them?" is Some days or Not this week');
    assert.equal(conditionWords({ questionId: "p", op: "in", value: ["A", "B", "C"] }), "is A, B or C");
    // Round trip: stored → draft → stored, exactly.
    for (const raw of [
      { question_id: "d", not_equals: "0" },
      { question_id: "x", excludes: "None" },
      { question_id: "p", in: ["Some days", "Not this week"] },
      { question_id: "m", equals: "Yes" },
      { question_id: "x", includes: "Vitamins" },
    ]) {
      const back = fromRow({ id: "z", position: 9, type: "long_text", prompt: "Z", unit: null, required: false, options: null, scale_min: null, scale_max: null, safety_topic: null, safety_trigger: null, show_if: raw });
      assert.deepEqual(toRow(back, 9).show_if, raw);
    }
    // Reordering or editing another question writes the same show_if back.
    const moved = [days, mins, what, plan, hard, meds, more];
    const d = diffQuestions(draft, moved);
    for (const u of d.update) assert.deepEqual(toRow(u.q, u.index).show_if, toRow(draft.find((x) => x.id === u.id)!, 0).show_if);
    // The wrong kind of parent, or an answer that's gone, is still caught.
    assert.equal(conditionProblem([days, { ...mins, showIf: { questionId: "d", op: "excludes", value: "0" } }], 1), "Choose the condition again.");
    assert.equal(conditionProblem([plan, { ...hard, showIf: { questionId: "p", op: "in", value: ["Some days", "Never"] } }], 1), "The answer this depends on changed. Choose it again.");
    assert.equal(conditionProblem([plan, { ...hard, showIf: { questionId: "p", op: "in", value: [] } }], 1), "The answer this depends on changed. Choose it again.");
    // The builder's sheet picks only what it creates.
    assert.equal(pickedAnswer(mins.showIf, days), "");
    assert.equal(pickedAnswer(what.showIf, mins), "Yes");
    assert.equal(pickedAnswer(what.showIf, days), "");
  });

  it("names the answers a condition can match", () => {
    assert.deepEqual(conditionValues(yes), ["Yes", "No"]);
    assert.deepEqual(conditionValues(q({ id: "s", type: "scale", scaleMin: 1, scaleMax: 3 })), ["1", "2", "3"]);
  });

  it("says why a condition can't be saved", () => {
    const ok = { ...notes, showIf: { questionId: "a", op: "equals" as const, value: "Yes" } };
    assert.equal(conditionProblem([yes, which, ok], 2), null);
    assert.equal(conditionProblem([ok, yes, which], 0), "Move this below the question it depends on.");
    assert.equal(conditionProblem([yes, which, { ...ok, showIf: { questionId: "a", op: "equals", value: "Maybe" } }], 2), "The answer this depends on changed. Choose it again.");
    assert.equal(conditionProblem([yes, which, { ...ok, showIf: { questionId: "a", op: "includes", value: "Yes" } }], 2), "Choose the condition again.");
    assert.equal(conditionLine([yes], ok), "Only ask if \"Any allergies?\" is Yes");
    assert.equal(conditionLine([which], { showIf: { questionId: "b", op: "includes", value: "Gluten" } }), "Only ask if \"Which ones?\" includes Gluten");
  });

  it("clears a condition when its question is removed", () => {
    const dep = { ...notes, showIf: { questionId: "a", op: "equals" as const, value: "Yes" } };
    const next = withoutQuestion([yes, which, dep], "a");
    assert.deepEqual(next.map((x) => [x.id, x.showIf]), [["b", null], ["c", null]]);
  });

  it("writes show_if with the row id, and leaves it for the second pass while the question is new", () => {
    assert.deepEqual(showIfRow({ questionId: "a", op: "equals", value: "Yes" }), { question_id: "a", equals: "Yes" });
    assert.equal(showIfRow({ questionId: "new-x-1", op: "includes", value: "Gluten" }), null);
    assert.deepEqual(showIfRow({ questionId: "new-x-1", op: "includes", value: "Gluten" }, new Map([["new-x-1", "row-9"]])), { question_id: "row-9", includes: "Gluten" });
    const back = fromRow({ id: "z", position: 1, type: "long_text", prompt: "History", unit: null, required: false, options: null, scale_min: null, scale_max: null, safety_topic: null, safety_trigger: null, section_title: "Health", show_if: { question_id: "a", equals: "Yes" }, profile_field: "injuries" });
    assert.deepEqual([back.sectionTitle, back.showIf, back.profileField], ["Health", { questionId: "a", op: "equals", value: "Yes" }, "injuries"]);
  });

  it("pairs profile fields with the database's question types", () => {
    assert.deepEqual(profileFieldsFor({ type: "multi", options: ["Peanuts"] }), ["allergies", "dietary_restrictions"]);
    assert.deepEqual(profileFieldsFor({ type: "text", options: null }), ["allergies", "dietary_restrictions", "medications", "injuries"]);
    // 20261222080000: allergies and diets from a long text too (one per line).
    assert.deepEqual(profileFieldsFor({ type: "long_text", options: null }), ["allergies", "dietary_restrictions", "medications", "injuries"]);
    assert.deepEqual(profileFieldsFor({ type: "number", options: null }), ["weight"]);
    assert.deepEqual(profileFieldsFor({ type: "choice", options: ["Yes", "No"] }), []);
    assert.deepEqual(profileFieldsFor({ type: "scale", options: null }), []);
  });

  it("numbers sections and asks a section title", () => {
    const d = [yes, { ...which, sectionTitle: "Diet" }, { ...notes, sectionTitle: "" }];
    assert.equal(sectionNumber(d, 1), 1);
    assert.equal(sectionNumber(d, 2), 2);
    assert.equal(questionProblem(d[2]), "Give the section a title.");
    assert.equal(toRow({ ...d[1], sectionTitle: "  Diet " }, 1).section_title, "Diet");
  });

  it("lists only the questions a client was asked in a response", () => {
    const dep = { ...notes, showIf: { questionId: "a", op: "equals" as const, value: "Yes" } };
    assert.deepEqual(askedQuestions([yes, dep], { a: "No" }).map((x) => x.id), ["a"]);
    assert.deepEqual(askedQuestions([yes, dep], { a: "Yes" }).map((x) => x.id), ["a", "c"]);
  });

  it("judges a response's questions in order: a hidden parent hides its children, every condition kind", () => {
    const changed = q({ id: "b", type: "choice", prompt: "Changed?", unit: null, options: ["Yes", "No"], position: 1, showIf: { questionId: "a", op: "equals", value: "Yes" } });
    const what = q({ id: "c", type: "long_text", prompt: "What changed?", unit: null, position: 2, showIf: { questionId: "b", op: "equals", value: "Yes" } });
    // A stale answer to "Changed?" doesn't show "What changed?" once "Any?" is No.
    assert.deepEqual(askedQuestions([yes, changed, what], { a: "No", b: "Yes" }).map((x) => x.id), ["a"]);
    assert.deepEqual(askedQuestions([yes, changed, what], { a: "Yes", b: "Yes" }).map((x) => x.id), ["a", "b", "c"]);
    const not0 = q({ id: "n", type: "text", prompt: "N", unit: null, showIf: { questionId: "a", op: "not_equals", value: "No" } });
    const excl = q({ id: "e", type: "text", prompt: "E", unit: null, showIf: { questionId: "b2", op: "excludes", value: "None" } });
    const inn = q({ id: "i", type: "text", prompt: "I", unit: null, showIf: { questionId: "a", op: "in", value: ["Yes", "Maybe"] } });
    const multi = q({ id: "b2", type: "multi", prompt: "M", unit: null, options: ["None", "X"] });
    assert.deepEqual(askedQuestions([yes, multi, not0, excl, inn], { a: "Yes", b2: ["X"] }).map((x) => x.id), ["a", "b2", "n", "e", "i"]);
    assert.deepEqual(askedQuestions([yes, multi, not0, excl, inn], { a: "No", b2: ["None"] }).map((x) => x.id), ["a", "b2"]);
  });
});

describe("notes and urgent (20261222080000)", () => {
  it("reads form_response_notes, urgent first, then in question order", () => {
    const rows = [
      { question_id: "q1", position: 1, prompt: "How are your symptoms?", note: "Follow up: they say their symptoms are much worse.", urgent: false },
      { question_id: "q9", position: 9, prompt: "Any new symptoms this week?", note: "Urgent signs reported.", urgent: true },
      { question_id: "q0", position: 0, prompt: "Bad", note: "  ", urgent: false },
      null,
    ];
    assert.deepEqual(parseResponseNotes(rows).map((n) => [n.questionId, n.urgent]), [["q9", true], ["q1", false]]);
    assert.deepEqual(parseResponseNotes(null), []);
  });

  it("reads urgent and the safety flag as one warning", () => {
    // save_form_response sets safety_flag with urgent, without topics: no empty topics sentence.
    assert.deepEqual(responseWarning({ urgent: true, safetyFlag: true, safetyTopics: [] }), { urgent: true, topics: [] });
    assert.deepEqual(responseWarning({ urgent: true, safetyFlag: true, safetyTopics: ["pain"] }), { urgent: true, topics: ["pain"] });
    assert.deepEqual(responseWarning({ urgent: false, safetyFlag: true, safetyTopics: ["pain"] }), { urgent: false, topics: ["pain"] });
    assert.equal(responseWarning({ urgent: false, safetyFlag: false, safetyTopics: [] }), null);
    assert.equal(responseMarker({ urgent: true, safetyFlag: true }), "Urgent");
    assert.equal(responseMarker({ urgent: false, safetyFlag: true }), "Flagged");
    assert.equal(responseMarker({ urgent: false, safetyFlag: false }), null);
  });
});

describe("safety wording", () => {
  it("follows FINAL_PLAN 3 §6.2", () => {
    assert.equal(topicsPhrase(["pain"]), "pain");
    assert.equal(topicsPhrase(["pain", "injury", "illness"]), "pain, an injury and illness");
    assert.equal(safetyBanner(["injury"], "Maya"), "Answers mention an injury. Suggest Maya talks to a doctor.");
  });
});

describe("answers", () => {
  it("reads by question id only", () => {
    assert.equal(answerFor({ x: 4 }, { id: "x" }), 4);
    assert.equal(answerFor({ "0": 4 }, { id: "x" }), undefined);
    assert.equal(answerText({ type: "scale", unit: null, scaleMax: 10 }, 7), "7 of 10");
    assert.equal(answerText({ type: "text", unit: null, scaleMax: null }, "  "), "Not answered");
    assert.equal(answerText({ type: "photo", unit: null, scaleMax: null }, ["a/b/1.jpg", "a/b/2.jpg"]), "2 photos");
  });

  it("builds HO20 boxes against the last answer and CL11 series", () => {
    const w = q({ id: "w" });
    const e = q({ id: "e", type: "scale", prompt: "Energy", unit: null, scaleMin: 1, scaleMax: 10, position: 1 });
    const r1 = { id: "1", answers: { w: 82.4, e: 5 }, submittedAt: "2026-10-01T10:00:00Z" };
    const r2 = { id: "2", answers: { w: 81.9, e: 7 }, submittedAt: "2026-10-08T10:00:00Z" };
    const boxes = numberBoxes([w, e], r2, [r2, r1]);
    assert.deepEqual(boxes.map((b) => [b.label, b.value, b.unit, b.delta, b.was]), [
      ["Weight", "81.9", "kg", "−0.5", 82.4],
      ["Energy", "7", "/10", "+2", 5],
    ]);
    assert.equal(weekNumber(r2, [r2, r1]), 2);
    const s = seriesOverTime([w, e], [r2, r1]);
    assert.deepEqual(s.map((x) => x.points.map((p) => p.value)), [
      [82.4, 81.9],
      [5, 7],
    ]);
  });
});

describe("forms list", () => {
  it("lists the Database's templates for the tab, available first", () => {
    const t = (key: string, kind: "intake" | "check_in", available: boolean, n = 5): FormTemplate => ({ key, lane: "any", kind, title: key, description: "About it", questionCount: n, available });
    const all = [t("par_q", "intake", false, 0), t("weekly_check_in", "check_in", true, 9), t("coaching_intake", "intake", false), t("health_history", "intake", true)];
    assert.deepEqual(templatesFor(all, "intake").map((x) => x.key), ["health_history", "par_q", "coaching_intake"]);
    assert.deepEqual(templatesFor(all, "check_in").map((x) => x.key), ["weekly_check_in"]);
    assert.equal(templateMetaLine(all[1]), "About it · 9 questions");
    assert.equal(templateMetaLine(all[0]), "About it");
  });
  it("writes the list lines from live schedules", () => {
    const f = { id: "f", kind: "check_in" as const, title: "Weekly check-in", questionCount: 9, updatedAt: "" };
    assert.equal(intakeLine({ ...f, kind: "intake", questionCount: 1 }), "Sent manually · 1 question");
    assert.equal(intakeLine({ ...f, kind: "intake", questionCount: 4, sendOnHire: true }), "Sent automatically when someone hires you · 4 questions");
    assert.equal(checkInLine(f, []), "Not scheduled · 9 questions");
    const a = (clientId: string) => ({ id: clientId, formId: "f", clientId, schedule: "weekly:7@18:00", dueAt: null, status: "series" as const, seriesId: null });
    assert.equal(checkInLine(f, [a("x"), a("y")]), "Every week · Sunday 6:00 PM · 2 clients");
  });
});

describe("note templates", () => {
  it("keeps sections as headings in the body", () => {
    const body = bodyOf(["How it went", "Next time:"]);
    assert.equal(body, "How it went:\n\nNext time:\n");
    assert.deepEqual(sectionsOf(body), ["How it went", "Next time"]);
    assert.equal(sectionsOf("Squats felt heavy today"), null);
    assert.equal(templateMeta(body), "2 sections");
    assert.equal(templateMeta("Free words"), "Free text");
  });
});

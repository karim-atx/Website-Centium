import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { answerFor, answerText, diffQuestions, parseSchedule, questionProblem, questionsFor, safetyBanner, scheduleLine, scheduleString, toRow, topicsPhrase, typeLabel } from "./formModel";
import { numberBoxes, seriesOverTime, weekNumber, type PositionedQuestion } from "./reviewModel";
import { checkInLine, intakeLine, LANE_TEMPLATES } from "./formsList";
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
    assert.deepEqual(questionsFor("long"), []);
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
    assert.deepEqual(toRow(pain, 3), { position: 3, type: "scale", prompt: "Any pain?", unit: null, required: false, options: null, scale_min: 0, scale_max: 10, safety_topic: "pain", safety_trigger: { min: 4 } });
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
    assert.deepEqual(parseSchedule("weekly:1@07:05"), { isoDay: 1, time: "07:05" });
    assert.equal(parseSchedule("weekly:8@07:05"), null);
    assert.equal(scheduleLine({ isoDay: 7, time: "18:00" }), "Every week · Sunday 6:00 PM");
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
      ["Weight", "81.9", "kg", "-0.5", 82.4],
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
  it("has the Weekly check-in as the only template that works, none for Clinical check-ins", () => {
    assert.deepEqual(LANE_TEMPLATES.full_coaching.filter((t) => t.weekly).map((t) => t.title), ["Weekly check-in"]);
    assert.equal(LANE_TEMPLATES.clinical_overview.some((t) => t.kind === "check_in"), false);
  });
  it("writes the list lines from live schedules", () => {
    const f = { id: "f", kind: "check_in" as const, title: "Weekly check-in", questionCount: 9, updatedAt: "" };
    assert.equal(intakeLine({ ...f, kind: "intake", questionCount: 1 }), "Sent manually · 1 question");
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

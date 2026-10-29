import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { conditionMet, formParts, formReminder, longDate, missingRequired, nextOccurrence, parseShowIfRule, partQuestions, shownQuestions, visibleAnswers, type ClientQuestion } from "./logic";

// Round D (20261222050000): sections, conditions and long text on the
// client's side, mirroring form_condition_met and save_form_response.

const q = (over: Partial<ClientQuestion> & { id: string; position: number }): ClientQuestion => ({
  type: "text",
  prompt: "Question",
  unit: null,
  required: false,
  options: null,
  scaleMin: null,
  scaleMax: null,
  safetyTopic: null,
  safetyTrigger: null,
  ...over,
});

describe("conditions (form_condition_met)", () => {
  it("reads show_if as stored", () => {
    assert.deepEqual(parseShowIfRule({ question_id: "a", equals: "Yes" }), { questionId: "a", equals: "Yes" });
    assert.deepEqual(parseShowIfRule({ question_id: "a", includes: "Peanuts" }), { questionId: "a", includes: "Peanuts" });
    assert.equal(parseShowIfRule({ question_id: "a" }), null);
    assert.equal(parseShowIfRule(null), null);
    assert.equal(parseShowIfRule(["a"]), null);
  });

  it("compares an answer as text for equals, a scale's number included", () => {
    assert.equal(conditionMet(null, {}), true);
    assert.equal(conditionMet({ questionId: "a", equals: "Yes" }, { a: "Yes" }), true);
    assert.equal(conditionMet({ questionId: "a", equals: "Yes" }, { a: "No" }), false);
    assert.equal(conditionMet({ questionId: "a", equals: "Yes" }, {}), false);
    assert.equal(conditionMet({ questionId: "s", equals: "3" }, { s: 3 }), true);
    assert.equal(conditionMet({ questionId: "s", equals: "3" }, { s: 4 }), false);
  });

  it("looks in a multiple-choice list for includes", () => {
    assert.equal(conditionMet({ questionId: "m", includes: "Gluten" }, { m: ["Peanuts", "Gluten"] }), true);
    assert.equal(conditionMet({ questionId: "m", includes: "Gluten" }, { m: ["Peanuts"] }), false);
    // A single answer that happens to match isn't a list.
    assert.equal(conditionMet({ questionId: "m", includes: "Gluten" }, { m: "Gluten" }), false);
  });

  it("doesn't require or send a hidden question's answer", () => {
    const allergic = q({ id: "a", position: 0, type: "choice", options: ["Yes", "No"], required: true });
    const which = q({ id: "b", position: 1, type: "multi", options: ["Peanuts"], required: true, showIf: { questionId: "a", equals: "Yes" } });
    const answers = { a: "No", b: ["Peanuts"] };
    const shown = shownQuestions([allergic, which], answers);
    assert.deepEqual(shown.map((x) => x.id), ["a"]);
    assert.deepEqual(missingRequired(shown, { a: "No" }), []);
    assert.deepEqual(visibleAnswers(answers, shown), { a: "No" });
    // Shown, it's required.
    assert.deepEqual(missingRequired(shownQuestions([allergic, which], { a: "Yes" }), { a: "Yes" }), ["b"]);
  });
});

describe("sections (formParts)", () => {
  it("keeps the four-a-part rule for a form without sections", () => {
    const qs = Array.from({ length: 6 }, (_, i) => q({ id: `q${i}`, position: i }));
    const p = formParts(qs, {});
    assert.equal(p.sectioned, false);
    assert.deepEqual(p.parts.map((x) => partQuestions(x).length), [4, 2]);
  });

  it("makes one part per section, with an untitled lead part and titles", () => {
    const qs = [
      q({ id: "intro", position: 0 }),
      q({ id: "a", position: 1, type: "choice", options: ["Yes", "No"], sectionTitle: "Health" }),
      q({ id: "b", position: 2, showIf: { questionId: "a", equals: "Yes" } }),
      q({ id: "c", position: 3, sectionTitle: "Training" }),
    ];
    const no = formParts(qs, { a: "No" });
    assert.equal(no.sectioned, true);
    assert.deepEqual(no.titles, [null, "Health", "Training"]);
    assert.deepEqual(no.parts.map((x) => partQuestions(x).map((y) => y.id)), [["intro"], ["a"], ["c"]]);
    const yes = formParts(qs, { a: "Yes" });
    assert.deepEqual(yes.parts.map((x) => partQuestions(x).map((y) => y.id)), [["intro"], ["a", "b"], ["c"]]);
  });

  it("leaves out a section with nothing shown, and keeps a section's title when its first question is hidden", () => {
    const qs = [
      q({ id: "a", position: 0, type: "choice", options: ["Yes", "No"] }),
      q({ id: "b", position: 1, sectionTitle: "Allergies", showIf: { questionId: "a", equals: "Yes" } }),
      q({ id: "c", position: 2, sectionTitle: "More", showIf: { questionId: "a", equals: "Yes" } }),
      q({ id: "d", position: 3 }),
    ];
    const p = formParts(qs, { a: "No" });
    assert.deepEqual(p.titles, [null, "More"]);
    assert.deepEqual(p.parts.map((x) => partQuestions(x).map((y) => y.id)), [["a"], ["d"]]);
  });

  it("says Section on Home's card for a sectioned check-in", () => {
    const qs = [q({ id: "a", position: 0, sectionTitle: "One" }), q({ id: "b", position: 1, sectionTitle: "Two", required: true })];
    const r = formReminder({ assignmentId: "x", kind: "check_in", title: "Check-in", dueAt: null, proId: "p", proName: "Rami", questions: qs, answers: { a: "fine" }, hasDraft: true }, new Date());
    assert.match(r.detail, /^Section 2 of 2/);
  });
});

describe("schedules every 2 and 4 weeks", () => {
  it("puts the next check-in 14 or 28 days on", () => {
    const due = "2026-10-18T18:00:00";
    assert.equal(longDate(nextOccurrence("every2weeks:7@18:00", due)!), "Sunday, Nov 1");
    assert.equal(longDate(nextOccurrence("every4weeks:7@18:00", due)!), "Sunday, Nov 15");
  });
});

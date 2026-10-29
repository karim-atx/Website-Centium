import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { conditionMet, fromMyFormQuestion, isNoneOption, keepOfferedOptions, optionChoices, parseClientPrompt, safetyLineOf, promptsFor, ruleMet, toggleMulti, formParts, formReminder, longDate, missingRequired, nextOccurrence, parseShowIfRule, partQuestions, shownQuestions, visibleAnswers, type ClientQuestion, type MyFormQuestionRow } from "./logic";

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

describe("20261222080000: the new conditions, judged in order", () => {
  it("parses not_equals, excludes and in", () => {
    assert.deepEqual(parseShowIfRule({ question_id: "a", not_equals: "0" }), { questionId: "a", notEquals: "0" });
    assert.deepEqual(parseShowIfRule({ question_id: "a", excludes: "None" }), { questionId: "a", excludes: "None" });
    assert.deepEqual(parseShowIfRule({ question_id: "a", in: ["Some days", "Not this week", 3] }), { questionId: "a", in: ["Some days", "Not this week"] });
  });
  it("not_equals needs an answer that isn't that one", () => {
    assert.equal(conditionMet({ questionId: "s", notEquals: "0" }, { s: 4 }), true);
    assert.equal(conditionMet({ questionId: "s", notEquals: "0" }, { s: 0 }), false);
    assert.equal(conditionMet({ questionId: "s", notEquals: "0" }, {}), false);
    assert.equal(conditionMet({ questionId: "s", notEquals: "0" }, { s: "  " }), false);
    assert.equal(conditionMet({ questionId: "s", notEquals: "0" }, { s: ["1"] }), false);
  });
  it("excludes needs a multiple choice answered without that option", () => {
    assert.equal(conditionMet({ questionId: "m", excludes: "None" }, { m: ["Peanuts"] }), true);
    assert.equal(conditionMet({ questionId: "m", excludes: "None" }, { m: ["None"] }), false);
    assert.equal(conditionMet({ questionId: "m", excludes: "None" }, { m: [] }), false);
    assert.equal(conditionMet({ questionId: "m", excludes: "None" }, {}), false);
  });
  it("in is one of these answers", () => {
    assert.equal(conditionMet({ questionId: "c", in: ["Some days", "Not this week"] }, { c: "Some days" }), true);
    assert.equal(conditionMet({ questionId: "c", in: ["Some days"] }, { c: "Every day" }), false);
  });
  it("a question whose parent is hidden is hidden too, whatever its own answer", () => {
    const list = [
      q({ id: "a", position: 0, type: "choice", options: ["Yes", "No"] }),
      q({ id: "b", position: 1, type: "choice", options: ["Stopped", "Started"], showIf: { questionId: "a", equals: "Yes" } }),
      q({ id: "c", position: 2, showIf: { questionId: "b", equals: "Stopped" } }),
    ];
    assert.deepEqual(shownQuestions(list, { a: "Yes", b: "Stopped" }).map((x) => x.id), ["a", "b", "c"]);
    assert.deepEqual(shownQuestions(list, { a: "No", b: "Stopped" }).map((x) => x.id), ["a"]);
  });
});

describe("20261222080000: what the client is shown straight away", () => {
  it("rules mirror form_rule_met", () => {
    assert.equal(ruleMet({ answers: ["New chest pain or breathlessness"] }, ["None", "New chest pain or breathlessness"]), true);
    assert.equal(ruleMet({ answers: ["Much worse"] }, "Much worse"), true);
    assert.equal(ruleMet({ answers: ["Much worse"] }, "Better"), false);
    assert.equal(ruleMet({ otherThan: ["None"] }, ["None"]), false);
    assert.equal(ruleMet({ otherThan: ["None"] }, ["None", "Headaches"]), true);
    assert.equal(ruleMet({ otherThan: ["No"] }, "  "), false);
    assert.equal(ruleMet({ max: 2 }, 2), true);
    assert.equal(ruleMet({ max: 2 }, "1"), true);
    assert.equal(ruleMet({ max: 2 }, 3), false);
    assert.equal(ruleMet({ min: 7 }, 7), true);
    assert.equal(ruleMet({ max: 2 }, undefined), false);
  });
  it("parses a prompt; urgent needs its message", () => {
    assert.deepEqual(parseClientPrompt({ answers: ["A"], kind: "urgent", message: " Call 112 now. " }), { rule: { answers: ["A"] }, kind: "urgent", message: "Call 112 now." });
    assert.equal(parseClientPrompt({ answers: ["A"], kind: "urgent" }), null);
    assert.deepEqual(parseClientPrompt({ max: 2, kind: "support" }), { rule: { max: 2 }, kind: "support", message: null });
    assert.equal(parseClientPrompt({ kind: "support" }), null);
    assert.equal(parseClientPrompt({ max: 2, kind: "shout" }), null);
  });
  it("lists the prompts the shown answers trigger, in order", () => {
    const list = [
      q({ id: "mood", position: 1, type: "scale", clientPrompt: { rule: { max: 2 }, kind: "support", message: null } }),
      q({ id: "signs", position: 0, type: "multi", clientPrompt: { rule: { answers: ["New numbness or weakness"] }, kind: "urgent", message: "Call 112 now." } }),
    ];
    assert.deepEqual(promptsFor(list, { mood: 1, signs: ["New numbness or weakness"] }).map((p) => p.prompt.kind), ["support", "urgent"]);
    assert.deepEqual(promptsFor(list, { mood: 4, signs: ["None"] }), []);
  });
  it("None clears the other options, and another option clears None", () => {
    assert.ok(isNoneOption("None") && isNoneOption(" nothing ") && !isNoneOption("Nonetheless"));
    assert.deepEqual(toggleMulti(["Peanuts", "Gluten"], "None"), ["None"]);
    assert.deepEqual(toggleMulti(["None"], "Peanuts"), ["Peanuts"]);
    assert.deepEqual(toggleMulti(["Peanuts"], "Peanuts"), []);
    assert.deepEqual(toggleMulti(["Peanuts"], "Gluten"), ["Peanuts", "Gluten"]);
  });
});

describe("20261222080000: the form as my_form_questions gives it", () => {
  const row = (over: Partial<MyFormQuestionRow>): MyFormQuestionRow => ({
    question_id: "q1",
    position: 1,
    section_title: null,
    type: "multi",
    prompt: "Any of these?",
    unit: null,
    required: true,
    options: ["None", "Unexplained weight change"],
    option_labels: ["None", "Unexpected changes in your body"],
    scale_min: null,
    scale_max: null,
    scale_min_label: null,
    scale_max_label: null,
    placeholder: null,
    show_if: null,
    client_prompt: null,
    profile_field: null,
    safety_line: null,
    ...over,
  });

  it("maps every column; safety topic and trigger are the server's alone", () => {
    const got = fromMyFormQuestion(
      row({
        scale_min_label: " Very low ",
        scale_max_label: "",
        placeholder: "For example, a knee injury",
        show_if: { question_id: "q0", excludes: "None" },
        client_prompt: { answers: ["Unexplained weight change"], kind: "support" },
        profile_field: "injuries",
      })
    );
    assert.equal(got.id, "q1");
    assert.deepEqual(got.options, ["None", "Unexplained weight change"]);
    assert.deepEqual(got.optionLabels, ["None", "Unexpected changes in your body"]);
    assert.equal(got.scaleMinLabel, "Very low");
    assert.equal(got.scaleMaxLabel, null);
    assert.equal(got.placeholder, "For example, a knee injury");
    assert.deepEqual(got.showIf, { questionId: "q0", excludes: "None" });
    assert.deepEqual(got.clientPrompt, { rule: { answers: ["Unexplained weight change"] }, kind: "support", message: null });
    assert.equal(got.profileField, "injuries");
    assert.equal(got.safetyTopic, null);
    assert.equal(got.safetyTrigger, null);
  });

  it("drops labels that don't line up with the options", () => {
    assert.equal(fromMyFormQuestion(row({ option_labels: ["Only one"] })).optionLabels, null);
    assert.equal(fromMyFormQuestion(row({ type: "text", options: null, option_labels: null })).options, null);
  });

  it("shows the labels and stores the options, in the same order", () => {
    const q1 = fromMyFormQuestion(row({}));
    assert.deepEqual(optionChoices(q1), [
      { value: "None", label: "None" },
      { value: "Unexplained weight change", label: "Unexpected changes in your body" },
    ]);
    assert.deepEqual(optionChoices({ options: ["Yes", "No"], optionLabels: null }), [
      { value: "Yes", label: "Yes" },
      { value: "No", label: "No" },
    ]);
  });

  it("reads the safety line from any row, or null", () => {
    assert.equal(safetyLineOf([]), null);
    assert.equal(safetyLineOf([{ safety_line: null }]), null);
    assert.equal(safetyLineOf([{ safety_line: "Call 112." }, { safety_line: "Call 112." }]), "Call 112.");
  });

  it("leaves out a saved choice the form no longer offers", () => {
    const list = [
      q({ id: "goal", position: 1, type: "choice", options: ["Get stronger", "Feel better"] }),
      q({ id: "signs", position: 2, type: "multi", options: ["None", "Headaches"] }),
      q({ id: "note", position: 3, type: "text" }),
    ];
    assert.deepEqual(keepOfferedOptions({ goal: "Lose body fat", signs: ["Headaches", "Weight loss"], note: "Hi" }, list), { signs: ["Headaches"], note: "Hi" });
    assert.deepEqual(keepOfferedOptions({ goal: "Feel better", signs: ["Weight loss"] }, list), { goal: "Feel better" });
  });
});

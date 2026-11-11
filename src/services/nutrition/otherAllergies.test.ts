import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  OTHER_MAX,
  canAddOther,
  cleanLabel,
  draftsFrom,
  isolate,
  labelProblem,
  otherAllergiesMissing,
  otherAllergyError,
  otherDiff,
  otherProblemText,
  type OtherAllergy,
  type OtherDraft,
} from "./otherAllergies";

test("each of the Database's rules has its own line (decision 17)", () => {
  assert.equal(otherAllergyError({ code: "ATXK3" }, false), "Use 1 to 60 characters.");
  assert.equal(otherAllergyError({ code: "ATXK4" }, false), "Use letters, numbers and punctuation on one line.");
  assert.equal(otherAllergyError({ code: "ATXK5" }, false), "You've already added this allergy.");
  assert.equal(otherAllergyError({ code: "ATXK6" }, false), "You can add up to 20 of your own.");
  assert.equal(otherAllergyError({ code: "23514" }, false), "Keep the note to 200 characters.");
  const lines = ["ATXK3", "ATXK4", "ATXK5", "ATXK6", "23514"].map((code) => otherAllergyError({ code }, false));
  assert.equal(new Set(lines).size, 5);
});

test("offline, then the generic line, for anything else", () => {
  assert.equal(otherAllergyError({ code: "ATXK3" }, true), "Couldn't reach the server. Check your connection and try again.");
  assert.equal(otherAllergyError({ code: "42501" }, false), "Couldn't save your allergies. Try again.");
  assert.equal(otherAllergyError(null, false), "Couldn't save your allergies. Try again.");
});

test("today's database: no table reads as missing, never as an error", () => {
  assert.equal(otherAllergiesMissing({ code: "PGRST205", message: "Could not find the table 'public.custom_allergies' in the schema cache" }), true);
  assert.equal(otherAllergiesMissing({ code: "42P01", message: 'relation "public.custom_allergies" does not exist' }), true);
  assert.equal(otherAllergiesMissing({ message: 'relation "public.custom_allergies" does not exist' }), true);
  assert.equal(otherAllergiesMissing({ code: "42501", message: "permission denied" }), false);
  assert.equal(otherAllergiesMissing(null), false);
});

test("a label's rules, checked before Save the way the trigger checks them", () => {
  assert.equal(labelProblem("Kiwi", []), null);
  assert.equal(labelProblem("  Kiwi  ", []), null);
  assert.equal(labelProblem("كيوي", []), null);
  assert.equal(labelProblem("C++ (x)", []), null);
  assert.equal(labelProblem("", []), "ATXK3");
  assert.equal(labelProblem("   ", []), "ATXK3");
  assert.equal(labelProblem("x".repeat(60), []), null);
  assert.equal(labelProblem("x".repeat(61), []), "ATXK3");
  assert.equal(labelProblem("Ki\nwi", []), "ATXK4");
  assert.equal(labelProblem("Ki\twi", []), "ATXK4");
  assert.equal(labelProblem("Kiwi‮", []), "ATXK4");
  assert.equal(labelProblem("⁦Kiwi", []), "ATXK4");
  assert.equal(labelProblem("KIWI", ["Kiwi"]), "ATXK5");
  assert.equal(labelProblem(" kiwi", ["Kiwi"]), "ATXK5");
  assert.equal(labelProblem("Kiwifruit", ["Kiwi"]), null);
  assert.equal(otherProblemText("ATXK5"), "You've already added this allergy.");
});

test("20 is the limit (decision 12)", () => {
  assert.equal(OTHER_MAX, 20);
  assert.equal(canAddOther(19), true);
  assert.equal(canAddOther(20), false);
});

test("the member's words are isolated, never changed", () => {
  assert.equal(isolate("كيوي"), "⁨كيوي⁩");
  assert.equal(cleanLabel("  Kiwi \n"), "Kiwi");
});

test("Save: deletes, then label or severity changes, then new ones", () => {
  const before: OtherAllergy[] = [
    { id: "a", label: "Kiwi", severity: "severe", note: null },
    { id: "b", label: "Pea", severity: "mild", note: "since 2019" },
    { id: "c", label: "Mango", severity: "moderate", note: null },
  ];
  const after: OtherDraft[] = [
    ...draftsFrom(before).filter((d) => d.id !== "c"),
    { key: "new-1", id: null, label: " كيوي ", severity: "severe", note: null },
  ];
  after[0] = { ...after[0], label: "Kiwi fruit" };
  after[1] = { ...after[1], severity: "moderate" };
  const d = otherDiff(before, after);
  assert.deepEqual(d.remove, ["c"]);
  assert.deepEqual(d.update.map((u) => [u.id, u.label, u.severity]), [["a", "Kiwi fruit", "severe"], ["b", "Pea", "moderate"]]);
  assert.deepEqual(d.insert.map((i) => i.key), ["new-1"]);
  assert.deepEqual(otherDiff(before, draftsFrom(before)), { remove: [], update: [], insert: [] });
});

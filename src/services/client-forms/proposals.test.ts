import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { confirmedAnswerRow, draftFrom, parseConfirmedAnswers, offeredProposals, proposalTitle, shapeValue, type ProfileProposal } from "./proposals";

const p = (over: Partial<ProfileProposal> & Pick<ProfileProposal, "field" | "suggested">): ProfileProposal => ({
  id: "x",
  responseId: "r",
  prompt: "Question",
  status: "pending",
  ...over,
});

const TODAY = "2026-10-29";

describe("what the step offers", () => {
  it("offers pending proposals, never weight in recovery-sensitive mode", () => {
    const list = [
      p({ id: "1", field: "allergies", suggested: { text: "Peanuts", allergen: "peanuts", severity: "moderate" } }),
      p({ id: "2", field: "weight", suggested: { kg: 70 } }),
      p({ id: "3", field: "medications", suggested: { name: "Metformin" }, status: "confirmed" }),
    ];
    assert.deepEqual(offeredProposals(list, false).map((x) => x.id), ["1", "2"]);
    assert.deepEqual(offeredProposals(list, true).map((x) => x.id), ["1"]);
  });
});

describe("the value confirm_form_profile_proposal takes", () => {
  it("allergies: {allergen, severity, note}, the allergen chosen", () => {
    const d = draftFrom(p({ field: "allergies", suggested: { text: "Peanuts", allergen: "peanuts", severity: "moderate" } }));
    assert.equal(proposalTitle(d), "Peanuts allergy");
    assert.deepEqual(shapeValue(d, TODAY), { ok: true, value: { allergen: "peanuts", severity: "moderate", note: "" } });
    const unknown = draftFrom(p({ field: "allergies", suggested: { text: "Kiwi", severity: "moderate" } }));
    assert.equal(proposalTitle(unknown), "Kiwi");
    assert.deepEqual(shapeValue(unknown, TODAY), { ok: false, problem: "Choose the allergen." });
    if (unknown.field === "allergies") assert.deepEqual(shapeValue({ ...unknown, allergen: "sesame", severity: "severe" }, TODAY), { ok: true, value: { allergen: "sesame", severity: "severe", note: "" } });
  });

  it("dietary restrictions: {restriction, kind}", () => {
    const d = draftFrom(p({ field: "dietary_restrictions", suggested: { text: "Vegan", restriction: "vegan" } }));
    assert.deepEqual(shapeValue(d, TODAY), { ok: true, value: { restriction: "vegan", kind: "restriction" } });
    assert.equal(proposalTitle(d), "Vegan");
    const none = draftFrom(p({ field: "dietary_restrictions", suggested: { text: "Paleo" } }));
    assert.deepEqual(shapeValue(none, TODAY), { ok: false, problem: "Choose the diet." });
  });

  it("medications: {name, dose, route, notes}", () => {
    const d = draftFrom(p({ field: "medications", suggested: { name: "Metformin" } }));
    assert.deepEqual(shapeValue(d, TODAY), { ok: true, value: { name: "Metformin", dose: "", route: "oral", notes: "" } });
    if (d.field === "medications") {
      assert.deepEqual(shapeValue({ ...d, dose: " 500 mg ", route: "injectable" }, TODAY), { ok: true, value: { name: "Metformin", dose: "500 mg", route: "injectable", notes: "" } });
      assert.deepEqual(shapeValue({ ...d, name: " " }, TODAY), { ok: false, problem: "Add the medication's name." });
    }
  });

  it("injuries: {description, body_area, since}, never a future date", () => {
    const d = draftFrom(p({ field: "injuries", suggested: { description: "Left knee meniscus" } }));
    assert.deepEqual(shapeValue(d, TODAY), { ok: true, value: { description: "Left knee meniscus", body_area: "", since: "" } });
    if (d.field === "injuries") {
      assert.deepEqual(shapeValue({ ...d, bodyArea: "Knee", since: "2026-03-01" }, TODAY), { ok: true, value: { description: "Left knee meniscus", body_area: "Knee", since: "2026-03-01" } });
      assert.equal(shapeValue({ ...d, since: "2026-11-01" }, TODAY).ok, false);
    }
  });

  it("weight: {kg}, 20 to 500, one decimal", () => {
    const d = draftFrom(p({ field: "weight", suggested: { kg: 70 } }));
    assert.deepEqual(shapeValue(d, TODAY), { ok: true, value: { kg: 70 } });
    assert.equal(proposalTitle(d), "Weight 70 kg");
    if (d.field === "weight") {
      assert.deepEqual(shapeValue({ ...d, kg: "71,25" }, TODAY), { ok: true, value: { kg: 71.3 } });
      assert.equal(shapeValue({ ...d, kg: "15" }, TODAY).ok, false);
      assert.equal(shapeValue({ ...d, kg: "" }, TODAY).ok, false);
    }
  });
});

describe("the answers a client confirmed, for their professional", () => {
  it("parses rows in order and leaves out an unknown field", () => {
    const list = parseConfirmedAnswers([
      { proposal_id: "p1", question_id: "q1", question_prompt: "Allergies?", field: "allergies", value: { allergen: "peanuts", severity: "severe", note: null }, confirmed_at: "2026-10-29T10:00:00Z" },
      { proposal_id: "p2", field: "shoe_size", value: { size: 44 } },
      { proposal_id: "p3", field: "injuries", value: null },
    ]);
    assert.deepEqual(list.map((a) => a.proposalId), ["p1", "p3"]);
    assert.deepEqual(list[1].value, {});
    assert.deepEqual(parseConfirmedAnswers(undefined), []);
  });
  it("says each one as confirmed, and where it went", () => {
    const allergy = confirmedAnswerRow({ field: "allergies", value: { allergen: "peanuts", severity: "severe" } });
    assert.match(allergy.title, /allergy, severe$/);
    assert.equal(allergy.where, "Dietary needs card");
    assert.deepEqual(confirmedAnswerRow({ field: "injuries", value: { description: "meniscus repair", body_area: "Left knee", since: "2024-03-01" } }), {
      title: "Left knee: meniscus repair, 2024",
      where: "Profile and programme notes",
    });
    assert.equal(confirmedAnswerRow({ field: "injuries", value: { description: "Sprained wrist" } }).title, "Sprained wrist");
    assert.equal(confirmedAnswerRow({ field: "medications", value: { name: "Metformin", dose: "500 mg", route: "oral" } }).title, "Metformin, 500 mg");
    assert.equal(confirmedAnswerRow({ field: "weight", value: { kg: 70 } }).title, "70 kg");
    assert.equal(confirmedAnswerRow({ field: "dietary_restrictions", value: { restriction: "not-a-diet" } }).title, "A diet");
  });
});

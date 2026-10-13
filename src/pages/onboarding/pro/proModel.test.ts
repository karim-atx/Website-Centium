import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  credentialsComplete,
  emptyProDraft,
  formatsForDb,
  placesForDb,
  CLOSEST_GROUP_LEGACY,
  CLOSEST_GROUPS,
  lengthsForDb,
  proChipLabel,
  proKindOf,
  restoreProDraft,
  stepLength,
  whatYouDoError,
  workComplete,
  workSummary,
  initials,
} from "./proModel";

test("the specialty maps to the handoff's lane", () => {
  assert.equal(proKindOf("trainer"), "trainer");
  assert.equal(proKindOf("physiotherapist"), "physio");
  assert.equal(proKindOf("dietitian"), "diet");
  assert.equal(proKindOf(null), "other");
});

test("session lengths step through the lengths the database accepts", () => {
  assert.equal(stepLength(60, 1), 75);
  assert.equal(stepLength(60, -1), 45);
  assert.equal(stepLength(15, -1), 15);
  assert.equal(stepLength(120, 1), 120);
  assert.equal(stepLength(50, 1), 75);
  assert.deepEqual(lengthsForDb([60, 60]), [60]);
  assert.deepEqual(lengthsForDb([45, 30]), [45, 30]);
});

test("only real formats are stored; places stay in the draft", () => {
  assert.deepEqual(formatsForDb(["One to one", "At a gym", "Online", "Online follow-ups", "Home visits"]), ["one_to_one", "online_call"]);
  assert.deepEqual(formatsForDb(["Group classes", "Outdoors"]), ["class"]);
});

test("Where you work needs a mode, and a business ID at a business", () => {
  assert.equal(workComplete({ workMode: null, businessCode: "" }), false);
  assert.equal(workComplete({ workMode: "business", businessCode: " " }), false);
  assert.equal(workComplete({ workMode: "business", businessCode: "K7MX4P" }), true);
  assert.equal(workComplete({ workMode: "online", businessCode: "" }), true);
});

test("a regulated professional needs a body, a number and the proof", () => {
  const d = { registeringBody: "Order of Physiotherapists", licenceNumber: "PT-1" };
  assert.equal(credentialsComplete("physio", d, true), true);
  assert.equal(credentialsComplete("physio", d, false), false);
  assert.equal(credentialsComplete("diet", { ...d, licenceNumber: " " }, true), false);
  assert.equal(credentialsComplete("trainer", { registeringBody: "", licenceNumber: "" }, false), true);
});

test("What do you do? is optional, 2 to 40 characters, and becomes the chip", () => {
  assert.equal(whatYouDoError(""), null);
  assert.equal(whatYouDoError("x"), "Use at least 2 characters.");
  assert.equal(whatYouDoError("y".repeat(41)), "Keep it under 40 characters.");
  assert.equal(proChipLabel("other", "Yoga instructor"), "Yoga instructor");
  assert.equal(proChipLabel("other", ""), "Other professional");
  assert.equal(proChipLabel("trainer", "Yoga instructor"), "Personal Trainer");
  assert.equal(proChipLabel("other", "Breathwork and somatic coach").length, 22);
});

test("the Review lines read the person's own answers", () => {
  const area = { label: "Hamra", lat: 33.9, lng: 35.48 };
  assert.equal(workSummary({ workMode: "mix", area, homeVisitKm: null }, "trainer"), "A mix · Hamra and online");
  assert.equal(workSummary({ workMode: "independent", area, homeVisitKm: 8 }, "physio"), "Independent · clinic in Hamra, home visits");
  assert.equal(workSummary({ workMode: "online", area, homeVisitKm: null }, "diet"), "Online only");
  assert.equal(initials("Alex Morgan"), "AM");
});

test("a saved draft is merged over today's defaults", () => {
  const d = restoreProDraft("physio", { specialties: ["a", "b", "c", "d", "e", "f"], lengths: [30] as unknown as [number, number] });
  assert.equal(d.specialties.length, 5);
  assert.deepEqual(d.lengths, emptyProDraft("physio").lengths);
  assert.equal(d.registrationLicenceId, null);
});

test("places go to session_places, and Home visits only with a radius", () => {
  assert.deepEqual(placesForDb(["One to one", "At a gym", "Home visits"], null), ["at_gym"]);
  assert.deepEqual(placesForDb(["At a gym", "Home visits"], 8), ["at_gym", "home_visit"]);
  assert.deepEqual(placesForDb(["In clinic"], 5), ["in_clinic", "home_visit"]);
  assert.deepEqual(placesForDb(["Messages between sessions", "Outdoors"], null), ["messages_between_sessions", "outdoors"]);
});

test("Closest group offers the four professional_group values", () => {
  assert.deepEqual(CLOSEST_GROUPS.map((g) => g.value), ["fitness", "clinical", "nutrition", "other"]);
  assert.equal(CLOSEST_GROUP_LEGACY.clinical, "doctor");
});

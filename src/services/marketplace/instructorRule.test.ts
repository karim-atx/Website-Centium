import { test } from "node:test";
import assert from "node:assert/strict";
import { hiredViaCentium, instructorFacts } from "./instructorRule.ts";

const view = { instructor_id: "p1", instructor_name: " Rana Khoury ", instructor_avatar_url: "https://x/a.png" };

test("a Team instructor is listed, with the card columns", () => {
  const team = instructorFacts({ ...view, instructor_is_team: true, instructor_specialty: "Cycling and HIIT", instructor_rating: "4.8", instructor_review_count: 38, instructor_hire_count: 2 });
  assert.equal(team.instructorIsTeam, true);
  assert.equal(team.instructorId, "p1");
  assert.equal(team.instructorName, "Rana Khoury");
  assert.equal(team.instructorAvatarUrl, "https://x/a.png");
  assert.equal(team.instructorSpecialty, "Cycling and HIIT");
  assert.equal(team.instructorRating, 4.8);
  assert.equal(team.instructorReviewCount, 38);
  assert.equal(team.instructorHireCount, 2);
  assert.equal(hiredViaCentium(team), true);
  // Team through the existing-team window (no Centium hire): listed, no "Hired via Centium".
  assert.equal(hiredViaCentium(instructorFacts({ ...view, instructor_is_team: true, instructor_hire_count: 0 })), false);
  // A blank specialty is no specialty.
  assert.equal(instructorFacts({ ...view, instructor_is_team: true, instructor_specialty: "  " }).instructorSpecialty, null);
});

test("not on the Team (left, or never): unlisted whatever the view names", () => {
  const left = instructorFacts({ ...view, instructor_is_team: false, instructor_specialty: "Cycling", instructor_rating: 4.5, instructor_review_count: 3, instructor_hire_count: 1 });
  assert.equal(left.instructorIsTeam, false);
  assert.equal(left.instructorId, null);
  assert.equal(left.instructorName, null);
  assert.equal(left.instructorAvatarUrl, null);
  assert.equal(left.instructorSpecialty, null);
  assert.equal(left.instructorRating, null);
  assert.equal(left.instructorReviewCount, null);
  assert.equal(left.instructorHireCount, null);
  assert.equal(hiredViaCentium(left), false);
});

test("nobody named, or the view hides the name: unlisted", () => {
  const none = instructorFacts({ instructor_id: null, instructor_name: null, instructor_is_team: false, instructor_specialty: null, instructor_rating: null, instructor_review_count: 0, instructor_hire_count: 0 });
  assert.equal(none.instructorId, null);
  assert.equal(none.instructorName, null);
  // On the Team but not listed publicly: the view nulls the name, so no card.
  assert.equal(instructorFacts({ instructor_id: null, instructor_name: null, instructor_is_team: true }).instructorId, null);
  assert.equal(instructorFacts({ ...view, instructor_name: "  ", instructor_is_team: true }).instructorId, null);
});

test("no interim: a row without instructor_is_team names nobody", () => {
  const f = instructorFacts(view);
  assert.equal(f.instructorIsTeam, false);
  assert.equal(f.instructorId, null);
  assert.equal(hiredViaCentium(f), false);
});

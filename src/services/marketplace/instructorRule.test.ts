import { test } from "node:test";
import assert from "node:assert/strict";
import { hiredViaCentium, instructorFacts } from "./instructorRule.ts";

const view = { instructor_id: "p1", instructor_name: " Rana Khoury ", instructor_avatar_url: "https://x/a.png" };

test("before DB9 (no instructor_is_team column): the D-11 interim, the view's listed instructor, no Hired via Centium", () => {
  const f = instructorFacts(view);
  assert.equal(f.instructorIsTeam, null);
  assert.equal(f.instructorId, "p1");
  assert.equal(f.instructorName, "Rana Khoury");
  assert.equal(hiredViaCentium(f), false);
  const none = instructorFacts({ instructor_id: null, instructor_name: null });
  assert.equal(none.instructorId, null);
  assert.equal(none.instructorName, null);
  assert.equal(instructorFacts({ instructor_id: "p1", instructor_name: "  " }).instructorId, null);
});

test("after DB9: only a Team instructor is listed, with the DB9 card fields", () => {
  const team = instructorFacts({ ...view, instructor_is_team: true, instructor_specialty: "Cycling and HIIT", instructor_rating: "4.8", instructor_review_count: 38, instructor_hire_count: 2 });
  assert.equal(team.instructorIsTeam, true);
  assert.equal(team.instructorName, "Rana Khoury");
  assert.equal(team.instructorSpecialty, "Cycling and HIIT");
  assert.equal(team.instructorRating, 4.8);
  assert.equal(team.instructorReviewCount, 38);
  assert.equal(hiredViaCentium(team), true);
  // Team through the existing-team window (no Centium hire): listed, no "Hired via Centium".
  assert.equal(hiredViaCentium(instructorFacts({ ...view, instructor_is_team: true, instructor_hire_count: 0 })), false);
  // Not Team: unlisted whatever the view names (no photo, no link).
  const not = instructorFacts({ ...view, instructor_is_team: false, instructor_specialty: "Cycling" });
  assert.equal(not.instructorId, null);
  assert.equal(not.instructorName, null);
  assert.equal(not.instructorAvatarUrl, null);
  assert.equal(not.instructorSpecialty, null);
  assert.equal(hiredViaCentium(not), false);
});

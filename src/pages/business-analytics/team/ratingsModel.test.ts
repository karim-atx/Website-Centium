import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { BizReview, InstructorRating } from "../../../services/reputation/types";
import {
  distOf,
  metaOf,
  ratedPeople,
  ratingsLead,
  reviewsByInstructor,
  shortAge,
  sortReviews,
  teamFigures,
  trendOf,
  vsTeam,
} from "./ratingsModel.ts";

const ir = (id: string, name: string, reviews: number, average: number | null): InstructorRating => ({
  professionalId: id,
  firstName: name,
  reviews,
  average,
});
const rv = (id: string, rating: number | null, day: string, instructor: string | null, extra: Partial<BizReview> = {}): BizReview => ({
  id,
  gymId: "g1",
  gymName: "Flex Gym",
  rating,
  body: "Text",
  label: "Member #" + id.toUpperCase(),
  createdAt: `${day}T10:00:00Z`,
  editedAt: null,
  redacted: false,
  classTitle: "Spin 45",
  instructor,
  reply: null,
  flagged: false,
  ...extra,
});

test("ratings: team average is weighted, shows from 3 reviews, delta hidden in early data", () => {
  const all = [ir("a", "John", 3, 5), ir("b", "Jane", 1, 2)];
  const f = teamFigures(all, [ir("a", "John", 3, 4)], [ir("b", "Jane", 1, 2)], false);
  assert.equal(f.count, 4);
  assert.equal(f.avg, 4.3);
  assert.equal(f.delta, 0.3);
  assert.equal(f.newInRange, 1);
  assert.equal(teamFigures(all, [ir("a", "John", 3, 4)], [], true).delta, null);
  assert.equal(teamFigures([ir("a", "John", 2, 5)], [], [], false).avg, null);
});

test("ratings: reviews match an instructor by instructor_id, even when first names repeat", () => {
  const ratings = [ir("a", "John", 2, 5), ir("b", "Sam", 1, 4), ir("c", "Sam", 1, 3)];
  const m = reviewsByInstructor(
    [
      rv("1", 5, "2026-10-01", "John", { instructorId: "a" }),
      rv("2", 4, "2026-10-01", "Sam", { instructorId: "b" }),
      rv("3", 3, "2026-10-01", "Sam", { instructorId: "c" }),
      rv("4", 3, "2026-10-01", null),
      rv("5", 2, "2026-10-01", "Kim", { instructorId: "gone" }),
    ],
    ratings,
  );
  assert.equal(m.get("a")?.length, 1);
  assert.equal(m.get("b")?.length, 1);
  assert.equal(m.get("c")?.length, 1);
  assert.equal(m.has("gone"), false);
});

test("ratings: distribution only when it agrees with the reader's count", () => {
  const list = [rv("1", 5, "2026-10-01", "John"), rv("2", 4, "2026-10-01", "John"), rv("3", null, "2026-10-01", "John", { redacted: true })];
  assert.deepEqual(distOf(list, 2), [1, 1, 0, 0, 0]);
  assert.equal(distOf(list, 3), null);
});

test("ratings: rows highest first, New last in team order; trend and meta", () => {
  const people = [
    { id: "s", name: "Sam M.", seat: 1 },
    { id: "j", name: "John A.", seat: 2 },
    { id: "k", name: "Kim L.", seat: 3 },
  ];
  const rows = ratedPeople(people, [ir("j", "John", 4, 4.75), ir("k", "Kim", 3, 4.2), ir("s", "Sam", 1, 5)], [ir("j", "John", 2, 5)], [ir("j", "John", 2, 4.5)]);
  assert.deepEqual(rows.map((r) => r.id), ["j", "k", "s"]);
  assert.equal(rows[0].avg, 4.8);
  assert.equal(rows[0].trend, "up");
  assert.equal(rows[1].trend, null);
  assert.equal(rows[2].avg, null);
  assert.equal(metaOf(4, "steady"), "Trend steady over 3 months");
  assert.equal(metaOf(3, null), "Not enough reviews for a trend yet");
  assert.equal(metaOf(2, null), "Shown after 3 reviews");
  assert.equal(metaOf(0, null), "No reviews yet");
  assert.equal(trendOf(ir("j", "John", 1, 4.6), ir("j", "John", 1, 4.65)), "steady");
  const team = teamFigures([ir("j", "John", 4, 4.75), ir("k", "Kim", 3, 4.2), ir("s", "Sam", 1, 5)], [], [], false);
  assert.equal(ratingsLead(team, rows), "John has the highest rating. Sam shows as New until they have 3 reviews.");
});

test("ratings: lead for none, under 3 and a single instructor", () => {
  assert.equal(ratingsLead(teamFigures([], [], [], false), []), "No reviews yet. Members can review an instructor after a class.");
  assert.equal(ratingsLead(teamFigures([ir("a", "Jo", 2, 5)], [], [], false), []), "The team average shows after 3 reviews.");
  const one = ratedPeople([{ id: "a", name: "John A.", seat: 1 }], [ir("a", "John", 23, 4.83)], [], []);
  assert.equal(ratingsLead(teamFigures([ir("a", "John", 23, 4.83)], [], [], false), one), "John A. is rated 4.8 from 23 reviews.");
});

test("ratings: vs team line, sorts and the short age", () => {
  assert.deepEqual(vsTeam(4.8, 4.7), { text: "Above team avg 4.7", good: true });
  assert.deepEqual(vsTeam(4.7, 4.7), { text: "Same as team avg 4.7", good: false });
  assert.deepEqual(vsTeam(4.6, 4.7), { text: "Below team avg 4.7", good: false });
  assert.deepEqual(vsTeam(null, 4.7), { text: "Team avg 4.7", good: false });
  assert.equal(vsTeam(4.8, null), null);
  const list = [rv("a", 5, "2026-10-01", "J"), rv("b", 4, "2026-09-01", "J"), rv("c", 4, "2026-10-02", "J"), rv("d", null, "2026-10-03", "J", { redacted: true })];
  assert.deepEqual(sortReviews(list, "lowest").map((r) => r.id), ["c", "b", "a", "d"]);
  assert.deepEqual(sortReviews(list, "highest").map((r) => r.id), ["a", "c", "b", "d"]);
  assert.deepEqual(sortReviews(list, "newest").map((r) => r.id), ["d", "c", "a", "b"]);
  const now = Date.parse("2026-10-15T10:00:00Z");
  assert.equal(shortAge("2026-10-01T10:00:00Z", now), "2 wk");
  assert.equal(shortAge("2026-10-15T08:00:00Z", now), "Today");
  assert.equal(shortAge("2026-10-12T10:00:00Z", now), "3 d");
  assert.equal(shortAge("2026-08-01T10:00:00Z", now), "2 mo");
});

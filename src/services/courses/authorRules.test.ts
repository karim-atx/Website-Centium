import test from "node:test";
import assert from "node:assert/strict";
import {
  canEditNow,
  courseStatusLook,
  describeAuthorError,
  editingRevisionId,
  formatCents,
  needsRevisionToEdit,
  priceBreakdown,
  revisionIsOpen,
  revisionStatusLook,
  submitBlockers,
  submitWarnings,
  COURSE_LEVELS,
  COVER_COLOURS,
  LIMITS,
  type CourseStatus,
  type RevisionStatus,
} from "./authorRules";

const ALL_COURSE: CourseStatus[] = ["draft", "submitted", "published", "changes_requested", "unpublished"];
const ALL_REVISION: RevisionStatus[] = ["draft", "submitted", "applied", "changes_requested", "withdrawn"];

test("every course status has words", () => {
  for (const s of ALL_COURSE) {
    const look = courseStatusLook(s);
    assert.ok(look.label.length > 0 && look.detail.length > 0, s);
  }
});

test("every revision status has words", () => {
  for (const s of ALL_REVISION) {
    const look = revisionStatusLook(s);
    assert.ok(look.label.length > 0 && look.detail.length > 0, s);
  }
});

test("a revision is open in draft, submitted and changes_requested", () => {
  assert.deepEqual(ALL_REVISION.filter(revisionIsOpen), ["draft", "submitted", "changes_requested"]);
});

test("editingRevisionId points at an open revision and ignores a closed one", () => {
  assert.equal(editingRevisionId(null), null);
  assert.equal(editingRevisionId({ id: "r1", status: "draft" }), "r1");
  assert.equal(editingRevisionId({ id: "r1", status: "changes_requested" }), "r1");
  assert.equal(editingRevisionId({ id: "r1", status: "applied" }), null);
  assert.equal(editingRevisionId({ id: "r1", status: "withdrawn" }), null);
});

test("A PUBLISHED COURSE'S LIVE TREE IS NEVER EDITABLE", () => {
  assert.equal(canEditNow("published", null), false);
  assert.equal(canEditNow("published", { status: "applied" }), false);
});

test("a published course IS editable through an open revision", () => {
  assert.equal(canEditNow("published", { status: "draft" }), true);
  assert.equal(canEditNow("published", { status: "changes_requested" }), true);
});

test("ANYTHING WITH A REVIEWER IS FROZEN, course or revision", () => {
  assert.equal(canEditNow("submitted", null), false);
  assert.equal(canEditNow("published", { status: "submitted" }), false);
});

test("draft and changes_requested are edited directly", () => {
  assert.equal(canEditNow("draft", null), true);
  assert.equal(canEditNow("changes_requested", null), true);
});

test("an unpublished course is not editable without a revision", () => {
  // The database allows draft/changes_requested only, so unpublished is frozen
  // until a reviewer moves it. The UI must not offer a field that cannot save.
  assert.equal(canEditNow("unpublished", null), false);
});

test("needsRevisionToEdit is true only for a published course with no open revision", () => {
  assert.equal(needsRevisionToEdit("published", null), true);
  assert.equal(needsRevisionToEdit("published", { status: "applied" }), true);
  assert.equal(needsRevisionToEdit("published", { status: "draft" }), false);
  assert.equal(needsRevisionToEdit("draft", null), false);
  assert.equal(needsRevisionToEdit("submitted", null), false);
});

test("formatCents drops the decimals on a whole dollar", () => {
  assert.equal(formatCents(0), "$0");
  assert.equal(formatCents(2900), "$29");
  assert.equal(formatCents(2950), "$29.50");
  assert.equal(formatCents(50000), "$500");
  assert.equal(formatCents(1), "$0.01");
});

test("THE BREAKDOWN ROUNDS THE WAY THE DATABASE ROUNDS IT", () => {
  // course_net_earnings is round(price * pct / 100) subtracted from price.
  assert.deepEqual(priceBreakdown(2900, 15), { priceCents: 2900, commissionCents: 435, netCents: 2465 });
  assert.deepEqual(priceBreakdown(0, 15), { priceCents: 0, commissionCents: 0, netCents: 0 });
});

test("the halfway cent rounds up, as round() does, and the parts still sum", () => {
  // 1 * 15 / 100 = 0.15 -> 0; 10 * 15 / 100 = 1.5 -> 2 in Postgres round(),
  // and Math.round(1.5) is 2 as well, which is the agreement being tested.
  assert.deepEqual(priceBreakdown(10, 15), { priceCents: 10, commissionCents: 2, netCents: 8 });
  for (const price of [1, 99, 100, 333, 999, 2900, 4999, 50000]) {
    for (const pct of [0, 10, 15, 22.5, 30]) {
      const b = priceBreakdown(price, pct);
      assert.equal(b.commissionCents + b.netCents, price, `${price} at ${pct}%`);
      assert.ok(b.netCents >= 0 && b.commissionCents >= 0);
    }
  }
});

test("a zero commission leaves the whole price", () => {
  assert.deepEqual(priceBreakdown(2900, 0), { priceCents: 2900, commissionCents: 0, netCents: 2900 });
});

test("submitBlockers names the one thing the database actually refuses", () => {
  assert.deepEqual(submitBlockers({ modules: [], lessons: [] }), ["Add at least one lesson before submitting."]);
  assert.deepEqual(
    submitBlockers({ modules: [{ id: "m", title: "Week 1" }], lessons: [{ moduleId: "m", kind: "video" }] }),
    []
  );
});

test("A WEEK WITH NO LESSONS IS A WARNING, NOT A BLOCKER", () => {
  // The database does not refuse it, so neither does the button.
  const tree = {
    modules: [
      { id: "a", title: "Week 1" },
      { id: "b", title: "Week 2" },
    ],
    lessons: [{ moduleId: "a", kind: "video" }],
  };
  assert.deepEqual(submitBlockers(tree), []);
  const warnings = submitWarnings({ subtitle: "x", learnPoints: ["y"] }, tree);
  assert.ok(warnings.some((w) => w.includes("Week 2")));
});

test("several empty weeks are counted rather than listed", () => {
  const tree = {
    modules: [
      { id: "a", title: "Week 1" },
      { id: "b", title: "Week 2" },
      { id: "c", title: "Week 3" },
    ],
    lessons: [{ moduleId: "a", kind: "video" }],
  };
  const warnings = submitWarnings({ subtitle: "x", learnPoints: ["y"] }, tree);
  assert.ok(warnings.some((w) => w === "2 weeks have no lessons yet."));
});

test("a missing subtitle and empty learn points are warnings", () => {
  const tree = { modules: [{ id: "a", title: "W" }], lessons: [{ moduleId: "a", kind: "video" }] };
  const warnings = submitWarnings({ subtitle: null, learnPoints: [] }, tree);
  assert.equal(warnings.length, 2);
  assert.ok(warnings.some((w) => w.includes("subtitle")));
  assert.ok(warnings.some((w) => w.includes("What you'll learn")));
});

test("a complete course warns about nothing", () => {
  const tree = { modules: [{ id: "a", title: "W" }], lessons: [{ moduleId: "a", kind: "video" }] };
  assert.deepEqual(submitWarnings({ subtitle: "A subtitle", learnPoints: ["One"] }, tree), []);
});

test("THE YOUTUBE REFUSAL SAYS WHAT IS ACCEPTED", () => {
  const text = describeAuthorError({ code: "ATX70" }, "video");
  assert.match(text, /youtu\.be/);
  assert.match(text, /not a playlist/);
});

test("ATX67 is worded for what the author was trying to do", () => {
  assert.match(describeAuthorError({ code: "ATX67" }, "revision"), /already has a revision open/);
  assert.match(describeAuthorError({ code: "ATX67" }, "submit"), /can be submitted/);
  assert.match(describeAuthorError({ code: "ATX67" }, "save"), /revision/);
});

test("the quiz-option refusal names both halves of the rule", () => {
  const text = describeAuthorError({ code: "22023" }, "options");
  assert.match(text, /2 and 8/);
  assert.match(text, /exactly one/);
});

test("an unverified licence is told where to look", () => {
  assert.match(describeAuthorError({ code: "ATX66" }, "create"), /Profile/);
});

test("rate limits are worded per action", () => {
  assert.match(describeAuthorError({ code: "ATX02" }, "create"), /started a lot of courses/);
  assert.match(describeAuthorError({ code: "ATX02" }, "pdf"), /uploads/);
  assert.match(describeAuthorError({ code: "ATX02" }, "submit"), /submitted a lot/);
});

test("an unknown code still gets words", () => {
  assert.equal(describeAuthorError({ code: "WHATEVER" }, "save"), "Something went wrong. Try again.");
  assert.equal(describeAuthorError({}, "save"), "Something went wrong. Try again.");
});

test("the limits mirror the schema's own numbers", () => {
  assert.equal(LIMITS.priceCents.max, 50_000);
  assert.equal(LIMITS.title.min, 4);
  assert.equal(LIMITS.learnPoints, 8);
  assert.equal(LIMITS.quizOptions.min, 2);
  assert.equal(LIMITS.quizOptions.max, 8);
});

test("every cover colour is a six-digit hex, as courses_cover_colour_check requires", () => {
  for (const c of COVER_COLOURS) assert.match(c, /^#[0-9A-Fa-f]{6}$/);
  assert.equal(new Set(COVER_COLOURS).size, COVER_COLOURS.length, "duplicate colour");
});

test("the levels are exactly the four the schema allows", () => {
  assert.deepEqual([...COURSE_LEVELS], ["beginner", "intermediate", "advanced", "all_levels"]);
});

import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  coursePill,
  describeCourseError,
  formatPrice,
  lessonOpenTo,
  minutesLabel,
  nextLesson,
  progressPercent,
  weekContents,
  youtubeEmbedUrl,
  type OrderedLesson,
} from "./rules.ts";

test("prices", () => {
  assert.equal(formatPrice(0), "Free");
  assert.equal(formatPrice(2900), "$29");
  assert.equal(formatPrice(2950), "$29.50");
});

test("pills and week contents", () => {
  assert.equal(coursePill("beginner", 6), "Beginner · 6 weeks");
  assert.equal(coursePill("all_levels", 1, 2), "All levels · 1 week · about 2 hours a week");
  assert.equal(coursePill("intermediate", 4, 1.5), "Intermediate · 4 weeks · about 1.5 hours a week");
  assert.equal(weekContents(["video", "video", "video", "video", "reading"]), "4 videos, 1 reading");
  assert.equal(weekContents(["quiz", "pdf", "video"]), "1 video, 1 quiz, 1 PDF");
  assert.equal(minutesLabel(35), "35 min");
  assert.equal(minutesLabel(65), "1 hr 5 min");
  assert.equal(minutesLabel(0), null);
});

test("videos and readings are never locked; quizzes and PDFs need the full course", () => {
  assert.equal(lessonOpenTo("video", "free"), true);
  assert.equal(lessonOpenTo("reading", "free"), true);
  assert.equal(lessonOpenTo("quiz", "free"), false);
  assert.equal(lessonOpenTo("pdf", "free"), false);
  assert.equal(lessonOpenTo("pdf", "paid"), true);
  assert.equal(lessonOpenTo("video", "none"), false);
});

const L: OrderedLesson[] = [
  { id: "a", kind: "video" },
  { id: "b", kind: "video" },
  { id: "q", kind: "quiz" },
  { id: "p", kind: "pdf" },
  { id: "r", kind: "reading" },
];

test("progress counts only the lessons open to the learner", () => {
  assert.equal(progressPercent(L, new Set(["a"]), "free"), 33);
  assert.equal(progressPercent(L, new Set(["a"]), "paid"), 20);
  assert.equal(progressPercent([], new Set(), "paid"), 0);
});

test("continue goes to the next open lesson not done", () => {
  assert.equal(nextLesson(L, new Set(["a"]), "a", "free")?.id, "b");
  assert.equal(nextLesson(L, new Set(["a", "b"]), "b", "free")?.id, "r");
  assert.equal(nextLesson(L, new Set(["a", "b"]), "b", "paid")?.id, "q");
  assert.equal(nextLesson(L, new Set(), null, "free")?.id, "a");
  assert.equal(nextLesson(L, new Set(["a", "b", "r"]), "r", "free")?.id, "r");
});

test("embed url: privacy-enhanced, no autoplay, ids only", () => {
  assert.equal(youtubeEmbedUrl("dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&playsinline=1");
  assert.equal(youtubeEmbedUrl("dQw4w9WgXcQ\"><script>"), null);
  assert.equal(youtubeEmbedUrl(null), null);
  assert.ok(!youtubeEmbedUrl("dQw4w9WgXcQ")!.includes("autoplay"));
});

test("refusal wording", () => {
  assert.equal(describeCourseError({ code: "ATX68" }, "paid"), "Paid courses open soon.");
  assert.equal(describeCourseError({ code: "ATX69" }, "quiz"), "Quizzes are part of the full course.");
  assert.equal(describeCourseError({ code: "XX000" }, "read"), null);
});

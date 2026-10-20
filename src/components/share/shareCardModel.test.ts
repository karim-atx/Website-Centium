// Release 3 W8: the share card's pure parts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STAT_KEYS,
  cardHeight,
  cardPayload,
  clientShownAs,
  clipQuote,
  itemFormat,
  itemKind,
  milestoneCard,
  reachedMilestone,
  slotsCard,
  specFromPayload,
  winCard,
  winRowText,
  type CardPayload,
  type ClientWin,
} from "./shareCardModel";

const win = (kind: ClientWin["kind"], value: Record<string, unknown>, occurredAt = "2026-10-14T09:00:00Z"): ClientWin => ({ winId: "w1", clientId: "c1", kind, occurredAt, value });

/** share_card_allowed() (20261124080000), restated: the keys a stored card may carry. */
function allowed(p: CardPayload): boolean {
  const top = ["format", "style", "template", "colour", "title", "subtitle", "name_display", "stats"];
  if (Object.keys(p).some((k) => !top.includes(k))) return false;
  if (!p.stats) return true;
  if (p.stats.length > 6) return false;
  return p.stats.every((s) => Object.keys(s).every((k) => ["key", "label", "value"].includes(k)) && (STAT_KEYS as readonly string[]).includes(s.key));
}

test("export sizes follow card31 (Story and Sticker 16:9, Post 1.25, Square 1)", () => {
  assert.equal(cardHeight("story", 1080), 1920);
  assert.equal(cardHeight("sticker", 1080), 1920);
  assert.equal(cardHeight("post", 1080), 1350);
  assert.equal(cardHeight("square", 1080), 1080);
});

test("the client is shown by first name, initials or not at all", () => {
  assert.equal(clientShownAs("Sam Rahal", "name"), "Sam");
  assert.equal(clientShownAs("Sam Rahal", "initials"), "S.R.");
  assert.equal(clientShownAs("Sam Rahal", "none"), "A client");
  assert.equal(clientShownAs("", "initials"), "A client");
});

test("every allowed win kind makes a card from client_wins values only", () => {
  const pr = winCard(win("pr", { pr_exercise: "Back squat", pr_load_kg: 120 }))!;
  assert.equal(pr.big, "120");
  assert.equal(pr.unit, "kg");
  assert.equal(pr.subject, "Back squat");
  assert.deepEqual(pr.stats, []);
  assert.equal(winCard(win("programme_complete", { programme_name: "Strength foundations", programme_weeks: 4 }))!.big, "4");
  assert.equal(winCard(win("programme_complete", { programme_name: "Strength foundations" }))!.hero, "title");
  assert.equal(winCard(win("consistency", { workouts_count: 9, weeks_count: 4 }))!.subject, "in the last 4 weeks");
  assert.equal(winCard(win("logging_streak", { logging_streak_days: 14 }, "2026-10-14"))!.line, "{c} · since Oct 1");
  assert.equal(winCard(win("meal_plan_complete", { meal_plan_name: "Balanced week" }))!.title, "Balanced week");
  // A habit's own name is never drawn.
  const streak = winCard(win("streak", { streak_days: 21, streak_label: "Take my medicine" }))!;
  assert.equal(JSON.stringify(streak).includes("medicine"), false);
  assert.equal(winCard(win("pr", { pr_exercise: "Back squat" })), null);
});

test("win rows: no percentages, no weight change", () => {
  const rows = [
    winRowText(win("pr", { pr_exercise: "Back squat", pr_load_kg: 112.5 })),
    winRowText(win("consistency", { workouts_count: 9, weeks_count: 4 })),
    winRowText(win("logging_streak", { logging_streak_days: 100 })),
    winRowText(win("streak", { streak_days: 30, streak_label: "x" })),
  ].map((r) => r!.title);
  assert.deepEqual(rows, ["New PR · Back squat 112.5 kg", "9 workouts in 4 weeks", "100-day logging streak", "30-day habit streak"]);
  assert.equal(rows.some((r) => r.includes("%")), false);
});

test("stored payloads pass the allowlist and come back as the same card", () => {
  const specs = [
    winCard(win("pr", { pr_exercise: "Back squat", pr_load_kg: 120 }))!,
    winCard(win("logging_streak", { logging_streak_days: 14 }))!,
    winCard(win("meal_plan_complete", { meal_plan_name: "Balanced week" }))!,
    milestoneCard({ sessionsDelivered: 500, clientsCoached: 64, averageRating: 4.9, reviewCount: 26, yearsOnCentium: 3 }),
    slotsCard(["Tue 6:00 PM", "Thu 7:00 AM", "Sat 10:00 AM"], "Springfield"),
  ];
  for (const s of specs) {
    const p = cardPayload(s, "post", "B", "S.R.");
    assert.ok(allowed(p), JSON.stringify(p));
    const back = specFromPayload(p, "Rami")!;
    assert.equal(back.spec.template, s.template);
    assert.equal(back.format, "post");
    if (s.hero === "num") {
      assert.equal(back.spec.big, s.big);
      assert.equal(back.spec.line, s.line?.replace("{c}", "S.R."));
    }
  }
  assert.equal(specFromPayload({ template: "weight_change" }, "Rami"), null);
});

test("shared_items format and kind", () => {
  assert.equal(itemFormat("square"), "post");
  assert.equal(itemFormat("sticker"), "sticker");
  assert.equal(itemKind(milestoneCard({ sessionsDelivered: 10, clientsCoached: 1, averageRating: null, reviewCount: 0, yearsOnCentium: null })), null);
  assert.equal(itemKind(winCard(win("pr", { pr_exercise: "Row", pr_load_kg: 80 }))!), "win");
});

test("milestones and quotes", () => {
  assert.equal(reachedMilestone(9), null);
  assert.equal(reachedMilestone(537), 500);
  assert.equal(clipQuote("a ".repeat(200), 20).endsWith("…"), true);
  assert.equal(clipQuote("Short one.", 20), "Short one.");
});

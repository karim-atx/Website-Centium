// Release 3 W8: the share card's pure parts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cardLink,
  cardQrValue,
  fitLinkSize,
  STAT_KEYS,
  cardHeight,
  cardPayload,
  clientShownAs,
  clipQuote,
  FORMATS,
  itemKind,
  milestoneCard,
  reachedMilestone,
  shareDate,
  slotsCard,
  specFromPayload,
  winCard,
  winRowText,
  type CardPayload,
  type ClientWin,
  canAskToShare,
  readWinSharing,
  shareableWins,
  winsShieldLine,
  EDITOR_STYLES,
  EDITOR_STYLE_LABEL,
  cardStyleOf,
  storedStyle,
  usesOverlay,
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
  // W8-4 (Release A 20261216010000): shared_items.format checks story, post,
  // square, sticker, link, so every export format is recorded as itself.
  const DB_FORMATS = ["story", "post", "square", "sticker", "link"];
  for (const f of FORMATS) assert.ok(DB_FORMATS.includes(f), f);
  const square = cardPayload(milestoneCard({ sessionsDelivered: 10, clientsCoached: 1, averageRating: null, reviewCount: 0, yearsOnCentium: null }), "square", "B", null);
  assert.equal(square.format, "square");
  assert.equal(specFromPayload(square, "Rami")!.format, "square");
  // W8-3 (20261216020000): a practice milestone is recorded as `milestone`.
  assert.equal(itemKind(milestoneCard({ sessionsDelivered: 10, clientsCoached: 1, averageRating: null, reviewCount: 0, yearsOnCentium: null })), "milestone");
  assert.equal(itemKind(winCard(win("pr", { pr_exercise: "Row", pr_load_kg: 80 }))!), "win");
});

test("milestones and quotes", () => {
  assert.equal(reachedMilestone(9), null);
  assert.equal(reachedMilestone(537), 500);
  assert.equal(clipQuote("a ".repeat(200), 20).endsWith("…"), true);
  assert.equal(clipQuote("Short one.", 20), "Short one.");
});

test("shareDate uses the app's short date (month first, year only when another year)", () => {
  const now = new Date(2026, 9, 20);
  assert.equal(shareDate("2026-10-12", now), "Oct 12");
  assert.equal(shareDate(new Date(2026, 9, 12, 9).toISOString(), now), "Oct 12");
  assert.equal(shareDate("2025-10-12", now), "Oct 12, 2025");
  assert.equal(shareDate("not a date", now), "");
});

// 815efc5 W8-2: the client's win-sharing setting on the professional's side.
test("readWinSharing: null and unknown values read as always_ask", () => {
  assert.equal(readWinSharing("always_allow"), "always_allow");
  assert.equal(readWinSharing("never"), "never");
  assert.equal(readWinSharing("always_ask"), "always_ask");
  assert.equal(readWinSharing(null), "always_ask");
  assert.equal(readWinSharing(undefined), "always_ask");
  assert.equal(readWinSharing("sometimes"), "always_ask");
});

test("canAskToShare: only Never allow hides the share and ask controls", () => {
  assert.equal(canAskToShare("never"), false);
  assert.equal(canAskToShare("always_ask"), true);
  assert.equal(canAskToShare("always_allow"), true);
});

test("shareableWins: a Never allow client's wins drop out; an unknown client counts as always_ask", () => {
  const ws = [{ clientId: "a" }, { clientId: "b" }, { clientId: "c" }, { clientId: "d" }];
  const settings = new Map([["a", "never"], ["b", "always_ask"], ["c", "always_allow"]] as const);
  assert.deepEqual(shareableWins(ws, settings).map((w) => w.clientId), ["b", "c", "d"]);
});

test("winsShieldLine: the SH4 setting line, and the neutral Never allow line", () => {
  assert.equal(winsShieldLine("Sam", "full_coaching", "always_ask"), "Sharing a win asks Sam first. Sam's setting: Always ask.");
  assert.equal(winsShieldLine("Sam", "full_coaching", "always_allow"), "Sam lets professionals share wins by initials. Sam's setting: Always allow.");
  assert.equal(winsShieldLine("Sam", "full_coaching", "never"), "Sam doesn't want wins shared.");
  assert.equal(winsShieldLine("Lina", "nutrition", "always_ask"), "Sharing a win asks Lina first. Food entries and photos are never on a card.");
  assert.equal(winsShieldLine("Lina", "nutrition", "always_allow"), "Lina lets professionals share wins by initials. Food entries and photos are never on a card.");
  assert.equal(winsShieldLine("Lina", "nutrition", "never"), "Lina doesn't want wins shared.");
  for (const s of ["always_ask", "always_allow", "never"] as const) assert.doesNotMatch(winsShieldLine("Sam", "full_coaching", s), /[—’]/);
});

test("the card link and QR use the site address, never centium.app", () => {
  assert.equal(cardLink("rami.coach"), "centium.atraxia.org/p/rami.coach");
  assert.equal(cardQrValue("rami.coach"), "https://centium.atraxia.org/p/rami.coach");
});

test("the card link shrinks only when it would not fit", () => {
  assert.equal(fitLinkSize(35.6, 600, 711), 35.6);
  assert.equal(fitLinkSize(35.6, 711, 711), 35.6);
  assert.equal(fitLinkSize(35.6, 992, 711), 25.5);
  assert.equal(fitLinkSize(35.6, 0, 711), 35.6);
  assert.equal(fitLinkSize(35.6, 900, 0), 0);
});

test("P-SH.3 Your photo: a fifth editor style, drawn as Photo, recorded as style photo (D-29)", () => {
  assert.deepEqual(EDITOR_STYLES, ["L", "D", "B", "P", "Y"]);
  assert.equal(EDITOR_STYLE_LABEL.Y, "Your photo");
  assert.deepEqual(
    EDITOR_STYLES.map((s) => EDITOR_STYLE_LABEL[s]),
    ["Light", "Dark", "Brand", "Photo", "Your photo"]
  );
  assert.equal(cardStyleOf("Y"), "P");
  for (const s of ["L", "D", "B", "P"] as const) {
    assert.equal(cardStyleOf(s), s);
    assert.equal(storedStyle(s), s);
  }
  assert.equal(storedStyle("Y"), "photo");
  const spec = milestoneCard({ sessionsDelivered: 500, clientsCoached: 64, averageRating: 4.8, reviewCount: 38, yearsOnCentium: 3 });
  const p = cardPayload(spec, "story", "Y", null);
  assert.equal(p.style, "photo");
  assert.ok(allowed(p));
  // Read back (the client's views, the public card): Photo.
  assert.equal(specFromPayload(p, "Rana")?.style, "P");
  assert.equal(specFromPayload({ ...p, style: "P" }, "Rana")?.style, "P");
  assert.equal(specFromPayload({ ...p, style: "nonsense" }, "Rana")?.style, "B");
});

test("the overlay shows only for Your photo on Story, Post and Square", () => {
  assert.equal(usesOverlay("Y", "story"), true);
  assert.equal(usesOverlay("Y", "post"), true);
  assert.equal(usesOverlay("Y", "square"), true);
  assert.equal(usesOverlay("Y", "sticker"), false);
  for (const s of ["L", "D", "B", "P"] as const) for (const f of ["story", "post", "square", "sticker"] as const) assert.equal(usesOverlay(s, f), false);
});

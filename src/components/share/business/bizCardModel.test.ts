import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BIZ_FILLS,
  CARD_W,
  DEF_HIDE,
  EXPORT_W,
  PRIVATE_FIGURES,
  cardContent,
  cardLayout,
  cardLink,
  classData,
  durationText,
  exportArtboardH,
  exportH,
  fillOf,
  isNewClass,
  planData,
  previewWidth,
  templateFormats,
  toggleHide,
  toggleRows,
  toggleSub,
  weekOf,
  weekSchedule,
  type BizBrand,
  type TemplateData,
} from "./bizCardModel.ts";

const BRAND: BizBrand = { name: "Flex Fitness", initials: "FF", category: "Gym", location: "Beirut, Lebanon", logoUrl: null, slug: "flexfitness", ...BIZ_FILLS.venue };
const NOW = new Date("2026-10-22T12:00:00");

const CLASS: TemplateData = {
  t: "class",
  d: classData(
    { id: "c1", title: "Spin 45", date: "2026-10-25", startTime: "10:00", endTime: "10:45", maxCapacity: 20, booked: 14 },
    { about: "Indoor cycling with intervals and a cool-down", repeat: null, createdAt: "2026-10-19T09:00:00Z", now: NOW },
  ),
};
const OFFER: TemplateData = { t: "offer", d: { id: "o1", headline: "15% off full-price items", pointsCost: 900, validUntil: "2026-12-31", where: "both" } };

test("bcard layout: Story / Sticker 533, Post 375; sizes per format", () => {
  const story = cardLayout("story", 150, false);
  assert.equal(story.h, 533);
  assert.equal(story.k, 0.5);
  assert.equal(story.bw, 150);
  assert.equal(story.bh, 266.5);
  assert.equal(story.br, 8);
  assert.deepEqual([story.grow, story.gap, story.titleFs, story.valFs, story.qrS, story.imgH, story.schedGap], [1, 0, 28, 48, 42, 190, 7]);
  const post = cardLayout("post", 196, false);
  assert.equal(post.h, 375);
  assert.equal(post.bh, 245);
  assert.equal(post.br, 8);
  assert.deepEqual([post.grow, post.gap, post.titleFs, post.valFs, post.qrS, post.imgH, post.schedGap], [0, 14, 22, 38, 34, 96, 3]);
  assert.equal(cardLayout("post", 168, true).titleFs, 17);
  assert.equal(cardLayout("story", 168, true).titleFs, 22);
  assert.equal(cardLayout("sticker", 300, false).br, 12);
  assert.equal(previewWidth("post"), 196);
  assert.equal(previewWidth("sticker"), 150);
});

test("the export is 1080 wide: 1080 × 1920 and 1080 × 1350", () => {
  assert.equal(EXPORT_W, 1080);
  assert.equal(exportH("story"), 1920);
  assert.equal(exportH("sticker"), 1920);
  assert.equal(exportH("post"), 1350);
  assert.equal((exportArtboardH("post") * EXPORT_W) / CARD_W, 1350);
  assert.ok(Math.abs(exportArtboardH("story") - 533.333) < 0.001);
});

test("formats: Offer and Class add Sticker", () => {
  assert.deepEqual(templateFormats("offer"), ["story", "post", "sticker"]);
  assert.deepEqual(templateFormats("class"), ["story", "post", "sticker"]);
  for (const t of ["schedule", "product", "plan", "profile"] as const) assert.deepEqual(templateFormats(t), ["story", "post"]);
});

test("business colours: the board's venue and shop fills (open item 10)", () => {
  assert.deepEqual(fillOf("gym"), { c1: "#667BB1", c2: "#3F4F7E" });
  assert.deepEqual(fillOf("studio"), { c1: "#667BB1", c2: "#3F4F7E" });
  assert.deepEqual(fillOf("clothing_store"), { c1: "#4F8F8A", c2: "#2F5F58" });
});

test("TG: offer toggles, headline always on; turning one off removes it from the card", () => {
  const rows = toggleRows(OFFER, BRAND);
  assert.deepEqual(
    rows.map((r) => [r.title, r.sub, r.lock]),
    [
      ["Offer headline", "15% off full-price items", true],
      ["Points cost", "900 points", false],
      ["Validity dates", "Until Dec 31, 2026", false],
      ["Where", "In store and online", false],
    ],
  );
  const all = cardContent(BRAND, OFFER, []);
  assert.equal(all.val, "900");
  assert.ok(all.leaf);
  assert.equal(all.unit, "points");
  assert.equal(all.sub, "Redeem with Centium Points");
  assert.deepEqual(all.rows.map((r) => [r.k, r.v]), [["Valid", "Until Dec 31, 2026"], ["Where", "In store and online"]]);
  let hide = toggleHide([], rows, "points", false);
  hide = toggleHide(hide, rows, "where", false);
  const less = cardContent(BRAND, OFFER, hide);
  assert.equal(less.val, null);
  assert.equal(less.leaf, false);
  assert.deepEqual(less.rows.map((r) => r.k), ["Valid"]);
  // The locked headline can't be hidden.
  assert.deepEqual(toggleHide(hide, rows, "headline", false), hide);
  assert.deepEqual(toggleHide(hide, rows, "points", true), ["where"]);
});

test("TG: class Spots left can go off (sToggles) and reads '6 of 20 · off'", () => {
  const rows = toggleRows(CLASS, BRAND);
  assert.deepEqual(rows.map((r) => r.title), ["Class and time", "Duration", "Spots left"]);
  assert.equal(rows[0].sub, "Spin 45 · Sun 10:00 AM");
  const spots = rows.find((r) => r.key === "spots")!;
  assert.equal(toggleSub(spots, true), "6 of 20");
  assert.equal(toggleSub(spots, false), "6 of 20 · off");
  const off = cardContent(BRAND, CLASS, toggleHide([], rows, "spots", false));
  assert.deepEqual(off.rows.map((r) => r.k), ["When", "Duration"]);
  assert.equal(off.rows[0].v, "Sun, Oct 25 · 10:00 AM");
  assert.deepEqual(DEF_HIDE, {});
});

test("class: NEW CLASS for 14 days; no instructor before Release 2 (D-11)", () => {
  assert.ok(isNewClass("2026-10-19T09:00:00Z", NOW));
  assert.ok(!isNewClass("2026-10-07T09:00:00Z", NOW));
  assert.ok(!isNewClass(null, NOW));
  assert.ok(!isNewClass("2026-10-30T09:00:00Z", NOW));
  const c = cardContent(BRAND, CLASS, []);
  assert.ok(c.isNew);
  assert.equal(c.eyebrow, "Class spotlight");
  assert.ok(!c.rows.some((r) => r.k === "Instructor"));
  assert.equal(durationText("10:00", "10:45"), "45 min");
  assert.equal(durationText("18:30", "19:45"), "1 hr 15 min");
  assert.equal(durationText("09:00", "10:00"), "1 hr");
});

test("weekly schedule: Monday-first, this week only, cancelled left out, 12-hour times", () => {
  assert.deepEqual(weekOf("2026-10-22"), ["2026-10-19", "2026-10-25"]);
  assert.deepEqual(weekOf("2026-10-25"), ["2026-10-19", "2026-10-25"]);
  const w = weekSchedule(
    [
      { date: "2026-10-25", startTime: "10:00", title: "Spin 45" },
      { date: "2026-10-19", startTime: "18:30", title: "Spin 45" },
      { date: "2026-10-19", startTime: "07:00", title: "Mobility" },
      { date: "2026-10-21", startTime: "07:00", title: "Strength", cancelled: true },
      { date: "2026-10-26", startTime: "07:00", title: "Next week" },
    ],
    "2026-10-22",
  );
  assert.equal(w.count, 3);
  assert.deepEqual(w.days, [
    { d: "MON", items: [{ t: "7:00 AM", n: "Mobility" }, { t: "6:30 PM", n: "Spin 45" }] },
    { d: "SUN", items: [{ t: "10:00 AM", n: "Spin 45" }] },
  ]);
  const busy = weekSchedule(Array.from({ length: 6 }, (_, i) => ({ date: "2026-10-20", startTime: `0${i + 1}:00`, title: `C${i}` })), "2026-10-22");
  assert.equal(busy.days[0].items.length, 5);
  assert.deepEqual(busy.days[0].items[4], { t: "+2", n: "more" });
  const card = cardContent(BRAND, { t: "schedule", d: w }, []);
  assert.equal(card.title, "This week at Flex Fitness");
  assert.ok(card.small);
});

test("plan and links: membership, its unit and the /m/ link", () => {
  const d = planData({ id: "p1", name: "Monthly", price: "$45", billing: "monthly", kind: "membership", sessionsInPack: null, validForDays: null, includes: ["Gym floor", "lockers", " showers "] });
  assert.deepEqual(d, { id: "p1", name: "Monthly", price: "$45", unit: "a month", duration: "Monthly", includes: "Gym floor, lockers, showers" });
  const c = cardContent(BRAND, { t: "plan", d }, []);
  assert.equal(c.val, "$45");
  assert.deepEqual(c.rows.map((r) => r.k), ["Duration", "Includes"]);
  assert.equal(cardLink("flexfitness", { t: "plan", d }).href, "https://centium.atraxia.org/b/flexfitness/m/p1");
  assert.equal(cardLink("flexfitness", { t: "profile", d: { rating: null } }).text, "centium.atraxia.org/b/flexfitness");
  assert.equal(cardLink("flexfitness", CLASS).href, "https://centium.atraxia.org/b/flexfitness/c/c1");
  assert.equal(cardLink("flexfitness", OFFER).href, "https://centium.atraxia.org/b/flexfitness/o/o1");
});

test("B-SH.4 privacy: no card carries an Overview figure, member names or counts, client data or revenue", () => {
  const all: TemplateData[] = [
    CLASS,
    OFFER,
    { t: "profile", d: { rating: "4.8 · 212 reviews" } },
    { t: "product", d: { id: "i1", name: "Trail jacket", price: "$85", description: "Light.", imageUrl: null } },
    { t: "schedule", d: { days: [{ d: "MON", items: [{ t: "7:00 AM", n: "Mobility" }] }], count: 1 } },
  ];
  for (const d of all) {
    const c = cardContent(BRAND, d, []);
    const text = JSON.stringify(c) + JSON.stringify(toggleRows(d, BRAND));
    for (const f of PRIVATE_FIGURES) assert.ok(!text.includes(f), `${d.t} shows ${f}`);
    assert.ok(!/booked|members? reached|revenue|redemption/i.test(text), d.t);
  }
  const profile = cardContent(BRAND, { t: "profile", d: { rating: "4.8 · 212 reviews" } }, []);
  assert.deepEqual(profile.rows.map((r) => r.k), ["Category", "Location", "Rating"]);
});

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { checklistOrder, classFlag, daysLeft, dowTime, hoursSummary, pct, strengthItems, strengthLine, strengthPct, type StrengthInput } from "./model.ts";
import { promoText, validatePromo } from "./promoModel.ts";

const base: StrengthInput = {
  store: false,
  logo: false,
  cover: true,
  photos: 1,
  description: false,
  categories: ["Yoga"],
  address: "Beirut",
  hoursSummary: null,
  amenities: [],
  delivery: false,
  contact: false,
  firstVisit: false,
  returns: false,
  reviews: { average: null, count: 0 },
};

test("strength list: 11 items in the board's order, live subs", () => {
  const items = strengthItems(base);
  assert.equal(items.length, 11);
  assert.deepEqual(
    items.map((x) => x.key),
    ["logo", "cover", "photos", "description", "categories", "address", "hours", "amenities", "contact", "firstVisit", "reviews"]
  );
  assert.equal(items[2].sub, "1 of 6 · add 5 more");
  assert.equal(items[10].sub, "None yet");
  assert.equal(strengthItems({ ...base, store: true })[7].key, "delivery");
});

test("strength line and percent (MA1-001 5c, MA1-031)", () => {
  const items = strengthItems(base);
  assert.equal(strengthLine(items, "empty"), "Add 8 more items. Complete listings get more profile opens.");
  assert.equal(strengthLine(items.map((x) => ({ ...x, done: false })), "empty"), "empty");
  assert.equal(strengthLine(items.map((x) => ({ ...x, done: true })), "empty"), "Your listing is complete.");
  assert.equal(strengthPct(items.map((x, i) => ({ ...x, done: i < 8 }))), 73);
});

test("checklist: not done first in order, then done", () => {
  const order = checklistOrder(strengthItems(base)).map((x) => x.key);
  assert.equal(order[0], "logo");
  assert.deepEqual(order.slice(-3), ["cover", "categories", "address"]);
});

test("hours summary only when all seven days are published", () => {
  const row = (weekday: number, opens: string, closes: string) => ({ id: String(weekday), weekday, closed: false, open_24h: false, opens_at: opens, closes_at: closes });
  const week = [1, 2, 3, 4, 5].map((d) => row(d, "06:00:00", "21:00:00")).concat([row(6, "08:00:00", "14:00:00"), row(7, "08:00:00", "14:00:00")]);
  assert.equal(hoursSummary(week), "Mon to Fri 6:00 AM to 9:00 PM, weekends 8:00 AM to 2:00 PM");
  assert.equal(hoursSummary(week.slice(0, 6)), null);
});

test("days left counts today (MA1-118 row 1)", () => {
  assert.equal(daysLeft("2026-10-06", "2026-10-08"), "3 days left");
  assert.equal(daysLeft("2026-10-08", "2026-10-08"), "Last day");
});

test("percent: one decimal under 10%", () => {
  assert.equal(pct(8, 100), "8.0%");
  assert.equal(pct(41, 100), "41%");
});

test("class flags (MA1-003 7b)", () => {
  const H = 3_600_000;
  assert.equal(classFlag(16, 20, 10 * H, 11 * H, 0), "almost");
  assert.equal(classFlag(6, 14, 4 * H, 5 * H, 0), "low");
  assert.equal(classFlag(6, 14, 72 * H, 73 * H, 0), null);
  assert.equal(classFlag(6, 14, 0, H, 2 * H), "ended");
});

test("12-hour day and time", () => {
  assert.equal(dowTime("2026-10-05", "19:30"), "Mon 7:30 PM");
});

test("promotion texts and validation", () => {
  assert.equal(promoText("classes", "percent_off", 25).chip, "25% off");
  assert.equal(promoText("gym", "first_free", null).field, "First visit free");
  const e = validatePromo({ what: null, type: null, value: null, from: "2026-10-06", to: "2026-10-02", audience: "new" }, "Pick a class or offer to promote.");
  assert.equal(e.what, "Pick a class or offer to promote.");
  assert.equal(e.type, "Pick a promotion type.");
  assert.equal(e.to, "The end date must be after the start date.");
});

import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  daysLabel,
  parseSharedPlan,
  portionLabel,
  describeBookingError,
  describeCancelError,
  describeDescriptionError,
  descriptionToSend,
  parseCapacity,
  parsePlaces,
  placesAfter,
  placesBatches,
  placesLine,
  sessionAction,
  type SessionPlaces,
} from "./groupCardsModel";
import { BLOCKED_TEXT } from "../moderation/text";
import { OFFLINE_MESSAGE } from "../network-error";

const P = (o: Partial<SessionPlaces> = {}): SessionPlaces => ({
  messageId: "m1",
  eventId: "e1",
  capacity: 10,
  taken: 3,
  bookedByMe: false,
  bookable: true,
  isFree: true,
  ...o,
});
const NOW = Date.parse("2026-11-01T08:00:00Z");
const LATER = "2026-11-02T07:00:00Z";
const EARLIER = "2026-10-31T07:00:00Z";

test("parsePlaces reads the reader's rows by message id", () => {
  const out = parsePlaces([
    { message_id: "m1", event_id: "e1", capacity: 2, taken: "1", booked_by_me: true, bookable: true, is_free: true },
    { message_id: "m2", event_id: "e2", capacity: null, taken: 0, booked_by_me: false, bookable: false, is_free: false },
    { message_id: null, event_id: "e3" },
  ]);
  assert.deepEqual(Object.keys(out), ["m1", "m2"]);
  assert.deepEqual(out.m1, { messageId: "m1", eventId: "e1", capacity: 2, taken: 1, bookedByMe: true, bookable: true, isFree: true });
  assert.equal(out.m2.capacity, null);
  assert.equal(out.m2.isFree, false);
  assert.deepEqual(parsePlaces(null), {});
});

test("placesBatches keeps each call at 200 and drops repeats", () => {
  const ids = Array.from({ length: 450 }, (_, i) => `m${i}`);
  const b = placesBatches([...ids, "m0"]);
  assert.deepEqual(b.map((x) => x.length), [200, 200, 50]);
  assert.deepEqual(placesBatches([]), []);
});

test("placesLine: '{taken} of {capacity} places taken', nothing with no limit", () => {
  assert.equal(placesLine(P()), "3 of 10 places taken");
  assert.equal(placesLine(P({ capacity: 1, taken: 0 })), "0 of 1 place taken");
  assert.equal(placesLine(P({ capacity: null })), null);
  assert.equal(placesLine(null), null);
});

test("sessionAction: book, full, cancel, ask, none", () => {
  const o = { mine: false, startsAt: LATER, now: NOW };
  assert.deepEqual(sessionAction(P(), o), { kind: "book" });
  assert.deepEqual(sessionAction(P({ capacity: null }), o), { kind: "book" });
  assert.deepEqual(sessionAction(P({ taken: 10 }), o), { kind: "full", capacity: 10 });
  assert.deepEqual(sessionAction(P({ bookedByMe: true, taken: 10 }), o), { kind: "cancel" });
  assert.deepEqual(sessionAction(P({ isFree: false, bookable: false }), o), { kind: "ask" });
  // Their own session, an old card, a session that has started.
  assert.deepEqual(sessionAction(P(), { ...o, mine: true }), { kind: "none" });
  assert.deepEqual(sessionAction(null, o), { kind: "none" });
  assert.deepEqual(sessionAction(P({ bookable: false }), o), { kind: "none" });
  assert.deepEqual(sessionAction(P(), { ...o, startsAt: EARLIER }), { kind: "none" });
  assert.deepEqual(sessionAction(P({ bookedByMe: true }), { ...o, startsAt: EARLIER }), { kind: "booked" });
  assert.deepEqual(sessionAction(P({ isFree: false, bookable: false }), { ...o, startsAt: EARLIER }), { kind: "none" });
});

test("placesAfter moves the count with the booking", () => {
  assert.deepEqual(placesAfter(P(), true), P({ bookedByMe: true, taken: 4 }));
  assert.deepEqual(placesAfter(P({ bookedByMe: true, taken: 4 }), false), P({ taken: 3 }));
  assert.deepEqual(placesAfter(P({ bookedByMe: true }), true), P({ bookedByMe: true }));
  assert.equal(placesAfter(P({ bookedByMe: true, taken: 0 }), false).taken, 0);
});

test("booking refusals in words", () => {
  assert.equal(describeBookingError({ code: "ATXM0", message: "full" }, "Gia"), "This session is full.");
  assert.equal(describeBookingError({ code: "ATXM1", message: "paid" }, "Gia"), "This is a paid session. Ask Gia to book it.");
  assert.equal(describeBookingError({ code: "ATX10", message: "started" }, "Gia"), "This session has already started.");
  assert.match(describeBookingError({ code: "ATX02", message: "rate limit exceeded" }, "Gia"), /last hour/);
  assert.match(describeBookingError({ code: "429", message: "x" }, "Gia"), /last hour/);
  assert.equal(describeBookingError({ message: "Failed to fetch" }, "Gia"), OFFLINE_MESSAGE);
  assert.equal(describeBookingError({ code: "XX000", message: "boom" }, "Gia"), "Couldn't book a place. Try again.");
  assert.match(describeCancelError({ code: "ATX08", message: "none" }), /don't have a place/);
});

test("description: trimmed, '' clears, over 500 refused, ATX60 in our words", () => {
  assert.equal(descriptionToSend("  Early runs  "), "Early runs");
  assert.equal(descriptionToSend("   "), "");
  assert.equal(descriptionToSend("x".repeat(501)), null);
  assert.equal(describeDescriptionError({ code: "ATX60", message: "blocked" }), BLOCKED_TEXT);
  assert.match(describeDescriptionError({ code: "22023", message: "long" }), /500 characters/);
  assert.match(describeDescriptionError({ code: "ATX44", message: "owner" }), /host/);
});

test("daysLabel never says more than the plan's length", () => {
  assert.equal(daysLabel(7), "7 days");
  assert.equal(daysLabel(1), "1 day");
  assert.equal(daysLabel(0), null);
  assert.equal(daysLabel(null), null);
});

test("parseCapacity: empty is no limit, 1 to 500 otherwise", () => {
  assert.deepEqual(parseCapacity(""), { ok: true, value: null });
  assert.deepEqual(parseCapacity(" 12 "), { ok: true, value: 12 });
  assert.equal(parseCapacity("0").ok, false);
  assert.equal(parseCapacity("501").ok, false);
  assert.equal(parseCapacity("2.5").ok, false);
  assert.equal(parseCapacity("ten").ok, false);
});

test("a shared meal plan: grouped by day then meal, in the server's order; none is null", () => {
  assert.equal(parseSharedPlan([]), null);
  assert.equal(parseSharedPlan(null), null);
  const plan = parseSharedPlan([
    { meal_plan_id: "p1", plan_name: "Lean week", days_count: 7, day_index: 0, day_label: null, meal_slot: "breakfast", item_position: 0, item_kind: "recipe", item_id: "r1", name: "Overnight oats", grams: null, servings: "1", note: null },
    { meal_plan_id: "p1", plan_name: "Lean week", days_count: 7, day_index: 0, day_label: null, meal_slot: "breakfast", item_position: 1, item_kind: "food", item_id: "f1", name: "Banana", grams: "120", servings: null, note: "or a pear" },
    { meal_plan_id: "p1", plan_name: "Lean week", days_count: 7, day_index: 0, day_label: null, meal_slot: "dinner", item_position: 0, item_kind: "custom_meal", item_id: "m1", name: "Salmon bowl", grams: null, servings: 1.5, note: null },
    { meal_plan_id: "p1", plan_name: "Lean week", days_count: 7, day_index: 1, day_label: "Rest day", meal_slot: "lunch", item_position: 0, item_kind: "food", item_id: "f2", name: null, grams: null, servings: null, note: null },
  ]);
  assert.ok(plan);
  assert.equal(plan.name, "Lean week");
  assert.equal(plan.days, 7);
  assert.deepEqual(plan.dayList.map((d) => [d.label, d.meals.map((m) => [m.title, m.items.length])]), [
    ["Day 1", [["Breakfast", 2], ["Dinner", 1]]],
    ["Rest day", [["Lunch", 1]]],
  ]);
  assert.equal(plan.dayList[0].meals[0].items[1].note, "or a pear");
  assert.equal(plan.dayList[1].meals[0].items[0].name, "Removed item");
  assert.ok(!JSON.stringify(plan).match(/kcal|calorie|protein|carb|fat/i));
  // Round E: no playlist on the plan.
  assert.equal(plan.playlistUrl, null);
  const withMusic = parseSharedPlan([
    { meal_plan_id: "p2", plan_name: "Cook week", days_count: 1, day_index: 0, meal_slot: "lunch", name: "Soup", playlist_url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M", playlist_service: "spotify" },
  ]);
  assert.equal(withMusic?.playlistUrl, "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M");
});

test("a shared plan item's portion: grams first, then servings", () => {
  assert.equal(portionLabel({ grams: 120, servings: null }), "120 g");
  assert.equal(portionLabel({ grams: 120, servings: 2 }), "120 g");
  assert.equal(portionLabel({ grams: null, servings: 1 }), "1 serving");
  assert.equal(portionLabel({ grams: null, servings: 1.5 }), "1.5 servings");
  assert.equal(portionLabel({ grams: 0, servings: null }), null);
});

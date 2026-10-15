import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  AMENITIES,
  AMENITIES_MORE,
  amenityKeysOf,
  businessTypeFor,
  copyMondayToWeekdays,
  dbCategories,
  defaultEssentials,
  defaultHours,
  essentialsErrors,
  fmt12,
  hoursSummary,
  instagramHandle,
  laneForBusinessType,
  phoneValid,
  policyDocs,
  switchPopup,
  visibleCategoryChips,
  whereErrors,
  yourBusinessErrors,
} from "./lanes.ts";
import { docsFor, emptyBusinessDraft, hasTypeAnswers, mirrorFields, withLane } from "./draft.ts";

test("Classes is stored as studio (D8); a store stores its sub-type", () => {
  assert.equal(businessTypeFor("classes", null), "studio");
  assert.equal(businessTypeFor("gym", null), "gym");
  assert.equal(businessTypeFor("store", "supplement_store"), "supplement_store");
  assert.equal(laneForBusinessType("studio"), "classes");
  assert.equal(laneForBusinessType("meal_prep_service"), "store");
});

test("categories map onto the closed set, the type first, at most five, no repeats", () => {
  assert.deepEqual(dbCategories("studio", ["Yoga", "Pilates", "Barre"]), ["studio", "yoga", "pilates"]);
  assert.deepEqual(dbCategories("supplement_store", ["Protein", "Vitamins and minerals", "Recovery"]), ["supplements", "recovery"]);
  assert.equal(dbCategories("gym", ["Strength", "HIIT", "Spin", "Boxing", "CrossFit", "Swimming"]).length <= 5, true);
});

test("Your business: cover, name, phone with a country code, a valid email", () => {
  const e = yourBusinessErrors({ coverPath: null, name: " ", phone: "01 350", email: "x", instagram: "" });
  assert.deepEqual(Object.keys(e).sort(), ["cover", "email", "name", "phone"]);
  assert.equal(e.phone, "Add the country code, like +000 00 000 000.");
  assert.equal(phoneValid("+961 70 123 456"), true);
  assert.equal(instagramHandle("@studio.one"), "studio.one");
  assert.deepEqual(yourBusinessErrors({ coverPath: "u/c.jpg", name: "Studio One", phone: "+961 70 123 456", email: "a@b.co", instagram: "@studioone" }), {});
});

test("the chips show the first options, then any picked from More", () => {
  assert.deepEqual(visibleCategoryChips(["a", "b", "c", "d"], 2, ["d"]), ["a", "b", "d"]);
});

test("hours: drawn defaults, Copy Monday, 12-hour labels and the review line", () => {
  const gym = defaultHours("gym");
  assert.equal(gym[6].open, false);
  assert.equal(defaultHours("classes")[6].open, true);
  assert.equal(fmt12("06:00"), "6:00 AM");
  assert.equal(fmt12("21:00"), "9:00 PM");
  assert.equal(hoursSummary(gym), "Mon to Fri 6:00 AM to 9:00 PM");
  const changed = gym.map((h) => (h.weekday === 1 ? { ...h, opens: "07:00" } : h));
  assert.equal(copyMondayToWeekdays(changed)[4].opens, "07:00");
  assert.equal(copyMondayToWeekdays(changed)[5].opens, "08:00");
});

test("Where and when needs an address, the pin and one open day", () => {
  const closed = defaultHours("store").map((h) => ({ ...h, open: false }));
  assert.deepEqual(Object.keys(whereErrors({ address: "", lat: null, lng: null }, closed)), ["address", "hours"]);
  assert.deepEqual(whereErrors({ address: "45 Market Street", lat: 33.9, lng: 35.5 }, defaultHours("store")), {});
});

test("essentials: amenities required for a gym (V6-132), a store sells or offers appointments", () => {
  assert.equal(essentialsErrors("gym", defaultEssentials("gym", null), []).length, 1);
  const st = { ...defaultEssentials("store", "store"), sellsProducts: false, offersAppointments: false };
  assert.ok(essentialsErrors("store", st, ["Protein"]).includes("Turn on Sells products or Offers appointments."));
  assert.equal(defaultEssentials("store", "wellness_service").offersAppointments, true);
});

test("policy templates follow the answers; delivery terms only when delivering", () => {
  const e = { ...defaultEssentials("classes", null), cancelHours: 24 as const };
  assert.ok(policyDocs("classes", null, e)[1].lines.includes("• Cancel free until 24 hours before class."));
  const d = { ...withLane(emptyBusinessDraft(), "store", "supplement_store") };
  assert.deepEqual(docsFor(d).map((x) => x.kind), ["returns"]);
  const withDelivery = { ...d, essentials: { ...d.essentials, delivery: true, deliveryFee: "3", freeOver: "50" } };
  assert.ok(docsFor(withDelivery)[1].lines.includes("• Delivery is $3, free over $50."));
});

test("amenities: the chip labels become amenity_vocabulary() keys; unknown labels are left out", () => {
  assert.deepEqual(amenityKeysOf(["Pool", "Wi-Fi", "Café", "Accessible entrance", "Drinking water", "Changing rooms"]), ["pool", "wifi", "cafe", "accessible", "water", "changing_rooms"]);
  assert.deepEqual(amenityKeysOf(["Steam room", "Juice bar", "Pool", "Pool"]), ["pool"]);
  for (const l of [...AMENITIES, ...AMENITIES_MORE]) assert.equal(amenityKeysOf([l]).length, 1, l);
});

test("switching type keeps the basics and clears the type answers", () => {
  const g = { ...withLane(emptyBusinessDraft(), "gym", null), name: "Northside", essentials: { ...defaultEssentials("gym", null), amenities: ["Pool"] } };
  const c = withLane(g, "classes", null);
  assert.equal(c.name, "Northside");
  assert.deepEqual(c.essentials.amenities, []);
  assert.equal(switchPopup("gym", "classes").title, "Switch to Classes?");
  assert.deepEqual(mirrorFields({ ...c, businessId: "x" }), { businessName: "Northside", businessType: "studio", businessId: "x" });
});

test("the switch pop-up asks once a step is continued or categories are picked", () => {
  const d = withLane(emptyBusinessDraft(), "gym", null);
  assert.equal(hasTypeAnswers(d), false);
  assert.equal(hasTypeAnswers({ ...d, categories: ["Strength"] }), true);
  assert.equal(hasTypeAnswers({ ...d, reached: "business" }), true);
});

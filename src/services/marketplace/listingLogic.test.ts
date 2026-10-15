import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  AMENITY_KEYS,
  AMENITY_LABELS,
  createSessionGate,
  exploreSource,
  featuredFirst,
  firstVisitText,
  heroPhotos,
  isLivePassState,
  knownAmenities,
  listingEventKey,
  parseListingSource,
  viewerSpotsLeft,
} from "./listingLogic";

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

test("the dedupe key is business + item + kind, not the source", () => {
  assert.equal(listingEventKey({ businessId: "b", kind: "impression", itemId: "c" }), "b|c|impression");
  assert.equal(listingEventKey({ businessId: "b", kind: "profile_open" }), "b||profile_open");
  assert.equal(listingEventKey({ businessId: "b", kind: "profile_open", itemId: null }), "b||profile_open");
  assert.notEqual(listingEventKey({ businessId: "b", kind: "impression" }), listingEventKey({ businessId: "b", kind: "book_tap" }));
});

test("the source: search beats featured beats the list's category", () => {
  assert.equal(exploreSource({ query: "yoga", featured: true }), "search");
  assert.equal(exploreSource({ query: "   ", featured: true }), "featured");
  assert.equal(exploreSource({ featured: false }), "category");
  assert.equal(exploreSource({}), "category");
});

test("a venue page's src param: only the five sources, else direct", () => {
  for (const s of ["search", "category", "map", "direct", "featured"]) assert.equal(parseListingSource(s), s);
  assert.equal(parseListingSource(null), "direct");
  assert.equal(parseListingSource("booking"), "direct");
  assert.equal(parseListingSource(""), "direct");
});

test("featured first is a stable partition", () => {
  const rows = [
    { id: 1, f: false },
    { id: 2, f: true },
    { id: 3, f: false },
    { id: 4, f: true },
  ];
  assert.deepEqual(
    featuredFirst(rows, (r) => r.f).map((r) => r.id),
    [2, 4, 1, 3]
  );
  assert.deepEqual(featuredFirst([], () => true), []);
});

test("spots left: members ignore the Centium limit, null means no separate limit", () => {
  assert.equal(viewerSpotsLeft(8, null, false), 8);
  assert.equal(viewerSpotsLeft(8, undefined, false), 8);
  assert.equal(viewerSpotsLeft(8, 3, false), 3);
  assert.equal(viewerSpotsLeft(2, 3, false), 2);
  assert.equal(viewerSpotsLeft(8, 0, false), 0);
  assert.equal(viewerSpotsLeft(8, 0, true), 8);
  assert.equal(viewerSpotsLeft(-1, 4, false), 0);
});

test("a live pass is valid, awaiting payment or upcoming", () => {
  assert.ok(isLivePassState("valid"));
  assert.ok(isLivePassState("awaiting_payment"));
  assert.ok(isLivePassState("upcoming"));
  for (const s of ["expired", "cancelled", "refunded", "unknown"]) assert.ok(!isLivePassState(s));
});

test("amenities: the vocabulary's order, unknown keys dropped, each labelled", () => {
  assert.equal(AMENITY_KEYS.length, 12);
  for (const k of AMENITY_KEYS) assert.ok(AMENITY_LABELS[k]);
  assert.deepEqual(knownAmenities(["wifi", "showers", "jacuzzi", "wifi"]), ["showers", "wifi"]);
  assert.deepEqual(knownAmenities(null), []);
  assert.equal(AMENITY_LABELS.accessible, "Wheelchair access");
  assert.equal(AMENITY_LABELS.childcare, "Child care");
});

test("first visit text is trimmed, empty is none", () => {
  assert.equal(firstVisitText("  Ask at the desk  "), "Ask at the desk");
  assert.equal(firstVisitText("   "), null);
  assert.equal(firstVisitText(null), null);
});

test("hero photos: the cover first, then photos by position, no repeats", () => {
  assert.deepEqual(
    heroPhotos("c", [
      { url: "b", position: 2 },
      { url: "a", position: 1 },
      { url: "c", position: 0 },
    ]),
    ["c", "a", "b"]
  );
  assert.deepEqual(heroPhotos(null, [{ url: "a", position: 0 }]), ["a"]);
  assert.deepEqual(heroPhotos(null, []), []);
});

test("the session gate lets each key through once, survives a reload and a broken store", () => {
  const store = fakeStorage();
  const g = createSessionGate(store);
  assert.ok(g.first("k1"));
  assert.ok(!g.first("k1"));
  assert.ok(g.first("k2"));
  const again = createSessionGate(store);
  assert.ok(!again.first("k1"));
  assert.ok(again.has("k2"));

  const broken = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  const g2 = createSessionGate(broken);
  assert.ok(g2.first("x"));
  assert.ok(!g2.first("x"));

  const g3 = createSessionGate(null, "k", 2);
  assert.ok(g3.first("a"));
  assert.ok(g3.first("b"));
  assert.ok(g3.first("c"));
  assert.ok(!g3.has("a"));
});

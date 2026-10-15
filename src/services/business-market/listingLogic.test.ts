import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  AMENITY_KEYS,
  amenityLine,
  centiumSpotsFor,
  cleanAmenities,
  cleanFirstVisit,
  funnelLine,
  funnelStages,
  moveId,
  moveTo,
  newClientsTotal,
  openOnCentium,
  ownsObject,
  parseFunnel,
  parsePerfWeek,
  parseStrength,
  parseTopItem,
  pctOf,
  perfLine,
  photoCounts,
  photoError,
  photoLine,
  photoObjectPath,
  sortPhotos,
  summarize,
  topBooked,
  type BusinessPhoto,
  type PerfWeek,
} from "./listingLogic.ts";

test("amenities: the server's twelve keys, in vocabulary order, unknown keys dropped", () => {
  assert.deepEqual(AMENITY_KEYS, ["showers", "lockers", "changing_rooms", "towels", "parking", "wifi", "water", "cafe", "sauna", "pool", "childcare", "accessible"]);
  assert.deepEqual(cleanAmenities(["pool", "spa", "showers", "pool"]), ["showers", "pool"]);
  assert.equal(amenityLine(["accessible", "wifi"]), "Wi-Fi, Wheelchair access");
});

test("first visit: trimmed, at most 300, blank is null", () => {
  assert.equal(cleanFirstVisit("   "), null);
  assert.equal(cleanFirstVisit("  Bring a towel "), "Bring a towel");
  assert.equal(cleanFirstVisit("x".repeat(310))?.length, 300);
});

test("listing_strength rows become done flags", () => {
  const s = parseStrength([
    { item: "photos", done: false },
    { item: "amenities", done: true },
    { item: "first_visit", done: null },
  ]);
  assert.deepEqual(s, { photos: false, amenities: true, first_visit: false });
});

const ph = (id: string, position: number, status: BusinessPhoto["status"]): BusinessPhoto => ({ id, gymId: null, path: `u/b/${id}.jpg`, url: id, caption: null, position, status, rejectReason: null });

test("photos: position order, counts, line", () => {
  const list = sortPhotos([ph("b", 2, "approved"), ph("a", 0, "in_review"), ph("c", 1, "rejected")]);
  assert.deepEqual(list.map((p) => p.id), ["a", "c", "b"]);
  assert.deepEqual(photoCounts(list), { approved: 1, inReview: 1, rejected: 1, total: 3 });
  assert.equal(photoLine(0, 0), "No photos yet. Add at least 6 of your real space.");
  assert.equal(photoLine(4, 1), "4 of 6 recommended · 1 in review");
  assert.equal(photoLine(2, 0), "2 of 6 recommended");
});

test("photos: move one step, drag to an index, edges unchanged", () => {
  assert.deepEqual(moveId(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
  assert.deepEqual(moveId(["a", "b", "c"], "c", 1), ["a", "b", "c"]);
  assert.deepEqual(moveTo(["a", "b", "c", "d"], "a", 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moveTo(["a", "b"], "x", 0), ["a", "b"]);
});

test("photos: the bucket path and who may remove an object", () => {
  assert.equal(photoObjectPath("u1", "b1", "f.jpg"), "u1/b1/f.jpg");
  assert.equal(ownsObject("u1/b1/f.jpg", "u1"), true);
  assert.equal(ownsObject("u2/b1/f.jpg", "u1"), false);
  assert.match(photoError("ATXF5"), /20 photos/);
});

const wk = (impressions: number, extra: Partial<PerfWeek> = {}): PerfWeek => ({ weekStart: "2026-10-12", impressions, profileOpens: 0, mapOpens: 0, bookTaps: 0, bookings: 0, orders: 0, passes: 0, ...extra });

test("performance: empty, early and totals per type", () => {
  const none = summarize(Array.from({ length: 12 }, () => wk(0)), "classes");
  assert.equal(none.empty, true);
  const early = summarize([...Array.from({ length: 11 }, () => wk(0)), wk(5, { bookings: 1 })], "classes");
  assert.deepEqual([early.empty, early.early, early.views, early.done], [false, true, 5, 1]);
  const weeks = [wk(10, { profileOpens: 2, mapOpens: 1, bookings: 1, passes: 3, orders: 4 }), ...Array.from({ length: 10 }, () => wk(0)), wk(20, { bookings: 2 })];
  const s = summarize(weeks, "gym");
  assert.deepEqual([s.early, s.views, s.taps, s.done], [false, 30, 3, 3]);
  assert.equal(summarize(weeks, "store").done, 4);
  assert.equal(summarize(weeks, "classes").done, 3);
});

test("performance: the reader rows parse with numbers", () => {
  assert.deepEqual(parsePerfWeek({ week_start: "2026-10-12", impressions: "3", profile_opens: 1, map_opens: null, book_taps: 0, bookings: 2, orders: 0, passes: 0 }), {
    weekStart: "2026-10-12",
    impressions: 3,
    profileOpens: 1,
    mapOpens: 0,
    bookTaps: 0,
    bookings: 2,
    orders: 0,
    passes: 0,
  });
  const f = parseFunnel({ seen: 100, opened: 25, tapped_book: 8, booked: 5, by_source: { search: 60, map: 40, bogus: 3 } });
  assert.deepEqual(f.bySource, { search: 60, map: 40 });
  assert.equal(parseTopItem({ item_id: "x", item_kind: "nope", title: " ", impressions: 1, book_taps: 0, bookings: 0 }).kind, "other");
});

test("performance: lines, top item and percent format", () => {
  assert.equal(pctOf(8, 100), "8.0%");
  assert.equal(pctOf(25, 100), "25%");
  const top = topBooked([parseTopItem({ item_id: "a", item_kind: "class", title: "Yoga", impressions: 9, bookings: 1 }), parseTopItem({ item_id: "b", item_kind: "class", title: "Spin 45", impressions: 3, bookings: 4 })]);
  assert.equal(top?.title, "Spin 45");
  assert.equal(topBooked([parseTopItem({ item_id: "a", title: "Yoga", impressions: 9, bookings: 0 })]), null);
  const s = summarize([wk(9, { bookings: 2 }), ...Array.from({ length: 11 }, () => wk(1))], "classes");
  assert.equal(perfLine(s, top, "classes", "clients"), "Bookings from Centium this period. Spin 45 brings the most.");
  assert.equal(perfLine(s, top, "store", "customers"), "Orders from Centium this period. Spin 45 leads.");
  assert.equal(perfLine(summarize([], "classes"), null, "classes", "clients"), "Numbers start once clients see your listing.");
});

test("funnel: three stages, conversion, source split on the first only", () => {
  const f = parseFunnel({ seen: 200, opened: 50, tapped_book: 20, booked: 10, by_source: { search: 120, map: 80 } });
  const st = funnelStages(f, ["Seen in results", "Profile opened", "Booked", "Joined"], null);
  assert.equal(st.length, 3);
  assert.deepEqual(st.map((x) => x.v), [200, 50, 10]);
  assert.equal(st[1].conv, "25% go on to profile opened");
  assert.equal(st[2].w, 14);
  assert.deepEqual(st[0].segs?.map((x) => x.source), ["search", "map"]);
  assert.equal(st[1].segs, null);
  assert.equal(funnelStages(f, ["a", "b", "c"], "map")[0].v, 80);
  assert.equal(funnelLine(f, null, "empty", "bookings"), "Search brings the most views. 5.0% of views became bookings.");
  assert.equal(funnelLine(f, "map", "empty", "bookings"), "Map: 40% of your views came from here.");
  assert.equal(funnelLine(parseFunnel(null), null, "empty", "bookings"), "empty");
  assert.equal(newClientsTotal([{ weekStart: "a", n: 2 }, { weekStart: "b", n: 3 }]), 5);
});

test("centium spots: open now and what to store", () => {
  assert.equal(openOnCentium(20, 16, null, 0), 4);
  assert.equal(openOnCentium(20, 10, 4, 1), 3);
  assert.equal(openOnCentium(20, 18, 6, 1), 2);
  assert.equal(openOnCentium(20, 10, 2, 5), 0);
  assert.equal(centiumSpotsFor(4, 2), 6);
});

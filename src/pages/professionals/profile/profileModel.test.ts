import { test } from "node:test";
import assert from "node:assert/strict";
import {
  averageOf,
  dayChip,
  fromPriceText,
  hitCard,
  listingCard,
  listingFromPrice,
  matchesQuery,
  profileRatingLine,
  reviewLines,
  serviceRows,
  sessionWhen,
  shownRating,
  socialLinks,
  summaryFigure,
  summaryLine,
  weekTitle,
} from "./profileModel.ts";

const listing = {
  profileId: "p1",
  name: "Rami",
  avatarUrl: null,
  specialty: null,
  headline: "Strength coach",
  location: "Beirut",
  skills: ["Kettlebells"],
  monthlyRate: 120,
  consultationRate: 35,
  averageRating: 4.75,
  reviewCount: 4,
};

test("From price: the lower of the session and monthly rates, else none", () => {
  assert.equal(listingFromPrice(listing), 35);
  assert.equal(listingFromPrice({ monthlyRate: 90, consultationRate: null }), 90);
  assert.equal(listingFromPrice({ monthlyRate: 0, consultationRate: null }), null);
  assert.equal(fromPriceText(15), "From $15");
  assert.equal(fromPriceText(15.5), "From $15.50");
  assert.equal(fromPriceText(null), null);
});

test("rating is New until three reviews count (live rule)", () => {
  assert.equal(shownRating(4.75, 4), 4.8);
  assert.equal(shownRating(5, 2), null);
  assert.equal(shownRating(null, 0), null);
});

test("a live listing becomes the shared card (no hired count, specialty fallback)", () => {
  const c = listingCard(listing, "Coach");
  assert.equal(c.specialty, "Strength coach");
  assert.equal(c.rating, 4.8);
  assert.equal(c.hiredViaCentiumCount, 0);
  assert.equal(c.area, "Beirut");
  assert.equal(c.fromPrice, "From $35");
  assert.equal(listingCard({ ...listing, headline: null }, "Coach").specialty, "Coach");
  assert.equal(listingCard(listing, "Coach", "about 3 km away").area, "about 3 km away");
  // No contact field ever reaches the card.
  assert.deepEqual(Object.keys(c).sort(), ["area", "fromPrice", "hiredViaCentiumCount", "id", "name", "photoUrl", "rating", "reviewCount", "specialty"]);
});

test("a ranked hit keeps its rank and gets From $X", () => {
  const c = hitCard({ id: "x", name: "Joe", photoUrl: null, specialty: "HIIT", rating: null, reviewCount: 0, hiredViaCentiumCount: 0, distanceKm: 4, rank: 3, fromPriceValue: 30, score: 0.61 });
  assert.equal(c.fromPrice, "From $30");
  assert.equal(c.rating, null);
});

test("search matches name, specialty, headline, area and skills, every word", () => {
  assert.ok(matchesQuery(listing, "rami"));
  assert.ok(matchesQuery(listing, "kettle beirut"));
  assert.ok(matchesQuery(listing, "  "));
  assert.ok(!matchesQuery(listing, "yoga"));
});

test("header rating line", () => {
  assert.equal(profileRatingLine(4.84, 38, "Hamra, Beirut"), "4.8 · 38 reviews · Hamra, Beirut");
  assert.equal(profileRatingLine(null, 0, "Badaro, Beirut"), "New · no reviews yet · Badaro, Beirut");
  assert.equal(profileRatingLine(5, 2, null), "New · 2 reviews");
});

test("services: Book rows then Hire rows", () => {
  const rows = serviceRows([{ id: "s", name: "1:1", meta: "60 min · In person", price: "$35" }], [{ id: "p", name: "Pack", meta: null, price: "$120/mo" }]);
  assert.deepEqual(rows.map((r) => [r.kind, r.key]), [["book", "b:s"], ["hire", "h:p"]]);
});

test("social links: safe handles only, as https links (D-27, connected clients only)", () => {
  assert.deepEqual(socialLinks(null), []);
  const l = socialLinks({ instagram: "@rana.rides", facebook: "https://www.facebook.com/rana.k/", x: "https://twitter.com/rana_k?s=1" });
  assert.deepEqual(l.map((s) => [s.kind, s.text, s.href]), [
    ["instagram", "@rana.rides", "https://www.instagram.com/rana.rides"],
    ["facebook", "rana.k", "https://www.facebook.com/rana.k"],
    ["x", "@rana_k", "https://x.com/rana_k"],
  ]);
  assert.deepEqual(socialLinks({ instagram: "javascript:alert(1)", x: "  " }), []);
});

test("review lines: client and class reviews newest first, removed ones left out", () => {
  const lines = reviewLines(
    [
      { id: "a", rating: 5, body: "Great", createdAt: "2026-10-01T10:00:00Z", redactedAt: null, reviewerName: null },
      { id: "b", rating: 1, body: null, createdAt: "2026-10-05T10:00:00Z", redactedAt: "2026-10-06T00:00:00Z", reviewerName: "Z" },
      { id: "me", rating: 4, body: "", createdAt: "2026-09-01T10:00:00Z", redactedAt: null, reviewerName: "Karim" },
    ],
    [{ id: "k", reviewerName: "Maya K.", rating: 5, text: "Clear cues", createdAt: "2026-10-09T18:00:00Z", className: "Spin 45", businessName: "Hamra Strength Club" }],
    "me",
  );
  assert.deepEqual(lines.map((l) => [l.who, l.when, l.context, l.text]), [
    ["Maya K.", "Oct 9, 2026", "Spin 45 · Hamra Strength Club", "Clear cues"],
    ["A client", "Oct 1, 2026", null, "Great"],
    ["You", "Sep 1, 2026", null, null],
  ]);
});

test("review summary", () => {
  assert.equal(summaryFigure(4.83, 38), "4.8");
  assert.equal(summaryFigure(5, 1), "New");
  assert.equal(summaryLine(38, true), "38 reviews from class clients");
  assert.equal(summaryLine(1, false), "1 review");
  assert.equal(averageOf([5, 5, 4]), 4.7);
  assert.equal(averageOf([]), null);
});

test("booking labels are 12-hour and month first", () => {
  assert.equal(dayChip("2026-10-19"), "Mon 19");
  const at = new Date(2026, 9, 19, 7, 0).toISOString();
  assert.equal(sessionWhen(at), "Mon, Oct 19 · 7:00 AM");
  assert.equal(sessionWhen(at, ", "), "Mon, Oct 19, 7:00 AM");
  assert.equal(weekTitle([new Date(2026, 9, 19), new Date(2026, 9, 25)]), "Oct 19 to Oct 25");
});

test("type label for a listing without a specialty", async () => {
  const { typeLabel } = await import("./profileModel.ts");
  assert.equal(typeLabel("trainer"), "Personal trainer");
  assert.equal(typeLabel("coach_instructor"), "Coach or instructor");
  assert.equal(typeLabel(null), "Professional");
});

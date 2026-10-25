import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { REVIEWS, type Review } from "./reviews.ts";
import { RV_GAP, reviewCopies, reviewTone, rowCovers, starCount } from "../marketing/landing/sections/reviewsRow.ts";

// Centium landing v29, batch 3: the reviews row works with any number of
// reviews from 3 upwards (Karim edits src/content/reviews.ts only). The row
// repeats the list; these check that the repeats always cover the screen,
// at the card widths the handover uses (380px desktop, 290px phone).

const sample = (n: number): Review[] =>
  Array.from({ length: n }, (_, i) => ({ quote: "Quote " + i, name: "Name " + i, role: "Client", rating: 5, initials: "N" + i }));

describe("reviews content", () => {
  it("ships at least 3 well-formed reviews", () => {
    assert.ok(REVIEWS.length >= 3);
    for (const r of REVIEWS) {
      assert.ok(r.quote.trim() && r.name.trim() && r.role.trim(), r.name);
      assert.ok(Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5, r.name);
      assert.match(r.initials, /^[A-Z]{1,2}$/, r.name);
    }
  });
});

describe("the reviews row with 3, 5, 8 and 12 reviews", () => {
  const widths: [number, number][] = [
    [380, 1440],
    [380, 1280],
    [380, 2560],
    [380, 3840],
    [290, 390],
    [290, 360],
    [290, 430],
    [290, 1023],
  ];
  for (const n of [3, 5, 8, 12]) {
    it(n + " reviews cover the screen at every point of the loop", () => {
      const list = sample(n);
      for (const [card, vw] of widths) {
        const copies = reviewCopies(list.length, card, vw, false);
        assert.ok(copies >= 3, "never fewer copies than the prototype's 3");
        assert.ok(rowCovers(list.length, card, vw, copies), `${n} reviews, ${card}px cards, ${vw}px screen: ${copies} copies`);
      }
    });
  }

  it("uses the prototype's 3 copies where they already cover (8 reviews at 1440)", () => {
    assert.equal(reviewCopies(8, 380, 1440, false), 3);
    assert.equal(RV_GAP, 18);
  });

  it("adds copies for a short list on a wide screen (3 reviews at 2560)", () => {
    // One period is 3 x 398 = 1194px; 3 copies would leave a gap after the first slid out.
    assert.equal(rowCovers(3, 380, 2560, 3), false);
    assert.ok(reviewCopies(3, 380, 2560, false) > 3);
  });

  it("renders one copy under reduced motion (the row scrolls by hand)", () => {
    for (const n of [3, 5, 12]) assert.equal(reviewCopies(n, 380, 1440, true), 1);
  });

  it("alternates lavender and teal, and clamps ratings to whole stars", () => {
    assert.deepEqual(reviewTone(0), { bg: "#DED4F4", ink: "#5C48A8", star: "#9C7FF8" });
    assert.deepEqual(reviewTone(1), { bg: "#DAEAE7", ink: "#3F726D", star: "#5E9E95" });
    assert.deepEqual(reviewTone(12), reviewTone(0));
    assert.equal(starCount(5), 5);
    assert.equal(starCount(0), 1);
    assert.equal(starCount(9), 5);
    assert.equal(starCount(3.6), 4);
  });
});

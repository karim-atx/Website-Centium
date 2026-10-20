// Release 3 W6: the profile screens' pure parts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  averageOf,
  filterReviews,
  licenceFacts,
  monthYear,
  pairStacks,
  parsePriceInput,
  planLine,
  planPrice,
  priceLabel,
  profileUrl,
  radiusFill,
  sessionLine,
  wordCount,
  workTabOf,
  yearsOfExperience,
} from "./profileModel.ts";
type Licence = { id: string; name: string | null; issuingBody: string | null; issued: string | null; expires: string | null; noExpiry: boolean; credentialId: string | null; credentialUrl: string | null; documentPath: string | null; showWhenExpired: boolean; position: number; mirrorsCertification: boolean; publishedAt: string | null };
type LicenceReviewRow = Parameters<typeof licenceFacts>[1][number];

const lic = (id: string, doc: string | null): Licence => ({
  id,
  name: "Licence " + id,
  issuingBody: null,
  issued: null,
  expires: null,
  noExpiry: true,
  credentialId: null,
  credentialUrl: null,
  documentPath: doc,
  showWhenExpired: false,
  position: 0,
  mirrorsCertification: false,
  publishedAt: null,
});
const review = (licenceId: string, doc: string, approvedAt: string | null): LicenceReviewRow => ({
  id: licenceId + approvedAt,
  licenceId,
  documentPath: doc,
  submittedAt: "2026-01-01T00:00:00Z",
  approvedAt,
  rejectedAt: null,
  rejectionReason: null,
});

test("profile url is on /p/", () => {
  assert.equal(profileUrl("rami.coach"), "centium.app/p/rami.coach");
});

test("counts words", () => {
  assert.equal(wordCount(null), 0);
  assert.equal(wordCount("  I help busy people  get strong "), 6);
});

test("years of experience count overlaps once", () => {
  assert.equal(yearsOfExperience([{ start: "2015-01", end: "2018-01" }, { start: "2017-01", end: null }], "2026-01"), 11);
  assert.equal(yearsOfExperience([{ start: "2020-01", end: "2020-06" }], "2026-01"), 0);
  assert.equal(yearsOfExperience([], "2026-01"), 0);
});

test("licence facts pick the verified licence and its approval date", () => {
  const a = lic("a", "p/a.pdf");
  const b = lic("b", "p/b.pdf");
  const f = licenceFacts([a, b], [review("b", "p/b.pdf", "2026-03-03T10:00:00Z"), review("a", "p/old.pdf", "2025-01-01T00:00:00Z")]);
  assert.equal(f.primary?.id, "b");
  assert.equal(f.verified, true);
  assert.equal(f.verifiedAt, "2026-03-03T10:00:00Z");
  const none = licenceFacts([a], []);
  assert.equal(none.verified, false);
  assert.equal(none.status?.kind, "pending");
  assert.equal(licenceFacts([], []).primary, null);
});

test("months format as the frames write them", () => {
  assert.equal(monthYear("2028-03"), "Mar 2028");
  assert.equal(monthYear(null), null);
});

test("four work tabs map onto three values", () => {
  assert.equal(workTabOf("in_person", false), "independent");
  assert.equal(workTabOf("in_person", true), "business");
  assert.equal(workTabOf("online", true), "online");
  assert.equal(workTabOf("both", false), "mix");
  assert.equal(workTabOf(null, false), null);
});

test("radius bar fills 40% at 10 km", () => {
  assert.ok(Math.abs(radiusFill(10) - 0.4) < 1e-9);
  assert.equal(radiusFill(30), 1);
  assert.equal(radiusFill(null), 0);
});

test("prices and lines", () => {
  assert.equal(priceLabel(0), "Free");
  assert.equal(priceLabel(60), "$60");
  assert.equal(planPrice(120, "monthly"), "$120/mo");
  assert.equal(planPrice(0, "monthly"), "Free");
  assert.equal(planLine([], 10), "10 sessions");
  assert.equal(planLine([], 1), "1 session");
  assert.equal(planLine(["Programme", "Weekly check-in", "Chat"], 8), "8 sessions · Programme");
  assert.equal(planLine(["Programme", "check-ins"], null), "Programme · check-ins");
  assert.equal(sessionLine(60, null), "60 min · In person or online");
  assert.equal(sessionLine(20, "online"), "20 min · Online");
});

test("typed prices", () => {
  assert.equal(parsePriceInput(""), 0);
  assert.equal(parsePriceInput("Free"), 0);
  assert.equal(parsePriceInput("$45"), 45);
  assert.equal(parsePriceInput("12.5"), 12.5);
  assert.equal(parsePriceInput("abc"), null);
});

test("Hire and Book a session stack at 360 and with Larger text", () => {
  assert.equal(pairStacks(360), true);
  assert.equal(pairStacks(390), false);
  assert.equal(pairStacks(430), false);
  assert.equal(pairStacks(430, true), true);
});

test("reviews filter and average", () => {
  const rows = [
    { rating: 5, redactedAt: null, reply: null },
    { rating: 4, redactedAt: null, reply: { body: "x" } },
    { rating: 1, redactedAt: "2026-01-01", reply: null },
  ];
  assert.equal(filterReviews(rows, "needs").length, 1);
  assert.equal(filterReviews(rows, "replied").length, 1);
  assert.equal(filterReviews(rows, "all").length, 3);
  assert.equal(averageOf(rows), 4.5);
  assert.equal(averageOf([]), null);
});

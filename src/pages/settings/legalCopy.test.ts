import test from "node:test";
import assert from "node:assert/strict";
import { legalHref, legalSlug, PRIVACY_SECTIONS, TERMS_SECTIONS } from "./legalCopy";

test("legalSlug: the website's slug rule (BR-11)", () => {
  assert.equal(legalSlug("How it's used and shared"), "how-it-s-used-and-shared");
  assert.equal(legalSlug("Referral, rewards and ambassador program"), "referral-rewards-and-ambassador-program");
  assert.equal(legalSlug("Children's data"), "children-s-data");
});

test("legalHref: headings deep-link to their section on /legal", () => {
  assert.equal(legalHref("privacy", "What we collect"), "/legal#legal/privacy/what-we-collect");
  assert.equal(legalHref("terms", "Liability"), "/legal#legal/terms/liability");
});

test("the in-app pages carry the frames' ten privacy and twelve terms sections", () => {
  assert.equal(PRIVACY_SECTIONS.length, 10);
  assert.equal(TERMS_SECTIONS.length, 12);
  for (const s of [...PRIVACY_SECTIONS, ...TERMS_SECTIONS]) {
    assert.ok(s.heading && s.body, s.heading);
    // Foundations 2.8: no em dashes in copy.
    assert.ok(!s.body.includes("—"), s.heading);
  }
});

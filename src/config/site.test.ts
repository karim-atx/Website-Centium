// The one site address shared links are built from (config/site.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SITE_URL, SITE_HOST, SITE_URL, normaliseSiteUrl, siteHref, siteText } from "./site";

test("the default is the live site", () => {
  assert.equal(DEFAULT_SITE_URL, "https://centium.atraxia.org");
  // No VITE_PUBLIC_SITE_URL under node:test, so the fallback applies.
  assert.equal(SITE_URL, "https://centium.atraxia.org");
  assert.equal(SITE_HOST, "centium.atraxia.org");
});

test("a configured address is used as given, without a trailing slash", () => {
  assert.equal(normaliseSiteUrl("https://staging.centium.example"), "https://staging.centium.example");
  assert.equal(normaliseSiteUrl("https://staging.centium.example/"), "https://staging.centium.example");
  assert.equal(normaliseSiteUrl("  https://centium.atraxia.org//  "), "https://centium.atraxia.org");
  assert.equal(normaliseSiteUrl("http://localhost:5173"), "http://localhost:5173");
});

test("a missing or malformed address falls back to the live site", () => {
  for (const raw of [undefined, null, "", "   ", "centium.app", "not a url", "ftp://centium.atraxia.org", "javascript:alert(1)"]) {
    assert.equal(normaliseSiteUrl(raw), DEFAULT_SITE_URL, String(raw));
  }
});

test("links are built from the one address", () => {
  assert.equal(siteHref("/i/RAMI-R3COACH1"), "https://centium.atraxia.org/i/RAMI-R3COACH1");
  assert.equal(siteText("/p/dana.diet/book"), "centium.atraxia.org/p/dana.diet/book");
  assert.ok(!siteHref("/p/x").includes("centium.app"));
});

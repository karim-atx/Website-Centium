import test from "node:test";
import assert from "node:assert/strict";
import * as EN from "./legalCopy.ts";
import * as AR from "./legalCopy.ar.ts";
import * as WEB from "../../marketing/legal/text.ar.ts";
import { addDocuments, setActiveLanguage } from "../../i18n/core.ts";
import { documents } from "../../i18n/ar/documents.ts";

// What loading Arabic does in the app (i18n/load.ts).
addDocuments("ar", documents);

// Round F (AV): the Arabic in-app legal summaries (legalCopy.ar.ts) have the
// English's shape, and their headings are the website's Arabic headings.

const arabic = (s: string) => /[؀-ۿ]/.test(s);

test("the Arabic summaries have the same sections, in the same order", () => {
  assert.equal(AR.PRIVACY_SECTIONS.length, EN.PRIVACY_SECTIONS.length);
  assert.equal(AR.TERMS_SECTIONS.length, EN.TERMS_SECTIONS.length);
  for (const s of [...AR.PRIVACY_SECTIONS, ...AR.TERMS_SECTIONS]) {
    assert.ok(arabic(s.heading) && arabic(s.body), s.heading);
    assert.ok(!s.body.includes("—"), s.heading);
  }
  for (const s of [AR.PRIVACY_INTRO, AR.TERMS_INTRO, AR.TERMS_GOVERNING_LAW]) assert.ok(arabic(s));
});

test("each Arabic heading is the website's Arabic heading for the same section", () => {
  const web = new Map<string, string>();
  const en = (doc: string, h: string) => doc + "/" + EN.legalSlug(h);
  // The website's English headings by position give the slug; text.ar.ts gives the Arabic.
  for (const [doc, ar, english] of [
    ["privacy", WEB.PRIVACY_GROUPS, EN.PRIVACY_SECTIONS.map((s) => s.heading)],
    ["terms", [...WEB.TERMS_GROUPS, { h: WEB.LIABILITY_HEADING, items: [] }], EN.TERMS_SECTIONS.map((s) => s.heading)],
  ] as const) {
    english.forEach((h, i) => web.set(en(doc, h), ar[i].h));
  }
  EN.PRIVACY_SECTIONS.forEach((s, i) => assert.equal(AR.PRIVACY_SECTIONS[i].heading, web.get(en("privacy", s.heading)), s.heading));
  EN.TERMS_SECTIONS.forEach((s, i) => assert.equal(AR.TERMS_SECTIONS[i].heading, web.get(en("terms", s.heading)), s.heading));
});

test("legalCopyFor and legalDate follow the language; English is unchanged", () => {
  setActiveLanguage("en");
  assert.equal(EN.legalCopyFor().TERMS_SECTIONS, EN.TERMS_SECTIONS);
  assert.equal(EN.legalDate(EN.LEGAL_UPDATED), "September 6, 2026");
  setActiveLanguage("ar");
  assert.equal(EN.legalCopyFor().TERMS_SECTIONS, AR.TERMS_SECTIONS);
  const d = EN.legalDate(EN.LEGAL_UPDATED);
  assert.ok(arabic(d) && d.includes("6") && d.includes("2026"), d);
  setActiveLanguage("en");
});

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import * as EN from "./text.ts";
import * as AR from "./text.ar.ts";
import * as G from "./guidelines.ts";
import * as GA from "./guidelines.ar.ts";
import { LEGAL_DOCS, LEGAL_TOC, legalDocsFor, legalTocFor } from "./anchors.ts";
import { addDocuments, setActiveLanguage } from "../../i18n/core.ts";
import { documents } from "../../i18n/ar/documents.ts";

// What loading Arabic does in the app (i18n/load.ts).
addDocuments("ar", documents);

// Round F (AV): the Arabic legal text (text.ar.ts, guidelines.ar.ts) has the
// English's shape, so the page keeps every section, id and bullet, and a
// change to one language that the other misses fails here.

const arabic = (s: string) => /[؀-ۿ]/.test(s);

describe("the Arabic legal documents have the English shape", () => {
  it("the same groups, in the same order, with the same number of items", () => {
    const shape = (gs: { h: string; items: string[] }[]) => gs.map((g) => g.items.length);
    assert.deepEqual(shape(AR.TERMS_GROUPS), shape(EN.TERMS_GROUPS));
    assert.deepEqual(shape(AR.PRIVACY_GROUPS), shape(EN.PRIVACY_GROUPS));
    assert.equal(AR.HEALTH_ITEMS.length, EN.HEALTH_ITEMS.length);
    assert.deepEqual(Object.keys(AR.INTRO), Object.keys(EN.INTRO));
    assert.equal(AR.ASK.length, EN.ASK.length);
  });

  it("every heading and paragraph is translated, and keeps the English numbers, names and emails", () => {
    const pairs: [string, string][] = [
      ...EN.TERMS_GROUPS.flatMap((g, i) => [[g.h, AR.TERMS_GROUPS[i].h], ...g.items.map((it, j) => [it, AR.TERMS_GROUPS[i].items[j]])] as [string, string][]),
      ...EN.PRIVACY_GROUPS.flatMap((g, i) => [[g.h, AR.PRIVACY_GROUPS[i].h], ...g.items.map((it, j) => [it, AR.PRIVACY_GROUPS[i].items[j]])] as [string, string][]),
      ...EN.HEALTH_ITEMS.map((it, i) => [it, AR.HEALTH_ITEMS[i]] as [string, string]),
      ["Liability", AR.LIABILITY_HEADING],
      [EN.LIABILITY_TEXT, AR.LIABILITY_TEXT],
      [EN.INTRO.terms, AR.INTRO.terms],
      [EN.INTRO.privacy, AR.INTRO.privacy],
      [EN.INTRO.health, AR.INTRO.health],
      [EN.ASK[0], AR.ASK[0]],
      [EN.ASK[1], AR.ASK[1]],
      [EN.GOVERNING, AR.GOVERNING],
    ];
    const kept = (s: string) => [...s.matchAll(/\d+|[\w.]+@[\w.]+|Centium|Supabase|LiveKit|Resend|Cloudflare|Starter/g)].map((m) => m[0]).sort();
    for (const [en, ar] of pairs) {
      assert.ok(arabic(ar), en);
      assert.deepEqual(kept(ar), kept(en), en);
    }
  });

  it("legalDocsFor keeps the English ids, numbers and colours in Arabic, and is LEGAL_DOCS in English", () => {
    setActiveLanguage("en");
    assert.deepEqual(legalDocsFor(), LEGAL_DOCS);
    assert.deepEqual(legalTocFor(legalDocsFor()), LEGAL_TOC);
    setActiveLanguage("ar");
    const docs = legalDocsFor();
    assert.deepEqual(
      docs.map((d) => [d.id, d.num, d.c, d.box, d.groups.map((g) => [g.id, g.items.length])]),
      LEGAL_DOCS.map((d) => [d.id, d.num, d.c, d.box, d.groups.map((g) => [g.id, g.items.length])]),
    );
    assert.deepEqual(docs[0].groups[11].items, [AR.LIABILITY_TEXT]);
    assert.deepEqual(docs[2].groups[0].items, AR.HEALTH_ITEMS);
    assert.deepEqual(
      legalTocFor(docs).map((e) => e.h),
      LEGAL_TOC.map((e) => e.h),
    );
  });

  after(() => setActiveLanguage("en"));
});

describe("the Arabic Community guidelines have the English shape", () => {
  it("the same sections and ids, items, and bold pieces in the same places", () => {
    const shape = (p: G.GuidelinePiece[]) => p.map((x) => (typeof x === "string" ? "s" : "b"));
    assert.deepEqual(
      GA.GUIDELINE_SECTIONS.map((s) => [s.id, s.items.map(shape), s.after ? shape(s.after) : null]),
      G.GUIDELINE_SECTIONS.map((s) => [s.id, s.items.map(shape), s.after ? shape(s.after) : null]),
    );
    for (const s of GA.GUIDELINE_SECTIONS) assert.ok(arabic(s.h), s.id);
    assert.ok(arabic(GA.GUIDELINES_INTRO));
  });

  it("guidelinesFor picks the language", () => {
    setActiveLanguage("en");
    assert.equal(G.guidelinesFor().sections, G.GUIDELINE_SECTIONS);
    assert.equal(G.guidelinesUpdated(), "October 29, 2026");
    setActiveLanguage("ar");
    assert.equal(G.guidelinesFor().sections, GA.GUIDELINE_SECTIONS);
    assert.ok(arabic(G.guidelinesUpdated()));
    setActiveLanguage("en");
  });
});

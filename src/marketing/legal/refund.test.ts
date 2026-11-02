import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { linkPhrases, parseInline, parsePolicy, plainText, type PolicyBlock } from "./policyDoc.ts";
import { initialPolicyLang, PREVAILS_SECTION_ID, REFUND_POLICY_LINKS } from "./refund.ts";

// Round F (DN): the page shows the lawyer's files themselves. These checks
// prove nothing is lost or changed on the way: every word of each file is on
// the page, the two versions have the same shape, and the links (F4) add no
// words.

const md = (f: string) => readFileSync(new URL(`../../../docs/legal/${f}`, import.meta.url), "utf8");
const EN = md("refund-policy.md");
const AR = md("refund-policy.ar.md");

/** The file's words without its Markdown marks, line by line. */
const fileWords = (s: string) =>
  s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^(# |### |- )/, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1"))
    .join("\n");

const shape = (blocks: PolicyBlock[]) => blocks.map((b) => ("p" in b ? "p" : `ul${b.ul.length}`));

describe("refund policy, word for word", () => {
  for (const [name, text] of [["English", EN], ["Arabic", AR]] as const) {
    it(`${name}: every word of the file is on the page`, () => {
      assert.equal(plainText(parsePolicy(text)), fileWords(text));
    });
  }

  it("English has the confirmed title, date and 14 sections", () => {
    const d = parsePolicy(EN);
    assert.equal(d.title, "Centium Refund and Cancellation Policy");
    assert.equal(d.updated, "Last updated: 31 October 2026. Confirmed by legal counsel.");
    assert.equal(d.sections.length, 14);
    assert.equal(d.sections[12].h, "13. Language");
  });

  it("Arabic has the same shape: sections, paragraphs and list items", () => {
    const e = parsePolicy(EN);
    const a = parsePolicy(AR);
    assert.deepEqual(shape(a.intro), shape(e.intro));
    assert.equal(a.sections.length, e.sections.length);
    a.sections.forEach((s, i) => {
      assert.equal(s.id, e.sections[i].id);
      assert.deepEqual(shape(s.blocks), shape(e.sections[i].blocks), s.h);
    });
  });

  it("both open with their own section 13 (the Arabic version prevails)", () => {
    for (const t of [EN, AR]) assert.ok(parsePolicy(t).sections.some((s) => s.id === PREVAILS_SECTION_ID));
    assert.match(plainText(parsePolicy(EN)), /If they differ, the Arabic version prevails\./);
  });

  it("every linked phrase is in its file, and linking changes no words (F4)", () => {
    for (const [lang, text] of [["en", EN], ["ar", AR]] as const) {
      const doc = parsePolicy(text);
      for (const [phrase] of REFUND_POLICY_LINKS[lang]) assert.ok(text.includes(phrase), `${lang}: ${phrase}`);
      for (const s of doc.sections)
        for (const b of s.blocks) {
          const lines = "p" in b ? [b.p] : b.ul;
          for (const l of lines) {
            const linked = linkPhrases(l, REFUND_POLICY_LINKS[lang]);
            assert.equal(linked.map((p) => p.t).join(""), l.map((p) => p.t).join(""));
          }
        }
    }
  });

  it("links keep bold and italic and mark only the phrase", () => {
    const out = linkPhrases(parseInline("at **reportaproblem.apple.com now**"), [["reportaproblem.apple.com", "https://x"]]);
    assert.deepEqual(out, [{ t: "at " }, { t: "reportaproblem.apple.com", b: true, href: "https://x" }, { t: " now", b: true }]);
  });

  it("opens in ?lang, then the app's language, then the browser's", () => {
    assert.equal(initialPolicyLang("?lang=ar", "en", "en-US"), "ar");
    assert.equal(initialPolicyLang("?lang=en", "ar", "ar"), "en");
    assert.equal(initialPolicyLang("", "ar", "en-US"), "ar");
    assert.equal(initialPolicyLang("", "en", "ar-LB"), "ar");
    assert.equal(initialPolicyLang("", "", "fr-FR"), "en");
  });
});

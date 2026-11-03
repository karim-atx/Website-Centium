import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as T from "./text.ts";
import { LEGAL_DOCS, LEGAL_IDS, LEGAL_TOC, legalAnchorFor, legalDateFor, legalSlug } from "./anchors.ts";
import { LEGAL_UPDATED, legalHref, legalSlug as appSlug, PRIVACY_SECTIONS, TERMS_SECTIONS } from "../../pages/settings/legalCopy.ts";

// Centium landing v29, batch 3: the Legal page became one long page; its
// TEXT stays word for word, its date stays tied to the accepted version, and
// the app's deep links keep landing.

describe("legal text, word for word", () => {
  it("is unchanged (fingerprint of every string the page shows)", () => {
    // The text moved from the previous src/marketing/pages/Legal.tsx into
    // legal/text.ts without a character changed (proven against git and the
    // handover's centium-legal-v7.js when it moved). Editing the legal text
    // must be deliberate: update this fingerprint in the same commit.
    // Release B (Karim): "an invite-only ambassador tier" became "an
    // ambassador tier, by application or invitation," (ambassador applications).
    // Round F (Karim, F3): Subscriptions and billing gains "See our Refund and
    // Cancellation Policy." (the policy's own page), version 2026-10-31.
    // Round F (Karim, A11 and A12): the language line, Groq among the
    // processors and the food search sources (the lawyer confirms them).
    const all = JSON.stringify([T.TERMS_GROUPS, T.LIABILITY_TEXT, T.PRIVACY_GROUPS, T.HEALTH_ITEMS, T.INTRO, T.ASK, T.GOVERNING, T.LANGUAGE]);
    assert.equal(createHash("sha256").update(all).digest("hex"), "40f264801e0a8cac10e8df99f281176a1adfa7db9ddbe5e168fde05993f91c53");
    assert.equal(all.length, 12482 + 42 + 371);
  });

  it("has 11 terms groups plus Liability, 10 privacy groups and 7 health points", () => {
    assert.equal(T.TERMS_GROUPS.length, 11);
    assert.equal(T.PRIVACY_GROUPS.length, 10);
    assert.equal(T.HEALTH_ITEMS.length, 7);
    assert.deepEqual(
      LEGAL_DOCS.map((d) => d.groups.length),
      [12, 10, 5],
    );
    assert.equal(LEGAL_DOCS[0].groups[11].h, "Liability");
    assert.deepEqual(LEGAL_DOCS[0].groups[11].items, [T.LIABILITY_TEXT]);
  });

  it("groups the health points under five sub-headings, none changed or reordered (LG1 v5)", () => {
    const health = LEGAL_DOCS[2].groups;
    assert.deepEqual(
      health.map((g) => [g.h, g.id, g.items.length]),
      [
        ["Informational only", "health-informational-only", 2],
        ["Biomarker capture", "health-biomarker-capture", 1],
        ["Voice and video calls", "health-voice-and-video-calls", 1],
        ["Independent providers", "health-independent-providers", 2],
        ["Not an emergency service", "health-not-an-emergency-service", 1],
      ],
    );
    assert.deepEqual(
      health.flatMap((g) => g.items),
      T.HEALTH_ITEMS,
    );
    // QA Y5: the same 8 paragraphs and 1665 characters as before.
    assert.equal(T.HEALTH_ITEMS.join("").length + T.INTRO.health.length, 1665);
  });

  it("still has every heading the app's in-app Privacy and Terms pages link to", () => {
    for (const s of PRIVACY_SECTIONS) assert.ok(LEGAL_IDS.has("privacy-" + appSlug(s.heading)), s.heading);
    for (const s of TERMS_SECTIONS) assert.ok(LEGAL_IDS.has("terms-" + appSlug(s.heading)), s.heading);
  });
});

describe("the Last updated date", () => {
  it("is LEGAL_VERSION written month first, the app's LEGAL_UPDATED", () => {
    const src = readFileSync(new URL("../../services/legal/acceptances.ts", import.meta.url), "utf8");
    const version = /export const LEGAL_VERSION = "(\d{4}-\d{2}-\d{2})"/.exec(src)?.[1];
    assert.equal(version, "2026-10-31");
    assert.equal(legalDateFor(version as string), "October 31, 2026");
    assert.equal(legalDateFor(version as string), LEGAL_UPDATED);
    assert.equal(legalDateFor("2027-01-31"), "January 31, 2027");
  });
});

describe("the legal hash shim", () => {
  it("uses the app's slug rule", () => {
    for (const h of ["What we collect", "How it's used and shared", "Children's data", "Retention, security and your rights", "Liability"]) {
      assert.equal(legalSlug(h), appSlug(h));
    }
  });

  it("maps #legal/<doc>/<slug> (the app's legalHref) to the group's id", () => {
    assert.equal(legalAnchorFor("#legal/privacy/what-we-collect"), "privacy-what-we-collect");
    assert.equal(legalAnchorFor("#legal/terms/liability"), "terms-liability");
    assert.equal(legalAnchorFor("#legal/privacy/children-s-data"), "privacy-children-s-data");
    const hashOf = (href: string) => "#" + href.split("#")[1];
    for (const s of PRIVACY_SECTIONS) assert.equal(legalAnchorFor(hashOf(legalHref("privacy", s.heading))), "privacy-" + appSlug(s.heading));
    for (const s of TERMS_SECTIONS) assert.equal(legalAnchorFor(hashOf(legalHref("terms", s.heading))), "terms-" + appSlug(s.heading));
  });

  it("maps #legal/<doc>, #legal and unknown documents or slugs to a document", () => {
    assert.equal(legalAnchorFor("#legal/privacy"), "privacy");
    assert.equal(legalAnchorFor("#legal/health"), "health");
    assert.equal(legalAnchorFor("#legal"), "terms");
    assert.equal(legalAnchorFor("#legal/"), "terms");
    assert.equal(legalAnchorFor("#legal/cookies/x"), "terms");
    assert.equal(legalAnchorFor("#legal/privacy/no-such-group"), "privacy");
  });

  it("maps the old #<doc>/<slug> alias", () => {
    assert.equal(legalAnchorFor("#terms/your-account"), "terms-your-account");
    assert.equal(legalAnchorFor("#privacy/nope"), "privacy");
  });

  it("leaves ids and other hashes alone (#privacy, #terms, #health land directly)", () => {
    for (const h of ["#privacy", "#terms", "#health", "#privacy-what-we-collect", "", "#", "#error=access_denied&error_code=otp_expired"]) {
      assert.equal(legalAnchorFor(h), null, h);
    }
    for (const id of ["terms", "privacy", "health"]) assert.ok(LEGAL_IDS.has(id));
  });

  it("lists every terms, privacy and health group in On this page (the page adds 04's 15)", () => {
    assert.equal(LEGAL_TOC.filter((e) => e.doc).length, 3);
    assert.equal(LEGAL_TOC.filter((e) => !e.doc).length, 27);
    assert.equal(LEGAL_TOC.filter((e) => e.h.startsWith("#health-")).length, 5);
    for (const e of LEGAL_TOC) assert.ok(LEGAL_IDS.has(e.h.slice(1)), e.h);
    // With 04 and its 14 sections: 45 entries (QA Y2).
    assert.equal(LEGAL_TOC.length + 15, 45);
  });
});

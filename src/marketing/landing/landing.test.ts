import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clamp, easeInOut3, prog, sm, swing } from "./engine/math";
import { anchorHash, chooseLoader, lo1Target, loTarget, pageOf, LOCKUP_RATIO, type LoaderInputs } from "./loading/loaderChoice";
import { pickBands } from "./lines/pickBands";

// Centium landing v29: the prototype's pure functions, checked against values
// worked out by hand from Centium Site v29.dc.html.

describe("landing v29 progress maths", () => {
  it("clamps and smoothsteps like the prototype's clamp / sm", () => {
    assert.equal(clamp(-1), 0);
    assert.equal(clamp(2), 1);
    assert.equal(sm(0.79, 0.83, 0.79), 0);
    assert.equal(sm(0.79, 0.83, 0.83), 1);
    assert.ok(Math.abs(sm(0.79, 0.83, 0.81) - 0.5) < 1e-9);
    assert.ok(Math.abs(sm(0, 1, 0.25) - 0.15625) < 1e-9);
  });

  it("eases in and out (the boxes' docking curve)", () => {
    assert.equal(easeInOut3(0), 0);
    assert.equal(easeInOut3(1), 1);
    assert.equal(easeInOut3(0.5), 0.5);
    assert.ok(Math.abs(easeInOut3(0.25) - 0.0625) < 1e-9);
  });

  it("measures progress through a pinned track", () => {
    const tr = { el: {} as HTMLElement, t: 1000, span: 500 };
    assert.equal(prog(tr, 900), 0);
    assert.equal(prog(tr, 1250), 0.5);
    assert.equal(prog(tr, 2000), 1);
    assert.equal(prog(null, 2000), 0);
  });

  it("swings the leaf N times and lands it with no sway", () => {
    const start = swing(0, 3, 100);
    assert.equal(start.desc, 0);
    assert.equal(start.x, -100);
    assert.equal(start.rot, -30);
    const end = swing(1, 3, 100);
    assert.equal(end.desc, 1);
    assert.equal(Math.abs(end.x), 0);
    assert.equal(end.sx, 1); // the flip has completed
  });
});

describe("landing v29 loading targets", () => {
  it("LO1 follows real progress, paced to 1.9 s and forced down by 2.4 s", () => {
    assert.equal(lo1Target(0.95, 1, "first"), 0.5); // all loaded: still no faster than t / 1.9
    assert.equal(lo1Target(1, 0.2, "first"), 0.2); // slow network: real progress
    assert.equal(lo1Target(2.4, 0, "first"), 1); // nothing loaded: lands anyway
    assert.equal(lo1Target(0.16, 0, "repeat"), 0.5); // repeat visit: 0.32 s, real progress ignored
  });

  it("LO2 follows real progress, paced to 1.2 s and forced down by 1.6 s", () => {
    assert.equal(loTarget(0.6, 1), 0.5);
    assert.equal(loTarget(1.6, 0), 1);
  });

  it("sizes the lockup on the navbar logo's own proportions", () => {
    assert.ok(Math.abs(LOCKUP_RATIO - 139.32 / 28) < 1e-9);
  });
});

describe("landing v29 loader choice (pickLo)", () => {
  const base: LoaderInputs = { page: "home", hash: "", navType: "navigate", saved: null, returning: false, inSession: false, rm: false };
  const pick = (o: Partial<LoaderInputs>) => chooseLoader({ ...base, ...o });

  it("gives LO1 at the top of the landing on a first visit", () => {
    const e = pick({});
    assert.equal(e.kind, "lo1");
    assert.equal(e.mode, "first");
  });

  it("gives the short loader to a returning visitor, and the still one under reduced motion", () => {
    assert.equal(pick({ returning: true }).mode, "repeat");
    assert.equal(pick({ returning: true, rm: true }).mode, "rm");
  });

  it("gives LO2 to other pages, anchors and a mid-page reload", () => {
    assert.equal(pick({ page: "contact" }).kind, "lo2");
    assert.equal(pick({ hash: "#pricing" }).kind, "lo2");
    const e = pick({ navType: "reload", saved: { page: "home", y: 1800 } });
    assert.equal(e.kind, "lo2");
    assert.equal(e.at, 1800);
    assert.equal(pick({ navType: "reload", saved: { page: "contact", y: 1800 } }).at, null); // another page's position
  });

  it("never treats an auth return hash as an anchor", () => {
    assert.equal(pick({ hash: "#error=access_denied&error_code=otp_expired" }).kind, "lo1");
    assert.equal(anchorHash("#error=x"), null);
    assert.equal(anchorHash("#access_token=abc"), null);
    assert.equal(anchorHash("#platform"), "platform");
  });

  it("gives no loader on back/forward or later in the same visit; a reload replays it", () => {
    assert.equal(pick({ navType: "back_forward" }).kind, null);
    assert.equal(pick({ page: "contact", inSession: true }).kind, null);
    assert.equal(pick({ page: "contact", inSession: true, navType: "reload" }).kind, "lo2");
  });

  it("names the marketing page from the path", () => {
    assert.equal(pageOf("/"), "home");
    assert.equal(pageOf("/contact"), "contact");
    assert.equal(pageOf("/legal"), "legal");
    assert.equal(pageOf("/nope"), "404");
  });
});

describe("landing v29 band colours (pickBands)", () => {
  it("alternates teal and lavender dominance between neighbours", () => {
    for (let s = 0; s < 20; s++) {
      const { dom } = pickBands(s);
      for (let i = 1; i < dom.length; i++) assert.notEqual(dom[i], dom[i - 1]);
    }
  });

  it("is fixed by a seed and random without one", () => {
    assert.deepEqual(pickBands(7), pickBands(7));
    assert.equal(pickBands().dom.length, 5);
  });
});

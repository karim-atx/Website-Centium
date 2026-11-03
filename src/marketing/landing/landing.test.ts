import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clamp, easeInOut3, prog, sm, swing } from "./engine/math";
import { anchorHash, chooseLoader, LO1_PACE, LO2_PACE, newPace, paceStep, pageOf, LOCKUP_RATIO, type LoaderInputs, type LoaderMode, type Pace } from "./loading/loaderChoice";
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

/** Runs the fall at `hz` frames a second; `h(p)` is the loading progress at
 *  time p. Returns when the fall ended (u reached 1) and the largest sway. */
function fall(K: Pace, hz: number, h: (p: number) => number, mode: LoaderMode = "first", skipAt = Infinity) {
  const S = newPace();
  let maxSway = 0,
    heldU = 0;
  for (let n = 0; n < hz * 5; n++) {
    const p = n / hz,
      u = paceStep(S, p, h(p), mode, p >= skipAt, K);
    maxSway = Math.max(maxSway, Math.abs(S.sway));
    if (S.hs != null && h(p) < 1 && p < K.D) heldU = u;
    if (u >= 0.999) return { end: p, maxSway, heldU };
  }
  return { end: Infinity, maxSway, heldU };
}

describe("landing update loading pace (LO1 / LO2 v3, LOADING.md)", () => {
  it("LO1: the fall takes 1.9 s by real time, the same at 60, 120 and 144 Hz, however fast loading is", () => {
    for (const hz of [60, 120, 144]) {
      const r = fall(LO1_PACE, hz, () => 1); // everything loaded at once
      assert.ok(Math.abs(r.end - 1.9) <= 1.9 * 0.05, hz + " Hz: " + r.end);
      assert.equal(r.maxSway, 0);
    }
  });

  it("LO1 on a slow connection: holds at 86% with a gentle sway, released by D (fall ends by 2.4 s)", () => {
    const r = fall(LO1_PACE, 60, () => 0); // never loads
    assert.ok(Math.abs(r.heldU - 0.86) < 0.001, "held at " + r.heldU);
    assert.ok(r.maxSway > 0.5 && r.maxSway <= 1, "sway " + r.maxSway);
    assert.ok(r.end > 2.13 && r.end <= 2.4, "ends at " + r.end);
  });

  it("LO1: loading that finishes during the hold lets the fall finish at once from 86%", () => {
    const r = fall(LO1_PACE, 60, (p) => (p >= 1.8 ? 1 : 0.5));
    assert.ok(r.end >= 1.8 && r.end < 2.1, "ends at " + r.end);
  });

  it("LO1 repeat visit: 0.32 s, loading ignored", () => {
    const r = fall(LO1_PACE, 60, () => 0, "repeat");
    assert.ok(Math.abs(r.end - 0.32) < 0.02, "ends at " + r.end);
  });

  it("a scroll or key during loading skips smoothly to the end", () => {
    const r = fall(LO1_PACE, 60, () => 0, "first", 0.5);
    assert.ok(r.end > 0.5 && r.end < 0.8, "ends at " + r.end);
  });

  it("LO2: the fall takes 1.2 s, and is released by 1.43 s (fall ends by 1.6 s)", () => {
    for (const hz of [60, 144]) assert.ok(Math.abs(fall(LO2_PACE, hz, () => 1).end - 1.2) <= 0.06);
    const slow = fall(LO2_PACE, 60, () => 0);
    assert.ok(slow.end > 1.43 && slow.end <= 1.6, "ends at " + slow.end);
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

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  axisLabels,
  barCentre,
  barGap,
  barHeights,
  barIndexAt,
  barsPath,
  centredLine,
  funnelWidth,
  lineGeo,
  scrubIndex,
  sparkline,
  tooltipLeft,
} from "./chartModel.ts";
import { deltaTone, formatPoints, leafHeight, leafWidth, offerProgress, pointsToGo, progressFraction } from "./pointsModel.ts";
import {
  FILTER_INITIAL,
  clearFilter,
  closeFilter,
  filterActive,
  filterSummary,
  matchesFilter,
  toggleFilter,
  toggleOption,
  type FilterGroupDef,
} from "./filterModel.ts";

// ---------------------------------------------------------------- chartModel

test("lineGeo is the screen files' lineGeo: pad 10, top at 1.1 x max, 1-decimal points", () => {
  const g = lineGeo([0, 10], 326, 120);
  // m = 11; py(0) = 110, py(10) = 120 - 10 - (10/11) * 100 = 19.09...
  assert.equal(g.line, "M0.0 110.0 L326.0 19.1");
  assert.equal(g.area, "M0.0 110.0 L326.0 19.1 L326 120 L0 120 Z");
  assert.equal(lineGeo([5], 326, 120).px(0), 163, "one point sits in the middle");
  assert.equal(lineGeo([0, 0], 100, 64).py(0), 54, "all zero: max is 1.1, zero sits on the pad line");
  assert.equal(lineGeo([], 10, 10).line, "M0 0");
});

test("sparkline: no data is P-MA.1 Empty (flat dashed line at 54, no area)", () => {
  assert.deepEqual(sparkline([]), { line: "M0 54 L358 54", area: "M0 64 L0 64 Z", dash: "4 5" });
  assert.deepEqual(sparkline([0, 0, 0]), { line: "M0 54 L358 54", area: "M0 64 L0 64 Z", dash: "4 5" });
  const s = sparkline([1, 2, 3]);
  assert.equal(s.dash, undefined);
  assert.ok(s.line.startsWith("M0.0 "));
  assert.ok(s.area.endsWith("L358 64 L0 64 Z"));
});

test("scrubIndex rounds x to the nearest point and clamps (scrub / scrubber)", () => {
  assert.equal(scrubIndex(0, 322, 30), 0);
  assert.equal(scrubIndex(322, 322, 30), 29);
  assert.equal(scrubIndex(-40, 322, 30), 0);
  assert.equal(scrubIndex(500, 322, 30), 29);
  assert.equal(scrubIndex(161, 322, 30), 15); // 0.5 * 29 = 14.5 -> 15
  assert.equal(scrubIndex(10, 0, 7), 6, "width floored at 1");
  assert.equal(scrubIndex(10, 322, 0), -1);
});

test("barIndexAt hit-tests the bar slot under x; barCentre anchors the tooltip", () => {
  assert.equal(barIndexAt(0, 300, 30), 0);
  assert.equal(barIndexAt(9.99, 300, 30), 0);
  assert.equal(barIndexAt(10, 300, 30), 1);
  assert.equal(barIndexAt(300, 300, 30), 29);
  assert.equal(barIndexAt(-5, 300, 30), 0);
  assert.equal(barCentre(0, 326, 30), (0.5 / 30) * 326);
});

test("bars: height = v / max x 96, at least 2; gap by count", () => {
  assert.deepEqual(barHeights([0, 1, 2, 4]), [2, 24, 48, 96]);
  assert.deepEqual(barHeights([0, 0]), [2, 2]);
  assert.deepEqual([barGap(7), barGap(13), barGap(30), barGap(52)], [10, 6, 3, 1]);
});

test("tooltipLeft centres the 110 tip on x and keeps it inside the plot (max(0, min(216, x - 55)) at 326)", () => {
  assert.equal(tooltipLeft(0, 326), 0);
  assert.equal(tooltipLeft(163, 326), 108);
  assert.equal(tooltipLeft(326, 326), 216);
  assert.equal(tooltipLeft(358, 358, 150), 208);
});

test("funnel widths: the fraction of the track, at least 6 px, at most the track", () => {
  assert.equal(funnelWidth(0, 322), 6);
  assert.equal(funnelWidth(0.001, 322), 6);
  assert.equal(funnelWidth(0.5, 322), 161);
  assert.equal(funnelWidth(3, 322), 322);
  assert.equal(funnelWidth(Number.NaN, 322), 6);
});

test("axis labels: first, middle, last", () => {
  assert.deepEqual(axisLabels(["a", "b", "c", "d"]), ["a", "b", "d"]);
  assert.deepEqual(axisLabels(["a"]), ["a", "a", "a"]);
  assert.deepEqual(axisLabels([]), ["", "", ""]);
});

test("expanded bars and the previous line through slot centres (B-MA.7 ex)", () => {
  assert.equal(barsPath([1], 10, 100, 1), "M1.5 100V10.0H8.5V100Z");
  assert.equal(centredLine([1, 1], 10, 100, 1), "M2.5 10.0 L7.5 10.0");
  assert.equal(barsPath([], 10, 10, 1), "M0 0");
});

// --------------------------------------------------------------- pointsModel

test("offer progress: 'You can redeem' at 100%, else 'N to go' at round(balance / cost)", () => {
  assert.deepEqual(offerProgress(1240, 900), { can: true, note: "You can redeem", pct: 100 });
  assert.deepEqual(offerProgress(900, 900), { can: true, note: "You can redeem", pct: 100 });
  assert.deepEqual(offerProgress(1240, 2000), { can: false, note: "760 to go", pct: 62 });
  assert.deepEqual(offerProgress(0, 1500), { can: false, note: "1,500 to go", pct: 0 });
  assert.equal(progressFraction(10, 0), 1);
  assert.equal(progressFraction(-5, 10), 0);
  assert.equal(pointsToGo(1000, 900), 0);
  assert.equal(formatPoints(16800), "16,800");
});

test("leaf mark sizes as drawn (17 -> 6.7 x 12, 28 -> 11.1 x 20, 14 -> 5.6 x 10)", () => {
  assert.deepEqual([leafHeight(17), leafWidth(leafHeight(17))], [12, 6.7]);
  assert.deepEqual([leafHeight(28), leafWidth(leafHeight(28))], [20, 11.1]);
  assert.deepEqual([leafHeight(14), leafWidth(leafHeight(14))], [10, 5.6]);
  assert.deepEqual([leafHeight(15), leafWidth(leafHeight(15))], [11, 6.1]);
  assert.equal(leafHeight(26), 15);
  assert.equal(leafHeight(20), 14);
});

test("ledger delta tone: minus is red, the dash is faint, otherwise green", () => {
  assert.equal(deltaTone("+12%"), "good");
  assert.equal(deltaTone("−3%"), "high");
  assert.equal(deltaTone("-3%"), "high");
  assert.equal(deltaTone("–"), "faint");
  assert.equal(deltaTone(""), "faint");
  assert.equal(deltaTone(undefined), "faint");
});

// --------------------------------------------------------------- filterModel

test("filter state: starts closed and empty; toggle keeps the choices; options keep it open; Show all clears", () => {
  assert.deepEqual(FILTER_INITIAL, { open: false, selected: [] });
  let s = toggleFilter(FILTER_INITIAL);
  assert.deepEqual(s, { open: true, selected: [] });
  s = toggleOption(s, "Cycling");
  s = toggleOption(s, "Evening");
  assert.deepEqual(s, { open: true, selected: ["Cycling", "Evening"] });
  assert.equal(filterSummary(s.selected), "Cycling · Evening");
  assert.equal(filterActive(s.selected), true);
  s = closeFilter(s);
  assert.deepEqual(s, { open: false, selected: ["Cycling", "Evening"] });
  s = toggleFilter(s);
  s = toggleOption(s, "Cycling");
  assert.deepEqual(s, { open: true, selected: ["Evening"] });
  assert.deepEqual(clearFilter(), { open: false, selected: [] });
  assert.equal(filterActive([]), false);
});

test("matchesFilter: a group with choices must match one of them; groups without choices pass", () => {
  type C = { type: string; h: number };
  const groups: FilterGroupDef<C>[] = [
    { heading: "Type", options: ["Cycling", "HIIT"], test: (c, o) => c.type === o },
    { heading: "Time", options: ["Morning", "Evening"], test: (c, o) => (o === "Morning" ? c.h < 12 : c.h >= 17) },
  ];
  const spin = { type: "Cycling", h: 18 };
  const hiit = { type: "HIIT", h: 7 };
  assert.equal(matchesFilter(groups, [], spin), true);
  assert.equal(matchesFilter(groups, ["Cycling"], spin), true);
  assert.equal(matchesFilter(groups, ["Cycling"], hiit), false);
  assert.equal(matchesFilter(groups, ["Cycling", "HIIT", "Evening"], hiit), false);
  assert.equal(matchesFilter(groups, ["Cycling", "HIIT", "Morning"], hiit), true);
});

// --------------------------------------------------------------- peopleModel

test("people: initials, hired badge text, rating line, place, a stable avatar step", async () => {
  const { hiredText, identityStep, initialsOf, placeOf, ratingLine } = await import("./peopleModel.ts");
  assert.equal(initialsOf("Rana Khoury"), "RK");
  assert.equal(initialsOf("  joe  abi nader "), "JA");
  assert.equal(hiredText(2), "Hired via Centium · 2 roles");
  assert.equal(hiredText(1), "Hired via Centium · 1 role");
  assert.equal(hiredText(0), "No Centium work yet");
  assert.equal(ratingLine(4.8, 38, "1.2 km"), "4.8 · 38 reviews · 1.2 km");
  assert.equal(ratingLine(4.6, 1), "4.6 · 1 review");
  assert.equal(ratingLine(null, 0, "4.0 km"), "New · 4.0 km");
  assert.equal(placeOf({ distanceKm: 1.23, area: "Hamra, Beirut" }), "1.2 km");
  assert.equal(placeOf({ distanceKm: null, area: "Hamra, Beirut" }), "Hamra, Beirut");
  const s = identityStep("4f3c-uuid");
  assert.ok(s >= 1 && s <= 4);
  assert.equal(identityStep("4f3c-uuid"), s, "the same person, the same colour");
});

// --------------------------------------------------------------- marketColor

test("ticket tones and offer chips are the board's (light)", async () => {
  const { stubColors, statusChip } = await import("./marketColor.ts");
  const { MARKET_LIGHT } = await import("../../theme/marketTokens.ts");
  const m = MARKET_LIGHT;
  assert.deepEqual(stubColors("teal", m, false), { bg: "#E4F0EE", ink: "#2F5F58", perf: "#6F9993" });
  assert.deepEqual(stubColors("pale", m, false), { bg: "#F0EDF9", ink: "#7D6BB5", perf: "#AEA1DC" });
  assert.deepEqual(stubColors("muted", m, false), { bg: "#F5F5F6", ink: "#8C8378", perf: "rgba(36,31,27,0.11)" });
  assert.deepEqual(stubColors(4, m, false), { bg: "#E6F1EF", ink: "#4F8F8A", perf: "#4F8F8A" });
  assert.deepEqual(statusChip("active", m), ["#E3F3E9", "#3F9165"]);
  assert.deepEqual(statusChip("scheduled", m), ["#F0EDF9", "#7D6BB5"]);
  assert.deepEqual(statusChip("paused", m), ["#F6E9C9", "#B07D16"]);
  assert.deepEqual(statusChip("expired", m), ["#F5F5F6", "#8C8378"]);
});

test("the strip's dark active fill reaches 4.5:1 under white; light keeps the drawn ink", async () => {
  const { darkenForWhite, whiteContrast } = await import("./marketColor.ts");
  const { SEGMENT_STEPS } = await import("../../theme/marketTokens.ts");
  for (const [, ink] of SEGMENT_STEPS) {
    const d = darkenForWhite(ink);
    assert.ok(whiteContrast(d) >= 4.5, `${ink} -> ${d}`);
    assert.ok(whiteContrast(d) < 5.1, "only just enough");
  }
  assert.equal(darkenForWhite("#5F5093"), "#5F5093", "a fill already at 4.5:1 stays as is");
});

test("a selected day tile's fill reaches 4.5:1 under its ink, light and dark", async () => {
  const { fillUnder, whiteContrast, luminance } = await import("./marketColor.ts");
  const { marketPalette } = await import("../../theme/marketTokens.ts");
  const ratio = (a: string, b: string) => {
    const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  for (const dark of [false, true]) {
    const m = marketPalette(dark);
    for (const fill of [m.segactive, m.fill]) {
      const f = fillUnder(fill, m.onfill);
      assert.ok(ratio(f, m.onfill) >= 4.5, `${dark ? "dark" : "light"} ${fill} -> ${f}`);
    }
  }
  assert.ok(whiteContrast(fillUnder("#A79AD5", "#FFFFFF")) >= 4.5);
  assert.equal(fillUnder("#A991FE", "#0D0B1A"), "#A991FE", "the dark ink keeps the drawn fill");
});

test("High contrast: every market text ink reaches 4.5:1 on the card and its own pale fill", async () => {
  const { luminance } = await import("./marketColor.ts");
  const { marketPalette, MARKET_LIGHT, MARKET_DARK } = await import("../../theme/marketTokens.ts");
  const hex = (s: string) => {
    const m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return s;
    const [r, g, b] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [luminance(hex(a)), luminance(hex(b))].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  assert.equal(marketPalette(false, false), MARKET_LIGHT, "High contrast off: the board");
  assert.equal(marketPalette(true, false), MARKET_DARK);
  for (const dark of [false, true]) {
    const m = marketPalette(dark, true);
    for (const k of ["ink", "ink2", "faint", "tert", "subink", "slabel", "accent", "pdark"] as const) {
      assert.ok(ratio(m[k], m.card) >= 4.5, `${dark ? "dark" : "light"} ${k} ${m[k]} on card`);
      assert.ok(ratio(m[k], m.soft) >= 4.5, `${dark ? "dark" : "light"} ${k} ${m[k]} on soft`);
    }
    assert.ok(ratio(m.segink, m.segidle) >= 4.5, "segink on segidle");
    assert.ok(ratio(m.pdark, m.pale) >= 4.5, "pdark on pale");
    assert.ok(ratio(m.good, m.goodbg) >= 4.5, "good on goodbg");
    assert.ok(ratio(m.caution, m.cautionbg) >= 4.5, "caution on cautionbg");
    assert.ok(ratio(m.high, m.highbg) >= 4.5, "high on highbg");
    for (const f of [m.fill, m.segactive, m.subactive]) assert.ok(ratio(m.onfill, f) >= 4.5, `onfill on ${f}`);
  }
});

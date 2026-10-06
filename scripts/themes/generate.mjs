// R20 (batch D): generates src/styles/theme-palette.css, the four colour
// themes beside the default Centium theme. Run `npm run gen:themes` after
// changing a theme anchor or adding a `th-<hex>` colour anywhere in src.
//
// CENTIUM IS NOT GENERATED. Its light values stay pre-R1 and its dark values
// stay as they are (decisions 15 and D4): this file only gives every theme
// colour a variable whose Centium value is the colour it replaced, so the
// default theme renders byte-identically.
//
// THE OTHER FOUR come from Foundations 2.1: each lavender shade maps to the
// theme primary and each teal shade to the theme secondary "at the same
// relative lightness" (makeMapper), using the light pair in light mode and the
// dark pair in dark mode. Lightness is matched as luminance, so every contrast
// ratio a shade has in Centium carries over to the theme; the pair's own
// colours are kept exactly where they are shown as themselves (--c-primary,
// the C mark, the picker swatches). On top of that:
//  - a shade that reached 4.5:1 (or 3:1) on white in Centium keeps reaching it
//    (on the dark card in dark mode), so text and icons never get weaker;
//  - every colour also has an ink variant (`--thi-*`, `--c-*-ink`), which
//    Tailwind's text utilities use, at 4.5:1 or better on the page, the soft
//    surface and the theme's pale tint (D6, D8);
//  - filled controls carry white or near-black ink at 4.5:1 (D7).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contrast, ensureContrast, fromOklch, hexToRgb, makeMapper, over, rgbToHex, toOklch } from "./color.mjs";

const HERE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(HERE), "../..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(SRC, "styles", "theme-palette.css");
const LIST = path.join(SRC, "styles", "theme-colors.json");

// ---- the themes (Foundations 2.1 "Theme pairs") -----------------------------
export const THEMES = {
  sky: { name: "Sky & Slate", light: ["#4F7DFF", "#94A3B8"], dark: ["#2E5BFF", "#64748B"], ink: "white" },
  rose: { name: "Rose & Blush", light: ["#E24D7F", "#F0A7B8"], dark: ["#C81E5D", "#9F475F"], ink: "white" },
  gold: { name: "Gold & Amber", light: ["#F6C445", "#8B5A2B"], dark: ["#D99706", "#5A3A17"], ink: "dark" },
  coral: { name: "Coral & Terracotta", light: ["#FF7A45", "#B94A2E"], dark: ["#E85D2E", "#7A2F1F"], ink: "white" },
};
// Centium's anchors: the light pair from the board; the dark primary is the one
// Centium dark actually uses (#A991FE, kept by D4), so dark shades map from it.
const CENTIUM = { light: ["#AEA1DC", "#6F9993"], dark: ["#A991FE", "#6F9993"] };
const WHITE = "#ffffff", INK_DARK = "#0d0b1a";
const GROUND = { light: ["#ffffff", "#f5f5f6"], dark: ["#1c1f28", "#262932"] };
const CARD = { light: "#ffffff", dark: "#1c1f28" };
// The strongest family wash text sits on: stacked badges reach about 60% in
// light; dark washes stay near 14-25% on the card.
const TINT_ALPHA = { light: 0.65, dark: 0.25 };

// ---- families ---------------------------------------------------------------
// Solid lavender fills whose chroma falls inside the text-grey band below: the
// Food quick-add Breakfast tile's dark fill sits beside its #726A90 / #6B6190
// siblings, so it follows the theme with them.
// Batch E (E11, decided 6 October): colours the classifier below would keep
// fixed that the user chose to follow the theme: the More hub and navbar grey
// #9A94B3 and its dark twin #8A8698 (MO1 §9 lists #9A94B3 under "swaps to
// theme primary"), the Workout Metrics empty bars #53506C, and the More hub's
// mint hero and tiles #ECF5F3 / #EBF5F2 (near-white, so below the teal band).
const LAV_FILLS = new Set(["#797292", "#9a94b3", "#8a8698", "#53506c"]);
const TEAL_FILLS = new Set(["#ecf5f3", "#ebf5f2"]);
/** "lav", "teal" or null (fixed: greys, near-whites, ink, every other hue). */
export function family(hex) {
  if (LAV_FILLS.has(hex.toLowerCase())) return "lav";
  if (TEAL_FILLS.has(hex.toLowerCase())) return "teal";
  const [L, C, H] = toOklch(hex);
  if (H >= 270 && H <= 310 && C >= 0.008) {
    if (C < 0.006) return null;
    // Text greys with a lavender cast (#B8B3C7, #9A94B3, #8A8698, #575170 ...)
    // are "text greys", fixed in every theme (rule 5).
    if (L > 0.35 && L < 0.9 && C < 0.051) return null;
    if (L < 0.2) return null; // the near-black ink #0D0B1A
    // The dark surfaces #1C1F28, #262932, #242730 (chroma 0.018 or less) are
    // page backgrounds, fixed; the lavender washes over them (#303141 ...) are not.
    if (L < 0.35 && C < 0.02) return null;
    if (L > 0.96 && C < 0.012) return null; // #F5F3FA dark text, near-whites
    return "lav";
  }
  if (H >= 170 && H <= 205 && C >= 0.012) return "teal";
  return null;
}

const cssTriplet = (hex) => hexToRgb(hex).join(" ");
const tripletToHex = (t) => rgbToHex(t.trim().split(/\s+/).map(Number));

// ---- read Centium's tokens from index.css -----------------------------------
const css = fs.readFileSync(path.join(SRC, "index.css"), "utf8");
function block(selectorRe) {
  const m = css.match(selectorRe);
  if (!m) throw new Error("block not found: " + selectorRe);
  const start = m.index + m[0].length;
  let depth = 1, i = start;
  while (depth && i < css.length) { if (css[i] === "{") depth++; else if (css[i] === "}") depth--; i++; }
  const body = css.slice(start, i - 1).replace(/\/\*[\s\S]*?\*\//g, "");
  const out = {};
  for (const d of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].trim();
  return out;
}
const rootVars = { ...block(/\n:root\s*\{(?=\s*\n\s*--c-cream)/), ...block(/\n:root\s*\{(?=\s*\n\s*--app-col)/) };
const darkVars = block(/\n\.dark\s*\{/);
const lightOf = (name) => rootVars[name];
const darkOf = (name) => { const v = darkVars[name] ?? rootVars[name]; return v.startsWith("var(") ? (darkVars[v.slice(4, -1)] ?? rootVars[v.slice(4, -1)]) : v; };

// Triplet tokens that follow the theme, and their family.
const LAV = ["--c-primary", "--c-primary-light", "--c-primary-pale", "--c-primary-dark", "--c-primary-deep-text", "--c-primary-accent",
  "--c-team-nav-accent", "--c-team-nav-accent-text", "--c-team-lavender", "--c-team-lavender-deep"];
const TEAL = ["--c-teal", "--c-teal-light", "--c-teal-pale", "--c-teal-dark", "--c-teal-deep-text", "--c-trend-high-text",
  "--c-team-teal-ink", "--c-team-teal-deep"];
// Tokens with an ink twin, read by Tailwind's text utilities (tailwind.config.js).
export const INK_TOKENS = [...LAV, ...TEAL];
// String tokens whose colours follow the theme (gradients, rgba hairlines,
// the sheet and wheel chrome, the forum's lavender and teal).
const STRING_TOKENS = ["--border-row", "--shadow-fab", "--gradient-board", "--gradient-teal-hero", "--gradient-food-hero",
  "--gradient-lavender-accent", "--gradient-quick-action", "--sheet-band", "--sheet-border", "--sheet-title", "--sheet-handle",
  "--wheel-band", "--forum-accent", "--forum-track", "--forum-track-active", "--forum-border", "--forum-rules-bg", "--forum-rules-ink",
  "--forum-link", "--forum-teal-bg", "--forum-teal-ink", "--forum-removed-bg", "--forum-photo-bg", "--forum-rule", "--forum-dashed",
  "--forum-dashed-bg", "--forum-handle", "--forum-done-ink"];

// ---- the literal colours used in src as th-<hex> ----------------------------
function scanLiterals() {
  const found = new Set();
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|css)$/.test(e.name) && !p.endsWith("theme-palette.css")) {
        for (const m of fs.readFileSync(p, "utf8").matchAll(/\bth[iw]?-([0-9a-f]{6})\b/g)) found.add(m[1]);
      }
    }
  })(SRC);
  return [...found].sort();
}
/** Literal fills that carry white text are written thw-<hex> at the call site:
 *  in the other themes that variable keeps white at 4.5:1, as filled controls
 *  do (D7), without darkening the same shade where it is only a tint. */
function scanWhiteFills() {
  const found = new Set();
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) for (const m of fs.readFileSync(p, "utf8").matchAll(/\bthw-([0-9a-f]{6})\b/g)) found.add(m[1]);
    }
  })(SRC);
  return found;
}

// ---- mapping ----------------------------------------------------------------
function mappers(theme, mode) {
  const [p, s] = THEMES[theme][mode];
  const [cp, cs] = CENTIUM[mode];
  return { lav: makeMapper(cp, p), teal: makeMapper(cs, s) };
}
/** A theme shade that keeps the Centium shade's contrast class on the card. */
function held(centHex, mapped, mode) {
  const card = CARD[mode];
  const c0 = contrast(centHex, card);
  const dir = mode === "light" ? -1 : 1;
  if (c0 >= 4.5) return ensureContrast(mapped, [card], 4.5, dir);
  if (c0 >= 3) return ensureContrast(mapped, [card], 3, dir);
  return mapped;
}
function mapHex(hex, theme, mode, fam = family(hex)) {
  if (!fam) return hex;
  return held(hex, mappers(theme, mode)[fam](hex), mode);
}
/** Text twin: 4.5:1 on the page, the soft surface and its family's tints (the
 *  pale shade, and the base colour at 65% on the page, which covers stacked
 *  washes such as a 42% badge on a 16% tile), when the Centium colour is meant
 *  for a page-coloured ground at all. */
function inkOf(centHex, base, mode, tints) {
  const card = CARD[mode];
  // Under 2.5:1 on the page in Centium, a text colour is drawn on something
  // else (pale lavender on a dark toast or button, white-ish on a hero), so it
  // keeps its matched shade, which holds Centium's contrast on that ground.
  if (contrast(centHex, card) < 2.5) return base;
  return ensureContrast(base, [...GROUND[mode], ...tints], 4.5, mode === "light" ? -1 : 1);
}
function mapString(str, theme, mode) {
  return str
    .replace(/#([0-9a-fA-F]{6})\b/g, (m) => mapHex(m.toLowerCase(), theme, mode))
    .replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*[\d.]+\s*)?\)/g, (m, r, g, b, a) => {
      const hex = rgbToHex([+r, +g, +b]);
      const out = mapHex(hex, theme, mode);
      if (out === hex) return m;
      const [R, G, B] = hexToRgb(out);
      return a ? `rgba(${R}, ${G}, ${B}${a})` : `rgb(${R}, ${G}, ${B})`;
    });
}

function themeBlock(theme, mode, literals) {
  const t = THEMES[theme];
  const [p, s] = t[mode];
  const v = {};
  const centium = (name) => tripletToHex(mode === "light" ? lightOf(name) : darkOf(name));
  for (const n of LAV) v[n] = mapHex(centium(n), theme, mode, "lav");
  for (const n of TEAL) v[n] = mapHex(centium(n), theme, mode, "teal");
  // --c-primary is matched like every other shade (it is also a translucent
  // ground behind grey text, bg-primary/50, where the pair's own colour would
  // drop the contrast Centium has). The pair's own colour is shown exactly in
  // the C mark, the picker swatch and the filled controls below (D7).
  // The in-app C mark (theme rule 4): C in the primary, leaf in the secondary.
  v["--c-brand-c"] = p.toLowerCase();
  v["--c-brand-leaf"] = s.toLowerCase();

  // Pale washes in dark mode: the dark pair at 14% / 16% on the card (R3's rule).
  if (mode === "dark") {
    v["--c-primary-pale"] = over(p, 0.14, "#1c1f28");
    v["--c-teal-pale"] = over(s, 0.16, "#1c1f28");
  }
  const pale = v["--c-primary-pale"];

  // Filled controls (D7).
  let fill = p, ink;
  if (t.ink === "dark") { ink = INK_DARK; fill = ensureContrast(p, [INK_DARK], 4.5, 1); }
  else if (mode === "light") { ink = WHITE; fill = ensureContrast(p, [WHITE], 4.5, -1); }
  else if (contrast(p, WHITE) >= 4.5) ink = WHITE;
  else { ink = INK_DARK; fill = ensureContrast(p, [INK_DARK], 4.5, 1); }
  v["--c-primary-fill"] = fill;
  v["--c-on-primary-fill"] = ink;
  for (const n of ["--c-fill-chip", "--c-fill-cta", "--c-fill-sheet", "--c-fill-day", "--c-fill-foods"]) v[n] = fill;
  const away = ink === WHITE ? -1 : 1;
  v["--c-teal-fill"] = ensureContrast(mapHex(centium("--c-teal-fill"), theme, mode, "teal"), [ink], 4.5, away);
  v["--c-fill-prep"] = ensureContrast(mapHex(tripletToHex(mode === "light" ? lightOf("--c-fill-prep") : darkOf("--c-fill-prep")), theme, mode, "teal"), [ink], 4.5, away);

  // Text tokens in dark mode are lifted shades (D8); in light, darkened.
  for (const n of ["--c-primary-dark", "--c-primary-deep-text", "--c-primary-accent", "--c-team-nav-accent-text", "--c-teal-deep-text", "--c-trend-high-text", "--c-team-teal-ink"]) {
    v[n] = ensureContrast(v[n], [...GROUND[mode], pale], 4.5, mode === "light" ? -1 : 1);
  }
  if (mode === "dark") v["--c-primary-accent"] = ensureContrast(p, [...GROUND.dark, pale], 4.5, 1);

  // White-ink hero cards (light): white at 70% holds 4.5:1 at both stops.
  const heroOk = (bg) => contrast(over(WHITE, 0.7, bg), bg) >= 4.5;
  const darkenUntil = (hex, ok) => { const [L, C, H] = toOklch(hex); for (let i = 0; i < 200; i++) { const c = fromOklch([L - i * 0.005, C, H]); if (ok(c)) return c; } return hex; };
  v["--c-hero-from"] = darkenUntil(mapHex(tripletToHex(lightOf("--c-hero-from")), theme, "light", "lav"), heroOk);
  v["--c-hero-to"] = darkenUntil(mapHex(tripletToHex(lightOf("--c-hero-to")), theme, "light", "lav"), heroOk);

  // The sent bubble: white ink in light (5.7:1, so white at 85% still passes),
  // near-black ink in dark.
  v["--c-bubble-sent"] = mode === "light"
    ? ensureContrast(p, [WHITE], 5.7, -1)
    : ensureContrast(p, [INK_DARK], 5.7, 1);

  // Ink twins.
  const ink2 = {};
  const tints = {
    lav: [pale, over(v["--c-primary"], TINT_ALPHA[mode], CARD[mode])],
    teal: [v["--c-teal-pale"], over(v["--c-teal"], TINT_ALPHA[mode], CARD[mode])],
  };
  for (const n of INK_TOKENS) ink2[n + "-ink"] = inkOf(centium(n), v[n], mode, tints[LAV.includes(n) ? "lav" : "teal"]);
  ink2["--c-primary-ink"] = ensureContrast(p, [...GROUND[mode], pale], 4.5, mode === "light" ? -1 : 1);

  const lines = [];
  for (const [n, h] of Object.entries(v)) lines.push(`  ${n}: ${cssTriplet(h)};`);
  for (const [n, h] of Object.entries(ink2)) lines.push(`  ${n}: ${cssTriplet(h)};`);
  for (const n of STRING_TOKENS) {
    const src = mode === "light" ? rootVars[n] : (darkVars[n] ?? rootVars[n]);
    if (src) lines.push(`  ${n}: ${mapString(src, theme, mode)};`);
  }
  const lits = {};
  for (const h of literals) {
    const hex = "#" + h;
    const base = mapHex(hex, theme, mode);
    if (WHITE_FILLS.has(h)) lines.push(`  --thw-${h}: ${cssTriplet(family(hex) ? ensureContrast(base, [WHITE], 4.5, -1) : base)};`);
    const inkHex = family(hex) ? inkOf(hex, base, mode, tints[family(hex)]) : base;
    lits[h] = inkHex;
    lines.push(`  --th-${h}: ${cssTriplet(base)};`);
    lines.push(`  --thi-${h}: ${cssTriplet(inkHex)};`);
  }
  const sel = mode === "light" ? `[data-accent="${theme}"]` : `.dark[data-accent="${theme}"]`;
  return { css: `${sel} {\n${lines.join("\n")}\n}\n`, data: { v, ink2, lits, tints, fillInk: ink } };
}

// ---- high contrast (D19) ----------------------------------------------------
// MO1.8.6.1 / Foundations 2.1: text greys go to #111111 (light) / #F5F3FA (dark)
// and hairlines to 30% (index.css, every theme); here the theme colours are
// darkened (light) or lifted (dark) until every text pairing reaches 4.5:1 -
// on the page, the soft surface and the family's tints - and the primary
// carries its ink at 4.5:1. Centium light keeps C26's hand values (#5B48B8 /
// #4B3BA0, index.css) and only adds what they do not cover.
function hcBlock(theme, mode, literals, data) {
  const dir = mode === "light" ? -1 : 1;
  const grounds = (fam) => [...GROUND[mode], ...data.tints[fam]];
  const lines = [];
  const centiumLight = theme === "centium" && mode === "light";
  const centOf = (n) => tripletToHex(mode === "light" ? lightOf(n) : darkOf(n));
  for (const n of INK_TOKENS) {
    if (centiumLight && /--c-primary/.test(n)) continue;
    if (contrast(centOf(n), CARD[mode]) < 2.5) continue;
    const fam = LAV.includes(n) ? "lav" : "teal";
    lines.push(`  ${n}-ink: ${cssTriplet(ensureContrast(data.ink2[n + "-ink"], grounds(fam), 4.5, dir))};`);
  }
  if (!centiumLight) {
    // Light: Centium's own High contrast values (#5B48B8 primary, #4B3BA0
    // text, index.css) matched into the theme like every other shade, so the
    // theme keeps Centium's ratios there too. Dark (no hand values): lifted.
    const prim = mode === "light" && theme !== "centium"
      ? mapHex("#5b48b8", theme, "light", "lav")
      : ensureContrast(data.v["--c-primary"], grounds("lav"), 4.5, 1);
    const text = mode === "light" && theme !== "centium" ? mapHex("#4b3ba0", theme, "light", "lav") : null;
    lines.push(`  --c-primary: ${cssTriplet(prim)};`);
    lines.push(`  --c-primary-ink: ${cssTriplet(ensureContrast(prim, grounds("lav"), 4.5, dir))};`);
    for (const n of ["--c-primary-accent", "--c-primary-dark", "--c-primary-deep-text"]) {
      // ... and on the primary itself at 50% (a translucent primary row such
      // as habits' day header, where a saturated theme primary mixes darker).
      const hcGrounds = text ? [...grounds("lav"), over(prim, 0.5, WHITE)] : grounds("lav");
      const hcText = ensureContrast(text ?? data.v[n], hcGrounds, 4.5, dir);
      lines.push(`  ${n}: ${cssTriplet(hcText)};`);
      // Their text twins too (Tailwind's text-primary-dark reads the -ink).
      if (text) lines.push(`  ${n}-ink: ${cssTriplet(hcText)};`);
    }
    const fillBase = mode === "light" && theme !== "centium" && data.fillInk === WHITE ? prim : data.v["--c-primary-fill"];
    const fill = ensureContrast(fillBase, [data.fillInk], 4.5, data.fillInk === WHITE ? -1 : 1);
    lines.push(`  --c-primary-fill: ${cssTriplet(fill)};`);
  }
  for (const h of literals) {
    const hex = "#" + h;
    const fam = family(hex);
    if (!fam || contrast(hex, CARD[mode]) < 2.5) continue;
    lines.push(`  --thi-${h}: ${cssTriplet(ensureContrast(data.lits[h], grounds(fam), 4.5, dir))};`);
  }
  const sel = mode === "light"
    ? `html.high-contrast[data-accent="${theme}"]:not(.dark)`
    : `html.high-contrast.dark[data-accent="${theme}"]`;
  return `${sel} {\n${lines.join("\n")}\n}\n`;
}

/** Centium's own values, in the shape themeBlock returns, for its HC block. */
function centiumData(mode, literals) {
  const val = (n) => tripletToHex(mode === "light" ? lightOf(n) : darkOf(n));
  const v = {};
  for (const n of [...LAV, ...TEAL, "--c-primary-fill"]) v[n] = val(n);
  const ink2 = {};
  for (const n of INK_TOKENS) ink2[n + "-ink"] = v[n];
  const lits = {};
  for (const h of literals) lits[h] = "#" + h;
  const tints = {
    lav: [v["--c-primary-pale"], over(v["--c-primary"], TINT_ALPHA[mode], CARD[mode])],
    teal: [v["--c-teal-pale"], over(v["--c-teal"], TINT_ALPHA[mode], CARD[mode])],
  };
  return { v, ink2, lits, tints, fillInk: mode === "light" ? WHITE : INK_DARK };
}

let WHITE_FILLS = new Set();
function generate() {
  const literals = scanLiterals();
  WHITE_FILLS = scanWhiteFills();
  const unknown = literals.filter((h) => !family("#" + h));
  const centiumLines = [];
  for (const n of INK_TOKENS) centiumLines.push(`  ${n}-ink: var(${n});`);
  centiumLines.push("  --c-primary-ink: var(--c-primary);");
  for (const h of literals) {
    centiumLines.push(`  --th-${h}: ${cssTriplet("#" + h)};`);
    centiumLines.push(`  --thi-${h}: var(--th-${h});`);
    if (WHITE_FILLS.has(h)) centiumLines.push(`  --thw-${h}: var(--th-${h});`);
  }
  let out = `/* GENERATED by scripts/themes/generate.mjs (npm run gen:themes). Do not edit.
   R20 colour themes: Centium (default, values unchanged) and the four
   Foundations 2.1 theme pairs, light and dark. */
:root {\n${[...new Set(centiumLines)].join("\n")}\n}\n`;
  const hc = [];
  for (const mode of ["light", "dark"]) hc.push(hcBlock("centium", mode, literals, centiumData(mode, literals)));
  for (const theme of Object.keys(THEMES)) for (const mode of ["light", "dark"]) {
    const b = themeBlock(theme, mode, literals);
    out += b.css;
    hc.push(hcBlock(theme, mode, literals, b.data));
  }
  out += "\n/* High contrast (D19): after the themes, so it wins where weights tie. */\n" + hc.join("");
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out);
  fs.writeFileSync(LIST, JSON.stringify(literals) + "\n");
  console.log(`theme-palette.css: ${literals.length} literal colours, ${Object.keys(THEMES).length} themes`);
  if (unknown.length) console.log("not lavender or teal (kept fixed in every theme):", unknown.join(" "));
}

if (process.argv[1] && path.resolve(process.argv[1]) === HERE) generate();

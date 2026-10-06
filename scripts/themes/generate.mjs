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

// ---- families ---------------------------------------------------------------
/** "lav", "teal" or null (fixed: greys, near-whites, ink, every other hue). */
export function family(hex) {
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
/** Text twin: 4.5:1 on the page, the soft surface and the pale tint, when the
 *  Centium colour is meant for a page-coloured ground at all (pale text that
 *  sits on a filled hero keeps its shade). */
function inkOf(centHex, base, mode, pale) {
  const card = CARD[mode];
  if (contrast(centHex, card) < 1.6) return base;
  return ensureContrast(base, [...GROUND[mode], pale], 4.5, mode === "light" ? -1 : 1);
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
  for (const n of INK_TOKENS) ink2[n + "-ink"] = inkOf(centium(n), v[n], mode, pale);
  ink2["--c-primary-ink"] = ensureContrast(p, [...GROUND[mode], pale], 4.5, mode === "light" ? -1 : 1);

  const lines = [];
  for (const [n, h] of Object.entries(v)) lines.push(`  ${n}: ${cssTriplet(h)};`);
  for (const [n, h] of Object.entries(ink2)) lines.push(`  ${n}: ${cssTriplet(h)};`);
  for (const n of STRING_TOKENS) {
    const src = mode === "light" ? rootVars[n] : (darkVars[n] ?? rootVars[n]);
    if (src) lines.push(`  ${n}: ${mapString(src, theme, mode)};`);
  }
  for (const h of literals) {
    const hex = "#" + h;
    const base = mapHex(hex, theme, mode);
    if (WHITE_FILLS.has(h)) lines.push(`  --thw-${h}: ${cssTriplet(family(hex) ? ensureContrast(base, [WHITE], 4.5, -1) : base)};`);
    lines.push(`  --th-${h}: ${cssTriplet(base)};`);
    lines.push(`  --thi-${h}: ${cssTriplet(inkOf(hex, base, mode, pale))};`);
  }
  const sel = mode === "light" ? `[data-accent="${theme}"]` : `.dark[data-accent="${theme}"]`;
  return `${sel} {\n${lines.join("\n")}\n}\n`;
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
  for (const theme of Object.keys(THEMES)) for (const mode of ["light", "dark"]) out += themeBlock(theme, mode, literals);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out);
  fs.writeFileSync(LIST, JSON.stringify(literals) + "\n");
  console.log(`theme-palette.css: ${literals.length} literal colours, ${Object.keys(THEMES).length} themes`);
  if (unknown.length) console.log("not lavender or teal (kept fixed in every theme):", unknown.join(" "));
}

if (process.argv[1] && path.resolve(process.argv[1]) === HERE) generate();

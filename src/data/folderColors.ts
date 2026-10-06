import type { Routine, RoutineFolder } from "../types";
import { THEME_MAP } from "../styles/themeMap";

/**
 * Folder colour families, handover 2026-09-29 02 "Folder colour tokens":
 * the five shades a folder's colour resolves to — header, tile (the dark
 * shade), row tint, bar and play. Shared by the Routines tab, the logger
 * (WO8), History (WO3.1) and the active-workout bar (WO17).
 */
export interface FolderFamily {
  head: string;
  tile: string;
  row: string;
  bar: string;
  play: string;
}

// The two families the handover specifies, literally.
export const PURPLE: FolderFamily = { head: "#A797E3", tile: "#6E56C5", row: "#F0EEFE", bar: "#7C66CF", play: "#836BD6" };
export const TEAL: FolderFamily = { head: "#8ABFB5", tile: "#4B786F", row: "#EBF4F3", bar: "#61958C", play: "#63968B" };

// BATCH E (E11, 6 October): A ROUTINE WITH NO FOLDER AND NO COLOUR FOLLOWS THE
// COLOUR THEME. Its family is the lavender one in Centium, exactly as before;
// in the other themes each shade is the theme generator's mapping of it
// (styles/themeMap.ts, the same values as the th-* CSS colours), so the
// Routines card, the session sheet and the active bar take the theme's hue.
// A colour someone picked (folder or routine) stays that colour.
// The generator maps these shades because they are named here:
// th-a797e3 th-6e56c5 th-f0eefe th-7c66cf th-836bd6 th-7d67d9 th-7d6bb5
let activeColorTheme = "centium";
/** Called by AppContext with the colour theme in use, before its children render. */
export function setFolderColorTheme(theme: string): void {
  activeColorTheme = theme;
}
/** A literal colour as the active colour theme maps it (itself in Centium). */
export const themeHex = (hex: string, mode: "light" | "dark" = "light"): string =>
  THEME_MAP[activeColorTheme]?.[mode]?.[hex.slice(1).toLowerCase()]?.toUpperCase() ?? hex;
const unfiledCache = new Map<string, FolderFamily>();
/** The family of an unfiled routine with no colour of its own (see above). */
export function unfiledFamily(): FolderFamily {
  if (activeColorTheme === "centium") return PURPLE;
  let f = unfiledCache.get(activeColorTheme);
  if (!f) {
    f = { head: themeHex(PURPLE.head), tile: themeHex(PURPLE.tile), row: themeHex(PURPLE.row), bar: themeHex(PURPLE.bar), play: themeHex(PURPLE.play) };
    unfiledCache.set(activeColorTheme, f);
  }
  return f;
}

/**
 * The picker, in order: twelve colours (2026-09-30). Every folder and routine
 * colour picker reads this one list, and every entry has a family below.
 */
export const FOLDER_SWATCHES: readonly { color: string; name: string }[] = [
  { color: "#7D6BB5", name: "Lavender" },
  { color: "#6F9993", name: "Teal" },
  { color: "#4C8FD1", name: "Blue" },
  { color: "#5B5FC7", name: "Indigo" },
  { color: "#7A4E9C", name: "Plum" },
  { color: "#9C4F7C", name: "Berry" },
  { color: "#D9695F", name: "Coral" },
  { color: "#B8683F", name: "Terracotta" },
  { color: "#D9A441", name: "Gold" },
  { color: "#5E9A6B", name: "Sage" },
  { color: "#5A6B7D", name: "Slate" },
  { color: "#241F1B", name: "Black" },
];

// Lavender and teal are the handover's two families, literally. The other
// ten are NOT from the handover: each keeps its swatch's hue (saturation
// capped at the handover's ~58%) and takes the lightest shade that still
// reads under white text, measured as WCAG contrast with white: header
// (white name) >= 3:1, tile (white icon) >= 5:1, bar >= 3.4:1, play (white
// icon) >= 3.6:1; the row tint is 95% light and carries dark text (>= 13:1).
// Black is set by hand to be black, not a hue-derived brown: charcoal header
// #45403B (10.3:1), near-black tile #1C1917. Rows stay light in dark mode
// The rows are light in light mode only: dark mode derives its own shades
// from each family (themedFamily, loggerShades(family, true)).
export const FOLDER_FAMILIES: Record<string, FolderFamily> = {
  "#7D6BB5": PURPLE,
  "#6F9993": TEAL,
  "#4C8FD1": { head: "#5E99D4", tile: "#3072B3", row: "#EBF2FA", bar: "#4E8FD0", play: "#468ACE" },
  "#5B5FC7": { head: "#8B8ED7", tile: "#4146BE", row: "#ECECF9", bar: "#6F72CE", play: "#676BCB" },
  "#7A4E9C": { head: "#A886C3", tile: "#8555AA", row: "#F3EEF7", bar: "#A17CBE", play: "#9D77BB" },
  "#9C4F7C": { head: "#C082A6", tile: "#A45383", row: "#F6EEF3", bar: "#BA769D", play: "#B66F99" },
  "#D9695F": { head: "#D97970", tile: "#C54034", row: "#FAECEB", bar: "#D56B62", play: "#D3645A" },
  "#B8683F": { head: "#C98461", tile: "#A35C38", row: "#F8F0EC", bar: "#C37750", play: "#C1734B" },
  "#D9A441": { head: "#BB8B32", tile: "#8D6925", row: "#FAF4EB", bar: "#AF822F", play: "#AB7F2E" },
  "#5E9A6B": { head: "#67A274", tile: "#497854", row: "#EFF5F1", bar: "#5D986A", play: "#5A9366" },
  "#5A6B7D": { head: "#8596A7", tile: "#5F7184", row: "#F0F2F4", bar: "#7B8DA0", play: "#75889C" },
  "#241F1B": { head: "#45403B", tile: "#1C1917", row: "#EFEDEB", bar: "#5A544E", play: "#45403B" },
};

/**
 * A folder's family. A folder nobody has coloured (the seeded Strength and
 * Hypertrophy among them) alternates the two handover families in folder
 * order: Strength lavender, Hypertrophy teal.
 */
export function folderFamily(folder: RoutineFolder, order: number): FolderFamily {
  if (folder.color && FOLDER_FAMILIES[folder.color]) return FOLDER_FAMILIES[folder.color];
  return order % 2 === 0 ? PURPLE : TEAL;
}

/**
 * The picker colour a folder shows: its saved colour when that is one of the
 * families, else the alternation by its place in the folder list (the seeded
 * Strength lavender, Hypertrophy teal). Saved on creation, and written once
 * for older folders, so a reorder never repaints a folder.
 */
export function displayedFolderColor(folder: Pick<RoutineFolder, "color">, order: number): string {
  if (folder.color && FOLDER_FAMILIES[folder.color]) return folder.color;
  return order % 2 === 0 ? "#7D6BB5" : "#6F9993";
}

/** A folder whose colour is not saved as one of the families (so it would follow its position). */
export const needsSavedColor = (folder: Pick<RoutineFolder, "color">): boolean =>
  !folder.color || !FOLDER_FAMILIES[folder.color];

/**
 * A routine's family, per handover 03 `resolveColor`: its parent folder's
 * colour → the routine's own colour (unfiled) → Primary Lavender #AEA1DC,
 * whose family is the lavender one.
 */
export function routineFamily(routine: Pick<Routine, "folderId" | "color"> | null | undefined, folders: RoutineFolder[]): FolderFamily {
  if (!routine) return unfiledFamily();
  const folder = routine.folderId ? folders.find((f) => f.id === routine.folderId) : undefined;
  if (folder) return folderFamily(folder, folders.indexOf(folder));
  // Every routine is saved with a colour, and the default is the Lavender
  // swatch (CreateRoutineSheet, services/routines), so Lavender on an unfiled
  // routine is the theme's colour (batch E), as is no colour at all.
  if (!routine.color || routine.color === "#7D6BB5") return unfiledFamily();
  return FOLDER_FAMILIES[routine.color] || unfiledFamily();
}

/**
 * The logger's shades of a folder family (WO8): weight/reps field fill,
 * field border, typed-number ink, pinned-note banner and rest-divider line.
 * Lavender and teal are measured literally from the WO8 frame (teal: fields
 * #E3F0ED / #CEDFDB / #3F6F66, banner #EEF6F4, rest line #C9DAD7; lavender:
 * fields #E9E5FB / #D8D1F3 / #5B47BF). The frame has no lavender banner or
 * rest line, and no shades for the other four picker colours, so those are
 * DERIVED with the ratios the teal frame values sit at: banner 10% and rest
 * line 34.6% of `play` on white, border 31.4%, field 18%, ink = tile 15%
 * toward black.
 */
export interface LoggerShades {
  field: string;
  fieldBorder: string;
  ink: string;
  banner: string;
  restLine: string;
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function loggerShades(family: FolderFamily, dark = false): LoggerShades {
  if (dark) {
    // Mobile v5.1 R3, dark mode (no light islands): the same hue as a tint
    // on the dark card, at the strengths the other dark tints use, and the
    // typed-number ink lifted toward white until it reads at 6:1 on the field.
    const field = tintOn(family.play, 0.2);
    return {
      field,
      fieldBorder: tintOn(family.play, 0.38),
      ink: liftTo(family.play, field, 6),
      banner: tintOn(family.play, 0.12),
      restLine: tintOn(family.play, 0.42),
    };
  }
  const derived: LoggerShades = {
    field: mixHex("#FFFFFF", family.play, 0.18),
    fieldBorder: mixHex("#FFFFFF", family.play, 0.314),
    ink: mixHex(family.tile, "#000000", 0.15),
    banner: mixHex("#FFFFFF", family.play, 0.1),
    restLine: mixHex("#FFFFFF", family.play, 0.346),
  };
  if (family === TEAL) return { field: "#E3F0ED", fieldBorder: "#CEDFDB", ink: "#3F6F66", banner: "#EEF6F4", restLine: "#C9DAD7" };
  if (family === PURPLE) return { ...derived, field: "#E9E5FB", fieldBorder: "#D8D1F3", ink: "#5B47BF" };
  return derived;
}

/**
 * The WO17 active-workout bar: the folder family's dark (tile) shade behind
 * white text, and a lighter tint for the progress line. Per 03 "WO17" a
 * routine with no folder falls back to #7D67D9. The lighter tints are
 * measured from the WO17 frame (teal #A2C8C2, lavender #C2B3FA); the frame
 * has none for the other folder colours or the no-folder fallback, so those
 * are DERIVED: the bar colour 55% of the way to white.
 */
/**
 * The lowest opacity at which a logger field's placeholder (last session's or
 * the template's value, drawn in the field's ink) reads at 4.5:1 on the field.
 * 46% measures about 2:1. Used in dark mode only (light keeps 46%).
 */
export function placeholderOpacity(ink: string, field: string): number {
  const a = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(field.slice(i, i + 2), 16));
  for (let op = 0.46; op < 1; op += 0.01) {
    const mixed = "#" + a.map((v, i) => Math.round(v * op + b[i] * (1 - op)).toString(16).padStart(2, "0")).join("");
    if (contrastRatio(mixed, field) >= 4.5) return Math.round(op * 100) / 100;
  }
  return 1;
}

export function activeBarShades(
  routine: Pick<Routine, "folderId"> | null | undefined,
  folders: RoutineFolder[],
  dark = false
): { bg: string; line: string } {
  const folder = routine?.folderId ? folders.find((f) => f.id === routine.folderId) : undefined;
  // No folder: the board's #7D67D9 in light mode (decision 14); dark mode
  // keeps #7D6BB5 (primary.deep), which carries the white text at 4.5:1.
  // Batch E: it follows the colour theme like the unfiled family.
  const none = dark ? themeHex("#7D6BB5", "dark") : themeHex("#7D67D9");
  if (!folder) return { bg: none, line: mixHex(none, "#FFFFFF", 0.55) };
  const family = folderFamily(folder, folders.indexOf(folder));
  if (family === TEAL) return { bg: TEAL.tile, line: "#A2C8C2" };
  if (family === PURPLE) return { bg: PURPLE.tile, line: "#C2B3FA" };
  return { bg: family.tile, line: mixHex(family.tile, "#FFFFFF", 0.55) };
}

/**
 * THE INK ON A FOLDER HEADER: near-black on the light colours, white on the
 * dark one (2026-10-05). The headers are light enough that white text sat as
 * low as 2.06:1 (teal) and 2.57:1 (lavender); near-black reaches 5.7:1 or
 * more on all eleven of those, and only Black's charcoal header needs white
 * (10.3:1). Chosen by measured contrast rather than listed by hand, so a new
 * family is covered too. Headers are the same in light and dark mode, so
 * this does not depend on the theme. The tile inside the header keeps its
 * white icon: that sits on the dark `tile` shade, not on the header.
 */
export const HEAD_INK_DARK = "#1C1917";

function luminance(hex: string): number {
  return [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
}

export function contrastRatio(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * The folder's play shade where it carries TEXT rather than an icon: white
 * text on it (Finish Workout) or it as text on white (the rest timer, set
 * values). `play` is tuned for white icons at 3.6:1, under the 4.5:1 text
 * needs, so this is the same hue scaled down until it clears 4.5:1 both
 * ways (white on it equals it on white). Families already there are unchanged.
 */
export function playText(family: Pick<FolderFamily, "play">): string {
  if (contrastRatio("#FFFFFF", family.play) >= 4.5) return family.play;
  const rgb = [1, 3, 5].map((i) => parseInt(family.play.slice(i, i + 2), 16));
  for (let f = 0.995; f > 0.3; f -= 0.005) {
    const hex = "#" + rgb.map((v) => Math.round(v * f).toString(16).padStart(2, "0")).join("").toUpperCase();
    if (contrastRatio("#FFFFFF", hex) >= 4.5) return hex;
  }
  return "#1C1917";
}

/**
 * The play shade as TEXT on the surface around it (the rest timer, the menu's
 * rest value): the board's play shade itself in light mode (decision 14); in
 * dark mode the hue lifted toward white until it reads at 4.5:1 on the raised
 * dark surface, the lightest one it sits on.
 */
export function playInk(family: Pick<FolderFamily, "play">, dark: boolean): string {
  return dark ? liftTo(family.play, DARK_SURFACE.raised) : family.play;
}

/**
 * MOBILE v5.1 DARK SURFACES (Foundations 2.1 "Dark mode surfaces"), as hex for
 * the places that compute colours in script rather than through the tokens.
 * soft is surface.soft rgba(238,239,242,0.04) flattened onto the card.
 */
export const DARK_SURFACE = { page: "#121317", card: "#1C1F28", raised: "#262932", soft: "#242730" } as const;

/**
 * A hue as a tint on a dark surface: the handover's dark tints are the hue at
 * a low opacity over the card (primary.tint 14%, secondary.tint 16%), so this
 * is that, flattened to a hex.
 */
export function tintOn(hue: string, amount: number, bg: string = DARK_SURFACE.card): string {
  return mixHex(bg, hue, amount);
}

/**
 * A hue as text or an icon on a dark surface: unchanged if it already reaches
 * `ratio` against `bg`, else moved toward white in 1% steps until it does.
 */
export function liftTo(hue: string, bg: string, ratio = 4.5): string {
  for (let t = 0; t <= 1; t += 0.01) {
    const c = mixHex(hue, "#FFFFFF", t);
    if (contrastRatio(c, bg) >= ratio) return c;
  }
  return "#FFFFFF";
}

/**
 * A family's shades for the current mode. Light mode is the family itself.
 * Dark mode keeps tile and play (filled shades under white icons and text)
 * and the bar (unless it falls under 3:1 on the dark row), and turns the
 * light surfaces dark: the routine row is the play hue at 16% on the card
 * (secondary.tint's strength) and the folder header at 42%, which carries
 * white text (headInk picks it by contrast).
 */
export function themedFamily(family: FolderFamily, dark: boolean): FolderFamily {
  if (!dark) return family;
  const row = tintOn(family.play, 0.16);
  // The accent bar is the folder colour on the row: kept at 3:1 there (only
  // Black needs lifting, from 2.07:1).
  return { ...family, row, head: tintOn(family.play, 0.42), bar: liftTo(family.bar, row, 3) };
}

export function headInk(family: Pick<FolderFamily, "head">): string {
  return contrastRatio("#FFFFFF", family.head) >= contrastRatio(HEAD_INK_DARK, family.head) ? "#FFFFFF" : HEAD_INK_DARK;
}

/** The header's secondary line (the item count): the same ink at 86%, as the design's white was. */
export function headInkSoft(family: Pick<FolderFamily, "head">): string {
  return headInk(family) === "#FFFFFF" ? "rgba(255,255,255,0.86)" : "rgba(28,25,23,0.86)";
}

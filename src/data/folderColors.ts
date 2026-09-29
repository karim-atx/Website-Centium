import type { Routine, RoutineFolder } from "../types";

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

// A folder can still be given any of the six picker colours. The handover
// only has shades for lavender and teal; the other four are DERIVED, not
// from the handover: each keeps its picker colour's hue, and takes the
// saturation step and lightness the two specified families use for each
// role on average (saturation capped at the handover's own ~58%).
export const FOLDER_FAMILIES: Record<string, FolderFamily> = {
  "#7D6BB5": PURPLE,
  "#6F9993": TEAL,
  "#4C8FD1": { head: "#84B1DE", tile: "#3277BB", row: "#EBF2FA", bar: "#488BCE", play: "#4E8FD0" },
  "#9C4F7C": { head: "#DE85B9", tile: "#AE3F80", row: "#FAEBF4", bar: "#C15594", play: "#C45998" },
  "#D9A441": { head: "#DEBF84", tile: "#BB8B32", row: "#FAF5EB", bar: "#CE9F48", play: "#D0A24E" },
  "#241F1B": { head: "#C4AF9E", tile: "#8E745F", row: "#F7F2ED", bar: "#A28974", play: "#A68D78" },
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
 * A routine's family, per handover 03 `resolveColor`: its parent folder's
 * colour → the routine's own colour (unfiled) → Primary Lavender #AEA1DC,
 * whose family is the lavender one.
 */
export function routineFamily(routine: Pick<Routine, "folderId" | "color"> | null | undefined, folders: RoutineFolder[]): FolderFamily {
  if (!routine) return PURPLE;
  const folder = routine.folderId ? folders.find((f) => f.id === routine.folderId) : undefined;
  if (folder) return folderFamily(folder, folders.indexOf(folder));
  return (routine.color && FOLDER_FAMILIES[routine.color]) || PURPLE;
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

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function loggerShades(family: FolderFamily): LoggerShades {
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

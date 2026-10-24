// Centium landing v29: the dashboard's live patch layers (handover
// 08_prototype-source/centium-phone-v15.js, data unchanged). Rects are in
// screenshot pixels of the 473 x 1600 screens (04 is 488 x 1600); each patch
// animates its src crop into its dst crop. morph: a 03 rect to its 04 rect
// (Day closed). slots / cards / check are the prototype's own notes, kept for
// reference.

export type PatchKind = "fade" | "roll" | "wipeR" | "wipeU" | "pop" | "ring" | "bloom" | "slide" | "count";
export type Rect = [number, number, number, number];

export interface PatchDef {
  r: Rect;
  k: PatchKind;
  a: number;
  b: number;
  x: { a0: number; a1: number } | { from: number; to: number; comma?: boolean } | null;
  cv: [string, string];
}

export interface PatchTrack {
  src: number;
  dst: number;
  list: PatchDef[];
}

export interface PhoneData {
  W: number;
  H: number;
  T: Record<"hero" | "nut" | "train" | "health", PatchTrack>;
  morph: [Rect, Rect][];
  slots: Record<string, Rect>;
  cards: Record<string, Rect>;
}

export const PHONE: PhoneData = {
  W: 473,
  H: 1600,
  T: {
    hero: {
      src: 0,
      dst: 1,
      list: [
        { r: [24, 728, 204, 96], k: "fade", a: 0.05, b: 0.35, x: null, cv: ["#f4e4e3", "#f4e3e3"] },
        { r: [250, 736, 180, 80], k: "fade", a: 0.15, b: 0.45, x: null, cv: ["#e8f2f1", "#e8f2f2"] },
        { r: [26, 876, 196, 96], k: "fade", a: 0.25, b: 0.55, x: null, cv: ["#eaefe5", "#eaf0e5"] },
        { r: [200, 1185, 90, 38], k: "roll", a: 0.3, b: 0.6, x: null, cv: ["#f2f1f9", "#f2f1f9"] },
        { r: [280, 1193, 162, 28], k: "fade", a: 0.45, b: 0.65, x: null, cv: ["#f2f1f9", "#f2f1f8"] },
        { r: [116, 1239, 248, 28], k: "wipeR", a: 0.35, b: 0.7, x: null, cv: ["#f2f1f9", "#f2f1f9"] },
        { r: [116, 1271, 248, 26], k: "wipeR", a: 0.4, b: 0.75, x: null, cv: ["#f2f1f9", "#f2f1f9"] },
        { r: [116, 1302, 248, 30], k: "wipeR", a: 0.45, b: 0.8, x: null, cv: ["#f2f1f9", "#f2f1f9"] },
        { r: [376, 1237, 70, 26], k: "roll", a: 0.5, b: 0.8, x: null, cv: ["#f2f1f9", "#f2f1f9"] },
        { r: [376, 1270, 70, 26], k: "roll", a: 0.55, b: 0.85, x: null, cv: ["#f2f1f9", "#f2f1f9"] },
        { r: [380, 1302, 66, 26], k: "roll", a: 0.6, b: 0.9, x: null, cv: ["#f2f1f9", "#f2f1f9"] },
        { r: [144, 364, 152, 30], k: "roll", a: 0.62, b: 0.82, x: null, cv: ["#9998ce", "#899fbf"] },
        { r: [388, 428, 42, 58], k: "fade", a: 0.68, b: 0.88, x: null, cv: ["#87b8b3", "#92bfbb"] },
      ],
    },
    nut: {
      src: 1,
      dst: 2,
      list: [
        { r: [72, 32, 186, 44], k: "roll", a: 0, b: 0.25, x: null, cv: ["#ffffff", "#ffffff"] },
        { r: [198, 1185, 150, 38], k: "roll", a: 0.1, b: 0.6, x: null, cv: ["#f2f1f9", "#f2f1f9"] },
        { r: [340, 1191, 106, 30], k: "fade", a: 0.5, b: 0.7, x: null, cv: ["#f2f1f9", "#f2f1f9"] },
        { r: [116, 1237, 250, 32], k: "wipeR", a: 0.15, b: 0.6, x: null, cv: ["#f2f0fb", "#f2f1f9"] },
        { r: [116, 1269, 250, 28], k: "wipeR", a: 0.22, b: 0.67, x: null, cv: ["#f2f1fb", "#f2f1f9"] },
        { r: [116, 1301, 250, 32], k: "wipeR", a: 0.29, b: 0.74, x: null, cv: ["#f1f1f9", "#f2f1f9"] },
        { r: [374, 1237, 72, 26], k: "roll", a: 0.3, b: 0.75, x: null, cv: ["#f2f1f9", "#f2f1f9"] },
        { r: [378, 1270, 68, 26], k: "roll", a: 0.35, b: 0.8, x: null, cv: ["#f2f1f9", "#f2f1f9"] },
        { r: [380, 1302, 66, 26], k: "roll", a: 0.4, b: 0.85, x: null, cv: ["#f2f1f9", "#f2f1f9"] },
      ],
    },
    train: { src: 1, dst: 2, list: [{ r: [34, 1045, 86, 86], k: "ring", a: 0.05, b: 0.85, x: { a0: 0, a1: 180 }, cv: ["#eeeff2", "#eeeff2"] }] },
    health: {
      src: 1,
      dst: 2,
      list: [
        { r: [24, 730, 204, 96], k: "fade", a: 0, b: 0.3, x: null, cv: ["#faeeec", "#fbedec"] },
        { r: [24, 866, 200, 104], k: "fade", a: 0.1, b: 0.4, x: null, cv: ["#ebf0e5", "#eaf0e4"] },
        { r: [248, 868, 66, 34], k: "roll", a: 0.2, b: 0.4, x: null, cv: ["#ebf4fa", "#ebf4fb"] },
        { r: [248, 932, 66, 26], k: "wipeR", a: 0.2, b: 0.5, x: null, cv: ["#ebf4fa", "#ebf4fb"] },
        { r: [144, 364, 152, 30], k: "roll", a: 0.35, b: 0.5, x: null, cv: ["#9998ce", "#899fbf"] },
        { r: [392, 428, 38, 58], k: "pop", a: 0.4, b: 0.56, x: null, cv: ["#88b9b4", "#92bfbb"] },
        { r: [144, 318, 40, 50], k: "roll", a: 0.45, b: 0.6, x: null, cv: ["#9c9acf", "#9698ce"] },
        { r: [24, 298, 126, 174], k: "bloom", a: 0.55, b: 1, x: null, cv: ["#cecde7", "#9898cf"] },
      ],
    },
  },
  morph: [
    [
      [0, 18, 473, 66],
      [0, 18, 488, 66],
    ],
    [
      [0, 82, 473, 62],
      [0, 85, 488, 66],
    ],
    [
      [10, 148, 453, 136],
      [10, 153, 468, 90],
    ],
    [
      [10, 288, 453, 228],
      [10, 245, 468, 236],
    ],
    [
      [10, 518, 453, 146],
      [10, 484, 468, 150],
    ],
    [
      [10, 660, 453, 26],
      [10, 630, 468, 26],
    ],
    [
      [10, 686, 453, 146],
      [10, 656, 468, 152],
    ],
    [
      [10, 832, 453, 148],
      [10, 806, 468, 152],
    ],
    [
      [10, 980, 453, 190],
      [10, 960, 468, 196],
    ],
    [
      [10, 1170, 453, 192],
      [10, 1158, 468, 192],
    ],
    [
      [10, 1366, 453, 90],
      [10, 1358, 468, 90],
    ],
    [
      [10, 1488, 453, 112],
      [10, 1486, 468, 114],
    ],
  ],
  slots: { food: [19, 1175, 435, 182], workout: [21, 984, 431, 182], heart: [20, 690, 213, 139], remind: [20, 154, 433, 124] },
  cards: { c5: [29, 636, 415, 329], c6: [25, 463, 423, 676] },
};

// Centium landing v29: brand vectors used by the landing. The C and the leaf
// are the app's official paths (src/components/icons/CentiumMark.tsx, byte
// for byte the handover's P.c / P.leaf); the vein is the leaf's centre line
// from the prototype's P.vein, drawn on by LO2.

export { MARK_C_PATH, MARK_LEAF_PATH } from "../../components/icons/CentiumMark";

export const LEAF_VEIN_PATH =
  "M 826.4 666.35 C 798.14 691.54 767.08 713.92 733.26 731.05 C 709.64 743.01 684.5 751.2 660.56 762.34 C 647.16 768.59 634.45 775.89 621.94 783.74 C 616.43 787.2 611.29 791.99 605.4 794.73";

/** The marketing lavender of the mark (01_tokens lavender.logo); the app's in-app mark uses its theme colour instead. */
export const LOGO_LAVENDER = "#9C7FF8";
/** The leaf (01_tokens teal.leaf). */
export const LEAF_TEAL = "#8AC4BA";

/** The official "entium" strokes (CentiumMark.tsx ENTIUM_STROKES, viewBox 204 44 849 93), one entry per letter for LO2's reveal. */
export const ENTIUM_LETTERS: { d: string; clip: [number, number] }[] = [
  { d: "M 213 58.5 H 272 M 221.5 82 V 129 M 221.5 89.5 H 267 M 221.5 121.5 H 272", clip: [204, 77] },
  { d: "M 376.5 51 V 129 M 429.5 51 V 129 M 376.5 51 L 429.5 129", clip: [366, 74] },
  { d: "M 532 59.5 H 596 M 564 51 V 129", clip: [528, 72] },
  { d: "M 700 51 V 129", clip: [688, 24] },
  { d: "M 814.5 51 V 95.5 A 26 26 0 0 0 866.5 95.5 V 51", clip: [802, 77] },
  { d: "M 980 129 V 51 L 1012 111 L 1044 51 V 129", clip: [968, 88] },
];

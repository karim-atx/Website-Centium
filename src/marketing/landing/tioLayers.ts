// Landing update (C17): Tio's kinds and the bowl's layers, shared by the band
// markup (sections/Band.tsx) and its motion (motion/tio.ts).

export type TioKind = "surf" | "meditate" | "bowl";
/** The bowl's eight layers in draw order (one 311 x 280 frame, assets INDEX.md). */
export const BOWL_LAYERS = ["base", "spinach-back", "apple", "orange", "banana", "spinach-front", "blueberries", "rim"] as const;

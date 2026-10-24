// Centium landing v29: how the lazy below-the-fold sections reach the
// code-split scroll engine. Home provides one host for the life of the page;
// a section registers its EngineSection with add() as it mounts (queued until
// the motion chunk has arrived) and removes it when it unmounts.

import { createContext } from "react";
import type { EngineSection } from "./engine/scrollEngine";

export interface SectionHost {
  /** Reduced motion for this page (the device or app setting, or an rm loader entry). */
  rm: boolean;
  /** Low quality (?q=low). */
  low: boolean;
  /** Register a section with the engine; returns its remover. */
  add(section: EngineSection): () => void;
  /** Ask for a scroll pass (a carousel scrolled). */
  invalidate(): void;
  /** Re-read the whole layout (content changed). */
  measure(): void;
}

export const SectionHostContext = createContext<SectionHost | null>(null);

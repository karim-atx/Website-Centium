// Centium landing v29: starts the code-split page motion (motion/page.ts:
// the chapter mark above the title) for a marketing page other than the
// landing, and stops it when the page unmounts.

import { useLayoutEffect } from "react";
import { lowQuality, reducedMotion } from "./engine/env";
import type { ScrollEngine } from "./engine/scrollEngine";

export function usePageMotion() {
  useLayoutEffect(() => {
    let dead = false;
    let engine: ScrollEngine | null = null;
    import("./motion/page")
      .then((m) => {
        if (!dead) engine = m.startPage(reducedMotion(), lowQuality());
      })
      .catch(() => {
        /* without it the mark stays at its first state; the title still reads */
      });
    return () => {
      dead = true;
      engine?.stop();
    };
  }, []);
}

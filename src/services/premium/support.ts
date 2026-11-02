import { useEffect } from "react";

// ---- Get support keeps prompts away (decision G6) ----

let supportSurfaces = 0;

/** True while Get support's popup is open anywhere in the app. */
export const supportOpen = (): boolean => supportSurfaces > 0;

/** GetSupportPopup marks itself while open, so no upgrade prompt opens over it. */
export function useMarkSupportSurface(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    supportSurfaces += 1;
    return () => {
      supportSurfaces -= 1;
    };
  }, [open]);
}

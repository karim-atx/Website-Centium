# Landing fix (rounds 6 to 8): implementation notes

Handover: `handoff-landing-fix` (eight fixes, F1 to F8, to the Centium landing page). Branch `fix/landing-fix-r6-r8`. Frontend only: no Database-Atraxia or Admin-Centium change (BACKEND.md).

## Where each fix lives

| Fix | Files |
|---|---|
| F1 records timeline on phones | `landing/sections/pillars/PaneHealth.tsx` (`RecordsList`; desktop `RecordsGrid` unchanged) |
| F2 pinned stages fit the screen | `landing/motion/fitPin.ts` (`fitStage`, `fitPaneBox`, `useFit`), `sectionVals.ts` (`pinH`), `Pillars.tsx`, `Coaching.tsx`, `Ecosystem.tsx`, `landing.css` (`[data-fitpin]` no-shrink) |
| F3 soft divider edges | `landing/lines/bands.ts` (fade pass, DPR listener), `landing/sections/Band.tsx` (no mask, clip-path), `landing/motion/tio.ts` (Tio's box kept inside the canvas) |
| F4 06 indicator below the cards | `fitPin.ts` (`fitEcoPhone`), `eco/MobileGraphic.tsx` (min-height) |
| F5 footer audience links | `landing/audience.ts`, `components/Footer.tsx`, `pages/Home.tsx`, `Ecosystem.tsx` |
| F6 dividers never disappear | `landing/motion/bands.ts`, `Band.tsx` (still image), `landing/assets/dividers/` |
| F7 pillar cards on phones | `fitPin.ts` (`fitPillarsPhone`), `PaneHealth.tsx` (`data-rec`) |
| F8 reveals follow the scroll | `landing/motion/chapters.ts`, `landing/engine/scrollEngine.ts` (re-measure), `landing/motion/anim.ts` (reduced motion), `landing/sections/ChapterMark.tsx` |

CHANGES.md paths that differ in the repo: the layout-values hook is `sectionVals()` in `landing/sections/sectionVals.ts`; `ChapterMark.tsx` is in `landing/sections/`, not `landing/components/`; the footer is `src/marketing/components/Footer.tsx`; the fit hook is `landing/motion/fitPin.ts` as suggested.

## Decisions

- **Fit measurement (F2):** the content block is the union of the visible leaves and of every box that clips its content, skipping anything under `display: none` or `opacity: 0`. 03's hidden panes are drifted up to 81px down by the cross-fade and would otherwise count.
- **Measured scales differ from SPEC's table for 06:** here 06's content block is 846px at 1440 wide (the h2 wraps to two lines), so rule 3 gives s = 0.946 at 1440 × 900, not 1. SPEC's own "before" stage height (1020px) implies the same block. Every case keeps the content between 84px and 16px from the bottom, and the indicator 33 to 42px below the cards.
- **Scale floor:** 03 in Arabic at 1280 × 720 needs 0.698, under the recommended 0.72. Allowed, as in the prototype (open decision in SPEC).
- **Phone pillar zoom (F7):** the whole pane graphic is zoomed, as in the prototype and SPEC's measured factors. So on the three short phones the Health records' 12px labels render at 12 × zoom (10.1 to 11px). SPEC's line "the 12px records labels are not scaled" cannot hold together with its own measured Health factors (×0.849 to ×0.918). Open decision.
- **Zoom target:** aimed 1px under the limit and rounded down, because zoomed layout snaps to sub-pixel steps.
- **Divider stills:** WebP as delivered; PNGs recompressed losslessly (pixel-identical, 18 to 20% smaller). Vite URLs, requested only when a still is shown. No AVIF.
- **Tio inside the canvas (F3 rule 4):** a clamp in `tio.ts` that allows for his tilt; the surfer could rise 5px above the canvas at 1024 × 768.
- **Reduced motion `data-w`:** every element is in its final state. A fade-out (`data-out`) or travelling sweep ends hidden, as in the prototype's patched helper.
- **Not done here:** real-device checks (iOS Safari, Android Chrome), Safari macOS and Firefox. All measurement was in headless Chrome.

## Review-only switches

`?bandclip=1` and `?bandfail=1` from the prototype are not built.

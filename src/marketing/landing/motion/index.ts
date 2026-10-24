// Centium landing v29: the code-split motion chunk. The landing page (eager)
// imports this with import() once it has rendered, so the web app's main
// bundle carries none of it. It wires the scroll engine, the intro/hero, the
// dashboard phone, the navbar scroll-spy and the (separately code-split)
// intro line field. Later sections register their own EngineSections through
// the returned controller.

import { lowQuality, reducedMotion } from "../engine/env";
import { ScrollEngine, type EngineSection } from "../engine/scrollEngine";
import type { LoaderEntry } from "../loading/pickLoader";
import { landingState, spyClick } from "../state";
import { IntroMotion } from "./intro";
import { PhoneMotion } from "./phone";

export interface LandingMotion {
  engine: ScrollEngine;
  intro: IntroMotion;
  /** Re-read layout (viewport resize, fonts, content change). */
  measure(): void;
  /** Register a section with the engine; returns its remover. */
  add(section: EngineSection): () => void;
  stop(): void;
}

/** The navbar scroll-spy (prototype onScroll: the section crossing 40% of the
 *  viewport; a nav click holds its own choice for 900 ms). */
function spySection(): EngineSection {
  const ids: [string, string][] = [
    ["platform", "pl-track"],
    ["pricing", "pricing"],
    ["faq", "faq"],
  ];
  return {
    scroll(_y, ctx) {
      const vh = ctx.vh;
      let spy: string | null = null;
      ids.forEach(([k, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top <= vh * 0.4 && r.bottom > vh * 0.4) spy = k;
      });
      if (spy !== landingState.get().spy && !(Date.now() - spyClick.at < 900)) landingState.set({ spy });
    },
  };
}

export function startLanding(entry: LoaderEntry): LandingMotion {
  const rm = entry.mode === "rm" || reducedMotion(),
    low = lowQuality();
  const engine = new ScrollEngine({ rm, low });
  const phone = new PhoneMotion(rm, () => engine.context.lg);
  const intro = new IntroMotion(phone, entry, rm);
  engine.add(intro);
  engine.add(spySection());
  engine.start();
  let stopped = false;
  import("../lines/strands")
    .then(({ Strands }) => {
      if (stopped) return;
      const cv = document.getElementById("field") as HTMLCanvasElement | null;
      if (!cv || !cv.getContext || !cv.getContext("2d")) return; // no canvas: the still page, no lines
      const s = new Strands(cv, { q: low ? "low" : "high", rm });
      if (!s.w) return;
      intro.attachField(s, engine.context.lg);
      engine.invalidate();
      if (rm) engine.measure();
    })
    .catch(() => {
      /* the lines are decoration: without them the intro still reads */
    });
  if (import.meta.env.DEV) {
    (window as unknown as { __centiumLanding?: unknown }).__centiumLanding = { engine, intro, phone, state: landingState };
  }
  return {
    engine,
    intro,
    measure: () => engine.measure(),
    add: (s) => engine.add(s),
    stop() {
      stopped = true;
      engine.stop();
    },
  };
}

import React, { useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSEO } from "../useSEO";
import { Intro } from "../landing/sections/Intro";
import { introVals } from "../landing/sections/introVals";
import { PhoneStage } from "../landing/phone/PhoneStage";
import { loaderEntryFor } from "../landing/loading/pickLoader";
import { imageTask } from "../landing/loading/loader";
import { addLoadingTask } from "../landing/state";
import { reducedMotion } from "../landing/engine/env";
import { scrollToSection, useMarketingNav } from "../landing/navigation";
import type { LandingMotion } from "../landing/motion";

// Centium landing v29 (handover handoff-centium, prototype "Centium Site
// v29.dc.html"). This page is the eager landing shell: the markup of the
// intro and hero (so the intro title is on the first React frame), the phone
// layer and the fixed canvas for the intro lines. All motion is code-split:
// landing/motion (scroll engine, intro choreography, phone) and
// landing/lines (canvas line engines) arrive by import() after first paint,
// so the web app's main bundle carries none of it. The loading sequence
// (LO1/LO2, MarketingLayout) follows their real progress.
//
// Sections after the hero (section 01 onwards) are added by later batches.

const subscribeViewport = () => ({ vw: window.innerWidth, vh: window.innerHeight });

export const Home: React.FC = () => {
  useSEO("Your health, all in one place", "Centium brings nutrition tracking, workout logging, health tracking and community into one place.");
  const location = useLocation();
  const [entry] = useState(() => loaderEntryFor(location.key, location.pathname, location.hash));
  const [view, setView] = useState(subscribeViewport);
  const motion = useRef<LandingMotion | null>(null);
  const go = useMarketingNav();
  const r = introVals(view.vw);

  // Start the code-split motion and register the real progress the loader waits for.
  useLayoutEffect(() => {
    const motionChunk = import("../landing/motion");
    const linesChunk = import("../landing/lines/strands");
    addLoadingTask(location.key, motionChunk);
    addLoadingTask(location.key, linesChunk);
    document.querySelectorAll<HTMLImageElement>("img[data-eager]").forEach((img) => addLoadingTask(location.key, imageTask(img)));
    if (window.innerWidth >= 1024) {
      document.querySelectorAll<HTMLImageElement>("#phone-food img, #phone-work img").forEach((img) => addLoadingTask(location.key, imageTask(img)));
    }
    let dead = false;
    motionChunk
      .then((m) => {
        if (dead) return;
        motion.current = m.startLanding(entry);
      })
      .catch(() => {
        /* without the motion chunk the page stays at its readable first state */
      });
    return () => {
      dead = true;
      motion.current?.stop();
      motion.current = null;
    };
    // Once per mount; the entry is fixed for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Viewport changes re-render the responsive values, then re-measure (prototype onR).
  useLayoutEffect(() => {
    const onResize = () => {
      const next = subscribeViewport();
      setView((v) => (v.vw === next.vw && v.vh === next.vh ? v : next));
      if (next.vw === view.vw && next.vh === view.vh) motion.current?.measure();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [view]);
  useLayoutEffect(() => {
    motion.current?.measure();
  }, [view]);

  const onSkip = () => {
    const end = motion.current?.intro.end;
    const track = document.getElementById("intro-track"),
      stage = document.getElementById("intro-stage");
    const top = end ?? (track && stage ? track.getBoundingClientRect().top + window.scrollY + track.offsetHeight - stage.clientHeight : null);
    if (top != null) window.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const onPillar = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    scrollToSection("platform");
  };

  const onContact = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go("/contact");
  };

  const twY = entry.mode === "rm" ? "0%" : entry.kind === "lo1" ? "10%" : entry.kind === "lo2" ? "130%" : "0%";
  return (
    <>
      <canvas
        id="field"
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none", display: "block" }}
      />
      <PhoneStage r={r} />
      <Intro
        r={r}
        twY={twY}
        dotOp={entry.kind === "lo1" ? "0" : "1"}
        readyOp={entry.kind ? "0" : "1"}
        onPillar={onPillar}
        onContact={onContact}
        onSkip={onSkip}
      />
    </>
  );
};

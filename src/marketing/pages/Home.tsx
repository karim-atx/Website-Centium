import React, { Suspense, lazy, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSEO } from "../useSEO";
import { t } from "../../i18n/core";
import { Intro } from "../landing/sections/Intro";
import { introVals } from "../landing/sections/introVals";
import { sectionVals } from "../landing/sections/sectionVals";
import { PhoneStage } from "../landing/phone/PhoneStage";
import { anchorHash, loaderEntryFor } from "../landing/loading/pickLoader";
import { imageTask } from "../landing/loading/loader";
import { addLoadingTask, landingState } from "../landing/state";
import { LG, dirSign, lowQuality, reducedMotion } from "../landing/engine/env";
import { scrollToInline } from "../../utils/inlineScroll";
import type { EngineSection } from "../landing/engine/scrollEngine";
import { ANCHOR_OFFSET, anchorTarget, useMarketingNav } from "../landing/navigation";
import { SectionHostContext, type SectionHost } from "../landing/sectionHost";
import type { LandingMotion } from "../landing/motion";

// Centium landing v29 (handover handoff-centium, prototype "Centium Site
// v29.dc.html"). This page is the eager landing shell: the markup of the
// intro and hero (so the intro title is on the first React frame), the phone
// layer and the fixed canvas for the intro lines. Everything else is
// code-split: landing/motion (scroll engine, intro choreography, phone,
// section 01, chapter marks, bands) and landing/lines (canvas line engines)
// arrive by import() after first paint, and the sections after the hero
// (01 to 06, landing/sections/BelowFold) by React.lazy, so neither the first
// paint nor the web app's main bundle carries them. The loading sequence
// (LO1/LO2, MarketingLayout) follows their real progress.

const loadBelowFold = () => import("../landing/sections/BelowFold");
const BelowFold = lazy(loadBelowFold);

const subscribeViewport = () => ({ vw: window.innerWidth, vh: window.innerHeight });

export const Home: React.FC = () => {
  useSEO(t("Your health, all in one place"), t("Centium brings nutrition tracking, workout logging, health tracking and community into one place."));
  const location = useLocation();
  const [entry] = useState(() => loaderEntryFor(location.key, location.pathname, location.hash));
  const [view, setView] = useState(subscribeViewport);
  const motion = useRef<LandingMotion | null>(null);
  const go = useMarketingNav();
  const r = introVals(view.vw);
  const rs = sectionVals(view.vw, view.vh);

  // An #anchor arrival lands again whenever the layout is re-measured (the
  // lazy sections mounting, the hero tail being sized, fonts), until the
  // visitor scrolls themselves or loading has settled.
  const pendingAnchor = useRef<string | null>(anchorHash(location.hash));
  // A mid-page reload (entry.at) is kept the same way (B4 QA): its first
  // scroll (MarketingLayout) runs before the lazy sections exist, so the page
  // was too short and the position was lost (2494 instead of 6000 at 390,
  // the page end at 1440).
  const pendingAt = useRef<number | null>(entry.at);

  // The lazy sections reach the scroll engine through this host; sections
  // that mount before the motion chunk has arrived wait in `queued`.
  const queued = useRef<EngineSection[]>([]);
  const removers = useRef(new Map<EngineSection, () => void>());
  const host = useMemo<SectionHost>(
    () => ({
      rm: entry.mode === "rm" || reducedMotion(),
      low: lowQuality(),
      add(section) {
        if (motion.current) removers.current.set(section, motion.current.add(section));
        else queued.current.push(section);
        return () => {
          queued.current = queued.current.filter((s) => s !== section);
          removers.current.get(section)?.();
          removers.current.delete(section);
        };
      },
      invalidate: () => motion.current?.engine.invalidate(),
      measure: () => motion.current?.measure(),
    }),
    [entry],
  );

  // Start the code-split motion and register the real progress the loader waits for.
  useLayoutEffect(() => {
    const motionChunk = import("../landing/motion");
    const linesChunk = import("../landing/lines/strands");
    addLoadingTask(location.key, motionChunk);
    addLoadingTask(location.key, linesChunk);
    // Arriving on an anchor or mid-page, the loader also covers the sections
    // below the hero, so the page is in place when it lifts.
    if (pendingAnchor.current || entry.at != null) addLoadingTask(location.key, loadBelowFold());
    document.querySelectorAll<HTMLImageElement>("img[data-eager]").forEach((img) => addLoadingTask(location.key, imageTask(img)));
    if (window.innerWidth >= 1024) {
      document.querySelectorAll<HTMLImageElement>("#phone-food img, #phone-work img").forEach((img) => addLoadingTask(location.key, imageTask(img)));
    }
    let dead = false;
    const removeAll = removers.current;
    const stopAnchor = () => {
      pendingAnchor.current = null;
      pendingAt.current = null;
    };
    const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    inputs.forEach((ev) => window.addEventListener(ev, stopAnchor, { passive: true, once: true }));
    let settle = 0;
    const armSettle = () => {
      if (landingState.get().loaded && !settle) settle = window.setTimeout(stopAnchor, 1500);
    };
    const offLoaded = landingState.subscribe(armSettle);
    armSettle();
    motionChunk
      .then((m) => {
        if (dead) return;
        const mo = m.startLanding(entry);
        motion.current = mo;
        queued.current.forEach((s) => removeAll.set(s, mo.add(s)));
        queued.current = [];
        // Keeps a pending anchor (or mid-page reload position) in place after every measure (added after the
        // intro, whose measure sizes the hero tail and so moves everything).
        mo.add({
          measure() {
            const id = pendingAnchor.current,
              el = id ? anchorTarget(id) : null;
            if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - ANCHOR_OFFSET);
            else if (pendingAt.current != null) window.scrollTo(0, pendingAt.current);
          },
        });
      })
      .catch(() => {
        /* without the motion chunk the page stays at its readable first state */
      });
    return () => {
      dead = true;
      inputs.forEach((ev) => window.removeEventListener(ev, stopAnchor));
      window.clearTimeout(settle);
      offLoaded();
      motion.current?.stop();
      motion.current = null;
      removeAll.clear();
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

  const introEnd = () => {
    const end = motion.current?.intro.end;
    const track = document.getElementById("intro-track"),
      stage = document.getElementById("intro-stage");
    return end ?? (track && stage ? track.getBoundingClientRect().top + window.scrollY + track.offsetHeight - stage.clientHeight : null);
  };
  const onSkip = () => {
    const top = introEnd();
    if (top != null) window.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  // Keyboard focus (B4 QA, not in the prototype): the navbar and the hero
  // copy stay in the tab order while the intro keeps them invisible (opacity
  // 0, as in the prototype), so a Tab from the top of the page would focus
  // links nobody can see. Focus landing on one of them while it is hidden
  // skips the intro at once, as the Skip intro button does, so the focused
  // link is on screen with its outline.
  useLayoutEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (!el || !el.closest("#site-nav, #hero-copy")) return;
      let op = 1;
      for (let x: Element | null = el; x; x = x.parentElement) op *= parseFloat(getComputedStyle(x).opacity) || 0;
      const top = introEnd();
      if (op < 0.5 && top != null && window.scrollY < top) window.scrollTo(0, top);
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
    // introEnd reads refs and the DOM only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // HE1 v3 (C3, centium/HE1-pillars.md): each pillar word goes to its own
  // pillar. Desktop: the middle of its step in the pinned track, re-aimed once
  // the smooth scroll has had time to settle (late layout). Phones: the
  // pillars, with that card centred in the carousel.
  const pillarTimer = useRef(0);
  const onPillar = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const i = Number(e.currentTarget.dataset.pil) || 0,
      rm = reducedMotion(),
      behavior: ScrollBehavior = rm ? "auto" : "smooth",
      track = document.getElementById("pl-track");
    if (window.innerWidth >= LG && track) {
      const target = () => track.getBoundingClientRect().top + window.scrollY + (Math.max(0, track.offsetHeight - window.innerHeight) * (i + 0.5)) / 5;
      window.scrollTo({ top: target(), behavior });
      window.clearTimeout(pillarTimer.current);
      // 1100ms later (50ms with reduced motion), more than 8px away: jump
      // there. After a jump it is checked again 150ms later (up to 2s),
      // because Chrome lets a smooth scroll still running carry on past it.
      const t0 = performance.now();
      const aim = () => {
        const y = target();
        if (Math.abs(window.scrollY - y) <= 8) return;
        window.scrollTo({ top: y, behavior: "auto" });
        if (performance.now() - t0 < 2000) pillarTimer.current = window.setTimeout(aim, 150);
      };
      const stop = () => window.clearTimeout(pillarTimer.current);
      (["wheel", "touchstart", "keydown"] as const).forEach((ev) => window.addEventListener(ev, stop, { passive: true, once: true }));
      pillarTimer.current = window.setTimeout(aim, rm ? 50 : 1100);
      return;
    }
    const platform = document.getElementById("platform") ?? track,
      car = document.getElementById("pl-panes"),
      card = car?.children[i] as HTMLElement | undefined;
    if (platform) window.scrollTo({ top: platform.getBoundingClientRect().top + window.scrollY - ANCHOR_OFFSET, behavior });
    if (car && card) {
      // Card i centred: offsetLeft - (clientWidth - offsetWidth) / 2, from the
      // rendered boxes (the panes are zoomed on small phones, which offsets
      // do not include), counted from the reading start.
      const cr = car.getBoundingClientRect(),
        k = card.getBoundingClientRect(),
        d = dirSign() * (k.left + k.width / 2 - (cr.left + cr.width / 2));
      scrollToInline(car, Math.abs(car.scrollLeft) + d, behavior);
    }
  };

  const onContact = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go("/contact");
  };

  const twY = entry.mode === "rm" ? "0%" : entry.kind === "lo1" ? "10%" : entry.kind === "lo2" ? "130%" : "0%";
  return (
    <SectionHostContext.Provider value={host}>
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
      <Suspense fallback={null}>
        <BelowFold r={rs} vw={view.vw} onReady={() => motion.current?.measure()} />
      </Suspense>
    </SectionHostContext.Provider>
  );
};

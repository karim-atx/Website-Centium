import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AppScreen } from "./illustrations/AppScreen";

export interface ShowcaseTab {
  label: string;
  title: string;
  description: string;
  points: string[];
  tone: "primary" | "teal";
  screen: Parameters<typeof AppScreen>[0]["variant"];
}

const PIN_TOP = 72; // sticky nav height — the track pins its section just below it

/** Drives the Home platform section's scroll-through: pins the section under
 *  the nav while the page scrolls past it, and maps that scroll distance to
 *  a tab index — so scrolling down runs the showcase sideways before
 *  releasing into the next section. Ported from the handoff's
 *  `trackPlatform()`. Pins only when the compact layout genuinely fits the
 *  viewport (≥1024×620 and the measured section height clears it);
 *  otherwise this is a no-op and the tabs behave as plain click-to-switch. */
function usePlatformScrollPin(tabCount: number, sectionId: string, trackId: string) {
  const [tab, setTab] = useState(0);
  const [pinned, setPinned] = useState(false);
  const fitsRef = useRef(false);
  const keyRef = useRef("");

  useEffect(() => {
    const onScroll = () => {
      const track = document.getElementById(trackId);
      const sec = document.getElementById(sectionId);
      if (!track || !sec) return;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const key = vw + "x" + vh;
      if (keyRef.current !== key) {
        keyRef.current = key;
        const roomy = vw >= 1024 && vh >= 620;
        setPinned(roomy);
        fitsRef.current = roomy && sec.offsetHeight + PIN_TOP <= vh;
        if (!fitsRef.current) setPinned(false);
      }
      if (!fitsRef.current) {
        if (track.style.height) track.style.height = "";
        return;
      }
      const secH = sec.offsetHeight;
      const step = Math.round(vh * 0.72);
      const want = secH + step * (tabCount - 1);
      if (track.style.height !== want + "px") track.style.height = want + "px";
      const travelled = PIN_TOP - track.getBoundingClientRect().top;
      let i = Math.round(travelled / step);
      if (i < 0) i = 0;
      else if (i > tabCount - 1) i = tabCount - 1;
      setTab((prev) => (prev === i ? prev : i));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [tabCount, sectionId, trackId]);

  const jumpTo = (i: number) => {
    const track = document.getElementById(trackId);
    if (track && track.style.height) {
      const step = Math.round(window.innerHeight * 0.72);
      window.scrollTo({ top: track.offsetTop + step * i - PIN_TOP, behavior: "smooth" });
    } else {
      setTab(i);
    }
  };

  return { tab, pinned, jumpTo };
}

/** Segmented pill tabs above a single panel that swaps content on click ---
 *  the "five pillar cards become one tabbed showcase" pattern from the
 *  hi-fi Home page, reused on Product. Active pill background is dark
 *  (#221E1A) per the hi-fi spec, distinct from the nav's white sliding pill.
 *
 *  `scrollPin` opts into the Home-only scroll-driven behavior above: wrap
 *  this component in `<div id={trackId}>` / `<section id={sectionId}
 *  className="sticky top-[72px]">` and pass matching ids. Without it, this
 *  is the plain click-to-switch showcase used elsewhere. */
export const TabShowcase: React.FC<{
  tabs: ShowcaseTab[];
  scrollPin?: { sectionId: string; trackId: string };
}> = ({ tabs, scrollPin }) => {
  const [clickActive, setClickActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const pin = usePlatformScrollPin(tabs.length, scrollPin?.sectionId ?? "", scrollPin?.trackId ?? "");

  const active = scrollPin ? pin.tab : clickActive;
  const tab = tabs[active];
  const setActive = scrollPin ? pin.jumpTo : setClickActive;
  const pinned = !!scrollPin && pin.pinned;

  return (
    <div>
      {/* A horizontally-scrollable rail rather than wrapping pills - the
          hi-fi mock is explicit that mobile tabs "become a scroll rail"
          rather than stacking to a second row. */}
      <div
        className={clsx("flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0", pinned && "mt-5")}
        role="tablist"
      >
        {tabs.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={clsx(
              "shrink-0 rounded-full border font-semibold whitespace-nowrap transition-colors",
              pinned ? "px-[18px] py-[9px] text-[13.5px]" : "px-5 py-[11px] text-sm",
              i === active
                ? "bg-mkt-ink text-white border-mkt-ink"
                : "bg-white text-mkt-soft border-mkt-line hover:border-mkt-ink/30"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className={clsx(
          "border border-mkt-line rounded-[26px] bg-white overflow-hidden",
          pinned ? "mt-4 p-[22px]" : "mt-7 p-6 sm:p-11"
        )}
      >
        {scrollPin ? (
          <div className="grid grid-cols-1 grid-rows-1">
            {tabs.map((t, i) => (
              <div
                key={t.label}
                className="col-start-1 row-start-1 transition-[opacity,transform] duration-[340ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
                style={{
                  opacity: i === active ? 1 : 0,
                  transform: `translate3d(${i === active ? 0 : i < active ? -34 : 34}px,0,0)`,
                  pointerEvents: i === active ? "auto" : "none",
                }}
                aria-hidden={i !== active}
              >
                <ShowcasePane tab={t} pinned={pinned} />
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab.label}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <ShowcasePane tab={tab} pinned={false} />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

const ShowcasePane: React.FC<{ tab: ShowcaseTab; pinned: boolean }> = ({ tab, pinned }) => (
  <div className={clsx("grid lg:grid-cols-2 items-center", pinned ? "gap-8" : "gap-8 sm:gap-14")}>
    <div>
      <h3
        className={clsx(
          "font-display font-extrabold leading-[1.15] tracking-tight text-mkt-ink",
          pinned ? "text-[23px]" : "text-[26px] sm:text-[30px]"
        )}
      >
        {tab.title}
      </h3>
      <p className="text-[16px] leading-relaxed text-mkt-soft mt-4 max-w-[420px]">{tab.description}</p>
      <ul className="flex flex-col gap-3 mt-[26px]">
        {tab.points.map((p) => (
          <li key={p} className="flex gap-[11px] items-baseline">
            <span className={clsx("font-bold text-[13px]", tab.tone === "primary" ? "text-mkt-accent" : "text-mkt-teal")}>
              —
            </span>
            <span className="text-[15px] text-mkt-ink/85">{p}</span>
          </li>
        ))}
      </ul>
    </div>
    <div
      className={clsx(
        "rounded-[20px] overflow-hidden bg-mkt-wash2 border border-mkt-line",
        pinned ? "h-[228px]" : "h-[280px] sm:h-[400px]"
      )}
    >
      <AppScreen variant={tab.screen} className="rounded-[20px]" />
    </div>
  </div>
);

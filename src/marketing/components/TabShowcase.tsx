import React, { useEffect, useRef, useState } from "react";
import { AppScreen } from "./illustrations/AppScreen";

export interface ShowcaseTab {
  label: string;
  title: string;
  description: string;
  points: string[];
  screen: Parameters<typeof AppScreen>[0]["variant"];
}

const PIN_TOP = 72; // sticky nav height — the track pins its section just below it

// v2 landing handoff: each slide alternates lavender/teal, dark-left to
// light-right — this is the sole source of a slide's color now that the
// pill-tab row (and its own lavender/teal alternation) has been removed.
const PANE_BG = [
  "linear-gradient(90deg,#4E3894 0%,#6F55BE 34%,#A895E0 68%,#E4DCF8 100%)",
  "linear-gradient(90deg,#2F5F58 0%,#4B857C 34%,#8DBDB4 68%,#DDEEEA 100%)",
  "linear-gradient(90deg,#54409B 0%,#7660C4 34%,#AE9DE4 68%,#E7E0F9 100%)",
  "linear-gradient(90deg,#33665E 0%,#508B82 34%,#93C1B9 68%,#E0F0EC 100%)",
];

/** Drives the Home platform section's scroll-through: pins the section under
 *  the nav while the page scrolls past it, and maps that scroll distance to
 *  a tab index — so scrolling down runs the showcase sideways before
 *  releasing into the next section. Pins only when the compact layout
 *  genuinely fits the viewport (≥1024×620 and the measured section height
 *  clears it); otherwise this is a no-op and slides fall back to a plain
 *  stack (no click-to-switch control exists anymore — v2 removed the pill
 *  tabs entirely, so the pinned scroll-through is the only way to move
 *  between slides on a viewport that supports it). */
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

  return { tab, pinned };
}

/** The Platform section's pinned horizontal gallery. No pill tabs — each
 *  slide carries its own large in-slide title (per the v2 handoff, which
 *  explicitly removed the pill row from the earlier design). Falls back to
 *  a plain stacked-cards layout (all slides visible, no pinning) on
 *  viewports too small to pin. */
export const TabShowcase: React.FC<{
  tabs: ShowcaseTab[];
  scrollPin: { sectionId: string; trackId: string };
}> = ({ tabs, scrollPin }) => {
  const { tab: active, pinned } = usePlatformScrollPin(tabs.length, scrollPin.sectionId, scrollPin.trackId);

  if (!pinned) {
    return (
      <div className="flex flex-col gap-5">
        {tabs.map((t, i) => (
          <ShowcasePane key={t.label} tab={t} bg={PANE_BG[i]} />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-[26px] overflow-hidden">
      <div className="grid grid-cols-1 grid-rows-1">
        {tabs.map((t, i) => (
          <div
            key={t.label}
            className="col-start-1 row-start-1 transition-[opacity,transform] duration-500 [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
            style={{
              opacity: i === active ? 1 : 0.2,
              transform: `scale(${i === active ? 1 : 0.94})`,
              pointerEvents: i === active ? "auto" : "none",
            }}
            aria-hidden={i !== active}
          >
            <ShowcasePane tab={t} bg={PANE_BG[i]} />
          </div>
        ))}
      </div>
    </div>
  );
};

const ShowcasePane: React.FC<{ tab: ShowcaseTab; bg: string }> = ({ tab, bg }) => (
  <div className="rounded-[26px]" style={{ background: bg, padding: "clamp(28px,3vw,44px)" }}>
    <div className="font-display font-extrabold text-[34px] leading-[1.05] tracking-[-.03em] text-white mb-[26px]">
      {tab.label}
    </div>
    <div className="grid lg:grid-cols-2 items-center gap-8">
      <div>
        <h3 className="font-display font-extrabold text-[23px] leading-[1.15] tracking-[-.02em] text-white m-0">
          {tab.title}
        </h3>
        <p className="text-base leading-relaxed text-white/90 mt-4 max-w-[420px]" style={{ textWrap: "pretty" }}>
          {tab.description}
        </p>
        <ul className="flex flex-col gap-3 mt-[26px] list-none p-0">
          {tab.points.map((p) => (
            <li key={p} className="flex gap-[11px] items-baseline">
              <span className="font-bold text-[13px] text-white/75">—</span>
              <span className="text-[15px] text-white/92">{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div
        className="rounded-[20px] overflow-hidden bg-white border border-white/50 h-[228px]"
        style={{ boxShadow: "0 22px 54px rgba(30,22,60,.22)" }}
      >
        <AppScreen variant={tab.screen} className="rounded-[20px]" />
      </div>
    </div>
  </div>
);

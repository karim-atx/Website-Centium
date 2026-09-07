import React, { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";

export interface PillarData {
  eyebrowNum: string;
  ink: string;
  accent: string;
  wash: string;
  titleGradient: string;
  titleWord: string;
  h3: string;
  paragraph: string;
  bullets: { color: string; text: string }[];
  graphic: React.ReactNode;
  mockup: React.ReactNode;
}

const PIN_TOP = 72;
const GUTTER = 28;
const TAIL = 0.22;
const HOLD = 0.28;

const LEAF_PATH =
  "M 924.1 543.4 L 915.6 549.5 L 905.6 555.7 L 894 561.9 L 878.6 568.1 L 859.3 574.2 L 830 580.4 L 796.8 586.6 L 768.2 592.8 L 748.1 598.9 L 731.9 605.1 L 718.8 611.3 L 708 617.5 L 698.7 623.6 L 690.2 629.8 L 682.5 636 L 675.5 642.2 L 669.4 648.3 L 664 654.5 L 658.6 660.7 L 653.9 666.9 L 650.1 673.1 L 645.4 679.2 L 641.6 685.4 L 637.7 691.6 L 634.6 697.8 L 631.5 703.9 L 628.5 710.1 L 626.1 716.3 L 623.8 722.5 L 621.5 728.6 L 619.2 734.8 L 617.6 741 L 615.3 747.2 L 613.8 753.3 L 612.2 759.5 L 611.5 765.7 L 609.9 771.9 L 609.2 778 L 608.4 784.2 L 607.6 790.4 L 681.7 796.6 L 671.7 802.8 L 661.7 808.9 L 651.6 815.1 L 643.1 821.3 L 634.6 827.5 L 626.1 833.6 L 618.4 839.8 L 611.5 846 L 603.8 852.2 L 596.8 858.3 L 589.9 864.5 L 582.9 870.7 L 576.7 876.9 L 569.8 883 L 607.6 887.7 L 637.7 887.7 L 684.8 883 L 713.4 876.9 L 734.2 870.7 L 751.2 864.5 L 765.1 858.3 L 778.2 852.2 L 789 846 L 799.1 839.8 L 808.3 833.6 L 816.8 827.5 L 824.5 821.3 L 832.3 815.1 L 839.2 808.9 L 845.4 802.8 L 851.6 796.6 L 857.7 790.4 L 863.2 784.2 L 867.8 778 L 872.4 771.9 L 877 765.7 L 881.7 759.5 L 885.5 753.3 L 889.4 747.2 L 893.3 741 L 896.3 734.8 L 899.4 728.6 L 902.5 722.5 L 905.6 716.3 L 907.9 710.1 L 911 703.9 L 913.3 697.8 L 915.6 691.6 L 917.2 685.4 L 919.5 679.2 L 921.1 673.1 L 922.6 666.9 L 924.1 660.7 L 925.7 654.5 L 927.2 648.3 L 928 642.2 L 929.5 636 L 930.3 629.8 L 931.1 623.6 L 931.9 617.5 L 931.9 611.3 L 932.6 605.1 L 932.6 598.9 L 932.6 592.8 L 931.9 586.6 L 931.9 580.4 L 931.1 574.2 L 930.3 568.1 L 930.3 561.9 L 928.8 555.7 L 928 549.5 L 926.5 543.4 Z M 829.2 668.4 L 826.1 674.6 L 822.2 680.8 L 817.6 686.9 L 813.7 693.1 L 809.1 699.3 L 804.5 705.5 L 799.8 711.7 L 794.4 717.8 L 789 724 L 782.9 730.2 L 776.7 736.4 L 769.7 742.5 L 762.8 748.7 L 755.1 754.9 L 746.6 761.1 L 737.3 767.2 L 727.3 773.4 L 715.7 779.6 L 703.3 785.8 L 691 791.9 L 683.3 795.8 L 656.2 809.3 L 589.5 809.3 L 608.4 795.8 L 613.8 791.9 L 622.3 785.8 L 632.3 779.6 L 643.1 773.4 L 655.5 767.2 L 668.6 761.1 L 684 754.9 L 699.5 748.7 L 714.2 742.5 L 727.3 736.4 L 739.6 730.2 L 751.2 724 L 761.2 717.8 L 771.3 711.7 L 779.8 705.5 L 789 699.3 L 797.5 693.1 L 805.2 686.9 L 813 680.8 L 819.9 674.6 L 826.9 668.4 Z";

/** The Platform section's pinned horizontal rail — ported from the landing
 *  handoff's own `initPlatformPin()`, including the parts the earlier v3
 *  build never carried over:
 *
 *  1. The *whole* section (heading + rail) pins together as one sticky unit
 *     at `top: 72px` — the heading isn't a separate scrolling block above
 *     it, it's inside the same sticky element as the rail, per the handoff's
 *     "the header is always pinned at the nav — never vertically centred."
 *  2. When the composition is taller than the room under the nav, the
 *     `#rail-fit` block (heading + gallery) scales down (floor 0.38) via
 *     `transform: scale()` — measured from the viewport, not disabled —
 *     rather than the section falling back to normal (unpinned) flow.
 *  3. The scroll→offset mapping isn't linear: each pane holds briefly
 *     (`HOLD`) before easing to the next, and a reserved tail segment
 *     (`TAIL`) makes the last pane hold too instead of snapping to the
 *     track's end.
 *
 *  Writes `gallery.style.transform` (and the fit scale) directly via refs on
 *  every scroll frame rather than through React state — re-rendering on
 *  every scroll tick would fight the rAF throttle this needs to stay smooth.
 *  `active` is still state, but only changes (and re-renders) once per pane,
 *  driving `aria-hidden`/`pointer-events` on the inactive panes. */
export const PillarRail: React.FC<{ pillars: PillarData[]; heading: React.ReactNode }> = ({ pillars, heading }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const railBoxRef = useRef<HTMLDivElement>(null);
  const railFitRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const count = pillars.length;

  useEffect(() => {
    const track = trackRef.current;
    const sec = sectionRef.current;
    const railBox = railBoxRef.current;
    const fit = railFitRef.current;
    const gallery = galleryRef.current;
    if (!track || !sec || !railBox || !fit || !gallery) return;

    let raf = 0;
    let pinTop: number | null = null;
    let enabled: boolean | null = null;
    let fitScale = 1;

    const measure = () => {
      const vh = window.innerHeight;
      let secH = sec.offsetHeight;
      const on = vh >= 420;
      if (on !== enabled) {
        enabled = on;
        sec.style.position = on ? "sticky" : "relative";
        if (!on) {
          sec.style.top = "auto";
          track.style.height = "";
          gallery.style.transform = "translate3d(0,0,0)";
        }
      }
      if (!on) return;

      // Scale the whole heading+rail block down when it can't fit under the
      // nav, so the heading and the full pillar card stay on screen
      // together — measured from the viewport rather than guessed.
      const natural = fit.offsetHeight;
      const chrome = secH - (parseFloat(railBox.style.height) || natural);
      const room = vh - PIN_TOP - 12 - chrome;
      const k = natural > room ? Math.max(0.38, room / natural) : 1;
      if (k !== fitScale) {
        fitScale = k;
        fit.style.transform = k === 1 ? "none" : `scale(${k.toFixed(4)})`;
      }
      const boxed = Math.round(natural * k);
      if (railBox.style.height !== boxed + "px") railBox.style.height = boxed + "px";
      secH = chrome + boxed;

      if (pinTop !== PIN_TOP) {
        pinTop = PIN_TOP;
        sec.style.top = PIN_TOP + "px";
      }
      const want = secH + Math.round((Math.round(vh * 1.05) * (count - 1)) / (1 - TAIL));
      if (track.style.height !== want + "px") track.style.height = want + "px";
    };

    const apply = () => {
      raf = 0;
      if (!enabled) return;
      // a negative pin offset eats into the usable travel, so fold it into
      // the span — otherwise the last pane is only reached past track end
      const span = Math.max(1, track.offsetHeight - sec.offsetHeight + (pinTop || 0));
      let p = (-track.getBoundingClientRect().top + (pinTop || 0)) / span;
      if (p < 0) p = 0;
      else if (p > 1) p = 1;
      const box = viewportRef.current || gallery;
      // offsetWidth, not a rect: the rect is scaled by the fit transform
      // while the gallery's own transform is in unscaled coordinates
      const slot = box.offsetWidth + GUTTER;
      const steps = count - 1;
      const pt = Math.min(1, p / (1 - TAIL));
      const raw = pt * steps;
      let i = Math.floor(raw);
      if (i > steps - 1) i = Math.max(0, steps - 1);
      const f = raw - i;
      const hold = i === 0 ? 0 : HOLD;
      let g = (f - hold) / (1 - hold);
      if (g < 0) g = 0;
      else if (g > 1) g = 1;
      g = g * g * (3 - 2 * g);
      const eased = pt >= 1 ? steps : i + g;
      gallery.style.transform = `translate3d(${-(eased * slot)}px,0,0)`;
      const idx = Math.min(count - 1, Math.round(eased));
      if (activeRef.current !== idx) {
        activeRef.current = idx;
        setActive(idx);
      }
    };

    const tick = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onResize = () => {
      measure();
      apply();
    };

    measure();
    apply();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", onResize);
    };
  }, [count]);

  return (
    <div ref={trackRef} id="platform-track" className="relative bg-mkt-wash">
      <div
        ref={sectionRef}
        id="platform"
        className="relative flex flex-col justify-start overflow-hidden bg-mkt-wash border-t border-b border-mkt-line scroll-mt-[88px]"
        style={{ padding: "clamp(20px,2.2vw,30px) 0 clamp(22px,2.4vw,32px)" }}
      >
        <div className="max-w-[1180px] mx-auto px-5 sm:px-10 w-full">
          {heading}
          <div ref={railBoxRef} className="mt-[18px]">
            <div ref={railFitRef} className="origin-top" style={{ transformOrigin: "top center" }}>
              <Reveal delay={0.08}>
              <div ref={viewportRef} className="rounded-[26px] overflow-hidden">
                <div
                  ref={galleryRef}
                  className="flex flex-row will-change-transform"
                  style={{ gap: GUTTER, width: `calc(${count * 100}% + ${GUTTER * (count - 1)}px)` }}
                >
                  {pillars.map((p, i) => {
                    // Regression fix: the handoff's own setTab() softens
                    // off-centre panes with opacity + a distance-scaled blur
                    // (never the fully sharp edge cut the port previously
                    // had) — only pointerEvents/aria-hidden were ported.
                    const d = Math.abs(i - active);
                    return (
                    <div
                      key={p.eyebrowNum}
                      className="relative rounded-[26px]"
                      style={{
                        flex: `0 0 calc((100% - ${GUTTER * (count - 1)}px) / ${count})`,
                        background: p.wash,
                        border: `3px solid ${p.ink}`,
                        padding: "clamp(16px,1.6vw,22px)",
                        pointerEvents: i === active ? "auto" : "none",
                        opacity: d === 0 ? 1 : d === 1 ? 0.5 : 0.28,
                        filter: d === 0 ? "none" : `blur(${Math.min(4, d * 2.5)}px)`,
                        transition: "opacity .45s ease,filter .45s ease",
                      }}
                      aria-hidden={i === active ? undefined : "true"}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute flex items-center justify-center rounded-full"
                        style={{
                          top: "clamp(16px,1.6vw,20px)",
                          right: "clamp(16px,1.6vw,20px)",
                          width: 52,
                          height: 52,
                          border: `2px solid ${p.accent === "#7D67D9" ? "#5E9E95" : "#7D67D9"}`,
                        }}
                      >
                        <svg viewBox="560 520 400 400" fill="none" style={{ width: 24, height: 24, overflow: "visible" }}>
                          <path fillRule="evenodd" fill={p.accent === "#7D67D9" ? "#5E9E95" : "#7D67D9"} d={LEAF_PATH} />
                        </svg>
                      </span>

                      <div className="mb-1.5">
                        <span className="block font-bold text-[10px] tracking-[.26em]" style={{ color: p.accent }}>
                          PILLAR {p.eyebrowNum}
                        </span>
                        <div className="mt-1.5">
                          <div
                            className="font-display font-extrabold"
                            style={{
                              fontSize: "clamp(26px,2.6vw,34px)",
                              lineHeight: 1.18,
                              letterSpacing: "-.032em",
                              padding: "0 .04em .05em 0",
                              background: p.titleGradient,
                              WebkitBackgroundClip: "text",
                              backgroundClip: "text",
                              color: "transparent",
                            }}
                          >
                            {p.titleWord}
                          </div>
                        </div>
                      </div>

                      <div className="grid items-center gap-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))" }}>
                        <div>
                          <h3 className="font-display font-extrabold text-[17px] leading-[1.15] tracking-[-.02em] text-mkt-ink">{p.h3}</h3>
                          <p className="text-[14px] leading-[1.55] text-mkt-soft mt-2 max-w-[420px]" style={{ textWrap: "pretty" }}>
                            {p.paragraph}
                          </p>
                          <ul className="flex flex-col gap-1.5 mt-[11px]">
                            {p.bullets.map((b) => (
                              <li key={b.text} className="flex gap-[11px] items-start">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-[7px]" style={{ background: b.color }} />
                                <span className="text-[13px] text-[#3B352D]">{b.text}</span>
                              </li>
                            ))}
                          </ul>
                          <div
                            className="flex items-center gap-3.5 mt-3.5 pt-3"
                            style={{ borderTop: `1px solid ${p.accent === "#7D67D9" ? "#E4DCF8" : "#D8EAE6"}` }}
                          >
                            {p.graphic}
                          </div>
                        </div>
                        {p.mockup}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

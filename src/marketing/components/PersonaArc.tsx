import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Reveal } from "./Reveal";

export interface PersonaData {
  title: string;
  accent: string;
  description: string;
  art: React.ReactNode;
}

const PIN_TOP = 72;

/** "Who it's for" persona arc: four cards ride a semi-circle fan, scrubbed by
 *  scroll inside a sticky track (same shape as PillarRail's pin, different
 *  step size) — cumulative tilt, dip, shrink and blur (by distance from the
 *  focused slot) sell the curve without a literal 3D path. Every card is on
 *  the arc the whole time; only which one is focused changes, driven by
 *  scroll position and overridden by hover.
 *
 *  Transform/filter/opacity are computed per-slot and applied straight to
 *  each card's own style on every scroll frame via a ref map — porting the
 *  handoff's own explicit warning: writing these transforms imperatively
 *  onto sibling nodes *after* a re-render landed on the wrong node once
 *  React reconciled them, freezing the fan. Reading refs and writing style
 *  directly in the same scroll-frame callback (never deferring to the next
 *  render) avoids that.
 *
 *  v4 landing handoff: the focused card's glow is now tinted in its own
 *  title colour (purple for Principled/Intentional, teal for
 *  Determined/Proactive) rather than a fixed neutral purple, and its largest
 *  glow layer reaches ~46px above the card — so the outer frame grew to
 *  552px with the ring of cards inset 52px from its top, giving the halo
 *  room before `overflow: hidden` clips it flat.
 *
 *  Full-page regression audit fix: the section heading ("Who it's for" /
 *  "Built for people who show up.") now renders *inside* this component's
 *  own sticky section (via the `heading` prop) instead of Home.tsx
 *  rendering it as a separate, unpinned block above `<PersonaArc>` — the
 *  handoff's `#traits-section` pins the heading and the card ring together
 *  as one unit, the same pattern the pillar rail needed fixing for. The
 *  pin-offset formula was also drifted from the handoff's own
 *  `initTraitsPin()`: unlike the pillar rail (which always pins flush at
 *  the nav), the persona section *does* centre vertically when it fits
 *  the viewport with room to spare, and gives back headroom gradually
 *  (not a hard jump to flush-bottom) when it doesn't — both branches below
 *  are ported verbatim from the handoff rather than approximated. */
export const PersonaArc: React.FC<{ personas: PersonaData[]; heading: React.ReactNode }> = ({ personas, heading }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const artRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const count = personas.length;

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  useEffect(() => {
    const track = trackRef.current;
    const sec = sectionRef.current;
    const wrap = wrapRef.current;
    if (!track || !sec || !wrap) return;

    if (reduceMotion) {
      sec.style.position = "static";
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        card.style.transform = `translate3d(${(i - Math.floor(count / 2)) * 236}px,0,0)`;
        card.style.opacity = "1";
        card.style.filter = "none";
      });
      return;
    }

    let active = 0;
    let pinTop: number | null = null;
    let raf = 0;

    const paintArc = (act: number) => {
      const cardW = cardRefs.current[0]?.offsetWidth || 196;
      const wrapH = wrap.clientHeight || 452;
      const stepX = cardW + 40;
      const dip = Math.round(wrapH * 0.2);
      for (let i = 0; i < count; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        const slot = i - act;
        const d = Math.abs(slot);
        const t = count > 1 ? slot / (count - 1) : 0;
        const y = Math.round(dip * (1 - Math.cos((t * Math.PI) / 2)) + d * d * 6);
        const scale = Math.max(0.68, 1 - d * 0.11);
        const tilt = slot * (7 + d * 3.5);
        const originX = slot === 0 ? "50%" : slot < 0 ? "88%" : "12%";
        card.style.transform = `translate3d(${Math.round(slot * stepX)}px,${y}px,0) rotate(${tilt}deg) scale(${scale})`;
        card.style.transformOrigin = originX + " 42%";
        card.style.filter = d === 0 ? "none" : `grayscale(1) contrast(.9) brightness(1.03) blur(${(d * 0.9).toFixed(1)}px)`;
        card.style.opacity = d === 0 ? "1" : d === 1 ? ".72" : d === 2 ? ".44" : ".26";
        card.style.zIndex = String(20 - d);
        const tint = i % 2 === 0 ? "125,103,217" : "94,158,149";
        card.style.boxShadow =
          d === 0
            ? `0 0 0 1px rgba(${tint},.34),0 0 28px rgba(${tint},.5),0 18px 44px rgba(${tint},.42),0 30px 76px rgba(${tint},.28)`
            : "0 8px 20px rgba(72,58,130,.07)";
      }
    };

    const paintFocus = (act: number) => {
      artRefs.current.forEach((art, i) => {
        if (!art) return;
        const isActive = i === act;
        art.style.transform = isActive ? "scale(1.07)" : "scale(.965)";
        art.style.filter = isActive
          ? "saturate(2.1) contrast(1.14) brightness(1.03)"
          : "grayscale(1) contrast(.82) brightness(1.16) opacity(.3)";
        art.style.boxShadow = isActive ? "0 26px 54px rgba(72,58,130,.3)" : "none";
      });
    };

    const paint = () => {
      const act = hoveredRef.current !== null ? hoveredRef.current : active;
      paintArc(act);
      paintFocus(act);
    };

    const measurePin = () => {
      const vh = window.innerHeight;
      const secH = sec.offsetHeight;
      let top: number;
      if (secH + PIN_TOP <= vh) {
        top = Math.round(Math.max(PIN_TOP, (vh - secH) / 2));
      } else {
        // only give back as much of the header as the overflow demands, so
        // the pin lands with heading and cards on screen together
        top = Math.round(Math.max(vh - secH, Math.min(PIN_TOP, PIN_TOP - (secH - vh) * 0.5)));
      }
      if (pinTop !== top) {
        pinTop = top;
        sec.style.position = "sticky";
        sec.style.top = top + "px";
      }
      const want = secH + Math.round(vh * 0.62) * (count - 1);
      if (track.style.height !== want + "px") track.style.height = want + "px";
    };

    const progress = () => {
      measurePin();
      // the pin offset eats into the usable travel (negative when the
      // section is taller than the viewport), so fold it into the span —
      // otherwise the last persona is only reached past the track's end
      const raw = track.offsetHeight - sec.offsetHeight;
      const span = Math.max(1, raw + (pinTop || 0));
      const p = (-track.getBoundingClientRect().top + (pinTop || 0)) / span;
      return p <= 0 ? 0 : p >= 1 ? 0.999 : p;
    };

    const onScroll = () => {
      const p = progress();
      let act = Math.floor(p * count);
      if (!isFinite(act) || act < 0) act = 0;
      else if (act > count - 1) act = count - 1;
      active = act;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(); });
    };

    paint();
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, reduceMotion, hovered]);

  return (
    <div ref={trackRef} id="traits-track" className="relative">
      <div
        ref={sectionRef}
        id="traits-section"
        className="relative"
        style={{ padding: "clamp(72px,8vw,96px) 0 clamp(28px,3vw,40px)" }}
      >
        <div className="max-w-[1180px] mx-auto px-5 sm:px-10">
          {heading}
          <Reveal delay={0.08}>
          <div
            ref={frameRef}
            className="relative mt-11 h-[552px] overflow-hidden"
            style={{
            maskImage:
              "linear-gradient(90deg,transparent 0%,rgba(0,0,0,.35) 5%,rgba(0,0,0,.85) 12%,#000 20%,#000 80%,rgba(0,0,0,.85) 88%,rgba(0,0,0,.35) 95%,transparent 100%)," +
              "linear-gradient(180deg,transparent 0%,rgba(0,0,0,.55) 4%,#000 11%,#000 90%,rgba(0,0,0,.6) 97%,transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(90deg,transparent 0%,rgba(0,0,0,.35) 5%,rgba(0,0,0,.85) 12%,#000 20%,#000 80%,rgba(0,0,0,.85) 88%,rgba(0,0,0,.35) 95%,transparent 100%)," +
              "linear-gradient(180deg,transparent 0%,rgba(0,0,0,.55) 4%,#000 11%,#000 90%,rgba(0,0,0,.6) 97%,transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        >
          <div ref={wrapRef} className="absolute left-0 right-0 top-[52px] bottom-0">
            {personas.map((p, i) => (
              <div
                key={p.title}
                ref={(el) => { cardRefs.current[i] = el; }}
                className="absolute left-1/2 top-0 w-[246px] -ml-[123px] bg-white border border-mkt-line rounded-[18px] p-3.5 will-change-transform transition-[transform,filter,opacity,box-shadow] duration-[600ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
              >
                <div
                  ref={(el) => { artRefs.current[i] = el; }}
                  className="cursor-pointer transition-[transform,filter,box-shadow] duration-500"
                  style={{ filter: "grayscale(1) contrast(.82) brightness(1.16) opacity(.3)" }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {p.art}
                </div>
                <div className="font-bold text-[17px] tracking-[-.01em] mt-[15px]" style={{ color: p.accent }}>
                  {p.title}
                </div>
                <p className="text-[13.5px] leading-[1.6] text-mkt-soft mt-2.5">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
        </Reveal>
        </div>
      </div>
    </div>
  );
};

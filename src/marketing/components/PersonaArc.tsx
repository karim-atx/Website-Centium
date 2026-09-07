import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

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
 *  render) avoids that. */
export const PersonaArc: React.FC<{ personas: PersonaData[] }> = ({ personas }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
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
        card.style.boxShadow = d === 0 ? "0 22px 48px rgba(72,58,130,.2)" : "0 8px 20px rgba(72,58,130,.07)";
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
      const top = secH + PIN_TOP <= vh ? PIN_TOP : Math.round(vh - secH);
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
      <div ref={sectionRef} id="traits-section" className="relative">
        <div ref={wrapRef} className="relative mt-14 h-[470px] overflow-hidden">
          <div className="absolute inset-0">
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
      </div>
    </div>
  );
};

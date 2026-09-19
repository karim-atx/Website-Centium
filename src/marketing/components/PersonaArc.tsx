import React, { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { Reveal } from "./Reveal";

export interface PersonaData {
  title: string;
  accent: string;
  description: string;
  /** Fallback graphic for a title this component doesn't recognise — the
   *  four titles this handoff defines (Principled/Determined/Intentional/
   *  Proactive) always use the built-in, title-keyed art below (see
   *  PERSONA_ART) instead. */
  art?: React.ReactNode;
}

const PIN_TOP = 72;

/* ------------------------------------------------------------------ */
/* Persona card graphics — each one owns a DISTINCT animated property,
 * ported keyframe-for-keyframe from the handoff's cent-* CSS (`.dc.html`
 * lines 22-48), not approximated:
 *   - Principled ("SHOWED UP" streak):   cent-lift (transform lift+scale)
 *     + cent-wave (opacity) on each day's checkbox.
 *   - Determined ("GOAL PROGRESS" bar):  cent-advance/cent-knob (scaleX).
 *   - Intentional ("TODAY, EXACTLY"):    cent-tally (clip-path), but as an
 *     OVERLAY on top of a static bar — never animating the bar itself back
 *     to zero width, per the handoff's own gotcha ("a bar animating
 *     clip-path back to zero width reads as the data emptying").
 *   - Proactive ("SPOTTED EARLY"):       cent-bio-pulse, an expanding +
 *     fading ring (transform scale + opacity).
 * Every keyframe's loop boundary is either identical start/end state
 * (cent-lift, cent-wave, cent-advance, cent-knob) or invisible at the frame
 * it wraps on (cent-tally ends at opacity:0 *and* starts at zero clip width;
 * cent-bio-pulse ends at opacity:0 before snapping back to its resting
 * frame) — so none of the four reads as a jump or a "reset". */
const PrincipledArt: React.FC = () => {
  const days = ["M", "T", "W", "T", "F", "S"];
  return (
    <div
      className="relative w-full"
      style={{ background: "linear-gradient(150deg,#F4F1FB 0%,#EFEAF9 46%,#EDF4F3 100%)" }}
    >
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{ left: 2, top: 2, width: 96, height: 96, background: "radial-gradient(circle at 50% 50%,rgba(94,158,149,.4),rgba(94,158,149,0) 70%)" }}
      />
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{ right: 2, bottom: 2, width: 104, height: 104, background: "radial-gradient(circle at 50% 50%,rgba(125,103,217,.34),rgba(125,103,217,0) 70%)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: "linear-gradient(to bottom,rgba(255,255,255,.34) 0%,rgba(255,255,255,.62) 46%,rgba(255,255,255,.9) 78%,#fff 100%)" }}
      />
      <div className="relative z-[2]" style={{ padding: "15px 20px 16px" }}>
        <div className="font-extrabold" style={{ fontSize: 11, letterSpacing: ".14em", color: "#6B6358" }}>
          SHOWED UP
        </div>
        <div className="flex items-baseline gap-1.5 whitespace-nowrap" style={{ marginTop: 5 }}>
          <span className="font-extrabold leading-none" style={{ fontSize: 22, letterSpacing: "-.03em", color: "#221E1A" }}>
            18
          </span>
          <span className="font-bold" style={{ fontSize: 11.5, color: "#4E3894" }}>
            day streak
          </span>
        </div>
        <div className="flex gap-1" style={{ marginTop: 9 }}>
          {days.map((d, i) => (
            <span key={i} className="flex-1 flex flex-col items-center" style={{ gap: 3 }}>
              <span
                className="cent-lift relative w-full flex items-center justify-center text-white font-extrabold"
                style={{ height: 18, borderRadius: 5, background: "#5C48A8", transformOrigin: "center", fontSize: 11, animationDelay: `${(i * 0.18).toFixed(2)}s` }}
              >
                <span
                  aria-hidden
                  className="cent-wave absolute inset-0"
                  style={{ borderRadius: 5, background: "#fff", opacity: 0, animationDelay: `${(i * 0.18).toFixed(2)}s` }}
                />
                <span className="relative">✓</span>
              </span>
              <span className="font-bold" style={{ fontSize: 11, color: "#6B6358" }}>{d}</span>
            </span>
          ))}
          <span className="flex-1 flex flex-col items-center" style={{ gap: 3 }}>
            <span
              className="w-full flex items-center justify-center font-extrabold"
              style={{ height: 18, borderRadius: 5, background: "#F4F1FB", color: "#6B6358", fontSize: 11 }}
            />
            <span className="font-bold" style={{ fontSize: 11, color: "#6B6358" }}>S</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2" style={{ marginTop: 9, paddingTop: 8, borderTop: "1px solid #F4F1FB" }}>
          <span className="font-bold" style={{ fontSize: 11, color: "#6B6358" }}>This week</span>
          <span className="font-extrabold" style={{ fontSize: 11, color: "#2F5F58" }}>6 of 7 sessions</span>
        </div>
      </div>
    </div>
  );
};

const DeterminedArt: React.FC = () => (
  <div className="relative w-full" style={{ background: "linear-gradient(150deg,#EDF4F3 0%,#E9EFEE 48%,#F4F1FB 100%)" }}>
    <div
      aria-hidden
      className="absolute rounded-full pointer-events-none"
      style={{ left: 2, bottom: 2, width: 104, height: 104, background: "radial-gradient(circle at 50% 50%,rgba(125,103,217,.34),rgba(125,103,217,0) 70%)" }}
    />
    <div
      aria-hidden
      className="absolute rounded-full pointer-events-none"
      style={{ right: 2, top: 2, width: 96, height: 96, background: "radial-gradient(circle at 50% 50%,rgba(94,158,149,.44),rgba(94,158,149,0) 70%)" }}
    />
    <div
      aria-hidden
      className="absolute inset-0 z-[1] pointer-events-none"
      style={{ background: "linear-gradient(to bottom,rgba(255,255,255,.34) 0%,rgba(255,255,255,.62) 46%,rgba(255,255,255,.9) 78%,#fff 100%)" }}
    />
    <div className="relative z-[2]" style={{ padding: "15px 20px 16px" }}>
      <div className="font-extrabold" style={{ fontSize: 11, letterSpacing: ".14em", color: "#6B6358" }}>
        GOAL PROGRESS
      </div>
      <div className="flex items-baseline justify-between gap-2" style={{ marginTop: 6 }}>
        <span className="font-extrabold leading-none" style={{ fontSize: 22, letterSpacing: "-.03em", color: "#221E1A" }}>
          74.6<span className="font-bold" style={{ fontSize: 12, color: "#6B6358" }}> kg</span>
        </span>
        <span className="font-extrabold" style={{ fontSize: 11.5, color: "#2F5F58" }}>72.0 goal</span>
      </div>
      <div className="relative rounded-full" style={{ height: 8, background: "#EDF4F3", marginTop: 10 }}>
        <span
          className="cent-advance absolute left-0 top-0 bottom-0 rounded-full"
          style={{ width: "68%", background: "linear-gradient(90deg,#5E9E95,#7D67D9)", transformOrigin: "left center", animationDelay: "0s" }}
        >
          <span
            className="cent-knob absolute rounded-full"
            style={{ right: 0, top: "50%", width: 14, height: 14, background: "#fff", border: "3px solid #7D67D9", transform: "translate(50%,-50%)", animationDelay: "0s" }}
          />
        </span>
      </div>
      <div className="flex items-center justify-between gap-2" style={{ marginTop: 8 }}>
        <span className="font-bold" style={{ fontSize: 11, color: "#6B6358" }}>Started 79.2</span>
        <span className="font-extrabold" style={{ fontSize: 11, color: "#4E3894" }}>68% there</span>
      </div>
      <div className="flex flex-wrap" style={{ gap: 5, marginTop: 9, paddingTop: 8, borderTop: "1px solid #EDF4F3" }}>
        {["Nutrition", "Training", "Health"].map((t) => (
          <span
            key={t}
            className="flex-1 text-center font-extrabold rounded-full"
            style={{ padding: "3px 0", fontSize: 11, background: "#EDF4F3", color: "#2F5F58" }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  </div>
);

const MACROS = [
  { label: "Protein", pct: 78, bar: "#4E3894", tally: "#382868", value: "128 / 165 g", delay: 0 },
  { label: "Carbs", pct: 57, bar: "#5C48A8", tally: "#42327A", value: "148 / 260 g", delay: 8 },
  { label: "Fat", pct: 45, bar: "#2F5F58", tally: "#20423D", value: "29 / 65 g", delay: 1.6 },
];

const IntentionalArt: React.FC = () => (
  <div className="relative w-full" style={{ background: "linear-gradient(150deg,#EDE9F9 0%,#EBE8F5 54%,#EDF4F3 100%)" }}>
    <div
      aria-hidden
      className="absolute rounded-full pointer-events-none"
      style={{ right: 2, bottom: 2, width: 104, height: 104, background: "radial-gradient(circle at 50% 50%,rgba(125,103,217,.36),rgba(125,103,217,0) 70%)" }}
    />
    <div
      aria-hidden
      className="absolute rounded-full pointer-events-none"
      style={{ left: 2, top: 2, width: 100, height: 100, background: "radial-gradient(circle at 50% 50%,rgba(94,158,149,.4),rgba(94,158,149,0) 70%)" }}
    />
    <div
      aria-hidden
      className="absolute inset-0 z-[1] pointer-events-none"
      style={{ background: "linear-gradient(to bottom,rgba(255,255,255,.34) 0%,rgba(255,255,255,.62) 46%,rgba(255,255,255,.9) 78%,#fff 100%)" }}
    />
    <div className="relative z-[2]" style={{ padding: "15px 20px 16px" }}>
      <div className="font-extrabold" style={{ fontSize: 11, letterSpacing: ".14em", color: "#6B6358" }}>
        TODAY, EXACTLY
      </div>
      <div className="flex flex-col" style={{ gap: 6, marginTop: 8 }}>
        {MACROS.map((m) => (
          <span key={m.label} className="flex items-center" style={{ gap: 8 }}>
            <span className="font-bold" style={{ width: 44, fontSize: 11, color: "#221E1A" }}>{m.label}</span>
            <span className="flex-1 rounded-full" style={{ height: 5, background: "#F4F1FB" }}>
              {/* The static bar never moves — the sweep lives on the overlay
                  below, which only ever fades to opacity:0 at rest. Animating
                  the bar's own width back to 0 each loop would read as the
                  macro emptying out (the handoff's own gotcha). */}
              <span className="relative block h-full rounded-full" style={{ width: `${m.pct}%`, background: m.bar }}>
                <span
                  aria-hidden
                  className="cent-tally absolute inset-0 rounded-full"
                  style={{ background: m.tally, animationDelay: `${m.delay}s` }}
                />
              </span>
            </span>
            <span className="font-extrabold whitespace-nowrap" style={{ fontSize: 11, color: "#6B6358" }}>{m.value}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2" style={{ marginTop: 9, paddingTop: 8, borderTop: "1px solid #F4F1FB" }}>
        <span className="font-bold" style={{ fontSize: 11, color: "#6B6358" }}>Logged 1,842 kcal</span>
        <span className="font-extrabold" style={{ fontSize: 11, color: "#2F5F58" }}>4 pillars synced</span>
      </div>
    </div>
  </div>
);

const ProactiveArt: React.FC = () => (
  <div className="relative w-full" style={{ background: "linear-gradient(150deg,#EDF4F3 0%,#EAEAF6 52%,#E9E4F8 100%)" }}>
    <div
      aria-hidden
      className="absolute rounded-full pointer-events-none"
      style={{ right: 2, top: 2, width: 108, height: 108, background: "radial-gradient(circle at 50% 50%,rgba(125,103,217,.36),rgba(125,103,217,0) 70%)" }}
    />
    <div
      aria-hidden
      className="absolute rounded-full pointer-events-none"
      style={{ left: 2, bottom: 2, width: 96, height: 96, background: "radial-gradient(circle at 50% 50%,rgba(94,158,149,.46),rgba(94,158,149,0) 70%)" }}
    />
    <div
      aria-hidden
      className="absolute inset-0 z-[1] pointer-events-none"
      style={{ background: "linear-gradient(to bottom,rgba(255,255,255,.34) 0%,rgba(255,255,255,.62) 46%,rgba(255,255,255,.9) 78%,#fff 100%)" }}
    />
    <div className="relative z-[2]" style={{ padding: "15px 20px 16px" }}>
      <div className="font-extrabold" style={{ fontSize: 11, letterSpacing: ".14em", color: "#6B6358" }}>
        SPOTTED EARLY
      </div>
      <div className="flex items-baseline justify-between gap-2" style={{ marginTop: 6 }}>
        <span className="font-extrabold" style={{ fontSize: 15, letterSpacing: "-.02em", color: "#221E1A" }}>
          Vitamin D 24<span className="font-bold" style={{ fontSize: 11, color: "#6B6358" }}> ng/mL · ref ≥ 30</span>
        </span>
        <span className="rounded-full font-extrabold" style={{ padding: "2px 8px", fontSize: 11, background: "#F4F1FB", color: "#4E3894" }}>
          low
        </span>
      </div>
      <span className="relative block" style={{ marginTop: 8 }}>
        <svg viewBox="0 0 200 34" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 30, overflow: "visible" }}>
          <line x1="0" y1="12" x2="200" y2="12" stroke="#6B6358" strokeWidth={1.5} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          <path
            d="M 0 4 C 3.7 4.8, 14.7 9.2, 22 9 C 29.3 8.8, 36.5 2.8, 44 3 C 51.5 3.2, 59.5 9.5, 67 10 C 74.5 10.5, 81.7 5.2, 89 6 C 96.3 6.8, 103.7 12.7, 111 15 C 118.3 17.3, 125.5 19.8, 133 20 C 140.5 20.2, 148.5 15.2, 156 16 C 163.5 16.8, 170.7 23.0, 178 25 C 185.3 27.0, 196.3 27.5, 200 28 L 200 34 L 0 34 Z"
            fill="rgba(47,95,88,.10)"
            stroke="none"
          />
          <path
            d="M 0 4 C 3.7 4.8, 14.7 9.2, 22 9 C 29.3 8.8, 36.5 2.8, 44 3 C 51.5 3.2, 59.5 9.5, 67 10 C 74.5 10.5, 81.7 5.2, 89 6 C 96.3 6.8, 103.7 12.7, 111 15 C 118.3 17.3, 125.5 19.8, 133 20 C 140.5 20.2, 148.5 15.2, 156 16 C 163.5 16.8, 170.7 23.0, 178 25 C 185.3 27.0, 196.3 27.5, 200 28"
            fill="none"
            stroke="#2F5F58"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span aria-hidden className="absolute" style={{ right: 0, top: 25, width: 10, height: 10, transform: "translate(50%,-50%)" }}>
          <span className="cent-bio-ring cent-bio-pulse absolute inset-0 rounded-full" style={{ background: "#8A6512", animationDelay: "0s" }} />
          <span className="absolute inset-0 rounded-full" style={{ background: "#8A6512" }} />
        </span>
      </span>
      <div className="relative z-[1] flex items-center gap-2" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #EDF4F3" }}>
        <span
          className="rounded-full shrink-0 flex items-center justify-center font-extrabold text-white"
          style={{ width: 18, height: 18, fontSize: 11, background: "#2F5F58" }}
        >
          ✓
        </span>
        <span className="font-bold" style={{ fontSize: 11, color: "#221E1A" }}>Plan adjusted · retest booked</span>
      </div>
    </div>
  </div>
);

/** Title-keyed so Home.tsx's existing `personas` prop (title/accent/
 *  description/art) keeps compiling unchanged — see the `art` field's own
 *  comment. Falls back to whatever `art` the prop carries for a title this
 *  map doesn't recognise. */
const PERSONA_ART: Record<string, React.FC> = {
  Principled: PrincipledArt,
  Determined: DeterminedArt,
  Intentional: IntentionalArt,
  Proactive: ProactiveArt,
};

/** "Who it's for" persona arc: four cards ride a semi-circle fan, scrubbed by
 *  scroll inside a sticky track (same shape as PillarRail's pin, different
 *  step size) — cumulative tilt, dip, shrink and blur (by distance from the
 *  focused slot) sell the curve without a literal 3D path.
 *
 *  Transform/filter/opacity are computed per-slot and applied straight to
 *  each card's own style on every scroll frame via a ref map — porting the
 *  handoff's own explicit warning: writing these transforms imperatively
 *  onto sibling nodes *after* a re-render landed on the wrong node once
 *  React reconciled them, freezing the fan. Reading refs and writing style
 *  directly in the same scroll-frame callback (never deferring to the next
 *  render) avoids that.
 *
 *  Focus is scroll-driven ONLY — the handoff is explicit ("hover
 *  deliberately does nothing"), and an older build here had a hover
 *  override (`onMouseEnter`/`onMouseLeave` setting a `hovered` state that
 *  took priority over the scroll-computed active index). That's removed:
 *  there is no `hovered` state at all any more, and the art wrappers don't
 *  take pointer handlers.
 *
 *  Card sizing is now driven by `initResponsive()`'s ACTUAL formula in the
 *  handoff (`.dc.html`), not the README's persona-arc prose summary
 *  (`clamp(300, min(vw*.27, vh*.62), 520)`), which is stale relative to it —
 *  per this repo's standing rule, the handoff's own code wins over prose
 *  that can drift across rounds. The real, comment-justified formula sizes
 *  the card against the STAGE's measured width (not raw vw) and vh, floored
 *  at 320 and capped at 540: `max(320, min(stageW*0.42, vh*0.72, 540))`.
 *  Art-box height is `max(cardW*0.34, tallest card's natural content
 *  height)` — measured, never hardcoded, so no persona's mockup clips.
 *
 *  Every scroll/resize repaint also runs a measured anti-clip correction
 *  pass: lay the cards out at their raw dip, measure each RENDERED (i.e.
 *  rotated+scaled) bounding box against the stage's bottom edge with
 *  transitions off, and pull back only the cards that actually overrun —
 *  ported from the handoff's own fix for exactly this (a fixed-ratio dip
 *  clipped descriptions on short viewports).
 *
 *  v4 landing handoff: the focused card's glow is now tinted in its own
 *  title colour (purple for Principled/Intentional, teal for
 *  Determined/Proactive) rather than a fixed neutral purple, and its largest
 *  glow layer reaches ~46px above the card — so the outer frame grew to a
 *  content-driven height with the ring of cards inset 52px from its top,
 *  giving the halo room before `overflow: hidden` clips it flat.
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
  const artboxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bodyRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const reduceMotion = useReducedMotion();
  const count = personas.length;

  useEffect(() => {
    const track = trackRef.current;
    const sec = sectionRef.current;
    const frame = frameRef.current;
    const wrap = wrapRef.current;
    if (!track || !sec || !frame || !wrap) return;

    if (reduceMotion) {
      sec.style.position = "static";
      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        // Literal handoff value (initPersonaArc's reduced-motion branch) —
        // a fixed 328px step, not derived from the responsive card width.
        card.style.transform = `translate3d(${(i - Math.floor(count / 2)) * 328}px,0,0)`;
        card.style.opacity = "1";
        card.style.filter = "none";
      });
      return;
    }

    let active = 0;
    let pinTop: number | null = null;
    let painted = -1;

    const paintArc = (act: number) => {
      const cardW = cardRefs.current[0]?.offsetWidth || 338;
      const wrapH = wrap.clientHeight || 452;
      // Step is capped against the stage width, not just the card: once the
      // cards scale up, cardW + gutter can push neighbours entirely off the
      // masked stage and the arc stops reading as a fan.
      const stageW = wrap.clientWidth || cardW * 3;
      const stepX = Math.round(Math.min(cardW + 34, Math.max(cardW * 0.52, stageW * 0.3)));
      const dip = Math.round(wrapH * 0.2);

      const geom = (i: number) => {
        const slot = i - act;
        const d = Math.abs(slot);
        return {
          slot,
          d,
          scale: Math.max(0.68, 1 - d * 0.11),
          tilt: slot * (7 + d * 3.5),
          originX: slot === 0 ? "50%" : slot < 0 ? "88%" : "12%",
        };
      };
      const rawY = (slot: number) => {
        const d = Math.abs(slot);
        const t = count > 1 ? slot / (count - 1) : 0;
        return dip * (1 - Math.cos((t * Math.PI) / 2)) + d * d * 6;
      };
      const layOut = (ys: Record<number, number>) => {
        for (let i = 0; i < count; i++) {
          const card = cardRefs.current[i];
          if (!card) continue;
          const g = geom(i);
          card.style.transformOrigin = `${g.originX} 42%`;
          card.style.transform = `translate3d(${Math.round(g.slot * stepX)}px,${ys[i] ?? 0}px,0) rotate(${g.tilt}deg) scale(${g.scale})`;
        }
      };

      const yOf: Record<number, number> = {};
      for (let i = 0; i < count; i++) yOf[i] = Math.round(rawY(i - act));

      // Anti-clip correction: measure the RENDERED (rotated+scaled) box of
      // each card against the stage's own bottom edge, transitions off so
      // the read isn't a mid-interpolation value, and pull back only the
      // cards that actually overrun.
      const saved: (string)[] = [];
      const prevTransform: (string)[] = [];
      for (let i = 0; i < count; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        saved[i] = card.style.transition;
        prevTransform[i] = card.style.transform;
        card.style.transition = "none";
      }
      layOut(yOf);
      void wrap.offsetHeight;
      const limit = frame.getBoundingClientRect().bottom;
      for (let i = 0; i < count; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        const over = card.getBoundingClientRect().bottom - limit;
        // Floor is negative, not 0: the cards sit 52px below the stage top,
        // so a card whose rotated box still overruns at y=0 can be lifted
        // into that slack instead of being cut off at the bottom.
        if (over > 0.5) yOf[i] = Math.max(-46, yOf[i] - Math.ceil(over));
      }
      for (let i = 0; i < count; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        card.style.transform = prevTransform[i];
      }
      void wrap.offsetHeight;
      for (let i = 0; i < count; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        card.style.transition = saved[i];
      }

      layOut(yOf);

      for (let i = 0; i < count; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        const g = geom(i);
        const d = g.d;
        card.style.filter = d === 0 ? "none" : `grayscale(1) contrast(.9) brightness(1.03) blur(${(d * 0.9).toFixed(1)}px)`;
        card.style.opacity = d === 0 ? "1" : d === 1 ? ".72" : d === 2 ? ".44" : ".26";
        card.style.zIndex = String(20 - d);
        const tint = i % 2 === 0 ? "125,103,217" : "94,158,149";
        // The halo is the card's own box-shadow: it paints outside the
        // border box, so it surrounds the whole card (image, title,
        // description) and can never veil content the way an absolutely
        // positioned overlay layer would. The hairline outline is an INSET
        // ring in that same box-shadow (the card itself has no border) so
        // `overflow:hidden` can't clip a sliver off either end of it.
        const ring = `inset 0 0 0 1px ${d === 0 ? `rgba(${tint},.30)` : "rgba(34,30,26,.09)"}`;
        card.style.boxShadow =
          d === 0
            ? `${ring},0 0 0 1px rgba(${tint},.34),0 0 28px rgba(${tint},.5),0 18px 44px rgba(${tint},.42),0 30px 76px rgba(${tint},.28)`
            : `${ring},0 8px 20px rgba(72,58,130,.07)`;
      }
    };

    const paintFocus = (act: number) => {
      artRefs.current.forEach((art, i) => {
        if (!art) return;
        const on = i === act;
        art.style.transform = on ? "scale(1.04)" : "scale(.975)";
        art.style.filter = on
          ? "saturate(2.1) contrast(1.14) brightness(1.03)"
          : "grayscale(1) contrast(.82) brightness(1.16) opacity(.3)";
        art.style.boxShadow = on ? "0 18px 40px rgba(72,58,130,.22)" : "none";
        // Title and description follow the same active state, so the whole
        // card reads as selected rather than just the image.
        const title = titleRefs.current[i];
        const body = bodyRefs.current[i];
        if (title) title.style.opacity = on ? "1" : ".42";
        if (body) {
          body.style.opacity = on ? "1" : ".42";
          body.style.color = on ? "#3B352D" : "#5B5349";
        }
        const card = cardRefs.current[i];
        if (card) card.style.background = on ? "#FFFFFF" : "#FDFCFB";
      });
    };

    const paint = () => {
      paintArc(active);
      paintFocus(active);
    };

    // Card width scales with the viewport instead of sitting at a fixed
    // px value: sized against BOTH the stage's own measured width (so a
    // wide-but-short screen enlarges the card) and vh (so the taller card
    // still fits the stage). Art-box height is the larger of its 0.34
    // target and the tallest card's own measured (unconstrained) content
    // height, applied uniformly so every card shares one art-box height.
    const measureSizes = () => {
      const stageW = frame.clientWidth || wrap.clientWidth || 800;
      const vh = window.innerHeight;
      const byWidth = stageW * 0.42;
      const byHeight = vh * 0.72;
      const cardW = Math.round(Math.max(320, Math.min(byWidth, byHeight, 540)));
      const artTarget = Math.round(cardW * 0.34);

      cardRefs.current.forEach((card) => {
        if (!card) return;
        card.style.width = `${cardW}px`;
        card.style.marginLeft = `${Math.round(-cardW / 2)}px`;
      });

      let artH = artTarget;
      artboxRefs.current.forEach((box) => {
        if (!box) return;
        box.style.height = "auto";
        const need = box.scrollHeight;
        if (need > artH) artH = need;
      });
      artboxRefs.current.forEach((box) => {
        if (box) box.style.height = `${artH}px`;
      });

      const stageH = Math.round(Math.min(Math.max(artH + 510, 600), vh * 0.95));
      frame.style.height = `${stageH}px`;

      const titlePx = Math.round(Math.max(20, Math.min(cardW * 0.088, 44)));
      const bodyPx = Math.round(Math.max(13, Math.min(cardW * 0.031, 16)));
      titleRefs.current.forEach((t) => {
        if (t) t.style.fontSize = `${titlePx}px`;
      });
      bodyRefs.current.forEach((b) => {
        if (b) b.style.fontSize = `${bodyPx}px`;
      });
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
        sec.style.top = `${top}px`;
      }
      const want = secH + Math.round(vh * 0.62) * (count - 1);
      if (track.style.height !== `${want}px`) track.style.height = `${want}px`;
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

    const activeFor = () => {
      let act = Math.floor(progress() * count);
      if (!isFinite(act) || act < 0) act = 0;
      else if (act > count - 1) act = count - 1;
      return act;
    };

    // Painted synchronously on every scroll event, gated only on the active
    // index actually changing — no requestAnimationFrame latch. (The
    // handoff's own history: a `if (!raf) raf = requestAnimationFrame(...)`
    // shape left `raf` stuck set if that callback was ever skipped, which
    // froze the arc on whichever card it had last painted — this is the
    // "persona-arc pin bug" this file's own regression history references.
    // A slot change is at most a handful of style writes, so coalescing via
    // rAF buys nothing here, and skipping repaint when the index hasn't
    // moved is enough to keep scroll cheap.)
    const sync = () => {
      const want = activeFor();
      if (want === painted) return;
      active = want;
      painted = want;
      paint();
    };

    const onResize = () => {
      measureSizes();
      measurePin();
      painted = -1;
      sync();
      paint();
    };

    measureSizes();
    measurePin();
    paint();
    sync();

    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, reduceMotion]);

  return (
    <div ref={trackRef} id="traits-track" className="relative">
      <style>{`
        @keyframes cent-advance{0%{transform:scaleX(1)}21%{transform:scaleX(1.055)}42%,100%{transform:scaleX(1)}}
        @keyframes cent-knob{0%{transform:translate(50%,-50%) scaleX(1)}21%{transform:translate(50%,-50%) scaleX(.9479)}42%,100%{transform:translate(50%,-50%) scaleX(1)}}
        @keyframes cent-tally{0%{clip-path:inset(0 100% 0 0);opacity:1}11%{clip-path:inset(0 0 0 0);opacity:1}30%{clip-path:inset(0 0 0 0);opacity:0}100%{clip-path:inset(0 0 0 0);opacity:0}}
        @keyframes cent-lift{0%,100%{transform:translateY(0) scale(1)}4%{transform:translateY(-3.5px) scale(1.09)}12%{transform:translateY(0) scale(1)}}
        @keyframes cent-wave{0%,100%{opacity:0}4%{opacity:.16}11%{opacity:0}}
        @keyframes cent-bio-pulse{0%{transform:scale(1);opacity:.5}28%{transform:scale(3.6);opacity:0}100%{transform:scale(3.6);opacity:0}}
        .cent-lift{animation:cent-lift 8s ease-in-out infinite;}
        .cent-wave{animation:cent-wave 8s ease-in-out infinite;}
        .cent-advance{animation:cent-advance 8.5s ease-in-out infinite;}
        .cent-knob{animation:cent-knob 8.5s ease-in-out infinite;}
        .cent-tally{animation:cent-tally 10s cubic-bezier(.22,1,.36,1) infinite;}
        .cent-bio-pulse{animation:cent-bio-pulse 6.5s cubic-bezier(.22,1,.36,1) infinite;}
        @media (prefers-reduced-motion: reduce) {
          .cent-bio-ring,.cent-wave{animation:none !important;opacity:0 !important;}
          .cent-advance,.cent-lift{animation:none !important;transform:none;}
          .cent-tally{animation:none !important;clip-path:none !important;opacity:0 !important;}
          .cent-knob{animation:none !important;transform:translate(50%,-50%);}
          .cent-bio-pulse{animation:none !important;}
        }
      `}</style>
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
                {personas.map((p, i) => {
                  const Art = PERSONA_ART[p.title];
                  return (
                    <div
                      key={p.title}
                      ref={(el) => { cardRefs.current[i] = el; }}
                      className="absolute left-1/2 top-0 bg-white rounded-[22px] overflow-hidden will-change-transform transition-[transform,filter,opacity,box-shadow,background-color] duration-[600ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
                      style={{ width: 338, marginLeft: -169, padding: "12px 12px 18px" }}
                    >
                      {/* Focus-driven scale/filter/glow only — no pointer
                          handlers. The handoff is explicit that hover does
                          nothing here; only scroll position moves focus. */}
                      <div
                        ref={(el) => { artRefs.current[i] = el; }}
                        style={{
                          cursor: "default",
                          transition: "transform .5s,filter .5s,box-shadow .5s",
                          filter: "grayscale(1) contrast(.82) brightness(1.16) opacity(.3)",
                        }}
                      >
                        <div
                          ref={(el) => { artboxRefs.current[i] = el; }}
                          className="relative z-[1] rounded-t-[22px] overflow-hidden"
                          style={{ margin: "-12px -12px 0" }}
                        >
                          {Art ? <Art /> : p.art}
                        </div>
                      </div>
                      <div
                        ref={(el) => { titleRefs.current[i] = el; }}
                        className="font-bold tracking-[-.03em]"
                        style={{ color: p.accent, fontSize: 17, lineHeight: 1.06, marginTop: 15, transition: "opacity .6s cubic-bezier(.22,1,.36,1)" }}
                      >
                        {p.title}
                      </div>
                      <p
                        ref={(el) => { bodyRefs.current[i] = el; }}
                        style={{ fontSize: 13.5, lineHeight: 1.6, color: "#5B5349", marginTop: 10, transition: "opacity .6s cubic-bezier(.22,1,.36,1),color .6s cubic-bezier(.22,1,.36,1)" }}
                      >
                        {p.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { Reveal } from "./Reveal";
import { usePersonaArc } from "../hooks/usePersonaArc";

export interface PersonaData {
  title: string;
  accent: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/* Persona card art — copied verbatim (colors, sizes, positions, SVG path
 * data) from the handoff's source/persona-section.html. Each card owns a
 * distinct animated element from source/persona-arc.css (loaded globally
 * below), ported class-for-class with its authored `animation-delay`:
 *   - Principled ("SHOWED UP" streak):  cent-lift (transform) + cent-wave
 *     (opacity) on each day's checkbox.
 *   - Determined ("GOAL PROGRESS" bar): cent-advance/cent-knob (scaleX).
 *   - Intentional ("TODAY, EXACTLY"):   cent-tally (clip-path) as an
 *     overlay on top of a static bar — the bar itself never animates back
 *     to zero width (that reads as the data emptying).
 *   - Proactive ("SPOTTED EARLY"):      cent-bio-pulse, an expanding +
 *     fading ring (transform scale + opacity).
 * `usePersonaArc`'s phase-sync pass re-times each of these against one
 * shared clock so a remount can't desync them. */
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

/** Sparkline path data and the bio-pulse dot's position are copied verbatim
 *  from source/persona-section.html (card 4's `<svg>`): the curve ends at
 *  x≈146 of the 200-wide viewBox, not a full-width sweep, and the pulsing
 *  dot sits at `right:27%; top:15px` — both differ from what an earlier
 *  round of this component approximated (a longer curve reaching x=200,
 *  and a dot pinned to the art box's corner at `right:0; top:25`). Per this
 *  repo's standing rule, the handoff's own markup is the literal source for
 *  these values, not a freehand reproduction. */
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
            d="M 0 4 C 3.7 4.8, 14.7 9.2, 22 9 C 29.3 8.8, 36.5 2.8, 44 3 C 51.5 3.2, 59.5 9.5, 67 10 C 74.5 10.5, 81.7 5.2, 89 6 C 96.3 6.8, 103.7 12.7, 111 15 C 118.3 17.3, 125.5 19.8, 133 20 C 137.24 20.11, 141.64 18.56, 146.01 17.34 L 146.01 34 L 0 34 Z"
            fill="rgba(47,95,88,.10)"
            stroke="none"
          />
          <path
            d="M 0 4 C 3.7 4.8, 14.7 9.2, 22 9 C 29.3 8.8, 36.5 2.8, 44 3 C 51.5 3.2, 59.5 9.5, 67 10 C 74.5 10.5, 81.7 5.2, 89 6 C 96.3 6.8, 103.7 12.7, 111 15 C 118.3 17.3, 125.5 19.8, 133 20 C 137.24 20.11, 141.64 18.56, 146.01 17.34"
            fill="none"
            stroke="#2F5F58"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span aria-hidden className="absolute" style={{ right: "27%", top: 15, width: 10, height: 10, transform: "translate(50%,-50%)" }}>
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

/** Title-keyed so Home.tsx's `personas` prop (title/accent/description)
 *  drives which art each card gets — every persona this handoff defines
 *  (Principled/Determined/Intentional/Proactive) has a built-in match. */
const PERSONA_ART: Record<string, React.FC> = {
  Principled: PrincipledArt,
  Determined: DeterminedArt,
  Intentional: IntentionalArt,
  Proactive: ProactiveArt,
};

const CARD_TRANSITION =
  "background-color .6s cubic-bezier(.22,1,.36,1),border-color .6s cubic-bezier(.22,1,.36,1),transform .6s cubic-bezier(.22,1,.36,1),filter .6s cubic-bezier(.22,1,.36,1),opacity .6s cubic-bezier(.22,1,.36,1),box-shadow .6s cubic-bezier(.22,1,.36,1)";

/** "Who it's for" persona arc: four cards ride a semi-circle fan, scrubbed by
 *  scroll inside a sticky track. All geometry (sizing pass, arc paint, fit
 *  correction, pin/fit math, focus paint, animation phase sync) is owned by
 *  `usePersonaArc` — adopted verbatim from the handoff's own reference hook,
 *  per this repo's standing rule for handoff reference hooks (same pattern
 *  as the pillar rail's `usePillarRail` and the ecosystem slider's
 *  `useEcoSlider`). This component only renders the literal DOM contract
 *  the hook depends on (README §3: #traits-track > #traits-section >
 *  [data-persona-stage] > #persona-wrap > [data-persona-card] ×4) and the
 *  card art copied from source/persona-section.html.
 *
 *  Replaces an older port based on a prior design version: fixed 246px
 *  cards, hover-based focus, no sizing pass, no fit correction (so rotated
 *  cards clipped at the stage's bottom edge on short viewports), no title
 *  rule line, and the pin formula's `102 − top` padding term — which went
 *  negative on a short screen and pushed the stage down by the very
 *  overflow it was meant to absorb. §5 of the handoff (revised 23 Sep 2026)
 *  fixes the pin/fit math with a different formula entirely (fixed 30px
 *  section padding-top; the wrap's own top and the section's sticky offset
 *  are what absorb the shortfall instead) — ported here via the hook,
 *  not reconstructed from the old formula.
 *
 *  Focus is scroll-driven ONLY (no hover handlers on the art, per the
 *  handoff's explicit call-out), and the heading renders inside this
 *  component's own sticky section (via the `heading` prop) so it pins
 *  together with the card ring as one unit, matching README §3's DOM
 *  structure. Per source/persona-arc.logic.js's reveal section (D),
 *  elements inside `#traits-track` never stagger — they must start with
 *  the scroll — so the stage's own reveal wrapper carries no delay, even
 *  though the handoff's static markup shows `data-reveal-delay=".08s"` on
 *  that node (the runtime override wins; see the standing rule on reading
 *  the actual init logic over a static attribute). */
export const PersonaArc: React.FC<{ personas: PersonaData[]; heading: React.ReactNode }> = ({ personas, heading }) => {
  const { track, section, stage, wrap } = usePersonaArc();

  return (
    <div ref={track} id="traits-track" style={{ position: "relative" }}>
      {/* Verbatim from the handoff's `source/persona-arc.css` — the card
          art's looping animations, kept global the same way pillar-rail.css
          / eco-slider.css are embedded by their own components. */}
      <style>{`
@keyframes cent-lift{0%,100%{transform:translateY(0) scale(1)}4%{transform:translateY(-3.5px) scale(1.09)}12%{transform:translateY(0) scale(1)}}
.cent-lift{animation:cent-lift 8s ease-in-out infinite;}
@keyframes cent-wave{0%,100%{opacity:0}4%{opacity:.16}11%{opacity:0}}
.cent-wave{animation:cent-wave 8s ease-in-out infinite;}
@keyframes cent-advance{0%{transform:scaleX(1)}21%{transform:scaleX(1.055)}42%,100%{transform:scaleX(1)}}
.cent-advance{animation:cent-advance 8.5s ease-in-out infinite;}
@keyframes cent-knob{0%{transform:translate(50%,-50%) scaleX(1)}21%{transform:translate(50%,-50%) scaleX(.9479)}42%,100%{transform:translate(50%,-50%) scaleX(1)}}
.cent-knob{animation:cent-knob 8.5s ease-in-out infinite;}
@keyframes cent-tally{0%{clip-path:inset(0 100% 0 0);opacity:1}11%{clip-path:inset(0 0 0 0);opacity:1}30%{clip-path:inset(0 0 0 0);opacity:0}100%{clip-path:inset(0 0 0 0);opacity:0}}
.cent-tally{animation:cent-tally 10s cubic-bezier(.22,1,.36,1) infinite;}
@keyframes cent-bio-pulse{0%{transform:scale(1);opacity:.5}28%{transform:scale(3.6);opacity:0}100%{transform:scale(3.6);opacity:0}}
.cent-bio-pulse{animation:cent-bio-pulse 6.5s cubic-bezier(.22,1,.36,1) infinite;}
@media (prefers-reduced-motion: reduce){
.cent-bio-ring,.cent-wave{animation:none !important;opacity:0 !important;}
.cent-advance,.cent-lift{animation:none !important;transform:none;}
.cent-tally{animation:none !important;clip-path:none !important;opacity:0 !important;}
.cent-knob{animation:none !important;transform:translate(50%,-50%);}
.cent-bio-pulse{animation:none !important;}
}
      `}</style>
      <div
        ref={section}
        id="traits-section"
        style={{ position: "relative", padding: "clamp(72px,8vw,96px) clamp(20px,4vw,40px) clamp(28px,3vw,40px)" }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          {heading}
          {/* No stagger delay: per persona-arc.logic.js's reveal section
              (D), any node inside #traits-track starts with the scroll,
              regardless of the static markup's data-reveal-delay. */}
          <Reveal>
            <div
              ref={stage}
              data-persona-stage=""
              style={{
                position: "relative",
                marginTop: 44,
                height: 552,
                overflow: "hidden",
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
              <div ref={wrap} id="persona-wrap" style={{ position: "absolute", left: 0, right: 0, top: 96, bottom: 0 }}>
                {personas.map((p) => {
                  const Art = PERSONA_ART[p.title];
                  return (
                    <div
                      key={p.title}
                      data-persona-card=""
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: 0,
                        width: 338,
                        marginLeft: -169,
                        background: "#fff",
                        border: 0,
                        borderRadius: 22,
                        padding: "12px 12px 18px",
                        overflow: "hidden",
                        willChange: "transform",
                        transition: CARD_TRANSITION,
                      }}
                    >
                      {/* Focus-driven scale/filter/glow only — no pointer
                          handlers. The handoff is explicit that hover does
                          nothing here; only scroll position moves focus.
                          `cursor: pointer` is the literal static default
                          from source/persona-section.html; usePersonaArc's
                          paintFocus overwrites it to "default" once mounted. */}
                      <div
                        data-persona-art=""
                        style={{
                          cursor: "pointer",
                          transition: "transform .5s,filter .5s,box-shadow .5s",
                          filter: "grayscale(1) contrast(.82) brightness(1.16) opacity(.3)",
                          // Not a handoff value. The focused card's art gets
                          // a spec'd scale(1.04) zoom (usePersonaArc's
                          // paintFocus, which only ever touches this
                          // element's `transform`, never `transformOrigin`,
                          // so this is safe to set statically here). Default
                          // transform-origin is the element's own center, so
                          // that 4% growth splits evenly -- half bleeds
                          // upward (harmless, into the card's own top
                          // padding), half bleeds DOWNWARD past this
                          // wrapper's box into the title below it, since a
                          // CSS scale doesn't push siblings out of the way.
                          // A margin here to absorb that downward half (tried
                          // first) fixed the overlap but read as an
                          // unwanted empty gap instead. Anchoring the scale
                          // to the bottom edge puts the entire 4% growth
                          // upward instead, into the same space the old
                          // center-anchored version harmlessly used for its
                          // upward half -- so the title sits flush against
                          // the art with neither an overlap nor a gap,
                          // measured overlap-free on Chromium; the bottom
                          // edge no longer moves at all, so this should hold
                          // regardless of how a given engine rounds the
                          // transform.
                          transformOrigin: "center bottom",
                        }}
                      >
                        <div
                          data-persona-artbox=""
                          className="relative z-[1] rounded-t-[22px] overflow-hidden"
                          style={{ width: "auto", height: 180, margin: "-12px -12px 0" }}
                        >
                          <Art />
                        </div>
                      </div>
                      <div
                        data-persona-title=""
                        style={{
                          position: "relative",
                          fontWeight: 700,
                          fontSize: 17,
                          letterSpacing: "-.01em",
                          marginTop: 15,
                          color: p.accent,
                          transition: "opacity .6s cubic-bezier(.22,1,.36,1)",
                        }}
                      >
                        {/* The rule line MUST be an SVG with a non-scaling
                            stroke, not a CSS border: cards scale between
                            0.68 and 1, and a border would thin as they
                            shrink. It lives on the title (not the art box)
                            so the art's focus filter can't shift its color. */}
                        <svg
                          data-persona-rule=""
                          aria-hidden="true"
                          preserveAspectRatio="none"
                          viewBox="0 0 100 8"
                          style={{ position: "absolute", left: 0, right: 0, top: 0, width: "100%", height: 8, overflow: "visible", pointerEvents: "none" }}
                        >
                          <line x1="0" y1="4" x2="100" y2="4" stroke="currentColor" strokeWidth={4} vectorEffect="non-scaling-stroke" />
                        </svg>
                        {p.title}
                      </div>
                      <p
                        data-persona-body=""
                        style={{
                          fontSize: 13.5,
                          lineHeight: 1.6,
                          color: "#5B5349",
                          margin: "10px 0 0",
                          transition: "opacity .6s cubic-bezier(.22,1,.36,1),color .6s cubic-bezier(.22,1,.36,1)",
                        }}
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

/**
 * HeroSection — #hero-band (hero + reviews belt), replacing the previous
 * inline block in Home.tsx. Ported from the dedicated hero handoff
 * (design_handoff_hero/HeroSection.tsx), which was itself written directly
 * from the design's fully-rendered `source/hero.html` — every value below
 * traces to that markup. Inline styles on purpose (handoff README §5): the
 * clamp()/min() fluid values and the long mask/gradient strings don't
 * survive Tailwind's stepped breakpoint utilities, which is what the prior
 * port's `text-[44px] sm:text-6xl lg:text-[76px]` / `pt-[132px] sm:pt-[172px]`
 * got wrong (they jump at 640/1024 instead of scaling fluidly).
 *
 * Differences from the reference file, both deliberate and both matching
 * this codebase's own existing (pre-handoff) conventions rather than the
 * handoff's literal placeholder values:
 *   - Image `src`s are "/hero-*.png" not "/public/hero-*.png": this Vite
 *     project serves its `public/` folder at the site root, so the
 *     handoff's own literal path would 404 here.
 *   - "Request a Demo" links to the real `/contact` ROUTE (react-router
 *     `Link`), not `href="#contact"`: Contact is a real page in this app,
 *     not an in-page anchor (see useHeroFlow.ts's own long-standing note
 *     that Contact/Legal are real routes here, so Home fully unmounts on
 *     navigating to them rather than the hero canvas idling underneath).
 *   - The reviews belt is the existing `ReviewsConveyor` component rather
 *     than inlined card markup: already verified against this handoff's
 *     §2 (reviewer names/roles/quotes, card layout, `mkt-belt 46s` keyframe)
 *     and correct, so it's reused rather than duplicated.
 */
import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { useHeroFlow } from "../hooks/useHeroFlow";
import { useHeroSubtext } from "../hooks/useHeroSubtext";
import { ReviewsConveyor, type Review } from "./ReviewsConveyor";
import { Reveal } from "./Reveal";

const REVIEWS: Review[] = [
  { initials: "JD", name: "Jane Doe", role: "General User", tone: "primary", quote: "Nutrition goals that adapt to you, not the other way around." },
  { initials: "JD", name: "John Doe", role: "Athlete", tone: "teal", quote: "Every set, every rep, every metric, tracked live." },
  { initials: "JR", name: "Jane Roe", role: "Dietitian", tone: "primary", quote: "Your clients, your plans, one seamless system." },
  { initials: "JR", name: "John Roe", role: "General User", tone: "teal", quote: "One place to understand, manage and improve your health." },
  { initials: "JP", name: "Jane Poe", role: "Personal Trainer", tone: "primary", quote: "Manage everything from health data to workouts and nutrition." },
  { initials: "JP", name: "John Poe", role: "General User", tone: "teal", quote: "Log less, eat better." },
];

/** README §1/§3 rows 4-5: a radial ellipse centred just above the viewport
 *  (`at 50% -6%`, `128% 96%`) with 20 eased stops, applied to BOTH the
 *  background-only layer and the canvas wrapper — NEVER a straight
 *  top-to-bottom linear-gradient, which gives a flat horizontal seam
 *  instead of the ellipse's side taper. Copied verbatim from
 *  source/hero.html; do not hand-write an approximation. */
const EASE_MASK =
  "radial-gradient(ellipse 128% 96% at 50% -6%,#000 0%,rgba(0,0,0,1.0000) 30.0%,rgba(0,0,0,0.9095) 33.5%,rgba(0,0,0,0.8229) 37.0%,rgba(0,0,0,0.7403) 40.5%,rgba(0,0,0,0.6618) 44.0%,rgba(0,0,0,0.5873) 47.5%,rgba(0,0,0,0.5169) 51.0%,rgba(0,0,0,0.4507) 54.5%,rgba(0,0,0,0.3887) 58.0%,rgba(0,0,0,0.3309) 61.5%,rgba(0,0,0,0.2774) 65.0%,rgba(0,0,0,0.2283) 68.5%,rgba(0,0,0,0.1836) 72.0%,rgba(0,0,0,0.1434) 75.5%,rgba(0,0,0,0.1078) 79.0%,rgba(0,0,0,0.0769) 82.5%,rgba(0,0,0,0.0509) 86.0%,rgba(0,0,0,0.0299) 89.5%,rgba(0,0,0,0.0141) 93.0%,rgba(0,0,0,0.0039) 96.5%,rgba(0,0,0,0.0000) 100.0%)";

const BAND_BG =
  "radial-gradient(70% 42% at 50% 22%,#F6F3FC 0%,rgba(246,243,252,.72) 36%,rgba(246,243,252,0) 72%)," +
  "radial-gradient(58% 44% at 2% 60%,rgba(140,110,222,.34) 0%,rgba(140,110,222,0) 62%)," +
  "radial-gradient(58% 44% at 98% 60%,rgba(84,158,146,.34) 0%,rgba(84,158,146,0) 62%)," +
  "linear-gradient(90deg,#B49DEA 0%,#C4B7EC 24%,#D2D6E4 50%,#A8CFC6 76%,#8CC1B6 100%)";

/** README §2/§3 row 7-8: `clamp(44px,6.4vw,76px)` for both headline lines —
 *  65.5px at 1024 wide, 49.2px at 768, never a stepped 44/60/76px jump. */
const HEAD: React.CSSProperties = { fontWeight: 800, fontSize: "clamp(44px,6.4vw,76px)", lineHeight: 1.03, letterSpacing: "-.034em", color: "#221E1A" };

export interface HeroSectionProps {
  /** see useHeroFlow: loader showing, contact/legal overlay open, or long nav scroll running */
  isOccluded: () => boolean;
  /** tier-1 slow device: nav must drop backdrop-filter on [data-glassy] (README §7) */
  onDegradeGlass: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ isOccluded, onDegradeGlass }) => {
  const canvasRef = useHeroFlow({ isOccluded, onDegrade: onDegradeGlass });
  const subRef = useRef<HTMLDivElement>(null);
  useHeroSubtext(subRef);

  return (
    <div id="hero-band" style={{ position: "relative", background: "#fff" }}>
      {/* background-only layer: the eased radial mask lives HERE, never on a content wrapper.
          mask-image alpha-multiplies EVERYTHING inside the element it's on, so putting it on a
          wrapper that also holds real content (copy, reviews) fades those too — CLAUDE.md's
          root-cause #1. Keep this a background-only sibling, not a shared container. */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: BAND_BG, WebkitMaskImage: EASE_MASK, maskImage: EASE_MASK }} />

      {/* NO overflow:hidden on #top — the canvas wrapper deliberately runs 300px below it, under the reviews belt */}
      <section id="top" style={{ position: "relative" }}>
        <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: -300, overflow: "hidden", pointerEvents: "none", zIndex: 0, opacity: 0.92, WebkitMaskImage: EASE_MASK, maskImage: EASE_MASK }}>
          <canvas id="hero-canvas" ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 30% 26% at 50% 34%,rgba(247,245,253,.5) 0%,rgba(247,245,253,.2) 58%,rgba(247,245,253,0) 84%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(232,225,250,.42) 0%,rgba(251,250,254,0) 24%,rgba(255,255,255,.08) 78%,rgba(255,255,255,0) 100%)" }} />
        </div>

        <div style={{ position: "relative", zIndex: 10, maxWidth: 1180, margin: "0 auto", padding: "clamp(132px,13vw,172px) clamp(20px,4vw,40px) 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          {/* Above-the-fold: on screen at load, shown immediately, NOT wrapped in the
              site's <Reveal> (framer-motion) fade — README §8/§3 row 13. <Reveal>'s
              whileInView starts every child at opacity:0 until its IntersectionObserver
              confirms the element is in view, which is exactly the "blank hero flashes
              on load" bug the handoff calls out. A plain div renders at opacity 1 from
              first paint, no observer round-trip. */}
          <div data-reveal="">
            <span style={{ display: "block", fontWeight: 800, fontSize: 11, letterSpacing: ".22em", color: "#7D67D9" }}>NUTRITION · TRAINING · HEALTH · COMMUNITY</span>
            <h1 style={{ ...HEAD, margin: "20px 0 0", maxWidth: 900 }}>Your health,</h1>
            <div id="hero-line2" style={{ ...HEAD, display: "inline-block", marginTop: 6, whiteSpace: "nowrap" }}>
              <span id="hw-all">All</span> in <span id="hw-one">one</span> <span id="hw-place">place</span>
            </div>
            <div id="hero-sub" ref={subRef} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "center", columnGap: 24, rowGap: 10, marginTop: 24, fontSize: 18, lineHeight: 1.4, color: "#5B5349" }}>
              <span className="hero-sub-line" data-word="hw-all" style={{ whiteSpace: "nowrap" }}>More clarity.</span>
              <span className="hero-sub-line" data-word="hw-one" style={{ whiteSpace: "nowrap" }}>More control.</span>
              <span className="hero-sub-line" data-word="hw-place" style={{ whiteSpace: "nowrap" }}>More you.</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 36 }}>
              <Link
                to="/app"
                className="hero-cta-solid"
                style={{ padding: "16px 30px", borderRadius: 999, background: "#7D67D9", color: "#fff", fontWeight: 600, fontSize: 15, transition: "background-color .2s,transform .15s" }}
              >
                Get Started
              </Link>
              {/* Request a Demo: real CSS hover/active states (.hero-cta-ghost, in
                  index.css) rather than JS onMouseEnter/onMouseLeave handlers — README
                  §3 row 10 / ground rule 3. Both backdrop-filter properties (Safari
                  needs the -webkit- prefix) plus the three data attributes the tier-1
                  degrade pass (useHeroFlow -> onDegradeGlass) and this test suite key
                  off: data-glassy, data-glassy-fallback, data-ghost-cta. */}
              <Link
                to="/contact"
                data-glassy=""
                data-glassy-fallback="rgba(255,255,255,.72)"
                data-ghost-cta=""
                className="hero-cta-ghost"
                style={{
                  padding: "16px 26px",
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#221E1A",
                  border: "1px solid rgba(255,255,255,.72)",
                  background: "rgba(255,255,255,.42)",
                  backdropFilter: "blur(16px) saturate(1.7)",
                  WebkitBackdropFilter: "blur(16px) saturate(1.7)",
                  boxShadow: "0 10px 28px rgba(72,58,130,.12),inset 0 1px 0 rgba(255,255,255,.6)",
                  transition: "background-color .2s,border-color .2s,transform .15s",
                } as React.CSSProperties}
              >
                Request a Demo
              </Link>
            </div>
          </div>

          {/* Below-the-fold: the existing site-wide <Reveal> (framer-motion
              whileInView, once) is correct HERE — README §8 only calls out
              above-the-fold content as the bug; this block is meant to fade in. */}
          <ReviewsRevealPhones />
        </div>
      </section>

      <section style={{ position: "relative", zIndex: 6 }}>
        <ReviewsConveyor reviews={REVIEWS} />
      </section>
    </div>
  );
};

/** #hero-phones (>=640px) / #hero-phone-solo (<640px), wrapped in the
 *  site-wide <Reveal> (framer-motion, fades in on scroll into view) — the
 *  one block of the hero README §8 says SHOULD fade in, unlike the copy
 *  above it. */
const ReviewsRevealPhones: React.FC = () => {
  return (
    <Reveal delay={0.1} className="w-full">
      {/* >=640px: three real screenshots, natural aspect ratio, no crop, no mask.
          Widths are min(...,vw) (README's "one change made to the design today"):
          between 640-912px the screenshots would otherwise overflow the viewport. */}
      <div id="hero-phones" className="hidden sm:flex" style={{ alignItems: "center", justifyContent: "center", gap: "clamp(14px,2vw,26px)", margin: "76px 0 clamp(48px,6vw,80px)" }}>
        <img
          src="/hero-food.png"
          alt="Centium food diary"
          width={1170}
          height={2532}
          style={{ flex: "0 0 auto", display: "block", width: "min(236px,26vw)", height: "auto", borderRadius: 22, boxShadow: "0 18px 50px rgba(72,58,130,.14)" }}
        />
        <img
          src="/hero-dashboard.png"
          alt="Centium dashboard"
          width={1170}
          height={2532}
          style={{ flex: "0 0 auto", display: "block", width: "min(310px,34vw)", height: "auto", borderRadius: 22, boxShadow: "0 28px 70px rgba(72,58,130,.22)" }}
        />
        <img
          src="/hero-workout.png"
          alt="Centium workout routines"
          width={1170}
          height={2532}
          style={{ flex: "0 0 auto", display: "block", width: "min(236px,26vw)", height: "auto", borderRadius: 22, boxShadow: "0 18px 50px rgba(72,58,130,.14)" }}
        />
      </div>
      {/* <640px: the dashboard alone */}
      <div id="hero-phone-solo" className="sm:hidden flex justify-center" style={{ marginTop: 48 }}>
        <img
          src="/hero-dashboard.png"
          alt="Centium dashboard"
          width={1170}
          height={2532}
          style={{ display: "block", width: "min(260px,72vw)", height: "auto", borderRadius: 20, boxShadow: "0 20px 50px rgba(72,58,130,.18)" }}
        />
      </div>
    </Reveal>
  );
};

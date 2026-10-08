import React, { useState } from "react";
import { CentiumMark, MARK_C_PATH, MARK_LEAF_PATH } from "../../components/icons/CentiumMark";

// v6 (TK 4.1, X-24): the vector mark replaces public/centium-mark.png, framed
// as that PNG ("png", 687 x 713) so it sits exactly where the 108 px image
// did. The launch sweep is masked to the same artwork through an inline SVG.
const MARK_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="279.1 180.1 687 713"><path d="${MARK_C_PATH}"/><path d="${MARK_LEAF_PATH}"/></svg>`
)}")`;

// Design refinement §3a/3b (Welcome, handoff canvas): the real mark asset
// at 108px replaces the old white-tile + redrawn-SVG treatment, with an
// idle "breathing" pulse and a launch animation — two brand-colour rings
// expanding behind the mark, a squash/overshoot bloom, and a conic-gradient
// sweep masked to the mark's own shape. Every colour here maps onto an
// existing token (`primary` for the primary ring/button, `teal` for the
// sage ring — both identical in light/dark to the doc's literal values),
// so it re-tints for dark mode automatically rather than needing a second
// hardcoded palette.
// V8/V9 (QA): the ~750ms hand-off before `onNext` fires is unchanged —
// the doc explicitly keeps "the same ~750ms hand-off the existing
// WelcomeStep already waits for."
const LAUNCH_MS = 750;

export const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const [launching, setLaunching] = useState(false);

  const handleGetStarted = () => {
    if (launching) return;
    setLaunching(true);
    setTimeout(onNext, LAUNCH_MS);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-slide-up">
      {/* `inset-0 m-auto` centers the fixed-size children without relying
          on `transform` — the breathe/ring keyframes below set
          `transform: scale(...)` directly, which would silently replace
          (not compose with) a `-translate-x-1/2 -translate-y-1/2`
          centering transform and leave the mark anchored at the parent's
          top-left-of-center instead of truly centered. */}
      <div className="relative w-[108px] h-[112px] mb-11">
        {launching ? (
          <>
            <span className="absolute inset-0 m-auto w-[108px] h-[108px] rounded-full bg-primary animate-cent-ring-a" />
            <span className="absolute inset-0 m-auto w-[108px] h-[108px] rounded-full bg-teal animate-cent-ring-b" />
            <span className="absolute inset-0 animate-cent-bloom">
              <span className="w-full h-full flex items-center justify-center">
                <CentiumMark height={108} framing="png" label="Centium" />
              </span>
              <span
                className="absolute -inset-[6%] animate-cent-sweep"
                style={{
                  background:
                    "conic-gradient(from 0deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0) 250deg, rgba(255,255,255,.92) 320deg, rgba(255,255,255,0) 360deg)",
                  WebkitMaskImage: MARK_MASK,
                  maskImage: MARK_MASK,
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                }}
              />
            </span>
          </>
        ) : (
          <span className="absolute inset-0 m-auto w-[108px] h-[108px] flex items-center justify-center animate-cent-breathe">
            <CentiumMark height={108} framing="png" label="Centium" />
          </span>
        )}
      </div>

      <div className="w-full max-w-xs">
        <div className={launching ? "animate-cent-out" : undefined}>
          <h1 className="font-display text-[33px] leading-[1.14] font-bold text-charcoal mb-4 tracking-[-0.03em] text-pretty">
            Your health.
            <br />
            All in one place.
          </h1>
          <p className="text-charcoal-soft text-[14.5px] leading-[1.6] font-medium max-w-[280px] mx-auto mb-[46px] text-pretty">
            Food, fitness, health metrics and everything in between, built around you.
          </p>
          {launching ? (
            <div className="w-full h-14 rounded-2xl bg-primary-fill text-on-primary-fill flex items-center justify-center font-bold text-[15.5px] tracking-[-0.01em]">
              Get Started
            </div>
          ) : (
            <button
              onClick={handleGetStarted}
              className="tap w-full h-14 rounded-2xl bg-primary-fill text-on-primary-fill font-bold text-[15.5px] tracking-[-0.01em] shadow-[0_2px_10px_rgb(var(--th-7d6bb5)/0.26)] dark:shadow-none"
            >
              Get Started
            </button>
          )}
          <p className="text-charcoal-tertiary text-[11px] font-medium tracking-[0.02em] mt-5">
            CENTIUM · a product prototype
          </p>
        </div>
      </div>
    </div>
  );
};

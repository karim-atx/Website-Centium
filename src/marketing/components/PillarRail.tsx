import React from "react";
import { Reveal } from "./Reveal";
import { usePillarRail } from "../hooks/usePillarRail";

export interface PillarData {
  eyebrowNum: string;
  ink: string;
  accent: string;
  wash: string;
  titleGradient: string;
  titleWord: string;
  h3: string;
  mockup: React.ReactNode;
}

const GUTTER = 28;

// The leaf badge's blade and its inner "slit" are two separate paths in the
// handoff, composited via an SVG <mask> — not one path rendered with
// fill-rule="evenodd". Per the handoff's own Gotchas: "SVG evenodd fills
// geometry outside the outline. A leaf slit whose end fell outside the
// blade rendered as a stray sliver; use a mask so the cut can only apply
// where the shape is."
const LEAF_BLADE_PATH =
  "M 924.1 543.4 L 915.6 549.5 L 905.6 555.7 L 894 561.9 L 878.6 568.1 L 859.3 574.2 L 830 580.4 L 796.8 586.6 L 768.2 592.8 L 748.1 598.9 L 731.9 605.1 L 718.8 611.3 L 708 617.5 L 698.7 623.6 L 690.2 629.8 L 682.5 636 L 675.5 642.2 L 669.4 648.3 L 664 654.5 L 658.6 660.7 L 653.9 666.9 L 650.1 673.1 L 645.4 679.2 L 641.6 685.4 L 637.7 691.6 L 634.6 697.8 L 631.5 703.9 L 628.5 710.1 L 626.1 716.3 L 623.8 722.5 L 621.5 728.6 L 619.2 734.8 L 617.6 741 L 615.3 747.2 L 613.8 753.3 L 612.2 759.5 L 611.5 765.7 L 609.9 771.9 L 609.2 778 L 608.4 784.2 L 607.6 790.4 L 681.7 796.6 L 671.7 802.8 L 661.7 808.9 L 651.6 815.1 L 643.1 821.3 L 634.6 827.5 L 626.1 833.6 L 618.4 839.8 L 611.5 846 L 603.8 852.2 L 596.8 858.3 L 589.9 864.5 L 582.9 870.7 L 576.7 876.9 L 569.8 883 L 607.6 887.7 L 637.7 887.7 L 684.8 883 L 713.4 876.9 L 734.2 870.7 L 751.2 864.5 L 765.1 858.3 L 778.2 852.2 L 789 846 L 799.1 839.8 L 808.3 833.6 L 816.8 827.5 L 824.5 821.3 L 832.3 815.1 L 839.2 808.9 L 845.4 802.8 L 851.6 796.6 L 857.7 790.4 L 863.2 784.2 L 867.8 778 L 872.4 771.9 L 877 765.7 L 881.7 759.5 L 885.5 753.3 L 889.4 747.2 L 893.3 741 L 896.3 734.8 L 899.4 728.6 L 902.5 722.5 L 905.6 716.3 L 907.9 710.1 L 911 703.9 L 913.3 697.8 L 915.6 691.6 L 917.2 685.4 L 919.5 679.2 L 921.1 673.1 L 922.6 666.9 L 924.1 660.7 L 925.7 654.5 L 927.2 648.3 L 928 642.2 L 929.5 636 L 930.3 629.8 L 931.1 623.6 L 931.9 617.5 L 931.9 611.3 L 932.6 605.1 L 932.6 598.9 L 932.6 592.8 L 931.9 586.6 L 931.9 580.4 L 931.1 574.2 L 930.3 568.1 L 930.3 561.9 L 928.8 555.7 L 928 549.5 L 926.5 543.4 Z";
const LEAF_SLIT_PATH =
  "M 829.2 668.4 L 826.1 674.6 L 822.2 680.8 L 817.6 686.9 L 813.7 693.1 L 809.1 699.3 L 804.5 705.5 L 799.8 711.7 L 794.4 717.8 L 789 724 L 782.9 730.2 L 776.7 736.4 L 769.7 742.5 L 762.8 748.7 L 755.1 754.9 L 746.6 761.1 L 737.3 767.2 L 727.3 773.4 L 715.7 779.6 L 703.3 785.8 L 691 791.9 L 683.3 795.8 L 656.2 809.3 L 589.5 809.3 L 608.4 795.8 L 613.8 791.9 L 622.3 785.8 L 632.3 779.6 L 643.1 773.4 L 655.5 767.2 L 668.6 761.1 L 684 754.9 L 699.5 748.7 L 714.2 742.5 L 727.3 736.4 L 739.6 730.2 L 751.2 724 L 761.2 717.8 L 771.3 711.7 L 779.8 705.5 L 789 699.3 L 797.5 693.1 L 805.2 686.9 L 813 680.8 L 819.9 674.6 L 826.9 668.4 Z";

/** The Platform section's pinned horizontal rail — ported literally from the
 *  dedicated pillar-section handoff (`design_handoff_pillar_rail`), whose
 *  own `usePillarRail.ts` reference hook (`../hooks/usePillarRail`) is used
 *  as-is per the handoff's instruction, not re-derived here.
 *
 *  This file owns only:
 *  - the static markup contract the hook's selectors depend on (`data-pane`,
 *    `data-pillar-badge`, `data-pillar-eyebrow`, `data-pillar-name`,
 *    `data-pane-figure`, `h3`, each pane's own DOM order — see the handoff's
 *    README §3, "don't add wrapper elements, keep the children in this
 *    order");
 *  - the six DOM ids/refs the hook attaches to (`#platform-track`,
 *    `#platform`, `#rail-box`, `#rail-fit`, `#rail-viewport`,
 *    `#rail-gallery`);
 *  - the verbatim tier/shed CSS from the handoff's `pillar-rail.css`.
 *
 *  Everything else — pin/scale/shed timing, the scroll→offset sweep, the
 *  active-pane opacity/blur/pointer-events/aria-hidden — is written straight
 *  to the DOM by the hook via refs, never through React state (a state
 *  round-trip would let the fit loop measure stale layout — see the hook's
 *  own doc comment). That's also why this component no longer keeps its own
 *  `active` state or computes per-pane opacity/filter/pointerEvents here:
 *  doing so would fight the hook's direct writes on every unrelated
 *  re-render. `transition` is the one property that's safe to set statically
 *  in JSX, since the hook never touches it.
 *
 *  Do not put `overflow: hidden` on `#platform` — the handoff's README
 *  calls this out explicitly: `#rail-box` intentionally breaks out of the
 *  1180px column with a negative margin (see the hook's `sizeBox()`), and
 *  clipping the section cuts that off. */
export const PillarRail: React.FC<{ pillars: PillarData[]; heading: React.ReactNode }> = ({ pillars, heading }) => {
  const { track, section, railBox, fit, viewport, gallery } = usePillarRail();
  const count = pillars.length;

  return (
    <div ref={track} id="platform-track" className="relative bg-white">
      {/* Verbatim from the handoff's `source/pillar-rail.css` — targets
          data-* attributes and relies on `!important` + child-position
          selectors, so it must stay real CSS, not Tailwind. */}
      <style>{`
/* Tailwind's base line-height (1.5) is not part of the handoff — its
   literal markup leaves line-height undeclared on small text (browser
   default, ~1.15-1.2), only overriding it explicitly on a few elements
   (captions 1.35, meta lines 1.4, h3 1.25, name 1.1, which keep winning
   here since an element's own line-height always beats an inherited one).
   Left at Tailwind's default, every undeclared span inherits 1.5x its own
   font-size instead, inflating every line of mockup text and pushing the
   fit ladder's natural-height measurement well past the design's own
   (e.g. 1695x962 measured k=0.918 instead of the design's own k=0.98,
   enough to drop two cards' smallest text below the desktop 9.5px floor). */
#platform{line-height:normal;}
[data-pane] [data-mod-grid] > div{flex-wrap:wrap !important;}
[data-pane] [data-mod-grid] > div > [data-mod-ui]{flex-shrink:0 !important;max-width:100% !important;}
[data-pane] [data-mod-grid] > div > :has([data-mod-caption]):not([data-mod-ui]){flex:1 1 180px !important;min-width:min(180px,100%) !important;}
[data-pane] [data-mod-grid] > div > :has([data-cap-min="246"]):not([data-mod-ui]){flex-basis:246px !important;min-width:min(246px,100%) !important;}
[data-pane] [data-mod-grid] > div > :has([data-cap-min="230"]):not([data-mod-ui]){flex-basis:230px !important;min-width:min(230px,100%) !important;}
[data-pane] [data-mod-grid] > div > :has([data-cap-min="236"]):not([data-mod-ui]){flex-basis:236px !important;min-width:min(236px,100%) !important;}
@media (max-width:1023px){
#rail-gallery{align-items:flex-start !important;}
#rail-box [data-pane]{min-height:0 !important;max-width:100%;padding:14px !important;overflow:hidden !important;display:flex !important;flex-direction:column !important;justify-content:flex-start !important;}
#rail-box [data-pane] [data-pillar-badge]{width:40px !important;height:40px !important;top:14px !important;right:14px !important;}
#rail-box [data-pane] [data-pillar-badge] svg{width:19px !important;height:19px !important;}
#rail-box [data-pane] [data-pillar-eyebrow]{font-size:11px !important;letter-spacing:.22em !important;padding-right:50px;}
#rail-box [data-pane] [data-pillar-name]{font-size:clamp(28px,7.4vw,40px) !important;line-height:1.06 !important;margin-right:50px;}
#rail-box [data-pane] h3{font-size:clamp(15px,4vw,18px) !important;line-height:1.3 !important;text-wrap:pretty;}
#rail-box [data-pane-figure]{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;margin-top:10px !important;}
#rail-box [data-pane-figure] > div{flex:1 1 auto;display:flex;flex-direction:column;box-shadow:0 12px 28px rgba(72,58,130,.12) !important;}
#rail-box [data-pane-figure] > div > div:first-child{display:none !important;}
#rail-box [data-pane] [data-mock-body]{min-height:0 !important;flex:1 1 auto;flex-direction:column !important;}
#rail-box [data-pane] [data-mock-rail]{width:auto !important;flex-direction:row !important;flex-wrap:wrap !important;gap:4px !important;padding:8px 10px !important;border-right:0 !important;border-bottom:1px solid rgba(34,30,26,.08) !important;}
#rail-box [data-pane] [data-mock-body] > div:not([data-mock-rail]){padding:10px !important;gap:8px !important;}
#rail-box [data-pane] [data-mod-grid]{grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr)) !important;gap:8px !important;flex:0 0 auto !important;align-content:start !important;}
#rail-box [data-pane] [data-mod-grid] > div{flex-direction:column !important;align-items:stretch !important;gap:8px !important;padding:10px !important;}
#rail-box [data-pane] [data-mod-grid] > div > div:not([data-mod-ui]){flex:0 0 auto !important;}
#rail-box [data-pane] [data-mod-grid] > div > [data-mod-ui]{flex:1 1 auto !important;width:100% !important;max-width:none !important;}
#rail-box [data-pane] [data-mod-grid]{flex:1 1 auto !important;align-content:stretch !important;}
@media (max-width:639px){
#rail-box [data-pane] [data-mod-grid]{display:flex !important;flex-direction:column !important;}
#rail-box [data-pane] [data-mod-grid] > div{flex:0 0 auto;}
#rail-box [data-pane] [data-mod-grid] > div[data-mgrow]{flex:1 1 auto !important;}
}
#rail-box [data-pane] [data-mod-caption]{max-width:none !important;font-size:13.5px !important;}
#rail-box [data-pane] [style*="font-size:10px"],#rail-box [data-pane] [style*="font-size: 10px"],#rail-box [data-pane] [style*="font-size:10.5px"],#rail-box [data-pane] [style*="font-size: 10.5px"],#rail-box [data-pane] [style*="font-size:9"],#rail-box [data-pane] [style*="font-size: 9"]{font-size:11px !important;}
#rail-box [data-pane][data-mfit~="1"] [data-mock-rail]:not([data-mkeep]),#rail-box [data-pane][data-mfit~="1"] [data-mock-body] > div:not([data-mock-rail]) > div:not([data-mod-grid]):not([data-mkeep]),#rail-box [data-pane][data-mfit~="1"] [data-mod-grid] > div > div:not([data-mod-ui]) > :nth-child(n+3):not([data-mkeep]),#rail-box [data-pane][data-mfit~="1"] [data-mod-grid] > div > span:not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="2"] [data-mod-grid] > div:nth-child(n+4):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="3"] [data-mod-grid] > div:nth-child(n+2) > [data-mod-ui]:not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="4"] [data-mod-grid] > div:nth-child(n+3):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="5"] [data-mod-grid] > div:nth-child(n+2):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="6"] [data-mod-grid] > div > div:not([data-mod-ui]) > div:first-child:not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="7"] [data-mod-grid] > div > [data-mod-ui]:not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="8"] h3:not([data-mkeep]){display:none !important;}
}
@media (min-width:1024px){
#rail-box [data-pane][data-mfit]{display:flex !important;flex-direction:column !important;min-height:0 !important;overflow:hidden !important;}
#rail-box [data-pane][data-mfit] [data-pane-figure]{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;}
#rail-box [data-pane][data-mfit] [data-pane-figure] > div{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;}
#rail-box [data-pane][data-mfit] [data-mock-body]{min-height:0 !important;flex:1 1 auto;}
#rail-box [data-pane][data-mfit] [data-mock-body] > div:not([data-mock-rail]){min-height:0;}
#rail-box [data-pane][data-mfit] [data-mod-grid]{flex:1 1 auto !important;align-content:stretch !important;}
#rail-box [data-pane][data-mfit] [data-mod-grid] > div{align-items:stretch !important;}
#rail-box [data-pane][data-mfit] [data-mod-grid] > div > [data-mod-ui]{height:auto !important;min-height:114px;align-self:stretch !important;}
#rail-box [data-pane][data-mfit~="1"] [data-pane-figure] > div > div:first-child:not([data-mkeep]),#rail-box [data-pane][data-mfit~="1"] [data-mock-rail]:not([data-mkeep]),#rail-box [data-pane][data-mfit~="1"] [data-mock-body] > div:not([data-mock-rail]) > div:not([data-mod-grid]):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="2"] [data-mod-grid] > div > div:not([data-mod-ui]) > :nth-child(n+3):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="3"] [data-mod-grid] > div:nth-child(n+5):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="4"] [data-mod-grid] > div:nth-child(n+3) > [data-mod-ui]:not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="5"] [data-mod-grid] > div:nth-child(n+4):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="6"] [data-mod-grid] > div:nth-child(n+3):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="7"] [data-mod-grid] > div:nth-child(n+2) > [data-mod-ui]:not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="8"] h3:not([data-mkeep]),#rail-box [data-pane][data-mfit~="8"] [data-mod-grid] > div:nth-child(n+2):not([data-mkeep]){display:none !important;}
}
      `}</style>
      {/* Shared once — the leaf badge's blade is masked by its own slit
          shape rather than carved out with a single evenodd path (see the
          LEAF_BLADE_PATH/LEAF_SLIT_PATH comment above). */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <mask id="cent-leaf-slit" maskUnits="userSpaceOnUse" x={270} y={180} width={690} height={730}>
          <rect x={270} y={180} width={690} height={730} fill="#FFFFFF" />
          <path d={LEAF_SLIT_PATH} fill="#000000" />
        </mask>
      </svg>
      <div
        ref={section}
        id="platform"
        className="relative flex flex-col justify-start bg-white scroll-mt-[88px]"
        style={{ padding: "clamp(20px,2.2vw,30px) 0 clamp(22px,2.4vw,32px)" }}
      >
        <div className="max-w-[1180px] mx-auto px-5 sm:px-10 w-full">
          {heading}
          <div ref={railBox} id="rail-box" className="mt-[46px]">
            <div ref={fit} id="rail-fit" className="origin-top" style={{ transformOrigin: "top center" }}>
              <Reveal delay={0.08}>
              <div ref={viewport} id="rail-viewport" className="rounded-[26px] overflow-hidden">
                <div
                  ref={gallery}
                  id="rail-gallery"
                  className="flex will-change-transform"
                  style={{ flexDirection: "row", gap: GUTTER, width: `calc(${count * 100}% + ${GUTTER * (count - 1)}px)` }}
                >
                  {pillars.map((p) => {
                    const crossAccent = p.accent === "#7D67D9" ? "#5E9E95" : "#7D67D9";
                    return (
                    <div
                      key={p.eyebrowNum}
                      data-pane
                      className="relative rounded-[26px]"
                      style={{
                        flex: `0 0 calc((100% - ${GUTTER * (count - 1)}px) / ${count})`,
                        background: p.wash,
                        border: `3px solid ${p.ink}`,
                        padding: "clamp(12px,1.2vw,16px)",
                        transition: "opacity .45s ease,filter .45s ease",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        data-pillar-badge
                        className="absolute flex items-center justify-center rounded-full"
                        style={{
                          top: "clamp(16px,1.6vw,20px)",
                          right: "clamp(16px,1.6vw,20px)",
                          width: 52,
                          height: 52,
                          border: `2px solid ${crossAccent}`,
                        }}
                      >
                        <svg viewBox="560 520 400 400" fill="none" style={{ width: 24, height: 24, overflow: "visible" }}>
                          <path fillRule="nonzero" mask="url(#cent-leaf-slit)" fill={crossAccent} d={LEAF_BLADE_PATH} />
                        </svg>
                      </span>

                      <div style={{ marginBottom: 3 }}>
                        <span data-pillar-eyebrow className="block font-bold text-[11.5px] tracking-[.26em]" style={{ color: p.accent }}>
                          PILLAR {p.eyebrowNum}
                        </span>
                        <div className="mt-1.5">
                          <div
                            data-pillar-name
                            className="font-display font-extrabold"
                            style={{
                              fontSize: "clamp(34px,3.6vw,48px)",
                              lineHeight: 1.1,
                              letterSpacing: "-.034em",
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

                      <h3
                        className="font-display font-extrabold text-[19px] leading-[1.25] tracking-[-.02em] text-mkt-ink mt-1"
                        style={{ maxWidth: 680 }}
                      >
                        {p.h3}
                      </h3>
                      <div data-pane-figure className="w-full" style={{ marginTop: 8 }}>
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

import React from "react";
import { CENTIUM_MARK_LEAF_PATH } from "./CentiumLogo";
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
                          <path fill={crossAccent} d={CENTIUM_MARK_LEAF_PATH} />
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

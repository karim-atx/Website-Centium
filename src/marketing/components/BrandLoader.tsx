import React, { useEffect, useState } from "react";
import { CentiumWordmark } from "./CentiumLogo";

/** Home's first-paint brand moment, per the v2 landing handoff's "Loading
 *  screen" spec. Fixed full-viewport overlay; auto-dismisses at 3.7s or on
 *  click. Sequence (all fill-mode "both"):
 *    1. leaf falls in behind the mark, zigzagging to rest
 *    2. the C draws clockwise via a conic-gradient mask sweep over
 *       centium-logo-c.png (mask must overshoot 360° and end unmasked, or
 *       the stroke visibly stops short — see the keyframes below)
 *    3. the wordmark fades in, then a white sweep highlight crosses it
 *    4. the whole lockup scales up and fades out
 *  Ported keyframe-for-keyframe from the handoff's own CSS (a JS interval
 *  driving conic-gradient angles would drop frames; a CSS animation over
 *  25 keyframes doesn't). */
export const BrandLoader: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3700);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      onClick={() => setVisible(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <style>{`
        @keyframes centLoaderLeafFall{0%{transform:translate(0,-170px) rotate(-16deg);opacity:0}10%{opacity:1}26%{transform:translate(15px,-112px) rotate(7deg)}46%{transform:translate(-13px,-62px) rotate(-9deg)}66%{transform:translate(9px,-24px) rotate(5deg)}86%{transform:translate(-3px,-4px) rotate(-2deg)}100%{transform:translate(0,0) rotate(0deg)}}
        @keyframes centLoaderCDraw{0%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 0deg,transparent 0deg);mask-image:conic-gradient(from 88deg,#000 0deg 0deg,transparent 0deg)}4.2%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 15deg,transparent 15deg);mask-image:conic-gradient(from 88deg,#000 0deg 15deg,transparent 15deg)}8.3%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 31deg,transparent 31deg);mask-image:conic-gradient(from 88deg,#000 0deg 31deg,transparent 31deg)}12.5%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 46deg,transparent 46deg);mask-image:conic-gradient(from 88deg,#000 0deg 46deg,transparent 46deg)}16.7%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 61deg,transparent 61deg);mask-image:conic-gradient(from 88deg,#000 0deg 61deg,transparent 61deg)}20.8%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 76deg,transparent 76deg);mask-image:conic-gradient(from 88deg,#000 0deg 76deg,transparent 76deg)}25%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 92deg,transparent 92deg);mask-image:conic-gradient(from 88deg,#000 0deg 92deg,transparent 92deg)}29.2%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 107deg,transparent 107deg);mask-image:conic-gradient(from 88deg,#000 0deg 107deg,transparent 107deg)}33.3%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 122deg,transparent 122deg);mask-image:conic-gradient(from 88deg,#000 0deg 122deg,transparent 122deg)}37.5%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 137deg,transparent 137deg);mask-image:conic-gradient(from 88deg,#000 0deg 137deg,transparent 137deg)}41.7%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 153deg,transparent 153deg);mask-image:conic-gradient(from 88deg,#000 0deg 153deg,transparent 153deg)}45.8%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 168deg,transparent 168deg);mask-image:conic-gradient(from 88deg,#000 0deg 168deg,transparent 168deg)}50%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 183deg,transparent 183deg);mask-image:conic-gradient(from 88deg,#000 0deg 183deg,transparent 183deg)}54.2%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 198deg,transparent 198deg);mask-image:conic-gradient(from 88deg,#000 0deg 198deg,transparent 198deg)}58.3%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 214deg,transparent 214deg);mask-image:conic-gradient(from 88deg,#000 0deg 214deg,transparent 214deg)}62.5%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 229deg,transparent 229deg);mask-image:conic-gradient(from 88deg,#000 0deg 229deg,transparent 229deg)}66.7%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 244deg,transparent 244deg);mask-image:conic-gradient(from 88deg,#000 0deg 244deg,transparent 244deg)}70.8%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 259deg,transparent 259deg);mask-image:conic-gradient(from 88deg,#000 0deg 259deg,transparent 259deg)}75%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 275deg,transparent 275deg);mask-image:conic-gradient(from 88deg,#000 0deg 275deg,transparent 275deg)}79.2%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 290deg,transparent 290deg);mask-image:conic-gradient(from 88deg,#000 0deg 290deg,transparent 290deg)}83.3%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 305deg,transparent 305deg);mask-image:conic-gradient(from 88deg,#000 0deg 305deg,transparent 305deg)}87.5%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 320deg,transparent 320deg);mask-image:conic-gradient(from 88deg,#000 0deg 320deg,transparent 320deg)}91.7%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 336deg,transparent 336deg);mask-image:conic-gradient(from 88deg,#000 0deg 336deg,transparent 336deg)}95.8%{-webkit-mask-image:conic-gradient(from 88deg,#000 0deg 351deg,transparent 351deg);mask-image:conic-gradient(from 88deg,#000 0deg 351deg,transparent 351deg)}100%{-webkit-mask-image:none;mask-image:none}}
        @keyframes centLoaderWordIn{0%{opacity:0;transform:translateY(7px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes centLoaderSweep{0%{-webkit-mask-position:-90% 0;mask-position:-90% 0}100%{-webkit-mask-position:190% 0;mask-position:190% 0}}
        @keyframes centLoaderOut{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.05)}}
        @media (prefers-reduced-motion: reduce) {
          .cent-loader-leaf, .cent-loader-c, .cent-loader-word, .cent-loader-sweep, .cent-loader-lockup {
            animation: none !important; opacity: 1 !important; transform: none !important;
          }
        }
      `}</style>
      <div
        className="cent-loader-lockup"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          animation: "centLoaderOut .6s ease 3s both",
        }}
      >
        <span style={{ position: "relative", display: "block", width: 104, height: 112.5 }}>
          <img
            src="/centium-logo-c.png"
            alt=""
            className="cent-loader-c"
            style={{
              position: "absolute", left: 0, top: 0, width: 104, height: 112.5, objectFit: "contain",
              animation: "centLoaderCDraw .9s steps(1,end) .95s both",
            }}
          />
          <img
            src="/centium-logo-leaf.png"
            alt=""
            className="cent-loader-leaf"
            style={{
              position: "absolute", left: 0, top: 0, width: 104, height: 112.5, objectFit: "contain",
              animation: "centLoaderLeafFall 1.2s cubic-bezier(.35,.85,.4,1) both",
            }}
          />
        </span>
        <span
          className="cent-loader-word"
          style={{
            position: "relative", display: "block", height: 15, width: 162.1, color: "#9C7FF8",
            animation: "centLoaderWordIn .55s ease 2s both",
          }}
        >
          <CentiumWordmark height={15} />
          <span
            className="cent-loader-sweep"
            style={{
              position: "absolute", inset: 0, color: "#FFFFFF",
              WebkitMaskImage: "linear-gradient(100deg,transparent 43%,#000 50%,transparent 57%)",
              maskImage: "linear-gradient(100deg,transparent 43%,#000 50%,transparent 57%)",
              WebkitMaskSize: "280% 100%",
              maskSize: "280% 100%",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              animation: "centLoaderSweep 1.2s ease-in-out 2.15s both",
            }}
          >
            <CentiumWordmark height={15} />
          </span>
        </span>
      </div>
    </div>
  );
};

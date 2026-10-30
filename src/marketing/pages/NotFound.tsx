import React, { useEffect, useRef, useState } from "react";
import { useSEO } from "../useSEO";
import { MARK_LEAF_PATH } from "../landing/paths";
import { placeDot } from "../landing/loading/title";
import { landingState } from "../landing/state";
import { clamp, sm } from "../landing/engine/math";
import { LG, SM, lowQuality, reducedMotion } from "../landing/engine/env";
import { useMarketingNav, usePageLink } from "../landing/navigation";
import { useViewportHeight, useViewportWidth } from "../landing/viewport";
import type { Num404 } from "../landing/lines/bands";

// Centium landing v29: the marketing site's 404 (NF1 v25, handover
// 02_pages/21-NF1 and 03_motion/10-404), shown for any unmatched path outside
// /app (App.tsx's catch-all; Cloudflare serves dist/404.html with a real 404
// status, see vite.config.ts and public/_redirects). The prototype markup
// with its exact inline styles and its init404:
// - "404" is drawn by one stream of lines (lines/bands.ts Num404, code-split)
//   over 1.8 s once loading has ended, then breathes, with a pulse that
//   pauses one beat in the 0 (6.4 s loop);
// - the text fades in (.6 s) when the numerals are drawn;
// - the leaf dot of the i in "skipped" drops in on a pendulum (1.3 s), bounces
//   once and settles;
// - reduced motion: the numerals, the text and the dot at rest at once.
// The old quick links (Features / Pricing / FAQ) are gone (lead decision D;
// the nav and footer carry them). noindex while shown.
// The block is a div, not the prototype's <main id="nf">: MarketingLayout
// already wraps every page in <main>.

export const NotFound: React.FC = () => {
  useSEO("Page not found", "This page doesn't exist, or it moved. Your health hub is still right where you left it.", { noindex: true });
  const vw = useViewportWidth(),
    vh = useViewportHeight();
  const lg = vw >= LG,
    sm640 = vw >= SM;
  const [still] = useState(reducedMotion);
  const go = useMarketingNav();
  const pageLink = usePageLink();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const blkRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const txtRef = useRef<HTMLDivElement>(null);

  // Prototype init404.
  useEffect(() => {
    let dead = false,
      raf = 0;
    let cleanup = () => {};
    import("../landing/lines/bands")
      .then(({ Num404: Num }) => {
        const cv = cvRef.current,
          blk = blkRef.current,
          wrap = wrapRef.current,
          dot = dotRef.current;
        if (dead || !cv || !blk || !cv.getContext || !cv.getContext("2d")) return;
        const D: Num404 = new Num(cv, { q: lowQuality() ? "low" : "high", rm: still, k: window.innerWidth < 640 ? 8 : 12 });
        D.onDone = () => {
          if (txtRef.current) txtRef.current.style.opacity = "1";
        };
        const fit = () => {
          D.resize();
          const cr = cv.getBoundingClientRect();
          if (cr.width && numRef.current) {
            const nr = numRef.current.getBoundingClientRect();
            D.box = { x: nr.left - cr.left, y: nr.top - cr.top, w: nr.width, h: nr.height };
            D.path = null;
          }
          if (still) D.render(0);
          placeDot(wrap, dot);
        };
        fit();
        if (document.fonts) document.fonts.ready.then(() => !dead && fit());
        window.addEventListener("resize", fit);
        cleanup = () => window.removeEventListener("resize", fit);
        if (still) {
          D.render(0);
          if (dot) {
            dot.style.opacity = "1";
            dot.style.transform = "none";
          }
          return;
        }
        const t0 = performance.now();
        let ts: number | null = null,
          dropT: number | null = null,
          settled = false;
        const frame = () => {
          if (dead) return;
          const t = (performance.now() - t0) / 1000,
            loaded = landingState.get().loaded;
          if (!document.hidden) {
            if (loaded && ts == null) ts = t;
            D.render(ts == null ? -1 : t - ts);
          }
          if (dot && loaded && !settled) {
            if (dropT == null) {
              dropT = t;
              fit();
            }
            const f = t - dropT,
              u = clamp(f / 1.3),
              w = 1 - u,
              L = parseFloat(dot.style.width) || 12;
            const fl = sm(0.25, 0.5, u) + sm(0.6, 0.85, u),
              sx = Math.cos(Math.PI * fl),
              y = -L * 14 * Math.pow(w, 1.25),
              x = L * 3.2 * Math.sin(Math.PI * 2 * u) * Math.pow(w, 0.6),
              rot = -24 * Math.cos(Math.PI * 2 * u) * Math.pow(w, 0.8),
              k = 1 + 2.2 * Math.pow(w, 1.2);
            const bt = Math.max(0, f - 1.3),
              bounce = bt > 0 && bt < 0.26 ? Math.sin((Math.PI * bt) / 0.26) * L * 0.55 : 0;
            dot.style.opacity = "1";
            dot.style.transform =
              "translate(" + x.toFixed(2) + "px," + (y - bounce).toFixed(2) + "px) rotate(" + rot.toFixed(2) + "deg) scale(" + (k * sx).toFixed(4) + "," + k.toFixed(4) + ")";
            if (f > 1.6) {
              settled = true;
              dot.style.transform = "none";
            }
          }
          raf = requestAnimationFrame(frame);
        };
        frame();
      })
      .catch(() => {
        // Without the line engine: no numerals drawn; the text and the dot show at rest.
        if (txtRef.current) txtRef.current.style.opacity = "1";
        if (dotRef.current) dotRef.current.style.opacity = "1";
        placeDot(wrapRef.current, dotRef.current);
      });
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, [still]);

  const goHomeNav = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go("/");
  };

  const btn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "52px",
    padding: "0 20px",
    borderRadius: "999px",
    fontWeight: 700,
    fontSize: "15px",
    whiteSpace: "nowrap",
    transition: "background .2s,border-color .2s,transform .25s cubic-bezier(.22,1,.36,1)",
  };

  return (
    <div
      id="nf"
      data-screen-label="NF1 v25 404"
      style={{
        position: "relative",
        zIndex: "2",
        overflowX: "clip",
        minHeight: lg ? "max(92svh,680px)" : vw > vh ? "max(100svh,520px)" : "calc(100svh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: lg ? "112px 40px 88px" : vh < 780 ? "84px 20px 48px" : "104px 20px 72px",
      }}
    >
      <canvas id="nf-lines" ref={cvRef} aria-hidden="true" style={{ position: "absolute", insetInlineStart: "0", top: "0", width: "100%", height: "100%", display: "block", pointerEvents: "none" }} />
      <div
        id="nf-block"
        ref={blkRef}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: lg ? "720px" : vw >= 640 ? "560px" : "min(100%,320px)",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          id="nf-num"
          ref={numRef}
          role="img"
          aria-label="404"
          style={{
            width: lg ? "min(620px,50vw)" : vw >= 640 ? "min(520px,60vw)" : "min(84vw,340px)",
            aspectRatio: "3.25 / 1.62",
            marginBottom: vw < 640 ? "28px" : "40px",
          }}
        />
        <div id="nf-txt" ref={txtRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", opacity: still ? "1" : "0", transition: "opacity .6s ease" }}>
          <h1
            id="nf-title"
            aria-label="This page skipped a beat."
            style={{
              display: "block",
              width: "100%",
              margin: "14px 0 0",
              fontWeight: "800",
              fontSize: lg ? "clamp(36px,3.6vw,48px)" : vw < 380 ? "28px" : "31px",
              lineHeight: "1.08",
              letterSpacing: "-.04em",
              color: "#221E1A",
              textWrap: "balance",
            }}
          >
            <span aria-hidden="true">This page </span>
            <span style={{ whiteSpace: "nowrap" }}>
              <span aria-hidden="true">sk</span>
              <span id="nf-iwrap" ref={wrapRef} aria-hidden="true" style={{ position: "relative", display: "inline-block" }}>
                ı
                <span
                  id="nf-dot"
                  ref={dotRef}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    insetInlineStart: "0",
                    top: "0",
                    width: ".2em",
                    height: ".2em",
                    opacity: still ? "1" : "0",
                    transformOrigin: "50% 100%",
                    willChange: "transform",
                  }}
                >
                  <svg viewBox="556 526 380 368" style={{ display: "block", width: "100%", height: "100%", overflow: "visible" }}>
                    <path d={MARK_LEAF_PATH} fill="#8AC4BA" />
                  </svg>
                </span>
              </span>
              <span aria-hidden="true">pped</span>
            </span>
            <span aria-hidden="true"> a beat.</span>
          </h1>
          <p style={{ margin: (vw < 640 ? "10px" : "16px") + " 0 0", maxWidth: "440px", fontSize: lg ? "17px" : "15.5px", lineHeight: "1.6", color: "#5B5349", textWrap: "pretty" }}>
            We couldn't find the page you were looking for.
          </p>
          <div
            id="nf-actions"
            style={{
              marginTop: vw < 640 ? "20px" : "32px",
              display: "grid",
              gridTemplateColumns: sm640 ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)",
              gap: "12px",
              width: lg ? "416px" : "100%",
            }}
          >
            <a
              id="nf-home"
              href="/"
              onClick={goHomeNav}
              className="cl-hbg cl-lift cl-fo3"
              style={{ ...btn, background: "#775FD7", color: "#FFFFFF", transform: "none", boxShadow: "none", "--hbg": "#6A54C4" } as React.CSSProperties}
            >
              Back to home
            </a>
            <a
              id="nf-contact"
              href="/contact"
              onClick={pageLink("/contact")}
              className="cl-hbg cl-hbd cl-lift cl-fo3"
              style={
                {
                  ...btn,
                  background: "#FFFFFF",
                  border: "1px solid #CFC5EA",
                  color: "#3B352D",
                  transform: "none",
                  boxShadow: "none",
                  "--hbg": "#FAF9FE",
                  "--hbd": "#775FD7",
                } as React.CSSProperties
              }
            >
              Contact us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

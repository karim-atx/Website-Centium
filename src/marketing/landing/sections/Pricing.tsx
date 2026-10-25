// Centium landing v29: section 08 "Pricing" (PC1 v6, 02_pages/16-PC1), the
// prototype markup with its exact inline styles and its behaviour:
// - audience pills (Individuals / Professionals / Businesses) and billing
//   pills (Monthly / Annual), each with a sliding lavender thumb; the
//   billing toggle starts on Annual with the "Save 16%" badge (Karim);
// - switching tweens every price from its old figure to the new one over
//   520 ms, eased out (prototype switchPrice / tweenPrices; at once under
//   reduced motion);
// - on phones the pills stick under the navbar, the cards become a
//   snapping carousel with dots and an "n / N" counter (pcDots; tapping the
//   dots goes to the nearest card) and, the first time the cards are 60% in
//   view, they nudge 56px and back to show they scroll;
// - "Compare all features" opens a table for the selected audience.
// Prices, plans and the table come from src/content/pricing.ts only. Plan
// buttons open the web app (/app); business ones open /contact.

import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChapterMark } from "./ChapterMark";
import type { SectionVals } from "./sectionVals";
import { AUDIENCES, DEFAULT_BILLING, SAVE_BADGE, priceFor, type Billing } from "../../../content/pricing";
import { SectionHostContext } from "../sectionHost";
import { usePageLink } from "../navigation";
import { clamp, eo } from "../engine/math";

const PILL_GROUP: React.CSSProperties = {
  position: "relative",
  display: "grid",
  padding: "4px",
  borderRadius: "999px",
  background: "#FAF9FE",
  border: "1px solid rgba(125,103,217,.22)",
};
const THUMB: React.CSSProperties = {
  position: "absolute",
  left: "4px",
  top: "4px",
  bottom: "4px",
  borderRadius: "999px",
  background: "#7D67D9",
  boxShadow: "0 6px 16px rgba(125,103,217,.28)",
  transition: "transform .45s cubic-bezier(.22,1,.36,1)",
};

/** The tween's figure format (prototype tweenPrices fmt): whole numbers only once the tween ends. */
const tweenFmt = (v: number, int: boolean) => (v <= 0.004 ? "$0" : int ? "$" + Math.round(v) : "$" + v.toFixed(2));

export const Pricing: React.FC<{ r: SectionVals; vw: number }> = ({ r, vw }) => {
  const host = useContext(SectionHostContext);
  const rm = host?.rm ?? false;
  const pageLink = usePageLink();
  const [aud, setAud] = useState(0);
  const [bill, setBill] = useState<Billing>(DEFAULT_BILLING);
  const [cmp, setCmp] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const prevPV = useRef<number[] | null>(null);
  const tweenRaf = useRef(0);

  const A = AUDIENCES[aud];
  const annual = bill === "annual";
  const n = A.plans.length;

  const switchPrice = (ch: { aud?: number; bill?: Billing }) => {
    prevPV.current = Array.from(cardsRef.current?.querySelectorAll("[data-pv]") ?? []).map((e) => +(e.getAttribute("data-pv") || 0));
    if (ch.aud != null) setAud(ch.aud);
    if (ch.bill != null) setBill(ch.bill);
  };

  // The price tween, after the switch has rendered the new targets.
  useLayoutEffect(() => {
    const from = prevPV.current;
    if (!from) return;
    prevPV.current = null;
    const els = Array.from(cardsRef.current?.querySelectorAll<HTMLElement>("[data-pv]") ?? []);
    const t0 = performance.now(),
      D = rm ? 0 : 520;
    cancelAnimationFrame(tweenRaf.current);
    const step = () => {
      const u = D ? eo(clamp((performance.now() - t0) / D)) : 1;
      els.forEach((el, i) => {
        const to = +(el.getAttribute("data-pv") || 0),
          f = from[i] != null ? from[i] : 0;
        const int = Math.abs(to - Math.round(to)) < 0.005;
        // The text node React rendered, so a later render still finds it.
        const tn = el.firstChild;
        if (tn) tn.nodeValue = tweenFmt(f + (to - f) * u, int && u >= 1);
      });
      if (u < 1) tweenRaf.current = requestAnimationFrame(step);
    };
    step();
  }, [aud, bill, rm]);
  useEffect(() => () => cancelAnimationFrame(tweenRaf.current), []);

  // Dots and counter (prototype pcDots): each dot widens as its card comes
  // in, the counter names the nearest card.
  const pcDots = () => {
    const el = cardsRef.current,
      dots = Array.from(dotsRef.current?.querySelectorAll<HTMLElement>("[data-pcdot]") ?? []),
      cnt = countRef.current;
    if (!el || !dots.length) return;
    const cards = Array.from(el.children).filter((x) => x.tagName === "DIV") as HTMLElement[];
    if (!cards.length) return;
    const cw = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : cards[0].offsetWidth,
      pos = el.scrollLeft / Math.max(1, cw),
      act = Math.max(0, Math.min(dots.length - 1, Math.round(pos)));
    dots.forEach((d, j) => {
      const w = Math.max(0, 1 - Math.abs(pos - j));
      d.style.transform = "scaleX(" + (0.4 + 0.6 * w).toFixed(3) + ")";
      d.style.background = w > 0.5 ? "#7D67D9" : "rgba(34,30,26,.18)";
    });
    if (cnt) cnt.textContent = act + 1 + " / " + dots.length;
  };
  useLayoutEffect(pcDots, [aud, vw]);

  const onDots = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardsRef.current,
      dots = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-pcdot]"));
    if (!el || !dots.length) return;
    let j = 0,
      best = 1e9;
    dots.forEach((q, k) => {
      const rc = q.getBoundingClientRect(),
        dd = Math.abs(rc.left + rc.width / 2 - e.clientX);
      if (dd < best) {
        best = dd;
        j = k;
      }
    });
    const cards = Array.from(el.children).filter((x) => x.tagName === "DIV") as HTMLElement[];
    const cw = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : el.clientWidth;
    el.scrollTo({ left: j * cw, behavior: rm ? "auto" : "smooth" });
  };

  // The one-time scroll hint on phones (prototype measure: IntersectionObserver, threshold .6).
  useEffect(() => {
    const el = cardsRef.current;
    if (rm || !el || !window.IntersectionObserver || window.innerWidth >= 1024) return;
    let timers: number[] = [];
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((en) => {
          if (!en.isIntersecting) return;
          io.disconnect();
          timers.push(
            window.setTimeout(() => {
              el.scrollTo({ left: 56, behavior: "smooth" });
              timers.push(window.setTimeout(() => el.scrollTo({ left: 0, behavior: "smooth" }), 520));
            }, 350),
          );
        });
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
    // Once per mount, as the prototype's _pcHint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The table changes the page's height: re-measure once it has opened or closed.
  useEffect(() => {
    if (!host) return;
    const t = window.setTimeout(() => host.measure(), 420);
    return () => window.clearTimeout(t);
  }, [cmp, aud, host]);

  const cmpCols = "minmax(200px,1.6fr) repeat(" + n + ",minmax(90px,1fr))";

  return (
    <section id="pricing" data-screen-label="PC1 v6 Pricing" style={{ position: "relative", zIndex: "2", padding: `${r.pcY} ${r.px} ${r.secY}` }}>
      <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <ChapterMark n="08" t="Pricing" size={r.chEy} />
          <h2 style={{ marginTop: "14px", fontWeight: "800", fontSize: r.h2, lineHeight: "1.04", letterSpacing: "-.035em" }}>Whatever your role, Centium fits.</h2>
          <p style={{ marginTop: "12px", fontSize: "17px", color: "#5B5349" }}>One app instead of a stack of subscriptions.</p>
        </div>
        <div
          id="pc-ctl"
          style={{
            position: r.pcCtlPos,
            top: r.pcCtlTop,
            zIndex: "6",
            margin: `28px ${r.pcCtlM} 0`,
            padding: r.pcCtlPad,
            background: r.pcCtlBg,
            borderBottom: r.pcCtlBd,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div role="tablist" aria-label="Audience" style={{ ...PILL_GROUP, gridTemplateColumns: "repeat(3,1fr)", width: r.audW, boxShadow: r.pillSh }}>
            <span style={{ ...THUMB, width: "calc((100% - 8px) / 3)", transform: `translateX(${aud * 100}%)` }} />
            {AUDIENCES.map((au, i) => (
              <button
                key={au.label}
                role="tab"
                aria-selected={aud === i ? "true" : "false"}
                onClick={() => switchPrice({ aud: i })}
                style={{
                  position: "relative",
                  minHeight: "42px",
                  padding: "8px 10px",
                  borderRadius: "999px",
                  fontSize: r.audF,
                  fontWeight: "700",
                  color: aud === i ? "#fff" : "#5B5349",
                  transition: "color .3s",
                }}
              >
                {au.label}
              </button>
            ))}
          </div>
          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            <div role="group" aria-label="Billing period" style={{ ...PILL_GROUP, gridTemplateColumns: "1fr 1fr", boxShadow: r.pillSh }}>
              <span style={{ ...THUMB, width: "calc(50% - 4px)", transform: `translateX(${annual ? "100%" : "0%"})` }} />
              {(
                [
                  ["monthly", "Monthly"],
                  ["annual", "Annual"],
                ] as const
              ).map(([k, t]) => (
                <button
                  key={k}
                  aria-pressed={bill === k ? "true" : "false"}
                  onClick={() => switchPrice({ bill: k })}
                  style={{
                    position: "relative",
                    minHeight: "38px",
                    minWidth: "96px",
                    padding: "8px 14px",
                    borderRadius: "999px",
                    fontSize: "13.5px",
                    fontWeight: "700",
                    color: bill === k ? "#fff" : "#5B5349",
                    transition: "color .3s",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <span
              id="save-badge"
              style={{
                position: r.saveBadgePos,
                left: r.saveBadgeL,
                top: r.saveBadgeT,
                marginLeft: r.saveML,
                padding: "4px 10px",
                borderRadius: "99px",
                background: "#EDF4F3",
                color: "#2F5F58",
                fontSize: "12px",
                fontWeight: "800",
                whiteSpace: "nowrap",
                opacity: annual ? 1 : 0,
                transform: `translate(calc(${annual ? "0px" : "-6px"} + ${r.saveTX}),${r.saveTY})`,
                transition: "opacity .35s,transform .35s cubic-bezier(.22,1,.36,1)",
              }}
            >
              {SAVE_BADGE}
            </span>
          </div>
        </div>
        <div
          id="pc-cards"
          ref={cardsRef}
          onScroll={pcDots}
          style={{
            margin: r.pcCardsM,
            maxWidth: r.lg ? (n === 2 ? "760px" : "1240px") : "none",
            display: r.pcDisp,
            gridTemplateColumns: "repeat(" + n + ",minmax(0,1fr))",
            gap: "14px",
            overflowX: r.pcOver,
            scrollSnapType: "x mandatory",
            overscrollBehaviorX: "contain",
            touchAction: "pan-x pan-y",
            scrollPaddingLeft: "20px",
            scrollbarWidth: "none",
            padding: r.pcPad,
            alignItems: "stretch",
          }}
        >
          {A.plans.map((p) => {
            const pr = priceFor(p, bill);
            const hi = !!p.recommended;
            const btn: React.CSSProperties = {
              marginTop: "auto",
              padding: "13px",
              borderRadius: "999px",
              textAlign: "center",
              fontWeight: "600",
              fontSize: "14px",
              background: hi ? "#5E9E95" : "transparent",
              color: hi ? "#fff" : "#221E1A",
              border: "1px solid " + (hi ? "#5E9E95" : "#DFDAD2"),
            };
            return (
              <div
                key={aud + "-" + p.name}
                style={{
                  position: "relative",
                  flex: `0 0 ${r.pcCardW}`,
                  scrollSnapAlign: "start",
                  padding: "26px 22px",
                  borderRadius: "24px",
                  background: hi ? "linear-gradient(165deg,#FFFFFF 0%,#F8F5FF 58%,#F1F7F5 100%)" : "#FFFFFF",
                  border: hi ? "2px solid #7D67D9" : "1px solid #EDEAE4",
                  boxShadow: hi
                    ? "0 1px 1px rgba(72,58,130,.05),0 14px 30px rgba(72,58,130,.1),0 40px 80px rgba(92,72,168,.14)"
                    : "0 1px 1px rgba(72,58,130,.04),0 10px 26px rgba(72,58,130,.06)",
                  display: "flex",
                  flexDirection: "column",
                  textAlign: "left",
                }}
              >
                {hi && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-11px",
                      left: "22px",
                      padding: "4px 11px",
                      borderRadius: "99px",
                      background: "#7D67D9",
                      color: "#fff",
                      fontSize: "10px",
                      fontWeight: "800",
                      letterSpacing: ".14em",
                    }}
                  >
                    RECOMMENDED
                  </span>
                )}
                <div style={{ fontSize: "18px", fontWeight: "800", color: hi ? "#427C76" : "#221E1A" }}>{p.name}</div>
                <div style={{ marginTop: "4px", fontSize: "12.5px", fontWeight: "700", color: "#8C8378", minHeight: "19px" }}>{p.caption}</div>
                <div style={{ marginTop: "14px", display: "flex", alignItems: "baseline", gap: "5px", flexWrap: "wrap" }}>
                  <span data-pv={String(pr.value)} style={{ fontSize: r.priceF, fontWeight: "800", letterSpacing: "-.02em", lineHeight: "1.05" }}>
                    {pr.label}
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#8C8378" }}>{pr.unit}</span>
                </div>
                <div style={{ marginTop: "4px", fontSize: "12.5px", fontWeight: "600", color: pr.comingSoon ? "#6A54C4" : "#8C8378", minHeight: "19px" }}>{pr.note}</div>
                <div style={{ margin: "18px 0 22px", display: "flex", flexDirection: "column", gap: "9px" }}>
                  {p.features.map((x) => (
                    <span key={x} style={{ display: "flex", gap: "8px", fontSize: "13.5px", lineHeight: "1.4" }}>
                      <span
                        style={{
                          width: "16px",
                          height: "16px",
                          flexShrink: "0",
                          marginTop: "1px",
                          borderRadius: "99px",
                          background: hi ? "#5E9E95" : "#C6B9EE",
                          color: "#fff",
                          fontSize: "9px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✓
                      </span>
                      <span style={{ flex: "1", minWidth: "0" }}>{x}</span>
                    </span>
                  ))}
                </div>
                {p.business ? (
                  <a href="/contact" onClick={pageLink("/contact")} style={btn}>
                    {p.cta}
                  </a>
                ) : (
                  <Link to="/app" style={btn}>
                    {p.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
        <div
          id="pc-dots"
          ref={dotsRef}
          aria-hidden="true"
          onClick={onDots}
          style={{ minHeight: "44px", cursor: "pointer", display: r.dotsDisp, justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "14px" }}
        >
          {A.plans.map((p) => (
            <span
              key={aud + "-" + p.name}
              data-pcdot=""
              style={{
                width: "24px",
                height: "6px",
                borderRadius: "99px",
                background: "rgba(34,30,26,.18)",
                transformOrigin: "center",
                transition: "transform .3s,background-color .3s",
                cursor: "pointer",
              }}
            />
          ))}
          <span id="pc-count" ref={countRef} style={{ marginLeft: "6px", fontSize: "13px", fontWeight: "700", color: "#5B5349", fontVariantNumeric: "tabular-nums" }}>
            {"1 / " + n}
          </span>
        </div>
        <p style={{ marginTop: "16px", textAlign: "center", fontSize: "13px", color: "#5B5349", maxWidth: "760px", marginLeft: "auto", marginRight: "auto" }}>{A.footnote}</p>
        <div style={{ marginTop: "22px", display: "flex", justifyContent: "center" }}>
          <button
            onClick={() => setCmp((v) => !v)}
            aria-expanded={cmp ? "true" : "false"}
            className="cl-hbg"
            style={
              {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                minHeight: "44px",
                padding: "10px 18px",
                borderRadius: "999px",
                border: "1px solid rgba(125,103,217,.22)",
                background: "#FFFFFF",
                fontSize: "14px",
                fontWeight: "700",
                whiteSpace: "nowrap",
                "--hbg": "#F4F1FB",
              } as React.CSSProperties
            }
          >
            Compare all features
            <span style={{ display: "inline-block", transform: cmp ? "rotate(45deg)" : "none", transition: "transform .3s cubic-bezier(.22,1,.36,1)", color: "#7D67D9" }}>+</span>
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateRows: cmp ? "1fr" : "0fr", transition: "grid-template-rows .4s cubic-bezier(.22,1,.36,1)" }}>
          <div style={{ overflow: "hidden" }}>
            <div style={{ marginTop: "18px", overflowX: "auto", borderRadius: "18px", border: "1px solid #EDEAE4" }}>
              <div style={{ minWidth: n === 5 ? "760px" : "480px", display: "grid", gridTemplateColumns: cmpCols, fontSize: "13px" }}>
                <span style={{ padding: "12px 16px", background: "#FAF9FE", fontWeight: "800", fontSize: "11px", letterSpacing: ".12em", color: "#8C8378" }}>FEATURE</span>
                {A.plans.map((p) => (
                  <span key={p.name} style={{ padding: "12px 10px", background: "#FAF9FE", fontWeight: "800", textAlign: "center", color: p.recommended ? "#6A54C4" : "#221E1A" }}>
                    {p.name}
                  </span>
                ))}
                {A.compare.map((row, ri) =>
                  row.map((t, j) => (
                    <span
                      key={ri + "-" + j}
                      style={
                        j === 0
                          ? { padding: "11px 16px", borderTop: "1px solid #F0EDE8", textAlign: "left", fontWeight: 700, color: "#221E1A" }
                          : {
                              padding: "11px 10px",
                              borderTop: "1px solid #F0EDE8",
                              textAlign: "center",
                              fontWeight: t === "✓" ? 800 : 600,
                              color: t === "✓" ? "#2F5F58" : t === "–" ? "#C3BCB2" : "#5B5349",
                            }
                      }
                    >
                      {t}
                    </span>
                  )),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

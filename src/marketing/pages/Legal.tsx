import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSEO } from "../useSEO";
import { LEGAL_VERSION } from "../../services/legal/acceptances";
import * as EN from "../legal/text";
import type * as ArabicText from "../legal/text.ar";
import { documentFor, t, tk } from "../../i18n/core";
import { legalDate } from "../../pages/settings/legalCopy";
import { LEGAL_IDS, legalAnchorFor, legalDateFor, legalDocsFor, legalTocFor } from "../legal/anchors";
import { PageMark } from "../landing/sections/ChapterMark";
import { anchorOffset, usePageLink } from "../landing/navigation";
import { anchorHash } from "../landing/loading/pickLoader";
import { usePageMotion } from "../landing/pageMotion";
import { landingState } from "../landing/state";
import { useViewportWidth } from "../landing/viewport";
import { LG, SM } from "../landing/engine/env";
import { WASH_BG, WEDGE_312, WEDGE_48 } from "../landing/wash";
import { REFUND_POLICY_PATH } from "../legal/refund";

// Centium landing v29: the Legal page (LG1 v17, handover 02_pages/20-LG1),
// the prototype markup with its exact inline styles: ONE LONG PAGE (lead
// decision C) with the three documents one after the other, an "On this
// page" list (sticky beside the text on desktop, a closed disclosure in the
// flow on phones), the closing card and the governing-law line.
// - The legal TEXT is word for word the previous page's
//   (src/marketing/legal/text.ts, pinned by legal.test.ts).
// - "In detail" heads the Health points (LG1).
// - "Last updated" is LEGAL_VERSION (the version accounts accept) written
//   month first, "September 6, 2026", as the app writes it.
// - Deep links: every document and group has an id (#terms, #privacy,
//   #health, #<doc>-<slug>); the old one-subsection-at-a-time hashes the app
//   still uses (#legal/<doc>/<slug>, ...) are swapped for those ids on
//   arrival (legal/anchors.ts legalAnchorFor). /legal/privacy and
//   /legal/terms redirect to #privacy / #terms (App.tsx). Anchors land 96px
//   below the top (the sections' scroll-margin-top), and land again once the
//   fonts and the loader have settled, unless the visitor has scrolled.

/** The page's responsive values (prototype `r`: ctTop, px, lgWashH, ...). */
function legalVals(vw: number) {
  const lg = vw >= LG,
    sm = vw >= SM;
  return {
    lg,
    ctTop: lg ? "96px" : "80px",
    px: sm ? "40px" : "20px",
    lgWashH: lg ? "560px" : "400px",
    lgHeadMb: lg ? "64px" : "40px",
    chEyC: lg ? "20px" : "14px",
    ctH1: lg ? "56px" : "40px",
    lgCols: lg ? "250px minmax(0,1fr)" : "minmax(0,1fr)",
    lgGap: lg ? "56px" : "20px",
    lgTocPos: (lg ? "sticky" : "static") as "sticky" | "static",
    lgTocTop: lg ? "96px" : "auto",
    footOpen: lg ? true : undefined,
    footCursor: lg ? "default" : "pointer",
    footChev: lg ? "none" : "inline",
    lgH2: lg ? "34px" : "28px",
  };
}

const LEGAL_UPDATED = legalDateFor(LEGAL_VERSION);

/** Round F (DN, F3): the Terms' link sentence names the policy; that name links to its page. */
const POLICY_NAME = tk("Refund and Cancellation Policy");
function withPolicyLink(text: string, pageLink: ReturnType<typeof usePageLink>): React.ReactNode {
  const name = t(POLICY_NAME);
  const at = text.indexOf(name);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <a href={REFUND_POLICY_PATH} onClick={pageLink(REFUND_POLICY_PATH)} style={{ color: "#5B45C2", textDecoration: "underline", textUnderlineOffset: "3px" }}>
        {name}
      </a>
      {text.slice(at + name.length)}
    </>
  );
}

export const Legal: React.FC = () => {
  useSEO(t("Legal"), t("Centium's Terms of Service, Privacy Policy, and Health & Medical Disclaimer."));
  usePageMotion();
  const r = legalVals(useViewportWidth());
  const location = useLocation();
  const navigate = useNavigate();
  const pageLink = usePageLink();
  // Round F (AV): the words in the active language; the ids stay the English ones.
  const docs = legalDocsFor();
  const toc = legalTocFor(docs);
  const { ASK, GOVERNING, LANGUAGE } = documentFor<typeof ArabicText>("legal.text") ?? EN;

  // The shim: an old-shape hash becomes the id it meant (the layout's
  // scroll-on-navigate then lands on it). An effect, not a layout effect:
  // on a first load the router subscribes to history in its own layout
  // effect, after this page's, and would miss a replace made earlier.
  useEffect(() => {
    const id = legalAnchorFor(location.hash);
    if (id) navigate({ hash: "#" + id }, { replace: true });
  }, [location.hash, navigate]);

  // An anchor arrival lands again after the fonts and the loader have
  // settled (the long text reflows as Manrope arrives), until the visitor
  // scrolls themselves.
  useEffect(() => {
    const id = anchorHash(location.hash);
    if (!id || !LEGAL_IDS.has(id)) return;
    let stopped = false;
    const stop = () => {
      stopped = true;
    };
    const land = () => {
      const el = document.getElementById(id);
      if (!stopped && el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - anchorOffset(el));
    };
    const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    inputs.forEach((ev) => window.addEventListener(ev, stop, { passive: true, once: true }));
    if (document.fonts) document.fonts.ready.then(land);
    const off = landingState.subscribe(() => {
      if (landingState.get().loaded) land();
    });
    const settle = window.setTimeout(stop, 4000);
    return () => {
      stopped = true;
      inputs.forEach((ev) => window.removeEventListener(ev, stop));
      off();
      window.clearTimeout(settle);
    };
  }, [location.key, location.hash]);

  const wash = (mask: string) => (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        insetInlineStart: "0",
        insetInlineEnd: "0",
        top: "0",
        height: r.lgWashH,
        transform: "scaleY(-1)",
        pointerEvents: "none",
        background: WASH_BG,
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );

  return (
    <section
      id="legal-page"
      data-screen-label="LG1 v17 Legal"
      style={{ position: "relative", zIndex: "2", overflowX: "clip", padding: `${r.ctTop} ${r.px} 88px` }}
    >
      {wash(WEDGE_48)}
      {wash(WEDGE_312)}
      <div
        id="lg-head"
        style={{ position: "relative", textAlign: "center", maxWidth: "820px", margin: `0 auto ${r.lgHeadMb}`, display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <PageMark id="LEGAL" word={t("Legal")} size={r.chEyC} />
        <h1 style={{ margin: "14px 0 0", fontWeight: "800", fontSize: r.ctH1, letterSpacing: "-.04em", lineHeight: "1.04", textWrap: "balance" }}>{t("Terms, privacy and health")}</h1>
        <p style={{ margin: "12px 0 0", fontSize: "14px", fontWeight: "600", color: "#756D63" }}>{t("Last updated {date}", { date: legalDate(LEGAL_UPDATED) })}</p>
      </div>
      <div style={{ maxWidth: "1080px", margin: "0 auto", display: "grid", gridTemplateColumns: r.lgCols, gap: r.lgGap, alignItems: "start" }}>
        {/* B4 QA: the open list is 863px tall, so once stuck at 96px its end
            ("03 Health & Medical Disclaimer") sat below the fold on screens
            under 960px tall (1440x900, 1280x800; prototype too). On desktop it
            now scrolls inside itself when the screen is shorter than it. */}
        <nav aria-label={t("Contents")} style={{ position: r.lgTocPos, top: r.lgTocTop, maxHeight: r.lg ? "calc(100vh - 112px)" : undefined, overflowY: r.lg ? "auto" : undefined, overscrollBehavior: r.lg ? "contain" : undefined }}>
          <details open={r.footOpen} style={{ borderRadius: "20px", background: "#FFFFFF", border: "1px solid rgba(125,103,217,.14)", padding: "8px 16px" }}>
            <summary
              // On desktop the list is always open (cursor default): a click does not fold it.
              onClick={(e) => {
                if (r.lg) e.preventDefault();
              }}
              style={{
                listStyle: "none",
                cursor: r.footCursor,
                minHeight: "44px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "11px",
                fontWeight: "800",
                letterSpacing: ".18em",
                color: "#5B5349",
              }}
            >
              {t("ON THIS PAGE")}
              <span aria-hidden="true" style={{ display: r.footChev, color: "#775FD7", fontSize: "16px" }}>
                +
              </span>
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingBottom: "10px" }}>
              {toc.map((lt) => (
                <a
                  key={lt.h}
                  href={lt.h}
                  className="cl-hc"
                  style={
                    {
                      padding: lt.doc ? "9px 0 4px" : "4px 0 4px 12px",
                      fontSize: lt.doc ? "13.5px" : "13px",
                      fontWeight: lt.doc ? 800 : 600,
                      color: lt.doc ? "#221E1A" : "#5B5349",
                      lineHeight: "1.35",
                      "--hc": "#6A54C4",
                    } as React.CSSProperties
                  }
                >
                  {lt.t}
                </a>
              ))}
              {/* Round F (DN): the Refund and Cancellation Policy is its own page, part of the Terms. */}
              <a
                href={REFUND_POLICY_PATH}
                onClick={pageLink(REFUND_POLICY_PATH)}
                className="cl-hc"
                style={{ padding: "9px 0 4px", fontSize: "13.5px", fontWeight: 800, color: "#221E1A", lineHeight: "1.35", "--hc": "#6A54C4" } as React.CSSProperties}
              >
                {t(POLICY_NAME)}
              </a>
            </div>
          </details>
        </nav>
        <div style={{ maxWidth: "68ch", textAlign: "start" }}>
          {docs.map((ld) => (
            <article key={ld.id} id={ld.id} style={{ scrollMarginTop: "96px", paddingBottom: "44px", marginBottom: "44px", borderBottom: "1px solid #EDEAE4" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: ".22em", color: ld.c }}>{ld.num}</span>
              <h2 style={{ marginTop: "12px", fontSize: r.lgH2, fontWeight: "800", letterSpacing: "-.03em", lineHeight: "1.1" }}>{ld.title}</h2>
              {ld.box ? (
                <div style={{ marginTop: "20px", padding: "20px 22px", borderRadius: "18px", background: "#775FD7", border: "2px solid #3E2F7A" }}>
                  <p style={{ fontSize: "17px", lineHeight: "1.55", fontWeight: "600", color: "#fff" }}>{ld.intro}</p>
                </div>
              ) : (
                <p style={{ marginTop: "16px", fontSize: "16.5px", lineHeight: "1.7", color: "#5B5349" }}>{ld.intro}</p>
              )}
              {ld.groups.map((lg) => (
                <section key={lg.id} id={lg.id} style={{ scrollMarginTop: "96px", marginTop: "30px" }}>
                  <h3 style={{ fontSize: "19px", fontWeight: "800", letterSpacing: "-.015em" }}>{lg.h}</h3>
                  {lg.items.map((it) => (
                    <div key={it} style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                      <span style={{ width: "6px", height: "6px", marginTop: "10px", flexShrink: "0", borderRadius: "99px", background: ld.c }} />
                      <p style={{ fontSize: "15.5px", lineHeight: "1.7", color: "#3B352D" }}>{withPolicyLink(it, pageLink)}</p>
                    </div>
                  ))}
                </section>
              ))}
            </article>
          ))}
          <div style={{ padding: "24px", borderRadius: "22px", background: "#FFFFFF", border: "1px solid rgba(125,103,217,.14)" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-.028em" }}>{ASK[0]}</h2>
            <p style={{ marginTop: "10px", fontSize: "15.5px", lineHeight: "1.65", color: "#5B5349" }}>{ASK[1]}</p>
            <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <a
                href="/"
                onClick={pageLink("/")}
                className="cl-hbg"
                style={{ padding: "13px 22px", borderRadius: "999px", background: "#775FD7", color: "#fff", fontWeight: 600, fontSize: "14.5px", "--hbg": "#6A54C4" } as React.CSSProperties}
              >
                {t("Back to home")}
              </a>
              <a
                href="/contact"
                onClick={pageLink("/contact")}
                className="cl-hbd"
                style={{ padding: "13px 22px", borderRadius: "999px", border: "1px solid #CFC5EA", color: "#221E1A", fontWeight: 600, fontSize: "14.5px", "--hbd": "#775FD7" } as React.CSSProperties}
              >
                {t("Contact us")}
              </a>
            </div>
          </div>
          <p style={{ marginTop: "20px", fontSize: "12.5px", lineHeight: "1.6", color: "#5B5349" }}>{GOVERNING}</p>
          {/* Round F (A11): unspecified in the handoff; the governing line's style. */}
          <p style={{ marginTop: "8px", fontSize: "12.5px", lineHeight: "1.6", color: "#5B5349" }}>{LANGUAGE}</p>
        </div>
      </div>
    </section>
  );
};

import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSEO } from "../useSEO";
import { useApp } from "../../context/AppContext";
import { LEGAL_VERSION } from "../../services/legal/acceptances";
import * as EN from "../legal/text";
import type * as ArabicText from "../legal/text.ar";
import { documentFor, isRtl, t, tk } from "../../i18n/core";
import { legalDate } from "../../pages/settings/legalCopy";
import { LEGAL_IDS, REFUND_IDS, legalAnchorFor, legalDateFor, legalDocsFor, legalTocFor, refundSectionId, type TocEntry } from "../legal/anchors";
import { PageMark } from "../landing/sections/ChapterMark";
import { anchorOffset, usePageLink } from "../landing/navigation";
import { anchorHash } from "../landing/loading/pickLoader";
import { usePageMotion } from "../landing/pageMotion";
import { landingState } from "../landing/state";
import { useViewportWidth } from "../landing/viewport";
import { LG, SM } from "../landing/engine/env";
import { WASH_BG, WEDGE_312, WEDGE_48 } from "../landing/wash";
import { REFUND_POLICY_ID, REFUND_POLICY_LINKS } from "../legal/refund";
import { linkPhrases, parsePolicy, type PolicyBlock, type PolicyDoc, type PolicyPiece } from "../legal/policyDoc";
import EN_REFUND_MD from "../../../docs/legal/refund-policy.md?raw";

// Centium landing v29: the Legal page (LG1 v17, handover 02_pages/20-LG1),
// the prototype markup with its exact inline styles: ONE LONG PAGE (lead
// decision C) with the three documents one after the other, an "On this
// page" list (sticky beside the text on desktop, a closed disclosure in the
// flow on phones), the closing card and the governing-law line.
// - The legal TEXT is word for word the previous page's
//   (src/marketing/legal/text.ts, pinned by legal.test.ts).
// - Five sub-headings group the Health points (LG1 v5, C15), and On this
//   page lists them.
// - "Last updated" is LEGAL_VERSION (the version accounts accept) written
//   month first, "September 6, 2026", as the app writes it.
// - Deep links: every document and group has an id (#terms, #privacy,
//   #health, #<doc>-<slug>); the old one-subsection-at-a-time hashes the app
//   still uses (#legal/<doc>/<slug>, ...) are swapped for those ids on
//   arrival (legal/anchors.ts legalAnchorFor). /legal/privacy and
//   /legal/terms redirect to #privacy / #terms (App.tsx). Anchors land 96px
//   below the top (the sections' scroll-margin-top), and land again for up
//   to 4 s while fonts and the loader shift the layout, unless the visitor
//   scrolls, presses a key or touches the screen.
// - Landing update (LG1 v2 / v4, C14): the Refund and Cancellation Policy is
//   section 04 (#refund-policy, its sections #refund-policy-1 to -14), word
//   for word docs/legal/refund-policy.md and .ar.md (the Arabic a lazy chunk,
//   legal/refundAr), numbered and styled like 01 to 03 with its number in
//   teal. The old /legal/refund-policy redirects here (public/_redirects and
//   RefundPolicy.tsx); its ?lang=ar sets the language to Arabic.
// - On this page (C16) highlights the entry for the part being read, and
//   every entry jumps instantly (a plain #anchor link).

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

/** Round F (DN, F3): the Terms' link sentence names the policy; that name
 *  links to it, section 04 on this page (an in-page jump, no page load). */
const POLICY_NAME = tk("Refund and Cancellation Policy");
function withPolicyLink(text: string): React.ReactNode {
  const name = t(POLICY_NAME);
  const at = text.indexOf(name);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <a href={"#" + REFUND_POLICY_ID} style={{ color: "#5B45C2", textDecoration: "underline", textUnderlineOffset: "3px" }}>
        {name}
      </a>
      {text.slice(at + name.length)}
    </>
  );
}

// C14: section 04, the Refund and Cancellation Policy, from the lawyer's files.
const EN_REFUND = parsePolicy(EN_REFUND_MD);
let arRefund: PolicyDoc | null = null;
/** Section 04's number and bullets: the numbers alternate lavender / teal (LG1 v4). */
const REFUND_C = "#457D79";
const REFUND_P: React.CSSProperties = { fontSize: "15.5px", lineHeight: "1.7", color: "#3B352D" };

const Pieces: React.FC<{ parts: PolicyPiece[] }> = ({ parts }) => (
  <>
    {parts.map((p, i) => {
      let node: React.ReactNode = p.t;
      if (p.i) node = <em>{node}</em>;
      if (p.b) node = <strong style={{ fontWeight: 800, color: "#221E1A" }}>{node}</strong>;
      if (p.href) {
        const external = p.href.startsWith("http");
        node = (
          <a href={p.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} style={{ color: "#5B45C2", textDecoration: "underline", textUnderlineOffset: "3px" }}>
            {node}
          </a>
        );
      }
      return <React.Fragment key={i}>{node}</React.Fragment>;
    })}
  </>
);

const RefundBlock: React.FC<{ b: PolicyBlock; links: [string, string][] }> = ({ b, links }) =>
  "p" in b ? (
    <p style={{ marginTop: "12px", ...REFUND_P }}>
      <Pieces parts={linkPhrases(b.p, links)} />
    </p>
  ) : (
    <>
      {b.ul.map((li, i) => (
        <div key={i} style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
          <span style={{ width: "6px", height: "6px", marginTop: "10px", flexShrink: "0", borderRadius: "99px", background: REFUND_C }} />
          <p style={REFUND_P}>
            <Pieces parts={linkPhrases(li, links)} />
          </p>
        </div>
      ))}
    </>
  );

/** The id of a policy section ("section-3" from the file's "### 3.") on this page. */
const refundId = (sectionId: string) => refundSectionId(sectionId.replace(/^section-/, ""));

/** On this page's entries for section 04. */
const refundToc = (doc: PolicyDoc): TocEntry[] => [
  { t: "04 " + doc.title, h: "#" + REFUND_POLICY_ID, doc: true },
  ...doc.sections.map((s) => ({ t: s.h, h: "#" + refundId(s.id), doc: false })),
];

/** C16: the entry being read is the last one, in page order, whose target has
 *  reached 140px from the top; at the very end of the page, an entry clicked
 *  in the last 1.5 s wins. */
function readingEntry(hrefs: string[], clicked: { h: string; at: number } | null): string | null {
  let best: string | null = null;
  for (const h of hrefs) {
    const el = document.getElementById(h.slice(1));
    if (el && el.getBoundingClientRect().top <= 140) best = h;
  }
  const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
  if (atEnd && clicked && performance.now() - clicked.at < 1500) best = clicked.h;
  return best;
}

export const Legal: React.FC = () => {
  useSEO(t("Legal"), t("Centium's Terms of Service, Privacy Policy, and Health & Medical Disclaimer."));
  usePageMotion();
  const r = legalVals(useViewportWidth());
  const location = useLocation();
  const navigate = useNavigate();
  const pageLink = usePageLink();
  const { language, setLanguage } = useApp();
  // Round F (AV): the words in the active language; the ids stay the English ones.
  const docs = legalDocsFor();
  const { ASK, GOVERNING, LANGUAGE } = documentFor<typeof ArabicText>("legal.text") ?? EN;

  // C14: section 04 in the page's language. The Arabic is a lazy chunk; if it
  // cannot load (offline, a chunk gone after a release), the English shows,
  // marked as English.
  const ar = isRtl();
  const [arFailed, setArFailed] = useState(false);
  const [, setArLoaded] = useState(arRefund !== null);
  useEffect(() => {
    if (!ar || arRefund) return;
    let live = true;
    import("../legal/refundAr").then(
      (m) => {
        arRefund = m.default;
        if (live) setArLoaded(true);
      },
      (e) => {
        console.error("[legal] Could not load the Arabic refund policy:", e);
        if (live) setArFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [ar]);
  const refundLang = ar && !arFailed ? "ar" : "en";
  const refund = refundLang === "ar" ? arRefund : EN_REFUND;
  const toc = [...legalTocFor(docs), ...(refund ? refundToc(refund) : [])];

  // The old refund address: /legal/refund-policy?lang=ar arrives here as
  // /legal?lang=ar#refund-policy (public/_redirects keeps the query), and
  // ?lang=ar sets the language to Arabic. ?section=refund-policy (the D3
  // fallback redirect, should Cloudflare drop the fragment) becomes the hash.
  // Only for section 04: the site has no language parameter otherwise.
  useEffect(() => {
    const q = new URLSearchParams(location.search),
      section = q.get("section"),
      toRefund = section === REFUND_POLICY_ID || location.hash === "#" + REFUND_POLICY_ID;
    if (!toRefund || (!section && !q.has("lang"))) return;
    if (q.get("lang") === "ar" && language !== "ar") setLanguage("ar");
    navigate({ search: "", hash: "#" + REFUND_POLICY_ID }, { replace: true });
    // Once per arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // The shim: an old-shape hash becomes the id it meant (the layout's
  // scroll-on-navigate then lands on it). An effect, not a layout effect:
  // on a first load the router subscribes to history in its own layout
  // effect, after this page's, and would miss a replace made earlier.
  useEffect(() => {
    const id = legalAnchorFor(location.hash);
    if (id) navigate({ hash: "#" + id }, { replace: true });
  }, [location.hash, navigate]);

  // An anchor arrival lands again whenever the layout moves its target (the
  // long text reflows as Manrope arrives; section 04's Arabic arrives late),
  // for up to 4 s, until the visitor scrolls, presses a key or touches the
  // screen (a scrollbar drag moves no target, so it is never undone).
  useEffect(() => {
    const id = anchorHash(location.hash);
    if (!id || !(LEGAL_IDS.has(id) || REFUND_IDS.has(id))) return;
    let stopped = false,
      lastTop: number | null = null;
    const stop = () => {
      stopped = true;
    };
    const land = (force: boolean) => {
      const el = document.getElementById(id);
      if (stopped || !el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      if (!force && lastTop !== null && Math.abs(top - lastTop) < 1) return;
      lastTop = top;
      const y = top - anchorOffset(el);
      if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
    };
    const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    inputs.forEach((ev) => window.addEventListener(ev, stop, { passive: true, once: true }));
    if (document.fonts) document.fonts.ready.then(() => land(true));
    const off = landingState.subscribe(() => {
      if (landingState.get().loaded) land(true);
    });
    const tick = window.setInterval(() => land(false), 100);
    const settle = window.setTimeout(() => {
      stop();
      window.clearInterval(tick);
    }, 4000);
    return () => {
      stopped = true;
      inputs.forEach((ev) => window.removeEventListener(ev, stop));
      off();
      window.clearInterval(tick);
      window.clearTimeout(settle);
    };
  }, [location.key, location.hash]);

  // C16: On this page follows the reading position (once per frame on scroll).
  const [reading, setReading] = useState<string | null>(null);
  const clicked = useRef<{ h: string; at: number } | null>(null);
  const hrefs = useRef<string[]>([]);
  hrefs.current = toc.map((e) => e.h);
  const spy = useRef(() => setReading(readingEntry(hrefs.current, clicked.current)));
  useEffect(() => {
    let q = 0;
    const onScroll = () => {
      if (!q)
        q = requestAnimationFrame(() => {
          q = 0;
          spy.current();
        });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    spy.current();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(q);
    };
  }, []);
  useEffect(() => spy.current(), [refund]);
  const onEntry = (h: string) => () => {
    clicked.current = { h, at: performance.now() };
    window.setTimeout(() => spy.current(), 60);
  };

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
      // Arabic (ARABIC-RTL.md 1): Legal sets IBM Plex Sans Arabic first.
      style={{ position: "relative", zIndex: "2", overflowX: "clip", padding: `${r.ctTop} ${r.px} 88px`, fontFamily: ar ? '"IBM Plex Sans Arabic","Manrope",system-ui,sans-serif' : undefined }}
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
              {toc.map((lt) => {
                // C16: the entry being read is #5B45C2; a sub-entry also gets a
                // 2px lavender bar in its indent (on the right in Arabic).
                const on = reading === lt.h;
                return (
                  <a
                    key={lt.h}
                    href={lt.h}
                    onClick={onEntry(lt.h)}
                    aria-current={on ? "location" : undefined}
                    className="cl-hc"
                    style={
                      {
                        paddingTop: lt.doc ? "9px" : "4px",
                        paddingBottom: "4px",
                        paddingInlineStart: lt.doc ? "0" : "12px",
                        paddingInlineEnd: "0",
                        fontSize: lt.doc ? "13.5px" : "13px",
                        fontWeight: lt.doc ? 800 : 600,
                        color: on ? "#5B45C2" : lt.doc ? "#221E1A" : "#5B5349",
                        boxShadow: on && !lt.doc ? (ar ? "inset -2px 0 0 #775FD7" : "inset 2px 0 0 #775FD7") : undefined,
                        lineHeight: "1.35",
                        "--hc": "#6A54C4",
                      } as React.CSSProperties
                    }
                  >
                    {lt.t}
                  </a>
                );
              })}
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
                      <p style={{ fontSize: "15.5px", lineHeight: "1.7", color: "#3B352D" }}>{withPolicyLink(it)}</p>
                    </div>
                  ))}
                </section>
              ))}
            </article>
          ))}
          {refund && (
            <article
              id={REFUND_POLICY_ID}
              lang={refundLang}
              dir={refundLang === "ar" ? "rtl" : "ltr"}
              style={{ scrollMarginTop: "96px", paddingBottom: "44px", marginBottom: "44px", borderBottom: "1px solid #EDEAE4" }}
            >
              <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: ".22em", color: REFUND_C }}>04</span>
              <h2 style={{ marginTop: "12px", fontSize: r.lgH2, fontWeight: "800", letterSpacing: "-.03em", lineHeight: "1.1" }}>{refund.title}</h2>
              <p style={{ marginTop: "16px", fontSize: "14px", fontWeight: "600", color: "#756D63" }}>{refund.updated}</p>
              {refund.intro.map((b, i) => (
                <RefundBlock key={i} b={b} links={REFUND_POLICY_LINKS[refundLang]} />
              ))}
              {refund.sections.map((s) => (
                <section key={s.id} id={refundId(s.id)} style={{ scrollMarginTop: "96px", marginTop: "30px" }}>
                  <h3 style={{ fontSize: "19px", fontWeight: "800", letterSpacing: "-.015em" }}>{s.h}</h3>
                  {s.blocks.map((b, i) => (
                    <RefundBlock key={i} b={b} links={REFUND_POLICY_LINKS[refundLang]} />
                  ))}
                </section>
              ))}
            </article>
          )}
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

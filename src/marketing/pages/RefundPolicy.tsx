import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSEO } from "../useSEO";
import { PageMark } from "../landing/sections/ChapterMark";
import { usePageLink } from "../landing/navigation";
import { usePageMotion } from "../landing/pageMotion";
import { useViewportWidth } from "../landing/viewport";
import { LG, SM } from "../landing/engine/env";
import { WASH_BG, WEDGE_312, WEDGE_48 } from "../landing/wash";
import { SITE_URL } from "../../config/site";
import { linkPhrases, parsePolicy, type PolicyBlock, type PolicyPiece } from "../legal/policyDoc";
import { initialPolicyLang, PREVAILS_SECTION_ID, REFUND_POLICY_LINKS, REFUND_POLICY_PATH, type PolicyLang } from "../legal/refund";
import EN_MD from "../../../docs/legal/refund-policy.md?raw";
import AR_MD from "../../../docs/legal/refund-policy.ar.md?raw";

// Round F (DN, undrawn): the Refund and Cancellation Policy in the Community
// guidelines page's layout and literal values (LG1 v17): washed head, 68ch
// column, h2 sections, dotted list items, closing card. One URL with an
// "English · العربية" switch (F2); the Arabic is set right to left in IBM Plex
// Sans Arabic, loaded only when shown. Both versions open with their own
// section 13 (the Arabic version prevails).

const DOCS = { en: parsePolicy(EN_MD), ar: parsePolicy(AR_MD) };
const AR_FONT_HREF = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap";
const AR_FAMILY = '"IBM Plex Sans Arabic", "Manrope", system-ui, sans-serif';
const DOT = "#775FD7";

function vals(vw: number) {
  const lg = vw >= LG,
    sm = vw >= SM;
  return {
    ctTop: lg ? "96px" : "80px",
    px: sm ? "40px" : "20px",
    washH: lg ? "560px" : "400px",
    headMb: lg ? "64px" : "40px",
    eyebrow: lg ? "20px" : "14px",
    h1: lg ? "56px" : "40px",
  };
}

function useArabicFont(on: boolean) {
  useEffect(() => {
    if (!on || document.head.querySelector(`link[href="${AR_FONT_HREF}"]`)) return;
    const el = document.createElement("link");
    el.rel = "stylesheet";
    el.href = AR_FONT_HREF;
    document.head.appendChild(el);
  }, [on]);
}

/** hreflang for both versions of the one URL, removed when the page goes. */
function useAlternates() {
  useEffect(() => {
    const made = (["en", "ar"] as const).map((l) => {
      const el = document.createElement("link");
      el.rel = "alternate";
      el.hreflang = l;
      el.href = `${SITE_URL}${REFUND_POLICY_PATH}${l === "ar" ? "?lang=ar" : ""}`;
      document.head.appendChild(el);
      return el;
    });
    return () => made.forEach((el) => el.remove());
  }, []);
}

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

const Block: React.FC<{ b: PolicyBlock; links: [string, string][] }> = ({ b, links }) =>
  "p" in b ? (
    <p style={{ marginTop: "12px", fontSize: "15.5px", lineHeight: "1.7", color: "#3B352D" }}>
      <Pieces parts={linkPhrases(b.p, links)} />
    </p>
  ) : (
    <>
      {b.ul.map((li, i) => (
        <div key={i} style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
          <span style={{ width: "6px", height: "6px", marginTop: "10px", flexShrink: "0", borderRadius: "99px", background: DOT }} />
          <p style={{ fontSize: "15.5px", lineHeight: "1.7", color: "#3B352D" }}>
            <Pieces parts={linkPhrases(li, links)} />
          </p>
        </div>
      ))}
    </>
  );

export const RefundPolicy: React.FC = () => {
  useSEO("Refund and Cancellation Policy", "How cancellations and refunds work for what you buy from Centium.");
  usePageMotion();
  useAlternates();
  const r = vals(useViewportWidth());
  const pageLink = usePageLink();
  const { search } = useLocation();
  const navigate = useNavigate();
  const [lang, setLang] = useState<PolicyLang>(() =>
    initialPolicyLang(search, document.documentElement.lang || "", typeof navigator === "undefined" ? "" : navigator.language || ""),
  );
  useArabicFont(lang === "ar");
  const doc = DOCS[lang];
  const links = REFUND_POLICY_LINKS[lang];
  const ar = lang === "ar";
  const prevails = useMemo(() => doc.sections.find((s) => s.id === PREVAILS_SECTION_ID), [doc]);

  const choose = (l: PolicyLang) => {
    setLang(l);
    navigate({ search: l === "ar" ? "?lang=ar" : "" }, { replace: true });
  };

  const wash = (mask: string) => (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "0",
        right: "0",
        top: "0",
        height: r.washH,
        transform: "scaleY(-1)",
        pointerEvents: "none",
        background: WASH_BG,
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );

  const langBtn = (l: PolicyLang, label: string, labelLang: string) => (
    <button
      type="button"
      lang={labelLang}
      aria-pressed={lang === l}
      onClick={() => choose(l)}
      className="cl-hbd"
      style={{
        padding: "8px 16px",
        borderRadius: "999px",
        border: `1px solid ${lang === l ? "#775FD7" : "#CFC5EA"}`,
        background: lang === l ? "#775FD7" : "#FFFFFF",
        color: lang === l ? "#FFFFFF" : "#221E1A",
        fontWeight: 600,
        fontSize: "14px",
        fontFamily: labelLang === "ar" ? AR_FAMILY : "inherit",
        cursor: "pointer",
        "--hbd": "#775FD7",
      } as React.CSSProperties}
    >
      {label}
    </button>
  );

  return (
    <section
      id="refund-policy-page"
      data-screen-label="Refund and cancellation policy"
      style={{ position: "relative", zIndex: "2", overflowX: "clip", padding: `${r.ctTop} ${r.px} 88px` }}
    >
      {wash(WEDGE_48)}
      {wash(WEDGE_312)}
      <div style={{ position: "relative", textAlign: "center", maxWidth: "820px", margin: `0 auto ${r.headMb}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <PageMark id="LEGAL" word={ar ? "قانوني" : "Legal"} size={r.eyebrow} />
        <div role="group" aria-label="Language" style={{ marginTop: "18px", display: "flex", gap: "8px", alignItems: "center" }}>
          {langBtn("en", "English", "en")}
          {langBtn("ar", "العربية", "ar")}
        </div>
        <div lang={lang} dir={ar ? "rtl" : "ltr"} style={{ fontFamily: ar ? AR_FAMILY : undefined }}>
          <h1 style={{ margin: "14px 0 0", fontWeight: "800", fontSize: r.h1, letterSpacing: ar ? "0" : "-.04em", lineHeight: ar ? "1.3" : "1.04", textWrap: "balance" }}>{doc.title}</h1>
          <p style={{ margin: "12px 0 0", fontSize: "14px", fontWeight: "600", color: "#756D63" }}>{doc.updated}</p>
        </div>
      </div>
      <div lang={lang} dir={ar ? "rtl" : "ltr"} style={{ position: "relative", maxWidth: "68ch", margin: "0 auto", textAlign: "start", fontFamily: ar ? AR_FAMILY : undefined }}>
        {prevails && (
          <div data-prevails style={{ padding: "14px 18px", borderRadius: "16px", background: "#F4F1FC", border: "1px solid rgba(125,103,217,.18)", marginBottom: "8px" }}>
            {prevails.blocks.map((b, i) => (
              <p key={i} style={{ fontSize: "15px", lineHeight: "1.65", fontWeight: 600, color: "#3B352D" }}>
                {"p" in b ? <Pieces parts={b.p} /> : null}
              </p>
            ))}
          </div>
        )}
        <article style={{ paddingBottom: "44px", marginBottom: "44px", borderBottom: "1px solid #EDEAE4" }}>
          {doc.intro.map((b, i) => (
            <Block key={i} b={b} links={links} />
          ))}
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} style={{ scrollMarginTop: "96px", marginTop: "30px" }}>
              <h2 style={{ fontSize: "19px", fontWeight: "800", letterSpacing: ar ? "0" : "-.015em" }}>{s.h}</h2>
              {s.blocks.map((b, i) => (
                <Block key={i} b={b} links={links} />
              ))}
            </section>
          ))}
        </article>
        <div style={{ padding: "24px", borderRadius: "22px", background: "#FFFFFF", border: "1px solid rgba(125,103,217,.14)" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "800", letterSpacing: ar ? "0" : "-.028em" }}>{ar ? "هل تحتاج إلى مساعدة في عملية شراء؟" : "Need help with a purchase?"}</h2>
          <p style={{ marginTop: "10px", fontSize: "15.5px", lineHeight: "1.65", color: "#5B5349" }}>
            {ar ? "اطلب الاسترداد من Apple أو Google، أو تواصل معنا وسنردّ خلال 5 أيام عمل." : "Ask Apple or Google for a refund, or contact us and we'll reply within 5 business days."}
          </p>
          <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a
              href="/app"
              className="cl-hbg"
              style={{ padding: "13px 22px", borderRadius: "999px", background: "#775FD7", color: "#fff", fontWeight: 600, fontSize: "14.5px", "--hbg": "#6A54C4" } as React.CSSProperties}
            >
              {ar ? "العودة إلى التطبيق" : "Back to the app"}
            </a>
            <a
              href="/contact"
              onClick={pageLink("/contact")}
              className="cl-hbd"
              style={{ padding: "13px 22px", borderRadius: "999px", border: "1px solid #CFC5EA", color: "#221E1A", fontWeight: 600, fontSize: "14.5px", "--hbd": "#775FD7" } as React.CSSProperties}
            >
              {ar ? "تواصل معنا" : "Contact us"}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

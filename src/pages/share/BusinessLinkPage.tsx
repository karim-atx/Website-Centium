import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { BRAND_C, BRAND_LEAF, MARK_C_PATH, MARK_LEAF_PATH } from "../../components/icons/CentiumMark";
import { CARD_LEAF_PATH, CARD_LEAF_VIEWBOX, WHITE_MARK_VIEWBOX } from "../../components/share/business/bizArt";
import { dayLabel, fillOf, longDay, pointsText, whereLabel, type OfferData } from "../../components/share/business/bizCardModel";
import { typeLabel } from "../../components/business-more/kind";
import { useIsDark } from "../../hooks/useIsDark";
import { siteHref } from "../../config/site";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import {
  bizSharePath,
  isBizSlug,
  parseShareSplat,
  resolveShareLink,
  type ShareLinkCard,
  type ShareLinkItem,
  type ShareLinkKind,
  type ShareLinkResult,
} from "../../services/share-links";
import { marketPalette } from "../../theme/marketTokens";
import { linePx, textPx } from "../../theme/textSize";
import { time12 } from "../../utils/time12";
import { isRtl, t, tk, tx } from "../../i18n/core";

// Market + Share 3.0 · B-SH.6 the share-link page (Business Sharing Screens
// `linkLanding`, lines 247 to 270; HANDOVER §4 "Additions … B-SH.6", D-47),
// the public route /b/:slug/* a card's QR and link open (PLAN F35). No navbar:
// - padding 18 20 0; the Centium mark (20 × 21.6) and "Centium" 13 / 800;
// - 18 below, the item card in the business's colours (r24, padding 20, the
//   150deg gradient): the logo tile 40 r12 (18% white, 1px 55% white; 13 /
//   800 initials), the name 15 / 800 and the category line 11.5 at 0.92; the
//   eyebrow 10.5 / 800 / 0.14em uppercase (18 above); the title 26 / 800 /
//   1.15 / -0.02em (4 above); the value 36 / 800 / 1 / -0.03em with the white
//   leaf 9 × 16 and "points" 13 / 700 (10 above); the line 12 at 0.94 (8);
// - an offer adds "Redeem with Centium Points" (18 / 800 / 1.3, 16 above) and
//   the explainer (13 / 1.55 #5B5349, 6 above);
// - at the bottom (padding 0 0 34, gap 8): "Open in Centium" (52, r16,
//   #AEA1DC, 15 / 800) to siteHref of this same path; App Store and Google
//   Play (46, r14, 1px border, 13 / 700) greyed as "Coming soon" (D-47: no
//   app is published); "Already have Centium? The link opens this offer in
//   the app." 11.5 / 16 #8C8378, centred.
//
// The reader is resolve_share_link (anon; services/share-links): found draws
// the card from the business's public row and the item's (an offer signed
// out, which offers' grants don't let anyone read, names the business and
// says to open it in Centium); a bad slug, a closed or hidden business, or an
// item that isn't public reads "This link isn't available."; a link Centium
// took down (disabled_share_links) says so. Never a made-up card.
//
// Board-only (D-52), not shipped: the "9:41" status bar, the browser address
// bar, the centium.app address, and the sample business and offer.

const NOUN: Record<string, string> = { o: tk("this offer"), c: tk("this class"), m: tk("this plan"), i: tk("this item"), j: tk("this opening"), week: tk("this schedule"), none: tk("this business") };
const nounOf = (kind: ShareLinkKind | null) => t(NOUN[kind ?? "none"]);

function itemLines(card: ShareLinkCard): { eyebrow: string; title: string; value: { big: string; leaf: boolean; unit: string } | null; line: string | null; image: string | null } {
  const it: ShareLinkItem = card.item;
  switch (it.kind) {
    case "o": {
      const o = it.offer;
      if (!o) return { eyebrow: t("Offer"), title: card.business.name, value: null, line: t("Open it in Centium to see {item}.", { item: nounOf("o") }), image: null };
      return {
        eyebrow: t("Offer"),
        title: o.headline,
        value: { big: pointsText(o.pointsCost), leaf: true, unit: t("points") },
        line: [o.validUntil ? t("Valid until {date}", { date: longDay(o.validUntil) }) : null, o.where ? (whereLabel(o.where as OfferData["where"]) ?? null) : null].filter(Boolean).join(" · ") || null,
        image: null,
      };
    }
    case "c": {
      const when = [it.date ? dayLabel(it.date) : null, it.startTime ? time12(it.startTime) : null].filter(Boolean).join(" · ");
      return { eyebrow: t("Class"), title: it.title, value: null, line: when || null, image: null };
    }
    case "m":
      return { eyebrow: tx("Membership", "subscription"), title: it.name, value: it.price ? { big: it.price, leaf: false, unit: "" } : null, line: null, image: null };
    case "i":
      return { eyebrow: t("From our shop"), title: it.name, value: it.price ? { big: it.price, leaf: false, unit: "" } : null, line: it.description, image: it.imageUrl };
    case "j":
      return { eyebrow: t("Now hiring"), title: card.business.name, value: null, line: t("Open it in Centium to see {item}.", { item: nounOf("j") }), image: null };
    case "week":
      return { eyebrow: t("Weekly schedule"), title: t("This week at {name}", { name: card.business.name }), value: null, line: null, image: null };
    default:
      return { eyebrow: t("Find us on Centium"), title: card.business.name, value: null, line: null, image: null };
  }
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "C"
  );
}

export default function BusinessLinkPage() {
  const { slug = "", "*": splat = "" } = useParams();
  const { authReady, authUserId } = useApp();
  const dark = useIsDark();
  const m = marketPalette(dark);
  const target = isBizSlug(slug) ? parseShareSplat(splat) : null;
  const [state, setState] = useState<ShareLinkResult | { status: "loading" }>({ status: "loading" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!authReady) return;
    if (!target) {
      setState({ status: "missing" });
      return;
    }
    let live = true;
    setState({ status: "loading" });
    void resolveShareLink(slug, target.kind, target.item, !!authUserId).then((r) => live && setState(r));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, splat, reload, authReady, authUserId]);

  useEffect(() => {
    document.title = state.status === "found" ? `${state.card.business.name} · Centium` : "Centium";
  }, [state]);

  const path = target ? bizSharePath(slug, target.kind, target.item) : "/";
  const noun = nounOf(target?.kind ?? null);

  const footer = (
    <div className="flex flex-col" style={{ gap: 8, paddingBottom: 34, marginTop: 24 }}>
      <a
        href={siteHref(path)}
        className="tap flex items-center justify-center transition-transform duration-[140ms] ease-out active:scale-[0.97]"
        style={{ height: 52, borderRadius: 16, background: m.fill, color: m.onfill, fontSize: textPx(15), fontWeight: 800 }}
      >
        {t("Open in Centium")}
      </a>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {["App Store", "Google Play"].map((s) => (
          <span
            key={s}
            role="link"
            aria-disabled="true"
            aria-label={t("{store}, coming soon", { store: s })}
            className="flex flex-col items-center justify-center"
            style={{ minHeight: 48, borderRadius: 14, border: `1px solid ${m.border}`, color: m.ink, opacity: 0.4 }}
          >
            <span style={{ fontSize: textPx(13), fontWeight: 700, lineHeight: linePx(16) }}>{s}</span>
            <span style={{ fontSize: textPx(10.5), fontWeight: 600, lineHeight: linePx(13), color: m.faint }}>{t("Coming soon")}</span>
          </span>
        ))}
      </div>
      <p style={{ margin: 0, textAlign: "center", fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint }}>{t("Already have Centium? The link opens {item} in the app.", { item: noun })}</p>
    </div>
  );

  let body: React.ReactNode;
  let showFooter = true;
  if (state.status === "loading") {
    body = (
      <div aria-busy="true" role="status" aria-label={t("Loading")} style={{ marginTop: 18 }}>
        <span aria-hidden className="block animate-skeleton-pulse" style={{ height: 217, borderRadius: 24, background: m.soft }} />
        <span aria-hidden className="block animate-skeleton-pulse" style={{ height: 22, width: "70%", borderRadius: 8, background: m.soft, marginTop: 16 }} />
        <span aria-hidden className="block animate-skeleton-pulse" style={{ height: 40, borderRadius: 8, background: m.soft, marginTop: 8 }} />
      </div>
    );
    showFooter = false;
  } else if (state.status === "error") {
    body = (
      <div role="alert" style={{ marginTop: 18, borderRadius: 20, background: m.soft, padding: "20px 18px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: textPx(15), fontWeight: 800, color: m.ink }}>{t("Couldn't load this link")}</p>
        <p style={{ margin: "6px 0 0", fontSize: textPx(13), lineHeight: linePx(19), color: m.ink2 }}>{state.offline ? OFFLINE_MESSAGE : t("Check your connection and try again.")}</p>
        <button
          type="button"
          onClick={() => setReload((n) => n + 1)}
          className="tap"
          style={{ marginTop: 12, minHeight: 44, padding: "0 18px", borderRadius: 12, border: `1px solid ${m.border}`, background: m.card, color: m.cancelink, fontSize: textPx(13), fontWeight: 800 }}
        >
          {t("Retry")}
        </button>
      </div>
    );
    showFooter = false;
  } else if (state.status === "missing") {
    body = (
      <div style={{ marginTop: 18, borderRadius: 20, background: m.soft, padding: "20px 18px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: textPx(15), fontWeight: 800, color: m.ink }}>{t("This link isn't available.")}</p>
        <p style={{ margin: "6px 0 0", fontSize: textPx(13), lineHeight: linePx(19), color: m.ink2 }}>{t("It may have been removed, or it isn't public on Centium right now.")}</p>
      </div>
    );
    showFooter = false;
  } else if (state.status === "disabled") {
    body = (
      <div style={{ marginTop: 18, borderRadius: 20, background: m.soft, padding: "20px 18px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: textPx(15), fontWeight: 800, color: m.ink }}>{t("This link was taken down.")}</p>
        <p style={{ margin: "6px 0 0", fontSize: textPx(13), lineHeight: linePx(19), color: m.ink2 }}>{t("Centium removed it, so it can't be opened any more.")}</p>
      </div>
    );
    showFooter = false;
  } else {
    const card = state.card;
    const lines = itemLines(card);
    const fill = fillOf(card.business.type);
    const head = [card.business.type ? typeLabel(card.business.type) : null, card.business.area].filter(Boolean).join(" · ");
    const offer = card.item.kind === "o";
    body = (
      <>
        <section
          aria-label={`${card.business.name}: ${lines.title}`}
          style={{ marginTop: 18, borderRadius: 24, background: `linear-gradient(150deg, ${fill.c1} 0%, ${fill.c2} 100%)`, color: "#FFFFFF", padding: 20 }}
        >
          <div className="flex items-center" style={{ gap: 10 }}>
            <span
              className="relative flex items-center justify-center shrink-0 overflow-hidden"
              style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.55)", boxSizing: "border-box", fontSize: 13, fontWeight: 800 }}
            >
              {initialsOf(card.business.name)}
              {/* Over the initials; a logo that doesn't load leaves them showing. */}
              {card.business.logoUrl && (
                <img
                  src={card.business.logoUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </span>
            <div className="min-w-0">
              <div style={{ fontSize: textPx(15), fontWeight: 800, lineHeight: "normal" }}>{card.business.name}</div>
              {head && <div style={{ fontSize: textPx(11.5), lineHeight: "normal", opacity: 0.92 }}>{head}</div>}
            </div>
          </div>
          {lines.image && <img src={lines.image} alt="" className="block w-full object-cover" style={{ marginTop: 16, height: 160, borderRadius: 14 }} />}
          <div style={{ marginTop: 18, fontSize: textPx(10.5), fontWeight: 800, lineHeight: "normal", letterSpacing: isRtl() ? 0 : "0.14em", textTransform: "uppercase" }}>{lines.eyebrow}</div>
          <div style={{ marginTop: 4, fontSize: textPx(26), fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em" }}>{lines.title}</div>
          {lines.value && (
            <div className="flex items-baseline" style={{ gap: 5, marginTop: 10 }}>
              <span style={{ fontSize: textPx(36), fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em" }}>{lines.value.big}</span>
              {lines.value.leaf && (
                <svg width="9" height="16" viewBox={CARD_LEAF_VIEWBOX} preserveAspectRatio="none" role="img" aria-label={t("points")} style={{ display: "inline-block" }}>
                  <path d={CARD_LEAF_PATH} fill="#FFFFFF" />
                </svg>
              )}
              {lines.value.unit && <span style={{ fontSize: textPx(13), fontWeight: 700, lineHeight: "normal" }}>{lines.value.unit}</span>}
            </div>
          )}
          {lines.line && <div style={{ marginTop: 8, fontSize: textPx(12), lineHeight: "normal", opacity: 0.94 }}>{lines.line}</div>}
        </section>
        {offer && (
          <>
            <h2 style={{ margin: "16px 0 0", fontSize: textPx(18), fontWeight: 800, lineHeight: 1.3, color: m.ink }}>{t("Redeem with Centium Points")}</h2>
            <p style={{ margin: "6px 0 0", fontSize: textPx(13), lineHeight: 1.55, color: m.ink2 }}>
              {t("Earn points by logging your food, workouts and health on Centium, then spend them on offers like this one. Points have no cash value.")}
            </p>
          </>
        )}
      </>
    );
  }

  return (
    <div className="flex justify-center" style={{ minHeight: "100dvh", background: m.page, color: m.ink }}>
      <main className="w-full flex flex-col" style={{ maxWidth: 430, minHeight: "100dvh", padding: "18px 20px 0", boxSizing: "border-box" }}>
        <div className="flex items-center" style={{ gap: 7 }}>
          {/* assets/centium-nav-mark.svg: viewBox 279.1 180.1 652 706, drawn 20 × 21.6. */}
          <svg width={20} height={21.6} viewBox={WHITE_MARK_VIEWBOX} preserveAspectRatio="none" aria-hidden style={{ display: "block", flex: "none" }}>
            <path d={MARK_C_PATH} fill={BRAND_C} />
            <path d={MARK_LEAF_PATH} fill={BRAND_LEAF} />
          </svg>
          <span style={{ fontSize: textPx(13), fontWeight: 800, lineHeight: "normal", letterSpacing: "0.01em" }}>Centium</span>
        </div>
        {body}
        <div style={{ flex: 1 }} />
        {showFooter && footer}
      </main>
    </div>
  );
}

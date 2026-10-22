import React, { useEffect, useState } from "react";
import { MARK_C_PATH, MARK_LEAF_PATH } from "../../icons/CentiumMark";
import { qrRows } from "../ShareQr";
import {
  CARD_SHADOW,
  CARD_W,
  CEN_GRADIENT,
  TS_SOFT,
  bizGradient,
  brandLine,
  cardLayout,
  type BizBrand,
  type BizFormat,
  type CardContent,
} from "./bizCardModel";
import { CARD_LEAF_PATH, CARD_LEAF_VIEWBOX, WHITE_MARK_VIEWBOX } from "./bizArt";

// Market + Share 3.0 · the B-SH business promo card, the board's card markup
// (Business Sharing Screens lines 63 to 89, values from bcard()), literally:
// - a 300-wide artboard (533 Story / Sticker, 375 Post) scaled by width / 300,
//   r12 inside a box rounded max(8, 12k) with the 0 1px 2px / 0 8px 24px shadow
//   (none for the sticker, the photo layer and flat cards);
// - padding 22; the head: the logo (34, r10, 18% white, 1px 55% white border,
//   initials 12 / 800, or the business logo), name 13 / 800 / 1.2, category
//   line 9.5 / 600 / 1.3 at 0.92, the white Centium mark 13 × 14 with
//   "Centium" 8 / 700 / 0.02em at 0.95;
// - a spacer (Story / Sticker: flex 1; Post: 14), the eyebrow 9.6 / 800 /
//   0.14em uppercase (+ the white "NEW CLASS" pill 8.5 / 800 / 0.08em in the
//   business's dark colour), the showcase photo (r10, 96 / 190), the title
//   (22 / 28, schedule 17 / 22, 800, 1.14, -0.02em), the value (38 / 48, 800,
//   0.95, -0.04em) with the white leaf 9 × 16 and the unit 13 / 700, the sub
//   11 / 600 / 1.4, the rows (10.5, rules 1px 30% white, padding 6 0), the
//   week (9.5 / 800 day, 9 / 700 chips r5 on 16% white, rules 24% white);
// - a flex spacer (min 12) and the footer: the QR on a white r5 tile (pad 3,
//   0 1px 6px 18% black; 34 / 42), "Open in Centium" 11.5 / 800 and the link
//   8.5 / 600 at 0.9.
// Sticker and photo: no background, white text with TS_SOFT.
//
// The card is an image, so its type never follows Larger text, and it reads
// the same in dark mode. `data-paint` marks what paintBizCard draws from
// the DOM (the export is measured from this markup, so it matches).
//
// Board-only (D-52), not shipped: the striped "showcase photo" placeholder
// (the real business_offerings.image_url goes there), sample names, prices
// and the centium.app links.

/** "biz" / "cen" fills; "clear" = sticker and the photo layer (transparent, soft shadow). */
export type CardFill = "biz" | "cen" | "clear";

export interface BizCardProps {
  brand: BizBrand;
  content: CardContent;
  format: BizFormat;
  fill: CardFill;
  /** The link printed under "Open in Centium" (no scheme). */
  linkText: string;
  /** The QR's value (the full link). */
  linkHref: string;
  width: number;
  /** No outer shadow (the destinations preview keeps it; the photo layer and the measure copy don't). */
  flat?: boolean;
  /** The artboard height when it differs from the board's (the export's 533.33). */
  artboardH?: number;
}

const FONT = "Manrope, Helvetica, Arial, sans-serif";

const cardBackground = (fill: CardFill, brand: Pick<BizBrand, "c1" | "c2">) =>
  fill === "biz" ? bizGradient(brand.c1, brand.c2) : fill === "cen" ? CEN_GRADIENT : "transparent";

/** The QR, drawn from qrRows (the repo's zxing writer); white until it's ready. */
const CardQr: React.FC<{ value: string; size: number }> = ({ value, size }) => {
  const [state, setState] = useState<{ value: string; rows: boolean[][] | null } | null>(null);
  useEffect(() => {
    let live = true;
    void qrRows(value).then((rows) => live && setState({ value, rows }));
    return () => {
      live = false;
    };
  }, [value]);
  const rows = state && state.value === value ? state.rows : null;
  const n = rows?.length ?? 21;
  return (
    <svg data-paint="qr" data-qr={value} width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" aria-hidden style={{ display: "block" }}>
      <rect width={n} height={n} fill="#FFFFFF" />
      {rows?.flatMap((row, y) => row.map((dark, x) => (dark ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill="#241F1B" /> : null)))}
    </svg>
  );
};

export const BizCard: React.FC<BizCardProps> = ({ brand, content: c, format, fill, linkText, linkHref, width, flat, artboardH }) => {
  const L = cardLayout(format, width, c.small);
  const h = artboardH ?? L.h;
  const clear = fill === "clear";
  const ts = clear ? TS_SOFT : "none";
  const label = [c.eyebrow, c.title].filter(Boolean).join(": ");
  // A logo or photo that won't load is left out (the initials show), never a broken image.
  const [broken, setBroken] = useState<string[]>([]);
  const ok = (url: string | null): url is string => !!url && !broken.includes(url);
  const fail = (url: string) => () => setBroken((b) => (b.includes(url) ? b : [...b, url]));
  return (
    <div
      role="img"
      aria-label={`${brand.name}. ${label}`}
      style={{ position: "relative", flex: "none", width: L.bw, height: Math.round(h * L.k * 10) / 10, borderRadius: L.br, boxShadow: clear || flat ? "none" : CARD_SHADOW }}
    >
      <div
        data-card-root
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: CARD_W,
          height: h,
          transform: L.k === 1 ? undefined : `scale(${L.k.toFixed(4)})`,
          transformOrigin: "0 0",
          overflow: "hidden",
          borderRadius: 12,
          background: cardBackground(fill, brand),
          fontFamily: FONT,
          WebkitFontSmoothing: "antialiased",
          color: "#FFFFFF",
          textAlign: "left",
        }}
      >
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", padding: 22, boxSizing: "border-box", textShadow: ts }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              style={{
                position: "relative",
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.55)",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                flex: "none",
                textShadow: "none",
                overflow: "hidden",
              }}
            >
              {ok(brand.logoUrl) ? (
                <img data-paint="img" src={brand.logoUrl} alt="" onError={fail(brand.logoUrl)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: 9 }} />
              ) : (
                brand.initials
              )}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{brand.name}</div>
              <div style={{ fontSize: 9.5, fontWeight: 600, lineHeight: 1.3, opacity: 0.92, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{brandLine(brand)}</div>
            </div>
            <span style={{ display: "flex", alignItems: "center", gap: 3, flex: "none", opacity: 0.95 }}>
              <svg data-paint="mark" width={13} height={14} viewBox={WHITE_MARK_VIEWBOX} preserveAspectRatio="none" aria-hidden style={{ display: "block" }}>
                <path d={MARK_C_PATH} fill="#FFFFFF" />
                <path d={MARK_LEAF_PATH} fill="#FFFFFF" />
              </svg>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.02em" }}>Centium</span>
            </span>
          </div>
          <div style={{ flex: `${L.grow} 1 0%`, minHeight: L.gap }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9.6, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>{c.eyebrow}</span>
            {c.isNew && (
              <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "0.08em", borderRadius: 999, padding: "2px 7px", background: "#FFFFFF", color: brand.c2, textShadow: "none" }}>NEW CLASS</span>
            )}
          </div>
          {ok(c.img) && (
            <div style={{ position: "relative", marginTop: 10, height: L.imgH, borderRadius: 10, overflow: "hidden", flex: "none" }}>
              <img data-paint="img" src={c.img} alt="" onError={fail(c.img)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: L.titleFs, fontWeight: 800, lineHeight: 1.14, letterSpacing: "-0.02em", textWrap: "pretty" } as React.CSSProperties}>{c.title}</div>
          {c.val && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 8 }}>
              <span style={{ fontSize: L.valFs, fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.04em" }}>{c.val}</span>
              {c.leaf && (
                <svg data-paint="leaf" width={9} height={16} viewBox={CARD_LEAF_VIEWBOX} preserveAspectRatio="none" aria-hidden style={{ display: "inline-block" }}>
                  <path d={CARD_LEAF_PATH} fill="#FFFFFF" />
                </svg>
              )}
              {c.unit && <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.94 }}>{c.unit}</span>}
            </div>
          )}
          {c.sub && <div style={{ marginTop: 5, fontSize: 11, fontWeight: 600, lineHeight: 1.4, opacity: 0.94 }}>{c.sub}</div>}
          {c.rows.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column" }}>
              {c.rows.map((r) => (
                <div key={r.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.3)", fontSize: 10.5 }}>
                  <span style={{ opacity: 0.86, whiteSpace: "nowrap" }}>{r.k}</span>
                  <span style={{ fontWeight: 700, textAlign: "right" }}>{r.v}</span>
                </div>
              ))}
            </div>
          )}
          {c.sched && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: L.schedGap }}>
              {c.sched.map((d) => (
                <div key={d.d} style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: L.schedGap, borderTop: "1px solid rgba(255,255,255,0.24)" }}>
                  <span style={{ width: 28, flex: "none", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em" }}>{d.d}</span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {d.items.map((i, n) => (
                      <span key={n} style={{ fontSize: 9, fontWeight: 700, whiteSpace: "nowrap", borderRadius: 5, padding: "2px 6px", background: "rgba(255,255,255,0.16)", textShadow: "none" }}>{`${i.t} ${i.n}`}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div style={{ flex: "1 1 0%", minHeight: 12 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ flex: "none", background: "#FFFFFF", borderRadius: 5, padding: 3, display: "flex", boxShadow: "0 1px 6px rgba(0,0,0,0.18)" }}>
              <CardQr value={linkHref} size={L.qrS} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap" }}>Open in Centium</div>
              <div style={{ fontSize: 8.5, fontWeight: 600, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{linkText}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

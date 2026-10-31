import React, { useEffect, useState } from "react";
import { CentiumMark } from "../icons/CentiumMark";
import { STREAK_LEAF_PATH } from "../icons/StreakLeaf";
import { ShareQr } from "./ShareQr";
import {
  PALETTE,
  PHOTO_SCRIM,
  PHOTO_STRIPES,
  STICKER_CHECKER,
  cardFont,
  cardHeight,
  cardLink,
  cardQrValue,
  fillClient,
  fitLinkSize,
  type CardPro,
  type CardSpec,
  type ShareFormat,
  type ShareStyle,
} from "./shareCardModel";
import { LAYER, LAYER_LINK_ROOM, profileInitials, type LayerPlacement } from "./shareLayerModel";
import { photoRect } from "./overlayModel";

// Text width in the card font, for fitting the profile link (fitLinkSize). The
// export measures the same way, so the preview and the PNG agree.
let measureCtx: CanvasRenderingContext2D | null | undefined;
function measureText(text: string, font: string): number {
  if (measureCtx === undefined) measureCtx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

/**
 * Release 3 · W8 SH1 to SH3: one share card, a literal port of
 * source/gen/r31.js card31. Every size is a share of the card width
 * (u = W / 100), so the same card draws at 40 (CU30's thumbnail), 190 (SH5)
 * or 1080 (the export reference). Manrope throughout; the Centium mark, the
 * pro's name and "@handle on Centium" at the top; eyebrow 800 in capitals;
 * the hero (number, quote, title or profile); the stat row over a 1px rule;
 * the QR (white tile) with the profile link (cardLink) and "Scan to see my
 * profile". Story and Sticker are 9:16, Post 4:5, Square 1:1.
 *
 * Colours are the card's own (PAL31), never the app theme: a card looks the
 * same in light and dark mode, as it will in Instagram.
 */

export interface ShareCardProps {
  spec: CardSpec;
  pro: CardPro;
  format: ShareFormat;
  style: ShareStyle;
  width: number;
  /** The client as shown ("S.R.", "Sam", "A client"); fills {c}. */
  client?: string;
  /** QR code and link (SH6 "Link"); default on. */
  qr?: boolean;
  /** Stat indexes switched off in the editor. */
  hide?: number[];
  /** The Photo style's background (an object URL); stripes and "your photo" until one is chosen. */
  photoUrl?: string | null;
  /** Sticker drawn on the transparency checker (the editor) instead of over a photo. */
  onChecker?: boolean;
  /**
   * P-SH.3 ADDED "Check on a light background": the sticker with no
   * background and no shadow, so the editor's light checker shows through
   * (stLight: the card's bg transparent, sh none). Preview only.
   */
  bare?: boolean;
  /** No shadow (thumbnails). */
  flat?: boolean;
  className?: string;
}

const px = (v: number) => `${Math.round(v * 10) / 10}px`;

const Star: React.FC<{ s: number; col: string }> = ({ s, col }) => (
  <svg width={px(s)} height={px(s)} viewBox="0 0 24 24" aria-hidden style={{ display: "block", flex: "none" }}>
    <polygon points="12 2 15.1 8.6 22 9.3 16.8 14 18.2 21 12 17.3 5.8 21 7.2 14 2 9.3 8.9 8.6" fill={col} />
  </svg>
);

const Leaf: React.FC<{ h: number; col: string; op: number }> = ({ h, col, op }) => (
  <svg width={px((h * 510) / 915)} height={px(h)} viewBox="0 0 510 915" aria-hidden style={{ display: "block", flex: "none" }}>
    <path d={STREAK_LEAF_PATH} fill={col} fillOpacity={op} />
  </svg>
);

export const ShareCard: React.FC<ShareCardProps> = ({ spec: c, pro, format, style, width: W, client = "A client", qr = true, hide, photoUrl, onChecker, bare, flat, className }) => {
  // Re-measure the link once Manrope has loaded (the first render may measure the fallback face).
  const [, setFontsReady] = useState(false);
  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) setFontsReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  const P = PALETTE[style];
  const u = W / 100;
  const stk = format === "sticker";
  const sq = format === "square";
  const story = format === "story" || stk;
  const H = cardHeight(format, W);
  const shadow = stk || style === "P" ? "0 1px 10px rgba(0,0,0,0.38)" : undefined;
  const ink = stk ? "#FFFFFF" : P.ink;
  const sub = stk ? "rgba(255,255,255,0.94)" : P.sub;
  const acc = stk ? "#FFFFFF" : P.acc;
  const numCol = stk ? "#FFFFFF" : P.num;
  const line = stk ? "rgba(255,255,255,0.4)" : P.line;
  const photoBg = photoUrl ? `${PHOTO_SCRIM}, url("${photoUrl}") center / cover no-repeat` : `${PHOTO_SCRIM}, ${PHOTO_STRIPES}`;
  const bg = stk ? (bare ? "transparent" : onChecker ? STICKER_CHECKER : photoBg) : style === "P" ? photoBg : P.bg;
  const stats = c.stats.filter((_, i) => !(hide && hide.includes(i))).slice(0, 3);
  const pad = (sq ? 6.5 : 7) * u;
  const center = stk ? ("center" as const) : undefined;
  const showLink = qr && !!pro.handle;

  const head = (
    <div style={{ display: "flex", alignItems: "center", gap: px(2.4 * u), justifyContent: center }}>
      <CentiumMark height={(sq ? 7.3 : 8.3) * u} framing="png" label="Centium" style={{ width: px((sq ? 7 : 8) * u) }} />
      <div style={{ minWidth: 0, textShadow: shadow }}>
        <div style={{ fontSize: px((sq ? 3.5 : 3.8) * u), fontWeight: 800, lineHeight: 1.15, color: ink, whiteSpace: "nowrap" }}>{pro.name}</div>
        {pro.handle && <div style={{ fontSize: px((sq ? 2.8 : 3) * u), fontWeight: 600, lineHeight: 1.25, color: sub, whiteSpace: "nowrap" }}>{`@${pro.handle} on Centium`}</div>}
      </div>
    </div>
  );

  const eyebrow = (
    <div style={{ fontSize: px((sq ? 2.9 : 3.2) * u), fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: acc, marginBottom: px(2 * u), textShadow: shadow }}>{c.eyebrow}</div>
  );

  let hero: React.ReactNode = null;
  if (c.hero === "num") {
    const bs = stk ? 30 : story ? 30 : sq ? 19 : 24;
    hero = (
      <>
        <div style={{ display: "flex", alignItems: "baseline", gap: px(1.6 * u), justifyContent: center, textShadow: shadow }}>
          <span style={{ fontSize: px(bs * u), fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.05em", color: numCol }}>{c.big}</span>
          {c.unit ? <span style={{ fontSize: px(bs * 0.3 * u), fontWeight: 800, letterSpacing: "-0.02em", color: numCol }}>{c.unit}</span> : null}
        </div>
        <div style={{ marginTop: px(2.4 * u), fontSize: px((sq ? 5 : 6.2) * u), fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: ink, textShadow: shadow }}>{c.subject}</div>
        {c.line ? <div style={{ marginTop: px(1.2 * u), fontSize: px((sq ? 3 : 3.5) * u), fontWeight: 600, lineHeight: 1.35, color: sub, textShadow: shadow }}>{fillClient(c.line, client)}</div> : null}
      </>
    );
  } else if (c.hero === "quote") {
    hero = (
      <>
        {c.stars ? (
          <div style={{ display: "flex", gap: px(1 * u), marginBottom: px(3 * u), justifyContent: center }}>
            {Array.from({ length: c.stars }, (_, i) => (
              <Star key={i} s={(sq ? 5 : 6.4) * u} col={P.star} />
            ))}
          </div>
        ) : null}
        <div style={{ fontSize: px((sq ? 5.4 : story ? 7 : 6.4) * u), fontWeight: 700, lineHeight: 1.24, letterSpacing: "-0.02em", color: ink, textWrap: "pretty", textShadow: shadow }}>{`"${c.quote ?? ""}"`}</div>
        <div style={{ marginTop: px(2.6 * u), fontSize: px((sq ? 3 : 3.4) * u), fontWeight: 600, color: sub, textShadow: shadow }}>{c.by}</div>
      </>
    );
  } else if (c.hero === "title") {
    hero = (
      <>
        <div style={{ fontSize: px((sq ? 7.4 : story ? 9.4 : 8.4) * u), fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.03em", color: numCol, textWrap: "pretty", textShadow: shadow }}>{c.title}</div>
        {c.meta ? <div style={{ marginTop: px(2.2 * u), fontSize: px((sq ? 3 : 3.5) * u), fontWeight: 600, color: sub, textShadow: shadow }}>{fillClient(c.meta, client)}</div> : null}
      </>
    );
  } else if (c.hero === "profile") {
    const av = (sq ? 13 : story ? 22 : 17) * u;
    const initials = pro.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
    hero = (
      <>
        <span
          style={{
            width: px(av),
            height: px(av),
            borderRadius: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: px(3.4 * u),
            marginInline: stk ? "auto" : undefined,
            background: style === "L" ? "#E4F0EE" : "rgba(255,255,255,0.18)",
            color: style === "L" ? "#2F5F58" : "#FFFFFF",
            fontSize: px(av * 0.34),
            fontWeight: 800,
            border: `${px(0.8 * u)} solid ${style === "L" ? "#FFFFFF" : "rgba(255,255,255,0.35)"}`,
          }}
        >
          {initials}
        </span>
        <div style={{ fontSize: px((sq ? 7 : story ? 9 : 8) * u), fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", color: numCol, textShadow: shadow }}>{pro.name}</div>
        {c.head ? <div style={{ marginTop: px(1.4 * u), fontSize: px((sq ? 4.2 : 5) * u), fontWeight: 700, color: acc, textShadow: shadow }}>{c.head}</div> : null}
        {c.role ? <div style={{ marginTop: px(1 * u), fontSize: px((sq ? 3 : 3.5) * u), fontWeight: 600, color: sub, textShadow: shadow }}>{c.role}</div> : null}
      </>
    );
  }

  let extra: React.ReactNode = null;
  if (c.extra === "leaves" && !sq) {
    extra = (
      <div style={{ display: "flex", gap: px(2.2 * u), marginTop: px(4 * u), justifyContent: center }}>
        {Array.from({ length: 7 }, (_, i) => (
          <Leaf key={i} h={5.4 * u} col={stk || style !== "L" ? "#A2C8C2" : "#6F9993"} op={1} />
        ))}
      </div>
    );
  }
  if (c.extra === "slots" && c.slots?.length) {
    extra = (
      <div style={{ display: "flex", flexWrap: "wrap", gap: px(1.8 * u), marginTop: px((sq ? 3 : 4) * u), justifyContent: center }}>
        {c.slots.map((x) => (
          <span key={x} style={{ borderRadius: 9999, padding: `${px(1.4 * u)} ${px(3 * u)}`, fontSize: px((sq ? 3.1 : 3.5) * u), fontWeight: 700, color: ink, background: P.chip, border: `1px solid ${line}`, whiteSpace: "nowrap" }}>
            {x}
          </span>
        ))}
      </div>
    );
  }

  const sv = stk ? 6.6 : sq ? 5.2 : 6;
  const sl = sq ? 2.6 : 2.9;
  const statRow = stats.length ? (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
        gap: px(3 * u),
        marginTop: px((sq ? 4 : 6) * u),
        paddingTop: px((sq ? 3 : 4) * u),
        borderTop: `1px solid ${line}`,
        textAlign: center,
        textShadow: shadow,
      }}
    >
      {stats.map((s) => (
        <div key={`${s.key}-${s.value}`} style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: px(0.8 * u), justifyContent: center, fontSize: px(sv * u), fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", color: numCol, whiteSpace: "nowrap" }}>
            {s.key === "rating" ? <Star s={sv * 0.78 * u} col={P.star} /> : null}
            {s.value}
          </div>
          <div style={{ marginTop: px(0.8 * u), fontSize: px(sl * u), fontWeight: 600, lineHeight: 1.25, color: sub }}>{s.label}</div>
        </div>
      ))}
    </div>
  ) : null;

  const qs = sq ? 11 : story ? 15 : 12.5;
  const linkBase = (sq ? 3 : 3.3) * u;
  const linkSize = showLink
    ? fitLinkSize(linkBase, measureText(cardLink(pro.handle!), cardFont(800, linkBase)), W - 2 * pad - (stk ? 0 : qs * u + 2 * 1.1 * u + 3 * u))
    : linkBase;
  const foot = showLink ? (
    <div style={{ display: "flex", alignItems: "center", gap: px(3 * u), marginTop: px((sq ? 4 : 6) * u), justifyContent: center }}>
      {!stk && (
        <span style={{ flex: "none", background: "#FFFFFF", borderRadius: px(1.8 * u), padding: px(1.1 * u), boxShadow: `0 0 0 1px ${line}` }}>
          <ShareQr value={cardQrValue(pro.handle!)} size={qs * u} />
        </span>
      )}
      <div style={{ minWidth: 0, textShadow: shadow }}>
        <div style={{ fontSize: px(linkSize), fontWeight: 800, color: ink, whiteSpace: "nowrap" }}>{cardLink(pro.handle!)}</div>
        {!stk && <div style={{ fontSize: px((sq ? 2.6 : 2.9) * u), fontWeight: 600, color: sub }}>Scan to see my profile</div>}
      </div>
    </div>
  ) : null;

  return (
    <div
      className={className}
      role="img"
      aria-label={`${c.eyebrow} card`}
      style={{
        position: "relative",
        flex: "none",
        width: W,
        height: H,
        overflow: "hidden",
        borderRadius: px(Math.max(10, 4 * u)),
        background: bg,
        fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
        boxShadow: flat || (stk && bare) ? undefined : "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(36,31,27,0.10)",
        textAlign: "start",
      }}
    >
      {!stk && P.lop ? (
        <span style={{ position: "absolute", right: px(-16 * u), top: story ? "26%" : sq ? "-18%" : "4%", transform: "rotate(28deg)", pointerEvents: "none" }}>
          <Leaf h={(story ? 118 : sq ? 92 : 100) * u} col={P.leaf} op={P.lop} />
        </span>
      ) : null}
      {((stk && !onChecker) || (!stk && style === "P")) && !photoUrl ? (
        <span style={{ position: "absolute", right: px(4 * u), bottom: px(2.4 * u), textAlign: "end", fontFamily: "ui-monospace, Menlo, monospace", fontSize: px(Math.max(8, 2.6 * u)), color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>
          your photo
        </span>
      ) : null}
      {stk ? (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: px(pad), textAlign: "center" }}>
          {head}
          <div style={{ marginTop: px(8 * u) }}>
            {eyebrow}
            {hero}
            {extra}
            {statRow}
            {foot}
          </div>
        </div>
      ) : (
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", padding: px(pad) }}>
          {head}
          <div style={{ flex: 1 }} />
          <div>
            {eyebrow}
            {hero}
            {extra}
          </div>
          {statRow}
          {foot}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Market + Share 3.0 · P-SH.3 ADDED "Your photo": the card's content as the
// overlay editor's transparent layer (Professional Sharing Screens.dc.html
// lines 141 to 147). Values come from drawShareCard's LAYER so this DOM layer
// and the export's layoutShareLayer() are one design; the white text and the
// 0 1px 8px rgba(0,0,0,0.42) text shadow come from the OverlayEditor's
// "client" chrome. A picture of the card, so sizes are px (not textPx): it
// looks the same with Larger text, as the exported image does.
// ---------------------------------------------------------------------------

export interface ShareLayerProps {
  spec: CardSpec;
  pro: CardPro;
  client?: string;
  qr?: boolean;
  hide?: number[];
}

type LT = { size: number; weight: number; lh?: number; ls?: number };
const lt = (s: LT, extra?: React.CSSProperties): React.CSSProperties => ({
  display: "block",
  fontSize: s.size,
  fontWeight: s.weight,
  lineHeight: s.lh ?? "normal",
  letterSpacing: s.ls ? `${s.ls}em` : undefined,
  ...extra,
});

export const ShareLayer: React.FC<ShareLayerProps> = ({ spec: c, pro, client = "A client", qr = true, hide }) => {
  // Re-measure the link once Manrope has loaded.
  const [, setFontsReady] = useState(false);
  useEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) setFontsReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  const L = LAYER;
  const stats = c.stats.filter((_, i) => !(hide && hide.includes(i))).slice(0, 3);
  const showLink = qr && !!pro.handle;
  const link = pro.handle ? cardLink(pro.handle) : "";
  const linkSize = showLink ? fitLinkSize(L.link.size, measureText(link, cardFont(L.link.weight, L.link.size)), LAYER_LINK_ROOM) : L.link.size;
  const subOp = { opacity: L.sub };

  let hero: React.ReactNode = null;
  if (c.hero === "num") {
    hero = (
      <>
        <div style={{ display: "flex", alignItems: "baseline", gap: L.big.gap, marginTop: L.big.mt }}>
          <span style={lt(L.big)}>{c.big}</span>
          {c.unit ? <span style={lt(L.unit)}>{c.unit}</span> : null}
        </div>
        <div style={lt(L.subject, { marginTop: L.subject.mt })}>{c.subject}</div>
        {c.line ? <div style={lt(L.line, { marginTop: L.line.mt, ...subOp })}>{fillClient(c.line, client)}</div> : null}
      </>
    );
  } else if (c.hero === "quote") {
    hero = (
      <>
        {c.stars ? (
          <div style={{ display: "flex", gap: L.stars.gap, marginTop: L.stars.mt }}>
            {Array.from({ length: c.stars }, (_, i) => (
              <Star key={i} s={L.stars.size} col={L.stars.color} />
            ))}
          </div>
        ) : null}
        <div style={lt(L.quote, { marginTop: c.stars ? L.quote.mt : L.stars.mt })}>{`"${c.quote ?? ""}"`}</div>
        {c.by ? <div style={lt(L.by, { marginTop: L.by.mt, ...subOp })}>{c.by}</div> : null}
      </>
    );
  } else if (c.hero === "title") {
    hero = (
      <>
        <div style={lt(L.title, { marginTop: L.title.mt })}>{c.title}</div>
        {c.meta ? <div style={lt(L.meta, { marginTop: L.meta.mt, ...subOp })}>{fillClient(c.meta, client)}</div> : null}
      </>
    );
  } else if (c.hero === "profile") {
    const a = L.avatar;
    hero = (
      <>
        <span
          style={{
            width: a.size,
            height: a.size,
            marginTop: a.mt,
            borderRadius: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: a.fill,
            border: `${a.border}px solid ${a.ring}`,
            fontSize: a.text,
            fontWeight: 800,
            lineHeight: "normal",
            textShadow: "none",
          }}
        >
          {profileInitials(pro.name)}
        </span>
        <div style={lt(L.pname, { marginTop: L.pname.mt })}>{pro.name}</div>
        {c.head ? <div style={lt(L.head, { marginTop: L.head.mt })}>{c.head}</div> : null}
        {c.role ? <div style={lt(L.role, { marginTop: L.role.mt, ...subOp })}>{c.role}</div> : null}
      </>
    );
  }

  return (
    <div style={{ width: L.width, fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif", WebkitFontSmoothing: "antialiased", lineHeight: "normal", textAlign: "start", color: "#FFFFFF" }}>
      <div style={{ display: "flex", alignItems: "center", gap: L.mark.gap }}>
        <CentiumMark height={L.mark.h} framing="png" label="Centium" style={{ width: L.mark.w, filter: `drop-shadow(0 ${L.mark.drop.y}px ${L.mark.drop.blur}px ${L.mark.drop.color})` }} />
        <div style={{ minWidth: 0 }}>
          <span style={lt(L.name, { whiteSpace: "nowrap" })}>{pro.name}</span>
          {pro.handle ? <span style={lt(L.handle, { whiteSpace: "nowrap", ...subOp })}>{`@${pro.handle} on Centium`}</span> : null}
        </div>
      </div>
      <div style={lt(L.eyebrow, { marginTop: L.eyebrow.mt, textTransform: "uppercase" })}>{c.eyebrow}</div>
      {hero}
      {c.extra === "leaves" ? (
        <div style={{ display: "flex", gap: L.leaves.gap, marginTop: L.leaves.mt }}>
          {Array.from({ length: 7 }, (_, i) => (
            <Leaf key={i} h={L.leaves.h} col={L.leaves.color} op={1} />
          ))}
        </div>
      ) : null}
      {c.extra === "slots" && c.slots?.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: L.slots.gap, marginTop: L.slots.mt }}>
          {c.slots.map((x) => (
            <span
              key={x}
              style={{ borderRadius: 9999, padding: `${L.slots.padY}px ${L.slots.padX}px`, fontSize: L.slots.size, fontWeight: L.slots.weight, lineHeight: "normal", background: L.slots.fill, border: `1px solid ${L.slots.border}`, whiteSpace: "nowrap" }}
            >
              {x}
            </span>
          ))}
        </div>
      ) : null}
      {stats.length ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`, gap: L.stats.gap, marginTop: L.stats.mt, paddingTop: L.stats.padTop, borderTop: `1px solid ${L.stats.rule}` }}>
          {stats.map((s) => (
            <div key={`${s.key}-${s.value}`} style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: L.stats.starGap, whiteSpace: "nowrap", fontSize: L.stats.val.size, fontWeight: L.stats.val.weight, lineHeight: L.stats.val.lh, letterSpacing: `${L.stats.val.ls}em` }}>
                {s.key === "rating" ? <Star s={L.stats.star} col={L.stars.color} /> : null}
                {s.value}
              </div>
              <div style={lt(L.stats.lab, { marginTop: L.stats.lab.mt, ...subOp })}>{s.label}</div>
            </div>
          ))}
        </div>
      ) : null}
      {showLink ? (
        <div style={{ display: "flex", alignItems: "center", gap: L.qr.gap, marginTop: L.qr.mt, maxWidth: L.width }}>
          <span style={{ flex: "none", display: "flex", background: "#FFFFFF", borderRadius: L.qr.radius, padding: L.qr.pad, boxShadow: `0 ${L.qr.drop.y}px ${L.qr.drop.blur}px ${L.qr.drop.color}` }}>
            <ShareQr value={cardQrValue(pro.handle!)} size={L.qr.size} />
          </span>
          <div style={{ minWidth: 0 }}>
            <span style={lt({ ...L.link, size: linkSize }, { whiteSpace: "nowrap" })}>{link}</span>
            <span style={lt(L.scan, subOp)}>Scan to see my profile</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

/**
 * The composed Your photo card at any width (the share options' preview):
 * the editor's 220-wide frame, the photo with its crop and the layer at its
 * transform, scaled down as a whole, so it shows what the export draws.
 */
export const ShareLayerComposite: React.FC<ShareLayerProps & { photoUrl: string; placement: LayerPlacement; width: number }> = ({ photoUrl, placement, width, ...layer }) => {
  const { frame, crop, transform: t } = placement;
  const k = width / frame.w;
  const [img, setImg] = useState<{ w: number; h: number } | null>(null);
  const r = img ? photoRect(img, frame, crop) : null;
  return (
    <div
      role="img"
      aria-label={`${layer.spec.eyebrow} card`}
      style={{ position: "relative", flex: "none", width, height: Math.round(frame.h * k), overflow: "hidden", borderRadius: 10, background: "#2A2B31", boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(36,31,27,0.10)" }}
    >
      <div style={{ position: "absolute", insetInlineStart: 0, top: 0, width: frame.w, height: frame.h, transform: `scale(${k})`, transformOrigin: "0 0" }}>
        <img
          src={photoUrl}
          alt=""
          draggable={false}
          onLoad={(e) => setImg({ w: e.currentTarget.naturalWidth || 1, h: e.currentTarget.naturalHeight || 1 })}
          style={r ? { position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, maxWidth: "none" } : { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0 }}
        />
        <div
          style={{
            position: "absolute",
            left: t.x,
            top: t.y,
            width: LAYER.width,
            transform: `translate(-50%,-50%) scale(${t.scale}) rotate(${t.rotation}deg)`,
            transformOrigin: "50% 50%",
            color: "#FFFFFF",
            textShadow: `0 ${LAYER.shadow.y}px ${LAYER.shadow.blur}px ${LAYER.shadow.color}`,
          }}
        >
          <ShareLayer {...layer} />
        </div>
      </div>
    </div>
  );
};

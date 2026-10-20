import React from "react";
import { CentiumMark } from "../icons/CentiumMark";
import { STREAK_LEAF_PATH } from "../icons/StreakLeaf";
import { ShareQr } from "./ShareQr";
import {
  PALETTE,
  PHOTO_SCRIM,
  PHOTO_STRIPES,
  STICKER_CHECKER,
  cardHeight,
  cardLink,
  cardQrValue,
  fillClient,
  type CardPro,
  type CardSpec,
  type ShareFormat,
  type ShareStyle,
} from "./shareCardModel";

/**
 * Release 3 · W8 SH1 to SH3: one share card, a literal port of
 * source/gen/r31.js card31. Every size is a share of the card width
 * (u = W / 100), so the same card draws at 40 (CU30's thumbnail), 190 (SH5)
 * or 1080 (the export reference). Manrope throughout; the Centium mark, the
 * pro's name and "@handle on Centium" at the top; eyebrow 800 in capitals;
 * the hero (number, quote, title or profile); the stat row over a 1px rule;
 * the QR (white tile) with "centium.app/p/{handle}" and "Scan to see my
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

export const ShareCard: React.FC<ShareCardProps> = ({ spec: c, pro, format, style, width: W, client = "A client", qr = true, hide, photoUrl, onChecker, flat, className }) => {
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
  const bg = stk ? (onChecker ? STICKER_CHECKER : photoBg) : style === "P" ? photoBg : P.bg;
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
  const foot = showLink ? (
    <div style={{ display: "flex", alignItems: "center", gap: px(3 * u), marginTop: px((sq ? 4 : 6) * u), justifyContent: center }}>
      {!stk && (
        <span style={{ flex: "none", background: "#FFFFFF", borderRadius: px(1.8 * u), padding: px(1.1 * u), boxShadow: `0 0 0 1px ${line}` }}>
          <ShareQr value={cardQrValue(pro.handle!)} size={qs * u} />
        </span>
      )}
      <div style={{ minWidth: 0, textShadow: shadow }}>
        <div style={{ fontSize: px((sq ? 3 : 3.3) * u), fontWeight: 800, color: ink, whiteSpace: "nowrap" }}>{cardLink(pro.handle!)}</div>
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
        boxShadow: flat ? undefined : "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(36,31,27,0.10)",
        textAlign: "left",
      }}
    >
      {!stk && P.lop ? (
        <span style={{ position: "absolute", right: px(-16 * u), top: story ? "26%" : sq ? "-18%" : "4%", transform: "rotate(28deg)", pointerEvents: "none" }}>
          <Leaf h={(story ? 118 : sq ? 92 : 100) * u} col={P.leaf} op={P.lop} />
        </span>
      ) : null}
      {((stk && !onChecker) || (!stk && style === "P")) && !photoUrl ? (
        <span style={{ position: "absolute", right: px(4 * u), bottom: px(2.4 * u), textAlign: "right", fontFamily: "ui-monospace, Menlo, monospace", fontSize: px(Math.max(8, 2.6 * u)), color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>
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

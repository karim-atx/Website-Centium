import React from "react";
import { MARK_C_PATH, MARK_LEAF_PATH } from "../../icons/CentiumMark";
import { STREAK_LEAF_PATH } from "../../icons/StreakLeaf";
import {
  CARD_W,
  arcDash,
  barHeights,
  cardColours,
  cardMetrics,
  previewRadius,
  type ClientBackground,
  type ClientCardSpec,
  type ClientFormat,
  type ClientStat,
} from "./clientCardModel";

// Market + Share 3.0 · C-SH.3 / C-SH.4: one client card, the screen file's
// card markup (Client Sharing lines 103 to 150) for the client subset, at the
// board's 300-wide size and scaled by width / 300 exactly as the board does
// (transform: scale(k), origin 0 0). The card's colours are its own, never
// the app theme's (it looks the same in dark mode, as it will in Instagram),
// and its type is fixed px (an image does not follow Larger text).
//
// Every painted element carries data-p ("t" text, "box", "clip", "rule",
// "svg") so drawClientCard() can paint the export from this same layout at
// 1080 wide: one layout, so the PNG is the preview.

export const CardMarkSvg: React.FC<{ w: number; h: number; style?: React.CSSProperties; shadow?: string }> = ({ w, h, style, shadow }) => (
  <svg data-p="svg" data-shadow={shadow} width={w} height={h} viewBox="279.1 180.1 652 706" preserveAspectRatio="xMidYMid meet" aria-hidden style={{ display: "block", flex: "none", ...style }}>
    <path d={MARK_C_PATH} fill="#8F68F6" />
    <path d={MARK_LEAF_PATH} fill="#8AC4BA" />
  </svg>
);

const TROPHY = "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z";

export interface ClientShareCardProps {
  spec: ClientCardSpec;
  stats: ClientStat[];
  format: ClientFormat;
  background: ClientBackground;
  /** Rendered width (the card is laid out at 300 and scaled). */
  width: number;
  /** No shadow (the export source, thumbnails). */
  flat?: boolean;
  /** No outer radius (the export source: the PNG has square corners). */
  square?: boolean;
  /** The root's ref (the export reads the layout from an unscaled card). */
  innerRef?: React.Ref<HTMLDivElement>;
  className?: string;
}

export const ClientShareCard: React.FC<ClientShareCardProps> = ({ spec, stats, format, background, width, flat, square, innerRef, className }) => {
  const k = width / CARD_W;
  const g = cardMetrics(format);
  const c = cardColours(spec.id, format, format === "sticker" ? "B" : background);
  const stk = format === "sticker";
  const ts = c.ts === "none" ? undefined : c.ts;
  const hj = stk ? "center" : "flex-start";
  const r = square ? 0 : previewRadius(width);
  const label = [spec.eyebrow, `${spec.big}${spec.unit ? ` ${spec.unit}` : ""}`, spec.subject, ...stats.map((s) => `${s.value} ${s.label}`)].filter(Boolean).join(", ");

  const vis = spec.vis;
  let visual: React.ReactNode = null;
  if (vis?.kind === "bars") {
    const hs = barHeights(vis.values);
    visual = (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 44 }}>
        {hs.map((h, i) => (
          <span key={i} data-p="box" style={{ width: 20, height: h, borderRadius: "4px 4px 2px 2px", background: i === hs.length - 1 ? c.vis : c.barIdle }} />
        ))}
      </div>
    );
  } else if (vis?.kind === "arc") {
    visual = (
      <svg data-p="svg" width="132" height="72" viewBox="0 0 132 72" style={{ display: "block" }} aria-hidden>
        <path d="M10 66 A56 56 0 0 1 122 66" fill="none" stroke={c.track} strokeWidth="9" strokeLinecap="round" />
        <path d="M10 66 A56 56 0 0 1 122 66" fill="none" stroke={c.vis} strokeWidth="9" strokeLinecap="round" pathLength={100} strokeDasharray={arcDash(vis.pct)} />
      </svg>
    );
  } else if (vis?.kind === "badge") {
    // badge("#9A7414", "#FDF3D6"): the gold medal on every background.
    visual = (
      <span data-p="box" style={{ width: 64, height: 64, borderRadius: 999, background: "#FDF3D6", border: "3px solid #9A7414", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg data-p="svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#9A7414" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={TROPHY} />
        </svg>
      </span>
    );
  } else if (vis?.kind === "macro") {
    visual = (
      <div style={{ width: 258 }}>
        <div data-p="clip" style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", gap: 2 }}>
          {vis.parts.map((m) => (
            <span key={m.name} data-p="box" style={{ width: `${m.pct}%`, background: m.color }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 8.7, fontWeight: 700, color: c.sub }}>
          {vis.parts.map((m) => (
            <span key={m.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span data-p="box" style={{ width: 6, height: 6, borderRadius: 2, background: m.color, flex: "none" }} />
              <span data-p="t">{m.name}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      role="img"
      aria-label={label}
      style={{ position: "relative", flex: "none", width, height: g.h * k, borderRadius: r, boxShadow: flat || stk ? "none" : "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(36,31,27,0.10)" }}
    >
      <div
        ref={innerRef}
        data-card-root=""
        data-bg={stk ? "none" : background}
        data-id={spec.id}
        data-ts={stk ? "sticker" : "none"}
        style={{
          position: "absolute",
          insetInlineStart: 0,
          top: 0,
          width: CARD_W,
          height: g.h,
          transform: k === 1 ? undefined : `scale(${k})`,
          transformOrigin: "0 0",
          overflow: "hidden",
          borderRadius: square ? 0 : 12,
          background: c.bg,
          fontFamily: "Manrope, Helvetica, Arial, sans-serif",
          WebkitFontSmoothing: "antialiased",
          textAlign: stk ? "center" : "left",
          lineHeight: "normal",
          letterSpacing: "normal",
          color: c.ink,
        }}
      >
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: stk ? "center" : "flex-start", padding: g.pad, boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: hj }}>
            <CardMarkSvg w={g.markW} h={g.markH} />
            <div style={{ minWidth: 0, textShadow: ts, textAlign: "start" }}>
              <div data-p="t" style={{ fontSize: g.nameFs, fontWeight: 800, lineHeight: 1.15, color: c.ink, whiteSpace: "nowrap" }}>
                Centium
              </div>
              <div data-p="t" style={{ fontSize: g.handleFs, fontWeight: 600, lineHeight: 1.25, color: c.sub, whiteSpace: "nowrap" }}>
                {spec.date}
              </div>
            </div>
          </div>
          <div style={{ flex: stk ? "0" : "1", minHeight: stk ? 24 : 0 }} />
          <div>
            <div data-p="t" style={{ fontSize: g.ebFs, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: c.acc, marginBottom: 6, textShadow: ts }}>
              {spec.eyebrow}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4.8, justifyContent: hj, textShadow: ts }}>
              <span data-p="t" style={{ fontSize: g.bigFs, fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.05em", color: c.num, whiteSpace: "nowrap" }}>
                {spec.big}
              </span>
              {spec.unit ? (
                <span data-p="t" style={{ fontSize: g.unitFs, fontWeight: 800, letterSpacing: "-0.02em", color: c.num, whiteSpace: "nowrap" }}>
                  {spec.unit}
                </span>
              ) : null}
            </div>
            {spec.subject ? (
              <div data-p="t" style={{ marginTop: 7.2, fontSize: g.subjFs, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: c.ink, textShadow: ts }}>
                {spec.subject}
              </div>
            ) : null}
            {spec.line ? (
              <div data-p="t" style={{ marginTop: 3.6, fontSize: g.lineFs, fontWeight: 600, lineHeight: 1.35, color: c.sub, textShadow: ts }}>
                {spec.line}
              </div>
            ) : null}
            {spec.leaves && (
              <div style={{ display: "flex", gap: 6.6, marginTop: 12, justifyContent: hj }}>
                {Array.from({ length: 7 }, (_, i) => (
                  <svg key={i} data-p="svg" width={(16.2 * 510) / 915} height={16.2} viewBox="0 0 510 915" style={{ display: "block", flex: "none" }} aria-hidden>
                    <path d={STREAK_LEAF_PATH} fill={c.leaf} />
                  </svg>
                ))}
              </div>
            )}
            {visual && <div style={{ marginTop: 12, display: "flex", justifyContent: hj }}>{visual}</div>}
          </div>
          {stats.length > 0 && (
            <div
              data-p="rule"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${stats.length}, minmax(0,1fr))`,
                gap: 9,
                marginTop: g.statMt,
                paddingTop: g.statPt,
                borderTop: `1px solid ${c.line}`,
                textAlign: stk ? "center" : "left",
                textShadow: ts,
              }}
            >
              {stats.map((s) => (
                <div key={s.key} style={{ minWidth: 0 }}>
                  <div data-p="t" style={{ fontSize: g.svFs, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", color: c.num, whiteSpace: "nowrap" }}>
                    {s.value}
                  </div>
                  <div data-p="t" style={{ marginTop: 2.4, fontSize: g.slFs, fontWeight: 600, lineHeight: 1.25, color: c.sub }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * C-SH.5: the transparent stats layer over "Your photo" (Client Sharing lines
 * 259 to 266), 100 wide at scale 1: the mark, "Centium" and the date, the
 * eyebrow, the number, the subject and the switched-on stats over a rule.
 * White type; the OverlayEditor wrapper adds its 0 1px 8px shadow.
 */
export const PhotoStatsLayer: React.FC<{ spec: ClientCardSpec; stats: ClientStat[]; innerRef?: React.Ref<HTMLDivElement> }> = ({ spec, stats, innerRef }) => (
  <div ref={innerRef} data-layer-root="" style={{ width: 100, fontFamily: "Manrope, Helvetica, Arial, sans-serif", lineHeight: "normal", letterSpacing: "normal", textAlign: "start", color: "#FFFFFF", WebkitFontSmoothing: "antialiased" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <CardMarkSvg w={12.5} h={13.5} style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.35))" }} shadow="0,1,3,rgba(0,0,0,0.35)" />
      <span>
        <span data-p="t" style={{ display: "block", fontSize: 7.5, fontWeight: 800, lineHeight: 1.1 }}>
          Centium
        </span>
        <span data-p="t" style={{ display: "block", fontSize: 6, fontWeight: 600, opacity: 0.94 }}>
          {spec.date}
        </span>
      </span>
    </div>
    <div data-p="t" style={{ marginTop: 7, fontSize: 6, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
      {spec.eyebrow}
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginTop: 2 }}>
      <span data-p="t" style={{ fontSize: 25, fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.05em", whiteSpace: "nowrap" }}>
        {spec.big}
      </span>
      {spec.unit ? (
        <span data-p="t" style={{ fontSize: 7.5, fontWeight: 800, whiteSpace: "nowrap" }}>
          {spec.unit}
        </span>
      ) : null}
    </div>
    {spec.subject ? (
      <div data-p="t" style={{ fontSize: 9, fontWeight: 700, marginTop: 3 }}>
        {spec.subject}
      </div>
    ) : null}
    {stats.length > 0 && (
      <div data-p="rule" style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, minmax(0,1fr))`, gap: 5, marginTop: 6, paddingTop: 5, borderTop: "1px solid rgba(255,255,255,0.45)" }}>
        {stats.map((s) => (
          <div key={s.key} style={{ minWidth: 0 }}>
            <div data-p="t" style={{ fontSize: 9, fontWeight: 800, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
              {s.value}
            </div>
            <div data-p="t" style={{ fontSize: 5.5, fontWeight: 600, opacity: 0.94 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

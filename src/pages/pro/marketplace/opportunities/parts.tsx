import React from "react";
import { OutlineButton, lh, px, useMarketColors } from "../../../business-market/listingParts";
import { useIsDark } from "../../../../hooks/useIsDark";
import { NO_ICON_SCALE } from "../../../../components/pro/proInk";

// Market + Share 3.0 · W4 · small parts shared by the P-MA.5 Opportunities
// pages (Professional Marketplace Screens lines 340–480, 536–620).

const GLYPHS = {
  // lucide search (opEmpty, line 402)
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  // lucide send (apEmpty, line 437)
  send: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </>
  ),
  // lucide calendar (wkEmpty, line 473)
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </>
  ),
  // lucide briefcase (the W3 quiet state while DB8 is pending)
  briefcase: (
    <>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </>
  ),
} as const;

/**
 * The P-MA.5 empty states (opEmpty / apEmpty / wkEmpty): a centred column
 * (gap 10, padding `top` 24 0: 44 on Openings, 56 on My applications and My
 * work); the 56 tile radius 18 #EEEAF8 with the 24 glyph (stroke 1.75)
 * #7D67D9 (dark --pale / --accent); title 16 / 800; body 13 / 1.55 --faint,
 * max 290; the outlined CTA (margin-top 6).
 */
export function OpEmpty({ icon, title, body, cta, onCta, top = 44, children }: { icon: keyof typeof GLYPHS; title: string; body: string; cta?: string; onCta?: () => void; top?: number; children?: React.ReactNode }) {
  const dark = useIsDark();
  const m = useMarketColors();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: `${top}px 24px 0`, color: m.ink, lineHeight: "normal" }}>
      <span aria-hidden style={{ width: 56, height: 56, borderRadius: 18, background: dark ? m.pale : "#EEEAF8", display: "flex", alignItems: "center", justifyContent: "center", color: dark ? m.accent : "#7D67D9" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={NO_ICON_SCALE}>
          {GLYPHS[icon]}
        </svg>
      </span>
      <h2 style={{ fontSize: px(16), fontWeight: 800, margin: 0 }}>{title}</h2>
      <p style={{ fontSize: px(13), lineHeight: 1.55, color: m.faint, maxWidth: 290, margin: 0 }}>{body}</p>
      {cta && onCta ? (
        <OutlineButton onClick={onCta} style={{ marginTop: 6 }}>
          {cta}
        </OutlineButton>
      ) : null}
      {children}
    </div>
  );
}

/** The 44 initials tile (line 365): radius 12, --pale, 12.5 / 800 --accent. */
export function InitialsTile({ text }: { text: string }) {
  const m = useMarketColors();
  return (
    <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: px(12.5), fontWeight: 800, color: m.accent, flexShrink: 0 }}>
      {text}
    </span>
  );
}

/** The dialog's key / value rows (`dlg.rows`, line 606): margin-top 14, radius 14, --sgrey, padding 4 14; rows 9 0, 0.5px --div between, 12.5; key --slabel, value 700. */
export function DialogRows({ rows }: { rows: [string, string][] }) {
  const m = useMarketColors();
  return (
    <dl style={{ margin: "14px 0 0", borderRadius: 14, background: m.sgrey, padding: "4px 14px", textAlign: "start" }}>
      {rows.map(([k, v], i) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: i ? `0.5px solid ${m.div}` : 0, fontSize: px(12.5), lineHeight: "normal" }}>
          <dt style={{ color: m.slabel }}>{k}</dt>
          <dd style={{ margin: 0, fontWeight: 700, textAlign: "end", color: m.ink }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The pale note (wkList line 449): radius 16, --pale, padding 12 14, 12.5 / 18 700 --pdark. */
export function PaleNote({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const m = useMarketColors();
  return <div style={{ borderRadius: 16, background: m.pale, padding: "12px 14px", fontSize: px(12.5), lineHeight: lh(18), fontWeight: 700, color: m.pdark, ...style }}>{children}</div>;
}

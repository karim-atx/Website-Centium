import React from "react";
import { useIsDark } from "../../../hooks/useIsDark";
import { marketPalette } from "../../../theme/marketTokens";
import { OutlineButton, px } from "../../business-market/listingParts";

// Market + Share 3.0 · W3 · P-MA parts shared by the Showcase and
// Opportunities tabs (Professional Marketplace Screens).

const ICONS = {
  // The drawn empty tile's glyph (line 220): a ticket with a dashed tear.
  ticket: (
    <>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </>
  ),
  // lucide briefcase, for the Opportunities quiet state.
  briefcase: (
    <>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </>
  ),
} as const;

/**
 * The P-MA empty state (lines 218–225, `empty`): a centred column (gap 10,
 * padding 44 24 0); a 56 tile radius 18 #EEEAF8 with the 24 glyph (stroke
 * 1.75) in #7D67D9 (dark: --pale / --accent); title 16 / 800; body 13 / 1.55
 * --faint, max 290; the outlined CTA (margin-top 6).
 */
export function MarketplaceEmpty({ icon = "ticket", title, body, cta, onCta, ctaDisabled, style }: { icon?: keyof typeof ICONS; title: string; body: string; cta?: string; onCta?: () => void; ctaDisabled?: boolean; style?: React.CSSProperties }) {
  const dark = useIsDark();
  const m = marketPalette(dark);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "44px 24px 0", color: m.ink, lineHeight: "normal", ...style }}>
      <span aria-hidden style={{ width: 56, height: 56, borderRadius: 18, background: dark ? m.pale : "#EEEAF8", display: "flex", alignItems: "center", justifyContent: "center", color: dark ? m.accent : "#7D67D9" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "none" }}>
          {ICONS[icon]}
        </svg>
      </span>
      <h2 style={{ fontSize: px(16), fontWeight: 800, margin: 0 }}>{title}</h2>
      <p style={{ fontSize: px(13), lineHeight: 1.55, color: m.faint, maxWidth: 290, margin: 0 }}>{body}</p>
      {cta && onCta ? (
        <OutlineButton onClick={onCta} disabled={ctaDisabled} style={{ marginTop: 6 }}>
          {cta}
        </OutlineButton>
      ) : null}
    </div>
  );
}

/** The five 13 px stars (line 196): filled --gold up to `filled`, the rest outlined in --gold. */
export function Stars({ filled }: { filled: number }) {
  const m = marketPalette(useIsDark());
  return (
    <span aria-hidden style={{ display: "flex", gap: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i < filled ? m.gold : "none"} stroke={m.gold} strokeWidth="1.5" strokeLinejoin="round" style={{ transform: "none" }}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

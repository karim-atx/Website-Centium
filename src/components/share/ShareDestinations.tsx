import React from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../pro/proInk";
import { DESTINATION_GLYPH, type DestinationKey } from "./destinationGlyphs";

// Market + Share 3.0 · the Destinations grid (C-SH.2 s6Dest, B-SH.3 sDest;
// Client Sharing lines 391 to 397, Business Sharing 205 to 237): three
// columns, gap 8; tiles min 76 tall, r14, 1px border (rgba(36,31,27,0.11);
// the first, Instagram Story, #AEA1DC on rgba(174,161,220,0.12)), padding
// 8 6, gap 6, a 20 / 2 glyph in #7D6BB5, label 12 / 700 / 1.25 centred.
// Under it the note: r14 #F5F5F6, padding 12, gap 10, info 15 / 2 #5B5349,
// 12 / 1.5 #5B5349.

export interface Destination {
  key: DestinationKey;
  label: string;
  onPress: () => void;
  busy?: boolean;
  /** A glyph path other than DESTINATION_GLYPH[key] (Business Sharing draws More as three dots). */
  glyph?: string;
}

export const ShareDestinations: React.FC<{ items: Destination[]; note: string; disabled?: boolean }> = ({ items, note, disabled }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        {items.map((d, i) => (
          <button
            key={d.key}
            type="button"
            onClick={d.onPress}
            disabled={disabled}
            aria-busy={d.busy || undefined}
            className="tap flex flex-col items-center justify-center disabled:opacity-40 transition-transform duration-[140ms] ease-out active:scale-[0.97]"
            style={{
              minHeight: 76,
              borderRadius: 14,
              border: `1px solid ${i === 0 ? m.fill : m.border}`,
              background: i === 0 ? "rgba(174,161,220,0.12)" : m.card,
              gap: 6,
              padding: "8px 6px",
              fontSize: textPx(12),
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1.25,
              color: m.ink,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={m.pdark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
              <path d={d.glyph ?? DESTINATION_GLYPH[d.key]} />
            </svg>
            {d.label}
          </button>
        ))}
      </div>
      <div className="flex" style={{ marginTop: 12, gap: 10, borderRadius: 14, background: m.soft, padding: 12 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={m.ink2} strokeWidth="2" strokeLinecap="round" aria-hidden style={{ flex: "none", marginTop: 1, ...NO_ICON_SCALE }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <span style={{ fontSize: textPx(12), lineHeight: 1.5, color: m.ink2 }}>{note}</span>
      </div>
    </>
  );
};

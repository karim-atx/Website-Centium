import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx, linePx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../pro/proInk";
import { brandHint, useBizShareSheet, type BizShareGetData } from "./useBizShareSheet";

// Market + Share 3.0 · B-SH.1 the share entry: the board's share button (a 44
// target around a 34 circle #F0EDF9 with the 15 share glyph in #7D6BB5, stroke
// 2), in a header or on a row. Disabled (enEmpty): opacity 0.4, a #F5F5F6
// circle and a #8C8378 glyph; pressing it shows the dark tip (228 wide, r12,
// #241F1B, 12 / 17 600 white, padding 10 12, an arrow 22 from its right
// edge) that says why. It opens the share sheet (B-SH.3), and the sheet's
// result shows as the B-SH.5 strip ("Card shared", "Saved to Photos",
// "Sticker copied. Paste it onto your photo.") with Done.
//
// The sheet and the strip are useBizShareSheet's (W4), which a menu row uses
// too; the button adds its disabled look and the tip.
//
// The board's 2px #AEA1DC ring marks the entry each frame is about (an
// annotation, on one row of several); it isn't shipped.

const SHARE_GLYPH = (
  <>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
  </>
);

export { LOAD_FAILED_HINT, NOT_LISTED_HINT, NO_LINK_HINT, PAUSED_HINT } from "./useBizShareSheet";

export interface BizShareButtonProps {
  /** The card's data, built when pressed (it may read a field the host doesn't have, e.g. a class's created_at). */
  getData: BizShareGetData;
  /** Nothing to share yet (the host's rule): the button is disabled and the tip says this. */
  emptyHint?: string | null;
  /** The accessible name ("Share", "Share Monthly"). */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const BizShareButton: React.FC<BizShareButtonProps> = ({ getData, emptyHint, label = "Share", className, style }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const share = useBizShareSheet();
  const { brand, busy } = share;
  const [tip, setTip] = useState<{ text: string; top: number; right: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);

  const hint = emptyHint ?? brandHint(brand);
  const disabled = !!hint || brand.status !== "ready" || busy;

  useEffect(() => {
    if (!tip) return;
    const id = window.setTimeout(() => setTip(null), 3500);
    return () => window.clearTimeout(id);
  }, [tip]);
  const press = async () => {
    if (hint) {
      const r = btn.current?.getBoundingClientRect();
      if (r) setTip({ text: hint, top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right - 6) });
      return;
    }
    if (brand.status !== "ready" || busy) return;
    await share.open(getData);
  };

  const off = !!hint || brand.status !== "ready";
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-disabled={disabled || undefined}
        aria-busy={busy || brand.status === "loading" || undefined}
        aria-describedby={tip ? "biz-share-tip" : undefined}
        onClick={() => void press()}
        className={`tap shrink-0 flex items-center justify-center ${className ?? ""}`}
        style={{ width: 44, height: 44, opacity: off ? 0.4 : 1, ...style }}
      >
        <span className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 999, background: off ? m.soft : m.pale }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={off ? m.faint : m.pdark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={NO_ICON_SCALE}>
            {SHARE_GLYPH}
          </svg>
        </span>
      </button>

      {tip &&
        createPortal(
          <div
            id="biz-share-tip"
            role="tooltip"
            onClick={() => setTip(null)}
            style={{ position: "fixed", zIndex: 95, top: tip.top, right: tip.right, width: 228, maxWidth: "calc(100vw - 32px)", borderRadius: 12, background: "#241F1B", color: "#FFFFFF", padding: "10px 12px", fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
          >
            {tip.text}
            <span aria-hidden style={{ position: "absolute", top: -6, insetInlineEnd: 22, width: 12, height: 12, background: "#241F1B", transform: "rotate(45deg)" }} />
          </div>,
          document.body,
        )}

      {share.node}
    </>
  );
};

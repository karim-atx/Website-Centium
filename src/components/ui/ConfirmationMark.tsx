import React, { useMemo } from "react";
import { CONFIRMATION_V6 } from "../../utils/assetUrls";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// The approved Centium confirmation animation v6 (Part B animations/
// confirmation-v6): a 480 × 480 GIF, 46 frames at 40 ms, played once (1.8 s
// motion + 2.5 s hold). Shown cropped to the mark: GIF x 165 to 314, y 110 to
// 271, centred, scaled so the crop is `size` tall (HE1.9.2.1a 96, MO1.2.1.5.2
// 124). Under Reduce motion the final frame (static PNG). Each mount loads a
// fresh copy so it plays from the first frame.
//
// The GIF has an opaque white ground (O8: it is for Centium light). In dark
// mode the crop sits in a white disc rather than a square (derived, recorded
// in HE1.9.2.1a O4) until the SVG rebuild (V6-99).

const CROP = { x0: 165, x1: 314, y0: 110, y1: 271 };
export const CONFIRMATION_MS = 1800 + 2500;

export const ConfirmationMark: React.FC<{ size?: number; dark?: boolean; className?: string }> = ({ size = 96, dark, className }) => {
  const reduced = useReducedMotion();
  const src = useMemo(() => (reduced ? CONFIRMATION_V6.final : `${CONFIRMATION_V6.gif}?play=${Date.now()}`), [reduced]);
  const scale = size / (CROP.y1 - CROP.y0);
  const canvas = 480 * scale;
  const cx = ((CROP.x0 + CROP.x1) / 2) * scale;
  const cy = ((CROP.y0 + CROP.y1) / 2) * scale;
  return (
    <span
      aria-hidden
      className={`relative block overflow-hidden shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size, borderRadius: dark ? "50%" : 0, background: dark ? "#FFFFFF" : undefined }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ position: "absolute", width: canvas, height: canvas, maxWidth: "none", left: size / 2 - cx, top: size / 2 - cy }}
      />
    </span>
  );
};

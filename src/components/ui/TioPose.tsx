import React from "react";
import { isRtl } from "../../i18n/core";
import { mobilePose, tioSrc, webPose } from "./tioPoseModel";
import type { TioState } from "./tioRotation";

// Handover "Tio + Centium Fixes", B: Tio on a popup. Decorative (alt "",
// aria-hidden), never takes a tap, the delivered PNG as given. It is part of
// the popup: it mounts inside the sheet's moving wrapper, so it arrives and
// leaves with the sheet's own transition and has no motion of its own
// (B §4); Reduce motion already stills that transition.

const IMG: React.CSSProperties = { position: "absolute", pointerEvents: "none", userSelect: "none", maxWidth: "none", display: "block" };

/** Mobile: above the sheet's top edge, 107 from its end (mirrored in Arabic), over the sheet and the scrim. */
export const MobileTioPose: React.FC<{ state: TioState }> = ({ state }) => {
  const p = mobilePose(state);
  if (!p) return null;
  const rtl = isRtl();
  return (
    <img
      {...tioSrc(p.asset)}
      alt=""
      aria-hidden
      draggable={false}
      data-tio-pose={state}
      style={{ ...IMG, zIndex: 5, top: p.top, width: p.width, height: p.height, ...(rtl ? { left: p.left } : { right: p.right }) }}
    />
  );
};

/**
 * Web: outside the 440 side sheet, against its page-facing edge. Rendered in
 * the sheet's wrapper, whose left edge is E (the right edge in Arabic, where
 * the sheet is on the left); LEAN before the panel (under it, over the
 * scrim), SIDEPEEK after it (over it). In Arabic the pose is mirrored with the
 * sheet, so its back (LEAN) and its hands (SIDEPEEK) still meet the sheet edge.
 */
export const WebTioPose: React.FC<{ state: TioState }> = ({ state }) => {
  const p = webPose(state);
  if (!p) return null;
  const rtl = isRtl();
  // RTL: mirrored, so the image's facing point lands on the wrapper's right
  // edge. LEAN (mirrored about its centre): its back at that edge, right = −w.
  // SIDEPEEK (mirrored about its grip point): the grip on that edge, right =
  // originX − w.
  const pos: React.CSSProperties = rtl ? { right: p.rotate ? p.rotate.originX - p.width : -p.width } : { left: p.fromEdge };
  const transforms: string[] = [];
  if (rtl) transforms.push("scaleX(-1)");
  if (p.rotate) transforms.push(`rotate(${p.rotate.deg}deg)`);
  return (
    <img
      {...tioSrc(p.asset)}
      alt=""
      aria-hidden
      draggable={false}
      data-tio-pose={state}
      style={{
        ...IMG,
        ...pos,
        ...(p.under ? null : { zIndex: 5 }),
        bottom: p.bottom,
        width: p.width,
        height: p.height,
        ...(transforms.length ? { transform: transforms.join(" ") } : null),
        ...(p.rotate ? { transformOrigin: `${p.rotate.originX}px ${p.rotate.originY}px` } : rtl ? { transformOrigin: "center" } : null),
      }}
    />
  );
};

import React from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { tioGlyphLayout, tioSrc } from "./tioPoseModel";

/**
 * Handover "Tio + Centium Fixes", A · RULE A3: Tio on the lavender icon tile of
 * an ACTION state only (the result of a user action, or an empty state that
 * pushes one next step). Never on passive empties or tile-less notices
 * (toasts, banners, pills, inline errors): those keep their icon.
 *
 * - "glyph": Tio's head (HAPPY for success or an invitation to act, SAD for a
 *   failure or a block) with the state's own glyph, unchanged, beside it. All
 *   values are fractions of the tile width W (A spec §2): the head 0.8144 W
 *   square at (-0.0258 W, 0.0916 W), overflow visible; the glyph box 0.42 W at
 *   (0.582 W, 0.372 W), just under the crest tip and clear of the outline.
 * - "offline" / "error": one image (TIO-OFFLINE / TIO-ERROR), 50.13 px
 *   centred in the 56 tile (ink 42 = 75%, README ANSWERS 2).
 *
 * The tile itself (size, radius, fill) is the caller's, unchanged: pass its
 * fill as `className` / `style` (default `bg-th-f0edf9 dark:bg-primary/15`).
 * Decorative: alt "" and aria-hidden; the state's title stays the name.
 */
export type TioHead = "happy" | "sad";

type TileProps = {
  /** The tile's fill and ink classes (the glyph takes currentColor). */
  className?: string;
  /** The tile's own style (a fill drawn inline today). */
  style?: React.CSSProperties;
};

export type TioStateIconProps = TileProps &
  (
    | { variant: "glyph"; head: TioHead; icon: LucideIcon; strokeWidth: number; tile: 44 | 56 | 72; radius: number }
    | { variant: "offline" | "error"; tile: 56; radius: 16 }
  );

const DEFAULT_TILE = "bg-th-f0edf9 dark:bg-primary/15 text-th-7d67d9 dark:text-primary-accent";

// The glyph is part of a fixed drawing, so Larger text's icon boost
// (.larger-icons svg { scale 1.15 }) would push it into Tio's outline.
const NO_SCALE: React.CSSProperties = { transform: "none" };

export const TioStateIcon: React.FC<TioStateIconProps> = (props) => {
  const { tile, radius, className, style } = props;
  const tileStyle: React.CSSProperties = { position: "relative", overflow: "visible", width: tile, height: tile, borderRadius: radius, ...style };
  const tileCls = clsx("flex items-center justify-center shrink-0", className ?? DEFAULT_TILE);

  if (props.variant !== "glyph") {
    const img = tioSrc(props.variant === "offline" ? "tio-offline" : "tio-error");
    return (
      <span aria-hidden className={tileCls} style={tileStyle} data-tio-state={props.variant}>
        <img {...img} alt="" draggable={false} className="pointer-events-none select-none" style={{ width: 50.13, height: 50.13, display: "block" }} />
      </span>
    );
  }

  const { head, icon: Icon, strokeWidth } = props;
  const l = tioGlyphLayout(tile);
  return (
    <span aria-hidden className={tileCls} style={tileStyle} data-tio-state={head}>
      <img
        {...tioSrc(head === "happy" ? "tio-head-happy" : "tio-head-sad")}
        alt=""
        draggable={false}
        className="pointer-events-none select-none"
        style={{ position: "absolute", left: l.head.left, top: l.head.top, width: l.head.size, height: l.head.size, maxWidth: "none" }}
      />
      <Icon
        aria-hidden
        size={l.glyph.size}
        strokeWidth={strokeWidth}
        style={{ position: "absolute", left: l.glyph.left, top: l.glyph.top, ...NO_SCALE }}
      />
    </span>
  );
};

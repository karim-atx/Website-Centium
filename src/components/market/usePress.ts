import { useCallback, useState } from "react";
import type React from "react";
import { MARKET_MOTION } from "../../theme/marketTokens";
import { useReducedMotion } from "../../hooks/useReducedMotion";

// Market + Share 3.0 · the handover's pressed state (HANDOVER §4 Shared chrome:
// "pressed = scale 0.97, 140ms ease, on tiles and primary CTAs"), ported from
// Business Marketplace Screens' `rv` (down → pressed, up → released, leave →
// released). Keyboard presses (Space / Enter) show it too. Reduce motion
// keeps the state change but drops the scale and the transition.

export interface PressBinding {
  pressed: boolean;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    onPointerCancel: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onKeyUp: () => void;
    onBlur: () => void;
  };
  /** transform + transition for the pressed element. */
  style: React.CSSProperties;
}

export function usePress(): PressBinding {
  const reduce = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const down = useCallback((e: React.PointerEvent) => {
    if (e.button === 0) setPressed(true);
  }, []);
  const up = useCallback(() => setPressed(false), []);
  const key = useCallback((e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") setPressed(true);
  }, []);
  return {
    pressed,
    handlers: { onPointerDown: down, onPointerUp: up, onPointerLeave: up, onPointerCancel: up, onKeyDown: key, onKeyUp: up, onBlur: up },
    style: reduce
      ? {}
      : { transform: pressed ? `scale(${MARKET_MOTION.pressedScale})` : "none", transition: `transform ${MARKET_MOTION.pressedMs}ms ease` },
  };
}

/** The board's focus ring (style-focus): 2px solid #AEA1DC, offset 2. */
export const FOCUS_CSS = ".market-focus:focus-visible{outline:2px solid #AEA1DC;outline-offset:2px}";

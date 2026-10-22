import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmationStrip, type StripTone } from "../../../components/market/ConfirmationStrip";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { useReducedMotion } from "../../../hooks/useReducedMotion";

// Market + Share 3.0 · W3 · P-MA.2 strips with their own action ("Service deleted · Undo").

export interface StripOptions {
  tone?: StripTone;
  /** The stub's word; "Done" by default. */
  action?: string;
  /** What the stub does besides closing the strip ("Undo"). */
  onAction?: () => void;
  /** Called once when the strip goes, by time or by its action. */
  onGone?: () => void;
}

/**
 * A ConfirmationStrip over the header (W1 Q4), as listingParts' useStrip, with
 * the stub's own action ("Service deleted · Undo", line 711). It closes after
 * 5 s (long enough to reach Undo; Q5's 2.6 s is for strips without one).
 */
export function useActionStrip(ms = 5000): [React.ReactNode, (text: string, o?: StripOptions) => void, () => void] {
  const reduced = useReducedMotion();
  const [s, setS] = useState<({ text: string; n: number } & StripOptions) | null>(null);
  const seq = useRef(0);
  const current = useRef<StripOptions | null>(null);
  const gone = useCallback(() => {
    const c = current.current;
    current.current = null;
    c?.onGone?.();
  }, []);
  const show = useCallback(
    (text: string, o: StripOptions = {}) => {
      gone();
      seq.current += 1;
      current.current = o;
      setS({ text, n: seq.current, ...o });
    },
    [gone]
  );
  const close = useCallback(() => {
    gone();
    setS(null);
  }, [gone]);
  useEffect(() => {
    if (!s) return;
    const id = window.setTimeout(close, ms);
    return () => window.clearTimeout(id);
  }, [s, ms, close]);
  useEffect(() => () => gone(), [gone]);
  const node = s
    ? createPortal(
        <div className="fixed left-0 right-0 flex justify-center" style={{ zIndex: 95, top: "calc(env(safe-area-inset-top) + 12px)", padding: "0 16px", pointerEvents: "none" }}>
          <style>{FOCUS_CSS}</style>
          <div style={{ width: "100%", maxWidth: 398, pointerEvents: "auto" }} data-strip>
            <ConfirmationStrip
              key={s.n}
              text={s.text}
              tone={s.tone}
              action={s.action ?? "Done"}
              onAction={() => {
                const act = s.onAction;
                current.current = null;
                setS(null);
                act?.();
              }}
              still={reduced}
            />
          </div>
        </div>,
        document.body
      )
    : null;
  return [node, show, close];
}

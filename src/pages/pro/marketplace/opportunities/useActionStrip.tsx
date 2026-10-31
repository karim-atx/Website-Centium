import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmationStrip, type StripTone } from "../../../../components/market/ConfirmationStrip";
import { useReducedMotion } from "../../../../hooks/useReducedMotion";

/**
 * The ConfirmationStrip overlaid on the header (W1 lead decision Q4, as
 * listingParts' useStrip) with the board's own stub action ("My work") when
 * one is given, else "Done"; it closes with Done or after 5 s.
 */
export function useActionStrip(): [React.ReactNode, (text: string, opts?: { tone?: StripTone; action?: string; onAction?: () => void }) => void] {
  const reduced = useReducedMotion();
  const [s, setS] = useState<{ text: string; tone: StripTone; action?: string; onAction?: () => void; n: number } | null>(null);
  const seq = useRef(0);
  const show = useCallback((text: string, opts?: { tone?: StripTone; action?: string; onAction?: () => void }) => {
    seq.current += 1;
    setS({ text, tone: opts?.tone ?? "success", action: opts?.action, onAction: opts?.onAction, n: seq.current });
  }, []);
  useEffect(() => {
    if (!s) return;
    const id = window.setTimeout(() => setS(null), 5000);
    return () => window.clearTimeout(id);
  }, [s]);
  const node = s
    ? createPortal(
        <div className="fixed start-0 end-0 flex justify-center" style={{ zIndex: 95, top: "calc(env(safe-area-inset-top) + 12px)", padding: "0 16px", pointerEvents: "none" }}>
          <div style={{ width: "100%", maxWidth: 398, pointerEvents: "auto" }} data-strip>
            <ConfirmationStrip
              key={s.n}
              text={s.text}
              tone={s.tone}
              action={s.action ?? "Done"}
              onAction={() => {
                setS(null);
                s.onAction?.();
              }}
              still={reduced}
            />
          </div>
        </div>,
        document.body
      )
    : null;
  return [node, show];
}

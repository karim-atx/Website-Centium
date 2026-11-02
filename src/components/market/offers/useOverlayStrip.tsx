import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmationStrip, type StripTone } from "../ConfirmationStrip";
import { t } from "../../../i18n/core";

export const STRIP_MS = 2600;

/**
 * A ConfirmationStrip over the header (W1 Q4: strips overlay the header; Q5:
 * 2.6 s auto-close), with "Done". Returns the node to render and `show`.
 */
export function useOverlayStrip(): [React.ReactNode, (text: string, tone?: StripTone) => void] {
  const [s, setS] = useState<{ text: string; tone: StripTone; n: number } | null>(null);
  const seq = useRef(0);
  const show = useCallback((text: string, tone: StripTone = "success") => {
    seq.current += 1;
    setS({ text, tone, n: seq.current });
  }, []);
  useEffect(() => {
    if (!s) return;
    const t = window.setTimeout(() => setS(null), STRIP_MS);
    return () => window.clearTimeout(t);
  }, [s]);
  const node = s
    ? createPortal(
        <div style={{ position: "fixed", insetInlineStart: 0, insetInlineEnd: 0, display: "flex", justifyContent: "center", zIndex: 95, top: "calc(env(safe-area-inset-top) + 12px)", padding: "0 16px", pointerEvents: "none" }}>
          <div style={{ width: "100%", maxWidth: 398, pointerEvents: "auto" }} data-strip>
            <ConfirmationStrip key={s.n} text={s.text} tone={s.tone} action={t("Done")} onAction={() => setS(null)} />
          </div>
        </div>,
        document.body
      )
    : null;
  return [node, show];
}

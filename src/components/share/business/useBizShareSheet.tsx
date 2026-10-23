import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../../context/AppContext";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { ConfirmationStrip, type StripTone } from "../../market/ConfirmationStrip";
import { BusinessShareSheet } from "./BusinessShareSheet";
import { useBizBrand, type BrandState } from "./useBizBrand";
import type { TemplateData } from "./bizCardModel";

// Market + Share 3.0 · W4 · the business share sheet without its button, so a
// menu row (the opening's ⋮ "Share", B-SH Now hiring) opens the same sheet
// (B-SH.3) and the same result strip (B-SH.5) as BizShareButton:
//
//   const share = useBizShareSheet();
//   share.open((businessId) => TemplateData | Promise<TemplateData | null> | null);
//   return <>{share.node}</>;
//
// When the business can't share yet (hidden from Explore, no Centium link,
// the read failed), open() shows that reason in the strip instead (the
// button's tip, which a menu row has no place for). While the business still
// loads, open() does nothing.

export const NOT_LISTED_HINT = "Show your business on Explore to share it.";
export const NO_LINK_HINT = "Your business needs a Centium link before it can be shared.";
export const PAUSED_HINT = "Your listing is paused. Resume it to share your business.";
export const LOAD_FAILED_HINT = "Couldn't load your business. Try again.";

/** Why this business can't share yet, or null (ready or still loading). */
export function brandHint(brand: BrandState): string | null {
  return brand.status === "noSlug" ? NO_LINK_HINT : brand.status === "hidden" ? NOT_LISTED_HINT : brand.status === "paused" ? PAUSED_HINT : brand.status === "error" ? LOAD_FAILED_HINT : null;
}

export type BizShareGetData = (businessId: string) => TemplateData | Promise<TemplateData | null> | null;

export interface BizShareSheet {
  /** Builds the card's data and opens the sheet (or shows why it can't). */
  open: (getData: BizShareGetData) => Promise<void>;
  /** The sheet and the strip: render it once. */
  node: React.ReactNode;
  /** Building the data. */
  busy: boolean;
  /** The business's share state (the button reads it for its own disabled look and tip). */
  brand: BrandState;
  /** Shows a line in the result strip (a menu row's "can't share yet"). */
  note: (text: string) => void;
}

export function useBizShareSheet(): BizShareSheet {
  const reduced = useReducedMotion();
  const { authUserId } = useApp();
  const brand = useBizBrand();
  const [data, setData] = useState<TemplateData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [opened, setOpened] = useState(0);
  const [busy, setBusy] = useState(false);
  const [strip, setStrip] = useState<{ text: string; tone: StripTone; n: number } | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!strip) return;
    const id = window.setTimeout(() => setStrip(null), 5000);
    return () => window.clearTimeout(id);
  }, [strip]);

  const note = useCallback((text: string) => setStrip({ text, tone: "neutral", n: Date.now() }), []);

  const open = useCallback(
    async (getData: BizShareGetData) => {
      if (brand.status !== "ready") {
        const hint = brandHint(brand);
        if (hint) note(hint);
        return;
      }
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const d = await getData(brand.businessId);
        if (d) {
          setData(d);
          setOpened((n) => n + 1);
          setIsOpen(true);
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [brand, note],
  );

  const node = (
    <>
      {brand.status === "ready" && data && (
        <BusinessShareSheet key={opened} open={isOpen} onClose={() => setIsOpen(false)} brand={brand.brand} data={data} userId={authUserId} onResult={(r) => setStrip({ ...r, n: Date.now() })} />
      )}
      {strip &&
        createPortal(
          <div className="fixed left-0 right-0 flex justify-center" style={{ zIndex: 95, top: "calc(env(safe-area-inset-top) + 12px)", padding: "0 16px", pointerEvents: "none" }}>
            <div style={{ width: "100%", maxWidth: 398, pointerEvents: "auto" }}>
              <ConfirmationStrip key={strip.n} text={strip.text} tone={strip.tone} action="Done" onAction={() => setStrip(null)} still={reduced} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );

  return { open, node, busy, brand, note };
}

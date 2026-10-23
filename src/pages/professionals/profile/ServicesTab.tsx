import React from "react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { MarketError, MarketSkeleton } from "../../../components/market/MarketStates";
import { EmptyBlock, PressButton } from "./parts";
import type { ServiceRow } from "./profileModel";

// Market + Share 3.0 · W5 · C-MO.4.9 `proServices` "Services · Hire or Book"
// (Client Professional Screens lines 106–116): a column (margin-top 14,
// gap 10) of cards: radius 18, --card, 0.5px --hair, padding 12 12 12 14, a
// row (centred, gap 12): the name 14 / 700 and the meta 11.5 --faint
// (margin-top 1); the price 14 / 800 nowrap; the CTA 32 tall, padding 0 14,
// radius 10, --fill / --onfill 12 / 800: "Book" (a single session:
// appointment_services through the live booking) or "Hire" (a pack or
// programme: professional_plans through the hire sheet).
// Kept above the rows (PLAN §3.2): the client's live hire (YourHireCard) and
// the cancel / decline notes, passed in as `top`.

export const ServicesTab: React.FC<{
  rows: ServiceRow[] | null;
  error: boolean;
  onRetry: () => void;
  onBook: (id: string) => void;
  onHire: (id: string) => void;
  /** Book / Hire are inert (the professional's own preview, or their own profile). */
  inert?: boolean;
  firstName: string;
  top?: React.ReactNode;
}> = ({ rows, error, onRetry, onBook, onHire, inert, firstName, top }) => {
  const m = marketPalette(useIsDark());
  return (
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      {top}
      {rows === null ? (
        error ? (
          <MarketError thing="services" onRetry={onRetry} />
        ) : (
          <MarketSkeleton radius={18} rows={2} height={61} count={2} label="Loading services" />
        )
      ) : rows.length === 0 ? (
        <EmptyBlock title="No services listed yet" body={`${firstName || "This professional"} hasn't added a session to book or a plan to hire.`} />
      ) : (
        rows.map((r) => (
          <div key={r.key} style={{ borderRadius: 18, background: m.card, border: `0.5px solid ${m.hair}`, padding: "12px 12px 12px 14px", display: "flex", alignItems: "center", gap: 12, color: m.ink }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: textPx(14), fontWeight: 700, overflowWrap: "anywhere" }}>{r.name}</div>
              {r.meta ? <div style={{ fontSize: textPx(11.5), color: m.faint, marginTop: 1, overflowWrap: "anywhere" }}>{r.meta}</div> : null}
            </div>
            <div style={{ fontSize: textPx(14), fontWeight: 800, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{r.price}</div>
            <PressButton
              inert={inert}
              onClick={() => (r.kind === "book" ? onBook(r.id) : onHire(r.id))}
              aria-label={`${r.kind === "book" ? "Book" : "Hire"} ${r.name}`}
              className="hit"
              style={{ height: 32, padding: "0 14px", borderRadius: 10, border: 0, background: m.fill, color: m.onfill, font: "inherit", fontSize: textPx(12), fontWeight: 800, flexShrink: 0, cursor: inert ? "default" : "pointer" }}
            >
              {r.kind === "book" ? "Book" : "Hire"}
            </PressButton>
          </div>
        ))
      )}
    </div>
  );
};

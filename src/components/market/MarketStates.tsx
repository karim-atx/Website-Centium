import React from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { useOnline } from "../../hooks/useOnline";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { ConfirmationStrip } from "./ConfirmationStrip";
import { t } from "../../i18n/core";

// Market + Share 3.0 · the shared data states (D-04, HANDOVER §4 "States
// everywhere"; not drawn on the board, designed here in its chrome and to be
// listed in DESIGNS_WE_MADE):
// - loading: the repo skeleton (animate-skeleton-pulse, 1.2 s, static under
//   Reduce motion) shaped like a handover card: the card radius (20 or 24;
//   18 for list tickets), --soft blocks for the rows;
// - error: the ConfirmationStrip in its error tone with the repo wording
//   "Couldn't load {thing}. Check your connection and try again." and Retry;
// - offline: the live offline line in the strip's neutral tone: "You're
//   offline. Showing what was loaded." when something is on screen (Discover,
//   GymPage, ClassPage), "You're offline. Try again when you're connected."
//   with Retry when nothing loaded (GymPage / ClassPage / CategoryPage);
// - empty: the handover's dashed empty card (B-MA.7 / P-MA.6 "No data yet",
//   Business Marketplace Screens lines 475–480): radius 20, --card, border
//   1px --border, padding 16; title 13.5 / 800; body 12.5 / 18 --ink2
//   (margin-top 4); an optional dashed placeholder (margin-top 14, 120 tall,
//   radius 12, 1.5px dashed rgba(36,31,27,0.14), 12 --faint).

export interface MarketSkeletonProps {
  /** The card's radius: 18 (list tickets), 20 (cards, ledgers), 24 (hero cards). */
  radius?: 18 | 20 | 24;
  /** Text rows inside the card (each a pill block). */
  rows?: number;
  /** The card's height when it has a fixed one (a 96 tile, a 165 hero). */
  height?: number;
  /** How many cards (a list), stacked with the list's gap. */
  count?: number;
  gap?: number;
  /** Accessible name for the busy region (English; shown through t()). */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const MarketSkeleton: React.FC<MarketSkeletonProps> = ({ radius = 20, rows = 2, height, count = 1, gap = 10, label, className, style }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const widths = ["44%", "72%", "58%", "36%"];
  return (
    <div role="status" aria-busy="true" aria-label={label ? t(label) : t("Loading")} className={className} style={{ display: "flex", flexDirection: "column", gap, ...style }}>
      {Array.from({ length: count }, (_, k) => (
        <div
          key={k}
          aria-hidden
          className="animate-skeleton-pulse"
          style={{ borderRadius: radius, background: m.card, border: `1px solid ${m.border}`, padding: 16, minHeight: height, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 8 }}
        >
          {Array.from({ length: rows }, (_, r) => (
            <span key={r} style={{ display: "block", height: r === 0 ? 12 : 14, width: widths[r % widths.length], borderRadius: 999, background: m.soft }} />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * "Couldn't load {thing}. Check your connection and try again." + Retry, or the offline line when the browser is offline.
 * Round F (AV): one sentence with a {thing} placeholder; `thing` is the English noun phrase ("your offers"), translated
 * here through t() (its Arabic is in the catalogue, src/i18n/ar/shared.ts), or already translated by the caller.
 */
export const MarketError: React.FC<{ thing: string; onRetry: () => void; notchBg?: string; className?: string; style?: React.CSSProperties }> = ({ thing, onRetry, notchBg, className, style }) => {
  const online = useOnline();
  if (!online) return <MarketOffline loaded={false} onRetry={onRetry} notchBg={notchBg} className={className} style={style} />;
  return <ConfirmationStrip tone="error" text={t("Couldn't load {thing}. Check your connection and try again.", { thing: t(thing) })} action={t("Retry")} onAction={onRetry} notchBg={notchBg} still className={className} style={style} />;
};

/**
 * The offline line in the strip's neutral tone. `loaded`: something is on
 * screen ("Showing what was loaded."); otherwise it offers Retry. Renders
 * nothing while online unless `force`.
 */
export const MarketOffline: React.FC<{ loaded: boolean; onRetry?: () => void; force?: boolean; notchBg?: string; className?: string; style?: React.CSSProperties }> = ({ loaded, onRetry, force, notchBg, className, style }) => {
  const online = useOnline();
  if (online && !force) return null;
  return loaded ? (
    <ConfirmationStrip tone="neutral" text={t("You're offline. Showing what was loaded.")} notchBg={notchBg} still className={className} style={style} />
  ) : (
    <ConfirmationStrip tone="neutral" text={t("You're offline. Try again when you're connected.")} action={onRetry ? t("Retry") : undefined} onAction={onRetry} notchBg={notchBg} still className={className} style={style} />
  );
};

/**
 * The empty card. `placeholderContentBox` (the market Performance screens,
 * B-MA.7 / P-MA.6 "No data yet"): the dashed box is 120 tall INSIDE its 1.5px
 * border, as the boards draw it (content-box, 2 px taller); unset keeps 120
 * overall (W3 lead decision: size drifts are fixed by optional props only).
 */
export const MarketEmptyCard: React.FC<{ title: string; body?: string; placeholder?: string; placeholderContentBox?: boolean; className?: string; style?: React.CSSProperties }> = ({ title, body, placeholder, placeholderContentBox, className, style }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  return (
    <div className={className} style={{ lineHeight: "normal", borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, padding: 16, color: m.ink, ...style }}>
      <div style={{ fontSize: textPx(13.5), fontWeight: 800 }}>{t(title)}</div>
      {body ? <div style={{ fontSize: textPx(12.5), lineHeight: linePx(18), color: m.ink2, marginTop: 4 }}>{t(body)}</div> : null}
      {placeholder ? (
        <div
          style={{
            marginTop: 14,
            height: 120,
            boxSizing: placeholderContentBox ? "content-box" : undefined,
            borderRadius: 12,
            border: `1.5px dashed ${dark ? "rgba(245,243,250,0.14)" : "rgba(36,31,27,0.14)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 12px",
            fontSize: textPx(12),
            color: m.faint,
          }}
        >
          {t(placeholder)}
        </div>
      ) : null}
    </div>
  );
};

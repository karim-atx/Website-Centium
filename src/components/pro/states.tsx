import React from "react";
import { ErrorCard, FreshnessLine, SkeletonBar } from "../health/metric/MetricKit";
import { INK } from "./proInk";
import { t } from "../../i18n/core";

/**
 * Release 3 · the data-screen states every professional screen uses
 * (IMPLEMENTATION_FRONTEND general rules; FINAL_PLAN W1 "from the MetricKit
 * patterns"), reusing the client metric kit's pieces rather than redrawing
 * them:
 * - loading: skeletons in the card shapes, never a spinner over content;
 * - error: the inline Retry card (MetricKit ErrorCard);
 * - offline: the last loaded data stays, with "Offline, showing last update"
 *   (MetricKit FreshnessLine, offline glyph).
 * Empty and Coming soon are EmptyState and ComingSoon.
 */

export const OFFLINE_LAST_UPDATE = "Offline, showing last update";

/** A card-shaped skeleton: r20, card fill and border, pad 14, `lines` bars. */
export const ProCardSkeleton: React.FC<{ lines?: number; height?: number }> = ({ lines = 2, height }) => (
  <div aria-hidden style={{ borderRadius: 20, background: INK.card, border: `1px solid ${INK.bCard}`, padding: 14, minHeight: height }}>
    <div className="flex flex-col" style={{ gap: 8 }}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBar key={i} width={i === 0 ? "55%" : "80%"} height={i === 0 ? 14 : 10} neutral />
      ))}
    </div>
  </div>
);

/** A ClientRow-shaped skeleton (76 high, avatar, two lines, ring). */
export const ClientRowSkeleton: React.FC = () => (
  <div aria-hidden className="flex items-center" style={{ gap: 12, minHeight: 76, padding: 14, borderRadius: 20, background: INK.card, border: `1px solid ${INK.bCard}` }}>
    <SkeletonBar width={40} height={40} radius={20} neutral />
    <div className="flex-1 flex flex-col" style={{ gap: 6 }}>
      <SkeletonBar width="50%" height={14} neutral />
      <SkeletonBar width="75%" height={10} neutral />
    </div>
    <SkeletonBar width={56} height={56} radius={28} neutral />
  </div>
);

/** A list of skeleton rows while the first answer is out. */
export const ListSkeleton: React.FC<{ rows?: number; row?: React.FC }> = ({ rows = 4, row: Row = ClientRowSkeleton }) => (
  <div role="status" aria-label={t("Loading")} className="flex flex-col" style={{ gap: 8 }}>
    {Array.from({ length: rows }, (_, i) => (
      <Row key={i} />
    ))}
  </div>
);

/** The inline error with Retry, in place of the section it couldn't load. */
export const ProError: React.FC<{ onRetry: () => void; message?: string }> = ({ onRetry, message }) => (
  <ErrorCard onRetry={onRetry} message={message ?? t("Couldn't load this. Check your connection and try again.")} />
);

/** Offline with data already on screen: the line above it. */
export const OfflineLine: React.FC = () => <FreshnessLine offline>{t(OFFLINE_LAST_UPDATE)}</FreshnessLine>;

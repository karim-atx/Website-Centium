import { useCallback, useEffect, useState } from "react";
import { useOnline } from "../../../hooks/useOnline";
import { fetchPriceMarkers } from "../../../services/business-revenue/priceMarkers";
import type { PriceChange } from "../../../services/business-revenue/priceMarkerLogic";

export interface PriceMarkersState {
  /** Null while loading or after a failure. */
  changes: PriceChange[] | null;
  /** The read failed with nothing loaded: "offline" when the device is (or the error says so). */
  failed: null | "offline" | "error";
  reload: () => void;
}

/**
 * CQ: the plan price changes inside the chart's window (plan_price_markers).
 * Keyed by the window, so a new range never shows the last range's markers.
 * Read again when the device comes back online. A failure only blanks the
 * markers: the chart around them is the Revenue reads' business.
 */
export function usePriceMarkers(
  businessId: string | null,
  from: string | null,
  to: string | null,
): PriceMarkersState {
  const online = useOnline();
  const [tick, setTick] = useState(0);
  const [read, setRead] = useState<{
    key: string;
    changes: PriceChange[] | null;
    failed: null | "offline" | "error";
  } | null>(null);
  const key = `${businessId}|${from}|${to}|${tick}`;

  useEffect(() => {
    if (!businessId || !from || !to) return;
    let alive = true;
    void fetchPriceMarkers(businessId, from, to).then((r) => {
      if (!alive) return;
      if (r.ok) setRead({ key, changes: r.value, failed: null });
      // Markers already read for this window are kept (the page keeps what it loaded while offline).
      else
        setRead((p) =>
          p && p.key === key && p.changes
            ? p
            : { key, changes: null, failed: r.offline || !navigator.onLine ? "offline" : "error" },
        );
    });
    return () => {
      alive = false;
    };
    // `online` re-reads after a reconnect (and settles "offline" on a disconnect).
  }, [businessId, from, to, key, online]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const cur = read && read.key === key ? read : null;
  return { changes: cur?.changes ?? null, failed: cur?.failed ?? null, reload };
}

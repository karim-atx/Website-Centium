import { useCallback, useMemo } from "react";
import { useAnalytics as useShell } from "../analyticsContext";
import type { AnalyticsRange } from "../analyticsRange";

// The Analytics shell is AnalyticsShell.tsx (routed at
// /app/business/analytics/:section, context in analyticsContext.ts). This is
// the object-shaped view of that context the Classes (AN3) and Team (AN5)
// sections were written against: { range, setExport({ filename, rows } |
// null) }. One context, two call shapes; setExport stays stable.

export interface ExportRows {
  filename: string;
  rows: (string | number)[][];
}

export interface AnalyticsState {
  range: AnalyticsRange;
  setExport: (e: ExportRows | null) => void;
}

export function useAnalytics(): AnalyticsState {
  const { range, setExport: set } = useShell();
  const setExport = useCallback((e: ExportRows | null) => set(e?.filename ?? "", e ? e.rows : null), [set]);
  return useMemo(() => ({ range, setExport }), [range, setExport]);
}

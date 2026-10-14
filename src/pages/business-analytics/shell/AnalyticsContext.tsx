import { useCallback, useMemo } from "react";
import { useAnalytics as useShell } from "../analyticsContext";
import type { AnalyticsRange } from "../analyticsRange";
import type { BizKind } from "../../../components/business-more/kind";

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
  /** The lane, known before any section mounts (the shell waits for the business row). */
  kind: BizKind;
}

export function useAnalytics(): AnalyticsState {
  const { range, kind, setExport: set } = useShell();
  const setExport = useCallback((e: ExportRows | null) => set(e?.filename ?? "", e ? e.rows : null), [set]);
  return useMemo(() => ({ range, kind, setExport }), [range, kind, setExport]);
}

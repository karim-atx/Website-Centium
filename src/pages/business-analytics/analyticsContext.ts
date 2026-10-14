import { createContext, useContext } from "react";
import type { AnalyticsRange } from "./analyticsRange";
import type { BizKind } from "../../components/business-more/kind";

// What every Analytics section reads from the shell: the range (and the
// compare toggle), the business lane for its vocabulary, and the hook to
// feed the shell's Export CSV with the section's real rows (never sample
// numbers; empty cells for values that are not known yet).

export type CsvRow = (string | number | null)[];

export interface AnalyticsCtx {
  range: AnalyticsRange;
  kind: BizKind;
  /** The rows Export CSV writes (header first). Null hides the link. */
  setExport: (name: string, rows: CsvRow[] | null) => void;
}

export const AnalyticsContext = createContext<AnalyticsCtx | null>(null);

export function useAnalytics(): AnalyticsCtx {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error("useAnalytics outside the Analytics shell");
  return ctx;
}

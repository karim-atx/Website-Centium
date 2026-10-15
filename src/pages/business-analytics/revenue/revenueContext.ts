import { createContext, useContext } from "react";
import type { RevenueState } from "./useRevenueData";

// The one Revenue read, shared by every Revenue page under RevenuePage.
export const RevenueContext = createContext<RevenueState | null>(null);

export function useRevenue(): RevenueState {
  const ctx = useContext(RevenueContext);
  if (!ctx) throw new Error("useRevenue outside RevenuePage");
  return ctx;
}

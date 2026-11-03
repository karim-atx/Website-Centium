import { createContext, useContext } from "react";

// Website viewport v1 · WB-MA.1: the Marketplace Overview at 1024px and wider
// draws the shared market blocks (Listing toggle, Clients reached, the ledger,
// rating, Listing strength, Your card, Photos, Activities) in the board's web
// type (WB-MA Marketplace Web v2: 13/20 captions, 15–17 titles, 40/48 hero).
// Only OverviewWeb provides a value; without the provider (every mobile and
// professional screen) each block keeps its mobile sizes exactly.

/** "" on mobile; "wide" from 1280px, "rail" from 1024px. */
export const MarketWebType = createContext<"" | "wide" | "rail">("");

/** True inside the web Marketplace Overview: use the board's web sizes. */
export const useMarketWebType = (): boolean => useContext(MarketWebType) !== "";

/** The narrower web layout (the sidebar rail). */
export const useMarketWebRail = (): boolean => useContext(MarketWebType) === "rail";

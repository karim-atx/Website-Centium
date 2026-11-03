import { createContext, useContext } from "react";

// Website viewport v1 (WC-HO, HO Board v11): on the web board every widget,
// small or large, is drawn 138 tall at the mobile proportions and the cell
// zooms it to the row (1.37 at 1440, 4/3 at 1024). The web board provides
// that height here; nothing provides it on mobile, so every card keeps its
// own fixed height (small 114, large 150, the large water 131) there.
export const WebTileHeight = createContext<number | null>(null);

/** The web board's tile height, or null on mobile (the card's own height applies). */
export const useWebTileHeight = () => useContext(WebTileHeight);

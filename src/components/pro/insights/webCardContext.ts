import { createContext, useContext } from "react";
import { useWebLayout } from "../../web/useWebLayout";

/**
 * Website viewport (WP-CO-IN): set by an Insights page card. Inside it ProChart draws flat at the
 * card's plot height with the card's sizes (legend at the title's right, or under the question),
 * and StatBoxes draw the card's boxes `statCols` across.
 */
export const InsightsWebCard = createContext<{ plotPx: number; statCols?: number; legendBelow?: boolean } | null>(null);
export const useInsightsWebCard = () => useContext(InsightsWebCard);

/** The frames' column spans: (1440, 1024 rail). */
export const useSpan = () => {
  const { rail } = useWebLayout();
  return (wide: string, narrow: string) => (rail ? narrow : wide);
};

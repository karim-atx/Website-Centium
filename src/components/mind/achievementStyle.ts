import { liftTo, tintOn } from "../../data/folderColors";
import type { AchievementLevel } from "../../services/achievements";
import { Gem, Crown, Medal, Shield, Star, type LucideIcon } from "lucide-react";

// Mobile v5.1 MO1.1.3 / MO1.1.3.2: the hero card and the unlock pill take a
// TIER (or an achievement LEVEL) colour, fixed in every theme:
// Bronze #9C6B4A · Silver #8A9099 · Gold #B08D3C · Platinum #5F7F86 ·
// Diamond #4E6FA8. Light mode uses the handover's values as drawn (A10); dark
// mode puts each on a dark tint of itself and lifts the ink to 4.5:1.

export const TIER_HEX: Record<string, string> = {
  Bronze: "#9C6B4A",
  Silver: "#8A9099",
  Gold: "#B08D3C",
  Platinum: "#5F7F86",
  Diamond: "#4E6FA8",
};

export const TIER_ICON: Record<string, LucideIcon> = {
  Bronze: Medal,
  Silver: Shield,
  Gold: Crown,
  Platinum: Star,
  Diamond: Gem,
};

const LEVEL_HEX: Record<AchievementLevel, string> = {
  bronze: TIER_HEX.Bronze,
  silver: TIER_HEX.Silver,
  gold: TIER_HEX.Gold,
};

/** Unknown tiers fall back to Bronze rather than to nothing. */
export const tierHex = (name: string | null | undefined): string => (name && TIER_HEX[name]) || TIER_HEX.Bronze;
/** MO1.1.3.2 always draws a level colour; a badge with no level (a one-off)
    takes the first rung's, Bronze, with a "Bronze" chip (see the toast). */
export const levelHex = (level: AchievementLevel | null | undefined): string =>
  (level && LEVEL_HEX[level]) || LEVEL_HEX.bronze;

export interface ColourSet {
  /** Text and icons in the colour. */
  ink: string;
  /** The card's fill. */
  fill: string;
  /** A hairline in the colour. */
  border: string;
  /** A filled shape (the current tier disc, the progress bar). */
  solid: string;
  /** Text on `solid`. */
  onSolid: string;
  /** An empty progress track. */
  track: string;
}

const DARK_CARD = "#1C1F28";

export function colourSet(hex: string, dark: boolean): ColourSet {
  if (!dark) {
    // #FBF7F4 is Bronze at about 5% on white (the frame's fill).
    return {
      ink: hex,
      fill: tintOn(hex, 0.05, "#FFFFFF"),
      border: `${hex}3D`, // 24%
      solid: hex,
      onSolid: "#FFFFFF",
      track: tintOn(hex, 0.16, "#FFFFFF"),
    };
  }
  const fill = tintOn(hex, 0.14, DARK_CARD);
  const solid = liftTo(hex, fill, 3);
  return {
    ink: liftTo(hex, fill),
    fill,
    border: `${hex}73`, // 45%
    solid,
    onSolid: "#0D0B1A",
    track: tintOn(hex, 0.3, DARK_CARD),
  };
}

import { liftTo } from "../../data/folderColors";

// An event's colours (MO1.6.2: "card tint is derived from the event's chosen
// colour, so every event swatch works"). The tint is the colour at 16% over
// whatever is behind it, as the Month rows have always drawn it. In dark the
// side bar is lifted until it reaches 3:1 on the page, so the near-black
// swatch still shows.

export const DEFAULT_EVENT_COLOUR = "#7D6BB5";
const DARK_PAGE = "#121317";

export function eventColours(colour: string | undefined, dark: boolean): { tint: string; bar: string } {
  const c = /^#[0-9a-f]{6}$/i.test(colour ?? "") ? colour! : DEFAULT_EVENT_COLOUR;
  return { tint: `${c}29`, bar: dark ? liftTo(c, DARK_PAGE, 3) : c };
}

/**
 * The swatches MO1.6.4 draws, sampled from the frame (the handover gives no
 * hex list). Events saved with an older colour keep it; it simply isn't
 * offered for new ones.
 */
export const EVENT_SWATCHES = [
  "#7D6BB5",
  "#6F9993",
  "#4C8FD1",
  "#5B5FC7",
  "#794E9C",
  "#D9A441",
  "#5E9A6B",
  "#5A6B7D",
  "#241F1B",
] as const;

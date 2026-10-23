// The Destinations tiles glyph paths (screen files TILE_D), kept apart from the
// component so it stays a components-only module (fast refresh).

export type DestinationKey = "ig" | "wa" | "save" | "copy" | "comm" | "more";

/** TILE_D, verbatim (the screen files' glyph paths, lucide's). */
export const DESTINATION_GLYPH: Record<DestinationKey, string> = {
  ig: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01",
  wa: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
  save: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  copy: "M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3ZM15 3v6h6",
  comm: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  more: "M18 5a3 3 0 1 0 0 .01M6 12a3 3 0 1 0 0 .01M18 19a3 3 0 1 0 0 .01M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98",
};

/** Business Sharing's TILE_D.more (line 314): three dots. */
export const MORE_DOTS_GLYPH = "M5 12h.01M12 12h.01M19 12h.01";

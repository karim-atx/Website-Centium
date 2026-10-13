import { createContext } from "react";

/**
 * v6 Batch 3 (MO1B-029 recommendation): business Settings renders the shared
 * rows (Storage, Use device time zone) as BizMoreV8 sub-page rows (12/700, 10
 * desc, 36 r11 tile, 17 / 1.75 glyph) inside its list cards. Provide
 * "business" around them; every other caller is unchanged.
 */
export const SettingsRowVariant = createContext<"default" | "business">("default");

import type { LucideIcon } from "lucide-react";
import { HeartPulse, Smartphone, Watch } from "lucide-react";

// v6 (TK 4.6, user decision: Apple Health / WHOOP later): neutral placeholders
// for the Connected devices rows. Part B excludes the Apple Health and WHOOP
// marks (trademarks) and draws no Health Connect mark, so no brand artwork is
// used anywhere: each row shows a plain lucide glyph on the standard Settings
// tile, which SettingsRow already draws for its `icon` prop (36 x 36, radius
// 11, the lavender pale ground, 17 px at 1.75 in primary-accent; MO1.8 #6, #7).
// So the placeholder is just the glyph: `<SettingsRow icon={DEVICE_PLACEHOLDER_ICON.whoop} … />`.
// OURS. Replaced the brand marks (DeviceMarks.tsx, deleted in v6 batch 1).
// OURS-Sources draws the same glyphs on a neutral tile (#F5F5F6 / #242730).

export type DeviceKind = "apple-health" | "whoop" | "health-connect";

export const DEVICE_PLACEHOLDER_ICON: Record<DeviceKind, LucideIcon> = {
  "apple-health": HeartPulse,
  whoop: Watch,
  "health-connect": Smartphone,
};

import React from "react";
import type { LucideIcon } from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";
import { ICON_TILE_DARK, ICON_TILE_LIGHT, INK } from "./proInk";

/**
 * Release 3 · EmptyState (source gen/ui.js emptyState, used by every empty
 * frame: CL3 "No clients yet", TR, NU, MO). Centred, pad 24 0: icon tile 56,
 * r16, #F0EDF9 (dark lavender at 15%), icon 26 / 1.5 in primary.accent;
 * title 15 / 700 text.primary, m-top 12; line 12.5 / 500 text.faint, line
 * 1.6, max 260, m-top 4. Actions (the frames' CTA row) go under it.
 */
export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  line?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, line, children }) => {
  const dark = useIsDark();
  return (
    <div className="flex flex-col items-center text-center" style={{ padding: "24px 0" }}>
      <span className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: 16, background: dark ? ICON_TILE_DARK : ICON_TILE_LIGHT }}>
        <Icon size={26} strokeWidth={1.5} aria-hidden style={{ color: INK.prAccent }} />
      </span>
      <p style={{ fontSize: textPx(15), fontWeight: 700, color: INK.ch, marginTop: 12 }}>{title}</p>
      {line && (
        <p style={{ fontSize: textPx(12.5), fontWeight: 500, color: INK.chF, marginTop: 4, lineHeight: 1.6, maxWidth: 260 }}>{line}</p>
      )}
      {children && <div className="w-full flex justify-center" style={{ marginTop: 16, gap: 8 }}>{children}</div>}
    </div>
  );
};

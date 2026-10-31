import React from "react";
import { Avatar } from "../pro/client/kit";
import { iconFor, type ToneSet } from "./tone";

/** remIcon21: a 38 tile, radius 12, an 18 / 1.75 icon, and the professional's 18 avatar at the corner. */
export const ReminderIcon: React.FC<{ kind: string; tone: ToneSet; proName: string; proAvatarUrl?: string | null }> = ({ kind, tone, proName, proAvatarUrl }) => {
  return (
    <span className="relative flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: 12, background: tone.tile }}>
      {React.createElement(iconFor(kind), { size: 18, strokeWidth: 1.75, "aria-hidden": true, style: { color: tone.ink } })}
      <span className="absolute rounded-full" style={{ insetInlineEnd: -4, bottom: -4, boxShadow: `0 0 0 2px ${tone.bg}` }}>
        <Avatar name={proName} url={proAvatarUrl} size={18} tone="teal" />
      </span>
    </span>
  );
};

import React from "react";
import { useIsDark } from "../../hooks/useIsDark";

/**
 * Release 3 · W7 (CU1, CU28): a coach's round avatar, the handover's
 * `avatar(t, initials, size, tone)`: the photo when there is one, else the
 * initials (800, a third of the size) on the tone's pale fill. Teal for the
 * first coach, gold for a second (CU1 v4 "two professionals"). As [light, dark]:
 * teal #EAF4F2 / #3C6B65 and #293339 / #93C1B9; gold #F6E9C9 / #8A6A3E and
 * #3A342C / #DCBB7F.
 */
const TONES = {
  teal: { bg: ["#EAF4F2", "#293339"], ink: ["#3C6B65", "#93C1B9"] },
  gold: { bg: ["#F6E9C9", "#3A342C"], ink: ["#8A6A3E", "#DCBB7F"] },
} as const;

type CoachTone = keyof typeof TONES;

export const CoachAvatar: React.FC<{ name: string; avatarUrl?: string | null; size: number; tone?: CoachTone }> = ({
  name,
  avatarUrl,
  size,
  tone = "teal",
}) => {
  const dark = useIsDark();
  const t = TONES[tone];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" aria-hidden className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: t.bg[dark ? 1 : 0], color: t.ink[dark ? 1 : 0], fontSize: Math.round(size * 0.33), fontWeight: 800, lineHeight: 1 }}
    >
      {initials}
    </span>
  );
};

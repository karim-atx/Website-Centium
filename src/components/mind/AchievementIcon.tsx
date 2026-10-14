import React, { useState } from "react";
import clsx from "clsx";
import { Lock } from "lucide-react";
import { achievementArtUrl } from "../../utils/assetUrls";
import { useIsDark } from "../../hooks/useIsDark";
import { keyTint } from "./achievementStyle";

// MO1.1.3.3: the 58 medallions, `/achievements/<key>.svg`, one component for
// every place they are drawn: 34 on Recently unlocked, 38 in the grid, 40 in
// the unlock pill's coin, 65 in the detail popup.
//
// THE EMOJI IS THE FALLBACK (K1, S2, S3). It shows until the SVG has loaded,
// and stays when a key has no art (a catalogue row added before its art) or
// the file fails to load.
//
// LOCKED = the same art at opacity 0.5, greyed (MO1.1.3 #47, MO1.1.3.3 #7;
// V6-142: 0.5 in dark too).

export const AchievementIcon: React.FC<{
  achievementKey: string;
  /** The catalogue row's emoji (achievements.icon). */
  emoji: string;
  size: number;
  locked?: boolean;
  className?: string;
}> = ({ achievementKey, emoji, size, locked = false, className }) => {
  const url = achievementArtUrl(achievementKey);
  // Keyed by URL so a changed key starts over (state from the old key would
  // otherwise say "loaded").
  return <Art key={url ?? "none"} url={url} emoji={emoji} size={size} locked={locked} className={className} />;
};

const Art: React.FC<{ url: string | null; emoji: string; size: number; locked: boolean; className?: string }> = ({
  url,
  emoji,
  size,
  locked,
  className,
}) => {
  const [state, setState] = useState<"loading" | "loaded" | "failed">(url ? "loading" : "failed");
  const greyed: React.CSSProperties = locked ? { opacity: 0.5, filter: "grayscale(1)" } : {};
  return (
    <span
      aria-hidden
      className={clsx("relative flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {state !== "loaded" && (
        <span className="leading-none select-none" style={{ fontSize: Math.round(size * 0.55), ...greyed }}>
          {emoji}
        </span>
      )}
      {url && state !== "failed" && (
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
          className={clsx("absolute inset-0 block", state !== "loaded" && "opacity-0")}
          style={{ width: size, height: size, ...(state === "loaded" ? greyed : null) }}
        />
      )}
    </span>
  );
};

/**
 * The medallion in its rounded tile, with the small lock when locked
 * (MO1.1.3 #22-#23, #42-#49; MO1.1.3.1 #54-#57). The lock pill sits at the
 * tile's bottom right: 14 with Lock 8 on the 44 grid tile, 25 with Lock 14 on
 * the 76 detail tile. White with shadow-soft in light (shadow unspecified),
 * #1C1F28 without a shadow in dark.
 */
export const AchievementTile: React.FC<{
  achievementKey: string;
  emoji: string;
  tile: number;
  radius: number;
  icon: number;
  locked?: boolean;
  /** The grid draws a locked badge on the neutral locked tile; the detail keeps the key's tint. */
  lockedTile?: boolean;
  lock?: { size: number; icon: number; offset: number };
}> = ({ achievementKey, emoji, tile, radius, icon, locked = false, lockedTile = false, lock }) => {
  const dark = useIsDark();
  return (
    <span
      className="relative flex items-center justify-center shrink-0"
      style={{ width: tile, height: tile, borderRadius: radius, background: keyTint(achievementKey, dark, locked && lockedTile) }}
    >
      <AchievementIcon achievementKey={achievementKey} emoji={emoji} size={icon} locked={locked} />
      {locked && lock && (
        <span
          aria-hidden
          className="absolute flex items-center justify-center rounded-full bg-cream-card dark:shadow-none shadow-soft"
          style={{ left: lock.offset, top: lock.offset, width: lock.size, height: lock.size }}
        >
          <Lock size={lock.icon} strokeWidth={2} className="text-charcoal-faint" />
        </span>
      )}
    </span>
  );
};

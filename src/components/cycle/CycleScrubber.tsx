import React, { useRef, useState } from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { linePx, textPx } from "../../theme/textSize";
import { t } from "../../i18n/core";
import { SCRUB_EARLIER, SCRUB_LATER } from "../../services/cycle/guidance";

// The day scrubber (HE1.10 #22-#28, HE1.10.d #22-#28, S3).
//
// Range minus to plus one cycle around today (repo), the centre tick marks
// today. A slim track 4 r9999 #EEECF4 (dark #303141, * derived), the fill
// #AEA1DC (dark #A991FE) from the left edge to the thumb, a 2 × 8 tick
// #241F1B@25% in the middle, and an 18 thumb, white with a 1.6 #9A8CD6 ring
// and a shadow (dark #1C1F28 / #A991FE, no shadow) that grows a soft halo
// while held. Updates are live (no animation delay). Keyboard: arrows move a
// day, Home / End jump to the ends, PageUp / PageDown a week.

const THUMB = 18;

export const CycleScrubber: React.FC<{
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  centreLabel: string;
  valueText: string;
}> = ({ min, max, value, onChange, centreLabel, valueText }) => {
  const dark = useIsDark();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [held, setHeld] = useState(false);
  const span = Math.max(1, max - min);
  const frac = (value - min) / span;

  const fromPointer = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / Math.max(1, r.width)));
    const next = Math.round(min + f * span);
    if (next !== value) onChange(next);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -7, PageUp: 7 };
    let next: number | null = null;
    if (e.key in step) next = value + step[e.key];
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    if (next === null) return;
    e.preventDefault();
    onChange(Math.min(max, Math.max(min, next)));
  };

  return (
    <div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={t("Move through the cycle")}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          setHeld(true);
          fromPointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (held) fromPointer(e.clientX);
        }}
        onPointerUp={() => setHeld(false)}
        onPointerCancel={() => setHeld(false)}
        className="relative cursor-pointer touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full"
        style={{ height: 44, margin: "-20px 0" }}
        data-scrubber=""
      >
        <div className="absolute inset-x-0 rounded-full" data-scrub-track="" style={{ top: 20, height: 4, background: dark ? "#303141" : "#EEECF4" }} />
        <div className="absolute start-0 rounded-full" data-scrub-fill="" style={{ top: 20, height: 4, width: `${frac * 100}%`, background: "rgb(var(--c-primary))" }} />
        <div
          aria-hidden
          className="absolute"
          data-scrub-tick=""
          style={{ top: 18, insetInlineStart: "50%", marginInlineStart: -1, width: 2, height: 8, borderRadius: 2, background: "rgb(var(--c-charcoal) / 0.25)" }}
        />
        <div
          aria-hidden
          className="absolute rounded-full"
          data-scrub-thumb=""
          style={{
            top: 22 - THUMB / 2,
            left: `${frac * 100}%`,
            marginInlineStart: -THUMB / 2,
            width: THUMB,
            height: THUMB,
            background: dark ? "#1C1F28" : "#FFFFFF",
            // The 1.6 ring as an inset shadow: a border this thin is snapped
            // to whole pixels by the browser, a shadow is drawn as given.
            boxShadow: [
              `inset 0 0 0 1.6px ${dark ? "#A991FE" : "rgb(var(--c-fill-pinned))"}`,
              dark ? null : "0 1px 3px rgba(36,31,27,0.18)",
              held ? "0 0 0 8px rgb(var(--c-primary) / 0.22)" : null,
            ]
              .filter(Boolean)
              .join(", "),
          }}
        />
      </div>
      <div className="flex items-start justify-between" style={{ marginTop: 11, gap: 8 }}>
        <span className="text-charcoal-faint shrink-0" style={{ fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 600 }}>
          {t(SCRUB_EARLIER)}
        </span>
        <span className="text-charcoal-soft text-center min-w-0" data-scrub-label="" style={{ fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 600 }}>
          {centreLabel}
        </span>
        <span className="text-charcoal-faint shrink-0" style={{ fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 600 }}>
          {t(SCRUB_LATER)}
        </span>
      </div>
    </div>
  );
};

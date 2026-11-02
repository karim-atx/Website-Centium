import React from "react";
import { useApp } from "../../context/AppContext";
import type { ProLane } from "./subtypeLanes";
import { INK, NO_ICON_SCALE } from "./proInk";
import { ringStatus, type RingStatus } from "./proRules";
import { t, tk } from "../../i18n/core";

/**
 * Release 3 · StatusRing (HANDOVER e; CL3 v6 "bigger ring number", source
 * gen/r12.js ring12 over r9.js ring9). Used on CL3 rows and the TR assigned
 * list.
 *
 * - Ring 56, stroke 4.5 on the track (8% charcoal, dark 10% light), round cap
 *   from 12 o'clock. Larger text scales the ring with the number (k 1.2).
 * - Number 24, 800, -0.04em, tabular, text.primary on every colour; no % sign.
 * - Colour by status (HANDOVER i): 70 and above good, 40 to 69 gold
 *   (needs watching), below 40 poor (status.high).
 * - No data: the neutral ring with a dash (20, 800, text.tertiary).
 * - Clinical overview: record types shared, of 6, always teal (sharing is not
 *   good or poor): number 21 with "/6" at 10, 700, text.faint.
 */
export interface StatusRingProps {
  /** 0 to 100 (adherence), or 0 to 6 shared record types for Clinical overview; null when there's no data. */
  value: number | null;
  lane: ProLane;
  /** Scale, before Larger text (the TR assigned list draws 0.85). */
  scale?: number;
}

const STATUS_INK: Record<RingStatus, string> = { good: INK.good, watch: INK.gold, poor: INK.hi };
const STATUS_WORD: Record<RingStatus, string> = { good: tk("good"), watch: tk("needs watching"), poor: tk("poor") };

export const StatusRing: React.FC<StatusRingProps> = ({ value, lane, scale = 1 }) => {
  const { accessibility } = useApp();
  const k = scale * (accessibility.largerText ? 1.2 : 1);
  const S = Math.round(56 * k);
  const sw = 4.5;
  const r = (S - sw) / 2 - 1;
  const C = 2 * Math.PI * r;
  const cx = S / 2;
  const co = lane === "clinical_overview";
  const none = value == null;
  const v = none ? 0 : Math.max(0, Math.round(value));
  const frac = none ? 0 : co ? Math.min(1, v / 6) : Math.min(1, v / 100);
  const col = co ? INK.tealDark : STATUS_INK[ringStatus(v)];
  const label = none ? t("No data yet") : co ? t("{v} of 6 record types shared", { v }) : t("Adherence {v}, {status}", { v, status: t(STATUS_WORD[ringStatus(v)]) });

  return (
    <span role="img" aria-label={label} className="relative flex items-center justify-center shrink-0" style={{ width: S, height: S }}>
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="absolute inset-0" style={NO_ICON_SCALE} aria-hidden>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={INK.ringTrack} strokeWidth={sw} />
        {!none && frac > 0 && (
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={col}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${(C * frac).toFixed(1)} ${C.toFixed(1)}`}
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        )}
      </svg>
      <span className="relative" aria-hidden>
        {none ? (
          <span style={{ fontSize: 20 * k, fontWeight: 800, color: INK.chT, lineHeight: 1 }}>–</span>
        ) : (
          <span
            style={{
              fontSize: (co ? 21 : 24) * k,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              fontVariantNumeric: "tabular-nums",
              color: INK.ch,
              lineHeight: 1,
            }}
          >
            {v}
            {co && <span style={{ fontSize: 10 * k, fontWeight: 700, color: INK.chF }}>/6</span>}
          </span>
        )}
      </span>
    </span>
  );
};

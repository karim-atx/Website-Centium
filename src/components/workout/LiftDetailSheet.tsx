import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { TrendChart, type TrendGeometry } from "../charts/TrendChart";
import { typeStyles } from "./setTypeStyle";
import { useIsDark } from "../../hooks/useIsDark";
import { todayLocal } from "../../utils/date";
import {
  kgWhole,
  sessionsInRange,
  setLine,
  type LiftMax,
  type LiftRange,
} from "../../services/workout/oneRepMax";
import { linePx, textPx } from "../../theme/textSize";

const RANGES: LiftRange[] = ["3M", "6M", "All"];
/** The frame shows the four most recent sessions. */
const RECENT = 4;

// The chart's place inside the purple card, measured from the WO19 frame.
const CARD_GEOMETRY: TrendGeometry = {
  labelX: 21,
  left: 47,
  right: 25,
  scrubY: 15,
  plotTop: 30,
  plotH: 74,
  datesY: 121,
  height: 135,
};

// Mobile v5.1 R3 (no light islands): the PR chip's ground, [light, dark].
// Dark is gold.tint; its ink is the set-type PR ink for the mode (4.7:1).
const PR_CHIP_BG = ["#F7EDD9", "#3A342C"] as const;

const dayMs = (day: string) => Date.parse(`${day}T00:00:00Z`);
const shortDate = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Handover 2026-09-29 WO19: one lift's estimated 1RM. The current 1RM and the
 * set it came from; a chart of each session's best estimate on the History-
 * purple card with a 3M / 6M / All toggle; the most recent sessions with
 * their best set, estimate and the PR chip. One session: a single point and
 * "Log another session to see your trend."
 */
export const LiftDetailSheet: React.FC<{ lift: LiftMax | null; onClose: () => void }> = ({ lift, onClose }) => {
  const [range, setRange] = useState<LiftRange>("3M");
  const dark = useIsDark();
  if (!lift) return null;

  const shown = sessionsInRange(lift, range, todayLocal());
  const points = shown.map((s) => ({ t: dayMs(s.date), value: kgWhole(s.oneRm), label: shortDate(dayMs(s.date)) }));
  const recent = [...lift.sessions].reverse().slice(0, RECENT);

  return (
    <BottomSheet open onClose={onClose} title={lift.name} handle>
      <div className="animate-fade-slide-up">
        <div className="flex items-baseline" style={{ gap: 10 }}>
          <p style={{ color: "rgb(var(--c-charcoal))", fontSize: textPx(30), fontWeight: 800, lineHeight: 1 }}>
            {kgWhole(lift.oneRm)}
            <span style={{ color: "rgb(var(--c-charcoal-soft))", fontSize: textPx(15), fontWeight: 700, marginLeft: 4 }}>kg</span>
          </p>
          <span style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(11) }}>estimated 1RM</span>
        </div>
        <p style={{ color: "rgb(var(--c-charcoal-soft))", fontSize: textPx(12), marginTop: 8 }}>
          {setLine(lift.best)} · {shortDate(dayMs(lift.best.date))}
        </p>

        <div
          style={{
            marginTop: 16,
            borderRadius: 20,
            background: "linear-gradient(180deg, rgb(var(--th-a79ad5)), rgb(var(--th-a194d1)))",
            paddingTop: 12,
          }}
        >
          <div className="flex items-center justify-between" style={{ padding: "0 14px" }}>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: textPx(9.5), fontWeight: 700, letterSpacing: "0.12em" }}>
              ESTIMATED 1RM
            </span>
            <div
              role="tablist"
              aria-label="Chart range"
              className="flex"
              style={{ height: 26, padding: 2, gap: 2, borderRadius: 9, background: "rgba(255,255,255,0.22)" }}
            >
              {RANGES.map((r) => (
                <button
                  key={r}
                  role="tab"
                  aria-selected={range === r}
                  onClick={() => setRange(r)}
                  className="tap"
                  style={{
                    minWidth: 32,
                    padding: "0 7px",
                    borderRadius: 7,
                    fontSize: textPx(11),
                    fontWeight: 700,
                    background: range === r ? "#FFFFFF" : "transparent",
                    color: range === r ? "rgb(var(--thi-463a80))" : "#FFFFFF",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {points.length > 0 ? (
            <TrendChart
              key={range}
              points={points}
              color="#FFFFFF"
              unit="kg"
              formatDate={shortDate}
              ariaLabel={`${lift.name} estimated 1RM`}
              tone="card"
              geometry={CARD_GEOMETRY}
              unitOnAxis={false}
            />
          ) : (
            <div style={{ height: CARD_GEOMETRY.height }} />
          )}
          {lift.sessions.length === 1 && (
            <p className="text-center" style={{ color: "rgba(255,255,255,0.78)", fontSize: textPx(11), padding: "0 14px 14px" }}>
              Log another session to see your trend.
            </p>
          )}
        </div>

        <p style={{ marginTop: 20, color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em" }}>
          RECENT SESSIONS
        </p>
        <ul style={{ marginTop: 6 }}>
          {recent.map((s, i) => (
            <li
              key={s.sessionId}
              className="flex items-center"
              style={{ height: 40, gap: 10, borderTop: i ? "1px solid rgb(var(--c-charcoal) / 0.06)" : undefined }}
            >
              <span className="flex-none" style={{ width: 48, color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(12.5) }}>
                {shortDate(dayMs(s.date))}
              </span>
              <span className="flex-1 min-w-0 flex items-center" style={{ gap: 8 }}>
                <span className="truncate" style={{ color: "rgb(var(--c-charcoal))", fontSize: textPx(13), fontWeight: 700 }}>
                  {setLine(s.set)}
                </span>
                {s.isPr && (
                  <span
                    className="flex-none"
                    style={{
                      height: 16,
                      padding: "0 6px",
                      borderRadius: 5,
                      background: PR_CHIP_BG[dark ? 1 : 0],
                      color: typeStyles(dark).pr.ink,
                      fontSize: textPx(9.5),
                      fontWeight: 800,
                      lineHeight: linePx(16),
                    }}
                  >
                    PR
                  </span>
                )}
              </span>
              <span className="flex-none" style={{ color: "rgb(var(--c-charcoal))", fontSize: textPx(15), fontWeight: 800 }}>
                {kgWhole(s.oneRm)}
                <span style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(10), fontWeight: 600, marginLeft: 2 }}>kg</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </BottomSheet>
  );
};

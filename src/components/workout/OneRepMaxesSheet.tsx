import React, { useMemo, useState } from "react";
import { ArrowDownWideNarrow, ChevronDown, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { PopupMenu } from "../ui/PopupMenu";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { todayLocal } from "../../utils/date";
import {
  LIFT_SORT_LABEL,
  kgWhole,
  liftMaxes,
  sortLifts,
  type LiftMax,
  type LiftSort,
} from "../../services/workout/oneRepMax";
import { textPx } from "../../theme/textSize";

/**
 * Mobile v5.1 R3 (no light islands): the colours here with no token of the
 * same light value, as [light, dark]. The sort button's border (option
 * border), the teal 1RM and its up-change (secondary.deeper, 9:1 on the
 * card) and its kg unit (secondary.deep, 7:1), and the chevron and the "no
 * change" dash: #C9C2B8 is the disabled-glyph shade, but these are live, so
 * dark lifts them to text.tertiary (5.1:1) rather than charcoal-disabled
 * (2.2:1).
 */
const ORM_COLORS = {
  sortBorder: ["#E5E4E5", "rgba(238,239,242,0.10)"],
  teal: ["rgb(var(--th-3b7570))", "rgb(var(--th-a3c7c0))"],
  tealUnit: ["rgb(var(--th-86b3ad))", "rgb(var(--th-7fb3a9))"],
  faint: ["#C9C2B8", "#918DA0"],
} as const;
const ormColor = (key: keyof typeof ORM_COLORS, dark: boolean): string => ORM_COLORS[key][dark ? 1 : 0];

const SORTS = (Object.keys(LIFT_SORT_LABEL) as LiftSort[]).map((value) => ({ value, label: LIFT_SORT_LABEL[value] }));

const shortDate = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export const OrmIcon: React.FC<{ size: number }> = ({ size }) => (
  <img src="/metrics/orm-teal.png" alt="" width={size} height={size} style={{ borderRadius: size * 0.27 }} />
);

/**
 * Handover 2026-09-29 WO18: every lift's estimated 1RM from logged sessions
 * (services/workout/oneRepMax), with its 30-day change (teal up, muted down,
 * "–" if none) and last trained date. Sorted from a popup anchored to the
 * sort button, Highest 1RM by default. A row opens that lift's detail (WO19).
 */
export const OneRepMaxesSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onSelect?: (lift: LiftMax) => void;
}> = ({ open, onClose, onSelect }) => {
  const { workoutSessions } = useApp();
  const [sort, setSort] = useState<LiftSort>("highest");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const dark = useIsDark();
  const lifts = useMemo(() => sortLifts(liftMaxes(workoutSessions, todayLocal()), sort), [workoutSessions, sort]);

  return (
    <BottomSheet open={open} onClose={onClose} title="One-rep maxes" titleIcon={<OrmIcon size={26} />} handle>
      <div className="animate-fade-slide-up">
        {lifts.length === 0 ? (
          <div className="flex flex-col items-center text-center" style={{ padding: "28px 12px", gap: 14 }}>
            <OrmIcon size={36} />
            <p style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(12.5), lineHeight: 1.5 }}>
              No lifts yet. Log a set to see your one-rep maxes here.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between" style={{ marginBottom: 9 }}>
              <span style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(11) }}>
                {lifts.length} lift{lifts.length === 1 ? "" : "s"}
              </span>
              <button
                onClick={(e) => setAnchor(e.currentTarget)}
                aria-haspopup="listbox"
                className="tap inline-flex items-center"
                style={{
                  height: 26,
                  padding: "0 10px",
                  gap: 5,
                  borderRadius: 8,
                  background: "rgb(var(--c-cream-soft))",
                  border: `1px solid ${ormColor("sortBorder", dark)}`,
                  color: "rgb(var(--c-charcoal))",
                  fontSize: textPx(12),
                  fontWeight: 600,
                }}
              >
                <ArrowDownWideNarrow size={13} style={{ color: "rgb(var(--c-charcoal-soft))" }} />
                {LIFT_SORT_LABEL[sort]}
                <ChevronDown size={12} style={{ color: "rgb(var(--c-charcoal-muted))" }} />
              </button>
              <PopupMenu
                open={!!anchor}
                anchor={anchor}
                onClose={() => setAnchor(null)}
                options={SORTS}
                selected={sort}
                onSelect={(value) => {
                  setSort(value);
                  setAnchor(null);
                }}
              />
            </div>

            <ul>
              {lifts.map((lift, i) => (
                <li key={lift.key} style={{ borderTop: i ? "1px solid rgb(var(--c-charcoal) / 0.06)" : undefined }}>
                  <button
                    onClick={() => onSelect?.(lift)}
                    className="tap w-full flex items-center text-left"
                    style={{ height: 62, gap: 10 }}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block truncate" style={{ color: "rgb(var(--c-charcoal))", fontSize: textPx(13.5), fontWeight: 700 }}>
                        {lift.name}
                      </span>
                      <span className="block" style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: textPx(10.5), marginTop: 2 }}>
                        Last trained {shortDate(lift.lastTrained)}
                      </span>
                    </span>
                    <span className="flex flex-col items-end flex-none">
                      <span style={{ color: ormColor("teal", dark), fontSize: textPx(15), fontWeight: 800 }}>
                        {kgWhole(lift.oneRm)}
                        <span style={{ color: ormColor("tealUnit", dark), fontSize: textPx(10), fontWeight: 600, marginLeft: 2 }}>kg</span>
                      </span>
                      <Change value={lift.change30} dark={dark} />
                    </span>
                    <ChevronRight size={14} className="flex-none" style={{ color: ormColor("faint", dark) }} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </BottomSheet>
  );
};

/** 30-day change: teal up, muted down, "–" when there is none. */
const Change: React.FC<{ value: number | null; dark: boolean }> = ({ value, dark }) => {
  const kg = value == null ? 0 : kgWhole(value);
  if (kg === 0)
    return <span style={{ color: ormColor("faint", dark), fontSize: textPx(10), marginTop: 2 }}>–</span>;
  const up = kg > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className="inline-flex items-center"
      style={{ color: up ? ormColor("teal", dark) : "rgb(var(--c-charcoal-tertiary))", fontSize: textPx(10), fontWeight: 600, marginTop: 2, gap: 3 }}
    >
      <Icon size={11} />
      {up ? `+${kg}` : Math.abs(kg)} kg
    </span>
  );
};

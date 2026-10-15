import React from "react";

// AN5-001 row 14 · donut of seats: box 168, grid ring r79, segments rO 74 /
// rI 54, 7° between blocks, 4° between seats (2.5° when more than 10 seats),
// start −90° with a tick at r77-82. Each segment is a button (S3).

export type SeatKind = "used" | "pending" | "free";

export interface DonutSeat {
  kind: SeatKind;
  aria: string;
  fresh?: boolean;
}

const C = 84;
const RO = 74;
const RI = 54;

const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(C + r * Math.cos(a)).toFixed(2)},${(C + r * Math.sin(a)).toFixed(2)}`;
};

function sector(a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${pt(RO, a0)} A${RO},${RO} 0 ${large} 1 ${pt(RO, a1)} L${pt(RI, a1)} A${RI},${RI} 0 ${large} 0 ${pt(RI, a0)} Z`;
}

export const SeatDonut: React.FC<{
  seats: DonutSeat[];
  perBlock: number;
  selected: number;
  onSelect: (i: number) => void;
  children?: React.ReactNode;
}> = ({ seats, perBlock, selected, onSelect, children }) => {
  const n = seats.length;
  const blocks = Math.max(1, Math.ceil(n / Math.max(1, perBlock)));
  const seatGap = n > 10 ? 2.5 : 4;
  const blockGap = 7;
  const gapsTotal = blocks * blockGap + Math.max(0, n - blocks) * seatGap;
  const sweep = n > 0 ? (360 - gapsTotal) / n : 0;
  let at = -90 + blockGap / 2;
  const segs = seats.map((s, i) => {
    const a0 = at;
    const a1 = at + sweep;
    const lastInBlock = (i + 1) % perBlock === 0 || i === n - 1;
    at = a1 + (lastInBlock ? blockGap : seatGap);
    return { s, i, d: sector(a0, a1) };
  });

  return (
    <div className="an5-donut">
      <svg width="168" height="168" viewBox="0 0 168 168" role="group" aria-label="Seats">
        <circle cx={C} cy={C} r={79} fill="none" stroke="var(--an-grid)" strokeWidth={1} />
        {segs.map(({ s, i, d }) => {
          const on = i === selected;
          const style =
            s.kind === "used"
              ? { fill: on ? "var(--an-pdark)" : "var(--an-primary)", stroke: on ? "var(--an-pdark)" : "var(--an-primary)", sw: 1, dash: undefined }
              : s.kind === "pending"
                ? { fill: "var(--an-pale)", stroke: on ? "var(--an-pdark)" : "var(--an-primary)", sw: on ? 2 : 1, dash: undefined }
                : s.fresh
                  ? { fill: "var(--an-teal-fresh, rgba(20,160,143,0.12))", stroke: "var(--an-teal)", sw: 2, dash: undefined }
                  : { fill: "none", stroke: on ? "var(--an-pdark)" : "var(--an-tert)", sw: on ? 2 : 1.4, dash: "3 3" };
          return (
            <g
              key={i}
              className="an5-donut-seg"
              role="button"
              tabIndex={0}
              aria-label={s.aria}
              aria-pressed={on}
              onClick={() => onSelect(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(i);
                }
              }}
            >
              {/* A transparent fill keeps the dashed free seat tappable inside its outline. */}
              <path d={d} fill={style.fill === "none" ? "transparent" : style.fill} stroke={style.stroke} strokeWidth={style.sw} strokeDasharray={style.dash} strokeLinejoin="round" />
            </g>
          );
        })}
        <path d={`M${pt(77, -90)} L${pt(82, -90)}`} fill="none" stroke="var(--an-tert)" strokeWidth={1.2} />
      </svg>
      <div className="an5-donut-center">{children}</div>
    </div>
  );
};

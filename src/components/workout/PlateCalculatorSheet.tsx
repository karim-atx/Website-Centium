import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { BARS, COLLARS, nearestKgPlate, plateLoad, type PlateUnit } from "../../services/workout/plates";

// IPF plate colours (WO24): 25 red, 20 blue, 15 yellow, 10 green, 5 white,
// 2.5 black, 1.25 chrome. Red, white and black are measured from the frame;
// blue, yellow and green keep the repo's existing IPF values; chrome is a
// light steel. Size by diameter (height) and thickness by weight (width):
// the repo's calibrated spec scaled to the frame (the 25 is 82 × 13).
const PLATE: Record<number, { fill: string; text: string; h: number; w: number }> = {
  25: { fill: "#C8403A", text: "#FFFFFF", h: 82, w: 13 },
  20: { fill: "#2E5F8A", text: "#FFFFFF", h: 82, w: 11 },
  15: { fill: "#D9A441", text: "#3F2A08", h: 73, w: 10 },
  10: { fill: "#3F9165", text: "#FFFFFF", h: 59, w: 9 },
  5: { fill: "#F4F4F2", text: "#4A443A", h: 42, w: 7 },
  2.5: { fill: "#2B2735", text: "#FFFFFF", h: 35, w: 6 },
  1.25: { fill: "#C9CCD2", text: "#4A443A", h: 29, w: 5 },
};
const COLLAR = "#7D6BB5";
const SLEEVE = "#D6D3DB";
const SHOULDER = "#9A96A3";
const GRIP = "#B9B6C0";
const KNURL = "#A7A3AF";

const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 500, color: "#5B5349", marginBottom: 8 };

const fmt = (n: number) => String(+n.toFixed(2));

/**
 * The barbell, drawn to scale in its own coordinates and scaled to the
 * container (01 GLOBAL i). Mirrored sleeves with shoulders and a knurled grip;
 * plates heaviest innermost against the shoulder; collars outside the plates;
 * a weight label on every plate. The 15 kg (35 lb) bar draws thinner and
 * shorter; "Other" draws the standard bar with its weight labelled.
 */
const Barbell: React.FC<{ plates: { kg: number; count: number }[]; unit: PlateUnit; collar: number; light: boolean; barLabel: string | null }> = ({
  plates,
  unit,
  collar,
  light,
  barLabel,
}) => {
  // Per side, innermost first: each plate drawn as its kg look-alike.
  const stack = plates.flatMap((p) => Array.from({ length: p.count }, () => ({ value: p.kg, look: unit === "kg" ? p.kg : nearestKgPlate(p.kg) })));
  const stackW = stack.reduce((w, p) => w + PLATE[p.look].w + 1, 0);
  const collarW = collar > 0 ? 5 : 0;
  const shaftH = light ? 5 : 6;
  const grip = light ? 90 : 111;
  const sleeve = Math.max(light ? 60 : 72, stackW + collarW + 12);
  const shoulderW = 5;
  const W = 2 * (sleeve + shoulderW) + grip;
  const H = 90;
  const cy = H / 2;

  // One side, outward from the shoulder; `dir` mirrors it.
  const side = (dir: 1 | -1) => {
    const inner = dir === 1 ? sleeve : sleeve + shoulderW + grip + shoulderW; // x where the plates start
    const out: React.ReactNode[] = [];
    let x = inner;
    stack.forEach((p, i) => {
      const s = PLATE[p.look];
      const px = dir === 1 ? x - s.w : x;
      out.push(
        <g key={`p${dir}${i}`}>
          <rect x={px} y={cy - s.h / 2} width={s.w} height={s.h} rx={1.5} fill={s.fill} stroke="rgba(36,31,27,0.18)" strokeWidth={0.6} />
          <text
            x={px + s.w / 2}
            y={cy}
            fill={s.text}
            fontSize={Math.min(7, s.w - 1)}
            fontWeight={700}
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(-90 ${px + s.w / 2} ${cy})`}
          >
            {fmt(p.value)}
          </text>
        </g>
      );
      x += dir === 1 ? -(s.w + 1) : s.w + 1;
    });
    if (collarW) {
      const cx = dir === 1 ? x - collarW : x;
      out.push(<rect key={`c${dir}`} x={cx} y={cy - 10} width={collarW} height={20} rx={1} fill={COLLAR} />);
    }
    return out;
  };

  const ticks = Array.from({ length: Math.floor(grip / 5.5) }, (_, i) => sleeve + shoulderW + 3 + i * 5.5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: W, margin: "0 auto" }} role="img" aria-label="Barbell loadout">
      {/* sleeves */}
      <rect x={0} y={cy - 5} width={sleeve} height={10} rx={2} fill={SLEEVE} />
      <rect x={sleeve + 2 * shoulderW + grip} y={cy - 5} width={sleeve} height={10} rx={2} fill={SLEEVE} />
      {/* shoulders */}
      <rect x={sleeve} y={cy - 12} width={shoulderW} height={24} rx={1} fill={SHOULDER} />
      <rect x={sleeve + shoulderW + grip} y={cy - 12} width={shoulderW} height={24} rx={1} fill={SHOULDER} />
      {/* grip with a knurl hint */}
      <rect x={sleeve + shoulderW} y={cy - shaftH / 2} width={grip} height={shaftH} fill={GRIP} />
      {ticks.map((t) => (
        <line key={t} x1={t} y1={cy - shaftH / 2} x2={t + 2} y2={cy + shaftH / 2} stroke={KNURL} strokeWidth={0.8} />
      ))}
      {barLabel && (
        <text x={W / 2} y={cy - 8} fontSize={7} fontWeight={700} fill="#5B5349" textAnchor="middle">
          {barLabel}
        </text>
      )}
      {side(1)}
      {side(-1)}
    </svg>
  );
};

/**
 * WO24 · Plate Calculator, from the plate icon in the logger's bottom bar.
 *
 * Target weight and a pill KG | LB toggle on one row; uniform bar and collar
 * tiles, "Other" turning into an inline bar-weight field; a grey unfilled
 * slider track; a result box (Working hero, Per side, "90% of 100 kg"); and a
 * live IPF barbell with a plate legend. Edge cases: "Bar only" and, when the
 * working weight can't be made, the closest lower load ("Closest: 88.5 kg").
 * LB mode computes in lb: lb plates (45, 35, 25, 10, 5, 2.5) drawn in the
 * nearest kg plate's colour, 45/35 lb bars and 5/2.5 lb collars (decision 18).
 *
 * The target starts EMPTY (the frame's 100 kg is example data), as does the
 * "Other" bar weight.
 */
export const PlateCalculatorSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [unit, setUnit] = useState<PlateUnit>("kg");
  const [targetDraft, setTargetDraft] = useState("");
  const [pct, setPct] = useState(100);
  const [barChoice, setBarChoice] = useState<0 | 1 | "other">(0);
  const [customBarDraft, setCustomBarDraft] = useState("");
  // Collars: 0 = heavier, 1 = lighter (2.5 kg default, per §6.9b), "none".
  const [collarChoice, setCollarChoice] = useState<0 | 1 | "none">(1);

  const bar = barChoice === "other" ? Number(customBarDraft) || 0 : BARS[unit][barChoice];
  const collar = collarChoice === "none" ? 0 : COLLARS[unit][collarChoice];
  const target = Number(targetDraft) || 0;
  const ready = target > 0 && bar > 0;
  const load = ready ? plateLoad(target, pct, bar, collar, unit) : null;
  const barOnly = !!load && load.plates.length === 0;
  const u = unit;

  const tile = (on: boolean): React.CSSProperties => ({
    flex: 1,
    minWidth: 0,
    height: 38,
    borderRadius: 10,
    background: on ? "#AEA1DC" : "#F5F5F6",
    color: on ? "#FFFFFF" : "#5B5349",
    fontSize: 12.5,
    fontWeight: on ? 700 : 600,
  });

  const caption = !load
    ? null
    : barOnly
    ? `${fmt(bar)} ${u} bar · no plates`
    : `${fmt(bar)} ${u} bar${collar > 0 ? ` · ${fmt(collar)} ${u} collars` : ""} · ${fmt(load.perSide * 2)} ${u} plates`;

  return (
    <BottomSheet light open={open} onClose={onClose} title="Plate Calculator">
      <div className="flex flex-col" style={{ gap: 16 }}>
        <div>
          <span style={label}>Target weight ({u})</span>
          <div className="flex items-center" style={{ gap: 11 }}>
            <input
              value={targetDraft}
              onChange={(e) => setTargetDraft(e.target.value.replace(/[^\d.]/g, "").replace(/(?<=\..*)\./g, ""))}
              inputMode="decimal"
              aria-label={`Target weight (${u})`}
              className="flex-1 min-w-0 text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ height: 43, borderRadius: 12, background: "#F5F5F6", border: "1px solid rgba(36,31,27,0.11)", fontSize: 15, fontWeight: 500, color: "#241F1B" }}
            />
            {/* 02: the one pill control, with a sliding highlight. */}
            <div
              role="radiogroup"
              aria-label="Unit"
              className="relative flex flex-none"
              style={{ width: 93, height: 43, borderRadius: 999, background: "#F0EDF9", padding: 3 }}
            >
              <span
                aria-hidden
                className="absolute"
                style={{
                  top: 3,
                  bottom: 3,
                  left: 3,
                  width: "calc(50% - 3px)",
                  borderRadius: 999,
                  background: "#AEA1DC",
                  transform: unit === "lb" ? "translateX(100%)" : "translateX(0)",
                  transition: "transform .22s cubic-bezier(.22,1,.36,1)",
                }}
              />
              {(["kg", "lb"] as const).map((v) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={unit === v}
                  onClick={() => {
                    setUnit(v);
                    if (barChoice === "other") setCustomBarDraft("");
                  }}
                  className="tap relative flex-1 uppercase"
                  style={{ fontSize: 12, fontWeight: 700, color: unit === v ? "#FFFFFF" : "#7D6BB5" }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <span style={label}>Bar</span>
          <div className="flex" style={{ gap: 8 }}>
            {[0, 1].map((i) => (
              <button key={i} onClick={() => setBarChoice(i as 0 | 1)} aria-pressed={barChoice === i} className="tap" style={tile(barChoice === i)}>
                {BARS[unit][i]} {u}
              </button>
            ))}
            {barChoice === "other" ? (
              <input
                autoFocus
                value={customBarDraft}
                onChange={(e) => setCustomBarDraft(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                aria-label={`Bar weight (${u})`}
                placeholder={u}
                className="text-center focus:outline-none"
                style={{ ...tile(true), background: "#FFFFFF", color: "#241F1B", border: "1.5px solid #AEA1DC" }}
              />
            ) : (
              <button onClick={() => setBarChoice("other")} aria-pressed={false} className="tap" style={tile(false)}>
                Other
              </button>
            )}
          </div>
        </div>

        <div>
          <span style={label}>Collars (per side)</span>
          <div className="flex" style={{ gap: 8 }}>
            {([0, 1, "none"] as const).map((c) => (
              <button key={String(c)} onClick={() => setCollarChoice(c)} aria-pressed={collarChoice === c} className="tap" style={tile(collarChoice === c)}>
                {c === "none" ? "None" : `${COLLARS[unit][c]} ${u}`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between" style={{ marginBottom: 8 }}>
            <span style={{ ...label, marginBottom: 0 }}>Percentage</span>
            <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 700, color: "#7D67D9" }}>
              {pct}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            aria-label="Percentage"
            className="set-slider plate-slider w-full"
            style={{
              height: 6,
              borderRadius: 3,
              background: `linear-gradient(to right, #AEA1DC 0%, #AEA1DC ${((pct - 10) / 90) * 100}%, #EDEDEF ${((pct - 10) / 90) * 100}%, #EDEDEF 100%)`,
              ["--thumb" as string]: "#FFFFFF",
            }}
          />
        </div>

        <div style={{ background: "#F3F1FC", borderRadius: 14, padding: "14px 16px" }}>
          <div className="flex items-end justify-between" style={{ gap: 12 }}>
            <div className="min-w-0">
              <p className="uppercase" style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", color: "#7D67D9" }}>
                Working
              </p>
              <p className="tabular-nums" style={{ margin: 0, lineHeight: "36px" }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: "#4A3AA0", letterSpacing: "-0.02em" }}>{load ? fmt(load.working) : "—"}</span>
                {load && <span style={{ fontSize: 13, fontWeight: 600, color: "#7D67D9", marginLeft: 4 }}>{u}</span>}
              </p>
            </div>
            <div className="text-right flex-none">
              <p className="uppercase" style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", color: "#7D67D9" }}>
                Per side
              </p>
              <p className="tabular-nums" style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: "#4A3AA0" }}>
                {!load ? "—" : barOnly ? "Bar only" : `${fmt(load.perSide)} ${u}`}
              </p>
              {load && (
                <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "#5F5093" }}>
                  {pct}% of {fmt(target)} {u}
                </p>
              )}
            </div>
          </div>
          {load?.closest != null && (
            <p style={{ margin: "8px 0 0", fontSize: 11.5, fontWeight: 700, color: "#5F5093" }}>
              Closest: {fmt(load.closest)} {u}
            </p>
          )}
        </div>

        <div style={{ background: "#FAFAFB", border: "1px solid #EDEDEE", borderRadius: 14, padding: "12px 12px 14px" }}>
          {caption && <p style={{ margin: "0 0 10px", fontSize: 11, color: "#8C8378" }}>{caption}</p>}
          <Barbell
            plates={load?.plates ?? []}
            unit={unit}
            collar={load ? collar : 0}
            light={barChoice === 1}
            barLabel={barChoice === "other" && bar > 0 ? `${fmt(bar)} ${u}` : null}
          />
          {load && !barOnly ? (
            <div className="flex flex-wrap" style={{ gap: 8, marginTop: 10 }}>
              {load.plates.map((p) => {
                const s = PLATE[unit === "kg" ? p.kg : nearestKgPlate(p.kg)];
                return (
                  <span key={p.kg} className="flex items-center" style={{ gap: 6, background: "#F5F5F6", borderRadius: 8, padding: "6px 10px" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.fill, border: "1px solid rgba(36,31,27,0.25)" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#241F1B" }}>
                      {fmt(p.kg)} {u}
                    </span>
                    <span style={{ fontSize: 10.5, color: "#8C8378" }}>× {p.count}</span>
                  </span>
                );
              })}
            </div>
          ) : barOnly ? (
            <p style={{ margin: "10px 0 0", fontSize: 11, color: "#8C8378" }}>Bar only</p>
          ) : null}
        </div>
      </div>
    </BottomSheet>
  );
};

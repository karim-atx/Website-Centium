import React, { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { rpeOptions, percentFromRpe, weightFromRpe } from "../../services/workout";

// WO23: RPE chips run ascending, 6 → 10.
const RPE_ASCENDING = [...rpeOptions].sort((a, b) => a - b);

const fieldLabel: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 500, color: "#5B5349", marginBottom: 8 };
const fieldInput: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  height: 43,
  borderRadius: 12,
  background: "#F5F5F6",
  border: "1px solid rgba(36,31,27,0.11)",
  padding: "0 14px",
  fontSize: 15,
  fontWeight: 500,
  color: "#241F1B",
};

/**
 * WO23 · RPE Calculator, from "RPE" in the logger's bottom bar.
 *
 * Known 1RM and target reps on one row; RPE chips 6 → 10; the suggested
 * weight is the hero of a box with no dead space, and its supporting line
 * only repeats values already on screen (reps, RPE, % of 1RM). The
 * calculation is unchanged (services/workout weightFromRpe).
 *
 * The fields start EMPTY: the frame's 100 kg and 5 reps are example data,
 * not the user's numbers (and the frame shows them as values, not hints).
 * Until both are filled the hero reads "—" and the supporting line is hidden.
 */
export const RPECalculator: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [oneRm, setOneRm] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState(8);

  const rm = Number(oneRm) || 0;
  const r = Number(reps) || 0;
  const ready = rm > 0 && r > 0;
  const suggested = useMemo(() => (ready ? weightFromRpe(rm, r, rpe) : null), [ready, rm, r, rpe]);
  const pct = ready ? Math.round(percentFromRpe(r, rpe)) : null;

  return (
    <BottomSheet light open={open} onClose={onClose} title="RPE Calculator">
      <div className="flex flex-col" style={{ gap: 18 }}>
        <div className="grid grid-cols-2" style={{ gap: 11 }}>
          <label className="block min-w-0">
            <span style={fieldLabel}>Known 1RM (kg)</span>
            <input
              value={oneRm}
              onChange={(e) => setOneRm(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              className="focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={fieldInput}
            />
          </label>
          <label className="block min-w-0">
            <span style={fieldLabel}>Target reps</span>
            <input
              value={reps}
              onChange={(e) => setReps(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className="focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={fieldInput}
            />
          </label>
        </div>

        <div>
          <span style={fieldLabel}>Target RPE</span>
          <div className="flex" style={{ gap: 5 }}>
            {RPE_ASCENDING.map((v) => {
              const on = rpe === v;
              return (
                <button
                  key={v}
                  onClick={() => setRpe(v)}
                  aria-pressed={on}
                  className="tap flex-1 min-w-0"
                  style={{
                    height: 34,
                    borderRadius: 8,
                    border: `1px solid ${on ? "#AEA1DC" : "#E7E6E6"}`,
                    background: on ? "rgb(var(--c-primary-fill))" : "#FFFFFF",
                    color: on ? "rgb(var(--c-on-primary-fill))" : "#5B5349",
                    fontSize: 12,
                    fontWeight: on ? 700 : 500,
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-end justify-between" style={{ background: "#F3F1FC", borderRadius: 14, padding: "14px 16px", gap: 12 }}>
          <div className="min-w-0">
            <p
              className="uppercase"
              style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", color: "#7D67D9" }}
            >
              Suggested weight
            </p>
            <p className="tabular-nums" style={{ margin: 0, lineHeight: "34px" }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: "#4A3AA0", letterSpacing: "-0.02em" }}>
                {suggested ?? "–"}
              </span>
              {suggested != null && <span style={{ fontSize: 13, fontWeight: 600, color: "#7D67D9", marginLeft: 4 }}>kg</span>}
            </p>
          </div>
          {ready && (
            <div className="text-right flex-none" style={{ paddingBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#5F5093" }}>
                {r} {r === 1 ? "rep" : "reps"} @ RPE {rpe}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "#5F5093" }}>{pct}% of 1RM</p>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};

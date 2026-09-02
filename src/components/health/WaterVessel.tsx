import React, { useEffect, useRef, useState } from "react";

// Design refinement §7.3: a 26×52 vessel replacing the Health water card's
// plain number — idle (alive without asking for attention), filling (fires
// briefly after a log), and over-goal (a colour shift, not a warning —
// drinking past goal isn't an error) states.
export const WaterVessel: React.FC<{ ml: number; goalMl: number }> = ({ ml, goalMl }) => {
  const [filling, setFilling] = useState(false);
  const prevMl = useRef(ml);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (ml > prevMl.current) {
      setFilling(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setFilling(false), 1700);
    }
    prevMl.current = ml;
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [ml]);

  const overGoal = ml > goalMl;
  const pct = Math.max(0, Math.min(1, ml / goalMl));
  const levelPct = overGoal ? 100 : pct * 100;
  const fillColor = overGoal ? "#74AFE3" : "rgb(var(--c-teal))";
  const crestSpeed = filling ? "animate-water-crest-fast" : "animate-water-crest";
  const crestSpeedRev = filling ? "animate-water-crest-fast-reverse" : "animate-water-crest-reverse";

  return (
    <div className="relative shrink-0" style={{ width: 26, height: 52 }}>
      {overGoal && (
        <>
          <span
            className="absolute -bottom-1 left-1 w-[3px] rounded-full animate-water-drip"
            style={{ height: 8, background: fillColor, animationDelay: "0ms" }}
          />
          <span
            className="absolute -bottom-1 right-1 w-[3px] rounded-full animate-water-drip"
            style={{ height: 8, background: fillColor, animationDelay: "700ms" }}
          />
        </>
      )}
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          borderRadius: "7px 7px 10px 10px",
          background: "rgba(162,200,194,0.18)",
          border: "1px solid rgba(162,200,194,0.42)",
        }}
      >
        <div
          className={clsxLevel(overGoal)}
          style={{
            height: `${levelPct}%`,
            background: fillColor,
            transition: "height 1.7s cubic-bezier(0.22,1,0.36,1), background 0.5s ease",
          }}
        >
          {/* two counter-rotating crests create a gently undulating
              surface — oversized circles clipped by the vessel's own
              overflow-hidden. */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-[66px] h-[66px] pointer-events-none">
            <span
              className={`absolute inset-0 rounded-[44%] bg-white/40 ${crestSpeed}`}
            />
            <span
              className={`absolute inset-0 rounded-[47%] bg-white/20 ${crestSpeedRev}`}
            />
          </div>
          {filling && (
            <>
              <span
                className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-white/70 animate-water-bubble"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-white/70 animate-water-bubble"
                style={{ animationDelay: "300ms" }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function clsxLevel(overGoal: boolean) {
  return `absolute bottom-0 left-0 right-0 ${overGoal ? "animate-water-swell" : ""}`;
}

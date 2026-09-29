import React from "react";

interface QuickActionsProps {
  onLogFood: () => void;
  onLogWorkout: () => void;
  onAddMetric: () => void;
  onVoiceLog: () => void;
}

// Design handoff item 4 "Home Quick Actions cluster" — replaces the old
// CSS-drawn three lavender pills + teal voice hub entirely with the
// supplied artwork (public/qa-cluster-ref-teal.png, already flattened to a
// white background with the hub recoloured to #95C0BB). The cluster is
// placed as-is; only four transparent hit areas are added on top, each
// wired to the same handler the old CSS pills used to call.
//
// The artwork (2164x727 source, ~2.977 aspect) was laid out on a 358x95.9
// crop window: rendered 411.64px wide at a -26.82 / -21.69 offset, with the
// hit areas at literal px positions inside it.
//
// FLUID, NOT 358px. Those px values are kept as the design grid and turned
// into fractions of the box, which takes the column's full width at a fixed
// aspect ratio. At 360px the column is 328px wide; the old fixed-px image and
// hit areas overflowed the capped box, cutting off "Log workout" and part of
// its tap target. Now the whole cluster scales as one piece.
const W = 358;
const H = 95.9;
const x = (px: number) => `${(px / W) * 100}%`;
const y = (px: number) => `${(px / H) * 100}%`;

export const QuickActions: React.FC<QuickActionsProps> = ({
  onLogFood,
  onLogWorkout,
  onAddMetric,
  onVoiceLog,
}) => {
  const hitAreaStyle: React.CSSProperties = {
    position: "absolute",
    background: "transparent",
    border: "none",
    padding: 0,
    margin: 0,
    cursor: "pointer",
  };

  return (
    <div className="animate-fade-slide-up">
      <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">Quick actions</p>

      <div
        className="relative overflow-hidden"
        // Vertical margins in % resolve against the width, so the crop's
        // -8 / -12 offsets scale with the cluster too.
        style={{ width: "100%", aspectRatio: `${W} / ${H}`, marginTop: x(-8), marginBottom: x(-12) }}
      >
        <img
          src="/qa-cluster-ref-teal.png"
          alt=""
          style={{
            position: "absolute",
            left: x(-26.82),
            top: y(-21.69),
            width: x(411.64),
            height: "auto",
            maxWidth: "none",
            display: "block",
            pointerEvents: "none",
          }}
        />

        {/* Log food */}
        <button
          onClick={onLogFood}
          aria-label="Log food"
          style={{ ...hitAreaStyle, left: 0, top: y(14.5), width: x(137.7), height: y(45.7) }}
        />

        {/* Log workout */}
        <button
          onClick={onLogWorkout}
          aria-label="Log workout"
          style={{ ...hitAreaStyle, left: x(219.6), top: y(14.5), width: x(138.4), height: y(45.7) }}
        />

        {/* Add metric */}
        <button
          onClick={onAddMetric}
          aria-label="Add metric"
          style={{ ...hitAreaStyle, left: x(129.1), top: y(72.3), width: x(100), height: y(23.5) }}
        />

        {/* Voice hub */}
        <button
          onClick={onVoiceLog}
          aria-label="Tell Centium what you ate"
          style={{ ...hitAreaStyle, left: x(142.3), top: y(-1.5), width: x(72.9), height: y(72.9), borderRadius: 9999 }}
        />
      </div>
    </div>
  );
};

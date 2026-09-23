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
// The artwork (2164x727 source, ~2.977 aspect) is rendered at a literal
// 411.64px width, which is taller than the 358x95.9 visible block — the
// block is a crop window over the artwork's own built-in padding, so the
// container clips with `overflow: hidden` while the image is positioned at
// the handoff's literal left/top offset inside it.
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
        // Master handover item 6: 358px wide, capped to the column so a phone
        // narrower than 390px never pushes it past the page edge.
        style={{ width: 358, maxWidth: "100%", height: 95.9, marginTop: -8, marginBottom: -12 }}
      >
        <img
          src="/qa-cluster-ref-teal.png"
          alt=""
          style={{
            position: "absolute",
            left: -26.82,
            top: -21.69,
            width: 411.64,
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
          style={{ ...hitAreaStyle, left: 0, top: 14.5, width: 137.7, height: 45.7 }}
        />

        {/* Log workout */}
        <button
          onClick={onLogWorkout}
          aria-label="Log workout"
          style={{ ...hitAreaStyle, left: 219.6, top: 14.5, width: 138.4, height: 45.7 }}
        />

        {/* Add metric */}
        <button
          onClick={onAddMetric}
          aria-label="Add metric"
          style={{ ...hitAreaStyle, left: 129.1, top: 72.3, width: 100, height: 23.5 }}
        />

        {/* Voice hub */}
        <button
          onClick={onVoiceLog}
          aria-label="Tell Centium what you ate"
          style={{ ...hitAreaStyle, left: 142.3, top: -1.5, width: 72.9, height: 72.9, borderRadius: 9999 }}
        />
      </div>
    </div>
  );
};

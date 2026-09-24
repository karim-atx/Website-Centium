import React from "react";
import type { BlockKind, Exercise, WorkoutBlock } from "../../types";
import { blockHeading, isRoundBased, prescriptionLine } from "../../services/workout/prescription";
export type { RenderRun } from "../../services/workout/blocks";

// A block, as it reads in a routine, a template or a curated program.
//
// ONE CARD FOR ALL THREE, because they are the same fact. The routine list and
// the program browser had grown separate one-line renderers and neither knew
// what a block was; giving each its own would have made three places to
// forget that an EMOM's reps are per round.
//
// NOT COLOUR ALONE. Each kind gets its own rail so the four are distinguishable
// at a glance, but the heading says which it is in words — "AMRAP · 12 min" —
// so the grouping survives greyscale, colour blindness and a screen reader,
// which reads the heading and never the rail.

/**
 * The rail colour per kind, from the app's fixed palette.
 *
 * DELIBERATELY NOT `--c-primary`, which the accent picker swaps: these four
 * have to stay distinguishable FROM EACH OTHER under every theme, and a
 * palette where one of them moves cannot promise that. Same reasoning as the
 * nav's brand accent and the widget library's fixed hues.
 */
const RAIL: Record<BlockKind, { rail: string; tint: string; ink: string }> = {
  superset: { rail: "#7D6BB5", tint: "rgba(125,107,181,0.08)", ink: "#5F5093" },
  amrap: { rail: "#4F8F8A", tint: "rgba(79,143,138,0.09)", ink: "#3C6B65" },
  emom: { rail: "#3F6E93", tint: "rgba(63,110,147,0.08)", ink: "#3F6E93" },
  for_time: { rail: "#8A5878", tint: "rgba(138,88,120,0.08)", ink: "#8A5878" },
};

/** What each kind is, in one clause, for the people who have not met EMOM. */
const EXPLANATION: Record<BlockKind, string> = {
  superset: "Run these together, no clock.",
  amrap: "As many rounds as possible in the time.",
  emom: "One round at the top of every interval.",
  for_time: "Finish the rounds as fast as you can.",
};

export const BlockCard: React.FC<{
  block: WorkoutBlock;
  /** This block's position among blocks of its own kind — letters a superset. */
  ordinal: number;
  members: Exercise[];
  /** Rendered after each member's line: the swipe actions, a gear, nothing. */
  renderMemberAction?: (exercise: Exercise) => React.ReactNode;
  /** The whole header, tapped — used by the editors to open block settings. */
  onHeaderClick?: () => void;
}> = ({ block, ordinal, members, renderMemberAction, onHeaderClick }) => {
  const colors = RAIL[block.kind];
  const perRound = isRoundBased(block.kind);
  const heading = blockHeading(block, ordinal);

  return (
    <section
      aria-label={heading}
      className="overflow-hidden"
      style={{
        borderRadius: 14,
        background: colors.tint,
        // The rail. A border rather than a child element so it cannot be
        // scrolled away from its own card.
        borderLeft: `4px solid ${colors.rail}`,
        margin: "6px 12px",
      }}
    >
      {React.createElement(
        onHeaderClick ? "button" : "div",
        {
          ...(onHeaderClick ? { onClick: onHeaderClick, className: "tap w-full text-left" } : {}),
          style: { display: "block", width: "100%", padding: "9px 12px 7px" },
        },
        <>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: colors.ink }}>{heading}</p>
          <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "#8C8378" }}>
            {EXPLANATION[block.kind]}
            {block.label?.trim() ? "" : ""}
          </p>
        </>
      )}

      <div style={{ background: "#FFFFFF", margin: "0 6px 6px", borderRadius: 10 }}>
        {members.length === 0 ? (
          <p style={{ margin: 0, padding: "10px 12px", fontSize: 11.5, color: "#8C8378" }}>
            Nothing in this block yet.
          </p>
        ) : (
          members.map((ex, i) => {
            const line = prescriptionLine(ex, { perRound });
            return (
              <div
                key={ex.id}
                className="flex items-center justify-between"
                style={{
                  gap: 8,
                  padding: "8px 12px",
                  borderTop: i === 0 ? "none" : "1px solid rgba(36,31,27,0.05)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#241F1B" }}>{ex.name}</p>
                  {line && (
                    <p style={{ margin: "1px 0 0", fontSize: 11, color: "#8C8378" }}>{line}</p>
                  )}
                </div>
                {renderMemberAction?.(ex)}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

import React from "react";
import type { BlockKind, Exercise, WorkoutBlock } from "../../types";
import { blockHeading, isRoundBased, prescriptionLine } from "../../services/workout/prescription";
import { liftTo, tintOn, DARK_SURFACE } from "../../data/folderColors";
import { useIsDark } from "../../hooks/useIsDark";
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
type BlockRail = { rail: string; tint: string; ink: string };
const RAIL: Record<BlockKind, BlockRail> = {
  superset: { rail: "rgb(var(--th-7d6bb5))", tint: "rgb(var(--th-7d6bb5) / 0.08)", ink: "rgb(var(--th-5f5093))" },
  amrap: { rail: "rgb(var(--th-4f8f8a))", tint: "rgb(var(--th-4f8f8a) / 0.09)", ink: "rgb(var(--th-3c6b65))" },
  emom: { rail: "#3F6E93", tint: "rgba(63,110,147,0.08)", ink: "#3F6E93" },
  for_time: { rail: "#8A5878", tint: "rgba(138,88,120,0.08)", ink: "#8A5878" },
};

/**
 * Mobile v5.1 R3, dark mode (no light islands): the handover has no dark
 * value for these, so each is derived from its rail hue the way the other
 * hued pastels are: the card tint is the hue at 16% on the dark card, the
 * rail itself is lifted until it holds 3:1 on the card (only For Time moves,
 * #8A5878 -> #8B5A79), and the ink is lifted until it reads at 4.5:1 on the
 * tint (5.2:1 or more on the plain card too).
 */
const DARK_RAIL = Object.fromEntries(
  (Object.entries(RAIL) as [BlockKind, BlockRail][]).map(([k, r]) => {
    const tint = tintOn(r.rail, 0.16);
    return [k, { rail: liftTo(r.rail, DARK_SURFACE.card, 3), tint, ink: liftTo(r.rail, tint) }];
  })
) as Record<BlockKind, BlockRail>;

/** The rails for the current mode. BlockRunner keeps a copy of both maps. */
const blockRails = (dark: boolean): Record<BlockKind, BlockRail> => (dark ? DARK_RAIL : RAIL);

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
  const dark = useIsDark();
  const colors = blockRails(dark)[block.kind];
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
          <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "rgb(var(--c-charcoal-muted))" }}>
            {EXPLANATION[block.kind]}
            {block.label?.trim() ? "" : ""}
          </p>
        </>
      )}

      <div style={{ background: "rgb(var(--c-cream-card))", margin: "0 6px 6px", borderRadius: 10 }}>
        {members.length === 0 ? (
          <p style={{ margin: 0, padding: "10px 12px", fontSize: 11.5, color: "rgb(var(--c-charcoal-muted))" }}>
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
                  borderTop: i === 0 ? "none" : "1px solid rgb(var(--c-charcoal) / 0.05)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "rgb(var(--c-charcoal))" }}>{ex.name}</p>
                  {line && (
                    <p style={{ margin: "1px 0 0", fontSize: 11, color: "rgb(var(--c-charcoal-muted))" }}>{line}</p>
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

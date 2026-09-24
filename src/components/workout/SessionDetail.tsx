import React from "react";
import type { LoggedSet, WorkoutSession } from "../../types";
import { blockResultLine, enduranceResultLine } from "../../services/workout/results";
import clsx from "clsx";

/**
 * One session's exercises, sets, block scores and endurance results.
 *
 * SHARED WITH THE PROFESSIONAL'S VIEW, which shows the same session under a
 * different heading — a second copy would be a second place to forget that a
 * skipped set is struck through or that a null outcome is not a skip.
 */
export const SessionDetail: React.FC<{ session: WorkoutSession }> = ({ session }) => {
  const resultById = new Map((session.blockResults ?? []).map((r) => [r.id, r]));
  // Which block is the first, second… of its own kind, so an unlabelled
  // superset is lettered the same way the routine lettered it.
  const ordinals = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const r of session.blockResults ?? []) {
    const n = seen.get(r.kind) ?? 0;
    ordinals.set(r.id, n);
    seen.set(r.kind, n + 1);
  }
  const shown = new Set<string>();

  return (
    <div className="divide-y divide-charcoal/[0.04]">
      {session.exercises.map((ex) => {
        const result = ex.blockResultId ? resultById.get(ex.blockResultId) : undefined;
        const heading = result && !shown.has(result.id) ? result : undefined;
        if (heading) shown.add(heading.id);
        return (
          <div key={ex.exerciseId} className="py-2">
            {/* THE BLOCK'S SCORE, above the first of its members. A round
                count belongs to the block, not to any one movement in it,
                and repeating it under each would state it three times. */}
            {heading && (
              <p className="text-[11px] font-bold text-primary-dark mb-1">
                {blockResultLine(heading, ordinals.get(heading.id) ?? 0)}
              </p>
            )}
            <p className="text-sm font-medium text-charcoal mb-1">{ex.name}</p>
            {ex.enduranceResult && (
              <p className="text-[11px] text-charcoal-soft mb-1">
                {enduranceResultLine(ex.enduranceResult)}
              </p>
            )}
            {ex.sets.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1">
                {ex.sets.map((s, i) => (
                  <SetSummary key={i} set={s} />
                ))}
              </div>
            )}
            {ex.sets.some((s) => s.notes) && (
              <div className="space-y-0.5">
                {ex.sets
                  .filter((s) => s.notes)
                  .map((s, i) => (
                    <p key={i} className="text-[11px] text-charcoal-soft italic">
                      Set {s.setNumber}: "{s.notes}"
                    </p>
                  ))}
              </div>
            )}
          </div>
        );
      })}
      {/* A block whose members were all logged under it still gets its line,
          but one whose exercises are missing — a routine edited since — would
          otherwise vanish, taking the score with it. */}
      {(session.blockResults ?? [])
        .filter((r) => !shown.has(r.id))
        .map((r) => (
          <p key={r.id} className="text-[11px] font-bold text-primary-dark py-2">
            {blockResultLine(r, ordinals.get(r.id) ?? 0)}
          </p>
        ))}
    </div>
  );
};

/**
 * One set, as "60kg × 8" plus how it went.
 *
 * THE OUTCOME IS THE REAL ONE, not an inference. This used to append
 * "(skipped)" to anything without `completed`, which called a set that was
 * attempted and failed a skip, and said nothing about a record at all.
 * Legacy rows carry no outcome and fall back to the flag — which is what
 * they have always meant.
 */
const SetSummary: React.FC<{ set: LoggedSet }> = ({ set: s }) => {
  const outcome = s.outcome ?? (s.completed ? "completed" : "skipped");
  return (
    <span
      className={clsx("text-[11px]", outcome === "skipped" && "line-through")}
      style={{
        color: s.isPr ? "#8A6318" : outcome === "failed" ? "#B0402F" : "#8C8378",
        fontWeight: s.isPr ? 700 : 400,
      }}
    >
      {s.weightKg}kg × {s.reps}
      {/* Named as well as coloured, so the three read apart in greyscale and
          to a screen reader. */}
      {outcome === "failed" && " · failed"}
      {s.isPr && " · PR"}
    </span>
  );
};

import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import {
  getExerciseInstructions,
  hasNoInstructions,
  type ExerciseInstructions,
} from "../../services/exercises";
import { useIsDark } from "../../hooks/useIsDark";

const heading: React.CSSProperties = { margin: "0 0 10px", fontSize: 14, lineHeight: "18px", fontWeight: 700, color: "rgb(var(--c-charcoal))" };
const body: React.CSSProperties = { fontSize: 13, lineHeight: "19px", color: "rgb(var(--c-charcoal-soft))" };

// Mobile v5.1 R3, dark mode (no light islands), as [light, dark]: the lavender
// ink takes primary.deeper dark, the step badge primary.tint dark and the
// image backdrop primary.tint.2 dark.
const COLORS = {
  ink: ["#5F5093", "#C8BFE9"],
  badge: ["#F0EDF9", "#303141"],
  imageBg: ["#F4F2FA", "#2B2C3A"],
} as const;

const Bullets: React.FC<{ items: string[] }> = ({ items }) => (
  <ul style={{ margin: 0, padding: 0, listStyle: "none" }} className="flex flex-col" >
    {items.map((t, i) => (
      <li key={i} className="flex items-start" style={{ gap: 11, marginTop: i ? 6 : 0, ...body, fontSize: 12.5 }}>
        <span aria-hidden className="flex-none rounded-full" style={{ width: 4, height: 4, marginTop: 8, background: "#AEA1DC" }} />
        <span className="min-w-0">{t}</span>
      </li>
    ))}
  </ul>
);

/**
 * WO13 · Exercise information, over the exercise popup (closing returns to
 * it). The exercise's name as the title, its demo image only when it has one
 * (approved: no empty placeholder box; no exercise has media yet, and no image
 * is borrowed from another movement), then
 * the real instructions (approved decision): How to do it (setup, then the
 * numbered steps), Tips (coaching cues), Breathing, Common mistakes, Safety,
 * easier / harder variations and the difficulty. "Instructions coming soon"
 * when the exercise has none.
 */
export const ExerciseInfoSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  name: string;
  /** The row to read: a catalog exercise or one of the user's own. */
  source: { id: string; kind: "catalog" | "custom" } | null;
  /** The exercise's own demo image, when it has one. */
  imageUrl?: string | null;
}> = ({ open, onClose, name, source, imageUrl }) => {
  const [state, setState] = useState<{ key: string; instructions: ExerciseInstructions | null; error?: string } | null>(null);
  const key = source ? `${source.kind}:${source.id}` : "";
  const dark = useIsDark();
  const c = (k: keyof typeof COLORS) => COLORS[k][dark ? 1 : 0];

  useEffect(() => {
    if (!open || !source) return;
    let cancelled = false;
    void getExerciseInstructions(source.id, source.kind).then((r) => {
      if (!cancelled) setState({ key: `${source.kind}:${source.id}`, instructions: r.instructions, error: r.ok ? undefined : r.message });
    });
    return () => {
      cancelled = true;
    };
  }, [open, source]);

  const loaded = state?.key === key ? state : null;
  const i = loaded?.instructions ?? null;

  return (
    <BottomSheet open={open} onClose={onClose} title={name}>
      <div className="animate-fade-slide-up">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`${name} demonstration`}
            className="w-full object-cover"
            style={{ height: 190, borderRadius: 16, background: c("imageBg"), marginBottom: 22 }}
          />
        )}

        {!source ? (
          <p className="text-center" style={{ ...body, marginTop: 2 }}>Instructions coming soon</p>
        ) : !loaded ? (
          <p className="text-center text-sm text-charcoal-faint" style={{ marginTop: 2 }}>Loading…</p>
        ) : loaded.error ? (
          <p className="text-center text-sm text-status-high" style={{ marginTop: 2 }}>{loaded.error}</p>
        ) : hasNoInstructions(i) ? (
          <p className="text-center" style={{ ...body, marginTop: 2 }}>Instructions coming soon</p>
        ) : (
          i && (
            <div className="flex flex-col" style={{ gap: 22 }}>
              {i.difficulty && (
                <p style={{ margin: "-8px 0 -8px", fontSize: 11.5, fontWeight: 700, color: c("ink") }}>
                  {i.difficulty[0].toUpperCase() + i.difficulty.slice(1)}
                </p>
              )}

              {(i.setup.length > 0 || i.steps.length > 0) && (
                <section>
                  <h3 style={heading}>How to do it</h3>
                  {i.setup.length > 0 && (
                    <div style={{ marginBottom: i.steps.length ? 12 : 0 }}>
                      <Bullets items={i.setup} />
                    </div>
                  )}
                  <ol style={{ margin: 0, padding: 0, listStyle: "none" }} className="flex flex-col">
                    {i.steps.map((step, n) => (
                      <li key={n} className="flex items-start" style={{ gap: 10, marginTop: n ? 8 : 0 }}>
                        <span
                          className="flex-none flex items-center justify-center rounded-full"
                          style={{ width: 20, height: 20, background: c("badge"), color: c("ink"), fontSize: 11, fontWeight: 700 }}
                        >
                          {n + 1}
                        </span>
                        <span className="min-w-0" style={body}>{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {i.cues.length > 0 && (
                <section>
                  <h3 style={heading}>Tips</h3>
                  <Bullets items={i.cues} />
                </section>
              )}

              {i.breathing && (
                <section>
                  <h3 style={heading}>Breathing</h3>
                  <p style={{ ...body, margin: 0 }}>{i.breathing}</p>
                </section>
              )}

              {i.commonMistakes.length > 0 && (
                <section>
                  <h3 style={heading}>Common mistakes</h3>
                  <Bullets items={i.commonMistakes} />
                </section>
              )}

              {i.safetyNotes.length > 0 && (
                <section>
                  <h3 style={heading}>Safety</h3>
                  <Bullets items={i.safetyNotes} />
                </section>
              )}

              {(i.easierVariation || i.harderVariation) && (
                <section>
                  <h3 style={heading}>Variations</h3>
                  <div className="flex flex-col" style={{ gap: 4, ...body }}>
                    {i.easierVariation && (
                      <p style={{ margin: 0 }}>
                        <b style={{ color: "rgb(var(--c-charcoal))", fontWeight: 600 }}>Easier:</b> {i.easierVariation}
                      </p>
                    )}
                    {i.harderVariation && (
                      <p style={{ margin: 0 }}>
                        <b style={{ color: "rgb(var(--c-charcoal))", fontWeight: 600 }}>Harder:</b> {i.harderVariation}
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>
          )
        )}
      </div>
    </BottomSheet>
  );
};

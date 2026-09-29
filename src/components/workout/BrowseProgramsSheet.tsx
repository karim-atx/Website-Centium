import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { getPublicTemplates } from "../../services/templates";
import { UnverifiedProgramNotice } from "./UnverifiedProgramNotice";
import type { WorkoutTemplate } from "../../types";
import { ChevronLeft, Check } from "lucide-react";
import { BlockCard } from "./BlockCard";
import { groupIntoRuns } from "../../services/workout/blocks";
import { prescriptionLine } from "../../services/workout/prescription";
import { formatCompactDuration } from "../../services/workout";
import { LEVEL_COLORS, LEVEL_ORDER, levelColors, levelName } from "../../data/levelColors";

// Browsing the curated starter programs, and taking one for yourself.
//
// THE OTHER DOOR. assign_template_to_client deliberately refuses curated
// content — nobody owns it, so nobody may push it at somebody else — which
// left the nine seeded programs readable by everyone and usable by no one.
// adopt_workout_template is the self-service counterpart, and this is the
// screen in front of it.
//
// A COPY, NOT A SUBSCRIPTION. Adopting creates a fresh routine owned by the
// user, with no assignment row and no link that would let a later edit to the
// curated template reach them. So adopting the same program twice gives two
// independent routines — the honest consequence of "it's yours now" rather
// than a bug to guard against.
//
// READ IS SESSION-FREE, WRITE IS NOT. getPublicTemplates runs signed out by
// design (curated content is anon-readable, and it avoids the embed that made
// the general template read fail for anon). Adoption needs an account, so the
// action degrades to a sign-in prompt rather than a button that fails.

// The local prescription renderer that used to live here is gone. It showed
// `${sets} sets × ${reps} reps` and the five legacy cardio numbers, so a
// curated program with a rep range or an endurance plan read as neither —
// and it was the third such renderer in the app. services/workout/prescription
// is the one that all of them use now.

// Handover 2026-09-29 WO20: the list is a two-column grid of level-coloured
// tiles; the unreviewed-program notice is removed from the tiles.

/** "~45m", "~1h 10m" (the compact duration format, 02). */
const aboutDuration = (p: WorkoutTemplate) => (p.durationMin ? `~${formatCompactDuration(p.durationMin * 60)}` : null);
const exerciseCount = (p: WorkoutTemplate) => `${p.exercises.length} exercise${p.exercises.length === 1 ? "" : "s"}`;

export const BrowseProgramsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { authUserId, adoptTemplate } = useApp();

  const [programs, setPrograms] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WorkoutTemplate | null>(null);
  const [adopting, setAdopting] = useState(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);

  // THE EFFECT ONLY FETCHES. Resetting the screen belongs to `close` below,
  // which is a real user event — doing it here would be setState in an effect
  // for something no external system asked for, and would flash the previous
  // detail view on reopen.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void getPublicTemplates().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setLoadError(result.message ?? "Couldn't load the starter programs.");
        return;
      }
      setLoadError(null);
      setPrograms(result.templates);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const close = () => {
    setSelected(null);
    setAdoptError(null);
    setAdded([]);
    onClose();
  };

  const adopt = async (program: WorkoutTemplate) => {
    setAdopting(true);
    setAdoptError(null);
    const message = await adoptTemplate(program.id);
    setAdopting(false);
    if (message) {
      setAdoptError(message);
      return;
    }
    // Kept open on success: adding a second program is a normal next step, and
    // the list says which ones are already in the user's routines.
    setAdded((prev) => [...prev, program.id]);
    setSelected(null);
  };

  const meta = (p: WorkoutTemplate) =>
    [
      p.level ? p.level[0].toUpperCase() + p.level.slice(1) : null,
      p.durationMin ? `~${p.durationMin} min` : null,
      `${p.exercises.length} exercise${p.exercises.length === 1 ? "" : "s"}`,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={selected ? selected.name : "Starter programs"}
    >
      <div className="space-y-4 animate-fade-slide-up">
        {selected ? (
          <>
            <button
              onClick={() => setSelected(null)}
              className="tap flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <ChevronLeft size={14} /> All programs
            </button>

            {/* THE FULL DISCLAIMER SITS ABOVE THE ACTION, not below it: this is
                the screen where someone decides to take the program on. */}
            <UnverifiedProgramNotice isVerified={selected.isVerified} isPublic={selected.isPublic} />

            {selected.description && (
              <p className="text-[12.5px] text-charcoal-soft leading-relaxed">
                {selected.description}
              </p>
            )}
            <p className="text-[11px] font-medium text-charcoal-faint">{meta(selected)}</p>

            <div>
              <p className="section-label text-charcoal-faint mb-2">Exercises</p>
              {/* BLOCKS RENDER HERE TOO, and "no blocks" is the ordinary case
                  rather than an error: a curated program written before blocks
                  existed has none, and anon cannot read the curated block rows
                  until the database follow-up lands. groupIntoRuns simply
                  returns one solo run per exercise then, which is exactly what
                  this used to draw. */}
              <div className="space-y-1.5">
                {groupIntoRuns(selected.exercises, selected.blocks ?? []).map((run) =>
                  run.block ? (
                    <div key={run.block.id} style={{ margin: "0 -12px" }}>
                      <BlockCard block={run.block} ordinal={run.ordinal} members={run.members} />
                    </div>
                  ) : (
                    run.members.map((ex) => {
                      const line = prescriptionLine(ex);
                      return (
                        <div key={ex.id} className="bg-cream-soft rounded-xl px-3 py-2">
                          <p className="text-sm font-medium text-charcoal">{ex.name}</p>
                          {line && <p className="text-[11px] text-charcoal-faint">{line}</p>}
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>

            {adoptError && (
              <p className="text-[11.5px] font-semibold text-status-high text-center">{adoptError}</p>
            )}

            {authUserId ? (
              <Button
                fullWidth
                size="lg"
                onClick={() => void adopt(selected)}
                disabled={adopting}
              >
                {adopting ? "Adding…" : "Add to my routines"}
              </Button>
            ) : (
              // The app has no signed-out route today, so this is a guard
              // rather than a screen anyone reaches. If a public browse page
              // ever exists, the read already works there and this says why
              // the action does not.
              <p className="text-center text-[12.5px] text-charcoal-soft">
                Sign in to add this program to your routines.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-[12.5px] leading-[20px]" style={{ margin: 0, color: "#5B5349" }}>
              Ready-made programs to start from. Adding one copies it into your routines, where you can change anything. The
              original stays as it is.
            </p>

            {/* WO20: what the tile colours mean. */}
            <div className="flex items-center flex-wrap" style={{ columnGap: 14, rowGap: 4 }}>
              {LEVEL_ORDER.map((level) => (
                <span key={level} className="flex items-center" style={{ gap: 6, fontSize: 10, lineHeight: "14px", color: "#5B5349" }}>
                  <span aria-hidden className="rounded-full flex-none" style={{ width: 8, height: 8, background: LEVEL_COLORS[level].dot }} />
                  {levelName(level)}
                </span>
              ))}
            </div>

            {loading && <p className="text-center text-sm text-charcoal-faint py-6">Loading programs…</p>}
            {loadError && !loading && <p className="text-center text-sm text-status-high py-6">{loadError}</p>}
            {!loading && !loadError && programs.length === 0 && (
              <p className="text-center text-sm text-charcoal-faint py-6">No starter programs available yet.</p>
            )}

            {/* Two columns; tiles hug their content and each row takes its
                taller tile's height (grid stretch). The whole tile is the button. */}
            <div className="grid grid-cols-2" style={{ gap: 10 }}>
              {programs.map((p) => {
                const c = levelColors(p.level);
                const duration = aboutDuration(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelected(p);
                      setAdoptError(null);
                    }}
                    className="tap flex flex-col items-start text-left min-w-0"
                    style={{ background: c.tile, borderRadius: 16, padding: "12px 13px 13px" }}
                  >
                    <span
                      className="line-clamp-2"
                      style={{ fontSize: 14.5, lineHeight: "19px", fontWeight: 600, color: "#241F1B" }}
                    >
                      {p.name}
                    </span>
                    {(p.level || added.includes(p.id)) && (
                      <span className="flex items-center" style={{ gap: 6, marginTop: 6, fontSize: 11, lineHeight: "14px", fontWeight: 700, color: c.label }}>
                        {p.level && levelName(p.level)}
                        {added.includes(p.id) && (
                          <span className="flex items-center" style={{ gap: 2 }}>
                            <Check size={10} strokeWidth={3} /> Added
                          </span>
                        )}
                      </span>
                    )}
                    <span style={{ marginTop: 2, fontSize: 11, lineHeight: "14px", color: "#5B5349" }}>
                      {duration && (
                        <>
                          <span className="whitespace-nowrap">{duration}</span> ·{" "}
                        </>
                      )}
                      <span className="whitespace-nowrap">{exerciseCount(p)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
};

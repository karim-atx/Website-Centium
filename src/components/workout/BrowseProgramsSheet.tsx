import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { getPublicTemplates } from "../../services/templates";
import { UnverifiedProgramNotice } from "./UnverifiedProgramNotice";
import type { Exercise, WorkoutTemplate } from "../../types";
import { ChevronLeft, ChevronRight, Check, Clock, Dumbbell } from "lucide-react";

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

/**
 * What one line of a program actually prescribes.
 *
 * REPS ARE NOT PRINTED FOR CARDIO, and this was worth fixing rather than
 * copying from the other exercise lists. The reader defaults a missing `reps`
 * to 10 so strength surfaces always have a number; Runner's Program prescribes
 * `reps` null and `cardio_duration_min` 20, and printing "1 sets × 10 reps"
 * for an easy run both invented a number and hid the real one. On a screen
 * whose whole point is being straight about unreviewed programming, that is
 * exactly the wrong place to show a made-up figure.
 */
function prescription(ex: Exercise): string {
  const isCardio = ex.classification === "cardio" || ex.classification === "duration";
  const parts = isCardio
    ? [
        ex.sets && ex.sets > 1 ? `${ex.sets} ×` : null,
        ex.cardioDurationMin ? `${ex.cardioDurationMin} min` : null,
        ex.cardioDistanceKm ? `${ex.cardioDistanceKm} km` : null,
        ex.cardioInclinePct ? `${ex.cardioInclinePct}% incline` : null,
        ex.cardioPaceMinPerKm ? `${ex.cardioPaceMinPerKm} min/km` : null,
      ]
    : [
        `${ex.sets} sets × ${ex.reps} reps`,
        ex.weightKg ? `${ex.weightKg}kg` : null,
        ex.rpe ? `RPE ${ex.rpe}` : null,
        ex.tempo ? `Tempo ${ex.tempo}` : null,
      ];

  const body = parts.filter(Boolean).join(" ").trim();
  const rest = ex.restSeconds ? `Rest ${ex.restSeconds}s` : null;
  return [body || null, rest].filter(Boolean).join(" · ");
}

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
              <div className="space-y-1.5">
                {selected.exercises.map((ex) => (
                  <div key={ex.id} className="bg-cream-soft rounded-xl px-3 py-2">
                    <p className="text-sm font-medium text-charcoal">{ex.name}</p>
                    <p className="text-[11px] text-charcoal-faint">{prescription(ex)}</p>
                  </div>
                ))}
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
            <p className="text-[12.5px] text-charcoal-soft leading-relaxed">
              Ready-made programs to start from. Adding one copies it into your own routines, where
              you can change anything — the original never changes underneath you.
            </p>

            {loading && (
              <p className="text-center text-sm text-charcoal-faint py-6">Loading programs…</p>
            )}
            {loadError && !loading && (
              <p className="text-center text-sm text-status-high py-6">{loadError}</p>
            )}
            {!loading && !loadError && programs.length === 0 && (
              <p className="text-center text-sm text-charcoal-faint py-6">
                No starter programs available yet.
              </p>
            )}

            <div className="space-y-2">
              {programs.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelected(p);
                    setAdoptError(null);
                  }}
                  className="tap w-full flex items-center justify-between gap-3 bg-cream-soft rounded-2xl px-3.5 py-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-charcoal truncate flex items-center gap-1.5">
                      <Dumbbell size={13} className="text-primary-dark shrink-0" />
                      {p.name}
                      {added.includes(p.id) && (
                        <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                          <Check size={10} strokeWidth={3} /> Added
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-charcoal-faint flex items-center gap-1">
                      <Clock size={10} className="shrink-0" />
                      {meta(p)}
                    </p>
                    {/* Compact form on every row, so the caveat is visible
                        while scanning rather than only after opening one. */}
                    <UnverifiedProgramNotice
                      isVerified={p.isVerified}
                      isPublic={p.isPublic}
                      variant="compact"
                      className="mt-0.5"
                    />
                  </div>
                  <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
};

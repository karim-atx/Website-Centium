import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { getPublicTemplates } from "../../services/templates";
import type { WorkoutTemplate } from "../../types";
import { ChevronLeft, Check } from "lucide-react";
import { BlockCard } from "./BlockCard";
import { groupIntoRuns } from "../../services/workout/blocks";
import { formatCompactDuration } from "../../services/workout";
import { programRow } from "../../services/workout/programRow";
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
//
// Handover 2026-09-29: WO20 is the list (a two-column grid of level-coloured
// tiles), WO21 the detail (the sheet takes the program's level colours). The
// unreviewed-program notice is removed from both (approved decision).

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

  const tone = selected ? levelColors(selected.level) : null;

  return (
    <BottomSheet
      light
      open={open}
      onClose={close}
      title={selected ? selected.name : "Starter programs"}
      tone={tone ? { band: tone.band, border: tone.deep, title: tone.deep, body: tone.body } : undefined}
      footer={
        selected && tone ? (
          authUserId ? (
            <button
              onClick={() => void adopt(selected)}
              disabled={adopting}
              className="tap w-full flex items-center justify-center disabled:opacity-60"
              style={{ height: 52, borderRadius: 16, background: tone.deep, color: "#FFFFFF", fontSize: 14, fontWeight: 700 }}
            >
              {adopting ? "Adding…" : "Add to my routines"}
            </button>
          ) : (
            // The app has no signed-out route today, so this is a guard
            // rather than a screen anyone reaches. If a public browse page
            // ever exists, the read already works there and this says why
            // the action does not.
            <p className="text-center text-[12.5px] text-charcoal-soft">Sign in to add this program to your routines.</p>
          )
        ) : undefined
      }
    >
      {selected && tone ? (
        <div className="space-y-4 animate-fade-slide-up">
          <button
            onClick={() => setSelected(null)}
            className="tap flex items-center gap-1 text-xs font-semibold"
            style={{ color: tone.deep }}
          >
            <ChevronLeft size={14} /> All programs
          </button>

          {/* WO21: description and meta on a white card (exercise-row width and radius). */}
          <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "12px 14px 14px" }}>
            {selected.description && (
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: "20px", color: "#5B5349" }}>{selected.description}</p>
            )}
            <p style={{ margin: selected.description ? "8px 0 0" : 0, fontSize: 11, fontWeight: 500, color: "#8C8378" }}>
              {[selected.level ? levelName(selected.level) : null, aboutDuration(selected), exerciseCount(selected)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div>
            <p className="section-label" style={{ color: tone.deep, marginBottom: 10 }}>
              Exercises
            </p>
            {/* BLOCKS RENDER HERE TOO, and "no blocks" is the ordinary case
                rather than an error: a curated program written before blocks
                existed has none, and anon cannot read the curated block rows
                until the database follow-up lands. groupIntoRuns simply
                returns one solo run per exercise then. */}
            <div className="space-y-1.5">
              {groupIntoRuns(selected.exercises, selected.blocks ?? []).map((run) =>
                run.block ? (
                  <div key={run.block.id} style={{ margin: "0 -12px" }}>
                    <BlockCard block={run.block} ordinal={run.ordinal} members={run.members} />
                  </div>
                ) : (
                  run.members.map((ex) => {
                    const row = programRow(ex);
                    // WO21 split card: the name in the light level tint, the
                    // value in a fixed-width deeper block with a crisp edge.
                    return (
                      <div key={ex.id} className="flex overflow-hidden" style={{ borderRadius: 12, minHeight: 48 }}>
                        <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ background: tone.row, padding: "8px 14px" }}>
                          <p style={{ margin: 0, fontSize: 14, lineHeight: "19px", fontWeight: 500, color: "#241F1B" }}>{ex.name}</p>
                          {row.detail && (
                            <p style={{ margin: "1px 0 0", fontSize: 11, lineHeight: "16px", color: "#8C8378" }}>{row.detail}</p>
                          )}
                        </div>
                        {row.value && (
                          <div
                            className="flex-none flex flex-col items-center justify-center text-center"
                            style={{ width: 76, background: tone.value, padding: "0 4px" }}
                          >
                            <span style={{ fontSize: 14, lineHeight: "17px", fontWeight: 800, color: tone.deep, whiteSpace: "nowrap" }}>
                              {row.value}
                            </span>
                            <span style={{ fontSize: 9, lineHeight: "12px", fontWeight: 600, color: tone.deep, opacity: 0.8, whiteSpace: "nowrap" }}>
                              {row.label}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          {adoptError && <p className="text-[11.5px] font-semibold text-status-high text-center">{adoptError}</p>}
        </div>
      ) : (
        <div className="space-y-4 animate-fade-slide-up">
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
        </div>
      )}
    </BottomSheet>
  );
};

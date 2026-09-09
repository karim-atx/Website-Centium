import React, { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { WaterFillContainer } from "../dashboard/WaterFillContainer";
import { useApp } from "../../context/AppContext";
import { Droplet } from "lucide-react";

// V4: "Pressing on the water widget should indicate only water details
// instead of showing the add metric pop-up" — its own sheet with a goal
// slider and a total-consumed slider (water is the one metric that stays
// user-editable; the rest are auto-sourced from Apple/Android Health).
export const WaterDetailSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { water, waterGoalMl, setWaterAmount, setWaterGoal, selectedDate } = useApp();
  const [goalDraft, setGoalDraft] = useState(waterGoalMl);
  const [amountDraft, setAmountDraft] = useState(water);
  const [error, setError] = useState<string | null>(null);

  // The draft was seeded once at mount and never resynced. That was invisible
  // while water lived only in localStorage and was therefore correct the
  // instant this component rendered; now it arrives from Supabase after the
  // first paint, so a sheet opened early would show a stale number and then
  // write it back on the next drag. Reseeding on open also picks up a change
  // of day from the Home date selector.
  useEffect(() => {
    if (open) {
      setAmountDraft(water);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedDate, water]);

  // Sends the value the thumb was released on. Failure leaves the draft where
  // the user put it and says so, rather than snapping the slider back to a
  // number they did not choose.
  //
  // Guarded on the value actually having changed, because release is not the
  // same event as movement: clicking the track without dragging, and holding
  // an arrow key so it auto-repeats, both fire it. Without this, a gesture
  // that changed nothing still appends a row saying the total is what it
  // already was.
  const lastCommitted = useRef(water);
  useEffect(() => {
    if (open) lastCommitted.current = water;
  }, [open, water]);

  const commitAmount = async () => {
    if (amountDraft === lastCommitted.current) return;
    setError(null);
    const target = amountDraft;
    const result = await setWaterAmount(target);
    if (!result.ok) {
      setError(result.message ?? "Couldn't save that.");
      return;
    }
    lastCommitted.current = target;
  };

  const pct = amountDraft / goalDraft;
  const exceeded = pct > 1;

  return (
    <BottomSheet open={open} onClose={onClose} title="Water">
      <div className="animate-fade-slide-up">
        <div className="flex items-center gap-4 mb-6">
          <WaterFillContainer pct={pct} height={90} width={54} orientation="vertical" />
          <div>
            <p className="text-3xl font-bold text-charcoal leading-none mb-1">
              {(amountDraft / 1000).toFixed(2)}L
            </p>
            <p className="text-xs text-charcoal-faint">of {(goalDraft / 1000).toFixed(1)}L goal</p>
            <p className={`text-xs font-semibold mt-1 ${exceeded ? "text-gold" : "text-sky"}`}>
              {Math.round(pct * 100)}% today
            </p>
          </div>
        </div>

        {exceeded && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gold bg-gold-pale rounded-full px-3 py-1.5 w-fit mb-5 animate-fade-slide-up">
            🎉 Goal exceeded — great hydration today!
          </p>
        )}

        <label className="block mb-5">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 flex items-center gap-1.5">
            <Droplet size={12} /> Consumed today
          </span>
          <input
            type="range"
            min={0}
            max={5000}
            step={100}
            value={amountDraft}
            /* COMMITTED ON RELEASE, NOT PER TICK. A range input fires
               onChange on every step of a drag, so writing there would send a
               row per step — dozens of round trips for one gesture, and a
               stored value that flickered through every position the thumb
               passed on the way. The draft moves the UI immediately; the write
               happens once, when the drag ends. */
            onChange={(e) => setAmountDraft(Number(e.target.value))}
            onPointerUp={() => void commitAmount()}
            onKeyUp={() => void commitAmount()}
            className="w-full"
            style={{ accentColor: "rgb(var(--c-sky))" }}
          />
          <p className={`text-xs mt-1 ${error ? "text-status-high" : "text-charcoal-faint"}`}>
            {error ?? `${(amountDraft / 1000).toFixed(1)}L`}
          </p>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Daily goal</span>
          <input
            type="range"
            min={1000}
            max={5000}
            step={100}
            value={goalDraft}
            onChange={(e) => {
              const v = Number(e.target.value);
              setGoalDraft(v);
              setWaterGoal(v);
            }}
            className="w-full"
            style={{ accentColor: "rgb(var(--c-sky))" }}
          />
          <p className="text-xs text-charcoal-faint mt-1">{(goalDraft / 1000).toFixed(1)}L / day</p>
        </label>
      </div>
    </BottomSheet>
  );
};

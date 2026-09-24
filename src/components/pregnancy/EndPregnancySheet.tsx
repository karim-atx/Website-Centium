import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { endPregnancy, shiftDay, type PregnancyOutcome } from "../../services/pregnancy";
import * as G from "../../services/pregnancy/guidance";

// Ending pregnancy tracking.
//
// THREE BUTTONS OF EQUAL WEIGHT, and the words are in guidance.ts where they
// can be reviewed. Nothing here congratulates and nothing commiserates: a list
// of options is not the place for either, and somebody reaching for the second
// one does not need an app's feelings before it has registered what happened.
//
// THE OUTCOME DECIDES WHAT HAPPENS NEXT, and only these two things:
//   birth → postpartum_until is set, the tracker stays ON, and predictions
//           resume with POSTPARTUM_BODY saying how rough they will be.
//   loss  → cycle_settings.tracker_enabled goes false, which is what actually
//           pauses my_cycle_prediction(). The user turns it back on when they
//           want to, from here or from Settings. Nothing is deleted either way.
// `other` ends tracking and changes nothing else, because the app does not
// know what happened and should not guess.

const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const OUTCOMES: readonly PregnancyOutcome[] = ["birth", "loss", "other"];

export const EndPregnancySheet: React.FC<{
  open: boolean;
  onClose: () => void;
  pregnancyId: string;
  onEnded: () => void;
}> = ({ open, onClose, pregnancyId, onEnded }) => {
  const { saveCycleSettingsAndReload } = useApp();
  const [outcome, setOutcome] = useState<PregnancyOutcome | null>(null);
  const [endedOn, setEndedOn] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOutcome(null);
    setError(null);
    onClose();
  };

  const save = async () => {
    if (!outcome) return;
    setBusy(true);
    setError(null);
    const result = await endPregnancy(
      pregnancyId,
      outcome,
      endedOn,
      outcome === "birth" ? shiftDay(endedOn, G.POSTPARTUM_WEEKS * 7) : null
    );
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    if (outcome === "loss") {
      const paused = await saveCycleSettingsAndReload({ trackerEnabled: false });
      if (!paused.ok) {
        // The pregnancy HAS ended at this point, so this is not a failure to
        // report as one — it is one half of the change not landing. Say what
        // did not happen, plainly, and leave the sheet open.
        setBusy(false);
        setError("Tracking ended, but cycle estimates couldn't be paused. Try from Settings.");
        return;
      }
    }
    setBusy(false);
    onEnded();
    close();
  };

  return (
    <BottomSheet open={open} onClose={close} title={G.END_TITLE}>
      <div className="animate-fade-slide-up">
        <div className="space-y-2">
          {OUTCOMES.map((o) => (
            <button
              key={o}
              onClick={() => setOutcome(o)}
              className={`tap w-full text-left rounded-xl px-3.5 py-3 text-[12.5px] font-semibold ${
                outcome === o ? "bg-primary text-white" : "bg-cream-soft text-charcoal"
              }`}
            >
              {G.END_OUTCOME_LABEL[o]}
            </button>
          ))}
        </div>

        {outcome && (
          <>
            <label className="block mt-3.5 text-[11px] font-bold text-charcoal mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={endedOn}
              max={todayISO()}
              onChange={(e) => setEndedOn(e.target.value)}
              className="w-full rounded-xl bg-cream-soft px-3.5 py-2.5 text-[13px] text-charcoal"
            />

            <p className="mt-3 text-[11.5px] leading-relaxed text-charcoal-soft">
              {outcome === "birth"
                ? G.POSTPARTUM_BODY
                : outcome === "loss"
                  ? G.LOSS_PAUSE_EXPLAINER
                  : "Nothing you've logged is deleted, and cycle estimates carry on as before."}
            </p>
          </>
        )}

        {error && <p className="mt-2.5 text-[11.5px] font-semibold text-status-high">{error}</p>}

        <div className="flex gap-2 mt-4">
          <Button fullWidth variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button fullWidth disabled={busy || !outcome} onClick={() => void save()}>
            {G.END_CONFIRM}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};

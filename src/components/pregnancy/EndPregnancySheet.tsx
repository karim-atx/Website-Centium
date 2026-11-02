import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { CalendarPickerSheet } from "../dashboard/CalendarPickerSheet";
import { partBSheetTone } from "../health/log/LogSheetParts";
import { useApp } from "../../context/AppContext";
import { endPregnancy, shiftDay, type PregnancyOutcome } from "../../services/pregnancy";
import * as G from "../../services/pregnancy/guidance";
import { CycleDateField, OptionButton, type } from "../cycle/cycleUi";
import { useIsDark } from "../../hooks/useIsDark";
import { t } from "../../i18n/core";

// Ending pregnancy tracking (HE1.10.b K1), in the Part B lavender-header
// sheet (chrome "partB", pinned footer).
//
// THREE OPTIONS OF EQUAL WEIGHT, and the words are in guidance.ts where they
// can be reviewed. Nothing here congratulates and nothing commiserates: a list
// of options is not the place for either.
//
// THE OUTCOME DECIDES WHAT HAPPENS NEXT, and only these two things:
//   birth → postpartum_until is set, the tracker stays ON, and predictions
//           resume with POSTPARTUM_BODY saying how rough they will be.
//   loss  → cycle_settings.tracker_enabled goes false, which is what actually
//           pauses my_cycle_prediction(). The user turns it back on when they
//           want to, from the Cycle tab or Settings. Nothing is deleted.
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
  const dark = useIsDark();
  const [outcome, setOutcome] = useState<PregnancyOutcome | null>(null);
  const [endedOn, setEndedOn] = useState(todayISO());
  const [pickerOpen, setPickerOpen] = useState(false);
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
    const result = await endPregnancy(pregnancyId, outcome, endedOn, outcome === "birth" ? shiftDay(endedOn, G.POSTPARTUM_WEEKS * 7) : null);
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    if (outcome === "loss") {
      // Recorded as the owner's own choice (Task R), so the app never asks
      // "Turn period tracking back on?" about this pause.
      const paused = await saveCycleSettingsAndReload({
        trackerEnabled: false,
        trackerChosenAt: new Date().toISOString(),
      });
      if (!paused.ok) {
        // The pregnancy HAS ended at this point: say what did not happen,
        // plainly, and leave the sheet open.
        setBusy(false);
        setError(t("Tracking ended, but cycle estimates couldn't be paused. Try from Settings."));
        return;
      }
    }
    setBusy(false);
    onEnded();
    close();
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={close}
        title={G.END_TITLE}
        chrome="partB"
        tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={
          <div>
            {error && (
              <p role="alert" className="text-status-high" style={type(11.5, 17.3, 600, { marginBottom: 10 })}>
                {t(error)}
              </p>
            )}
            <CtaButton label={G.END_CONFIRM} disabled={!outcome} loading={busy} onClick={() => void save()} style={{ lineHeight: "21px" }} />
          </div>
        }
      >
        <div className="flex flex-col" role="radiogroup" aria-label={G.END_TITLE} style={{ gap: 8 }}>
          {OUTCOMES.map((o) => (
            <OptionButton key={o} role="radio" size="tall" selected={outcome === o} onClick={() => setOutcome(o)} className="w-full !justify-start text-start">
              {G.END_OUTCOME_LABEL[o]}
            </OptionButton>
          ))}
        </div>

        {outcome && (
          <>
            <p className="text-charcoal-faint" style={type(12, 16, 600, { marginBlock: "16px 6px", marginInlineStart: 2 })}>
              {t("Date")}
            </p>
            <CycleDateField value={endedOn} onClick={() => setPickerOpen(true)} ariaLabel={t("Date")} />
            <p className="text-charcoal-soft" style={type(12, 18, 400, { marginTop: 12 })}>
              {outcome === "birth"
                ? G.POSTPARTUM_BODY
                : outcome === "loss"
                  ? G.LOSS_PAUSE_EXPLAINER
                  : t("Nothing you've logged is deleted, and cycle estimates carry on as before.")}
            </p>
          </>
        )}
      </BottomSheet>
      <CalendarPickerSheet
        variant="partB"
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedDate={endedOn}
        today={todayISO()}
        maxDate={todayISO()}
        onSelect={(d) => {
          setEndedOn(d);
          setPickerOpen(false);
        }}
      />
    </>
  );
};

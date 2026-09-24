import React from "react";
import { useApp } from "../../context/AppContext";
import { PHASE_COLOR, PHASE_LABEL, PHASE_TRAINING_NOTE } from "../../services/cycle/guidance";

// "Luteal phase · day 22", where training happens.
//
// HIDDEN UNLESS THERE IS SOMETHING TRUE TO SAY. Three conditions, all of them
// required: the tracker is on, the database returned a prediction, and the
// phase is one the guidance module has a note for. A user on hormonal
// contraception or with a pregnancy recorded gets nothing here — not a greyed
// chip, not "unavailable", nothing — because the Workout tab is not the place
// to explain why a cycle phase is absent.
//
// THE NOTE IS NON-PRESCRIPTIVE, and that constraint lives in guidance.ts where
// it can be reviewed. The evidence for training by cycle phase is thin, and a
// strip that tells somebody to lift less this week is making a training
// decision from a date.

function useCycleStrip() {
  const { cycleSettings, cyclePrediction } = useApp();
  if (!cycleSettings?.trackerEnabled) return null;
  if (!cyclePrediction) return null;
  const note = PHASE_TRAINING_NOTE[cyclePrediction.phase];
  if (note === null) return null;
  return {
    phase: cyclePrediction.phase,
    day: cyclePrediction.cycleDay,
    note,
  };
}

/** The wide strip, above the Folders header in Routines. */
export const CyclePhaseStrip: React.FC = () => {
  const strip = useCycleStrip();
  if (!strip) return null;
  const color = PHASE_COLOR[strip.phase];

  return (
    <div
      className="flex items-start gap-2.5 rounded-[14px] px-3.5 py-2.5 mb-3"
      style={{ background: `${color}14` }}
    >
      <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: color }} />
      <div className="min-w-0">
        <p className="text-[12px] font-bold" style={{ color }}>
          {PHASE_LABEL[strip.phase]} phase
          {strip.day !== null && ` · day ${strip.day}`}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-charcoal-soft">{strip.note}</p>
      </div>
    </div>
  );
};

/** The compact chip, in the session header's button row. */
export const CyclePhaseChip: React.FC = () => {
  const strip = useCycleStrip();
  if (!strip) return null;
  const color = PHASE_COLOR[strip.phase];

  return (
    <span
      className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 h-[34px] text-[10.5px] font-bold whitespace-nowrap"
      style={{ background: `${color}1F`, color }}
      title={strip.note}
    >
      {PHASE_LABEL[strip.phase]}
      {strip.day !== null && ` · ${strip.day}`}
    </span>
  );
};

import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { PHASE_COLOR, PHASE_LABEL, PHASE_TRAINING_NOTE } from "../../services/cycle/guidance";
import * as PG from "../../services/pregnancy/guidance";
import { gestationOn } from "../../services/pregnancy";
import { PREGNANCY_COLOR } from "../pregnancy/PregnancyRing";
import { PregnancyWorkoutCard } from "../pregnancy/PregnancyGuidance";

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
//
// A PREGNANCY TAKES THE SLOT INSTEAD, with its own note and a link that opens
// the full Workout guidance in place. The cycle branch above already returns
// nothing while a pregnancy is recorded (PHASE_TRAINING_NOTE has no entry for
// 'pregnant'), so the two can never both be on screen.

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

/** Where the pregnancy is, for the two workout surfaces. Null when there isn't one. */
function usePregnancyStrip() {
  const { pregnancy, today } = useApp();
  if (!pregnancy) return null;
  const g = gestationOn(today, pregnancy);
  if (!g) return null;
  return { pregnancy, week: g.week };
}

/** The wide strip, above the Folders header in Routines. */
export const CyclePhaseStrip: React.FC = () => {
  const pregnant = usePregnancyStrip();
  const strip = useCycleStrip();
  const [open, setOpen] = useState(false);

  if (pregnant) {
    return (
      <>
        <div
          className="flex items-start gap-2.5 rounded-[14px] px-3.5 py-2.5 mb-3"
          style={{ background: `${PREGNANCY_COLOR}14` }}
        >
          <span
            className="w-1 self-stretch rounded-full shrink-0"
            style={{ background: PREGNANCY_COLOR }}
          />
          <div className="min-w-0">
            <p className="text-[12px] font-bold" style={{ color: PREGNANCY_COLOR }}>
              Pregnancy · week {pregnant.week}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-charcoal-soft">
              {PG.WORKOUT_STRIP_NOTE}
            </p>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="tap mt-1 text-[11px] font-bold"
              style={{ color: PREGNANCY_COLOR }}
            >
              {open ? "Hide the guidance" : PG.WORKOUT_STRIP_LINK}
            </button>
          </div>
        </div>
        {open && <PregnancyWorkoutCard pregnancy={pregnant.pregnancy} />}
      </>
    );
  }

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
  const pregnant = usePregnancyStrip();
  const strip = useCycleStrip();

  if (pregnant) {
    return (
      <span
        className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 h-[34px] text-[10.5px] font-bold whitespace-nowrap"
        style={{ background: `${PREGNANCY_COLOR}1F`, color: PREGNANCY_COLOR }}
        title={PG.WORKOUT_STRIP_NOTE}
      >
        Pregnancy · {pregnant.week}
      </span>
    );
  }

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

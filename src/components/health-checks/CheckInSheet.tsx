import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { CHECKIN_ANSWERS, CHECKIN_FOLLOW_UP_FROM, CHECKIN_QUESTIONS } from "../../services/health-checks/guidance";

/**
 * The four-question check-in. The answers stay on this device; nothing is
 * scored or shown as a diagnosis. "Most days" or "Nearly every day" on any
 * question suggests talking to a doctor, with the warning signs one tap away.
 */
export const CheckInSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (answers: number[]) => void;
  onShowWarningSigns: () => void;
}> = ({ open, onClose, onSave, onShowWarningSigns }) => {
  const [answers, setAnswers] = useState<(number | null)[]>(() => CHECKIN_QUESTIONS.map(() => null));
  const [done, setDone] = useState<null | { followUp: boolean }>(null);
  const complete = answers.every((a) => a !== null);

  const close = () => {
    setAnswers(CHECKIN_QUESTIONS.map(() => null));
    setDone(null);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={close} title="Mood check-in">
      {done ? (
        <div className="animate-fade-slide-up">
          {done.followUp ? (
            <>
              <p className="text-[13px] leading-[1.5] text-charcoal">
                It may help to talk to a doctor about how you've been feeling.
              </p>
              <Button
                className="w-full mt-4"
                onClick={() => {
                  close();
                  onShowWarningSigns();
                }}
              >
                See warning signs
              </Button>
            </>
          ) : (
            <p className="text-[13px] leading-[1.5] text-charcoal">Thanks. Your answers stay on this device.</p>
          )}
          <Button variant="secondary" className="w-full mt-3" onClick={close}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {CHECKIN_QUESTIONS.map((q, qi) => (
            <fieldset key={q}>
              <legend className="text-[13px] font-semibold text-charcoal leading-[1.4] mb-2">
                {qi + 1}. {q}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {CHECKIN_ANSWERS.map((label, ai) => {
                  const selected = answers[qi] === ai;
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? ai : a)))}
                      className={`tap min-h-[44px] rounded-xl px-3 py-2.5 text-[12px] font-semibold text-left border ${
                        selected
                          ? "bg-primary text-white dark:text-[#0D0B1A] border-primary"
                          : "bg-cream-card text-charcoal border-charcoal/[0.1]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <p className="text-[11px] text-charcoal-faint leading-relaxed">
            Your answers stay on this device and are not stored on the server.
          </p>
          <Button
            className="w-full"
            disabled={!complete}
            onClick={() => {
              const final = answers.map((a) => a ?? 0);
              onSave(final);
              setDone({ followUp: final.some((a) => a >= CHECKIN_FOLLOW_UP_FROM) });
            }}
          >
            Save
          </Button>
        </div>
      )}
    </BottomSheet>
  );
};

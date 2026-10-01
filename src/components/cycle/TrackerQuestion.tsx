import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

/**
 * Task R: "Turn period tracking back on?" — asked once, inline, never as a
 * sheet or a dialog, of a female or other profile whose tracker is off
 * without anybody having chosen that (AppContext's trackerQuestionDue).
 * Either answer records the choice, so it disappears everywhere it is shown
 * and never comes back; Yes also switches tracking on. Ignoring it changes
 * nothing.
 */
export const TrackerQuestion: React.FC<{ className?: string }> = ({ className }) => {
  const { trackerQuestionDue, answerTrackerQuestion } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!trackerQuestionDue) return null;

  const answer = async (turnOn: boolean) => {
    setBusy(true);
    setError(null);
    const r = await answerTrackerQuestion(turnOn);
    setBusy(false);
    if (!r.ok) setError(r.message ?? "Couldn't save that. Try again.");
  };

  return (
    <Card className={className}>
      <div role="group" aria-labelledby="tracker-question">
        <p id="tracker-question" className="text-sm font-semibold text-charcoal">
          Turn period tracking back on?
        </p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" fullWidth disabled={busy} onClick={() => void answer(true)}>
            Yes
          </Button>
          <Button size="sm" fullWidth variant="secondary" disabled={busy} onClick={() => void answer(false)}>
            No
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5" role="alert">
            {error}
          </p>
        )}
      </div>
    </Card>
  );
};

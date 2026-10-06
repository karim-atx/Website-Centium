import { useState } from "react";
import { Droplet } from "lucide-react";
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
 *
 * `tile` (Profile, decision 23 item 100): an r18 card with a 36 #F0EDF9 icon
 * tile, like the Recovery card (MO1.5 row 7: padding 16 16 18, the glyph
 * 17/1.5 in #7D6BB5, the title 14/600 beside it, the rest under the title's
 * x, 10 below). Unset keeps the card Health shows.
 */
export const TrackerQuestion: React.FC<{ className?: string; tile?: boolean }> = ({ className, tile }) => {
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

  const title = (
    <p id="tracker-question" className="text-sm font-semibold text-charcoal">
      Turn period tracking back on?
    </p>
  );
  const answers = (
    <>
      <div className={tile ? "flex gap-2" : "flex gap-2 mt-3"}>
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
    </>
  );

  if (tile)
    return (
      <Card padded={false} className={`!rounded-[18px] pt-4 px-4 pb-[18px] ${className ?? ""}`}>
        <div role="group" aria-labelledby="tracker-question">
          <span className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
              <Droplet size={17} strokeWidth={1.5} className="text-primary-dark" />
            </span>
            {title}
          </span>
          <div className="ps-12 mt-2.5">{answers}</div>
        </div>
      </Card>
    );

  return (
    <Card className={className}>
      <div role="group" aria-labelledby="tracker-question">
        {title}
        {answers}
      </div>
    </Card>
  );
};

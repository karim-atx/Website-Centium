import React, { useState } from "react";
import { Droplet } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { textPx, linePx } from "../../theme/textSize";

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
export const TrackerQuestion: React.FC<{ className?: string; tile?: boolean; variant?: "health" }> = ({ className, tile, variant }) => {
  const { trackerQuestionDue, answerTrackerQuestion, theme, accessibility } = useApp();
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

  // HE1 K13 (OURS-health-he1-kept-cards row 1): white r18 + 0.5px
  // #241F1B@8% (dark #1C1F28 + #F5F3FA@8%, High contrast ink 30%), pad 14;
  // the HE1.5.a #11-#17 notice layout: tile 32 r10 #F0EDF9 (dark #2F2E47)
  // with Droplet 17 #7D6BB5 (dark #C3B3FB), gap 11; title 14/19 600; two text
  // actions 12/18 700 #7D6BB5 (dark #C3B3FB), gap 16, 10 under the title,
  // each with a 44 tall hit area. Copy unchanged.
  if (variant === "health") {
    const dark = theme === "dark";
    const hc = !!accessibility.highContrast;
    const action = dark ? "#C3B3FB" : hc ? "#4B3BA0" : "#7D6BB5";
    const actionStyle: React.CSSProperties = { fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: action };
    return (
      <section
        role="group"
        aria-labelledby="tracker-question"
        className={className}
        style={{
          borderRadius: 18,
          padding: 14,
          background: dark ? "#1C1F28" : "#FFFFFF",
          border: `0.5px solid ${hc ? "rgb(var(--c-charcoal) / 0.3)" : dark ? "rgba(245,243,250,0.08)" : "rgba(36,31,27,0.08)"}`,
        }}
      >
        <div className="flex items-start" style={{ gap: 11 }}>
          <span className="grid place-items-center shrink-0" aria-hidden style={{ width: 32, height: 32, borderRadius: 10, background: dark ? "#2F2E47" : "#F0EDF9" }}>
            <Droplet size={17} strokeWidth={1.5} style={{ color: dark ? "#C3B3FB" : "#7D6BB5" }} />
          </span>
          <div className="min-w-0 flex-1">
            <p id="tracker-question" style={{ fontSize: textPx(14), lineHeight: linePx(19), fontWeight: 600, color: "rgb(var(--c-charcoal))", paddingTop: 6.5 }}>
              Turn period tracking back on?
            </p>
            <div className="flex" style={{ gap: 16, marginTop: 10 }}>
              {[
                { t: "Yes", on: true },
                { t: "No", on: false },
              ].map((a) => (
                <button
                  key={a.t}
                  type="button"
                  disabled={busy}
                  onClick={() => void answer(a.on)}
                  className="tap relative disabled:opacity-50 before:absolute before:-inset-x-2 before:-inset-y-[13px] before:content-['']"
                  style={actionStyle}
                >
                  {a.t}
                </button>
              ))}
            </div>
            {error && (
              <p className="mt-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

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

import React, { useState } from "react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { Toast } from "../../ui/Toast";
import { WheelPicker, type WheelOption } from "../../ui/WheelPicker";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { browserOffline, enqueueLog, isOfflineFailure, QUEUED_COPY } from "../../../services/health-log/offlineQueue";
import { FieldLabel, MeasuredOnPopup, WhenField, dayLabel, isoDay, partBSheetTone, whenLabel } from "./LogSheetParts";
import { deleteDrink, logDrink } from "../../../services/health-log/waterIntakes";
import { useLogQueueFlush } from "./useLogQueue";

// HE1.1.1 "Log water" (health-b-handover.md 2866-3013): the shared Log sheet
// for one drink. "Today so far", Amount chips (+ 250 ml / + 500 ml / Custom
// with a 50 ml wheel), pinned "Save {n} ml". The 100 ml quick tile of the old
// Add Metric popup is dropped (approved board note).
//
// STORAGE (Database B1, water_intakes): each drink is a row with its own
// time (When, the Measured on popup); the day's running total in
// health_metrics is still what every reader uses until B16, so it is written
// too (addWater on the drink's day). A drink whose total cannot be written is
// taken back, so the two never disagree.
//
// LIMIT (V6-16): the app's 5 L day clamp stays; a drink that would pass it is
// refused here with the handover's line rather than silently trimmed.

const DAY_LIMIT_ML = 5000;
const CHIPS = [250, 500] as const;
const CUSTOM: WheelOption<number>[] = Array.from({ length: 60 }, (_, i) => ({ value: (i + 1) * 50, label: String((i + 1) * 50) }));

/** "1.6 L", "0 L", "2.5 L". */
export function litres(ml: number): string {
  const l = Math.round(ml / 100) / 10;
  return `${l} L`;
}

export const LogWaterSheet: React.FC<{ open: boolean; onClose: () => void; onSaved?: () => void }> = ({ open, onClose, onSaved }) => {
  const { authUserId, today, waterByDate, waterGoalMl, addWater } = useApp();
  const dark = useIsDark();
  useLogQueueFlush();
  const [choice, setChoice] = useState<number | "custom" | null>(null);
  const [custom, setCustom] = useState(400);
  const [when, setWhen] = useState<Date>(() => new Date());
  const [whenOpen, setWhenOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setChoice(null);
    setCustom(400);
    setWhen(new Date());
    setSaving(false);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  // The day the drink is filed under: the When day (defaults to now).
  const day = isoDay(when);
  const soFar = waterByDate[day] ?? 0;
  const amount = choice === "custom" ? custom : choice;
  const overLimit = amount !== null && soFar + amount > DAY_LIMIT_ML;

  const save = async () => {
    if (amount === null || overLimit || !authUserId) return;
    const queue = () => {
      enqueueLog(authUserId, { kind: "water", ml: amount, day, loggedAt: when.toISOString() });
      setToast(QUEUED_COPY);
      onClose();
    };
    if (browserOffline()) return queue();
    setSaving(true);
    const drink = await logDrink(authUserId, amount, when);
    if (!drink.ok) {
      setSaving(false);
      if (isOfflineFailure(drink)) return queue();
      setToast(drink.message);
      return;
    }
    const result = await addWater(amount, day);
    setSaving(false);
    if (!result.ok) {
      void deleteDrink(drink.id);
      if (isOfflineFailure(result)) return queue();
      setToast("Couldn't save. Try again.");
      return;
    }
    onSaved?.();
    onClose();
  };

  const chip = (on: boolean): React.CSSProperties => ({
    height: 36,
    padding: "0 14px",
    borderRadius: 9999,
    fontSize: textPx(12.5),
    lineHeight: "18.8px",
    fontWeight: 700,
    border: on ? "none" : `0.5px solid ${dark ? "rgba(169,145,254,0.5)" : "rgba(174,161,220,0.5)"}`,
    color: on ? "rgb(var(--c-on-primary-fill))" : undefined,
  });

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title="Log water"
        chrome="partB"
        tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={
          <CtaButton
            label={amount !== null ? `Save ${amount} ml` : "Save"}
            disabled={amount === null || overLimit}
            loading={saving}
            onClick={() => void save()}
            style={{ lineHeight: "21px" }}
          />
        }
      >
        <p className="text-charcoal-soft" style={{ margin: 0, fontSize: textPx(12.5), lineHeight: "18.8px", fontWeight: 400 }}>
          {day === today ? "Today so far " : `${dayLabel(day, today)} so far `}
          <strong className="text-charcoal" style={{ fontWeight: 700 }}>
            {litres(soFar)}
          </strong>{" "}
          of {litres(waterGoalMl)}
        </p>

        <div style={{ marginTop: 16 }}>
          <FieldLabel id="log-water-amount">Amount</FieldLabel>
          <div role="radiogroup" aria-labelledby="log-water-amount" className="flex flex-wrap" style={{ gap: 8 }}>
            {CHIPS.map((ml) => {
              const on = choice === ml;
              return (
                <button
                  key={ml}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setChoice(ml)}
                  className={`tap ${on ? "bg-seg-active" : "bg-th-f0edf9 dark:bg-th-303141 text-primary-deep-text"}`}
                  style={chip(on)}
                >
                  + {ml} ml
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={choice === "custom"}
              onClick={() => setChoice("custom")}
              className={`tap ${choice === "custom" ? "bg-seg-active" : "bg-th-f0edf9 dark:bg-th-303141 text-primary-deep-text"}`}
              style={chip(choice === "custom")}
            >
              Custom
            </button>
          </div>
        </div>

        {choice === "custom" && (
          <div style={{ marginTop: 16 }}>
            <WheelPicker
              variant="partB"
              columns={[{ label: "Amount in ml", options: CUSTOM, value: custom, bandWidth: 160, unit: "ml", onChange: (v) => setCustom(Number(v)) }]}
            />
          </div>
        )}

        {overLimit && (
          <p role="alert" className="text-status-high" style={{ margin: "12px 0 0", fontSize: textPx(12), lineHeight: "17.4px", fontWeight: 600 }}>
            That's more than {DAY_LIMIT_ML / 1000} L today. Check the amount.
          </p>
        )}
        {/* When (HE1.1.1 #80-#84): the drink's own time (B1 water_intakes). */}
        <div style={{ marginTop: 16 }}>
          <FieldLabel>When</FieldLabel>
          <WhenField value={whenLabel(when, today)} onClick={() => setWhenOpen(true)} ariaLabel={`When: ${whenLabel(when, today)}`} />
        </div>
      </BottomSheet>
      <MeasuredOnPopup open={whenOpen} onClose={() => setWhenOpen(false)} value={when} today={today} onDone={setWhen} />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );
};

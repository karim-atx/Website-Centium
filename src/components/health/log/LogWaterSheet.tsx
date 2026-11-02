import React, { useState } from "react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { Toast } from "../../ui/Toast";
import { WheelPicker, type WheelOption } from "../../ui/WheelPicker";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { browserOffline, enqueueLog, isOfflineFailure, newQueueId, QUEUED_COPY } from "../../../services/health-log/offlineQueue";
import { FieldLabel, MeasuredOnPopup, WhenField, dayLabel, isoDay, partBSheetTone, whenLabel } from "./LogSheetParts";
import { t, tx } from "../../../i18n/core";

// HE1.1.1 "Log water" (health-b-handover.md 2866-3013): the shared Log sheet
// for one drink. "Today so far", Amount chips (+ 250 ml / + 500 ml / Custom
// with a 50 ml wheel), pinned "Save {n} ml". The 100 ml quick tile of the old
// Add Metric popup is dropped (approved board note).
//
// STORAGE (Database B1, water_intakes): each drink is a row with its own
// time (When, the Measured on popup); the day's running total in
// health_metrics is still what every reader uses until B16. Round D: both are
// written by one log_water call (logWaterDrink), so they can't disagree.
//
// LIMIT (V6-16): the app's 5 L day clamp stays; a drink that would pass it is
// refused here with the handover's line rather than silently trimmed.

const DAY_LIMIT_ML = 5000;
const CHIPS = [250, 500] as const;
const CUSTOM: WheelOption<number>[] = Array.from({ length: 60 }, (_, i) => ({ value: (i + 1) * 50, label: String((i + 1) * 50) }));

/** "1.6 L", "0 L", "2.5 L". */
export function litres(ml: number): string {
  const l = Math.round(ml / 100) / 10;
  return t("{n} L", { n: l });
}

export const LogWaterSheet: React.FC<{ open: boolean; onClose: () => void; onSaved?: () => void }> = ({ open, onClose, onSaved }) => {
  const { authUserId, today, waterByDate, waterGoalMl, logWaterDrink } = useApp();
  const dark = useIsDark();
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
    // One id for this drink: if the answer to the online try is lost, the
    // queued copy replays it and the server answers already_saved.
    const requestId = newQueueId();
    const queue = () => {
      enqueueLog(authUserId, { kind: "water", ml: amount, day, loggedAt: when.toISOString() }, requestId);
      setToast(QUEUED_COPY);
      onClose();
    };
    if (browserOffline()) return queue();
    setSaving(true);
    const drink = await logWaterDrink(amount, when, requestId);
    setSaving(false);
    if (!drink.ok) {
      if (isOfflineFailure(drink)) return queue();
      setToast(t(drink.message));
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
        title={t("Log water")}
        chrome="partB"
        tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={
          <CtaButton
            label={amount !== null ? t("Save {n} ml", { n: amount }) : t("Save")}
            disabled={amount === null || overLimit}
            loading={saving}
            onClick={() => void save()}
            style={{ lineHeight: "21px" }}
          />
        }
      >
        <p className="text-charcoal-soft" style={{ margin: 0, fontSize: textPx(12.5), lineHeight: "18.8px", fontWeight: 400 }}>
          {t("{day} so far {amount} of {goal}", { day: day === today ? t("Today") : dayLabel(day, today), amount: "\u0000", goal: litres(waterGoalMl) })
            .split("\u0000")
            .map((part, i) =>
              i === 0 ? (
                <React.Fragment key={i}>{part}</React.Fragment>
              ) : (
                <React.Fragment key={i}>
                  <strong className="text-charcoal" style={{ fontWeight: 700 }}>
                    {litres(soFar)}
                  </strong>
                  {part}
                </React.Fragment>
              )
            )}
        </p>

        <div style={{ marginTop: 16 }}>
          <FieldLabel id="log-water-amount">{tx("Amount", "quantity")}</FieldLabel>
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
                  {t("+ {n} ml", { n: ml })}
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
              {t("Custom")}
            </button>
          </div>
        </div>

        {choice === "custom" && (
          <div style={{ marginTop: 16 }}>
            <WheelPicker
              variant="partB"
              columns={[{ label: t("Amount in ml"), options: CUSTOM, value: custom, bandWidth: 160, unit: t("ml"), onChange: (v) => setCustom(Number(v)) }]}
            />
          </div>
        )}

        {overLimit && (
          <p role="alert" className="text-status-high" style={{ margin: "12px 0 0", fontSize: textPx(12), lineHeight: "17.4px", fontWeight: 600 }}>
            {t("That's more than {n} L today. Check the amount.", { n: DAY_LIMIT_ML / 1000 })}
          </p>
        )}
        {/* When (HE1.1.1 #80-#84): the drink's own time (B1 water_intakes). */}
        <div style={{ marginTop: 16 }}>
          <FieldLabel>{t("When")}</FieldLabel>
          <WhenField value={whenLabel(when, today)} onClick={() => setWhenOpen(true)} ariaLabel={t("When: {when}", { when: whenLabel(when, today) })} />
        </div>
      </BottomSheet>
      <MeasuredOnPopup open={whenOpen} onClose={() => setWhenOpen(false)} value={when} today={today} onDone={setWhen} />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );
};

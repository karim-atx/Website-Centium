import React, { useState } from "react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { Toast } from "../../ui/Toast";
import { WheelPicker, type WheelOption } from "../../ui/WheelPicker";
import { useApp } from "../../../context/AppContext";
import { textPx } from "../../../theme/textSize";
import { browserOffline, enqueueLog, isOfflineFailure, QUEUED_COPY } from "../../../services/health-log/offlineQueue";
import { dayLabel, FieldLabel, isoDay, MeasuredOnPopup, WhenField, partBSheetTone } from "./LogSheetParts";
import { useIsDark } from "../../../hooks/useIsDark";
import { formatShortDate } from "../../../utils/date";

// HE1.7.1 "Log weight" (health-b-handover.md 3291-3450): "Last weigh-in",
// a kg wheel with one decimal, When, pinned "Save {n} kg". Replaces the Add
// Metric popup's weight field and its 0.7 s autosave (the "70" default was
// display only and is still never saved unless the person saves).
//
// ONE WEIGH-IN A DAY (V6-58): a second save on a day replaces the first
// ("Replaces today's {n} kg"), as the app keeps one value a day.
// WHEN, DATE ONLY: the weigh-in's own time and the note wait for Database
// stage B1 (PB-HB-43): the field picks the day (the app files a weigh-in at
// now, or noon on another day). The note is B1's health_metrics.note
// (weight rows only, 200 characters).
// RECOVERY-SENSITIVE (K1): nothing renders while the mode is on or not yet
// known; every entry point is hidden too.
// RANGE (V6-17): 20 to 350 kg on the wheel; the database check is unchanged.

const KG: WheelOption<number>[] = Array.from({ length: 331 }, (_, i) => ({ value: i + 20, label: String(i + 20) }));
const TENTHS: WheelOption<number>[] = Array.from({ length: 10 }, (_, i) => ({ value: i, label: String(i) }));

function fromIso(iso: string): Date {
  const d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  d.setHours(12, 0, 0, 0);
  return d;
}

export const LogWeightSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  /** Batch 2 Health A (HE1.7 history Edit): open on this day instead of the selected date. */
  day?: string;
  /** Batch 2 Health A: start the wheel at this weight (the row being edited) instead of the last weigh-in. */
  initialKg?: number;
}> = ({ open, onClose, onSaved, day: dayProp, initialKg }) => {
  const { authUserId, selectedDate, today, weightByDate, logWeightForToday, recoverySensitive, recoveryModePending } = useApp();
  const dark = useIsDark();
  const [whole, setWhole] = useState(70);
  const [tenth, setTenth] = useState(0);
  const [day, setDay] = useState(selectedDate);
  const [note, setNote] = useState("");
  const [whenOpen, setWhenOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const days = Object.keys(weightByDate).filter((d) => d <= today).sort();
  const lastDay = days[days.length - 1] ?? null;
  const last = lastDay ? weightByDate[lastDay] : null;

  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    // Starts at the last weigh-in, or 70.0 for a first one (K2).
    const startKg = initialKg ?? last;
    const start = startKg !== null ? Math.min(350, Math.max(20, startKg)) : 70;
    setWhole(Math.floor(start));
    setTenth(Math.round((start - Math.floor(start)) * 10) % 10);
    const openDay = dayProp ?? selectedDate;
    setDay(openDay > today ? today : openDay);
    setNote("");
    setSaving(false);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  if (recoverySensitive || recoveryModePending) return null;

  const value = Math.round((whole + tenth / 10) * 10) / 10;
  const existing = weightByDate[day];

  const save = async () => {
    if (!authUserId) return;
    if (browserOffline()) {
      enqueueLog(authUserId, { kind: "weight", kg: value, day, note: note.trim() || null });
      setToast(QUEUED_COPY);
      onClose();
      return;
    }
    setSaving(true);
    const result = await logWeightForToday(value, day, note.trim() || null);
    setSaving(false);
    if (!result.ok) {
      if (isOfflineFailure(result)) {
        enqueueLog(authUserId, { kind: "weight", kg: value, day, note: note.trim() || null });
        setToast(QUEUED_COPY);
        onClose();
        return;
      }
      setToast("Couldn't save. Try again.");
      return;
    }
    onSaved?.();
    onClose();
  };

  const label = `${value.toFixed(1)} kg`;

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title="Log weight"
        chrome="partB"
        tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={
          <>
            {existing !== undefined && (
              <p className="text-charcoal-faint text-center" style={{ margin: "0 0 8px", fontSize: textPx(12), lineHeight: "18px" }}>
                Replaces {day === today ? "today's" : `${dayLabel(day, today)}'s`} {existing.toFixed(1)} kg
              </p>
            )}
            <CtaButton label={`Save ${label}`} loading={saving} onClick={() => void save()} style={{ lineHeight: "21px" }} />
          </>
        }
      >
        {last !== null && lastDay && (
          <p className="text-charcoal-soft" style={{ margin: "0 0 16px", fontSize: textPx(12.5), lineHeight: "18.8px", fontWeight: 400 }}>
            Last weigh-in{" "}
            <strong className="text-charcoal" style={{ fontWeight: 700 }}>
              {last.toFixed(1)} kg
            </strong>{" "}
            on {formatShortDate(fromIso(lastDay), { weekday: "short", day: "numeric", month: "short" })}
          </p>
        )}

        <WheelPicker
          variant="partB"
          gap={4}
          separator={{ text: ".", size: 24 }}
          trailing={
            <span className="text-th-7d6bb5 dark:text-primary-deep-text" style={{ marginInlineStart: 4, fontSize: textPx(14), lineHeight: "21px", fontWeight: 700 }}>
              kg
            </span>
          }
          columns={[
            { label: "Kilograms", options: KG, value: whole, bandWidth: 90, onChange: (v) => setWhole(Number(v)) },
            { label: "Tenths of a kilogram", options: TENTHS, value: tenth, bandWidth: 60, onChange: (v) => setTenth(Number(v)) },
          ]}
        />

        <div style={{ marginTop: 16 }}>
          <FieldLabel>When</FieldLabel>
          <WhenField value={dayLabel(day, today)} onClick={() => setWhenOpen(true)} ariaLabel={`When: ${dayLabel(day, today)}`} />
        </div>
        <div style={{ marginTop: 16 }}>
          <FieldLabel htmlFor="weight-note">Note (optional)</FieldLabel>
          <input
            id="weight-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 200))}
            placeholder="e.g. after training"
            className="block w-full bg-cream-soft text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            style={{ minHeight: 44, borderRadius: 12, padding: "0 12px", fontSize: textPx(14), lineHeight: "20px", border: `0.5px solid ${dark ? "rgba(245,243,250,0.1)" : "rgba(36,31,27,0.1)"}` }}
          />
        </div>
      </BottomSheet>
      <MeasuredOnPopup
        open={whenOpen}
        onClose={() => setWhenOpen(false)}
        value={fromIso(day)}
        today={today}
        dateOnly
        onDone={(d) => setDay(isoDay(d))}
      />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );
};

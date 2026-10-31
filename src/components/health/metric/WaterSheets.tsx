import React, { useState } from "react";
import { Droplet, SlidersHorizontal } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { WheelPicker, type WheelOption } from "../../ui/WheelPicker";
import { textPx, linePx } from "../../../theme/textSize";
import { HealthPopup } from "./HealthPopup";
import { useWaterUnit, type WaterUnit } from "../../../services/preferences/units";
import { PINNED_FILL_STYLE, mc, metricIconInk, metricTextInk, useHealthMode } from "./MetricKit";
import { appLocale } from "../../../i18n/format";

// Water's own sheets and popups (OURS-health-water-custom-popup,
// OURS-health-overflow-menus #3 Units and #5 Water goal, OURS-health-delete-
// confirm) and the volume unit preference.
//
// UNITS (PB-H-12, Database stage B3 SE-05): a device preference in
// localStorage until app_preferences.water_unit exists. Storage stays ml.

export type { WaterUnit };
const ML_PER_FLOZ = 29.5735;

/** The shared display unit (Database B3 app_preferences.water_unit, services/preferences/units). */
export { useWaterUnit };


/**
 * A volume in the chosen unit. `dp` is the litre precision (hero 1, History
 * 2, handover "1.6" / "1.60 L"); ml is whole, fl oz one decimal under 10.
 */
export function volume(ml: number, unit: WaterUnit, dp = 1): { num: string; unit: string } {
  if (unit === "ml") return { num: Math.round(ml).toLocaleString(appLocale("en-GB")), unit: "ml" };
  if (unit === "floz") {
    const oz = ml / ML_PER_FLOZ;
    return { num: oz < 10 ? oz.toFixed(1) : Math.round(oz).toLocaleString(appLocale("en-GB")), unit: "fl oz" };
  }
  return { num: (ml / 1000).toFixed(dp), unit: "L" };
}
export const volumeText = (ml: number, unit: WaterUnit, dp = 1) => {
  const v = volume(ml, unit, dp);
  return `${v.num} ${v.unit}`;
};

const amountOptions = (from: number, to: number, label: (v: number) => string): WheelOption<number>[] => {
  const out: WheelOption<number>[] = [];
  for (let v = from; v <= to; v += 50) out.push({ value: v, label: label(v) });
  return out;
};
const DRINK_OPTIONS = amountOptions(50, 3000, (v) => v.toLocaleString(appLocale("en-GB")));
const TOTAL_OPTIONS = amountOptions(0, 5000, (v) => v.toLocaleString(appLocale("en-GB")));
const GOAL_OPTIONS = amountOptions(500, 6000, (v) => (v / 1000).toFixed(2));

const tile = (dark: boolean) => ({
  background: mc("water", "tint"),
  darkBackground: mc("water", "tint"),
  icon: <Droplet size={18} strokeWidth={1.5} style={{ color: metricIconInk("water", dark) }} />,
});

/** OURS-health-water-custom-popup: "Add a drink", 50 ml wheel 50 to 3,000 (starts at 300), Cancel / Add. */
export const WaterCustomPopup: React.FC<{ open: boolean; onClose: () => void; onAdd: (ml: number) => void }> = ({ open, onClose, onAdd }) => {
  const { dark } = useHealthMode();
  const [ml, setMl] = useState(300);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setMl(300);
  } else if (!open && wasOpen) setWasOpen(false);
  return (
    <HealthPopup
      open={open}
      onClose={onClose}
      tile={{ ...tile(dark), icon: <SlidersHorizontal size={18} strokeWidth={1.5} style={{ color: metricIconInk("water", dark) }} /> }}
      title="Add a drink"
      secondary={{ label: "Cancel", onClick: onClose }}
      primary={{ label: "Add", onClick: () => onAdd(ml) }}
    >
      <div style={{ marginTop: 14 }}>
        <WheelPicker variant="partB" columns={[{ label: "Amount in ml", options: DRINK_OPTIONS, value: ml, bandWidth: 120, unit: "ml", onChange: (v) => setMl(Number(v)) }]} />
      </div>
    </HealthPopup>
  );
};

/** Edit a day's total (the History row Edit while drinks are not stored, PB-H-04 / B1). */
export const WaterEditPopup: React.FC<{ open: boolean; dayTitle: string; total: number; onClose: () => void; onSave: (ml: number) => void; title?: string; wheelLabel?: string }> = ({
  open,
  dayTitle,
  total,
  onClose,
  onSave,
  title = "Edit day total",
  wheelLabel = "Day total in ml",
}) => {
  const { dark } = useHealthMode();
  const [ml, setMl] = useState(total);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setMl(Math.round(total / 50) * 50);
  } else if (!open && wasOpen) setWasOpen(false);
  return (
    <HealthPopup
      open={open}
      onClose={onClose}
      tile={tile(dark)}
      title={title}
      meta={dayTitle}
      secondary={{ label: "Cancel", onClick: onClose }}
      primary={{ label: "Save", onClick: () => onSave(ml), disabled: ml === total }}
    >
      <div style={{ marginTop: 14 }}>
        <WheelPicker variant="partB" columns={[{ label: wheelLabel, options: TOTAL_OPTIONS, value: ml, bandWidth: 120, unit: "ml", onChange: (v) => setMl(Number(v)) }]} />
      </div>
    </HealthPopup>
  );
};

/** OURS-health-delete-confirm (manual entry). */
export const WaterDeleteConfirm: React.FC<{ open: boolean; onClose: () => void; onDelete: () => void }> = ({ open, onClose, onDelete }) => (
  <HealthPopup
    open={open}
    onClose={onClose}
    role="alertdialog"
    title="Delete this entry?"
    body="This removes it from your history and totals."
    secondary={{ label: "Cancel", onClick: onClose }}
    primary={{ label: "Delete", onClick: onDelete, tone: "destructive" }}
  />
);

/** OURS-health-overflow-menus #5: "Water goal" sheet, wheel 500 to 6,000 step 50, Save. */
export const WaterGoalSheet: React.FC<{ open: boolean; goal: number; onClose: () => void; onSave: (ml: number) => void }> = ({ open, goal, onClose, onSave }) => {
  const { dark } = useHealthMode();
  const [ml, setMl] = useState(goal);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setMl(Math.round(goal / 50) * 50);
  } else if (!open && wasOpen) setWasOpen(false);
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Water goal"
      chrome="partB"
      footerBottom={30}
      footer={<CtaButton label="Save" onClick={() => onSave(ml)} style={PINNED_FILL_STYLE} />}
    >
      <div className="flex flex-col items-center text-center">
        <p style={{ fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>Daily goal</p>
        <p style={{ marginTop: 4, fontSize: textPx(48), lineHeight: linePx(52), fontWeight: 800, letterSpacing: -1.6, fontVariantNumeric: "tabular-nums", color: "rgb(var(--c-charcoal))" }}>
          {(ml / 1000).toFixed(2)}
        </p>
        <p style={{ marginTop: 2, fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 600, color: metricTextInk("water", dark) }}>L a day</p>
        <div style={{ marginTop: 16, width: "100%" }}>
          <WheelPicker variant="partB" columns={[{ label: "Daily goal in litres", options: GOAL_OPTIONS, value: ml, bandWidth: 120, unit: "L", onChange: (v) => setMl(Number(v)) }]} />
        </div>
      </div>
    </BottomSheet>
  );
};

/** OURS-health-overflow-menus #3: Units, chips 12.5/18.8 700 #5F5093 on #F0EDF9, selected #A79AD5 white. */
export const WaterUnitsSheet: React.FC<{ open: boolean; unit: WaterUnit; onClose: () => void; onChange: (u: WaterUnit) => void }> = ({ open, unit, onClose, onChange }) => {
  const { dark } = useHealthMode();
  const options: { value: WaterUnit; label: string }[] = [
    { value: "l", label: "Litres" },
    { value: "ml", label: "Millilitres" },
    { value: "floz", label: "Fluid ounces" },
  ];
  return (
    <BottomSheet open={open} onClose={onClose} title="Units" chrome="partB">
      <div role="radiogroup" aria-label="Water units" className="flex flex-wrap justify-center" style={{ gap: 8, paddingBottom: 24 }}>
        {options.map((o) => {
          const on = o.value === unit;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={`tap ${on ? "bg-seg-active" : "bg-th-f0edf9 dark:bg-th-303141 text-primary-deep-text"}`}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 9999,
                fontSize: textPx(12.5),
                lineHeight: linePx(18.8),
                fontWeight: 700,
                border: on ? "none" : `0.5px solid ${dark ? "rgb(var(--c-primary-fill) / 0.5)" : "rgb(var(--th-aea1dc) / 0.5)"}`,
                color: on ? "rgb(var(--c-on-primary-fill))" : undefined,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
};

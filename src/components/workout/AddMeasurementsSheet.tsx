import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CalendarPickerSheet } from "../dashboard/CalendarPickerSheet";
import { WheelPicker } from "../ui/WheelPicker";
import {
  floorToFive,
  formatMeasured,
  laterThanNow,
  localDay,
  pickedInstant,
  timeParts,
  type Meridiem,
  type TimeParts,
} from "../../services/measurements/measuredAt";
import {
  GROUP_LABEL,
  MEASUREMENT_SITES,
  checkValue,
  type MeasurementGroup,
  type MeasurementType,
} from "../../services/measurements/sites";
import { useIsDark } from "../../hooks/useIsDark";

// Recording one set of tape measurements.
//
// ONE DATE FOR THE WHOLE ENTRY, because that is what a measuring session is:
// somebody stands in front of a mirror on Sunday morning and writes down five
// numbers. Each becomes its own health_metrics row, and they share a
// recorded_at so they can be read back as the one reading they were — that
// shared instant is the only thing making "the change since last time"
// answerable per site.
//
// EVERY FIELD OPTIONAL. Nobody measures all thirteen sites, and a form that
// demands them teaches people to type something rather than leave it blank —
// which is how a chart ends up with a made-up chest measurement in it.

const GROUP_ORDER: MeasurementGroup[] = ["torso", "arms", "legs", "composition"];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const MERIDIEMS: Meridiem[] = ["AM", "PM"];

/**
 * Mobile v5.1 R3, dark mode (no light islands), as [light, dark]: the purple
 * "Measured" ink and icon take primary.deep dark (#8F68F6 is 4.29:1 on the
 * dark card), the group label and its rule primary.tint dark, the field
 * borders option-border dark and the TIME label text.tertiary dark.
 */
const COLORS = {
  purple: ["#8F68F6", "#B7ABDE"],
  groupTint: ["#E4DDFD", "#303141"],
  whenBorder: ["#E0DFE0", "rgba(238,239,242,0.10)"],
  fieldBorder: ["#E6E6E7", "rgba(238,239,242,0.10)"],
  timeLabel: ["#9A94B3", "#918DA0"],
} as const;

export const AddMeasurementsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Resolves to an error message, or null when the entry was written. */
  onSave: (values: Partial<Record<MeasurementType, number>>, recordedAt: string) => Promise<string | null>;
}> = ({ open, onClose, onSave }) => {
  const [when, setWhen] = useState(() => floorToFive(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftTime, setDraftTime] = useState<TimeParts>(() => timeParts(when));
  const [raw, setRaw] = useState<Partial<Record<MeasurementType, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dark = useIsDark();
  const c = (key: keyof typeof COLORS) => COLORS[key][dark ? 1 : 0];

  // SEEDED ONCE, AND REMOUNTED PER OPENING. The caller keys this on the
  // sheet being open, so a fresh component arrives each time rather than an
  // effect copying props into state — the pattern that leaves yesterday's
  // half-typed entry attached to today's date. Same arrangement
  // BlockSettingsSheet uses.

  /**
   * The parsed entry, and the first field the database would refuse.
   *
   * CHECKED AS YOU TYPE, REPORTED ON SAVE. Complaining about "1" while
   * somebody is on their way to typing "18" would make the form argue with
   * every keystroke; the message appears when they ask to save, which is when
   * they have finished saying what they mean.
   */
  const { values, problem, filled } = useMemo(() => {
    const values: Partial<Record<MeasurementType, number>> = {};
    let problem: string | null = null;
    for (const site of MEASUREMENT_SITES) {
      const text = (raw[site.type] ?? "").trim();
      if (text === "") continue;
      const value = Number(text);
      const message = checkValue(site.type, value);
      if (message) {
        problem ??= message;
        continue;
      }
      values[site.type] = value;
    }
    return { values, problem, filled: Object.keys(values).length };
  }, [raw]);

  const save = async () => {
    if (problem) {
      setError(problem);
      return;
    }
    if (filled === 0) {
      setError("Fill in at least one measurement.");
      return;
    }
    setSaving(true);
    setError(null);
    // Picked in local wall-clock time; the column is timestamptz.
    const message = await onSave(values, when.toISOString());
    setSaving(false);
    if (message) {
      setError(message);
      return;
    }
    onClose();
  };

  const now = new Date();

  return (
    <BottomSheet open={open} onClose={onClose} title="Add measurements">
      <div className="animate-fade-slide-up">
        {/* WO4.1: "Measured" centred, bold and purple; the field opens the
            calendar popup with a wheel time picker (no future). */}
        <p className="text-center" style={{ color: c("purple"), fontSize: 13, fontWeight: 700 }}>
          Measured
        </p>
        <button
          onClick={() => {
            setDraftTime(timeParts(when));
            setPickerOpen(true);
          }}
          aria-label="When these were measured"
          className="tap w-full flex items-center justify-between"
          style={{
            marginTop: 10,
            height: 46,
            padding: "0 16px",
            borderRadius: 23,
            background: "rgb(var(--c-cream-soft))",
            border: `1px solid ${c("whenBorder")}`,
            color: "rgb(var(--c-charcoal))",
            fontSize: 14,
          }}
        >
          {formatMeasured(when)}
          <CalendarDays size={16} style={{ color: c("purple") }} />
        </button>

        {GROUP_ORDER.map((group) => (
          <div key={group} style={{ marginTop: 16 }}>
            {/* A light purple rounded label with a rule in the same purple
                running from it to the field edge. */}
            <div className="flex items-end">
              <span
                style={{
                  background: c("groupTint"),
                  borderRadius: "10px 10px 0 0",
                  padding: "4px 11px 3px",
                  color: "rgb(var(--c-charcoal))",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {GROUP_LABEL[group]}
              </span>
              <span className="flex-1" style={{ height: 2, background: c("groupTint") }} />
            </div>
            <div className="grid grid-cols-2" style={{ gap: "10px 8px", marginTop: 10 }}>
              {MEASUREMENT_SITES.filter((s) => s.group === group).map((site) => (
                <label key={site.type} className="block">
                  <span className="block" style={{ color: "rgb(var(--c-charcoal-muted))", fontSize: 11, marginBottom: 5 }}>
                    {site.label}
                  </span>
                  <span className="relative block">
                    <input
                      value={raw[site.type] ?? ""}
                      onChange={(e) => setRaw((r) => ({ ...r, [site.type]: e.target.value }))}
                      placeholder="–"
                      inputMode="decimal"
                      aria-label={site.label}
                      className="w-full placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{
                        height: 39,
                        padding: "0 30px 0 12px",
                        borderRadius: 10,
                        background: "rgb(var(--c-cream-soft))",
                        border: `1px solid ${c("fieldBorder")}`,
                        color: "rgb(var(--c-charcoal))",
                        fontSize: 14,
                      }}
                    />
                    {/* The unit is stated on every field rather than once in a
                        heading: health_metrics stores no unit, so what the
                        number means is only ever what the label says. */}
                    <span
                      className="absolute pointer-events-none"
                      style={{ right: 10, top: "50%", transform: "translateY(-50%)", color: "rgb(var(--c-charcoal-muted))", fontSize: 10.5 }}
                    >
                      {site.unit}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-xs font-semibold text-status-high" style={{ marginTop: 12 }}>
            {error}
          </p>
        )}

        <button
          onClick={() => void save()}
          disabled={saving || filled === 0}
          className="tap w-full flex items-center justify-center disabled:opacity-60"
          style={{ marginTop: 18, height: 48, borderRadius: 16, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: 15, fontWeight: 700 }}
        >
          {saving
            ? "Saving…"
            : filled === 0
              ? "Fill in at least one"
              : `Save ${filled} measurement${filled === 1 ? "" : "s"}`}
        </button>
      </div>

      <CalendarPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Measured on"
        selectedDate={localDay(when)}
        today={localDay(now)}
        maxDate={localDay(now)}
        confirm
        onSelect={(day) => setWhen(pickedInstant(day, draftTime, new Date()))}
      >
        {(day: string) => {
          const later = laterThanNow(day, draftTime, now);
          return (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgb(var(--c-charcoal) / 0.07)" }}>
              <p
                className="text-center"
                style={{ color: c("timeLabel"), fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 4 }}
              >
                TIME
              </p>
              <WheelPicker
                columns={[
                  {
                    label: "Hours",
                    value: draftTime.hour,
                    options: HOURS.map((h) => ({ value: h, label: String(h), disabled: later.hour(h) })),
                    onChange: (v) => setDraftTime((t) => ({ ...t, hour: Number(v) })),
                  },
                  {
                    label: "Minutes",
                    value: draftTime.minute,
                    options: MINUTES.map((m) => ({ value: m, label: String(m).padStart(2, "0"), disabled: later.minute(m) })),
                    onChange: (v) => setDraftTime((t) => ({ ...t, minute: Number(v) })),
                  },
                  {
                    label: "AM or PM",
                    value: draftTime.meridiem,
                    options: MERIDIEMS.map((m) => ({ value: m, label: m, disabled: later.meridiem(m) })),
                    onChange: (v) => setDraftTime((t) => ({ ...t, meridiem: v as Meridiem })),
                  },
                ]}
              />
            </div>
          );
        }}
      </CalendarPickerSheet>
    </BottomSheet>
  );
};

import { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import {
  GROUP_LABEL,
  MEASUREMENT_SITES,
  checkValue,
  type MeasurementGroup,
  type MeasurementType,
} from "../../services/measurements/sites";

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

/** yyyy-mm-ddThh:mm for a datetime-local input, in the user's own timezone. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const AddMeasurementsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Resolves to an error message, or null when the entry was written. */
  onSave: (values: Partial<Record<MeasurementType, number>>, recordedAt: string) => Promise<string | null>;
}> = ({ open, onClose, onSave }) => {
  const [when, setWhen] = useState(() => toLocalInput(new Date()));
  const [raw, setRaw] = useState<Partial<Record<MeasurementType, string>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    // The input is local wall-clock time; the column is timestamptz. new Date
    // reads it in the user's own zone, which is the instant they meant.
    const message = await onSave(values, new Date(when).toISOString());
    setSaving(false);
    if (message) {
      setError(message);
      return;
    }
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Add measurements">
      <div className="space-y-4 animate-fade-slide-up">
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Measured</span>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            aria-label="When these were measured"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        {GROUP_ORDER.map((group) => (
          <div key={group}>
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
              {GROUP_LABEL[group]}
            </span>
            <div className="grid grid-cols-2" style={{ gap: 8 }}>
              {MEASUREMENT_SITES.filter((s) => s.group === group).map((site) => (
                <label key={site.type} className="block">
                  <span className="text-[10.5px] text-charcoal-faint mb-1 block">{site.label}</span>
                  <span className="relative block">
                    <input
                      value={raw[site.type] ?? ""}
                      onChange={(e) => setRaw((r) => ({ ...r, [site.type]: e.target.value }))}
                      placeholder="—"
                      inputMode="decimal"
                      aria-label={site.label}
                      className="w-full rounded-xl bg-cream-soft border border-charcoal/[0.07] text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ padding: "9px 30px 9px 11px" }}
                    />
                    {/* The unit is stated on every field rather than once in a
                        heading: health_metrics stores no unit, so what the
                        number means is only ever what the label says. */}
                    <span
                      className="absolute text-[10.5px] text-charcoal-faint pointer-events-none"
                      style={{ right: 10, top: "50%", transform: "translateY(-50%)" }}
                    >
                      {site.unit}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {error && <p className="text-xs font-semibold text-status-high">{error}</p>}

        <Button fullWidth size="lg" onClick={() => void save()} disabled={saving || filled === 0}>
          {saving
            ? "Saving…"
            : filled === 0
              ? "Fill in at least one"
              : `Save ${filled} measurement${filled === 1 ? "" : "s"}`}
        </Button>
      </div>
    </BottomSheet>
  );
};

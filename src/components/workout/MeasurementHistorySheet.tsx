import { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Sparkline } from "../health/Sparkline";
import { Trash2, Check, X } from "lucide-react";
import { formatDisplayDate } from "../../utils/date";
import { checkValue, siteFor, type MeasurementType } from "../../services/measurements/sites";
import type { MeasurementReading } from "../../services/measurements";

// One site's history: the chart, then every reading behind it.
//
// THE LIST IS THE POINT, not the chart. A tape measurement is a number
// somebody wrote down and can have written down wrong, so each row is
// editable and deletable in place — which is the whole reason this sheet
// exists rather than a read-only chart on the card.
//
// OLDEST-TO-NEWEST FOR THE CHART, NEWEST-FIRST FOR THE LIST, deliberately.
// A trend line reads left to right in time; a list of things you might want
// to correct puts the most recent one where your thumb is.

export const MeasurementHistorySheet: React.FC<{
  open: boolean;
  onClose: () => void;
  type: MeasurementType | null;
  readings: MeasurementReading[];
  onEdit: (id: string, type: MeasurementType, value: number) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
}> = ({ open, onClose, type, readings, onEdit, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seeded once and remounted per site, for the reason AddMeasurementsSheet gives.

  if (!type) return null;
  const site = siteFor(type);
  if (!site) return null;
  const unit = site.unit === "%" ? "%" : " cm";
  const chart = [...readings].reverse().map((r) => r.value);

  const commit = async (reading: MeasurementReading) => {
    const value = Number(draft.trim());
    const problem = checkValue(type, value);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const message = await onEdit(reading.id, type, value);
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    setEditingId(null);
  };

  const remove = async (reading: MeasurementReading) => {
    setBusy(true);
    setError(null);
    const message = await onDelete(reading.id);
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={site.label}>
      <div className="space-y-4 animate-fade-slide-up">
        {chart.length >= 2 ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-charcoal">
                {readings[0].value}
                <span className="text-sm font-medium text-charcoal-faint">{unit}</span>
              </p>
              <p className="text-xs text-charcoal-faint">
                {readings.length} reading{readings.length === 1 ? "" : "s"}
              </p>
            </div>
            <Sparkline values={chart} color="#6F9993" width={150} height={46} />
          </div>
        ) : (
          <p className="text-sm text-charcoal-faint">
            One reading so far — add another to see how it moves.
          </p>
        )}

        {error && <p className="text-xs font-semibold text-status-high">{error}</p>}

        <div className="divide-y divide-charcoal/[0.06]">
          {readings.map((reading) => (
            <div key={reading.id} className="flex items-center justify-between py-2.5" style={{ gap: 10 }}>
              <span className="text-xs text-charcoal-faint">
                {formatDisplayDate(reading.recordedAt.slice(0, 10))}
              </span>
              {editingId === reading.id ? (
                <span className="flex items-center" style={{ gap: 6 }}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    inputMode="decimal"
                    aria-label={`${site.label} on ${formatDisplayDate(reading.recordedAt.slice(0, 10))}`}
                    className="rounded-lg bg-cream-soft border border-charcoal/[0.07] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ width: 74, padding: "6px 9px", textAlign: "right" }}
                  />
                  <button
                    onClick={() => void commit(reading)}
                    disabled={busy}
                    aria-label="Save this reading"
                    className="tap w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50"
                  >
                    <Check size={13} strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel"
                    className="tap w-7 h-7 rounded-full bg-cream-soft text-charcoal-soft flex items-center justify-center"
                  >
                    <X size={13} />
                  </button>
                </span>
              ) : (
                <span className="flex items-center" style={{ gap: 8 }}>
                  <button
                    onClick={() => {
                      setEditingId(reading.id);
                      setDraft(String(reading.value));
                      setError(null);
                    }}
                    aria-label={`Edit ${site.label} from ${formatDisplayDate(reading.recordedAt.slice(0, 10))}`}
                    className="tap text-sm font-semibold text-charcoal"
                  >
                    {reading.value}
                    <span className="text-[11px] font-medium text-charcoal-faint">{unit}</span>
                  </button>
                  <button
                    onClick={() => void remove(reading)}
                    disabled={busy}
                    aria-label={`Delete ${site.label} from ${formatDisplayDate(reading.recordedAt.slice(0, 10))}`}
                    className="tap w-7 h-7 rounded-full bg-cream-soft text-charcoal-faint flex items-center justify-center disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>

        <Button fullWidth variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </BottomSheet>
  );
};

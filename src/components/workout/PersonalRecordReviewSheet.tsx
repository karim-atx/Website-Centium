import React, { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { Check, Dumbbell } from "lucide-react";
import clsx from "clsx";

// The one-time review of personal records that only ever lived in this browser.
//
// WHY IT ASKS RATHER THAN MIGRATING SILENTLY. Every other one-time upload in
// this app moves data the user explicitly created — a meal they built, a
// routine they wrote. These numbers are different: most were DERIVED, from
// whatever sets happened to be logged on this device, and some were typed as a
// correction to a bad estimate. Writing them all into an append-only history
// as "achieved today" would be inventing a training record on someone's
// behalf, and personal_records has no UPDATE path to take it back with.
//
// So: shown once, every value editable, nothing written unless it is ticked.
// Skipping is a real answer and leaves the number exactly where it already is.
export const PersonalRecordReviewSheet: React.FC = () => {
  const {
    authUserId,
    personalRecordsReviewItems,
    personalRecordsReviewDone,
    completePersonalRecordsReview,
    exerciseCatalog,
    customExercises,
  } = useApp();

  const entries = useMemo(
    () => Object.entries(personalRecordsReviewItems).sort((a, b) => b[1] - a[1]),
    [personalRecordsReviewItems]
  );

  /**
   * Whether each name can be stored at all, worked out the same way the
   * context resolves a record's movement.
   *
   *   "ready"    a catalog row or a synced custom movement — writes now
   *   "pending"  one of the user's own movements that has not uploaded yet.
   *              personal_records needs a real id, so this one waits.
   *   "missing"  neither. Nothing can reference it, so nothing can store it.
   */
  const statusOf = (name: string): "ready" | "pending" | "missing" => {
    const wanted = name.trim().toLowerCase();
    if (exerciseCatalog.some((e) => e.name.trim().toLowerCase() === wanted)) return "ready";
    const custom = customExercises.find((e) => e.name.trim().toLowerCase() === wanted);
    if (!custom) return "missing";
    return custom.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(custom.id)
      ? "ready"
      : "pending";
  };

  // Everything starts ticked: the common case is that these numbers are
  // correct and the user just wants them kept.
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setChecked(Object.fromEntries(entries.map(([name]) => [name, statusOf(name) !== "missing"])));
    setDrafts(Object.fromEntries(entries.map(([name, kg]) => [name, String(kg)])));
    // Recomputed only when the set of names changes, so typing does not reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  // NOT SHOWN WITH NOTHING TO REVIEW, and never to a signed-out visitor: there
  // is nowhere to write to and the prompt would be noise.
  const open =
    !!authUserId && !personalRecordsReviewDone && !dismissed && entries.length > 0;
  if (!open) return null;

  const confirm = async () => {
    setSaving(true);
    await completePersonalRecordsReview(
      entries
        .filter(([name]) => checked[name])
        .map(([name, kg]) => ({ name, kg: Number(drafts[name]) || kg }))
    );
    setSaving(false);
    setDismissed(true);
  };

  const skipAll = async () => {
    // Still "completed": the question was asked and answered.
    setSaving(true);
    await completePersonalRecordsReview([]);
    setSaving(false);
    setDismissed(true);
  };

  return (
    <BottomSheet open onClose={() => void skipAll()} title="Save your personal records?">
      <div className="space-y-4 animate-fade-slide-up">
        <p className="text-[12.5px] text-charcoal-soft leading-relaxed">
          These were tracked on this device only. Pick the ones worth keeping and they'll be saved
          to your account — anything you leave unticked stays on this device and isn't recorded.
        </p>

        <div className="space-y-2 max-h-[320px] overflow-y-auto no-scrollbar">
          {entries.map(([name, kg]) => {
            const status = statusOf(name);
            const isChecked = !!checked[name] && status !== "missing";
            return (
              <div
                key={name}
                className="flex items-center justify-between gap-3 bg-cream-soft rounded-2xl px-3.5 py-3"
              >
                <button
                  onClick={() =>
                    status !== "missing" &&
                    setChecked((prev) => ({ ...prev, [name]: !prev[name] }))
                  }
                  disabled={status === "missing"}
                  aria-label={`${isChecked ? "Skip" : "Keep"} ${name}`}
                  className={clsx(
                    "tap w-5 h-5 rounded-md flex items-center justify-center shrink-0 border",
                    isChecked
                      ? "bg-primary border-primary text-white"
                      : "bg-cream-card border-charcoal/20 text-transparent",
                    status === "missing" && "opacity-40"
                  )}
                >
                  <Check size={12} strokeWidth={3} />
                </button>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Dumbbell size={14} className="text-primary-dark shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-charcoal truncate">{name}</p>
                    {status === "pending" && (
                      <p className="text-[10.5px] font-medium text-charcoal-faint">
                        Saved once this exercise finishes syncing
                      </p>
                    )}
                    {status === "missing" && (
                      <p className="text-[10.5px] font-medium text-charcoal-faint">
                        Not in your library — can't be saved
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <input
                    value={drafts[name] ?? String(kg)}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [name]: e.target.value.replace(/[^\d.]/g, ""),
                      }))
                    }
                    disabled={status === "missing"}
                    inputMode="decimal"
                    aria-label={`${name} one rep max`}
                    className="w-16 rounded-lg border border-charcoal/15 bg-cream-card px-2 py-1 text-xs text-charcoal text-right focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
                  />
                  <span className="text-xs font-semibold text-charcoal-faint">kg</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2.5">
          <Button variant="outline" fullWidth onClick={() => void skipAll()} disabled={saving}>
            Not now
          </Button>
          <Button fullWidth onClick={() => void confirm()} disabled={saving}>
            {saving ? "Saving…" : "Save selected"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};

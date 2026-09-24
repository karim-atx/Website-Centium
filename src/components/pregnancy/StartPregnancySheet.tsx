import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { dueDateFromLmp, lmpFromDueDate, startPregnancy } from "../../services/pregnancy";
import * as G from "../../services/pregnancy/guidance";

// Starting pregnancy tracking.
//
// TWO WAYS IN, BECAUSE PEOPLE ARRIVE WITH DIFFERENT NUMBERS. Somebody who has
// not had a scan knows their last period; somebody who has been scanned has a
// due date that is BETTER than counting from a period, and forcing them to
// back-calculate an LMP to enter it would be asking them to do arithmetic the
// app can do. Either one stores both — see startPregnancy.
//
// THE OTHER DATE IS SHOWN AS IT IS TYPED, so nobody discovers afterwards that
// the app worked out a due date they disagree with.

const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const StartPregnancySheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onStarted: () => void;
}> = ({ open, onClose, onStarted }) => {
  const { authUserId } = useApp();
  const [basis, setBasis] = useState<"lmp" | "due">("lmp");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();
  const derived = value
    ? basis === "lmp"
      ? dueDateFromLmp(value)
      : lmpFromDueDate(value)
    : null;

  const save = async () => {
    if (!authUserId || !value) return;
    setBusy(true);
    setError(null);
    const result = await startPregnancy(
      authUserId,
      basis === "lmp" ? { lmpDate: value } : { dueDate: value }
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setValue("");
    onStarted();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={G.START_TITLE}>
      <div className="animate-fade-slide-up">
        <p className="text-[12px] leading-relaxed text-charcoal-soft mb-3.5">{G.START_BODY}</p>

        <div className="flex gap-2 mb-3.5">
          {(
            [
              ["lmp", G.START_FROM_LMP],
              ["due", G.START_FROM_DUE],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setBasis(key);
                setValue("");
              }}
              className={`tap flex-1 rounded-xl px-3 py-2.5 text-[11.5px] font-semibold leading-snug ${
                basis === key ? "bg-primary text-white" : "bg-cream-soft text-charcoal-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="block text-[11px] font-bold text-charcoal mb-1.5">
          {basis === "lmp" ? "First day of your last period" : "Due date"}
        </label>
        <input
          type="date"
          value={value}
          // A LAST PERIOD CANNOT BE IN THE FUTURE and a due date cannot be in
          // the past — both would produce a gestation the app would then have
          // to explain away.
          max={basis === "lmp" ? today : undefined}
          min={basis === "due" ? today : undefined}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-xl bg-cream-soft px-3.5 py-2.5 text-[13px] text-charcoal"
        />

        {basis === "due" && (
          <p className="mt-2 text-[10.5px] leading-[1.45] text-charcoal-faint">{G.DUE_DATE_HELP}</p>
        )}

        {derived && (
          <p className="mt-2.5 text-[11.5px] font-semibold text-charcoal">
            {basis === "lmp"
              ? `Due date: ${longDate(derived)}`
              : `Last period: about ${longDate(derived)}`}
          </p>
        )}

        {error && <p className="mt-2.5 text-[11.5px] font-semibold text-status-high">{error}</p>}

        <p className="mt-3.5 text-[10.5px] font-semibold text-charcoal-faint text-center">
          {G.PROVIDER_FIRST}
        </p>

        <Button
          fullWidth
          className="mt-3"
          disabled={busy || !value || !authUserId}
          onClick={() => void save()}
        >
          Start tracking
        </Button>
      </div>
    </BottomSheet>
  );
};

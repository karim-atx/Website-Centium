import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { useApp } from "../../context/AppContext";
import {
  SCHEDULED_METHODS,
  isDevice,
  isPill,
  startPlan,
  updatePlan,
  validatePlan,
  type ContraceptionPlan,
  type Method,
  type PlanShape,
} from "../../services/contraception";
import * as G from "../../services/contraception/guidance";

// Setting up, or changing, the method.
//
// ONE FORM PER SCHEDULE SHAPE, matching `contraception_plans_schedule_shape_
// check` branch for branch — and the row is REBUILT FROM SCRATCH on save
// (planRow), because the constraint does not just require the right columns,
// it requires every other method's to be null. Editing a pill plan into a ring
// plan while leaving active_days set is refused by the database as a 23514 the
// user could do nothing about.
//
// CHANGING METHOD ENDS THE OLD PLAN rather than editing it, so the history
// still says what was used when. Editing the SAME method's details edits in
// place, because a corrected pack date is not a new method.

const METHODS: readonly Method[] = [
  "pill_combined",
  "pill_progestin",
  "ring",
  "patch",
  "injection",
  "implant",
  "iud_hormonal",
  "iud_copper",
  "condom",
  "other",
  "none",
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const MethodSetupSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  plan: ContraceptionPlan | null;
  onSaved: () => void;
}> = ({ open, onClose, plan, onSaved }) => {
  const { authUserId } = useApp();
  const today = todayISO();

  const [draft, setDraft] = useState<PlanShape>(
    plan ?? { method: "pill_combined", startedOn: today, packStartDate: today, activeDays: 21, breakDays: 7 }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed each time the sheet opens, onto whatever is stored.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const key = plan?.id ?? "new";
  if (open && openedFor !== key) {
    setOpenedFor(key);
    setDraft(plan ?? { method: "pill_combined", startedOn: today, packStartDate: today, activeDays: 21, breakDays: 7 });
    setError(null);
  } else if (!open && openedFor !== null) {
    setOpenedFor(null);
  }

  const set = <K extends keyof PlanShape>(k: K, v: PlanShape[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  /**
   * SWITCHING METHOD CLEARS THE OTHER METHOD'S FIELDS in the draft too, so the
   * form never shows a ring's weeks beside a pill's pack. Sensible starting
   * values come with each shape.
   */
  const chooseMethod = (method: Method) => {
    const base: PlanShape = { method, startedOn: draft.startedOn };
    if (isPill(method)) {
      setDraft({ ...base, packStartDate: today, activeDays: 21, breakDays: 7 });
    } else if (method === "ring") {
      setDraft({ ...base, insertedOn: today, weeksIn: 3, weeksOut: 1 });
    } else if (method === "patch") {
      setDraft({ ...base, firstAppliedOn: today, changeWeekday: new Date().getDay(), patchFreeWeek: true });
    } else if (method === "injection") {
      setDraft({ ...base, lastGivenOn: today, intervalWeeks: 12 });
    } else if (isDevice(method)) {
      setDraft({ ...base, insertedOn: today, replaceBy: "" });
    } else {
      setDraft(base);
    }
  };

  const save = async () => {
    if (!authUserId) return;
    const invalid = validatePlan(draft);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    // SAME METHOD = AN EDIT; a different one is a new plan, which ends the old.
    const result =
      plan && plan.method === draft.method
        ? await updatePlan(plan.id, draft)
        : await startPlan(authUserId, draft);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved();
    onClose();
  };

  const label = "block text-[11px] font-bold text-charcoal mb-1.5 mt-3";
  const field =
    "w-full rounded-xl bg-cream-soft px-3.5 py-2.5 text-[13px] text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <BottomSheet open={open} onClose={onClose} title={plan ? G.CHANGE_METHOD : G.SETUP_TITLE}>
      <div className="animate-fade-slide-up">
        <div className="flex flex-wrap gap-2">
          {METHODS.map((m) => (
            <Chip key={m} active={draft.method === m} onClick={() => chooseMethod(m)}>
              {G.METHOD_LABEL[m]}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-[1.45] text-charcoal-faint">{G.NOT_A_PRESCRIBER}</p>

        <label className={label}>Started on</label>
        <input
          type="date"
          className={field}
          value={draft.startedOn}
          max={today}
          onChange={(e) => set("startedOn", e.target.value)}
        />

        {/* --- the pill --- */}
        {isPill(draft.method) && (
          <>
            <label className={label}>First day of this pack</label>
            <input
              type="date"
              className={field}
              value={draft.packStartDate ?? ""}
              onChange={(e) => set("packStartDate", e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={label}>Active days</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={20}
                  max={28}
                  className={field}
                  value={draft.activeDays ?? ""}
                  onChange={(e) => set("activeDays", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
              <div>
                <label className={label}>Break days</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={7}
                  className={field}
                  value={draft.breakDays ?? ""}
                  onChange={(e) => set("breakDays", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
            </div>
            <label className={label}>{G.REMINDER_TIME_LABEL}</label>
            <input
              type="time"
              className={field}
              value={(draft.reminderTime ?? "").slice(0, 5)}
              onChange={(e) => set("reminderTime", e.target.value ? e.target.value : null)}
            />
          </>
        )}

        {/* --- the ring --- */}
        {draft.method === "ring" && (
          <>
            <label className={label}>Put in on</label>
            <input
              type="date"
              className={field}
              value={draft.insertedOn ?? ""}
              onChange={(e) => set("insertedOn", e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={label}>Weeks in</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={4}
                  className={field}
                  value={draft.weeksIn ?? ""}
                  onChange={(e) => set("weeksIn", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
              <div>
                <label className={label}>Weeks out</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={2}
                  className={field}
                  value={draft.weeksOut ?? ""}
                  onChange={(e) => set("weeksOut", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
            </div>
          </>
        )}

        {/* --- the patch --- */}
        {draft.method === "patch" && (
          <>
            <label className={label}>First patch on</label>
            <input
              type="date"
              className={field}
              value={draft.firstAppliedOn ?? ""}
              onChange={(e) => set("firstAppliedOn", e.target.value)}
            />
            <label className={label}>Change day</label>
            <select
              className={field}
              value={draft.changeWeekday ?? 0}
              onChange={(e) => set("changeWeekday", Number(e.target.value))}
            >
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                checked={draft.patchFreeWeek ?? false}
                onChange={(e) => set("patchFreeWeek", e.target.checked)}
              />
              <span className="text-[12px] text-charcoal">I have a patch-free week</span>
            </label>
          </>
        )}

        {/* --- the injection --- */}
        {draft.method === "injection" && (
          <>
            <label className={label}>Last injection</label>
            <input
              type="date"
              className={field}
              value={draft.lastGivenOn ?? ""}
              onChange={(e) => set("lastGivenOn", e.target.value)}
            />
            <label className={label}>Every (weeks)</label>
            <input
              type="number"
              inputMode="numeric"
              min={4}
              max={16}
              className={field}
              value={draft.intervalWeeks ?? ""}
              onChange={(e) => set("intervalWeeks", e.target.value === "" ? null : Number(e.target.value))}
            />
          </>
        )}

        {/* --- implant and IUDs --- */}
        {isDevice(draft.method) && (
          <>
            <label className={label}>Fitted on</label>
            <input
              type="date"
              className={field}
              value={draft.insertedOn ?? ""}
              onChange={(e) => set("insertedOn", e.target.value)}
            />
            <label className={label}>Replace by</label>
            <input
              type="date"
              className={field}
              value={draft.replaceBy ?? ""}
              onChange={(e) => set("replaceBy", e.target.value)}
            />
            <p className="mt-1.5 text-[10px] leading-[1.45] text-charcoal-faint">{G.DEVICE_NOTE}</p>
          </>
        )}

        {/* Methods with no schedule say so, rather than showing an empty form. */}
        {!SCHEDULED_METHODS.includes(draft.method) && (
          <p className="mt-3 text-[11.5px] leading-relaxed text-charcoal-soft">
            There's no schedule to keep for this one — it's recorded so the rest of the app knows
            what you use.
          </p>
        )}

        {error && <p className="mt-3 text-[11.5px] font-semibold text-status-high">{error}</p>}

        <Button fullWidth className="mt-4" disabled={busy || !authUserId} onClick={() => void save()}>
          Save
        </Button>
      </div>
    </BottomSheet>
  );
};

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, CalendarDays, ChevronDown } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { PopupMenu } from "../ui/PopupMenu";
import { Toggle } from "../ui/Toggle";
import { CalendarPickerSheet } from "../dashboard/CalendarPickerSheet";
import { FieldLabel, TimeWheel, hairAt, partBSheetTone } from "../health/log/LogSheetParts";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";
import { shortDate, nextDueLine, type CheckCadence } from "../../services/health-checks/checkStatus";
import type { CheckReminder, ReminderRepeat } from "../../services/health-checks/checkStore";
import { browserOffline } from "../../services/health-log/offlineQueue";
import { ButtonRow, CheckTile, InfoBox, PopupNote } from "./HealthCheckParts";
import { clock12 } from "../../utils/time12";

export const OFFLINE_ACTION = "You're offline. Try again when you're connected.";
export const SAVE_FAILED = "Couldn't save. Try again.";

export type CheckOption = { id: string; name: string; frequency: string; cadence: CheckCadence; custom?: boolean };

/** "Today · 6 Oct 2026" / "6 Oct 2026" (HE1.8.1 #50). */
function doneLabel(day: string, today: string): string {
  return day === today ? `Today · ${shortDate(day)}` : shortDate(day);
}

/** The Date done / Date field (HE1.8.1 #48-#50): 44 r12 pad 0 12, CalendarDays 16 #5B5349, 14/20 400. */
const DateBox: React.FC<{ label: string; placeholder?: boolean; onClick: () => void; ariaLabel: string }> = ({ label, placeholder, onClick, ariaLabel }) => {
  const dark = useIsDark();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="tap w-full flex items-center bg-cream-soft text-left"
      style={{ minHeight: 44, borderRadius: 12, padding: "0 12px", gap: 8, border: `0.5px solid ${hairAt(dark, 0.1)}` }}
    >
      <CalendarDays size={16} className="shrink-0 text-charcoal-soft" aria-hidden />
      <span className={`flex-1 min-w-0 truncate ${placeholder ? "text-charcoal-faint" : "text-charcoal"}`} style={{ fontSize: textPx(14), lineHeight: "20px" }}>
        {label}
      </span>
    </button>
  );
};

// ---------------------------------------------------------------------------
// HE1.8.1 Mark as done

export const MarkDonePopup: React.FC<{
  open: boolean;
  onClose: () => void;
  check: CheckOption | null;
  /** The saved date when re-opened on a done check (Undo replaces Cancel). */
  doneOn: string | null;
  today: string;
  onSave: (day: string) => Promise<{ ok: boolean; message?: string }>;
  onUndo: () => Promise<{ ok: boolean; message?: string }>;
}> = ({ open, onClose, check, doneOn, today, onSave, onUndo }) => {
  const [day, setDay] = useState(today);
  const [calOpen, setCalOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setDay(doneOn ?? today);
    setNote(null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }
  if (!check) return null;
  const offline = browserOffline();
  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    if (browserOffline()) return setNote(OFFLINE_ACTION);
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setNote(SAVE_FAILED);
    onClose();
  };
  return (
    <>
      <CentredPopup open={open && !calOpen} onClose={onClose} title="When was it done?" geometry="partB" align="start">
        <div style={{ marginTop: -4 }}>
          <InfoBox className="flex items-center" style={{ padding: "10px 12px", gap: 10 }}>
            <CheckTile id={check.custom ? "custom" : check.id} onCard />
            <span className="min-w-0">
              <span className="block text-charcoal" style={{ fontSize: textPx(13.5), lineHeight: "20.3px", fontWeight: 600 }}>
                {check.name}
              </span>
              <span className="block text-charcoal-faint" style={{ fontSize: textPx(11), lineHeight: "16.5px" }}>
                {check.frequency}
              </span>
            </span>
          </InfoBox>
          <div style={{ marginTop: 14 }}>
            <FieldLabel>Date done</FieldLabel>
            <DateBox label={doneLabel(day, today)} onClick={() => setCalOpen(true)} ariaLabel={`Date done: ${doneLabel(day, today)}`} />
          </div>
          <p className="text-charcoal-soft" style={{ margin: "10px 0 0", fontSize: textPx(11.5), lineHeight: "16.7px" }}>
            {nextDueLine(check.cadence)}
          </p>
          {(note || offline) && <PopupNote>{note ?? OFFLINE_ACTION}</PopupNote>}
          <ButtonRow
            style={{ marginTop: 16 }}
            secondary={doneOn ? { label: "Undo", onClick: () => void run(onUndo), disabled: busy } : { label: "Cancel", onClick: onClose }}
            primary={{ label: "Save", onClick: () => void run(() => onSave(day)), disabled: offline, loading: busy }}
          />
        </div>
      </CentredPopup>
      <CalendarPickerSheet
        variant="partB"
        open={calOpen}
        onClose={() => setCalOpen(false)}
        title="Date done"
        selectedDate={day}
        today={today}
        maxDate={today}
        onSelect={setDay}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// HE1.8.3 Add or edit a check (+ OURS edit mode)

export const CheckFormPopup: React.FC<{
  open: boolean;
  onClose: () => void;
  /** The suggested checks to choose from (visible and hidden), plus the user's own. */
  options: CheckOption[];
  /** Edit mode: the check being edited (a suggested one's name is fixed). */
  editing: CheckOption | null;
  doneOn: string | null;
  remindOn: boolean;
  remindersReady: boolean;
  notificationsOff: boolean;
  today: string;
  onSave: (v: { checkId: string | null; otherName: string | null; intervalMonths: number; doneOn: string | null; remind: boolean }) => Promise<{ ok: boolean; message?: string }>;
}> = ({ open, onClose, options, editing, doneOn, remindOn, remindersReady, notificationsOff, today, onSave }) => {
  const navigate = useNavigate();
  const dark = useIsDark();
  const [fieldEl, fieldRef] = useState<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [other, setOther] = useState<string | null>(null);
  // custom_health_checks.interval_months is required (1-120); 12 unless changed.
  const [intervalText, setIntervalText] = useState("12");
  const [busy, setBusy] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [remind, setRemind] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setCheckId(editing?.id ?? null);
    setOther(editing?.custom ? editing.name : null);
    setIntervalText(String((editing?.cadence as { months?: number } | undefined)?.months ?? 12));
    setBusy(false);
    setDay(doneOn);
    setRemind(remindOn);
    setNote(null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const chosen = options.find((o) => o.id === checkId) ?? null;
  const isOther = other !== null && (!chosen || chosen.custom);
  const fixedName = !!editing && !editing.custom;
  const months = Number(intervalText);
  const intervalOk = Number.isInteger(months) && months >= 1 && months <= 120;
  const canSave = isOther ? (other ?? "").trim().length >= 2 && intervalOk : !!chosen;
  const offline = browserOffline();
  const fieldText = isOther && !editing ? "Other…" : chosen ? chosen.name : "Choose a check";

  const save = async () => {
    if (browserOffline()) return setNote(OFFLINE_ACTION);
    setBusy(true);
    const r = await onSave({
      checkId: chosen && !isOther ? chosen.id : editing?.custom ? editing.id : null,
      otherName: isOther ? (other ?? "").trim() : null,
      intervalMonths: months,
      doneOn: day,
      remind,
    });
    setBusy(false);
    if (!r.ok) return setNote(r.message === "You already have this check." || r.message === "Use 2 to 60 characters." ? r.message : SAVE_FAILED);
    onClose();
  };

  const fieldStyle: React.CSSProperties = { minHeight: 44, borderRadius: 12, padding: "0 12px", border: `0.5px solid ${hairAt(dark, 0.08)}` };
  const menuOptions = [
    ...options.filter((o) => !o.custom).map((o) => ({ value: o.id, label: o.name })),
    { value: "__other", label: "Other…" },
  ];

  return (
    <>
      <CentredPopup open={open && !calOpen} onClose={onClose} title={editing ? "Edit check" : "Log a check"} geometry="partB" align="start">
        <div style={{ marginTop: -16 }}>
          <p className="text-charcoal-faint" style={{ margin: "3px 0 0", fontSize: textPx(12), lineHeight: "18px" }}>
            Mark a check as done to work out when it's next due.
          </p>
          <p className="text-charcoal-soft" style={{ margin: "12px 0 5px", fontSize: textPx(11.5), lineHeight: "17.3px", fontWeight: 700 }}>
            Check
          </p>
          {fixedName || (editing?.custom && isOther) || (!editing && isOther) ? (
            fixedName ? (
              <div className="flex items-center bg-cream-soft text-charcoal" style={{ ...fieldStyle, fontSize: textPx(14), lineHeight: "21px" }}>
                {editing?.name}
              </div>
            ) : (
              <input
                autoFocus
                value={other ?? ""}
                onChange={(e) => setOther(e.target.value.slice(0, 60))}
                aria-label="Name of the check"
                placeholder="Name of the check"
                className="w-full bg-cream-soft text-charcoal placeholder:text-charcoal-faint focus:outline-none"
                style={{ ...fieldStyle, fontSize: textPx(14), lineHeight: "21px" }}
              />
            )
          ) : (
            <button
              ref={fieldRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-haspopup="listbox"
              className="tap w-full flex items-center justify-between bg-cream-soft text-left"
              style={fieldStyle}
            >
              <span className={chosen ? "text-charcoal" : "text-charcoal-faint"} style={{ fontSize: textPx(14), lineHeight: "21px" }}>
                {fieldText}
              </span>
              <ChevronDown size={16} className="text-charcoal-faint shrink-0" aria-hidden />
            </button>
          )}
          {isOther && (
            <div style={{ marginTop: 14 }}>
              <FieldLabel htmlFor="hc-interval">How often</FieldLabel>
              <label className="flex items-center text-charcoal-soft" style={{ gap: 8, fontSize: textPx(14), lineHeight: "20px" }}>
                Every
                <input
                  id="hc-interval"
                  inputMode="numeric"
                  value={intervalText}
                  onChange={(e) => setIntervalText(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  aria-label="How often, in months"
                  className="bg-cream-soft text-charcoal text-center focus:outline-none"
                  style={{ width: 64, minHeight: 44, borderRadius: 12, border: `0.5px solid ${hairAt(dark, 0.08)}` }}
                />
                months
              </label>
              {!intervalOk && <PopupNote>Enter a number from 1 to 120.</PopupNote>}
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <FieldLabel>Date done</FieldLabel>
            <DateBox
              label={day ? doneLabel(day, today) : "Add a date"}
              placeholder={!day}
              onClick={() => setCalOpen(true)}
              ariaLabel={day ? `Date done: ${doneLabel(day, today)}` : "Date done: add a date"}
            />
            {editing && day && (
              <button type="button" onClick={() => setDay(null)} className="tap text-status-high" style={{ marginTop: 6, minHeight: 32, fontSize: textPx(13), lineHeight: "19.5px", fontWeight: 700 }}>
                Clear the date
              </button>
            )}
          </div>
          {remindersReady && (
            <div className="flex items-center justify-between" style={{ marginTop: 16, gap: 12 }}>
              <span className="text-charcoal" style={{ fontSize: textPx(13), lineHeight: "19.5px", fontWeight: 600 }}>
                Remind me when it's due
              </span>
              <Toggle checked={remind} onChange={setRemind} label="Remind me when it's due" />
            </div>
          )}
          {remindersReady && remind && notificationsOff && <NotificationsOffLine onTurnOn={() => navigate("/app/settings/notifications")} style={{ marginTop: 10 }} />}
          {(note || offline) && <PopupNote>{note ?? OFFLINE_ACTION}</PopupNote>}
          <ButtonRow
            style={{ marginTop: 16 }}
            secondary={{ label: "Cancel", onClick: onClose }}
            primary={{ label: "Save", onClick: () => void save(), disabled: !canSave || offline, loading: busy }}
          />
        </div>
      </CentredPopup>
      <PopupMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchor={fieldEl}
        matchWidth={fieldEl}
        options={menuOptions}
        selected={isOther ? "__other" : checkId}
        variant="field"
        onSelect={(v) => {
          setMenuOpen(false);
          if (v === "__other") {
            setCheckId(null);
            setOther("");
          } else {
            setCheckId(v);
            setOther(null);
          }
        }}
      />
      <CalendarPickerSheet
        variant="partB"
        open={calOpen}
        onClose={() => setCalOpen(false)}
        title="Date done"
        selectedDate={day ?? today}
        today={today}
        maxDate={today}
        onSelect={setDay}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// OURS: Hide / Delete

export const HideOrDeletePopup: React.FC<{
  open: boolean;
  onClose: () => void;
  check: CheckOption | null;
  onConfirm: () => Promise<{ ok: boolean; message?: string }>;
}> = ({ open, onClose, check, onConfirm }) => {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!check) return null;
  const custom = !!check.custom;
  return (
    <CentredPopup
      open={open}
      onClose={() => {
        setNote(null);
        onClose();
      }}
      title={custom ? "Delete this check?" : "Hide this check?"}
      geometry="partB"
      align="start"
      bodyWeight={400}
      body={custom ? `${check.name} and its reminder are removed. This can't be undone.` : `${check.name} moves to Hidden checks. You can show it again from the menu.`}
    >
      {note && <PopupNote>{note}</PopupNote>}
      <ButtonRow
        style={{ marginTop: 0 }}
        secondary={{ label: "Keep", onClick: onClose }}
        primary={{
          label: custom ? "Delete" : "Hide",
          tone: custom ? "destructive" : "primary",
          loading: busy,
          onClick: async () => {
            if (browserOffline()) return setNote(OFFLINE_ACTION);
            setBusy(true);
            const r = await onConfirm();
            setBusy(false);
            if (!r.ok) return setNote(SAVE_FAILED);
            onClose();
          },
        }}
      />
    </CentredPopup>
  );
};

// ---------------------------------------------------------------------------
// OURS: Hidden checks sheet

export const HiddenChecksSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  hidden: CheckOption[];
  onShow: (id: string) => void;
}> = ({ open, onClose, hidden, onShow }) => {
  const dark = useIsDark();
  return (
    <BottomSheet open={open} onClose={onClose} title="Hidden checks" chrome="partB" tone={partBSheetTone(dark)}>
      {hidden.length === 0 ? (
        <p className="text-center text-charcoal-soft" style={{ margin: "8px 0", fontSize: textPx(13), lineHeight: "19.5px" }}>
          Nothing hidden.
        </p>
      ) : (
        <div className="bg-cream-card" style={{ borderRadius: 18, border: `0.5px solid ${hairAt(dark, 0.08)}`, overflow: "hidden" }}>
          {hidden.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center"
              style={{ minHeight: 72, padding: "10px 14px 10px 12px", gap: 10, borderTop: i > 0 ? `0.5px solid ${hairAt(dark, 0.05)}` : undefined }}
            >
              <CheckTile id={c.id} />
              <span className="flex-1 min-w-0">
                <span className="block text-charcoal" style={{ fontSize: textPx(13.5), lineHeight: "18px", fontWeight: 600 }}>
                  {c.name}
                </span>
                <span className="block text-charcoal-faint" style={{ marginTop: 2, fontSize: textPx(11), lineHeight: "15px" }}>
                  {c.frequency}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onShow(c.id)}
                className="tap text-th-7d6bb5 dark:text-primary-deep-text"
                style={{ minHeight: 44, padding: "0 4px", fontSize: textPx(13), lineHeight: "19.5px", fontWeight: 700 }}
              >
                Show
              </button>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
};

// ---------------------------------------------------------------------------
// HE1.8.2 Set a reminder (per check; B4)

/** "Notifications are off. Turn on ›" (HE1.8.2 #61-#63). */
export const NotificationsOffLine: React.FC<{ onTurnOn: () => void; style?: React.CSSProperties }> = ({ onTurnOn, style }) => (
  <p className="flex items-center flex-wrap bg-cream-soft text-charcoal-soft" style={{ margin: 0, borderRadius: 12, padding: "10px 12px", gap: 6, fontSize: textPx(12), lineHeight: "17.4px", ...style }}>
    <BellOff size={14} aria-hidden className="shrink-0" />
    <span>Notifications are off.</span>
    <button type="button" onClick={onTurnOn} className="tap text-th-7d6bb5 dark:text-primary-deep-text" style={{ fontWeight: 700, minHeight: 24 }}>
      Turn on ›
    </button>
  </p>
);

const REPEATS: { value: string; label: string }[] = [
  { value: "none", label: "None" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
];

export const CheckReminderSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  checks: CheckOption[];
  /** Prefill: an existing reminder, or a default for a new one (O4). */
  initial: CheckReminder;
  editing: boolean;
  notificationsOff: boolean;
  today: string;
  onSave: (r: CheckReminder) => Promise<{ ok: boolean; message?: string }>;
  onRemove: (checkId: string) => void;
}> = ({ open, onClose, checks, initial, editing, notificationsOff, today, onSave, onRemove }) => {
  const navigate = useNavigate();
  const dark = useIsDark();
  const [checkEl, checkRef] = useState<HTMLButtonElement | null>(null);
  const [repeatEl, repeatRef] = useState<HTMLButtonElement | null>(null);
  const [menu, setMenu] = useState<"check" | "repeat" | null>(null);
  const [r, setR] = useState<CheckReminder>(initial);
  const [calOpen, setCalOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setR(initial);
    setNote(null);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }
  const [hh, mm] = r.time.split(":").map(Number);
  const check = checks.find((c) => c.id === r.checkId);
  const past = r.date < today;
  const repeatKey = r.repeat.kind === "months" ? "custom" : r.repeat.kind;
  const field: React.CSSProperties = { minHeight: 44, borderRadius: 12, padding: "0 12px", gap: 8, border: `0.5px solid ${hairAt(dark, 0.1)}` };
  const repeatText = REPEATS.find((x) => x.value === repeatKey)?.label ?? "None";

  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (browserOffline()) return setNote(OFFLINE_ACTION);
    setBusy(true);
    const res = await onSave(r);
    setBusy(false);
    if (!res.ok) return setNote("Couldn't set the reminder. Try again.");
    onClose();
  };

  return (
    <>
      <BottomSheet
        open={open && !calOpen}
        onClose={onClose}
        title="Set a reminder"
        chrome="partB"
        tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={
          <div>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  onRemove(r.checkId);
                  onClose();
                }}
                className="tap w-full text-status-high"
                style={{ minHeight: 40, marginBottom: 6, fontSize: textPx(13), lineHeight: "19.5px", fontWeight: 700 }}
              >
                Remove reminder
              </button>
            )}
            <CtaButton
              label="Save reminder"
              onClick={() => void save()}
              loading={busy}
              disabled={past || !check}
              className="!h-[50px] !rounded-[14px] !text-[15px]"
              style={{ background: "rgb(var(--c-fill-pinned))", lineHeight: "22.5px" }}
            />
          </div>
        }
      >
        <FieldLabel>Check</FieldLabel>
        <button ref={checkRef} type="button" onClick={() => setMenu("check")} className="tap w-full flex items-center bg-cream-soft text-left" style={field}>
          <span className="flex-1 min-w-0 truncate text-charcoal" style={{ fontSize: textPx(14), lineHeight: "20px" }}>
            {check?.name ?? "Choose a check"}
          </span>
          <ChevronDown size={16} className="shrink-0 text-charcoal-faint" aria-hidden />
        </button>

        <div style={{ marginTop: 16 }}>
          <FieldLabel>Date</FieldLabel>
          <DateBox label={shortDate(r.date)} onClick={() => setCalOpen(true)} ariaLabel={`Date: ${shortDate(r.date)}`} />
          {past && <PopupNote>Pick a date from today on.</PopupNote>}
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel>Time</FieldLabel>
          <TimeWheel
            value={{ h: hh, m: mm }}
            minuteStep={5}
            onChange={(v) => setR({ ...r, time: `${String(v.h).padStart(2, "0")}:${String(v.m).padStart(2, "0")}` })}
          />
          <span className="sr-only">{clock12(new Date(2000, 0, 1, hh, mm))}</span>
        </div>

        <div style={{ marginTop: 16 }}>
          <FieldLabel>Repeat</FieldLabel>
          <button ref={repeatRef} type="button" onClick={() => setMenu("repeat")} className="tap w-full flex items-center bg-cream-soft text-left" style={field}>
            <span className="flex-1 min-w-0 truncate text-charcoal" style={{ fontSize: textPx(14), lineHeight: "20px" }}>
              {r.repeat.kind === "months" ? `Every ${r.repeat.n} months` : repeatText}
            </span>
            <ChevronDown size={16} className="shrink-0 text-charcoal-faint" aria-hidden />
          </button>
          {r.repeat.kind === "months" && (
            <label className="flex items-center text-charcoal-soft" style={{ marginTop: 10, gap: 8, fontSize: textPx(13) }}>
              Every
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                value={r.repeat.n}
                onChange={(e) => setR({ ...r, repeat: { kind: "months", n: Math.max(1, Math.min(60, Number(e.target.value) || 1)) } })}
                className="bg-cream-soft text-charcoal text-center focus:outline-none"
                style={{ width: 64, height: 40, borderRadius: 10, border: `0.5px solid ${hairAt(dark, 0.1)}` }}
              />
              months
            </label>
          )}
        </div>

        {notificationsOff && <NotificationsOffLine onTurnOn={() => navigate("/app/settings/notifications")} style={{ marginTop: 14 }} />}
        {note && <PopupNote>{note}</PopupNote>}
      </BottomSheet>
      <PopupMenu
        open={menu === "check"}
        onClose={() => setMenu(null)}
        anchor={checkEl}
        matchWidth={checkEl}
        variant="field"
        options={checks.map((c) => ({ value: c.id, label: c.name }))}
        selected={r.checkId}
        onSelect={(v) => {
          setMenu(null);
          setR({ ...r, checkId: v });
        }}
      />
      <PopupMenu
        open={menu === "repeat"}
        onClose={() => setMenu(null)}
        anchor={repeatEl}
        matchWidth={repeatEl}
        variant="field"
        options={REPEATS}
        selected={repeatKey}
        onSelect={(v) => {
          setMenu(null);
          const repeat: ReminderRepeat = v === "custom" ? { kind: "months", n: 6 } : ({ kind: v } as ReminderRepeat);
          setR({ ...r, repeat });
        }}
      />
      <CalendarPickerSheet
        variant="partB"
        open={calOpen}
        onClose={() => setCalOpen(false)}
        title="Date"
        selectedDate={r.date}
        today={today}
        minDate={today}
        onSelect={(d) => setR({ ...r, date: d })}
      />
    </>
  );
};

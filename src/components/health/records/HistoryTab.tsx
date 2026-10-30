import { partBSheetTone } from "../log/LogSheetParts";
import React, { useEffect, useState } from "react";
import { CalendarDays, Check, Pencil, Pill, Plus, Trash2, X } from "lucide-react";
import { SwipeActions } from "../../ui/SwipeActions";
import { Toggle } from "../../ui/Toggle";
import { BottomSheet } from "../../ui/BottomSheet";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton } from "../../ui/PinnedCta";
import { WheelPicker } from "../../ui/WheelPicker";
import { CalendarPickerSheet } from "../../dashboard/CalendarPickerSheet";
import { useApp } from "../../../context/AppContext";
import { updateSurgeryRemote } from "../../../services/medical-history";
import { time12, minutesOfDay, clockParts } from "../../../utils/time12";
import { textPx, linePx } from "../../../theme/textSize";
import type { Medication, MedicationRoute, Surgery } from "../../../types";
import type { Injury } from "../../../services/injuries";
import { InjuriesSection } from "./InjuriesSection";
import { ProfileProposals } from "../../client-forms/ProfileProposals";
import { useHideNumbers } from "../../../hooks/useHideNumbers";
import {
  useHealthMode,
  hairline,
  fieldStyle,
  fmtDate,
  deepInk,
  ListCard,
  RowTile,
  RowText,
  Skel,
  RetryCard,
  ErrorLine,
  rowRule,
  SectionCaps,
  FieldLabel,
  HelpLine,
  INK_SOFT,
  INK_FAINT,
} from "./kit";

// HE1.9.c · History tab (the repo's Medical history and Medications tabs in
// one): Conditions as chips (saved on tap, "Add another" → our Condition
// popup), Past surgeries and Medications as swipe rows (Edit / Delete), the
// medication reminder toggle. Pinned "+ Add to history" opens Condition ·
// Surgery · Medication (OURS-history-forms).
//
// KEPT: the enum route labels (Oral, Injectable, Topical, Inhaled, Other: K1),
// the required-date help on surgeries verbatim (K2), several times a day
// with remove (K3, a wheel per time). 12-hour times (X-14).
//
// Medication reminders: the toggle is medications.notify_enabled, which the
// B4 sweep (queue_medication_reminders, every 10 minutes) now delivers.

export const COMMON_CONDITIONS = ["Diabetes", "Hypertension", "Asthma", "Thyroid condition", "Heart condition", "PCOS", "Anxiety/Depression", "Arthritis"];
export const ROUTES: { value: MedicationRoute; label: string }[] = [
  { value: "oral", label: "Oral" },
  { value: "injectable", label: "Injectable" },
  { value: "topical", label: "Topical" },
  { value: "inhaled", label: "Inhaled" },
  { value: "other", label: "Other" },
];
const routeLabel = (r: MedicationRoute) => ROUTES.find((x) => x.value === r)?.label ?? r;

export const HistoryTab: React.FC<{
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAddCondition: () => void;
  onEditSurgery: (s: Surgery) => void;
  onEditMedication: (m: Medication) => void;
  /** Round D: the Injuries list's Edit (the page owns the sheet). Omitted, the list isn't shown. */
  onEditInjury?: (i: Injury) => void;
  /**
   * Release 3 (W3): a client's history as a professional reads it (the
   * Medical history switch), read only: the client's conditions as chips, the
   * surgeries and medications as plain rows. Omitted (the default), the tab
   * shows and edits the signed-in person's own history exactly as before.
   */
  records?: { comorbidities: string[]; surgeries: Surgery[]; medications: Medication[] };
}> = ({ loading, error, onRetry, onAddCondition, onEditSurgery, onEditMedication, onEditInjury, records }) => {
  const app = useApp();
  const { dark, hc } = useHealthMode();
  if (records) return <ReadOnlyHistory records={records} loading={loading} error={error} onRetry={onRetry} dark={dark} hc={hc} />;
  return <OwnHistory app={app} dark={dark} hc={hc} loading={loading} error={error} onRetry={onRetry} onAddCondition={onAddCondition} onEditSurgery={onEditSurgery} onEditMedication={onEditMedication} onEditInjury={onEditInjury} />;
};

const ReadOnlyHistory: React.FC<{
  records: { comorbidities: string[]; surgeries: Surgery[]; medications: Medication[] };
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  dark: boolean;
  hc: boolean;
}> = ({ records, loading, error, onRetry, dark, hc }) => {
  const { comorbidities, surgeries, medications } = records;
  if (error && !comorbidities.length && !surgeries.length && !medications.length) return <RetryCard message="Couldn't load the history." onRetry={onRetry} />;
  const empty = (text: string) => <p style={{ margin: "0 0 9px", fontSize: textPx(11), lineHeight: linePx(16), color: INK_FAINT }}>{text}</p>;
  const chip: React.CSSProperties = { height: 30, padding: "0 12px", borderRadius: 9999, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, background: dark ? "rgb(var(--th-303141))" : "rgb(var(--th-f0edf9))", color: dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-5f5093))" };
  return (
    <div>
      <SectionCaps style={{ marginTop: 0 }}>Conditions</SectionCaps>
      {loading && !comorbidities.length ? (
        <Skel w={120} h={30} r={15} />
      ) : comorbidities.length === 0 ? (
        empty("No conditions recorded.")
      ) : (
        <div className="flex flex-wrap" style={{ gap: 7 }}>
          {comorbidities.map((c) => (
            <span key={c} className="inline-flex items-center" style={chip}>
              {c}
            </span>
          ))}
        </div>
      )}
      <SectionCaps>Past surgeries</SectionCaps>
      {surgeries.length === 0 ? (
        empty("No surgeries recorded.")
      ) : (
        <ListCard>
          {surgeries.map((s, i) => (
            <div key={s.id} className="flex items-center" style={{ minHeight: 60, padding: "9px 14px", borderTop: i ? rowRule(dark, hc) : undefined }}>
              <RowText title={s.name} meta={surgeryDate(s)} />
            </div>
          ))}
        </ListCard>
      )}
      <SectionCaps>Medications</SectionCaps>
      {medications.length === 0 ? (
        empty("No medications recorded.")
      ) : (
        <ListCard>
          {medications.map((m, i) => (
            <div key={m.id} className="flex items-center" style={{ minHeight: 66, padding: "9px 14px", gap: 11, borderTop: i ? rowRule(dark, hc) : undefined }}>
              <RowTile icon={Pill} />
              <RowText title={`${m.name} · ${m.dose}`} meta={[routeLabel(m.route), m.times.length ? m.times.map(time12).join(", ") : null].filter(Boolean).join(" · ")} />
            </div>
          ))}
        </ListCard>
      )}
    </div>
  );
};

const OwnHistory: React.FC<{
  app: ReturnType<typeof useApp>;
  dark: boolean;
  hc: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAddCondition: () => void;
  onEditSurgery: (s: Surgery) => void;
  onEditMedication: (m: Medication) => void;
  onEditInjury?: (i: Injury) => void;
}> = ({ app, dark, hc, loading, error, onRetry, onAddCondition, onEditSurgery, onEditMedication, onEditInjury }) => {
  const { comorbidities, setComorbidities, surgeries, removeSurgery, medications, updateMedication, removeMedication } = app;
  const [recordError, setRecordError] = useState<{ section: string; message: string } | null>(null);
  const hideNumbers = useHideNumbers();

  const run = async (section: string, action: () => Promise<{ ok: boolean; message?: string }>) => {
    setRecordError(null);
    const r = await action();
    if (!r.ok) setRecordError({ section, message: navigator.onLine === false ? "You're offline. Try again when you're connected." : "Couldn't save. Try again." });
  };
  const toggle = (c: string) => void run("conditions", () => setComorbidities(comorbidities.includes(c) ? comorbidities.filter((x) => x !== c) : [...comorbidities, c]));

  if (error && !comorbidities.length && !surgeries.length && !medications.length) return <RetryCard message="Couldn't load your history." onRetry={onRetry} />;

  const chipBase: React.CSSProperties = { height: 30, padding: "0 12px", gap: 4, borderRadius: 9999, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600 };
  const chips = [...COMMON_CONDITIONS, ...comorbidities.filter((c) => !COMMON_CONDITIONS.includes(c))];
  const errFor = (s: string) => (recordError?.section === s ? <ErrorLine style={{ marginTop: 8 }}>{recordError.message}</ErrorLine> : null);
  const empty = (text: string) => <p style={{ margin: "0 0 9px", fontSize: textPx(11), lineHeight: linePx(16), color: INK_FAINT }}>{text}</p>;

  return (
    <div>
      {/* Round D: answers from a sent form still waiting for the client's yes or no. */}
      <ProfileProposals responseId={null} hideNumbers={hideNumbers} />
      <SectionCaps style={{ marginTop: 0 }}>Conditions</SectionCaps>
      {loading && !comorbidities.length ? (
        <div className="flex flex-wrap" style={{ gap: 7 }}>
          {[76, 90, 70, 110, 64].map((w, i) => (
            <Skel key={i} w={w} h={30} r={15} />
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap" style={{ gap: 7 }}>
            {chips.map((c) => {
              const on = comorbidities.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(c)}
                  className="tap inline-flex items-center"
                  style={
                    on
                      ? { ...chipBase, background: dark ? "rgb(var(--th-303141))" : "rgb(var(--th-f0edf9))", border: `0.5px solid ${dark ? "rgb(var(--c-primary) / 0.5)" : "rgb(var(--th-aea1dc) / 0.5)"}`, color: dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-5f5093))" }
                      : { ...chipBase, background: "rgb(var(--c-cream-card))", border: `0.5px solid ${hairline(dark, hc, 0.12)}`, color: INK_SOFT }
                  }
                >
                  {on && <Check size={12} aria-hidden />}
                  {c}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onAddCondition}
              className="tap inline-flex items-center"
              style={{ ...chipBase, fontWeight: 700, color: deepInk(dark), border: `0.5px dashed ${dark ? "rgb(var(--th-c3b3fb) / 0.5)" : "rgb(var(--th-7d6bb5) / 0.5)"}` }}
            >
              <Plus size={12} aria-hidden /> Add another
            </button>
          </div>
          {comorbidities.length === 0 && <p style={{ marginTop: 8, fontSize: textPx(11), lineHeight: linePx(16), color: INK_FAINT }}>Tap any that apply.</p>}
          {errFor("conditions")}
        </>
      )}

      <SectionCaps>Past surgeries</SectionCaps>
      {loading && !surgeries.length ? (
        <ListCard>
          <div style={{ height: 60, padding: "9px 14px" }} className="flex flex-col justify-center gap-2">
            <Skel w="45%" h={11} />
            <Skel w="30%" h={9} />
          </div>
        </ListCard>
      ) : surgeries.length === 0 ? (
        empty("No surgeries added.")
      ) : (
        <ListCard>
          {surgeries.map((s, i) => (
            <div key={s.id} style={{ borderTop: i ? rowRule(dark, hc) : undefined }}>
              <SwipeActions
                radius={0}
                tileMax={45}
                tileRadius={12}
                edgeInset={8}
                keyboardLabel={`${s.name}, ${fmtDate(s.date)}`}
                actions={[
                  { key: "edit", label: "Edit", icon: <Pencil size={16} />, onClick: () => onEditSurgery(s) },
                  { key: "delete", label: "Delete", icon: <Trash2 size={16} />, destructive: true, onClick: () => void run("surgeries", () => removeSurgery(s.id)) },
                ]}
              >
                <div className="flex items-center" style={{ minHeight: 60, padding: "9px 14px", background: "rgb(var(--c-cream-card))" }}>
                  <RowText title={s.name} meta={surgeryDate(s)} />
                </div>
              </SwipeActions>
            </div>
          ))}
        </ListCard>
      )}
      {errFor("surgeries")}

      <SectionCaps>Medications</SectionCaps>
      {loading && !medications.length ? (
        <ListCard>
          <div style={{ height: 66, padding: "9px 14px" }} className="flex items-center gap-3">
            <Skel w={32} h={32} r={10} />
            <Skel w="50%" h={11} />
          </div>
        </ListCard>
      ) : medications.length === 0 ? (
        empty("No medications added.")
      ) : (
        <>
          <ListCard>
            {medications.map((m, i) => (
              <div key={m.id} style={{ borderTop: i ? rowRule(dark, hc) : undefined }}>
                <SwipeActions
                  radius={0}
                  tileMax={45}
                  tileRadius={12}
                  edgeInset={8}
                  keyboardLabel={`${m.name}, ${m.dose}`}
                  actions={[
                    { key: "edit", label: "Edit", icon: <Pencil size={16} />, onClick: () => onEditMedication(m) },
                    { key: "delete", label: "Delete", icon: <Trash2 size={16} />, destructive: true, onClick: () => void run("medications", () => removeMedication(m.id)) },
                  ]}
                >
                  <div className="flex items-center" style={{ minHeight: 66, padding: "9px 14px", gap: 11, background: "rgb(var(--c-cream-card))" }}>
                    <RowTile icon={Pill} />
                    <RowText
                      title={`${m.name} · ${m.dose}`}
                      meta={`${routeLabel(m.route)} · ${m.times.map(time12).join(", ")} · reminder ${m.notifyEnabled ? "on" : "off"}`}
                    />
                    <Toggle checked={m.notifyEnabled} onChange={(v) => void run("medications", () => updateMedication(m.id, { notifyEnabled: v }))} label={`Reminder for ${m.name}`} />
                  </div>
                </SwipeActions>
              </div>
            ))}
          </ListCard>
        </>
      )}
      {errFor("medications")}

      {onEditInjury && <InjuriesSection onEdit={onEditInjury} />}
    </div>
  );
};

/** B2 surgeries.date_precision: "14 Jul 2026" / "Jul 2026" / "2026". */
export function surgeryDate(s: Pick<Surgery, "date" | "datePrecision">): string {
  const p = s.datePrecision ?? "day";
  if (p === "year") return s.date.slice(0, 4);
  if (p === "month") return fmtDate(s.date).split(" ").slice(1).join(" ");
  return fmtDate(s.date);
}

// ---------------------------------------------------------------------------
// OURS-history-forms

/** Condition popup (OURS geometry 342 / r22 / 48): name 2-60 characters. */
export const ConditionPopup: React.FC<{ open: boolean; onClose: () => void; onSaved: (m: string) => void }> = ({ open, onClose, onSaved }) => {
  const { comorbidities, setComorbidities } = useApp();
  const { dark, hc } = useHealthMode();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
    }
  }, [open]);
  const value = name.trim();
  const valid = value.length >= 2 && value.length <= 60;
  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      title="Add a condition"
      geometry="ours"
      align="start"
    >
      <FieldLabel htmlFor="condition-name">Condition name</FieldLabel>
      <input id="condition-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoFocus className="outline-none" style={fieldStyle(dark, hc)} />
      {error && <HelpLine error>{error}</HelpLine>}
      <div className="flex" style={{ gap: 8, marginTop: 16 }}>
        <button type="button" onClick={onClose} className="tap flex-1" style={{ height: 48, borderRadius: 14, border: `0.5px solid ${hairline(dark, hc, 0.14)}`, color: INK_SOFT, fontSize: textPx(14), fontWeight: 700 }}>
          Cancel
        </button>
        <CtaButton
          size="page"
          label="Add"
          disabled={!valid}
          loading={busy}
          className="flex-1"
          onClick={async () => {
            if (comorbidities.some((c) => c.toLowerCase() === value.toLowerCase())) return onClose();
            setBusy(true);
            const r = await setComorbidities([...comorbidities, value]);
            setBusy(false);
            if (!r.ok) return setError("Couldn't save. Try again.");
            onSaved("Condition added.");
            onClose();
          }}
        />
      </div>
    </CentredPopup>
  );
};

/** Surgery sheet: Procedure, Date (required help verbatim, K2). */
export const SurgerySheet: React.FC<{ open: boolean; surgery: Surgery | null; onClose: () => void; onSaved: (m: string) => void }> = ({ open, surgery, onClose, onSaved }) => {
  const { addSurgery, today, reloadHealthRecords } = useApp();
  const { dark, hc } = useHealthMode();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [precision, setPrecision] = useState<"day" | "month" | "year">("day");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setName(surgery?.name ?? "");
    setDate(surgery?.date ?? "");
    setPrecision(surgery?.datePrecision ?? "day");
    setError(null);
  }, [open, surgery]);
  const save = async () => {
    if (!name.trim() || !date) return;
    setBusy(true);
    setError(null);
    // An unknown day is stored as the 1st, an unknown month as 1 January (B2).
    const stored = precision === "year" ? `${date.slice(0, 4)}-01-01` : precision === "month" ? `${date.slice(0, 7)}-01` : date;
    const payload = { name: name.trim(), date: stored, datePrecision: precision };
    const r = surgery ? await updateSurgeryRemote(surgery.id, payload) : await addSurgery(payload);
    if (r.ok && surgery) await reloadHealthRecords();
    setBusy(false);
    if (!r.ok) return setError("Couldn't save. Try again.");
    onSaved(surgery ? "Changes saved." : "Surgery added.");
    onClose();
  };
  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={surgery ? "Edit surgery" : "Add surgery"}
        chrome="partB" tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={<CtaButton label="Save" onClick={() => void save()} loading={busy} disabled={!name.trim() || !date} />}
      >
        <FieldLabel htmlFor="surgery-name">Procedure</FieldLabel>
        <input id="surgery-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ACL reconstruction" className="outline-none placeholder:text-charcoal-faint" style={fieldStyle(dark, hc)} />
        <FieldLabel style={{ marginTop: 16 }}>Date</FieldLabel>
        <button type="button" onClick={() => setCalendarOpen(true)} className="tap flex items-center text-start" style={{ ...fieldStyle(dark, hc), gap: 8, color: date ? undefined : INK_FAINT }}>
          <CalendarDays size={15} style={{ color: INK_FAINT }} aria-hidden />
          {date ? surgeryDate({ date, datePrecision: precision }) : "Choose a date"}
        </button>
        <div role="radiogroup" aria-label="How exact is the date?" className="flex" style={{ gap: 6, marginTop: 8 }}>
          {([
            ["day", "Exact day"],
            ["month", "Month only"],
            ["year", "Year only"],
          ] as const).map(([v, label]) => {
            const on = precision === v;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPrecision(v)}
                className="tap"
                style={{ height: 36, padding: "0 14px", borderRadius: 11, background: on ? "rgb(var(--c-seg-active))" : dark ? "rgb(var(--th-303141))" : "rgb(var(--th-f5f4fe))", color: on ? "rgb(var(--c-on-primary-fill))" : INK_SOFT, fontSize: textPx(12.5), fontWeight: 700 }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {/* The date is required because surgery_date is NOT NULL. */}
        <HelpLine>Required. If you're not sure of the exact day, your best estimate is fine.</HelpLine>
        {error && <HelpLine error>{error}</HelpLine>}
      </BottomSheet>
      <CalendarPickerSheet variant="partB" open={calendarOpen} onClose={() => setCalendarOpen(false)} selectedDate={date || today} today={today} maxDate={today} onSelect={(d) => { setDate(d); setCalendarOpen(false); }} />
    </>
  );
};

const HOURS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
const MINUTES = Array.from({ length: 12 }, (_, i) => ({ value: i * 5, label: String(i * 5).padStart(2, "0") }));
const toHHMM = (h: number, m: number, mer: "AM" | "PM") => {
  const h24 = (h % 12) + (mer === "PM" ? 12 : 0);
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** One dose time: the 12-hour value, opening a wheel (hours, minutes in 5s, AM/PM). */
const TimeRow: React.FC<{ value: string; onChange: (v: string) => void; onRemove?: () => void; index: number }> = ({ value, onChange, onRemove, index }) => {
  const { dark, hc } = useHealthMode();
  const [open, setOpen] = useState(false);
  const parts = clockParts(minutesOfDay(value) ?? 480);
  const minute = Math.round(parts.minute / 5) * 5 === 60 ? 55 : Math.round(parts.minute / 5) * 5;
  return (
    <div style={{ marginTop: index ? 8 : 0 }}>
      <div className="flex items-center" style={{ gap: 8 }}>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="tap flex-1 text-start" style={fieldStyle(dark, hc, 600)}>
          {time12(value)}
        </button>
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label={`Remove time ${index + 1}`} className="tap grid place-items-center shrink-0" style={{ width: 44, height: 44, color: INK_FAINT }}>
            <X size={15} />
          </button>
        )}
      </div>
      {open && (
        <div style={{ marginTop: 8 }}>
          <WheelPicker
            columns={[
              { label: "Hours", options: HOURS, value: parts.hour, onChange: (h) => onChange(toHHMM(Number(h), minute, parts.meridiem)) },
              { label: "Minutes", options: MINUTES, value: minute, onChange: (m) => onChange(toHHMM(parts.hour, Number(m), parts.meridiem)) },
              {
                label: "AM or PM",
                options: [
                  { value: "AM", label: "AM" },
                  { value: "PM", label: "PM" },
                ],
                value: parts.meridiem,
                onChange: (mer) => onChange(toHHMM(parts.hour, minute, mer as "AM" | "PM")),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};

/** Medication sheet: Name, Dose, Route options, Times (wheels), reminder toggle. */
export const MedicationSheet: React.FC<{ open: boolean; medication: Medication | null; onClose: () => void; onSaved: (m: string) => void }> = ({ open, medication, onClose, onSaved }) => {
  const { addMedication, updateMedication } = useApp();
  const { dark, hc } = useHealthMode();
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [route, setRoute] = useState<MedicationRoute>("oral");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setName(medication?.name ?? "");
    setDose(medication?.dose ?? "");
    setRoute(medication?.route ?? "oral");
    setTimes(medication?.times.length ? medication.times : ["08:00"]);
    setNotify(medication?.notifyEnabled ?? true);
    setError(null);
  }, [open, medication]);
  const valid = !!name.trim() && !!dose.trim();
  const save = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    const payload = { name: name.trim(), dose: dose.trim(), route, times, notifyEnabled: notify };
    const r = medication ? await updateMedication(medication.id, payload) : await addMedication(payload);
    setBusy(false);
    if (!r.ok) return setError("Couldn't save. Try again.");
    onSaved(medication ? "Changes saved." : "Medication added.");
    onClose();
  };
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={medication ? "Edit medication" : "Add medication"}
      chrome="partB" tone={partBSheetTone(dark)}
      footerBottom={30}
      footer={<CtaButton label="Save" onClick={() => void save()} loading={busy} disabled={!valid} />}
    >
      <FieldLabel htmlFor="med-name">Name</FieldLabel>
      <input id="med-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vitamin D3" className="outline-none placeholder:text-charcoal-faint" style={fieldStyle(dark, hc)} />
      <FieldLabel htmlFor="med-dose" style={{ marginTop: 16 }}>
        Dose
      </FieldLabel>
      <input id="med-dose" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 2000 IU" className="outline-none placeholder:text-charcoal-faint" style={fieldStyle(dark, hc)} />
      <FieldLabel style={{ marginTop: 16 }}>Route</FieldLabel>
      <div role="radiogroup" aria-label="Route" className="flex flex-wrap" style={{ gap: 6 }}>
        {ROUTES.map((r) => {
          const on = route === r.value;
          return (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setRoute(r.value)}
              className="tap"
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 11,
                background: on ? "rgb(var(--c-seg-active))" : dark ? "rgb(var(--th-303141))" : "rgb(var(--th-f5f4fe))",
                color: on ? "rgb(var(--c-on-primary-fill))" : INK_SOFT,
                fontSize: textPx(12.5),
                lineHeight: linePx(18.8),
                fontWeight: 700,
              }}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <FieldLabel style={{ marginTop: 16 }}>Times</FieldLabel>
      {times.map((t, i) => (
        <TimeRow
          key={i}
          index={i}
          value={t}
          onChange={(v) => setTimes((prev) => prev.map((p, j) => (j === i ? v : p)))}
          onRemove={times.length > 1 ? () => setTimes((prev) => prev.filter((_, j) => j !== i)) : undefined}
        />
      ))}
      {times.length < 6 && (
        <button type="button" onClick={() => setTimes((prev) => [...prev, "08:00"])} className="tap flex items-center min-h-[44px]" style={{ gap: 6, fontSize: textPx(13), fontWeight: 700, color: deepInk(dark) }}>
          <Plus size={15} aria-hidden /> Add another time
        </button>
      )}
      <div className="flex items-center justify-between" style={{ marginTop: 8, gap: 12 }}>
        <span style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>Remind me to take this</span>
        <Toggle checked={notify} onChange={setNotify} label="Remind me to take this" />
      </div>
      {error && <HelpLine error>{error}</HelpLine>}
    </BottomSheet>
  );
};

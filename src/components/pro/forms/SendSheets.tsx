import React, { useEffect, useMemo, useState } from "react";
import { Bandage, CalendarCheck, Check, ChevronDown, Clock, Send, Wheat } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { CentredPopup } from "../../ui/CentredPopup";
import { PopupMenu } from "../../ui/PopupMenu";
import { INK } from "../proInk";
import { ListCard } from "../client/kit";
import { ComingSoonPill } from "../ComingSoon";
import { ChoiceChips, FieldLabel, RadioRows } from "./moKit";
import { DAY_LONG } from "../../../utils/week";
import { time12 } from "../../../utils/time12";
import { SCHEDULE_TIMES, parseSchedule, scheduleLine, scheduleString } from "./formModel";
import { assignForm, cancelAssignment, type FormAssignment } from "../../../services/pro/forms";
import { fetchActiveMealPlans, fetchActiveProgrammes } from "../../../services/pro/clients";
import type { ProLane } from "../subtypeLanes";

const OFFLINE = "You're offline. Try again when you're connected.";

interface Person {
  clientId: string;
  name: string;
}

function useRoster(): Person[] {
  const { professionalClients } = useApp();
  return useMemo(
    () =>
      professionalClients
        .filter((c): c is typeof c & { clientId: string } => !!c.clientId)
        .map((c) => ({ clientId: c.clientId, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [professionalClients]
  );
}

const firstOf = (name: string) => name.split(" ")[0] || name;

/** A checkable client row (the refer sheet's pick rows, gen/r15.js): r14, 1px border, primary pale when chosen. */
const PersonRow: React.FC<{ name: string; line?: string; on: boolean; multi?: boolean; onClick: () => void }> = ({ name, line, on, multi, onClick }) => (
  <button
    type="button"
    role={multi ? "checkbox" : "radio"}
    aria-checked={on}
    onClick={onClick}
    className="tap w-full flex items-center text-left"
    style={{ gap: 12, padding: "10px 12px", borderRadius: 14, border: `1px solid ${on ? INK.pr : INK.b10}`, background: on ? INK.prPale : INK.card, marginBottom: 8, minHeight: 44 }}
  >
    <span className="flex-1 min-w-0">
      <span className="block truncate" style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>
        {name}
      </span>
      {line && (
        <span className="block" style={{ fontSize: textPx(12), color: INK.chF }}>
          {line}
        </span>
      )}
    </span>
    <span className="flex items-center justify-center shrink-0" style={{ width: 20, height: 20, borderRadius: multi ? 6 : 9999, border: `2px solid ${on ? INK.prDeep : "rgb(var(--c-charcoal) / 0.11)"}`, background: multi && on ? INK.prDeep : undefined }}>
      {on && (multi ? <Check size={12} strokeWidth={3} aria-hidden style={{ color: INK.card }} /> : <span style={{ width: 10, height: 10, borderRadius: 9999, background: INK.prDeep }} />)}
    </span>
  </button>
);

const Err: React.FC<{ text: string | null }> = ({ text }) =>
  text ? (
    <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 10 }}>
      {text}
    </p>
  ) : null;

// ---------------------------------------------------------------------------
// Intake: "Sending" (gen/r18.js sendSheet18)
// ---------------------------------------------------------------------------

type Due = "1" | "3" | "7";
const DUE: { value: Due; label: string }[] = [
  { value: "1", label: "Tomorrow" },
  { value: "3", label: "In 3 days" },
  { value: "7", label: "In a week" },
];

/**
 * MO29 "Sending" (sendSheet18): When (radio18: "Automatically when someone
 * hires you" and "Only when I send it"), then "Carry answers into the
 * client's profile" (listCard6 with switches), then Save.
 * The database sends a form only when the professional does (assign_form);
 * nothing sends on hire (Karim kept intake forms on accept for a later
 * release) and no column carries answers into the profile, so those rows
 * show Coming soon. "Only when I send it" sends here: pick a client and when
 * it's due (assign_form p_due_at), then Send.
 */
export const SendingSheet: React.FC<{ open: boolean; onClose: () => void; formId: string | null; ready: boolean; onSent: (text: string) => void }> = ({ open, onClose, formId, ready, onSent }) => {
  const roster = useRoster();
  const online = useOnline();
  const [who, setWho] = useState<string | null>(null);
  const [due, setDue] = useState<Due>("3");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setWho(null);
      setDue("3");
      setErr(null);
    }
  }, [open]);
  const person = roster.find((p) => p.clientId === who) ?? null;
  const send = async () => {
    if (!formId || !person || busy) return;
    if (!online) return setErr(OFFLINE);
    setBusy(true);
    setErr(null);
    const at = new Date(Date.now() + Number(due) * 86400000).toISOString();
    const r = await assignForm(formId, person.clientId, at, null);
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    onSent(`Sent to ${firstOf(person.name)}.`);
  };
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Sending"
      footer={<CtaButton className="w-full" size="sheet" icon={<Send size={15} />} label={person ? `Send to ${firstOf(person.name)}` : "Send"} loading={busy} disabled={!person || !ready || !formId} onClick={() => void send()} />}
    >
      <FieldLabel top={0}>When</FieldLabel>
      <RadioRows
        label="When"
        value="manual"
        onChange={() => undefined}
        rows={[
          { value: "auto", title: "Automatically when someone hires you", line: "Before their first session", disabled: true, trailing: <ComingSoonPill /> },
          { value: "manual", title: "Only when I send it", line: "Choose who gets it below" },
        ]}
      />
      <FieldLabel>Carry answers into the client's profile</FieldLabel>
      <ListCard
        rows={[
          { key: "allergies", icon: Wheat, title: "Allergies and restrictions", meta: "Into the dietary needs card", trailing: <ComingSoonPill /> },
          { key: "injuries", icon: Bandage, title: "Injuries", meta: "Into the profile and programme notes", trailing: <ComingSoonPill /> },
        ]}
      />
      <FieldLabel top={2}>Send to</FieldLabel>
      {!ready && <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 8 }}>Save the form first.</p>}
      {roster.length === 0 ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chF }}>You have no clients to send it to yet.</p>
      ) : (
        <div role="radiogroup" aria-label="Send to">
          {roster.map((p) => (
            <PersonRow key={p.clientId} name={p.name} on={who === p.clientId} onClick={() => setWho(p.clientId)} />
          ))}
        </div>
      )}
      <FieldLabel top={6}>Due</FieldLabel>
      <ChoiceChips label="Due" items={DUE} value={due} onChange={setDue} />
      <Err text={err} />
    </BottomSheet>
  );
};

// ---------------------------------------------------------------------------
// Check-in: "Schedule" (gen/r18.js sendSheet18(t, 1))
// ---------------------------------------------------------------------------

type Who = "programme" | "selected";

/**
 * MO29 "Schedule" (sendSheet18 check): Repeat (chips18: Every week, Every 2
 * weeks, Every 4 weeks), Day and the time (field, two columns, gap 10), Who
 * gets it (radio18: "Clients on a programme" with the count, "Selected
 * clients or groups"), the reminder note, Save.
 * The database repeats daily or weekly on a weekday at the client's local
 * time (assign_form p_schedule weekly:<1-7>@HH:MM); every 2 or 4 weeks
 * isn't a schedule it has, so those chips are off with Coming soon. The time
 * is when the check-in is due; the client is reminded 2 hours before (the
 * hourly job), and there's no second reminder the next morning, so the note
 * says only the first part. Groups have no reader here: "Selected clients"
 * picks clients. Nutrition counts "Clients on a meal plan". Saving starts one
 * schedule per client (one assign_form call each); clients already on it are
 * listed with Stop (cancel_form_assignment on the series id stops the series
 * and cancels its open occurrences, Database 20261124170000), after a confirm.
 */
export const ScheduleSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  formId: string | null;
  ready: boolean;
  lane: ProLane;
  series: FormAssignment[];
  onDone: (text: string) => void;
}> = ({ open, onClose, formId, ready, lane, series, onDone }) => {
  const { authUserId } = useApp();
  const roster = useRoster();
  const online = useOnline();
  const [day, setDay] = useState(7);
  const [time, setTime] = useState("18:00");
  const [who, setWho] = useState<Who>("programme");
  const [picked, setPicked] = useState<string[]>([]);
  const [onPlan, setOnPlan] = useState<string[] | null>(null);
  const [menu, setMenu] = useState<{ kind: "day" | "time"; el: HTMLElement } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [stopping, setStopping] = useState<FormAssignment | null>(null);
  const live = series.filter((s) => s.status === "series");

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setPicked([]);
    const cur = parseSchedule(live[0]?.schedule);
    if (cur?.isoDay) setDay(cur.isoDay);
    if (cur) setTime(cur.time);
    if (!authUserId) return;
    let on = true;
    void (lane === "nutrition" ? fetchActiveMealPlans(authUserId) : fetchActiveProgrammes(authUserId)).then((r) => on && setOnPlan(r.ok ? [...new Set(r.data.map((p) => p.clientId))] : []));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, authUserId, lane]);

  const already = new Set(live.map((s) => s.clientId));
  const targets = (who === "programme" ? onPlan ?? [] : picked).filter((id) => !already.has(id) && roster.some((p) => p.clientId === id));
  const nameOf = (id: string) => roster.find((p) => p.clientId === id)?.name ?? "A client";
  const schedule = scheduleString({ isoDay: day, time });

  const save = async () => {
    if (!formId || !targets.length || busy) return;
    if (!online) return setErr(OFFLINE);
    setBusy("save");
    setErr(null);
    for (const id of targets) {
      const r = await assignForm(formId, id, null, schedule);
      if (!r.ok) {
        setBusy(null);
        return setErr(`${nameOf(id)}: ${r.message}`);
      }
    }
    setBusy(null);
    onDone(targets.length === 1 ? `Scheduled for ${firstOf(nameOf(targets[0]))}.` : `Scheduled for ${targets.length} clients.`);
  };
  const fieldBtn = (label: string, value: string, kind: "day" | "time", Icon: typeof ChevronDown) => (
    <div className="min-w-0">
      <FieldLabel top={0}>{label}</FieldLabel>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={menu?.kind === kind}
        aria-label={`${label}: ${value}`}
        onClick={(e) => setMenu({ kind, el: e.currentTarget })}
        className="tap w-full flex items-center justify-between"
        style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", gap: 8, fontSize: textPx(14), color: INK.ch }}
      >
        <span className="truncate">{value}</span>
        <Icon size={kind === "day" ? 14 : 16} strokeWidth={kind === "day" ? 2 : 1.75} aria-hidden style={{ color: INK.chF, flexShrink: 0 }} />
      </button>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Schedule"
      footer={<CtaButton className="w-full" size="sheet" icon={<Check size={15} />} label="Save" loading={busy === "save"} disabled={!ready || !formId || !targets.length} onClick={() => void save()} />}
    >
      <FieldLabel top={0}>Repeat</FieldLabel>
      <ChoiceChips
        label="Repeat"
        value="1"
        onChange={() => undefined}
        items={[
          { value: "1", label: "Every week" },
          { value: "2", label: "Every 2 weeks", disabled: true },
          { value: "4", label: "Every 4 weeks", disabled: true },
        ]}
      />
      <p style={{ fontSize: textPx(11), color: INK.chF, marginTop: 6 }}>Every 2 and 4 weeks are coming soon.</p>
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10, marginTop: 12 }}>
        {fieldBtn("Day", DAY_LONG[day - 1], "day", ChevronDown)}
        {fieldBtn("Due at", time12(time), "time", Clock)}
      </div>
      <FieldLabel>Who gets it</FieldLabel>
      <RadioRows<Who>
        label="Who gets it"
        value={who}
        onChange={setWho}
        rows={[
          {
            value: "programme",
            title: lane === "nutrition" ? "Clients on a meal plan" : "Clients on a programme",
            line: onPlan == null ? "Loading…" : `${onPlan.length} client${onPlan.length === 1 ? "" : "s"}`,
          },
          { value: "selected", title: "Selected clients", line: picked.length ? picked.map((id) => firstOf(nameOf(id))).join(", ") : "Choose below" },
        ]}
      />
      {who === "selected" && (
        <div style={{ marginTop: 10 }} role="group" aria-label="Clients">
          {roster.map((p) => (
            <PersonRow
              key={p.clientId}
              multi
              name={p.name}
              line={already.has(p.clientId) ? "Already getting it" : undefined}
              on={picked.includes(p.clientId)}
              onClick={() => setPicked((cur) => (cur.includes(p.clientId) ? cur.filter((x) => x !== p.clientId) : [...cur, p.clientId]))}
            />
          ))}
        </div>
      )}
      <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: 8 }}>A reminder goes 2 hours before it is due.</p>
      {!ready && <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 6 }}>Save the check-in first.</p>}
      {live.length > 0 && (
        <>
          <FieldLabel>Getting it now</FieldLabel>
          <ListCard
            rows={live.map((s) => {
              const sc = parseSchedule(s.schedule);
              return {
                key: s.id,
                icon: CalendarCheck,
                title: nameOf(s.clientId),
                meta: sc ? scheduleLine(sc) : "On a schedule",
                trailing: (
                  <button
                    type="button"
                    onClick={() => setStopping(s)}
                    aria-label={`Stop ${nameOf(s.clientId)}'s check-ins`}
                    className="tap shrink-0"
                    style={{ minHeight: 44, padding: "0 6px", fontSize: textPx(12.5), fontWeight: 700, color: INK.hi }}
                  >
                    Stop
                  </button>
                ),
              };
            })}
          />
        </>
      )}
      <Err text={err} />
      <CentredPopup
        open={!!stopping}
        onClose={() => setStopping(null)}
        title="Stop these check-ins?"
        body={stopping ? `${firstOf(nameOf(stopping.clientId))} won't get this check-in any more. Answers already sent stay.` : undefined}
        cta={{
          label: "Stop check-ins",
          loading: busy === "stop",
          onClick: async () => {
            if (!stopping || busy) return;
            if (!online) return setErr(OFFLINE);
            setBusy("stop");
            const r = await cancelAssignment(stopping.id);
            setBusy(null);
            const who = firstOf(nameOf(stopping.clientId));
            setStopping(null);
            if (!r.ok) return setErr(r.message);
            onDone(`Stopped for ${who}.`);
          },
        }}
      />
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.el ?? null}
        heading={menu?.kind === "day" ? "Day" : "Due at"}
        options={menu?.kind === "day" ? DAY_LONG.map((d, i) => ({ value: String(i + 1), label: d })) : SCHEDULE_TIMES.map((t) => ({ value: t, label: time12(t) }))}
        selected={menu?.kind === "day" ? String(day) : time}
        onSelect={(v) => {
          if (menu?.kind === "day") setDay(Number(v));
          else setTime(v);
          setMenu(null);
        }}
        width={180}
        align="left"
      />
    </BottomSheet>
  );
};

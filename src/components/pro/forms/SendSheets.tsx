import React, { useEffect, useMemo, useState } from "react";
import { Bandage, CalendarCheck, Check, ChevronDown, Clock, Pill, Scale, Send, Wheat } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { CentredPopup } from "../../ui/CentredPopup";
import { PopupMenu } from "../../ui/PopupMenu";
import { INK } from "../proInk";
import { ListCard } from "../client/kit";
import { ChoiceChips, FieldLabel, RadioRows } from "./moKit";
import { time12 } from "../../../utils/time12";
import { SCHEDULE_TIMES, parseSchedule, scheduleLine, scheduleString, type ProfileField, type QuestionDraft, type ScheduleEvery } from "./formModel";
import { assignForm, cancelAssignment, setSendOnHire, type FormAssignment } from "../../../services/pro/forms";
import { fetchActiveMealPlans, fetchActiveProgrammes } from "../../../services/pro/clients";
import type { ProLane } from "../subtypeLanes";
import { getLanguage, t, tk, tn, tx } from "../../../i18n/core";
import { weekdayLong } from "../proDates";

const OFFLINE = tk("You're offline. Try again when you're connected.");
const DAYS = [1, 2, 3, 4, 5, 6, 7];

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
    className="tap w-full flex items-center text-start"
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

const CarryCount: React.FC<{ text: string }> = ({ text }) => (
  <span className="shrink-0" style={{ fontSize: textPx(12), fontWeight: 700, color: text === t("Off") ? INK.chF : INK.prDeep }}>
    {text}
  </span>
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
/** English keys (tk); shown with t(). */
const DUE: { value: Due; label: string }[] = [
  { value: "1", label: tk("Tomorrow") },
  { value: "3", label: tk("In 3 days") },
  { value: "7", label: tk("In a week") },
];

/**
 * MO29 "Sending" (sendSheet18): When (radio18: "Automatically when someone
 * hires you" and "Only when I send it"), then "Carry answers into the
 * client's profile" (listCard6), then Save.
 * Round D (20261222050000): "When" is forms.send_on_hire, written as soon as
 * it's picked (the saved form only); a hire assigns it, due in 3 days. The
 * carry rows say which questions of this form carry each kind of answer
 * (set on each question: "Carry into the profile"); the client confirms each
 * one before anything reaches their profile. Sending to someone now works
 * either way: pick a client and when it's due (assign_form p_due_at), Send.
 */
export const SendingSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  formId: string | null;
  ready: boolean;
  questions: QuestionDraft[];
  sendOnHire: boolean;
  onSendOnHire: (on: boolean) => void;
  onSent: (text: string) => void;
}> = ({ open, onClose, formId, ready, questions, sendOnHire, onSendOnHire, onSent }) => {
  const roster = useRoster();
  const online = useOnline();
  const [who, setWho] = useState<string | null>(null);
  const [due, setDue] = useState<Due>("3");
  const [busy, setBusy] = useState(false);
  const [hireBusy, setHireBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setWho(null);
      setDue("3");
      setErr(null);
    }
  }, [open]);
  const pickWhen = async (v: "auto" | "manual") => {
    const on = v === "auto";
    if (on === sendOnHire || hireBusy || !formId) return;
    if (!online) return setErr(t(OFFLINE));
    setHireBusy(true);
    setErr(null);
    const r = await setSendOnHire(formId, on);
    setHireBusy(false);
    if (!r.ok) return setErr(t(r.message));
    onSendOnHire(on);
  };
  const carried = (fields: ProfileField[]) => {
    const n = questions.filter((q) => q.profileField && fields.includes(q.profileField)).length;
    return n ? tn(n, "{n} question", "{n} questions") : t("Off");
  };
  const person = roster.find((p) => p.clientId === who) ?? null;
  const send = async () => {
    if (!formId || !person || busy) return;
    if (!online) return setErr(t(OFFLINE));
    setBusy(true);
    setErr(null);
    const at = new Date(Date.now() + Number(due) * 86400000).toISOString();
    const r = await assignForm(formId, person.clientId, at, null);
    setBusy(false);
    if (!r.ok) return setErr(t(r.message));
    onSent(t("Sent to {name}.", { name: firstOf(person.name) }));
  };
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={tx("Sending", "form delivery")}
      footer={<CtaButton className="w-full" size="sheet" icon={<Send size={15} />} label={person ? t("Send to {name}", { name: firstOf(person.name) }) : t("Send")} loading={busy} disabled={!person || !ready || !formId} onClick={() => void send()} />}
    >
      <FieldLabel top={0}>{t("When")}</FieldLabel>
      <RadioRows
        label={t("When")}
        value={sendOnHire ? "auto" : "manual"}
        onChange={(v) => void pickWhen(v)}
        rows={[
          { value: "auto", title: t("Automatically when someone hires you"), line: formId ? t("Due 3 days after they hire you") : t("Save the form first"), disabled: !formId || hireBusy },
          { value: "manual", title: t("Only when I send it"), line: t("Choose who gets it below"), disabled: !formId || hireBusy },
        ]}
      />
      <FieldLabel>{t("Carry answers into the client's profile")}</FieldLabel>
      <ListCard
        rows={[
          { key: "allergies", icon: Wheat, title: t("Allergies and restrictions"), meta: t("Into the dietary needs card"), trailing: <CarryCount text={carried(["allergies", "dietary_restrictions"])} /> },
          { key: "injuries", icon: Bandage, title: t("Injuries"), meta: t("Into the profile"), trailing: <CarryCount text={carried(["injuries"])} /> },
          { key: "medications", icon: Pill, title: t("Medications"), meta: t("Into the medical history"), trailing: <CarryCount text={carried(["medications"])} /> },
          { key: "weight", icon: Scale, title: t("Weight"), meta: t("A weigh-in, never in recovery-sensitive mode"), trailing: <CarryCount text={carried(["weight"])} /> },
        ]}
      />
      <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: 6 }}>{t("Set this on each question. The client confirms each answer before it's added.")}</p>
      <FieldLabel>{t("Send to")}</FieldLabel>
      {!ready && <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 8 }}>{t("Save the form first.")}</p>}
      {roster.length === 0 ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chF }}>{t("You have no clients to send it to yet.")}</p>
      ) : (
        <div role="radiogroup" aria-label={t("Send to")}>
          {roster.map((p) => (
            <PersonRow key={p.clientId} name={p.name} on={who === p.clientId} onClick={() => setWho(p.clientId)} />
          ))}
        </div>
      )}
      <FieldLabel top={6}>{t("Due")}</FieldLabel>
      <ChoiceChips label={t("Due")} items={DUE.map((d) => ({ value: d.value, label: t(d.label) }))} value={due} onChange={setDue} />
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
 * The database repeats on a weekday at the client's local time, every week,
 * every 2 or every 4 weeks (assign_form p_schedule weekly: / every2weeks: /
 * every4weeks:<1-7>@HH:MM, Round D; whole weeks from the series' first week).
 * The time is when the check-in is due; the client is reminded 2 hours
 * before and again at 8 the next morning while it's still open (the hourly
 * job, Round D). Groups have no reader here: "Selected clients"
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
  const [every, setEvery] = useState<ScheduleEvery>(1);
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
    setEvery(cur?.every ?? 1);
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
  const nameOf = (id: string) => roster.find((p) => p.clientId === id)?.name ?? t("A client");
  const schedule = scheduleString({ isoDay: day, time, every });

  const save = async () => {
    if (!formId || !targets.length || busy) return;
    if (!online) return setErr(t(OFFLINE));
    setBusy("save");
    setErr(null);
    for (const id of targets) {
      const r = await assignForm(formId, id, null, schedule);
      if (!r.ok) {
        setBusy(null);
        return setErr(t("{name}: {message}", { name: nameOf(id), message: t(r.message) }));
      }
    }
    setBusy(null);
    onDone(targets.length === 1 ? t("Scheduled for {name}.", { name: firstOf(nameOf(targets[0])) }) : tn(targets.length, "Scheduled for {n} client.", "Scheduled for {n} clients."));
  };
  const fieldBtn = (label: string, value: string, kind: "day" | "time", Icon: typeof ChevronDown) => (
    <div className="min-w-0">
      <FieldLabel top={0}>{label}</FieldLabel>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={menu?.kind === kind}
        aria-label={t("{label}: {value}", { label, value })}
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
      title={t("Schedule")}
      footer={<CtaButton className="w-full" size="sheet" icon={<Check size={15} />} label={t("Save")} loading={busy === "save"} disabled={!ready || !formId || !targets.length} onClick={() => void save()} />}
    >
      <FieldLabel top={0}>{t("Repeat")}</FieldLabel>
      <ChoiceChips
        label={t("Repeat")}
        value={String(every) as "1" | "2" | "4"}
        onChange={(v) => setEvery(Number(v) as ScheduleEvery)}
        items={[
          { value: "1", label: t("Every week") },
          { value: "2", label: tn(2, "Every week", "Every {n} weeks") },
          { value: "4", label: tn(4, "Every week", "Every {n} weeks") },
        ]}
      />
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10, marginTop: 12 }}>
        {fieldBtn(t("Day"), weekdayLong(day - 1), "day", ChevronDown)}
        {fieldBtn(t("Due at"), time12(time), "time", Clock)}
      </div>
      <FieldLabel>{t("Who gets it")}</FieldLabel>
      <RadioRows<Who>
        label={t("Who gets it")}
        value={who}
        onChange={setWho}
        rows={[
          {
            value: "programme",
            title: lane === "nutrition" ? t("Clients on a meal plan") : t("Clients on a programme"),
            line: onPlan == null ? t("Loading…") : tn(onPlan.length, "{n} client", "{n} clients"),
          },
          { value: "selected", title: t("Selected clients"), line: picked.length ? picked.map((id) => firstOf(nameOf(id))).join(getLanguage() === "ar" ? "، " : ", ") : t("Choose below") },
        ]}
      />
      {who === "selected" && (
        <div style={{ marginTop: 10 }} role="group" aria-label={t("Clients")}>
          {roster.map((p) => (
            <PersonRow
              key={p.clientId}
              multi
              name={p.name}
              line={already.has(p.clientId) ? t("Already getting it") : undefined}
              on={picked.includes(p.clientId)}
              onClick={() => setPicked((cur) => (cur.includes(p.clientId) ? cur.filter((x) => x !== p.clientId) : [...cur, p.clientId]))}
            />
          ))}
        </div>
      )}
      <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: 8 }}>{t("A reminder goes 2 hours before it is due, and again the next morning if it's still open.")}</p>
      {!ready && <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 6 }}>{t("Save the check-in first.")}</p>}
      {live.length > 0 && (
        <>
          <FieldLabel>{t("Getting it now")}</FieldLabel>
          <ListCard
            rows={live.map((s) => {
              const sc = parseSchedule(s.schedule);
              return {
                key: s.id,
                icon: CalendarCheck,
                title: nameOf(s.clientId),
                meta: sc ? scheduleLine(sc) : t("On a schedule"),
                trailing: (
                  <button
                    type="button"
                    onClick={() => setStopping(s)}
                    aria-label={t("Stop {name}'s check-ins", { name: nameOf(s.clientId) })}
                    className="tap shrink-0"
                    style={{ minHeight: 44, padding: "0 6px", fontSize: textPx(12.5), fontWeight: 700, color: INK.hi }}
                  >
                    {t("Stop")}
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
        title={t("Stop these check-ins?")}
        body={stopping ? t("{name} won't get this check-in any more. Answers already sent stay.", { name: firstOf(nameOf(stopping.clientId)) }) : undefined}
        cta={{
          label: t("Stop check-ins"),
          loading: busy === "stop",
          onClick: async () => {
            if (!stopping || busy) return;
            if (!online) return setErr(t(OFFLINE));
            setBusy("stop");
            const r = await cancelAssignment(stopping.id);
            setBusy(null);
            const who = firstOf(nameOf(stopping.clientId));
            setStopping(null);
            if (!r.ok) return setErr(t(r.message));
            onDone(t("Stopped for {name}.", { name: who }));
          },
        }}
      />
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.el ?? null}
        heading={menu?.kind === "day" ? t("Day") : t("Due at")}
        options={menu?.kind === "day" ? DAYS.map((d) => ({ value: String(d), label: weekdayLong(d - 1) })) : SCHEDULE_TIMES.map((x) => ({ value: x, label: time12(x) }))}
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

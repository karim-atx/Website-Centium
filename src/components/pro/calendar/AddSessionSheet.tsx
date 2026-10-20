import React, { useEffect, useMemo, useState } from "react";
import { Bell, Calendar as CalendarIcon, CalendarPlus, Check, Info, Link as LinkIcon, MapPin, Package, Repeat, Search } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { PopupMenu } from "../../ui/PopupMenu";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { TimeField } from "../../calendar/EventComposeSheet";
import { normaliseLink } from "../../calendar/calendarTime";
import { CalendarPickerSheet } from "../../dashboard/CalendarPickerSheet";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { Avatar } from "../client/kit";
import { createSessions, fetchPack, type SessionType } from "../../../services/pro/calendar";
import { fetchMyEmployments } from "../../../services/business-team/employment";
import { FieldButton, FieldInput, FieldLabel, SwitchRow } from "./calendarFields";
import { fieldDate, hhmmOf, isoWeekday, minutes, money, remindersLabel, weeklyDates, REPEAT_TIMES, type AlertValue } from "./calendarModel";
import { DEFAULT_SESSION } from "./calendarItems";

/**
 * Release 3 · W4 + Add session (CA10 Choose client, CA11 Session type
 * dropdown, CA5 v2 Date and time with the wheel under Starts and Repeat weekly
 * as its own full-width row, CA12 Location, repeat, reminder; source/gen
 * r6a.js newSession6, pickClient6, pickType6, newSessionB6).
 *
 * What it writes (DB-4): one calendar_events row per occurrence (so each keeps
 * its own outcome and pack count) with the session type, its colour and price,
 * and the client invited with two reminders (calendar_event_invitees alert /
 * alert_2) from the practice defaults (CA22). The client accepts it on their
 * calendar.
 */

export interface SessionClient {
  id: string;
  name: string;
  avatarUrl?: string | null;
  /** CA10's line: "{plan} · Next {when}", "Not booked" or the stage. */
  line: string;
}

const WEEKDAY_LONG = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const REMINDER_CHOICES: [AlertValue, AlertValue][] = [
  ["day_1", "hour_1"],
  ["day_1", "none"],
  ["hour_1", "none"],
  ["hour_2", "none"],
  ["none", "none"],
];

type Kind = "in_person" | "online" | "business";

export const AddSessionSheet: React.FC<{
  open: boolean;
  me: string;
  todayIso: string;
  initial: { date: string; start?: string; clientId?: string };
  clients: SessionClient[];
  types: SessionType[];
  reminders: { alert: AlertValue; alert2: AlertValue };
  onClose: () => void;
  onSaved: (r: { eventId: string; clientName: string; date: string }) => void;
  onAddType: () => void;
  /** Not drawn: an event without a client (the old tab's own events, kept). */
  onPersonal: (date: string) => void;
}> = ({ open, me, todayIso, initial, clients, types, reminders, onClose, onSaved, onAddType, onPersonal }) => {
  const [step, setStep] = useState<"main" | "client" | "more">("main");
  const [clientId, setClientId] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [date, setDate] = useState(initial.date);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [times, setTimes] = useState(1);
  const [kind, setKind] = useState<Kind>("in_person");
  const [place, setPlace] = useState("");
  const [link, setLink] = useState("");
  const [business, setBusiness] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<[AlertValue, AlertValue]>([reminders.alert, reminders.alert2]);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [wheel, setWheel] = useState<"start" | "end" | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [typeAnchor, setTypeAnchor] = useState<HTMLElement | null>(null);
  const [repeatAnchor, setRepeatAnchor] = useState<HTMLElement | null>(null);
  const [remindAnchor, setRemindAnchor] = useState<HTMLElement | null>(null);
  const [bizAnchor, setBizAnchor] = useState<HTMLElement | null>(null);
  const [businesses, setBusinesses] = useState<string[]>([]);
  const [pack, setPack] = useState<{ count: number; left: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A fresh sheet every time it opens, from where it was opened.
  useEffect(() => {
    if (!open) return;
    const t = types[0] ?? null;
    const s = initial.start ?? "09:00";
    setStep(initial.clientId ? "main" : "client");
    setClientId(initial.clientId ?? null);
    setTypeId(t?.id ?? null);
    setDate(initial.date);
    setStart(s);
    setEnd(hhmmOf(minutes(s) + (t?.durationMin ?? 60)));
    setTimes(1);
    setKind(t?.locationKind === "online" ? "online" : "in_person");
    setPlace("");
    setLink("");
    setBusiness(null);
    setAlerts([reminders.alert, reminders.alert2]);
    setNotes("");
    setQuery("");
    setWheel(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void fetchMyEmployments().then((r) => live && r.ok && setBusinesses(r.value.filter((e) => e.acceptedAt).map((e) => e.businessName)));
    return () => {
      live = false;
    };
  }, [open]);

  useEffect(() => {
    setPack(null);
    if (!open || !clientId) return;
    let live = true;
    void fetchPack(clientId).then((p) => live && setPack(p ? { count: p.count, left: p.left } : null));
    return () => {
      live = false;
    };
  }, [open, clientId]);

  const client = clients.find((c) => c.id === clientId) ?? null;
  const type = types.find((t) => t.id === typeId) ?? null;
  const first = (client?.name ?? "").split(" ")[0];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;
  }, [clients, query]);

  const pickType = (t: SessionType) => {
    setTypeId(t.id);
    setEnd(hhmmOf(minutes(start) + t.durationMin));
    if (t.locationKind === "online") setKind("online");
    else if (t.locationKind === "in_person") setKind("in_person");
  };
  const setStartKeepLength = (v: string) => {
    const len = Math.max(5, minutes(end) - minutes(start));
    setStart(v);
    setEnd(hhmmOf(minutes(v) + len));
  };

  const typeLine = (t: SessionType) => [t.name, `${t.durationMin} min`, t.price > 0 ? money(t.price, t.currency) : null].filter(Boolean).join(" · ");
  const typeNote = (t: SessionType) =>
    [`${t.durationMin} min`, t.price > 0 ? money(t.price, t.currency) : null, t.locationKind === "online" ? "Online" : t.locationKind === "in_person" ? "In person" : t.locationKind === null ? "In person or online" : null]
      .filter(Boolean)
      .join(" · ");
  const repeatLabel = times > 1 ? `Weekly · ${times} times` : "Never";

  const save = async () => {
    if (!client || !type || saving) return;
    const url = kind === "online" ? normaliseLink(link) : null;
    if (kind === "online" && link.trim() && !url) {
      setError("Links need to be a web address (http or https).");
      return;
    }
    setSaving(true);
    setError(null);
    const r = await createSessions(me, {
      clientId: client.id,
      serviceId: type.id,
      title: type.name,
      colour: type.colour ?? DEFAULT_SESSION,
      price: type.price > 0 ? type.price : null,
      dates: weeklyDates(date, times),
      start,
      end,
      location: kind === "in_person" ? place.trim() || null : kind === "business" ? business : null,
      url,
      notes: notes.trim() || null,
      alert: alerts[0],
      alert2: alerts[1],
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    onSaved({ eventId: r.firstId, clientName: client.name, date });
  };

  const close = () => {
    setTypeAnchor(null);
    setRepeatAnchor(null);
    setRemindAnchor(null);
    setBizAnchor(null);
    setWheel(null);
    onClose();
  };

  // ---- CA10 Choose client ----
  if (step === "client") {
    return (
      <BottomSheet open={open} onClose={close} title="Choose client" onBack={client ? () => setStep("main") : undefined}>
        <label className="flex items-center" style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${query ? INK.pr : INK.b10}`, padding: "0 12px", gap: 8 }}>
          <Search size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients"
            aria-label="Search clients"
            className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-faint"
            style={{ fontSize: textPx(14), color: INK.ch }}
          />
        </label>
        <div style={{ marginTop: 8 }}>
          {filtered.length === 0 && (
            <p style={{ padding: "16px 0", fontSize: textPx(13), color: INK.chF }}>{clients.length === 0 ? "Clients you work with appear here." : "No clients match your search."}</p>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setClientId(c.id);
                setStep("main");
              }}
              aria-pressed={c.id === clientId}
              className="tap w-full flex items-center text-left"
              style={{ gap: 12, padding: "11px 0", borderBottom: i < filtered.length - 1 ? `1px solid ${INK.b06}` : "none" }}
            >
              <Avatar name={c.name} url={c.avatarUrl} size={36} />
              <span className="flex-1 min-w-0">
                <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>
                  {c.name}
                </span>
                <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF }}>
                  {c.line}
                </span>
              </span>
              {c.id === clientId && <Check size={16} strokeWidth={2.6} aria-hidden style={{ color: INK.prDeep }} />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPersonal(date)}
            className="tap w-full flex items-center text-left"
            style={{ gap: 12, padding: "11px 0", borderTop: filtered.length ? `1px solid ${INK.b06}` : "none" }}
          >
            <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 9999, background: INK.soft }}>
              <CalendarPlus size={16} strokeWidth={1.75} aria-hidden style={{ color: INK.chS }} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>
                Event without a client
              </span>
              <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF }}>
                A meeting, a class or time for yourself
              </span>
            </span>
          </button>
        </div>
      </BottomSheet>
    );
  }

  // ---- CA12 Location, repeat, reminder ----
  if (step === "more") {
    return (
      <BottomSheet
        open={open}
        onClose={close}
        title="New session"
        onBack={() => setStep("main")}
        footer={<CtaButton size="sheet" className="w-full" label="Save session" loading={saving} disabled={!client || !type} onClick={() => void save()} />}
      >
        <div className="flex flex-col" style={{ gap: 16 }}>
          <div>
            <FieldLabel>Location</FieldLabel>
            <SegmentedTabs
              items={[
                { key: "in_person", label: "In person" },
                { key: "online", label: "Online" },
                { key: "business", label: "At a business" },
              ]}
              activeKey={kind}
              onChange={(k) => setKind(k as Kind)}
              tabHeight={38}
              labelSize={12}
              className="mb-2"
            />
            {kind === "in_person" && <FieldInput value={place} onChange={setPlace} icon={MapPin} ariaLabel="Address" placeholder="Address" maxLength={200} />}
            {kind === "online" && <FieldInput value={link} onChange={setLink} icon={LinkIcon} ariaLabel="Meeting link" placeholder="Add a link" type="url" inputMode="url" autoCapitalize="off" />}
            {kind === "business" &&
              (businesses.length ? (
                <>
                  <FieldButton value={business ?? "Choose a business"} placeholder={!business} ariaLabel={`Business, ${business ?? "none chosen"}`} open={!!bizAnchor} onClick={(e) => setBizAnchor(e.currentTarget)} />
                  <PopupMenu
                    open={!!bizAnchor}
                    onClose={() => setBizAnchor(null)}
                    anchor={bizAnchor}
                    matchWidth={bizAnchor}
                    options={businesses.map((b) => ({ value: b, label: b }))}
                    selected={business}
                    onSelect={(v) => {
                      setBusiness(v);
                      setBizAnchor(null);
                    }}
                  />
                </>
              ) : (
                <p style={{ fontSize: textPx(12), color: INK.chF }}>Businesses you work at appear here.</p>
              ))}
          </div>
          <div>
            <FieldButton label="Repeat" labelIcon={Repeat} value={repeatLabel} ariaLabel={`Repeat, ${repeatLabel}`} open={!!repeatAnchor} onClick={(e) => setRepeatAnchor(e.currentTarget)} />
            <PopupMenu
              open={!!repeatAnchor}
              onClose={() => setRepeatAnchor(null)}
              anchor={repeatAnchor}
              matchWidth={repeatAnchor}
              options={[{ value: "1", label: "Never" }, ...REPEAT_TIMES.map((n) => ({ value: String(n), label: `Weekly · ${n} times` }))]}
              selected={String(times)}
              onSelect={(v) => {
                setTimes(Number(v));
                setRepeatAnchor(null);
              }}
            />
          </div>
          <div>
            <FieldButton
              label={`Reminder to ${first}`}
              labelIcon={Bell}
              value={remindersLabel(alerts[0], alerts[1])}
              ariaLabel={`Reminder to ${first}, ${remindersLabel(alerts[0], alerts[1])}`}
              open={!!remindAnchor}
              onClick={(e) => setRemindAnchor(e.currentTarget)}
            />
            <PopupMenu
              open={!!remindAnchor}
              onClose={() => setRemindAnchor(null)}
              anchor={remindAnchor}
              matchWidth={remindAnchor}
              options={REMINDER_CHOICES.map(([a, b]) => ({ value: `${a}|${b}`, label: remindersLabel(a, b) }))}
              selected={`${alerts[0]}|${alerts[1]}`}
              onSelect={(v) => {
                const [a, b] = v.split("|") as [AlertValue, AlertValue];
                setAlerts([a, b]);
                setRemindAnchor(null);
              }}
            />
          </div>
          <FieldInput label={`Notes for ${first}`} value={notes} onChange={setNotes} maxLength={2000} />
          <div className="flex items-center" style={{ gap: 10, borderRadius: 12, background: INK.soft, padding: 12 }}>
            <Info size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF, flexShrink: 0 }} />
            <span style={{ fontSize: textPx(12), color: INK.chS, lineHeight: 1.45 }}>{`${first} gets an invitation to accept. It shows in their calendar once accepted.`}</span>
          </div>
          {error && (
            <p role="alert" className="text-center" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
              {error}
            </p>
          )}
        </div>
      </BottomSheet>
    );
  }

  // ---- CA5 v2 / CA11 Client, type, date and time ----
  const weekday = WEEKDAY_LONG[isoWeekday(date)];
  return (
    <BottomSheet
      open={open}
      onClose={close}
      title="New session"
      footer={<CtaButton size="sheet" className="w-full" label="Continue" disabled={!client || !type} onClick={() => setStep("more")} />}
    >
      <div className="flex flex-col" style={{ gap: 16 }}>
        <div>
          <FieldButton
            label="Client"
            value={client?.name ?? "Choose client"}
            placeholder={!client}
            lead={client ? <Avatar name={client.name} url={client.avatarUrl} size={24} /> : undefined}
            ariaLabel={`Client, ${client?.name ?? "none chosen"}`}
            onClick={() => setStep("client")}
          />
          {pack && (
            <p className="flex items-center" style={{ gap: 6, marginTop: 6, fontSize: textPx(11), color: INK.chF }}>
              <Package size={12} strokeWidth={2} aria-hidden />
              {`${pack.count}-session pack · ${pack.left} left`}
            </p>
          )}
        </div>
        <div>
          {types.length ? (
            <>
              <FieldButton
                label="Session type"
                value={type ? typeLine(type) : "Choose a session type"}
                placeholder={!type}
                lead={<span aria-hidden style={{ width: 10, height: 10, borderRadius: 9999, background: type?.colour ?? DEFAULT_SESSION, flexShrink: 0 }} />}
                ariaLabel={`Session type, ${type ? typeLine(type) : "none chosen"}`}
                open={!!typeAnchor}
                onClick={(e) => setTypeAnchor(e.currentTarget)}
              />
              <PopupMenu
                open={!!typeAnchor}
                onClose={() => setTypeAnchor(null)}
                anchor={typeAnchor}
                matchWidth={typeAnchor}
                heading="Session type"
                options={types.map((t) => ({
                  value: t.id,
                  label: t.name,
                  note: typeNote(t),
                  icon: <span aria-hidden style={{ display: "block", width: 12, height: 12, borderRadius: 9999, background: t.colour ?? DEFAULT_SESSION }} />,
                }))}
                selected={typeId}
                onSelect={(v) => {
                  const t = types.find((x) => x.id === v);
                  if (t) pickType(t);
                  setTypeAnchor(null);
                }}
              />
            </>
          ) : (
            <>
              <FieldLabel>Session type</FieldLabel>
              <div className="flex items-center justify-between" style={{ minHeight: 40, borderRadius: 12, background: INK.soft, padding: "0 12px", gap: 8 }}>
                <span style={{ fontSize: textPx(13), color: INK.chF }}>No session types yet</span>
                <button type="button" onClick={onAddType} className="tap" style={{ fontSize: textPx(13), fontWeight: 700, color: INK.prDeep, minHeight: 44 }}>
                  Add session type
                </button>
              </div>
            </>
          )}
        </div>
        <FieldButton label="Date" value={fieldDate(date)} icon={CalendarIcon} ariaLabel={`Date, ${fieldDate(date)}`} onClick={() => setDateOpen(true)} />
        <SwitchRow title="Repeat weekly" sub={times > 1 ? `Every ${weekday}, ${times} times` : `Every ${weekday}`} checked={times > 1} onChange={(v) => setTimes(v ? 8 : 1)} />
        <div>
          <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
            <TimeField
              label="Starts"
              value={start}
              open={wheel === "start"}
              onOpen={() => setWheel("start")}
              onClose={() => setWheel(null)}
              onChange={setStartKeepLength}
              minuteStep={15}
              fieldClass="w-full h-10 rounded-xl bg-cream-soft border border-charcoal/10 px-3 text-sm text-charcoal"
            />
            <TimeField
              label="Ends"
              value={end}
              open={wheel === "end"}
              onOpen={() => setWheel("end")}
              onClose={() => setWheel(null)}
              onChange={setEnd}
              notBefore={start}
              minuteStep={15}
              fieldClass="w-full h-10 rounded-xl bg-cream-soft border border-charcoal/10 px-3 text-sm text-charcoal"
            />
          </div>
          {wheel && <div aria-hidden style={{ height: 150 }} />}
          {type && type.bufferMin > 0 && (
            <p style={{ fontSize: textPx(11), color: INK.chF, marginTop: 8 }}>{`Includes a ${type.bufferMin} min buffer after`}</p>
          )}
        </div>
      </div>
      <CalendarPickerSheet open={dateOpen} onClose={() => setDateOpen(false)} title="Date" selectedDate={date} today={todayIso} onSelect={(d) => setDate(d)} />
    </BottomSheet>
  );
};

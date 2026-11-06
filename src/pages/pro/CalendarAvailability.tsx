import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, CalendarRange, ChevronLeft, ClockAlert, Coffee, Link as LinkIcon, Plane, Plus, RefreshCw, ShieldCheck, Store, Users } from "lucide-react";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { CtaButton } from "../../components/ui/PinnedCta";
import { Toggle } from "../../components/ui/Toggle";
import { Toast } from "../../components/ui/Toast";
import { TimeField } from "../../components/calendar/EventComposeSheet";
import { eventColours } from "../../components/calendar/eventColour";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useOnline } from "../../hooks/useOnline";
import { useBack } from "../../hooks/useBack";
import { textPx } from "../../theme/textSize";
import { range12 } from "../../utils/time12";
import { weekdayLong, weekdayShort } from "../../components/pro/proDates";
import { INK } from "../../components/pro/proInk";
import { OfflineLine, ProCardSkeleton, ProError } from "../../components/pro/states";
import { SettingsRow, SettingsSection } from "../../components/pro/calendar/calendarFields";
import { TimeOffSheet } from "../../components/pro/calendar/TimeOffSheet";
import { SessionTypeSheet } from "../../components/pro/calendar/SessionTypeSheet";
import { AUDIENCE, BOOKING_TITLES, BookingSheet, type BookingSheetKind } from "../../components/pro/calendar/BookingSheets";
import { DEFAULT_SESSION } from "../../components/pro/calendar/calendarItems";
import { dayDate, groupTimeOff, isoOf, money, remindersLabel, type AlertValue, type TimeOffEntry } from "../../components/pro/calendar/calendarModel";
import {
  bookingUrl,
  DEFAULT_POLICY,
  fetchAvailability,
  fetchBookingPolicy,
  fetchMyHandle,
  fetchReminderDefaults,
  fetchSessionTypes,
  fetchTimeOff,
  setDayHours,
  type AvailabilityRow,
  type BookingPolicy,
  type SessionType,
  type TimeOffRow,
} from "../../services/pro/calendar";
import { t, tn } from "../../i18n/core";
import { useWebLayout, WEB_READING_MAX } from "../../components/web/useWebLayout";

// The booking window as shown (the same words as the booking sheet).
const windowText = (days: number) => (days % 7 === 0 ? tn(days / 7, "{n} week ahead", "{n} weeks ahead") : t("{n} days ahead", { n: days }));

/**
 * Release 3 · W4 CA8 v2 Availability, Time off renamed (/app/pro/calendar/
 * availability; source/gen/cal.js availability, r6a.js availability6): the
 * page head ("Availability", "When clients can book you"), then Working
 * hours, Time off (never "Breaks and time off"), Session types and Booking,
 * each a settings section (sSection / sRow). Monday first, Sunday last
 * (FINAL_PLAN section 3 item 5); times 12-hour.
 *
 * One slot engine (J6): the pro-wide rows are edited here; the hours a
 * business keeps for this professional (business_id set) are shown read only
 * under the week, since the business console writes them.
 */

const DEFAULT_HOURS = { start: "09:00", end: "17:00" };

export default function CalendarAvailability() {
  const { authUserId, profileReady } = useApp();
  const back = useBack();
  const dark = useIsDark();
  const { web, rail } = useWebLayout();
  const online = useOnline();
  const me = authUserId ?? "";
  const todayIso = isoOf(new Date());

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [hours, setHours] = useState<AvailabilityRow[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffRow[]>([]);
  const [types, setTypes] = useState<SessionType[]>([]);
  const [policy, setPolicy] = useState<BookingPolicy>(DEFAULT_POLICY);
  const [handle, setHandle] = useState<string | null>(null);
  const [reminders, setReminders] = useState<{ alert: AlertValue; alert2: AlertValue }>({ alert: "hour_1", alert2: "none" });

  const [busyDay, setBusyDay] = useState<number | null>(null);
  const [hoursEdit, setHoursEdit] = useState<{ weekday: number; start: string; end: string } | null>(null);
  const [wheel, setWheel] = useState<"start" | "end" | null>(null);
  const [offSheet, setOffSheet] = useState<{ entry: TimeOffEntry | null } | null>(null);
  const [typeSheet, setTypeSheet] = useState<{ type: SessionType | null } | null>(null);
  const [booking, setBooking] = useState<BookingSheetKind | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!me) return;
    const [av, off, ty, po, ha, re] = await Promise.all([
      fetchAvailability(me),
      fetchTimeOff(me, todayIso),
      fetchSessionTypes(me),
      fetchBookingPolicy(me),
      fetchMyHandle(me),
      fetchReminderDefaults(me),
    ]);
    setLoaded(true);
    setError(!av.ok || !off.ok || !ty.ok || !po.ok);
    if (av.ok) setHours(av.data);
    if (off.ok) setTimeOff(off.data);
    if (ty.ok) setTypes(ty.data);
    if (po.ok) setPolicy(po.data);
    if (ha.ok) setHandle(ha.data);
    if (re.ok) setReminders({ alert: re.data.alert as AlertValue, alert2: re.data.alert2 as AlertValue });
  }, [me, todayIso]);

  useEffect(() => {
    if (profileReady && me) void load();
  }, [profileReady, me, load]);

  const own = hours.filter((h) => h.businessId === null);
  const dayWindows = (wd: number) => own.filter((h) => h.weekday === wd).sort((a, b) => a.start.localeCompare(b.start));
  const entries = useMemo(() => groupTimeOff(timeOff.filter((t) => t.businessId === null)), [timeOff]);

  // Per-business hours, read only, days with the same hours run together ("Mon to Sat").
  const businessHours = useMemo(() => {
    const by = new Map<string, { name: string; rows: AvailabilityRow[] }>();
    for (const h of hours) {
      if (!h.businessId) continue;
      const g = by.get(h.businessId) ?? { name: h.businessName ?? t("A business"), rows: [] };
      g.rows.push(h);
      by.set(h.businessId, g);
    }
    return [...by.entries()].map(([id, g]) => {
      const runs: { from: number; to: number; range: string }[] = [];
      for (const r of [...g.rows].sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))) {
        const range = range12(r.start, r.end);
        const last = runs[runs.length - 1];
        if (last && last.range === range && last.to === r.weekday - 1) last.to = r.weekday;
        else runs.push({ from: r.weekday, to: r.weekday, range });
      }
      const line = runs.map((x) => `${x.to !== x.from ? t("{from} to {to}", { from: weekdayShort(x.from - 1), to: weekdayShort(x.to - 1) }) : weekdayShort(x.from - 1)} · ${x.range}`).join(t(", "));
      return { id, name: g.name, line };
    });
  }, [hours]);

  const toggleDay = async (wd: number, on: boolean) => {
    setBusyDay(wd);
    const common = own[0] ? { start: own[0].start, end: own[0].end } : DEFAULT_HOURS;
    const r = await setDayHours(me, wd, on ? common : null);
    setBusyDay(null);
    if (!r.ok) setToast(r.message);
    await load();
  };

  const saveHours = async () => {
    if (!hoursEdit) return;
    setBusyDay(hoursEdit.weekday);
    const r = await setDayHours(me, hoursEdit.weekday, { start: hoursEdit.start, end: hoursEdit.end });
    setBusyDay(null);
    if (!r.ok) return setToast(r.message);
    setHoursEdit(null);
    await load();
  };

  const entrySub = (e: TimeOffEntry) => {
    const time = e.start ? range12(e.start, e.end) : null;
    if (e.repeat === "weekdays") return [t("Weekdays"), time].filter(Boolean).join(" ");
    if (e.repeat === "daily") return [t("Every day, {from} to {to}", { from: dayDate(e.dates[0]), to: dayDate(e.dates[e.dates.length - 1]) }), time].filter(Boolean).join(" · ");
    if (e.repeat === "weekly") return [t("Every {weekday}", { weekday: weekdayLong((new Date(`${e.dates[0]}T00:00:00`).getDay() + 6) % 7) }), time].filter(Boolean).join(" ");
    const span = e.dates.length > 1 ? t("{from} to {to}", { from: dayDate(e.dates[0]), to: dayDate(e.dates[e.dates.length - 1]) }) : dayDate(e.dates[0]);
    return [span, time].filter(Boolean).join(" · ");
  };
  const typeSub = (st: SessionType) =>
    [t("{durationMin} min", { durationMin: st.durationMin }), st.price > 0 ? money(st.price, st.currency) : null, st.locationKind === "online" ? t("Online") : st.locationKind === "in_person" ? t("In person") : st.locationKind === null ? t("In person or online") : null]
      .filter(Boolean)
      .join(" · ");

  const bookingRows: { kind: BookingSheetKind; icon: typeof LinkIcon; sub: string }[] = [
    { kind: "link", icon: LinkIcon, sub: handle ? (policy.bookingLinkEnabled ? bookingUrl(handle) : t("Off")) : t("Choose your handle first") },
    { kind: "who", icon: Users, sub: AUDIENCE[policy.whoCanBook].title },
    { kind: "notice", icon: ClockAlert, sub: t("Book {minNoticeHours} h ahead · cancel {freeCancelHours} h ahead", { minNoticeHours: policy.minNoticeHours, freeCancelHours: policy.freeCancelHours }) },
    { kind: "approvals", icon: ShieldCheck, sub: policy.newClientApproval ? t("New clients need your OK") : t("New clients book straight away") },
    { kind: "window", icon: CalendarRange, sub: t("Up to {v}", { v: windowText(policy.windowDays) }) },
    { kind: "reminders", icon: BellRing, sub: remindersLabel(reminders.alert, reminders.alert2) },
    { kind: "sync", icon: RefreshCw, sub: t("Coming soon") },
  ];

  // The four sections, shared by both layouts (`web` sizes their rows).
  const addStyle: React.CSSProperties = web
    ? { gap: 6, marginTop: 8, height: 40, padding: "0 12px 0 8px", marginInlineStart: -8, borderRadius: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#7D6BB5" }
    : { gap: 6, padding: "12px 0 0", minHeight: 44, fontSize: textPx(13), fontWeight: 700, color: INK.prDeep };
  const addClass = web ? "inline-flex items-center hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" : "tap flex items-center";
  const hoursSec = (
    <SettingsSection label={t("Working hours")} first web={web}>
      {[1, 2, 3, 4, 5, 6, 7].map((wd, i) => {
        const w = dayWindows(wd);
        const on = w.length > 0;
        return (
          <div key={wd} className="relative flex items-center" style={web ? { gap: 12, minHeight: 52, boxSizing: "border-box", padding: "6px 0" } : { gap: 12, padding: "11px 0" }}>
            <span className="flex-1 min-w-0" style={web ? { fontSize: 15, lineHeight: "24px", fontWeight: 600, color: on ? "#241F1B" : "#8C8378" } : { fontSize: textPx(14), fontWeight: 600, color: on ? INK.ch : INK.chF }}>
              {weekdayLong(wd - 1)}
            </span>
            {on ? (
              <button
                type="button"
                onClick={() => setHoursEdit({ weekday: wd, start: w[0].start, end: w[w.length - 1].end })}
                aria-label={t("{weekday} hours, {hours}, change", { weekday: weekdayLong(wd - 1), hours: w.map((x) => range12(x.start, x.end)).join(t(", ")) })}
                className={web ? "flex items-center hover:border-[#AEA1DC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" : "tap flex items-center"}
                style={
                  web
                    ? { height: 36, boxSizing: "border-box", padding: "0 12px", borderRadius: 10, background: "#F5F5F6", border: "1px solid rgba(36,31,27,0.1)", fontSize: 15, lineHeight: "24px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: "#241F1B" }
                    : { height: 32, padding: "0 10px", borderRadius: 10, background: INK.soft, border: `1px solid ${INK.b10}`, fontSize: textPx(12.5), fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: INK.ch }
                }
              >
                {w.map((x) => range12(x.start, x.end)).join(", ")}
              </button>
            ) : (
              <span style={web ? { fontSize: 13, lineHeight: "20px", color: "#8C8378" } : { fontSize: textPx(12.5), color: INK.chF }}>{t("Day off")}</span>
            )}
            <Toggle checked={on} label={t("{weekday}, working", { weekday: weekdayLong(wd - 1) })} disabled={busyDay === wd} onChange={(v) => void toggleDay(wd, v)} />
            {i < 6 && <span aria-hidden className="absolute" style={{ bottom: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 1, background: INK.b06 }} />}
          </div>
        );
      })}
      {businessHours.map((b, i) => (
        <SettingsRow key={b.id} icon={Store} title={t("At {name}", { name: b.name })} sub={b.line} value={t("Set by the business")} last={i === businessHours.length - 1} web={web} />
      ))}
    </SettingsSection>
  );
  const offSec = (
    <SettingsSection label={t("Time off")} web={web}>
      {entries.map((e) => {
        const Icon = e.start ? Coffee : Plane;
        return <SettingsRow key={e.key} icon={Icon} title={e.reason || (e.start ? t("Break") : t("Time off"))} sub={entrySub(e)} onClick={() => setOffSheet({ entry: e })} web={web} />;
      })}
      <button type="button" onClick={() => setOffSheet({ entry: null })} className={addClass} style={addStyle}>
        <Plus size={web ? 16 : 14} strokeWidth={2.4} aria-hidden />{t("Add time off")}</button>
    </SettingsSection>
  );
  const typesSec = (
    <SettingsSection label={t("Session types")} web={web}>
      {types.map((t, i) => {
        const { tint, bar } = eventColours(t.colour ?? DEFAULT_SESSION, dark);
        return (
          <SettingsRow
            key={t.id}
            tile={
              <span className="flex items-center justify-center" style={{ width: web ? 40 : 36, height: web ? 40 : 36, borderRadius: web ? 12 : 11, background: tint }}>
                <span style={{ width: 12, height: 12, borderRadius: 9999, background: bar }} />
              </span>
            }
            title={t.name}
            sub={typeSub(t)}
            last={i === types.length - 1}
            onClick={() => setTypeSheet({ type: t })}
            web={web}
          />
        );
      })}
      {types.length === 0 && <p style={web ? { margin: 0, padding: "12px 0 0", fontSize: 13, lineHeight: "20px", color: "#8C8378" } : { padding: "13px 0 0", fontSize: textPx(12.5), color: INK.chF }}>{t("Session types are what clients book: a name, a length and a price.")}</p>}
      <button type="button" onClick={() => setTypeSheet({ type: null })} className={addClass} style={addStyle}>
        <Plus size={web ? 16 : 14} strokeWidth={2.4} aria-hidden />{t("Add session type")}</button>
    </SettingsSection>
  );
  const bookSec = (
    <SettingsSection label={t("Booking")} web={web}>
      {bookingRows.map((r, i) => (
        <SettingsRow key={r.kind} icon={r.icon} title={BOOKING_TITLES[r.kind]} sub={r.sub} last={i === bookingRows.length - 1} onClick={() => setBooking(r.kind)} web={web} />
      ))}
    </SettingsSection>
  );

  const sheets = (
    <>
        <BottomSheet
          open={!!hoursEdit}
          onClose={() => {
            setWheel(null);
            setHoursEdit(null);
          }}
          title={hoursEdit ? weekdayLong(hoursEdit.weekday - 1) : ""}
          footer={<CtaButton size="sheet" className="w-full" label={t("Save")} loading={busyDay !== null} disabled={!hoursEdit || hoursEdit.start >= hoursEdit.end} onClick={() => void saveHours()} />}
        >
          {hoursEdit && (
            <>
              <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
                <TimeField label={t("From")} value={hoursEdit.start} open={wheel === "start"} onOpen={() => setWheel("start")} onClose={() => setWheel(null)} onChange={(v) => setHoursEdit({ ...hoursEdit, start: v })} minuteStep={15} />
                <TimeField label={t("To")} value={hoursEdit.end} open={wheel === "end"} onOpen={() => setWheel("end")} onClose={() => setWheel(null)} onChange={(v) => setHoursEdit({ ...hoursEdit, end: v })} notBefore={hoursEdit.start} minuteStep={15} />
              </div>
              <div aria-hidden style={{ height: wheel ? 190 : 8 }} />
            </>
          )}
        </BottomSheet>
  
        <TimeOffSheet open={!!offSheet} me={me} todayIso={todayIso} entry={offSheet?.entry ?? null} date={todayIso} onDay={null} onClose={() => setOffSheet(null)} onSaved={() => void load()} />
        <SessionTypeSheet open={!!typeSheet} me={me} type={typeSheet?.type ?? null} onClose={() => setTypeSheet(null)} onSaved={() => void load()} />
        <BookingSheet kind={booking} me={me} policy={policy} handle={handle} reminders={reminders} onClose={() => setBooking(null)} onSaved={() => void load()} onToast={setToast} />
        <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );

  // Website viewport (WP-CA.5, WP-CA Calendar Extras Web availPage): a 72
  // header (back 40, "Availability" 28/36, the line 13/20), then Working
  // hours + Time off | Session types + Booking as two equal columns (24
  // apart, 32 between sections) under a 1280 cap, 32 (24) padding.
  if (web) {
    const margin = rail ? 24 : 32;
    return (
      <div>
        <header className="flex items-center" style={{ height: 72, boxSizing: "border-box", gap: 12, padding: `0 ${margin}px`, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
          <button type="button" onClick={back} aria-label={t("Back")} className="flex items-center justify-center shrink-0 hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 999, border: "1px solid rgba(36,31,27,0.11)", color: "#5B5349" }}>
            <ChevronLeft size={20} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.022em", color: "#241F1B" }}>{t("Availability")}</h1>
            <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 500, color: "#8C8378" }}>{t("When clients can book you")}</p>
          </div>
        </header>
        <div style={{ maxWidth: WEB_READING_MAX, boxSizing: "border-box", padding: `32px ${margin}px` }}>
          {!online && loaded && <OfflineLine />}
          {error && loaded && (
            <div style={{ marginBottom: 12 }}>
              <ProError onRetry={() => void load()} />
            </div>
          )}
          {!loaded ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", columnGap: 24 }}>
              <ProCardSkeleton lines={7} height={320} />
              <ProCardSkeleton lines={7} height={320} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", columnGap: 24, alignItems: "start" }}>
              <div className="flex flex-col min-w-0" style={{ gap: 32 }}>
                {hoursSec}
                {offSec}
              </div>
              <div className="flex flex-col min-w-0" style={{ gap: 32 }}>
                {typesSec}
                {bookSec}
              </div>
            </div>
          )}
        </div>
        {sheets}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start" style={{ gap: 6, marginBottom: 20 }}>
        <button type="button" onClick={back} aria-label={t("Back")} className="tap flex items-center justify-center shrink-0" style={{ width: 36, height: 36, marginTop: 2, color: INK.chS }}>
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <div>
          <h1 style={{ fontSize: textPx(27), fontWeight: 700, letterSpacing: "-0.022em", color: INK.ch, lineHeight: 1.5 }}>{t("Availability")}</h1>
          <p style={{ fontSize: textPx(13), fontWeight: 500, marginTop: 6, color: INK.chF }}>{t("When clients can book you")}</p>
        </div>
      </div>

      <div style={{ padding: "0 8px", marginTop: -12 }}>
        {!online && loaded && <OfflineLine />}
        {error && loaded && (
          <div style={{ marginBottom: 12 }}>
            <ProError onRetry={() => void load()} />
          </div>
        )}
        {!loaded ? (
          <div className="flex flex-col" style={{ gap: 12 }}>
            <ProCardSkeleton lines={7} height={320} />
            <ProCardSkeleton lines={3} height={140} />
          </div>
        ) : (
          <>
            {hoursSec}
            {offSec}
            {typesSec}
            {bookSec}
            <div style={{ height: 24 }} />
          </>
        )}
      </div>

      {sheets}
    </div>
  );
}

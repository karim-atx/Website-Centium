import React from "react";
import { ChevronLeft, ChevronRight, Plus, Ticket } from "lucide-react";
import { useWebLayout } from "../../components/web/useWebLayout";
import { eventColours } from "../../components/calendar/eventColour";
import { occurrenceKey } from "../../components/calendar/occurrences";
import type { ClientCalendarEvent } from "../../services/calendar";
import { monthLeadingBlanks } from "../../utils/week";
import { range12 } from "../../utils/time12";
import { appLocale } from "../../i18n/format";
import { t } from "../../i18n/core";
import { MoCta, MoPage } from "./web/moWeb";
import { useApp } from "../../context/AppContext";
import ClientCalendarTab from "./ClientCalendarTab";
import { addDaysISO, monthYear, repeatsLine, toISO, useClientCalendar } from "./calendar/useClientCalendar";
import { ClientCalendarSheets } from "./calendar/ClientCalendarSheets";

// Website viewport v1 · WC-MO.3 Calendar (WC-MO More Web v7, frames
// WC-MO.3_filled / _filled-rail / _empty / _empty-rail / _new-event-side-sheet).
// The month (8 of 12 columns at 1440; 1.3 : 1 on the rail) and the selected
// day's list (4) side by side, 24 apart. The month: its name 20/28 700, Jump
// to today (36, r12 #F6F4FE, 15/600 #7D6BB5) and the 36 previous / next
// buttons over a card (r15, 0.5px rgba(125,107,181,0.16), padding 12) of 7
// columns: the weekdays 12/24 700 .1em caps #8C8378, then the weeks sharing
// the height (gap 4); a day is r12 with padding 6, its number in a 30 circle
// (15/600; today 800 white on #9A8CD6, its cell #F6F4FE), the days of the
// months either side at 0.35, and a 6 dot per event in the event's colour
// (gap 3); hover #F6F4FE. The day list (r15, the same border, padding 14,
// gap 12, as tall as its content): the day 17/24 700, INVITATIONS (13/20 700
// .14em #7D67D9) with each invitation's card (Decline 40 #F0EDF9 / Accept 40
// #9A8CD6), then the events (r15, padding 12 14, the event colour's tint, a
// 3 bar, title 15/20 700, line 13/18 #5B5349, time 13/700); none: "No
// events" on #FAFAFB (min 120). New event opens the compose sheet (a 440
// side sheet on web).
//
// Same data and sheets as the mobile page (useClientCalendar): the selected
// day is the one shown in the list (today by default, outlined when it isn't
// today); an own event opens its editor, the rest the event detail sheet.
// Repo kept over the frames: the Year / Week / Day views stay on mobile only
// (the design draws the month), declined invitations stay at 0.6, a booked
// class keeps its Ticket, and the invitation's answer states (Going /
// Declined) show in its pill.

/** The weekday names, Monday first, in the app's language (2024-01-01 was a Monday). */
const weekdays = () =>
  Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(appLocale("en-US"), { weekday: "short" }));

/** The web page for a customer; other accounts keep the mobile page (in the centred column). */
export default function ClientCalendarWeb() {
  const { user } = useApp();
  return user.accountType === "customer" ? <CalendarWeb /> : <ClientCalendarTab />;
}

function CalendarWeb() {
  const cal = useClientCalendar();
  const { rail } = useWebLayout();
  const { cursor, setCursor, selectedDate, setSelectedDate, eventsByDate, goMonth, openCompose, todayIso, today, dark, loaded, selectedDateLabel, selectedEvents, invitedEvents, inviteLabel, openEvent, respond, respondingTo, bookingOf, statusCard } = cal;

  // The weeks of the month in view, with the days of the months either side.
  const lead = monthLeadingBlanks(cursor.year, cursor.month);
  const first = toISO(cursor.year, cursor.month, 1);
  const daysIn = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const total = Math.ceil((lead + daysIn) / 7) * 7;
  const days = Array.from({ length: total }, (_, i) => addDaysISO(first, i - lead));
  const inMonth = (iso: string) => Number(iso.slice(5, 7)) - 1 === cursor.month;

  const pickDay = (iso: string) => {
    setSelectedDate(iso);
    if (!inMonth(iso)) setCursor({ year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 });
  };

  const others = selectedEvents.filter((e: ClientCalendarEvent) => !e.invite);

  return (
    <MoPage
      title={t("Calendar")}
      sub={t("Your events, synced with your professional & gym")}
      frame="calendar"
      action={<MoCta icon={Plus} label={t("New event")} onClick={openCompose} />}
    >
      {statusCard}
      <div data-wv-cal="grid" className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: rail ? "minmax(0,1.3fr) minmax(0,1fr)" : "minmax(0,8fr) minmax(0,4fr)", gap: 24 }}>
        <div className="min-w-0 min-h-0 flex flex-col" style={{ gap: 12 }}>
          <div className="shrink-0 flex items-center" style={{ gap: 8 }}>
            <h2 data-wv-cal="month" aria-live="polite" className="flex-1" style={{ margin: 0, fontSize: 20, lineHeight: "28px", fontWeight: 700, color: "#241F1B" }}>
              {monthYear(cursor.year, cursor.month)}
            </h2>
            <button
              type="button"
              onClick={() => {
                setCursor({ year: today.getFullYear(), month: today.getMonth() });
                setSelectedDate(todayIso);
              }}
              className="shrink-0 whitespace-nowrap hover:bg-[#EEEAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ height: 36, padding: "0 12px", borderRadius: 12, background: "#F6F4FE", fontSize: 15, fontWeight: 600, color: "#7D6BB5" }}
            >
              {t("Jump to today")}
            </button>
            <RoundButton label={t("Previous month")} onClick={() => goMonth(-1)}>
              <ChevronLeft size={18} aria-hidden />
            </RoundButton>
            <RoundButton label={t("Next month")} onClick={() => goMonth(1)}>
              <ChevronRight size={18} aria-hidden />
            </RoundButton>
          </div>
          <div
            data-wv-cal="month-grid"
            role="grid"
            aria-label={monthYear(cursor.year, cursor.month)}
            className="flex-1 min-h-0 grid"
            style={{ borderRadius: 15, border: "0.5px solid rgba(125,107,181,0.16)", padding: 12, gridTemplateColumns: "repeat(7,minmax(0,1fr))", gridTemplateRows: "auto", gridAutoRows: "minmax(0,1fr)", gap: 4 }}
          >
            {weekdays().map((d) => (
              <span key={d} role="columnheader" className="text-center uppercase rtl:tracking-normal" style={{ fontSize: 12, lineHeight: "24px", fontWeight: 700, letterSpacing: ".1em", color: "#71685E" }}>
                {d}
              </span>
            ))}
            {days.map((iso) => {
              const isToday = iso === todayIso;
              const selected = iso === selectedDate;
              const evs = eventsByDate[iso] ?? [];
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  data-today={isToday || undefined}
                  aria-selected={selected}
                  aria-label={new Date(`${iso}T00:00:00`).toLocaleDateString(appLocale("en-US"), { weekday: "long", month: "long", day: "numeric" })}
                  onClick={() => pickDay(iso)}
                  className="min-h-0 flex flex-col items-center hover:bg-[#F6F4FE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                  style={{
                    borderRadius: 12,
                    padding: 6,
                    gap: 4,
                    opacity: inMonth(iso) ? 1 : 0.35,
                    background: selected ? "#F6F4FE" : undefined,
                    boxShadow: selected && !isToday ? "inset 0 0 0 1px #AEA1DC" : undefined,
                  }}
                >
                  <span
                    className="grid place-items-center"
                    style={{ width: 30, height: 30, borderRadius: 999, fontSize: 15, fontWeight: isToday ? 800 : 600, fontVariantNumeric: "tabular-nums", background: isToday ? "#9A8CD6" : "transparent", color: isToday ? "#FFFFFF" : "#241F1B" }}
                  >
                    {Number(iso.slice(8))}
                  </span>
                  {inMonth(iso) && evs.length > 0 && (
                    <span className="flex flex-wrap justify-center" style={{ gap: 3 }} aria-hidden>
                      {evs.slice(0, 4).map((e) => (
                        <span key={occurrenceKey(e)} style={{ width: 6, height: 6, borderRadius: 999, background: eventColours(e.color, dark).bar }} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <aside
          data-wv-cal="day"
          aria-label={selectedDateLabel}
          className="min-w-0 min-h-0 flex flex-col overflow-y-auto"
          style={{ alignSelf: "start", maxHeight: "100%", boxSizing: "border-box", borderRadius: 15, border: "0.5px solid rgba(125,107,181,0.16)", padding: 14, gap: 12, scrollbarWidth: "none" }}
        >
          <p className="shrink-0" style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
            {selectedDateLabel}
          </p>
          {!loaded ? (
            <>
              <div aria-hidden className="shrink-0 animate-skeleton-pulse" style={{ height: 58, borderRadius: 15, background: "#F5F5F6" }} />
              <div aria-hidden className="shrink-0 animate-skeleton-pulse" style={{ height: 58, borderRadius: 15, background: "#F5F5F6" }} />
            </>
          ) : (
            <>
              {invitedEvents.length > 0 && (
                <>
                  <p className="shrink-0 uppercase rtl:tracking-normal" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".14em", color: "#7D67D9" }}>
                    {t("Invitations")}
                  </p>
                  {invitedEvents.map((e: ClientCalendarEvent) => {
                    const { tint, bar } = eventColours(e.color, dark);
                    const status = e.invite!.status;
                    const busy = respondingTo === e.invite!.id;
                    return (
                      <div key={occurrenceKey(e)} data-wv-cal="invite" className="shrink-0 flex flex-col" style={{ borderRadius: 15, padding: "12px 14px", background: tint, gap: 10, opacity: status === "declined" ? 0.6 : undefined }}>
                        <button type="button" onClick={() => openEvent(e)} className="flex text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ gap: 11 }}>
                          <span className="shrink-0 self-stretch" style={{ width: 3, minHeight: 32, borderRadius: 999, background: bar }} />
                          <span className="flex-1 min-w-0">
                            <span className="block truncate" style={{ fontSize: 15, lineHeight: "20px", fontWeight: 700, color: "#241F1B" }}>
                              {e.title}
                            </span>
                            <span className="block truncate" style={{ fontSize: 13, lineHeight: "18px", color: "#5B5349" }}>
                              {eventLine(e)}
                            </span>
                          </span>
                          <span className="shrink-0 self-start" style={{ borderRadius: 999, padding: "2px 8px", background: "#FFFFFF", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#7D6BB5" }}>
                            {inviteLabel[status]}
                          </span>
                        </button>
                        {status === "pending" && (
                          <div className="flex" style={{ gap: 8 }}>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void respond(e, false)}
                              className="flex-1 flex items-center justify-center disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                              style={{ height: 40, borderRadius: 12, background: "#F0EDF9", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#7D67D9" }}
                            >
                              {t("Decline")}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void respond(e, true)}
                              className="flex-1 flex items-center justify-center disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2"
                              style={{ height: 40, borderRadius: 12, background: "#9A8CD6", fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}
                            >
                              {t("Accept")}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
              {others.map((e: ClientCalendarEvent) => {
                const { tint, bar } = eventColours(e.color, dark);
                const booked = bookingOf(e);
                return (
                  <button
                    key={occurrenceKey(e)}
                    type="button"
                    data-wv-cal="event"
                    onClick={() => openEvent(e)}
                    className="shrink-0 w-full flex items-start text-start hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                    style={{ gap: 11, borderRadius: 15, padding: "12px 14px", background: tint }}
                  >
                    <span className="shrink-0 self-stretch" style={{ width: 3, minHeight: 32, borderRadius: 999, background: bar }} />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center" style={{ gap: 6, fontSize: 15, lineHeight: "20px", fontWeight: 700, color: "#241F1B" }}>
                        <span className="truncate">{e.title}</span>
                        {booked && <Ticket size={13} aria-label={t("Booked")} className="shrink-0" style={{ color: "#9A7424" }} />}
                      </span>
                      <span className="block truncate" style={{ fontSize: 13, lineHeight: "18px", color: "#5B5349" }}>
                        {[e.location, booked ? (booked.businessActive ? booked.businessName : t("{name} (no longer on Explore)", { name: booked.businessName })) : null].filter(Boolean).join(" · ") || (e.repeat !== "none" ? repeatsLine(e.repeat).slice(3) : "")}
                      </span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#5B5349", fontVariantNumeric: "tabular-nums" }}>
                      {e.allDay ? t("All day") : range12(e.startTime, null)}
                    </span>
                  </button>
                );
              })}
              {selectedEvents.length === 0 && (
                <div className="grid place-items-center" style={{ minHeight: 120, borderRadius: 15, background: "#FAFAFB" }}>
                  <p style={{ margin: 0, fontSize: 15, color: "#71685E" }}>{t("No events")}</p>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
      <ClientCalendarSheets cal={cal} />
    </MoPage>
  );
}

/** An invitation's line: its time, then where. */
function eventLine(e: ClientCalendarEvent) {
  const time = e.allDay ? t("All day") : range12(e.startTime, e.endTime);
  return [time, e.location].filter(Boolean).join(" · ");
}

const RoundButton: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="shrink-0 grid place-items-center hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
    style={{ width: 36, height: 36, borderRadius: 999, color: "#5B5349" }}
  >
    {children}
  </button>
);


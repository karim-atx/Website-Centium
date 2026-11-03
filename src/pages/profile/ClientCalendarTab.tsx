import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { FixedHeader } from "../../components/ui/FixedHeader";
import { occurrenceKey } from "../../components/calendar/occurrences";
import { monthReminderLine } from "../../components/calendar/inviteLines";
import { YearScroll } from "../../components/calendar/YearScroll";
import { eventColours } from "../../components/calendar/eventColour";
import { linkLabel, minutesOf, normaliseLink } from "../../components/calendar/calendarTime";
import { hourLabel12, range12 } from "../../utils/time12";
import { ChevronLeft, Plus, Check, Ticket, Link as LinkIcon, Bell } from "lucide-react";
import clsx from "clsx";
import { weekLetters } from "../../components/dashboard/widgets/weekLetters";
import { t, tx } from "../../i18n/core";
import { appLocale } from "../../i18n/format";
import {
  addDaysISO,
  monthYear,
  NEW_EVENT_DARK_END,
  repeatsLine,
  toISO,
  useClientCalendar,
  VIEW_LABEL,
  VIEWS,
  type View,
} from "./calendar/useClientCalendar";
import { ClientCalendarSheets } from "./calendar/ClientCalendarSheets";

const HOUR_PX = 56;

// V9 (QA 9.0): "Copy the calendar tab found in the Professional's UI here
// in a button found in the More's page. This serves as a calendar where the
// client can add events but also syncs up with anything the connected
// professional might add with the selected client as well as anything the
// gym... might add that involves the client" — reads the same shared
// calendarEvents/businessClasses stores the Professional/Business calendars
// write to, filtered to what actually involves this client, rather than a
// separate client-only event list.
//
// PHASE 1 (2026-09): REAL ROWS, AND THE NAME FILTER IS GONE. This screen used
// to decide what belonged to you with
//
//   calendarEvents.filter((e) => e.createdByClient || e.invitees?.includes(user.firstName))
//
// against a local, per-browser store. `invitees` was an array of NAMES, so two
// accounts whose owner is called Sarah saw each other's events — and an
// invitation could not be answered, could not survive a rename, and could not
// be notified. calendar_events has existed since the professional_business
// migration and calendar_event_invitees was added for exactly this; both were
// unused by any client code.
//
// THE LOCAL STORE IS READ FOR ONE THING ONLY: carrying pre-existing local
// events up to the server once (below). Nothing else writes it any more.
export default function ClientCalendarTab() {
  const cal = useClientCalendar();
  const { back, colorTheme, today, view, setView, cursor, setCursor, selectedDate, setSelectedDate, dark, inviteExtras, loaded, bookingOf, openEvent, eventsByDate, cells, goMonth, openCompose, selectedEvents, selectedDateLabel, timedEvents, allDayEvents, invitedEvents, eventLink, eventCard, headerCard, skeleton, yearJump, setYearJump, todayIso, weekDays, weekLabel, statusCard } = cal;

  return (
    <div>
      {/* v6 MO1.6 #1 / MO1.6.2 #1: the header, the view tabs and (Week, Day)
          the navigator are one fixed area (the shared FixedHeader: page fill
          and hairline only once content passes under it, 120 ms, none under
          Reduce motion). Bottom padding 13 under the tabs, 16 under a
          navigator. Day's navigator is fixed like Week's (MO1.6 O7). */}
      <FixedHeader paddingBottom={view === "week" || view === "day" ? 16 : 13}>
        {/* Handover 2026-09-29 MO4.1: a back arrow beside the title. MO1.6
            #2-#6: back 36 (m 2 0 0 -6), the title 19 / 28.5 700 ls -0.6, the
            34 New event button (44 hit area through .tap). */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <button
              onClick={back}
              aria-label={t("Back")}
              className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-card hover:shadow-soft shrink-0 -ms-1.5 mt-0.5 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-[19px] leading-[28.5px] font-bold tracking-[-0.6px] text-charcoal mt-[5px]">{t("Calendar")}</h1>
          </div>
          <button
            onClick={openCompose}
            aria-label={t("New event")}
            className="tap w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0"
            style={{
              background: dark
                ? `linear-gradient(150deg, rgb(var(--c-primary)), ${NEW_EVENT_DARK_END[colorTheme] ?? NEW_EVENT_DARK_END.centium})`
                : "var(--gradient-lavender-accent)",
            }}
          >
            <Plus size={16} className="text-white" />
          </button>
        </div>

        {/* MO1.6 #7-#9: the views as full-width segmented tabs (44 in a 56
            track): idle #F5F4FE with #5B5349, active #A79AD5 with white
            (#5B48B8 under High contrast); dark track and idle #303141 with
            #B8B3C7 (darkTone partB), active #A991FE with #0D0B1A. A second
            tap on Year while in Year scrolls back to today's year (MO1.6.1). */}
        <SegmentedTabs
          className="mt-[13px]"
          items={VIEWS.map((v) => ({ key: v, label: tx(VIEW_LABEL[v], "calendar view") }))}
          activeKey={view}
          onChange={(k) => {
            if (k === "year" && view === "year") {
              setCursor((c) => ({ ...c, year: today.getFullYear() }));
              setYearJump((n) => n + 1);
              return;
            }
            setView(k as View);
          }}
          idleInk="rgb(var(--c-charcoal-soft))"
          darkTone="partB"
        />

        {view === "week" && (
          <div className="mt-[13px]">
            {headerCard(weekLabel, () => setSelectedDate(addDaysISO(selectedDate, -7)), () => setSelectedDate(addDaysISO(selectedDate, 7)), t("Previous week"), t("Next week"))}
          </div>
        )}
        {view === "day" && (
          <div className="mt-[13px]">
            {headerCard(selectedDateLabel, () => setSelectedDate(addDaysISO(selectedDate, -1)), () => setSelectedDate(addDaysISO(selectedDate, 1)), t("Previous day"), t("Next day"))}
          </div>
        )}
      </FixedHeader>

      {statusCard}

      {view === "month" && (
        <>
          {/* MO1.6 #10: 358 wide, r15, padding 13 14, white with a 0.5
              #8F68F6@16% border (dark #1C1F28, the same border). */}
          <div className="rounded-[15px] bg-white dark:bg-[#1C1F28] border-[0.5px] border-team-nav-accent/[0.16] px-3.5 py-[13px] mb-[13px]">
            {headerCard(monthYear(cursor.year, cursor.month), () => goMonth(-1), () => goMonth(1), t("Previous month"), t("Next month"))}

            {/* MO1.6 #15: weekday letters Monday first, 13 / 19.5 600 with 6
                above and below (31.5), #5B3FE4 (dark #B7ABDE, V6-92), 2 above
                the first row of days. */}
            <div className="grid grid-cols-7 gap-[2px] mt-2.5 mb-[2px]">
              {weekLetters().map((d, i) => (
                <div key={i} className="py-1.5 leading-[19.5px] flex items-center justify-center text-[13px] font-semibold text-th-5b3fe4 dark:text-th-b7abde">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-[2px]">
              {cells.map((day, i) => {
                if (day === null) return <div key={i} />;
                const iso = toISO(cursor.year, cursor.month, day);
                const hasEvents = !!eventsByDate[iso]?.length;
                const isSelected = iso === selectedDate;
                const isToday = iso === todayIso;
                return (
                  <button data-today={isToday || undefined}
                    key={i}
                    onClick={() => setSelectedDate(iso)}
                    aria-label={new Date(`${iso}T00:00:00`).toLocaleDateString(appLocale("en-US"), { weekday: "long", month: "long", day: "numeric" })}
                    aria-pressed={isSelected}
                    // v6 MO1.6 #16-#20: cells r12, 15 / 22.5. The selected day
                    // #AB9ED7 with white 600 (the theme's own in other themes;
                    // #5B48B8 under High contrast; dark the primary fill
                    // #A991FE with #0D0B1A, V6-92: white on #AB9ED7* is
                    // 2.4:1). Other days #000000 500 (dark #F5F3FA, V6-92).
                    className={clsx(
                      "tap aspect-square rounded-[12px] flex flex-col items-center justify-center gap-0.5 text-[15px] leading-[22.5px]",
                      isSelected
                        ? "font-semibold bg-th-ab9ed7 text-white dark:bg-primary-fill dark:text-on-primary-fill [.high-contrast_&]:bg-primary-fill [.high-contrast_&]:text-on-primary-fill"
                        : isToday
                        ? "bg-team-lavender/[0.16] text-primary-deep-text font-semibold"
                        : "font-medium text-black dark:text-charcoal"
                    )}
                  >
                    {day}
                    {/* #17 / #20: the 3.5 dot, white on the selected day (dark
                        #1C1F28), else #6F9993 (dark #4F8F8A; the theme's
                        secondary pair). */}
                    <span
                      className={clsx(
                        "w-[3.5px] h-[3.5px] rounded-full",
                        !hasEvents ? "bg-transparent" : isSelected ? "bg-white dark:bg-[#1C1F28]" : "bg-th-6f9993 dark:bg-th-4f8f8a"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Iteration 6 "Team": a day agenda beneath the grid — the
              selected day's real events, tinted rows keyed to each
              event's own colour. Selecting a date updates this list in
              place; the view tabs reach the full hour timeline. */}
          {/* MO1.6 #21: 9 / 13.5 700 ls 1.8 caps at 42% (dark 42% too,
              V6-113; High contrast lifts it to the full ink). */}
          <p className="mb-[9px] text-[9px] leading-[13.5px] font-bold tracking-[1.8px] uppercase text-charcoal/[0.42] [.high-contrast_&]:text-charcoal">{selectedDateLabel}</p>
          {!loaded ? (
            // OURS O-LD: two 57.7 r15 skeleton rows on first load only.
            <div className="flex flex-col gap-[7px]">
              {skeleton("h-[57.7px] rounded-[15px]")}
              {skeleton("h-[57.7px] rounded-[15px]")}
            </div>
          ) : selectedEvents.length === 0 ? (
            <p className="text-[11.5px] text-charcoal-faint">{t("No events")}</p>
          ) : (
            <div className="flex flex-col gap-[7px]">
              {selectedEvents.map((e) => {
                const booked = bookingOf(e);
                const { tint, bar } = eventColours(e.color, dark);
                const link = eventLink(e, 10, "text-[10px]");
                // CU7: the professional's reminder (r25: 10 / 600 charcoal-faint, a 10 bell, 4 above).
                const rx = e.invite && e.invite.status !== "declined" ? inviteExtras[e.invite.id]?.reminder : undefined;
                const remind = rx ? monthReminderLine(rx.first, rx.alert, rx.alert2) : null;
                return (
                  // MO1.6 #22-#29: r15, padding 12 14, the event colour at
                  // 16% (dark shade in dark), a 3 pill gap 11, the title
                  // 12.5 / 18.8 700, the time line 10 / 15 #A79E93 / #9F9CAC.
                  <div
                    key={occurrenceKey(e)}
                    className="flex items-start gap-[11px] rounded-[15px] px-3.5 py-3"
                    style={{ background: tint, opacity: e.invite?.status === "declined" ? 0.6 : undefined }}
                  >
                    <span className="w-[3px] self-stretch min-h-8 rounded-full shrink-0" style={{ background: bar }} />
                    <span className="flex-1 min-w-0 flex flex-col gap-1">
                      <button onClick={() => openEvent(e)} className="tap flex items-center gap-2 text-start min-w-0">
                        <span className="flex-1 min-w-0">
                          <span className="block text-[12.5px] leading-[18.8px] font-bold text-charcoal truncate">{e.title}</span>
                          <span className="block text-[10px] leading-[15px] text-charcoal-tertiary truncate">
                            {e.allDay ? t("All day") : range12(e.startTime, e.endTime)}
                            {e.repeat !== "none" && repeatsLine(e.repeat)}
                            {e.location && ` · ${e.location}`}
                            {/* WHO IT IS WITH, ON THE DEFAULT VIEW. This compact
                                card is what Month renders — not eventCard — so the
                                full card's "Booked" badge never reaches the screen
                                most people land on. The subtitle already composes
                                from several optional parts; the business is one
                                more, and the delisted note rides with it because
                                there is nowhere else on this card to put it. */}
                            {booked && ` · ${booked.businessActive ? booked.businessName : t("{name} (no longer on Explore)", { name: booked.businessName })}`}
                          </span>
                        </span>
                        {/* K3 / K4: the invitation check in the time line's
                            #A79E93, the booked Ticket in Foundations gold.text
                            #9A7424 / #CAB082. */}
                        {e.invite && <Check size={12} aria-label={t("Invitation")} className="text-charcoal-tertiary shrink-0" />}
                        {booked && <Ticket size={12} aria-label={t("Booked")} className="text-[#9A7424] dark:text-[#CAB082] shrink-0" />}
                      </button>
                      {remind && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-charcoal-faint">
                          <Bell size={10} strokeWidth={2} className="shrink-0" aria-hidden />{remind}
                        </span>
                      )}
                      {link}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === "week" && (
        // V10 (QA 10.0): the days under each other in boxes with each day's
        // events beside it; Monday to Sunday (MO1.6.2 D1). Tapping a day box
        // opens it in Day view (B32). Rows 10 apart (59 pitch).
        <div className="space-y-2.5">
          {weekDays.map((iso) => {
            const dayEvents = eventsByDate[iso] ?? [];
            const isToday = iso === todayIso;
            const d = new Date(`${iso}T00:00:00`);
            return (
              <div key={iso} data-today={isToday || undefined} className="flex items-start gap-3">
                {/* MO1.6.2 #14-#20: 56 wide, padding 8 0, r16 #F5F5F6 with
                    #5B5349 (dark #242730 / #B8B3C7); today r12 #AB9ED7 with
                    white (dark primary fill with #0D0B1A, V6-92; #5B48B8
                    under High contrast); weekday 10 / 15 700 ls 0.3 caps,
                    date 16 / 16 700. */}
                <button
                  onClick={() => {
                    setSelectedDate(iso);
                    setView("day");
                  }}
                  aria-label={t("{date}, open in Day view", { date: d.toLocaleDateString(appLocale("en-US"), { weekday: "long", month: "long", day: "numeric" }) })}
                  className={clsx(
                    "tap shrink-0 w-14 flex flex-col items-center justify-center py-2 gap-0.5",
                    isToday
                      ? "rounded-[12px] bg-th-ab9ed7 text-white dark:bg-primary-fill dark:text-on-primary-fill [.high-contrast_&]:bg-primary-fill [.high-contrast_&]:text-on-primary-fill"
                      : "rounded-2xl bg-cream-soft text-charcoal-soft"
                  )}
                >
                  <span className="text-[10px] leading-[15px] font-bold uppercase tracking-[0.3px]">
                    {d.toLocaleDateString(appLocale("en-US"), { weekday: "short" })}
                  </span>
                  <span className="text-base font-bold leading-none">{d.getDate()}</span>
                </button>
                <div className="flex-1 min-w-0 pt-2">
                  {!loaded ? (
                    // OURS O-LD: a 290 x 16 r8 bar beside each real day box.
                    skeleton("h-4 rounded-lg")
                  ) : dayEvents.length === 0 ? (
                    <p className="text-xs text-charcoal-faint">{t("No events")}</p>
                  ) : (
                    <div className="space-y-2">{dayEvents.map(eventCard)}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "year" && (
        <YearScroll
          year={cursor.year}
          todayIso={todayIso}
          eventDays={Object.keys(eventsByDate)}
          jumpSignal={yearJump}
          onOpenMonth={(y, m) => {
            setCursor({ year: y, month: m });
            setView("month");
          }}
        />
      )}

      {view === "day" && (
        <>
          {/* INVITATIONS GET A LIST OF THEIR OWN IN DAY VIEW, above the
              timeline, because the timeline cannot carry them. A timed event
              renders there as a positioned block a few pixels tall — no room
              for a badge, let alone two buttons — and Day is where tapping a
              date in Month view lands. Without this, an invitation to a 4pm
              session was visible and unanswerable on the screen most people
              reach first. */}
          {/* Decision 23 (item 114): both list headings as the MO1.6 day
              label (9/700, charcoal 42%, tracked, uppercase). */}
          {invitedEvents.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-[9px] leading-[13.5px] font-bold tracking-[1.8px] uppercase text-charcoal/[0.42] [.high-contrast_&]:text-charcoal">
                {t("Invitations")}
              </p>
              {invitedEvents.map(eventCard)}
            </div>
          )}

          {allDayEvents.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-[9px] leading-[13.5px] font-bold tracking-[1.8px] uppercase text-charcoal/[0.42] [.high-contrast_&]:text-charcoal">{t("All day")}</p>
              {allDayEvents.map(eventCard)}
            </div>
          )}

          <div className="relative" style={{ height: HOUR_PX * 24 }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} data-hour={h} className="absolute start-0 end-0 border-t border-charcoal/[0.06] flex items-start" style={{ top: h * HOUR_PX }}>
                <span className="text-[9px] text-charcoal-faint -mt-1.5 pe-1.5 w-9 text-end shrink-0">
                  {hourLabel12(h)}
                </span>
              </div>
            ))}
            <div className="absolute start-10 end-0 top-0 bottom-0">
              {timedEvents.map((e) => {
                const start = minutesOf(e.startTime);
                const end = Math.max(minutesOf(e.endTime), start + 20);
                const top = (start / 60) * HOUR_PX;
                const height = Math.max(((end - start) / 60) * HOUR_PX, 26);
                // 30 minutes or less: one line, the time beside the title, so
                // it isn't cut off (the block is too short for two lines).
                const short = minutesOf(e.endTime) - start <= 30;
                const booked = bookingOf(e);
                const { tint, bar } = eventColours(e.color, dark);
                const href = normaliseLink(e.url);
                return (
                  <div
                    key={occurrenceKey(e)}
                    className="absolute start-0 end-1 rounded-xl overflow-hidden shadow-soft"
                    style={{
                      top,
                      height,
                      background: tint,
                      borderInlineStart: `3px solid ${bar}`,
                      opacity: e.invite?.status === "declined" ? 0.6 : undefined,
                    }}
                  >
                    <button
                      onClick={() => openEvent(e)}
                      className={clsx(
                        "tap w-full h-full px-2.5 text-start",
                        short ? "flex items-center gap-1.5 py-0" : "py-1.5",
                        href && "pe-9"
                      )}
                    >
                      <p className={clsx("text-xs font-semibold text-charcoal truncate flex items-center gap-1", short && "min-w-0")}>
                        <span className="truncate">{e.title}</span>
                        {/* The timeline block is too small for the badge and the
                            buttons; the day list above carries both. This says
                            only that the event is an invitation, or a booking. */}
                        {e.invite && <Check size={10} className="shrink-0" />}
                        {booked && <Ticket size={10} className="shrink-0 text-[#9A7424] dark:text-[#CAB082]" />}
                      </p>
                      {short ? (
                        <p className="text-[10px] text-charcoal-faint whitespace-nowrap shrink-0">{range12(e.startTime, e.endTime)}</p>
                      ) : (
                      <p className="text-[10px] text-charcoal-faint truncate">
                        {range12(e.startTime, e.endTime)}
                        {e.location ? ` · ${e.location}` : ""}
                        {booked && ` · ${booked.businessActive ? booked.businessName : t("{name} (no longer on Explore)", { name: booked.businessName })}`}
                      </p>
                      )}
                    </button>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("Open link, {link}", { link: linkLabel(href) })}
                        className="tap absolute top-0.5 end-0.5 w-8 h-8 flex items-center justify-center text-primary-deep-text"
                      >
                        <LinkIcon size={13} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <ClientCalendarSheets cal={cal} />
    </div>
  );
}
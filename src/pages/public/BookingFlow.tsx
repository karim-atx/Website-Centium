import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, CalendarX, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { INK } from "../../components/pro/proInk";
import { priceLabel, sessionLine } from "../../components/pro/profile/profileModel";
import { CtaButton } from "../../components/pro/profile/kit";
import { clock12 } from "../../utils/time12";
import { textPx } from "../../theme/textSize";
import {
  NOT_TAKING_BOOKINGS,
  WEEKDAY_LETTERS,
  bookingAllowed,
  dayLabel,
  fetchBookableSessions,
  fetchOpenSlots,
  localDay,
  mondayOf,
  requestBooking,
  sessionsThatFit,
  slotLabel,
  slotsByDay,
  weekDays,
  type BookableSession,
  type Slot,
} from "../../services/public-pro";
import { SignInButtons } from "./publicKit";
import { appLocale } from "../../i18n/format";
import { getLanguage, t, tn } from "../../i18n/core";

const english = () => getLanguage() === "en";
/** "Oct 19" (English exactly as before; other languages the locale's own month and day). */
const monthDay = (d: Date) => (english() ? `${d.toLocaleDateString(appLocale("en-US"), { month: "short" })} ${d.getDate()}` : d.toLocaleDateString(appLocale(), { month: "short", day: "numeric" }));
/** The day letter, Monday first: the board's letters in English, the locale's narrow day otherwise. */
const dayLetter = (d: Date, i: number) => (english() ? WEEKDAY_LETTERS[i] : d.toLocaleDateString(appLocale(), { weekday: "narrow" }));

// Release 3 · W7 booking a professional's session: the public booking page
// (/p/{handle}/book) and the client profile's "Book a session" (the same flow
// in a sheet). Readers: professional_booking_allowed, the professional's
// active appointment_services, professional_open_slots (ATXG5 when the caller
// may not book); the write is request_professional_booking (signed in;
// ATXG6 "That time is no longer free."). Times are 12-hour in the device's
// time, weeks start on Monday, and the window is the policy's (30 days by
// default), so the week arrows stop after four weeks.
//
// No frame draws this page (CA17 to CA22 are the professional's settings).
// Built from the MO3 Availability grid (r13: 7 columns 4 apart, r10 cells,
// 8 0 padding, letter 10 / 700 text.faint, number 13 / 800 primary.deep on
// primary.pale, text.tertiary on soft for none), the hire sheet's payment
// rows for the session types, and the profile kit's 48 CTA.

const MAX_WEEKS_AHEAD = 4;

export interface BookingFlowProps {
  professionalId: string;
  firstName: string;
  signedIn: boolean;
  /** Signed out: the page to return to after signing in, with the chosen session and time. */
  returnPathFor?: (serviceId: string, slot: Slot | null) => string;
  initialServiceId?: string | null;
  initialSlot?: string | null;
  /** After a booking or request went through (the client profile reloads). */
  onBooked?: () => void;
}

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "blocked" } | { status: "ready"; sessions: BookableSession[] };

export function BookingFlow({ professionalId, firstName, signedIn, returnPathFor, initialServiceId, initialSlot, onBooked }: BookingFlowProps) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId ?? null);
  const [weekOffset, setWeekOffset] = useState(() => {
    if (!initialSlot) return 0;
    const t = new Date(initialSlot);
    if (Number.isNaN(t.getTime())) return 0;
    const diff = Math.round((mondayOf(t).getTime() - mondayOf(new Date()).getTime()) / (7 * 86400000));
    return Math.max(0, Math.min(MAX_WEEKS_AHEAD, diff));
  });
  const [slots, setSlots] = useState<{ key: string; slots: Slot[] } | { key: string; error: string; blocked?: boolean } | null>(null);
  const [day, setDay] = useState<string | null>(initialSlot && !Number.isNaN(new Date(initialSlot).getTime()) ? localDay(new Date(initialSlot)) : null);
  const [chosen, setChosen] = useState<string | null>(initialSlot ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ status: "booked" | "requested"; slot: Slot } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    void (async () => {
      setLoad({ status: "loading" });
      const allowed = await bookingAllowed(professionalId);
      if (!live) return;
      if (!allowed.ok) return setLoad({ status: "error", message: allowed.message });
      if (!allowed.data) return setLoad({ status: "blocked" });
      const s = await fetchBookableSessions(professionalId);
      if (!live) return;
      if (!s.ok) return setLoad({ status: "error", message: s.message });
      setLoad({ status: "ready", sessions: s.data });
      setServiceId((cur) => (cur && s.data.some((x) => x.id === cur) ? cur : s.data[0]?.id ?? null));
    })();
    return () => {
      live = false;
    };
  }, [professionalId, reload]);

  const monday = useMemo(() => {
    const m = mondayOf(new Date());
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
  }, [weekOffset]);
  const days = useMemo(() => weekDays(monday), [monday]);
  const slotKey = serviceId ? `${serviceId}:${localDay(monday)}:${reload}` : null;

  const loadSlots = useCallback(async () => {
    if (!serviceId || !slotKey) return;
    const r = await fetchOpenSlots(professionalId, localDay(days[0]), localDay(days[6]), serviceId);
    setSlots(r.ok ? { key: slotKey, slots: r.slots } : { key: slotKey, error: r.message, blocked: r.code === "ATXG5" });
  }, [professionalId, serviceId, slotKey, days]);

  useEffect(() => {
    if (!slotKey) return;
    let live = true;
    void Promise.resolve().then(() => live && void loadSlots());
    return () => {
      live = false;
    };
  }, [slotKey, loadSlots]);

  const current = slots && slotKey && slots.key === slotKey ? slots : null;
  const byDay = useMemo(() => (current && "slots" in current ? slotsByDay(current.slots) : new Map<string, Slot[]>()), [current]);
  // The first day with times, when none is chosen (or the chosen one is outside this week).
  const shownDay = day && days.some((d) => localDay(d) === day) ? day : (days.map(localDay).find((k) => (byDay.get(k)?.length ?? 0) > 0) ?? null);
  const daySlots = shownDay ? byDay.get(shownDay) ?? [] : [];
  const chosenSlot = current && "slots" in current ? current.slots.find((s) => s.startsAt === chosen) ?? null : null;
  const session = load.status === "ready" ? load.sessions.find((s) => s.id === serviceId) ?? null : null;

  const book = async () => {
    if (!chosenSlot || !serviceId || busy) return;
    setBusy(true);
    setError(null);
    const r = await requestBooking(serviceId, chosenSlot.startsAt);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      if (r.code === "ATXG6") {
        setChosen(null);
        void loadSlots();
      }
      if (r.code === "ATXG5") setLoad({ status: "blocked" });
      return;
    }
    setDone({ status: r.status, slot: chosenSlot });
    onBooked?.();
  };

  if (load.status === "loading") {
    return (
      <div aria-busy="true" role="status" aria-label={t("Loading")} className="flex flex-col gap-3">
        <div aria-hidden className="h-[64px] rounded-[14px] bg-cream-soft animate-skeleton-pulse" />
        <div aria-hidden className="h-[56px] rounded-[14px] bg-cream-soft animate-skeleton-pulse" />
        <div aria-hidden className="h-[120px] rounded-[14px] bg-cream-soft animate-skeleton-pulse" />
      </div>
    );
  }
  if (load.status === "error") {
    return (
      <div role="alert" className="flex flex-col items-center text-center py-6">
        <p className="text-[13px] font-semibold text-status-high">{t(load.message)}</p>
        <button type="button" onClick={() => setReload((n) => n + 1)} className="tap mt-2 min-h-11 px-4 text-[13px] font-bold text-primary-accent">
          {t("Retry")}
        </button>
      </div>
    );
  }
  if (load.status === "blocked") {
    return <StateBlock icon={<CalendarX size={26} strokeWidth={1.5} />} title={t("No bookings")} line={t(NOT_TAKING_BOOKINGS)} />;
  }
  if (load.sessions.length === 0) {
    return <StateBlock icon={<CalendarX size={26} strokeWidth={1.5} />} title={t("Nothing to book yet")} line={t("{name} hasn't added a session type to book.", { name: firstName || t("This professional") })} />;
  }

  if (done) {
    const when = `${dayLabel(localDay(new Date(done.slot.startsAt)))}, ${slotLabel(done.slot)}`;
    return (
      <StateBlock
        icon={<CalendarCheck size={26} strokeWidth={1.5} />}
        title={done.status === "booked" ? t("You're booked") : t("Request sent")}
        line={
          done.status === "booked"
            ? t("{session} with {name}, {when}. It's in your calendar.", { session: session?.name ?? t("Your session"), name: firstName || t("your professional"), when })
            : t("{name} will confirm {session} on {when}.", { name: firstName || t("The professional"), session: session?.name ?? t("your session"), when })
        }
      />
    );
  }

  const label = (text: string, extra?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-2" style={{ paddingBottom: 7.5, marginBottom: 10, borderBottom: `1.5px solid ${INK.pr}` }}>
      <h2 className="min-w-0" style={{ fontSize: textPx(11), fontWeight: 600, lineHeight: "14px", textTransform: "uppercase", letterSpacing: "0.14em", color: INK.chF }}>{text}</h2>
      {extra}
    </div>
  );

  const weekTitle = t("{from} to {to}", { from: monthDay(days[0]), to: monthDay(days[6]) });

  return (
    <div className="flex flex-col">
      {label(t("Session"))}
      <div className="flex flex-col gap-2 mb-6" role="radiogroup" aria-label={t("Session type")}>
        {load.sessions.map((s) => {
          const on = s.id === serviceId;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setServiceId(s.id);
                setChosen(null);
                setError(null);
              }}
              className="tap w-full min-h-[60px] rounded-[14px] px-3 py-2.5 flex items-center gap-3 text-start bg-cream-card"
              style={on ? { border: `1px solid ${INK.pr}`, boxShadow: `0 0 0 3px ${INK.prPale}` } : { border: `1px solid ${INK.b10}` }}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-charcoal break-words" style={{ fontSize: textPx(14) }}>
                  {s.name}
                </span>
                <span className="block text-charcoal-faint" style={{ fontSize: textPx(12) }}>
                  {sessionLine(s.durationMin, s.locationKind)}
                </span>
              </span>
              <span className="shrink-0 font-bold text-charcoal tabular-nums" style={{ fontSize: textPx(14) }}>
                {priceLabel(s.price, s.currency)}
              </span>
              <span
                aria-hidden
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${on ? "bg-primary-fill text-on-primary-fill" : "border border-charcoal/[0.18]"}`}
              >
                {on && <Check size={12} strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>

      {label(
        t("Choose a time"),
        // W9: the week stays on one line (360 with Larger text). The arrows keep
        // 44px targets, overlapping the gap and the edge by 12 so the label fits.
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={t("Previous week")}
            disabled={weekOffset === 0}
            onClick={() => {
              setWeekOffset((w) => Math.max(0, w - 1));
              setDay(null);
            }}
            className="tap w-11 h-11 -my-3 -mx-3 flex items-center justify-center rounded-full disabled:opacity-30"
            style={{ color: INK.prDeep }}
          >
            <ChevronLeft size={16} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />
          </button>
          <span className="tabular-nums whitespace-nowrap" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
            {weekTitle}
          </span>
          <button
            type="button"
            aria-label={t("Next week")}
            disabled={weekOffset >= MAX_WEEKS_AHEAD}
            onClick={() => {
              setWeekOffset((w) => Math.min(MAX_WEEKS_AHEAD, w + 1));
              setDay(null);
            }}
            className="tap w-11 h-11 -my-3 -mx-3 flex items-center justify-center rounded-full disabled:opacity-30"
            style={{ color: INK.prDeep }}
          >
            <ChevronRight size={16} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" />
          </button>
        </span>
      )}

      {current && "error" in current ? (
        current.blocked ? (
          <StateBlock icon={<CalendarX size={26} strokeWidth={1.5} />} title={t("No bookings")} line={t(NOT_TAKING_BOOKINGS)} />
        ) : (
          <div role="alert" className="flex flex-col items-center text-center py-4">
            <p className="text-[13px] font-semibold text-status-high">{t(current.error)}</p>
            <button type="button" onClick={() => void loadSlots()} className="tap mt-1 min-h-11 px-4 text-[13px] font-bold text-primary-accent">
              {t("Retry")}
            </button>
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 mb-4" role="group" aria-label={t("Days this week")}>
            {days.map((d, i) => {
              const key = localDay(d);
              const list = byDay.get(key) ?? [];
              const n = current ? sessionsThatFit(list) : null;
              const on = key === shownDay;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!current || list.length === 0}
                  aria-pressed={on}
                  aria-label={`${dayLabel(key)}, ${n === null ? t("loading") : n === 0 ? t("no times") : tn(n, "{n} open", "{n} open")}`}
                  onClick={() => setDay(key)}
                  className="tap min-h-[52px] rounded-[10px] py-2 flex flex-col items-center justify-center"
                  style={{
                    background: n ? INK.prPale : INK.soft,
                    boxShadow: on ? `inset 0 0 0 1.5px ${INK.pr}` : undefined,
                  }}
                >
                  <span style={{ fontSize: textPx(10), fontWeight: 700, color: INK.chF }}>{dayLetter(d, i)}</span>
                  <span className="tabular-nums" style={{ fontSize: textPx(13), fontWeight: 800, color: n ? INK.prDeep : INK.chT }}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          {!current ? (
            <div aria-hidden className="h-[96px] rounded-[14px] bg-cream-soft animate-skeleton-pulse" />
          ) : daySlots.length === 0 ? (
            <p className="py-3 text-charcoal-faint" style={{ fontSize: textPx(12.5) }}>
              {byDay.size === 0 ? t("No open times this week. Try the next week.") : t("No open times on this day.")}
            </p>
          ) : (
            <>
              <p className="mb-2 font-semibold text-charcoal" style={{ fontSize: textPx(13) }}>
                {dayLabel(shownDay!)}
              </p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("Open times")}>
                {daySlots.map((s) => {
                  const on = s.startsAt === chosen;
                  return (
                    <button
                      key={s.startsAt}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        setChosen(s.startsAt);
                        setError(null);
                      }}
                      className={`tap h-11 px-3.5 rounded-xl font-bold tabular-nums ${on ? "bg-primary-fill text-on-primary-fill" : "bg-primary-pale text-primary-deep-text"}`}
                      style={{ fontSize: textPx(13) }}
                    >
                      {clock12(s.startsAt)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 font-semibold text-status-high" style={{ fontSize: textPx(12.5) }}>
          {t(error)}
        </p>
      )}

      <div className="mt-6">
        {signedIn ? (
          <CtaButton
            full
            label={chosenSlot ? t("Book {time}", { time: slotLabel(chosenSlot) }) : t("Choose a time")}
            onClick={() => void book()}
            disabled={!chosenSlot}
            busy={busy}
          />
        ) : (
          <SignInButtons
            returnPath={returnPathFor && serviceId ? returnPathFor(serviceId, chosenSlot) : "/"}
            line={chosenSlot ? t("Sign in or create an account to book {when}.", { when: `${dayLabel(localDay(new Date(chosenSlot.startsAt)))}, ${slotLabel(chosenSlot)}` }) : t("Sign in or create an account to book.")}
          />
        )}
      </div>
    </div>
  );
}

/** Foundations › Empty state: 56 tile, 26 icon, 15 / 700, one line 12.5 / 500 faint, max 260. */
function StateBlock({ icon, title, line }: { icon: React.ReactNode; title: string; line: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 px-4 py-8" role="status">
      <span className="w-14 h-14 rounded-2xl bg-th-f0edf9 dark:bg-primary/15 flex items-center justify-center text-th-7d67d9 dark:text-primary-accent" aria-hidden>
        {icon}
      </span>
      <p className="text-[15px] font-bold text-charcoal">{title}</p>
      <p className="text-[12.5px] font-medium text-charcoal-faint leading-[1.55] max-w-[260px]">{line}</p>
    </div>
  );
}

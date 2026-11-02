import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { PurchaseSheet, SheetBox, confirmLabel } from "../../marketplace/PurchaseSheet";
import { priceLabel, sessionLine } from "../../../components/pro/profile/profileModel";
import {
  NOT_TAKING_BOOKINGS,
  fetchOpenSlots,
  localDay,
  mondayOf,
  requestBooking,
  slotsByDay,
  weekDays,
  type BookableSession,
  type Slot,
} from "../../../services/public-pro";
import { Chevron } from "./parts";
import { dayChip, sessionWhen, timeChip, weekTitle } from "./profileModel";
import { t } from "../../../i18n/core";

// Market + Share 3.0 · W5 · C-MO.4.9 `proBook` "Book sheet · 3 payment
// methods" (Client Professional Screens lines 216–252): the purchase sheet
// (MasterBottomSheet chrome) titled "Book with {first}"; a column (gap 12) of
// the session ticket (--sgrey, radius 14: "Session" 13 / 500 --slabel 8
// above, the name 15 / 800, "{name} · {role}" 12 / 600 --accent, the time
// line 12 --ink2 margin-top 2; the 72 price stub 1.5px dashed --fill on
// --pale, the price 18 / 800 --pdark, two 14 notches in --sbody at right 65);
// the Time box (chips radius 8, padding 8 12, 13: selected #A092E0 / white
// 700, idle #FAFAFB / 1px #E5E6EB / --ink 500, gap 8, wrapping); the payment
// box (PurchaseSheet's rows: Cash selected, "Pay {first} at the start of the
// session"; App Store / Google Play and Whish Money greyed "Coming soon",
// the pre-decision); the CTA.
//
// The live booking (Release 3 W7 BookingFlow, kept): the session types the
// caller may book, professional_open_slots for one week at a time (Monday
// first, at most four weeks ahead), request_professional_booking (ATXG6 "That
// time is no longer free." reloads the times; ATXG5 not taking bookings).
// BookingFlow itself is unchanged for the public booking page; this sheet is
// the in-app restyle over the same readers and write. Times are 12-hour; the
// day chips ("Mon 19") pick the day, the time chips ("7:00 AM") the start.
// CTA: "Confirm · $35" (W2 lead decision; nothing is charged in the app),
// "Confirm booking" for a free session.

const MAX_WEEKS_AHEAD = 4;

export interface BookedResult {
  status: "booked" | "requested";
  session: BookableSession;
  startsAt: string;
}

type SlotsState = { key: string; slots: Slot[] } | { key: string; error: string; blocked: boolean };

export const BookSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  session: BookableSession | null;
  firstName: string;
  /** "Rana Khoury · Trainer" under the session name. */
  ownerLine: string;
  professionalId: string;
  signedIn: boolean;
  onBooked: (r: BookedResult) => void;
}> = ({ open, onClose, session, firstName, ownerLine, professionalId, signedIn, onBooked }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const hc = typeof document !== "undefined" && document.documentElement.classList.contains("high-contrast");
  const [weekOffset, setWeekOffset] = useState(0);
  const [day, setDay] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotsState | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  // Every open starts on this week with nothing chosen.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const sessionId = session?.id ?? null;
  if (open && openedFor !== sessionId) {
    setOpenedFor(sessionId);
    setWeekOffset(0);
    setDay(null);
    setChosen(null);
    setError(null);
    setBlocked(false);
  }
  if (!open && openedFor !== null) setOpenedFor(null);

  const days = useMemo(() => {
    const mon = mondayOf(new Date());
    mon.setDate(mon.getDate() + weekOffset * 7);
    return weekDays(mon);
  }, [weekOffset]);
  const key = open && sessionId ? `${sessionId}:${localDay(days[0])}:${reload}` : null;

  const loadSlots = useCallback(async () => {
    if (!sessionId || !key) return;
    const r = await fetchOpenSlots(professionalId, localDay(days[0]), localDay(days[6]), sessionId);
    setSlots(r.ok ? { key, slots: r.slots } : { key, error: r.message, blocked: r.code === "ATXG5" });
  }, [professionalId, sessionId, key, days]);

  useEffect(() => {
    if (!key) return;
    let live = true;
    void Promise.resolve().then(() => live && void loadSlots());
    return () => {
      live = false;
    };
  }, [key, loadSlots]);

  const current = slots && key && slots.key === key ? slots : null;
  const byDay = useMemo(() => (current && "slots" in current ? slotsByDay(current.slots) : new Map<string, Slot[]>()), [current]);
  const openDays = days.map(localDay).filter((k) => (byDay.get(k)?.length ?? 0) > 0);
  const shownDay = day && openDays.includes(day) ? day : (openDays[0] ?? null);
  const daySlots = shownDay ? byDay.get(shownDay) ?? [] : [];
  const chosenSlot = current && "slots" in current ? current.slots.find((s) => s.startsAt === chosen) ?? null : null;
  const isBlocked = blocked || (!!current && "error" in current && current.blocked);

  const book = async () => {
    if (!session || !chosenSlot || busy) return;
    setBusy(true);
    setError(null);
    const r = await requestBooking(session.id, chosenSlot.startsAt);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      if (r.code === "ATXG6") {
        setChosen(null);
        setReload((n) => n + 1);
      }
      if (r.code === "ATXG5") setBlocked(true);
      return;
    }
    onBooked({ status: r.status, session, startsAt: r.startsAt });
  };

  const chip = (on: boolean): React.CSSProperties => ({
    font: "inherit",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: textPx(13),
    lineHeight: "normal",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flex: "none",
    ...(on
      ? { background: hc ? m.segactive : dark ? "#A991FE" : "#A092E0", border: `1px solid ${hc ? m.segactive : dark ? "#A991FE" : "#A092E0"}`, color: dark && !hc ? "#0D0B1A" : "#FFFFFF", fontWeight: 700 }
      : { background: dark ? "#242730" : "#FAFAFB", border: `1px solid ${hc ? m.border : dark ? "rgba(245,243,250,0.1)" : "#E5E6EB"}`, color: m.ink, fontWeight: 500 }),
  });

  const price = session ? priceLabel(session.price, session.currency) : "";
  const notch: React.CSSProperties = { position: "absolute", insetInlineEnd: 65, width: 14, height: 14, borderRadius: 999, background: m.sbody };
  const arrow = (dir: "left" | "right", disabled: boolean, onClick: () => void, label: string) => (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="hit market-focus"
      style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: 0, padding: 0, color: m.pdark, opacity: disabled ? 0.3 : 1, cursor: disabled ? "default" : "pointer" }}
    >
      <Chevron size={16} color="currentColor" dir={dir} stroke={2} />
    </button>
  );

  const summary = session ? (
    <div role="group" aria-label={t("Session")} style={{ position: "relative", display: "flex", borderRadius: 14, background: m.sgrey, overflow: "hidden", color: m.ink }}>
      <div style={{ flex: 1, minWidth: 0, padding: "12px 14px" }}>
        <div style={{ fontSize: textPx(13), fontWeight: 500, color: m.slabel, marginBottom: 8 }}>{t("Session")}</div>
        <div style={{ fontSize: textPx(15), fontWeight: 800 }}>{session.name}</div>
        <div style={{ fontSize: textPx(12), fontWeight: 600, color: m.accent }}>{ownerLine}</div>
        <div style={{ fontSize: textPx(12), color: m.ink2, marginTop: 2 }}>
          {chosenSlot ? `${sessionWhen(chosenSlot.startsAt)} · ${sessionLine(session.durationMin, session.locationKind)}` : sessionLine(session.durationMin, session.locationKind)}
        </div>
      </div>
      <div style={{ width: 72, flexShrink: 0, borderInlineStart: `1.5px dashed ${m.fill}`, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: textPx(18), fontWeight: 800, color: m.pdark, whiteSpace: "nowrap" }}>{price}</span>
      </div>
      <span aria-hidden style={{ ...notch, top: -7 }} />
      <span aria-hidden style={{ ...notch, bottom: -7 }} />
    </div>
  ) : null;

  const timeBox = (
    <SheetBox label={t("Time")} id="book-time">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: textPx(12), fontWeight: 700, color: m.pdark, fontVariantNumeric: "tabular-nums" }}>{weekTitle(days)}</span>
        <span style={{ display: "flex", gap: 12 }}>
          {arrow("left", weekOffset === 0, () => { setWeekOffset((w) => Math.max(0, w - 1)); setDay(null); setChosen(null); }, t("Previous week"))}
          {arrow("right", weekOffset >= MAX_WEEKS_AHEAD, () => { setWeekOffset((w) => Math.min(MAX_WEEKS_AHEAD, w + 1)); setDay(null); setChosen(null); }, t("Next week"))}
        </span>
      </div>
      {isBlocked ? (
        <p style={{ margin: 0, fontSize: textPx(12.5), color: m.ink2 }}>{t(NOT_TAKING_BOOKINGS)}</p>
      ) : !current ? (
        <div aria-hidden className="animate-skeleton-pulse" style={{ height: 36, borderRadius: 8, background: m.card }} />
      ) : "error" in current ? (
        <p role="alert" style={{ margin: 0, fontSize: textPx(12.5), fontWeight: 600, color: m.high }}>
          {t(current.error)}{" "}
          <button type="button" onClick={() => setReload((n) => n + 1)} className="hit market-focus" style={{ background: "none", border: 0, padding: 0, font: "inherit", fontWeight: 800, color: m.pdark, cursor: "pointer" }}>
            {t("Retry")}
          </button>
        </p>
      ) : openDays.length === 0 ? (
        <p style={{ margin: 0, fontSize: textPx(12.5), color: m.ink2 }}>{t("No open times this week. Try the next week.")}</p>
      ) : (
        <>
          <div role="radiogroup" aria-label={t("Day")} className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -14px", padding: "4px 14px" }}>
            {openDays.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={k === shownDay} className="hit market-focus" onClick={() => { setDay(k); setChosen(null); }} style={chip(k === shownDay)}>
                {dayChip(k)}
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label={t("Start time")} className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "4px -14px 0", padding: "4px 14px" }}>
            {daySlots.map((s) => (
              <button key={s.startsAt} type="button" role="radio" aria-checked={s.startsAt === chosen} className="hit market-focus" onClick={() => { setChosen(s.startsAt); setError(null); }} style={{ ...chip(s.startsAt === chosen), fontVariantNumeric: "tabular-nums" }}>
                {timeChip(s.startsAt)}
              </button>
            ))}
          </div>
        </>
      )}
    </SheetBox>
  );

  const free = !!session && !(session.price > 0);
  return (
    <PurchaseSheet
      open={open && !!session}
      onClose={onClose}
      title={t("Book with {name}", { name: firstName })}
      summary={
        <>
          {summary}
          {timeBox}
        </>
      }
      cashHint={free ? null : t("Pay {name} at the start of the session", { name: firstName })}
      ctaLabel={free ? t("Confirm booking") : confirmLabel(price)}
      busy={busy}
      disabled={!signedIn || !chosenSlot || isBlocked}
      error={error ? t(error) : error}
      note={!signedIn ? <p style={{ margin: 0, fontSize: textPx(12), color: m.ink2 }}>{t("Sign in to book a session.")}</p> : null}
      onConfirm={() => void book()}
    />
  );
};

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarCheck, CalendarDays, Check, CircleCheck, Clock, Store, Wallet } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { PinnedCta, PinnedSlot } from "../../components/ui/PinnedCta";
import { BrandMark } from "../../components/ui/ThemedMark";
import {
  bookClass,
  cancelClassBooking,
  fetchClassLive,
  fetchMarketplaceClasses,
  fetchMyBookedClassIds,
  joinClassWaitlist,
  leaveClassWaitlist,
  type ClassLive,
  type MarketplaceClass,
} from "../../services/marketplace";
import { cancellationLine, isLateCancellation } from "../../services/venues/venueLogic";
import { DetailHero, DetailLabel, MapCard } from "./venueParts";

// MO1.4.4 Class page, with its states MO1.4.4.1 (booking popup), .2 (booking
// confirmed), .3 (booked) and .4 (full). Handover-complete pass (2026-10-07),
// opened by a class card's Book on Explore (/app/marketplace/class?id=…).
//
// WIRED TO BACKEND STAGE 4c (Database docs/HANDOVER_API.md "4c · Classes,
// bookings, cancelling and the waitlist"): book_class() books (it copies the
// price, records "pay at the studio" as 'cash' and adds the class to the
// member's Calendar with a 15-minute alert, the backend's choice);
// cancel_class_booking() cancels (a late one is accepted and reported back as
// not free; BR-14's window comes from class_cancellation_hours(), warned
// before the call); "Full" is class_seats_left() (it counts live waitlist
// offers); join / leave / my position are the waitlist functions (BR-10).
// marketplace_classes still supplies the class itself.
//
// NOT DRAWN, because nothing stores it: the class photo, the distance, the
// level, the instructor row, "What to bring", and the check-in QR ("Show
// check-in code"; no booking token exists). Whish is stage 5: drawn,
// disabled. A waitlist offer (the 30-minute hold) isn't readable by the
// client, so the waitlist block can't say one is waiting; confirming one is
// book_class(), which the push's holder reaches from Book on this page.

/** "Sat 11 Oct" (Foundations copy rule 4). */
function dayMonth(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const wd = d.toLocaleDateString("en-GB", { weekday: "short" });
  const mon = d.toLocaleDateString("en-GB", { month: "short" });
  return `${wd} ${d.getDate()} ${mon}`;
}

const PAY_OPTIONS = [
  { key: "whish", icon: Wallet, name: "Whish Money", hint: "Pay now in the app" },
  { key: "studio", icon: Store, name: "Pay at the studio", hint: "Cash or card on arrival" },
] as const;
type Pay = (typeof PAY_OPTIONS)[number]["key"];

export function ClassPage({ classId }: { classId: string }) {
  const { authUserId, profileReady } = useApp();
  const navigate = useNavigate();
  const back = useBack("/app/marketplace");
  const [all, setAll] = useState<MarketplaceClass[] | null>(null);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();
  // MO1.4.2.1.1 books from the gym page and lands here confirmed (?booked=1).
  const [popup, setPopup] = useState<"book" | "confirmed" | "cancel" | null>(params.get("booked") === "1" ? "confirmed" : null);
  const [live, setLive] = useState<ClassLive | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // MO1.4.4.1: Whish is not available until payments exist, so the studio
  // is the one choice that can be made today. The value stays in the form.
  const [pay, setPay] = useState<Pay>("studio");

  const load = useCallback(async () => {
    const [cls, mine, detail] = await Promise.all([fetchMarketplaceClasses(), fetchMyBookedClassIds(), fetchClassLive(classId)]);
    setLive(detail);
    if (!cls.ok) {
      setError(cls.message);
      setAll((prev) => prev ?? []);
      return;
    }
    setError(null);
    setAll(cls.classes);
    setBooked(mine);
  }, [classId]);

  useEffect(() => {
    // Drop ?booked=1 once read, so a reload doesn't reopen the popup.
    if (params.get("booked") === "1") setParams({ id: classId }, { replace: true });
  }, [params, setParams, classId]);

  useEffect(() => {
    if (!profileReady) return;
    void (async () => {
      await load();
    })();
  }, [profileReady, authUserId, load]);

  const c = all?.find((x) => x.classId === classId) ?? null;
  // MO1.4.4.4 "Other times": the same class at the same place on other days,
  // straight from the list (no new read).
  const openOther = (id: string) => navigate(`/app/marketplace/class?id=${encodeURIComponent(id)}`, { replace: true });
  const others = useMemo(
    () => (c && all ? all.filter((x) => x.classId !== c.classId && x.title === c.title && x.businessId === c.businessId).slice(0, 3) : []),
    [all, c]
  );

  const book = async () => {
    if (!c || !authUserId || busy) return;
    setBusy(true);
    const r = await bookClass(c.classId);
    setBusy(false);
    if (!r.ok) {
      setPopup(null);
      setError(r.message);
      await load();
      return;
    }
    setError(null);
    setNote(null);
    await load();
    setPopup("confirmed");
  };

  const cancel = async () => {
    if (!c || !authUserId || busy) return;
    setBusy(true);
    const r = await cancelClassBooking(c.classId);
    setBusy(false);
    setPopup(null);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setError(null);
    // The doc: warn before the call, then show was_free.
    setNote(
      r.value.wasFree
        ? "Booking cancelled. It was free to cancel."
        : "Booking cancelled. It was inside the free-cancellation window, so the studio may charge for it."
    );
    await load();
  };

  const waitlist = async (join: boolean) => {
    if (!c || busy) return;
    setBusy(true);
    const r = join ? await joinClassWaitlist(c.classId) : await leaveClassWaitlist(c.classId);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setError(null);
    setNote(null);
    await load();
  };

  if (all === null) {
    return (
      <div aria-busy="true">
        <DetailHero height={200} onBack={back} />
        <div className="flex flex-col gap-3 pt-4">
          <div className="h-[33px] w-2/3 rounded-xl bg-cream-soft animate-pulse" />
          <div className="h-[74px] rounded-2xl bg-cream-soft animate-pulse" />
          <div className="h-[120px] rounded-2xl bg-cream-soft animate-pulse" />
        </div>
      </div>
    );
  }

  if (!c) {
    return (
      <div>
        <DetailHero height={200} onBack={back} />
        <p role={error ? "alert" : undefined} className={`mt-6 text-center text-[13px] ${error ? "font-semibold text-status-high" : "text-charcoal-faint"}`}>
          {error ?? "This class isn't available any more."}
        </p>
      </div>
    );
  }

  const mine = booked.has(c.classId);
  const free = !c.priceValue;
  const priceText = free ? "Free" : c.price;
  // MO1.4.4.4 "Full" is class_seats_left() (it counts live waitlist offers);
  // the view's own count is the fallback when that read failed.
  const seatsLeft = live?.seatsLeft ?? c.spotsRemaining;
  const isFull = seatsLeft <= 0;
  const full = isFull && !mine;
  const position = mine ? null : (live?.waitlistPosition ?? null);
  const windowHours = live?.windowHours ?? 12;
  const late = live?.startsAt ? isLateCancellation(live.startsAt, windowHours) : false;
  const taken = c.maxCapacity - seatsLeft;
  const when = `${dayMonth(c.date)} · ${c.startTime} to ${c.endTime}`;

  return (
    <div>
      <DetailHero height={200} onBack={back} />

      {/* MO1.4.4 #2–3: 16 under the hero, the name 22/800; the venue in
          primary.accent 600, then the place in text.muted (13). The venue
          opens its page. Distance waits on venue coordinates. */}
      <h1 className="mt-4 mb-0 text-[22px] font-extrabold leading-[1.5] tracking-[-0.02em] text-charcoal">{c.title}</h1>
      <p className="mt-0.5 text-[13px] text-charcoal-faint">
        <Link
          to={live?.gymId ? `/app/marketplace/gym?id=${encodeURIComponent(live.gymId)}` : `/app/marketplace/business?id=${encodeURIComponent(c.businessId)}`}
          className="font-semibold no-underline text-th-7d67d9 dark:text-primary-dark"
        >
          {c.businessName}
        </Link>
        {c.location ? ` · ${c.location}` : ""}
      </p>

      {/* MO1.4.4 #4: tiles 74 tall, gap 8, surface.soft r16: a 16/1.75
          primary.accent icon, the value 12/700, the label 10.5/400. Level is
          not stored yet, so the two tiles there are. */}
      <div className="mt-[14px] grid grid-cols-2 gap-2">
        {[
          { icon: CalendarDays, value: dayMonth(c.date), label: "Date" },
          { icon: Clock, value: `${c.startTime} to ${c.endTime}`, label: "Time" },
        ].map((t) => (
          <div key={t.label} className="h-[74px] rounded-2xl bg-cream-soft flex flex-col items-center justify-center gap-1">
            <t.icon size={16} strokeWidth={1.75} className="text-th-7d67d9 dark:text-primary-dark" aria-hidden />
            <span className="text-[12px] font-bold text-charcoal tabular-nums">{t.value}</span>
            <span className="text-[10.5px] text-charcoal-faint">{t.label}</span>
          </div>
        ))}
      </div>

      {/* MO1.4.4 #6: "4 of 12 spots left" 13/700 over a 4 pt spots bar
          (Foundations: secondary.mid on its tint; full: muted grey with a
          "Class full" tag, MO1.4.4.4). */}
      <div className="mt-[14px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-bold text-charcoal tabular-nums">
            {isFull ? `${c.maxCapacity - seatsLeft} of ${c.maxCapacity} booked` : `${seatsLeft} of ${c.maxCapacity} spots left`}
          </span>
          {isFull && (
            <span className="h-5 px-2 rounded-full bg-cream-soft text-[11px] font-bold text-charcoal-soft inline-flex items-center">Class full</span>
          )}
        </div>
        <div className="mt-1.5 h-1 rounded-full bg-th-e7f2f0 dark:bg-teal-pale overflow-hidden" aria-hidden>
          <div
            className={`h-full rounded-full ${isFull ? "bg-charcoal-faint" : "bg-th-6f9993 dark:bg-teal"}`}
            style={{ width: `${c.maxCapacity > 0 ? Math.min(100, (taken / c.maxCapacity) * 100) : 0}%` }}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[12px] font-semibold text-status-high">
          {error}
        </p>
      )}
      {note && (
        <p role="status" className="mt-3 text-[12px] font-semibold text-charcoal-soft">
          {note}
        </p>
      )}

      {c.notes && (
        <>
          <DetailLabel className="mt-[22px]">About this class</DetailLabel>
          <p className="mt-2 mb-0 text-[14px] leading-[1.6] text-charcoal-soft whitespace-pre-wrap [overflow-wrap:anywhere]">{c.notes}</p>
        </>
      )}

      {/* MO1.4.4 #11: BR-14's window, 12/400 text.muted, from
          class_cancellation_hours() (class override, venue default, 12). */}
      <p className="mt-3.5 mb-0 text-[12px] text-charcoal-faint">{cancellationLine(windowHours)}</p>

      <DetailLabel className="mt-[22px]">Location</DetailLabel>
      <div className="mt-2">
        <MapCard address={c.location} />
      </div>

      {/* Room for whatever is pinned over the bottom: the page's own 112
          plus the CTA (60), the booked block (140) or the full row (150). */}
      <div aria-hidden style={{ height: mine ? 160 : position !== null ? 190 : full ? 150 : 60 }} />

      {mine ? (
        // MO1.4.4.3: the teal Booked block in the CTA's place (secondary.tint,
        // a 1 px #C1D5D2 edge, r16, padding 14): a 36 white disc with Check
        // 17/2.4, "You're booked" 14/800 secondary.deeper, the time 12/400;
        // under it "Cancel booking" 12.5/700 in danger and BR-14's line.
        // "Show check-in code" needs a check-in token no stage provides yet.
        <PinnedSlot>
          <div className="rounded-2xl border bg-th-e7f2f0 border-th-c1d5d2 dark:bg-teal-pale dark:border-teal-dark/50 p-3.5 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-cream-card flex items-center justify-center shrink-0 text-th-3c6b65 dark:text-teal-deep-text" aria-hidden>
              <Check size={17} strokeWidth={2.4} />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-extrabold text-th-3c6b65 dark:text-teal-deep-text">You're booked</span>
              <span className="block text-[12px] text-charcoal-soft tabular-nums">{when}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPopup("cancel")}
            disabled={busy}
            className="tap self-center h-11 px-3 -my-1.5 text-[12.5px] font-bold text-status-high disabled:opacity-40"
          >
            Cancel booking
          </button>
          <p className="m-0 -mt-1.5 text-center text-[11.5px] text-charcoal-faint">{cancellationLine(windowHours)}</p>
        </PinnedSlot>
      ) : position !== null ? (
        // MO1.4.4.5: Other times stay; a lavender block with a 40 white disc
        // "#3" 14/800 primary.accent, "You're #3 on the waitlist." 14/800
        // primary.accent then 13/400; "Leave waitlist" 12.5/700 in danger.
        <PinnedSlot>
          {others.length > 0 && <OtherTimes others={others} onOpen={openOther} />}
          <div className="rounded-2xl border border-th-a79ad5/60 bg-primary-pale dark:border-primary-dark/40 p-3.5 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-cream-card flex items-center justify-center shrink-0 text-[14px] font-extrabold text-th-7d67d9 dark:text-primary-dark tabular-nums">
              #{position}
            </span>
            <p className="m-0 min-w-0 text-[13px] leading-[1.45] text-charcoal-soft">
              <span className="text-[14px] font-extrabold text-th-7d67d9 dark:text-primary-dark">You're #{position} on the waitlist.</span> We'll notify you
              if a spot opens.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void waitlist(false)}
            disabled={busy}
            className="tap self-center h-11 px-3 -my-1.5 text-[12.5px] font-bold text-status-high disabled:opacity-40"
          >
            Leave waitlist
          </button>
        </PinnedSlot>
      ) : full ? (
        // MO1.4.4.4: "Other times" (label, then up to three chips: the time
        // 12/700, the spots 10.5/600 secondary.deep) and an outline "Join
        // waitlist" (14/700 primary.accent), join_class_waitlist() (BR-10).
        <PinnedSlot>
          <div className="rounded-2xl bg-cream-card p-3 flex flex-col gap-2.5" style={{ boxShadow: "var(--shadow-sheet)" }}>
            {others.length > 0 && <OtherTimes others={others} onOpen={openOther} />}
            <button
              type="button"
              onClick={() => void waitlist(true)}
              disabled={busy || !authUserId}
              className="tap h-12 rounded-[14px] border border-primary text-[14px] font-bold text-th-7d67d9 dark:text-primary-dark disabled:opacity-40"
            >
              Join waitlist
            </button>
          </div>
        </PinnedSlot>
      ) : (
        // MO1.4.4 #15: "Book · $15", 48 r14, #9A8CD6 in light (th-9a8cd6,
        // follows the theme); dark keeps primary-fill.
        <PinnedCta
          primary={{
            label: `Book · ${priceText}`,
            onClick: () => setPopup("book"),
            disabled: !authUserId,
            className: "!bg-th-9a8cd6 !text-white dark:!bg-primary-fill dark:!text-on-primary-fill",
          }}
        />
      )}

      {/* MO1.4.4.1: the booking popup (no ×; outside dismisses). */}
      <CentredPopup
        open={popup === "book"}
        onClose={() => setPopup(null)}
        title={`Book ${c.title}`}
        icon={<CalendarCheck size={22} strokeWidth={1.75} />}
        body={free ? undefined : "Choose how you'll pay"}
        cta={{
          label: free ? "Confirm booking" : `Confirm booking · ${priceText}`,
          loading: busy,
          onClick: () => void book(),
          className: "!bg-th-9a8cd6 !text-white dark:!bg-primary-fill dark:!text-on-primary-fill",
        }}
      >
        {/* The class in a surface.soft r16 block: the time 13.5/700, the
            place and spots 11.5/400, the price 15/800. */}
        <div className="rounded-2xl bg-cream-soft px-4 py-3.5 flex items-center gap-3 text-start">
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-bold text-charcoal tabular-nums">{when}</span>
            <span className="block text-[11.5px] text-charcoal-faint">
              {c.businessName} · {c.spotsRemaining} {c.spotsRemaining === 1 ? "spot" : "spots"} left
            </span>
          </span>
          <span className="text-[15px] font-extrabold text-charcoal tabular-nums shrink-0">{priceText}</span>
        </div>
        {!free && (
          <div className="mt-4 text-start" role="radiogroup" aria-label="Payment">
            <DetailLabel>Payment</DetailLabel>
            <div className="mt-2.5 flex flex-col gap-2">
              {PAY_OPTIONS.map((o) => {
                const on = pay === o.key;
                // Whish needs the payments stage: drawn, not choosable.
                const off = o.key === "whish";
                return (
                  <button
                    key={o.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={off}
                    onClick={() => setPay(o.key)}
                    className={`tap w-full rounded-[14px] px-3 py-2.5 flex items-center gap-3 text-start bg-cream-card disabled:opacity-40 ${
                      on ? "border-[1.5px] border-th-7d6bb5 dark:border-primary-dark ring-[3px] ring-primary-pale" : "border border-charcoal/[0.10]"
                    }`}
                  >
                    <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0 text-th-7d67d9 dark:text-primary-dark" aria-hidden>
                      <o.icon size={16} strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-bold text-charcoal">{o.name}</span>
                      <span className="block text-[11.5px] text-charcoal-faint">{o.hint}</span>
                    </span>
                    <span
                      aria-hidden
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        on ? "bg-th-9a8cd6 text-white dark:bg-primary-fill dark:text-on-primary-fill" : "border-[1.5px] border-charcoal/[0.18]"
                      }`}
                    >
                      {on && <Check size={12} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CentredPopup>

      {/* MO1.4.4.2: confirmed. The mark is the v7 animation's end frame; the
          check-in QR and its line wait on check-in passes; the payment line
          says what was chosen; book_class() has already added the class to
          the Calendar (a calendar_events row with a 15-minute alert). */}
      <CentredPopup
        open={popup === "confirmed"}
        onClose={() => setPopup(null)}
        title="You're booked"
        titleSize={21}
        titleInk="text-th-5f5093 dark:text-primary-dark"
        iconBare
        icon={<BrandMark width={56} height={60} />}
        body={
          <>
            <span className="block text-[14px] font-bold text-charcoal">{c.title}</span>
            <span className="block text-[12.5px] font-normal text-charcoal-soft tabular-nums">
              {when} · {c.businessName}
            </span>
          </>
        }
      >
        <p className="m-0 flex items-center justify-center gap-1.5 text-[12.5px] text-charcoal-soft">
          {free ? <CalendarCheck size={13} strokeWidth={1.75} aria-hidden /> : <Store size={13} strokeWidth={1.75} aria-hidden />}
          {free ? "Free class" : `Pay at the studio · ${priceText}`}
        </p>
        <p className="mt-3.5 mb-0 h-12 rounded-[14px] bg-th-e7f2f0 dark:bg-teal-pale flex items-center justify-center gap-2 text-[14px] font-bold text-th-3c6b65 dark:text-teal-deep-text">
          <CircleCheck size={16} strokeWidth={2} aria-hidden /> Added to calendar
        </p>
        <button type="button" onClick={() => setPopup(null)} className="tap mt-1 w-full h-11 text-[14px] font-bold text-th-7d67d9 dark:text-primary-dark">
          Done
        </button>
      </CentredPopup>

      {/* MO1.4.4.3 interaction 3: "Cancel confirmation, then MO1.4.4". */}
      <CentredPopup
        open={popup === "cancel"}
        onClose={() => setPopup(null)}
        title="Cancel booking?"
        icon={<CalendarDays size={22} strokeWidth={1.75} />}
        body={
          <>
            <span className="block">{`${c.title} · ${when}`}</span>
            {/* BR-14, warned before cancel_class_booking() (the doc). */}
            <span className={`mt-1.5 block ${late ? "font-semibold text-status-high" : ""}`}>
              {late
                ? `It starts in under ${windowHours} ${windowHours === 1 ? "hour" : "hours"}, so this isn't a free cancellation. The studio may charge for it.`
                : cancellationLine(windowHours)}
            </span>
          </>
        }
        cta={{ label: "Cancel booking", loading: busy, onClick: () => void cancel() }}
      />
    </div>
  );
}

/** MO1.4.4.4 / .5 "Other times": the label and up to three chips (the time 12/700, the spots 10.5/600 secondary.deep). */
function OtherTimes({ others, onOpen }: { others: MarketplaceClass[]; onOpen: (id: string) => void }) {
  return (
    <>
      <DetailLabel>Other times</DetailLabel>
      <div className="flex gap-2">
        {others.map((o) => (
          <button
            key={o.classId}
            type="button"
            onClick={() => onOpen(o.classId)}
            className="tap flex-1 min-w-0 rounded-xl border border-charcoal/[0.08] bg-cream-card py-2 flex flex-col items-center"
          >
            <span className="text-[12px] font-bold text-charcoal tabular-nums">
              {dayMonth(o.date).split(" ")[0]} {o.startTime}
            </span>
            <span className="text-[10.5px] font-semibold text-th-4f7f78 dark:text-teal-deep-text">
              {o.isFull ? "Full" : `${o.spotsRemaining} ${o.spotsRemaining === 1 ? "spot" : "spots"}`}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

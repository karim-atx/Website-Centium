import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarCheck, CalendarDays, Check, ChevronDown, CircleCheck, Clock, Store, Wallet } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";
import { useOnline } from "../../hooks/useOnline";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { PinnedCta, PinnedSlot } from "../../components/ui/PinnedCta";
import { CentiumMark } from "../../components/icons/CentiumMark";
import { RetryLine } from "../../components/marketplace/ClassCard";
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
import { CLASS_HERO, CompactHeader, DetailHero, DetailLabel, DirectionsMenu, MapCard, useCompactHeader } from "./venueParts";
import { range12, time12 } from "../../utils/time12";
import { formatShortDate } from "../../utils/date";

// MO1.4.4 Class page (v6 Part B), with its states MO1.4.4.1 (booking popup),
// .2 (booking confirmed), .3 (booked), .4 (full) and .5 (waitlist), opened by
// a class card on Explore or the gym page's Classes tab
// (/app/marketplace/class?id=…).
//
// v6 HERO PAGE: the hero scrolls away; once the name has passed under the top
// edge the compact header (back + class name) fades in and stays, with its
// hairline (no tabs on this page). The Date tile opens the class's other
// sessions (OURS-class-other-times); the Location card opens Directions (S3).
//
// WIRED TO BACKEND STAGE 4c (Database docs/HANDOVER_API.md "4c · Classes,
// bookings, cancelling and the waitlist"): book_class() books (it copies the
// price, records "pay at the studio" as 'cash' and adds the class to the
// member's Calendar with a 15-minute alert, the backend's choice, V6-73);
// cancel_class_booking() cancels (a late one is accepted and reported back as
// not free; BR-14's window comes from class_cancellation_hours(), warned
// before the call); "Full" is class_seats_left() (it counts live waitlist
// offers); join / leave / my position are the waitlist functions (BR-10).
// marketplace_classes still supplies the class itself.
//
// BACKEND, NOT BUILT (pending states; nothing here is faked):
// - PB-O-54 (B9) class photo: the hero draws its placeholder picture.
// - PB-O-50 (B9) distance and the venue's street address: the place alone,
//   and Directions goes to that place text (no coordinates).
// - PB-O-53 (B9) level and "What to bring": the Level tile and the section
//   are hidden (two 175 tiles, OURS O-NOLEVEL).
// - PB-O-52 (B9) instructor row: hidden (spots line 14 under the tiles).
// - PB-O-55 (B4, B9) class notifications: no UI here.
// - The check-in QR ("Show check-in code"): no booking token exists.
// Whish is shown as coming (X-29). A waitlist offer (the 30-minute hold)
// isn't readable by the client, so the waitlist block can't say one is
// waiting; confirming one is book_class(), reached from Book on this page.

/** "Sat 11 Oct" (Foundations copy rule 4). */
function dayMonth(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const wd = d.toLocaleDateString("en-GB", { weekday: "short" });
  const mon = formatShortDate(d, { month: "short" });
  return `${wd} ${d.getDate()} ${mon}`;
}

const spotsText = (n: number) => (n <= 0 ? "Full" : `${n} ${n === 1 ? "spot" : "spots"}`);

const PAY_OPTIONS = [
  { key: "whish", icon: Wallet, name: "Whish Money", hint: "Coming soon" },
  { key: "studio", icon: Store, name: "Pay at the studio", hint: "Cash or card on arrival" },
] as const;
type Pay = (typeof PAY_OPTIONS)[number]["key"];

export function ClassPage({ classId }: { classId: string }) {
  const { authUserId, profileReady } = useApp();
  const navigate = useNavigate();
  const back = useBack("/app/marketplace");
  const online = useOnline();
  const [all, setAll] = useState<MarketplaceClass[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();
  // MO1.4.2.1.1 books from the gym page and lands here confirmed (?booked=1).
  const [popup, setPopup] = useState<"book" | "confirmed" | "cancel" | "times" | null>(params.get("booked") === "1" ? "confirmed" : null);
  const [live, setLive] = useState<ClassLive | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [dirAnchor, setDirAnchor] = useState<HTMLButtonElement | null>(null);
  const [dirOpen, setDirOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  // MO1.4.4.1: Whish is not available until payments exist, so the studio
  // is the one choice that can be made today. The value stays in the form.
  const [pay, setPay] = useState<Pay>("studio");
  const { setNameEl, setHeaderEl, shown: compactShown } = useCompactHeader();

  const load = useCallback(async () => {
    const [cls, mine, detail] = await Promise.all([fetchMarketplaceClasses(), fetchMyBookedClassIds(), fetchClassLive(classId)]);
    setLive(detail);
    if (!cls.ok) {
      setLoadFailed(true);
      setAll((prev) => prev ?? []);
      return;
    }
    setLoadFailed(false);
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
  // MO1.4.4.4 "Other times" and OURS-class-other-times: the same class at the
  // same place, straight from the list (no new read), soonest first.
  const openOther = (id: string) => navigate(`/app/marketplace/class?id=${encodeURIComponent(id)}`, { replace: true });
  const sessions = useMemo(
    () =>
      c && all
        ? all
            .filter((x) => x.title === c.title && x.businessId === c.businessId)
            .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
        : [],
    [all, c]
  );
  const others = useMemo(() => sessions.filter((x) => x.classId !== classId).slice(0, 3), [sessions, classId]);

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

  const retry = () => {
    setAll(null);
    void load();
  };

  // K11 / O-LOAD: the hero's placeholder and text skeletons (pulse 1.2 s).
  if (all === null) {
    return (
      <div aria-busy="true">
        <DetailHero height={200} onBack={back} colors={CLASS_HERO} />
        <div className="flex flex-col gap-3 pt-4">
          <div className="h-[33px] w-2/3 rounded-xl bg-cream-soft animate-skeleton-pulse" />
          <div className="h-[74px] rounded-[14px] bg-cream-soft animate-skeleton-pulse" />
          <div className="h-[120px] rounded-2xl bg-cream-soft animate-skeleton-pulse" />
        </div>
      </div>
    );
  }

  if (!c) {
    return (
      <div>
        <DetailHero height={200} onBack={back} colors={CLASS_HERO} />
        {loadFailed ? (
          // K10 / O-ERR.
          <RetryLine className="mt-6 justify-center" message={online ? "Couldn't load this class." : "You're offline. Try again when you're connected."} onRetry={retry} />
        ) : (
          // K9.
          <p className="mt-6 text-center text-[13px] text-charcoal-faint">This class isn't available any more.</p>
        )}
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
  const when = `${dayMonth(c.date)} · ${range12(c.startTime, c.endTime)}`;
  const manyTimes = sessions.length > 1;
  const flash = (text: string) => {
    setCopied(text);
    setTimeout(() => setCopied(null), 1600);
  };

  // #12-15: info tiles, gap 8, r14, #F7F7FA (dark #242730, O3), pad 10 8; a
  // 16 icon #7D67D9 / #9A8CD6 4 above the value 12/18 700, the label
  // 10.5/15.8 400 directly under. Level (PB-O-53, B9) is not stored: two
  // tiles, 175 each (O-NOLEVEL). The Date tile is a button with a
  // ChevronDown 12 when the class has other sessions (OURS-class-other-times).
  const tileInner = (Icon: typeof Clock, value: string, label: string, chevron = false) => (
    <>
      <Icon size={16} strokeWidth={1.75} className="mb-1 text-th-7d67d9 dark:text-primary-accent" aria-hidden />
      <span className="inline-flex items-center gap-1 text-[12px] leading-[18px] font-bold text-charcoal tabular-nums">
        {value}
        {chevron && <ChevronDown size={12} strokeWidth={2} className="text-charcoal-faint" aria-hidden />}
      </span>
      <span className="text-[10.5px] leading-[15.8px] text-charcoal-faint">{label}</span>
    </>
  );
  const tileClass = "rounded-[14px] bg-[#F7F7FA] dark:bg-cream-soft px-2 py-2.5 flex flex-col items-center text-center";

  return (
    <div>
      <CompactHeader title={c.title} onBack={back} shown={compactShown} hairline headerRef={setHeaderEl} />

      <DetailHero height={200} onBack={back} colors={CLASS_HERO} />

      {/* #9-11: 16 under the hero, the name 22/33 800 (no tracking; two lines
          at most); the venue 13/19.5 700 #7D67D9 / #9A8CD6 (opens the gym
          page, else the business page, K12), then the place 400 muted.
          Distance: PB-O-50. The name drives the compact header. */}
      <h1 ref={setNameEl} className="mt-4 mb-0 text-[22px] leading-[33px] font-extrabold text-charcoal line-clamp-2 [overflow-wrap:anywhere]">
        {c.title}
      </h1>
      <p className="mt-0.5 mb-0 text-[13px] leading-[19.5px] text-charcoal-faint">
        <Link
          to={live?.gymId ? `/app/marketplace/gym?id=${encodeURIComponent(live.gymId)}` : `/app/marketplace/business?id=${encodeURIComponent(c.businessId)}`}
          className="font-bold no-underline text-th-7d67d9 dark:text-primary-accent"
        >
          {c.businessName}
        </Link>
        {c.location ? ` · ${c.location}` : ""}
      </p>

      <div className="mt-[14px] grid grid-cols-2 gap-2" data-info-tiles="">
        {manyTimes ? (
          <button
            type="button"
            onClick={() => setPopup("times")}
            aria-haspopup="dialog"
            aria-label={`Date, ${dayMonth(c.date)}. Other times`}
            className={`tap ${tileClass}`}
          >
            {tileInner(CalendarDays, dayMonth(c.date), "Date", true)}
          </button>
        ) : (
          <div className={tileClass}>{tileInner(CalendarDays, dayMonth(c.date), "Date")}</div>
        )}
        <div className={tileClass}>{tileInner(Clock, range12(c.startTime, c.endTime), "Time")}</div>
      </div>

      {/* #22-24: "4 of 12 spots left" 13/19.5 700, 14 under the tiles (no
          instructor row, O-NOINST); a 5 tall track 6 under it, #E4F0EE
          (dark teal-pale, O3), the fill #6F9993 / #4F8F8A; full: a muted
          fill and the "Class full" tag (K5). */}
      <div className="mt-[14px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] leading-[19.5px] font-bold text-charcoal tabular-nums">
            {isFull ? `${c.maxCapacity - seatsLeft} of ${c.maxCapacity} booked` : `${seatsLeft} of ${c.maxCapacity} spots left`}
          </span>
          {isFull && (
            <span className="h-5 px-2 rounded-full bg-cream-soft text-[11px] font-bold text-charcoal-soft inline-flex items-center">Class full</span>
          )}
        </div>
        <div className="mt-1.5 h-[5px] rounded-full bg-th-e4f0ee dark:bg-teal-pale overflow-hidden" aria-hidden data-spots-track="">
          <div
            className={`h-full rounded-full ${isFull ? "bg-charcoal-faint" : "bg-th-6f9993 dark:bg-teal-dark"}`}
            style={{ width: `${c.maxCapacity > 0 ? Math.min(100, (taken / c.maxCapacity) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* O-OFF: what was loaded stays; Book, Cancel and the waitlist are off. */}
      {!online && (
        <p role="status" className="mt-3 mb-0 text-[12px] leading-[18px] font-semibold text-charcoal-soft">
          You're offline. Showing what was loaded.
        </p>
      )}
      {online && loadFailed && <RetryLine className="mt-3" message="Couldn't load this class." onRetry={() => void load()} />}
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

      {/* #25-26: About this class (hidden with no notes). What to bring
          (#27): PB-O-53, hidden. */}
      {c.notes && (
        <>
          <DetailLabel className="mt-[22px]">About this class</DetailLabel>
          <p className="mt-2 mb-0 text-[14px] leading-[22.4px] text-charcoal-soft whitespace-pre-wrap [overflow-wrap:anywhere]">{c.notes}</p>
        </>
      )}

      {/* #28: BR-14's window, 12/18 400 muted, 14 under About (under What to
          bring once that exists), from class_cancellation_hours(). */}
      <p className="mt-3.5 mb-0 text-[12px] leading-[18px] text-charcoal-faint">{cancellationLine(windowHours)}</p>

      {/* #29-33 and S3: the Location card opens Directions for the place. */}
      <DetailLabel className="mt-[22px]">Location</DetailLabel>
      <div className="mt-2">
        <MapCard
          address={c.location}
          onOpen={
            c.location
              ? (e) => {
                  setDirAnchor(e.currentTarget);
                  setDirOpen(true);
                }
              : undefined
          }
        />
      </div>
      {copied && (
        <p role="status" className="mt-3 text-center text-[12px] font-semibold text-charcoal-soft">
          {copied}
        </p>
      )}

      {/* Room for whatever is pinned over the bottom: the page's own 112
          plus the CTA (60), the booked block (140) or the full row (150). */}
      <div aria-hidden style={{ height: mine ? 160 : position !== null ? 190 : full ? 150 : 60 }} />

      {mine ? (
        // MO1.4.4.3 (K3): the teal Booked block in the CTA's place
        // (secondary.tint, a 1 px #C1D5D2 edge, r16, padding 14): a 36 white
        // disc with Check 17/2.4, "You're booked" 14/800, the time 12/400;
        // under it "Cancel booking" 12.5/700 in danger and BR-14's line.
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
            disabled={busy || !online}
            className="tap self-center h-11 px-3 -my-1.5 text-[12.5px] font-bold text-status-high disabled:opacity-40"
          >
            Cancel booking
          </button>
          <p className="m-0 -mt-1.5 text-center text-[11.5px] text-charcoal-faint">{cancellationLine(windowHours)}</p>
        </PinnedSlot>
      ) : position !== null ? (
        // MO1.4.4.5 (K6): Other times stay; a lavender block with a 40 white
        // disc "#3", "You're #3 on the waitlist." then 13/400; "Leave
        // waitlist" 12.5/700 in danger.
        <PinnedSlot>
          {others.length > 0 && <OtherTimes others={others} onOpen={openOther} />}
          <div className="rounded-2xl border border-th-a79ad5/60 bg-primary-pale dark:border-primary-accent/40 p-3.5 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-cream-card flex items-center justify-center shrink-0 text-[14px] font-extrabold text-th-7d67d9 dark:text-primary-accent tabular-nums">
              #{position}
            </span>
            <p className="m-0 min-w-0 text-[13px] leading-[1.45] text-charcoal-soft">
              <span className="text-[14px] font-extrabold text-th-7d67d9 dark:text-primary-accent">You're #{position} on the waitlist.</span> We'll notify you
              if a spot opens.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void waitlist(false)}
            disabled={busy || !online}
            className="tap self-center h-11 px-3 -my-1.5 text-[12.5px] font-bold text-status-high disabled:opacity-40"
          >
            Leave waitlist
          </button>
        </PinnedSlot>
      ) : full ? (
        // MO1.4.4.4 (K5): "Other times" (up to three chips) and an outline
        // "Join waitlist", join_class_waitlist() (BR-10).
        <PinnedSlot>
          <div className="rounded-2xl bg-cream-card p-3 flex flex-col gap-2.5" style={{ boxShadow: "var(--shadow-sheet)" }}>
            {others.length > 0 && <OtherTimes others={others} onOpen={openOther} />}
            <button
              type="button"
              onClick={() => void waitlist(true)}
              disabled={busy || !authUserId || !online}
              className="tap h-12 rounded-[14px] border border-primary text-[14px] font-bold text-th-7d67d9 dark:text-primary-accent disabled:opacity-40"
            >
              Join waitlist
            </button>
          </div>
        </PinnedSlot>
      ) : (
        // #34: "Book · $15", 48 r14, #9A8CD6 with white (dark #A991FE with
        // #0D0B1A); disabled signed out (K13) and offline (O-OFF).
        <PinnedCta
          primary={{
            label: `Book · ${priceText}`,
            onClick: () => setPopup("book"),
            disabled: !authUserId || !online,
            className: "!bg-fill-pinned !text-on-primary-fill",
          }}
        />
      )}

      {/* S3: Directions for the class's place (no coordinates: PB-O-50). */}
      <DirectionsMenu open={dirOpen} onClose={() => setDirOpen(false)} anchor={dirAnchor} address={c.location} coords={null} onCopied={flash} />

      {/* MO1.4.4.1 (K1): the booking popup (no ×; outside dismisses), X-01 "ours". */}
      <CentredPopup
        open={popup === "book"}
        onClose={() => setPopup(null)}
        title={`Book ${c.title}`}
        icon={<CalendarCheck size={22} strokeWidth={1.75} />}
        body={free ? undefined : "Choose how you'll pay"}
        geometry="ours"
        cta={{
          label: free ? "Confirm booking" : `Confirm booking · ${priceText}`,
          loading: busy,
          disabled: !online,
          onClick: () => void book(),
          className: "!bg-fill-pinned !text-on-primary-fill",
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
                // Whish needs the payments stage: shown as coming (X-29).
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
                      on ? "border-[1.5px] border-th-7d6bb5 dark:border-primary-accent ring-[3px] ring-primary-pale" : "border border-charcoal/[0.10]"
                    }`}
                  >
                    <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0 text-th-7d67d9 dark:text-primary-accent" aria-hidden>
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
        {!online && <p className="mt-3 mb-0 text-[12px] font-semibold text-charcoal-soft">You're offline.</p>}
      </CentredPopup>

      {/* MO1.4.4.2 (K2): confirmed, X-01 "ours". The Centium mark (vector,
          at the old 56 × 60 contain box); the payment line says what was
          chosen; book_class() has already added the class to the Calendar. */}
      <CentredPopup
        open={popup === "confirmed"}
        onClose={() => setPopup(null)}
        title="You're booked"
        titleSize={21}
        titleInk="text-th-5f5093 dark:text-primary-accent"
        iconBare
        geometry="ours"
        icon={
          <span className="flex w-14 h-[60px] items-center justify-center">
            <CentiumMark framing="png" height={(56 * 713) / 687} />
          </span>
        }
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
        <button type="button" onClick={() => setPopup(null)} className="tap mt-1 w-full h-12 text-[14px] font-bold text-th-7d67d9 dark:text-primary-accent">
          Done
        </button>
      </CentredPopup>

      {/* MO1.4.4.3 interaction 3 (K4): "Cancel confirmation, then MO1.4.4". */}
      <CentredPopup
        open={popup === "cancel"}
        onClose={() => setPopup(null)}
        title="Cancel booking?"
        icon={<CalendarDays size={22} strokeWidth={1.75} />}
        geometry="ours"
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
        cta={{ label: "Cancel booking", loading: busy, disabled: !online, onClick: () => void cancel() }}
      />

      {/* OURS-class-other-times: every session of this class, the current one
          marked and not tappable; a row opens that session (replace, as
          openOther); scrim / Escape close. Six rows show, then it scrolls. */}
      <CentredPopup
        open={popup === "times"}
        onClose={() => setPopup(null)}
        title="Other times"
        geometry="ours"
        bodyWeight={400}
        body={<span className="block text-[12.5px] leading-[18.8px] text-charcoal-faint">{`${c.title} at ${c.businessName}`}</span>}
      >
        <ul className="m-0 p-0 list-none flex flex-col gap-2 overflow-y-auto max-h-[328px] text-start" data-other-times="">
          {sessions.map((s) => {
            const current = s.classId === c.classId;
            const n = current ? seatsLeft : s.spotsRemaining;
            const label = `${dayMonth(s.date)} · ${time12(s.startTime)}`;
            const inner = (
              <>
                <span className="text-[13px] leading-[19.5px] font-bold text-charcoal tabular-nums truncate">{label}</span>
                <span className={`shrink-0 text-[11px] leading-[16.5px] font-semibold ${n <= 0 ? "text-status-high" : "text-th-4f7f78 dark:text-teal-deep-text"}`}>
                  {spotsText(n)}
                </span>
              </>
            );
            return (
              <li key={s.classId}>
                {current ? (
                  <div
                    aria-current="true"
                    className="h-12 px-[14px] rounded-[14px] bg-primary-pale border-[1.5px] border-th-7d67d9 dark:border-primary-accent flex items-center justify-between gap-3"
                  >
                    {inner}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPopup(null);
                      openOther(s.classId);
                    }}
                    className="tap w-full h-12 px-[14px] rounded-[14px] bg-cream-card border-[0.5px] border-hair-08 flex items-center justify-between gap-3 text-start"
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => setPopup(null)} className="tap mt-2 w-full h-12 text-[14px] leading-[21px] font-bold text-th-7d67d9 dark:text-primary-accent">
          Close
        </button>
      </CentredPopup>
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
              {dayMonth(o.date).split(" ")[0]} {time12(o.startTime)}
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

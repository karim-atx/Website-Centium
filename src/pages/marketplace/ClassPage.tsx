import { useCallback, useEffect, useMemo, useState } from "react";
import type React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BusinessClosedNote } from "../../components/marketplace/BusinessClosedNote";
import { BookingPausedNote } from "../../components/marketplace/BookingPausedNote";
import { useBookingPause } from "../../components/marketplace/useBookingPause";
import { useBusinessStatus } from "../../hooks/useBusinessStatus";
import { takesNewActivity } from "../../services/business-closure/logic";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";
import { useOnline } from "../../hooks/useOnline";
import { useIsDark } from "../../hooks/useIsDark";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { PinnedSlot } from "../../components/ui/PinnedCta";
import { PinnedInline } from "../../components/ui/pinnedInline";
import { useWebLayout } from "../../components/web/useWebLayout";
import { VenueWebBody, VenueWebHeader, WebCaps, WebMapCard, WebPanelCta, WebTextSection } from "./venueWeb";
import { WEB_FAINT, WEB_HAIR, WEB_INK2 } from "./venueWebTokens";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { InstructorCard } from "../../components/market/InstructorCard";
import { hiredViaCentium } from "../../services/marketplace/instructorRule";
import { ConfirmationStrip } from "../../components/market/ConfirmationStrip";
import { MusicSection } from "../../components/music/MusicSection";
import {
  MarketEmptyCard,
  MarketError,
  MarketOffline,
  MarketSkeleton,
} from "../../components/market/MarketStates";
import { FOCUS_CSS, usePress } from "../../components/market/usePress";
import { useClassBooking, type BookOutcome } from "../../hooks/useClassBooking";
import { useKnownPosition } from "../../hooks/useKnownPosition";
import { distanceKm } from "../../services/geo/distance";
import {
  bookingWindowLine,
  distanceText,
  levelLabel,
  whatToBringLine,
} from "../../services/marketplace/classBooking";
import { ClassTermsSheet } from "./ClassTermsSheet";
import {
  BookingDone,
  ClassTicketSummary,
  PurchaseSheet,
  confirmLabel,
} from "./PurchaseSheet";
import {
  cancelClassBooking,
  fetchClassLive,
  fetchMarketplaceClasses,
  fetchMyBookedClassIds,
  joinClassWaitlist,
  leaveClassWaitlist,
  type ClassLive,
  type MarketplaceClass,
} from "../../services/marketplace";
import {
  cancellationLine,
  isLateCancellation,
} from "../../services/venues/venueLogic";
import {
  fetchMyGymMemberships,
  fetchVenue,
  fetchVenues,
} from "../../services/venues";
import { recordListingEvent } from "../../services/marketplace/listingEvents";
import {
  firstVisitText,
  isLivePassState,
  parseListingSource,
  viewerSpotsLeft,
} from "../../services/marketplace/listingLogic";
import {
  CompactHeader,
  DirectionsMenu,
  MapCard,
  useCompactHeader,
} from "./venueParts";
import { range12, time12 } from "../../utils/time12";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette, type MarketPalette } from "../../theme/marketTokens";
import {
  doneBody,
  doneWhen,
  durationText,
  longDate,
  paymentLine,
  seatLayout,
  seatTone,
  sheetPlace,
  sheetWhen,
  shortDate,
  venueOf,
} from "../../components/marketplace/classCardModel";
import { t, tk, tn, tx } from "../../i18n/core";
import { ClassPremiumLines } from "../../components/premium/PremiumBooking";

// Market + Share 3.0 · W2 · Class detail (C-MO.4.3.1 `classDetail`,
// `classDetailUnlisted`, `classDetailAlmost`) and Class booking (C-MO.4.3.2
// `classSheet`, `classDone`), /app/marketplace/class?id=…. Literal values,
// Client Explore Screens lines 275–358 and 184–202, script `cls`,
// `seatPanel`, `seats`, `seatCols`, `pay("class")`, `done`:
// - the page: padding 4 16 120 (the app shell gives the 16 sides; the header
//   row sits 4 under the top inset): back 36 (chevron 18 / 2 --ink2, margin
//   -7) and "CLASS" 10.5 / 700 0.1em --faint, gap 6; the title 24 / 30 800
//   (margin-top 6); the venue 13 / 600 --accent (margin-top 2, opens the gym
//   page, else the business page);
// - the time card (margin-top 14): radius 20, 0.5px --hair, --card, padding
//   18 16 16, centred: the date 11 / 700 0.1em caps --faint ("Friday, October
//   16", D-02); the range 34 / 40 700 -0.02em tabular (margin-top 4), in the
//   app's 12-hour form "6:30 to 7:15 PM" (D-03, range12: one meridiem when
//   both ends share it, "11:30 AM to 12:30 PM" otherwise; a long range wraps
//   to a second line); the 64% × 4 --segactive rule (margin 12 auto 0); the
//   duration 11.5 --faint (margin-top 6);
// - the seat panel (margin-top 18, radius 16, padding 20): #EEEAF8, or
//   #E6F1EF with "Almost full" 13 / 700 (margin-bottom 12) when 3 or fewer are
//   left; 17 dots (taken #AEA1DC, free #E6F1EF with 1.5px #4F8F8A) in a grid
//   of ceil(cap / ceil(cap / 12)) columns, row gap 10, items centred; above
//   36 places the bar (flex, gap 2, 10 tall cells radius 2, 1px border); then
//   (margin-top 14, baseline, gap 6) "{left} of {cap}" 20 / 700 #7D67D9
//   tabular and "spots left" 14 / 400 --ink2;
// - the instructor (margin-top 12): the W1 InstructorCard. Release 2 (W5,
//   HANDOVER §9): only a Team instructor is named; a class with none shows
//   "Instructor not listed" (no photo, no link). The rule lives in
//   services/marketplace/instructorRule.ts: directory_classes'
//   instructor_is_team decides (Database #38), the card takes
//   instructor_specialty / _rating / _review_count ("Instructor" when no
//   specialty is set) and "Hired via Centium" shows for a Team instructor
//   with a Centium hire (instructor_hire_count);
// - "About this class" 10.5 / 700 0.1em caps --faint (margin-top 18) and the
//   about 13 / 19.5 --ink2 (margin-top 6);
// - the pinned CTA "Book · $12": 52, radius 16, --fill, 15 / 800 --onfill.
// The Book sheet is the lead's PurchaseSheet with the class ticket; the
// confirmation is BookingDone ("You're booked", rows Class / When / Payment,
// My bookings › Upcoming).
//
// Undrawn live features (PLAN §3.1 "ClassPage"), kept and drawn in the same
// chrome: the date line opens "Other times" when the class has other
// sessions; Level and What to bring under About (same caps label / body);
// the free-cancellation and booking-window lines (12 / 18 --faint); Location
// (MapCard, the address and the distance; it opens Directions); the Booked
// block with Cancel booking (late-cancel warning in the confirmation);
// the waitlist (join, position, leave) with Other times; the closed
// business note; the cancelled-by-venue reason; signed out / offline (Book,
// Cancel and the waitlist off; the offline strip); ?booked=1 (GymPage's
// Book a class lands here confirmed) and ?src= (book_tap, once per session);
// the venue's terms first (ClassTermsSheet, ATXE4); "Added to your calendar"
// on the confirmation (book_class() adds it, with a 15-minute alert); the
// compact header once the title passes under the top.
// Not carried over: the 200 cover hero (the board draws the page without
// one; business_classes.cover_url is no longer shown here, flagged to the
// lead).
//
// WIRED TO BACKEND STAGE 4c and B9 (Database docs/HANDOVER_API.md): book_class
// (terms first: pending_policies / accept, ATXE4), cancel_class_booking (a late
// one is accepted and reported back as not free), class_seats_left (counts
// live waitlist offers), class_booking_rules, the waitlist functions,
// directory_classes (venue, about, level, what to bring, instructor when
// listed publicly). A cancelled class leaves that view; its page then says so
// (business_classes.cancelled_at, cancel_reason).

/** The seat panel's literal colours (light: the board; dark: readable, D-05). */
function seatColours(m: MarketPalette, dark: boolean) {
  return dark
    ? {
        open: m.pale,
        almost: m.tealbg,
        taken: m.fill,
        freeBg: m.tealbg,
        freeRing: m.teal,
        almostInk: m.teal,
        fig: m.accent,
      }
    : // "Almost full" #4F8F8A is 3.2:1 on #E6F1EF; text takes #3A7570 (4.6:1), the lead's Q1 rule.
      {
        open: "#EEEAF8",
        almost: "#E6F1EF",
        taken: "#AEA1DC",
        freeBg: "#E6F1EF",
        freeRing: "#4F8F8A",
        almostInk: "#3A7570",
        fig: "#7D67D9",
      };
}

export function ClassPage({ classId }: { classId: string }) {
  const { authUserId, profileReady } = useApp();
  const navigate = useNavigate();
  const back = useBack("/app/marketplace");
  const online = useOnline();
  const dark = useIsDark();
  const m = marketPalette(dark);
  const press = usePress();
  // Addendum A (WC-EX.2): the web layout from 1024px.
  const { web, rail } = useWebLayout();
  const [all, setAll] = useState<MarketplaceClass[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();
  // GymPage's Book a class books and lands here confirmed (?booked=1).
  const [done, setDone] = useState(params.get("booked") === "1");
  const [popup, setPopup] = useState<"sheet" | "cancel" | "times" | null>(null);
  const [live, setLive] = useState<ClassLive | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [dirAnchor, setDirAnchor] = useState<HTMLButtonElement | null>(null);
  const [dirOpen, setDirOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { setNameEl, setHeaderEl, shown: compactShown } = useCompactHeader();

  const load = useCallback(async () => {
    const [cls, mine, detail] = await Promise.all([
      fetchMarketplaceClasses(),
      fetchMyBookedClassIds(),
      fetchClassLive(classId),
    ]);
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
    // Drop ?booked=1 once read, so a reload doesn't reopen the confirmation.
    if (params.get("booked") === "1")
      setParams({ id: classId }, { replace: true });
  }, [params, setParams, classId]);

  useEffect(() => {
    if (!profileReady) return;
    void (async () => {
      await load();
    })();
  }, [profileReady, authUserId, load]);

  const c = all?.find((x) => x.classId === classId) ?? null;

  // B13 MK-04: a member of the business isn't limited by the class's Centium
  // spots; anybody else sees the smaller of the two (as Discover's cards do).
  // Read only when the class has a Centium limit; null = not known yet (no cap).
  const capped = c?.centiumSpotsLeft != null ? c.businessId : null;
  const [memberOf, setMemberOf] = useState<{
    businessId: string;
    member: boolean;
  } | null>(null);
  useEffect(() => {
    if (!capped || !profileReady) return;
    let alive = true;
    void (async () => {
      if (!authUserId) {
        if (alive) setMemberOf({ businessId: capped, member: false });
        return;
      }
      const [mine, gyms] = await Promise.all([
        fetchMyGymMemberships(),
        fetchVenues(),
      ]);
      if (!alive || !mine.ok || !gyms.ok) return;
      const bizOf = new Map(gyms.value.map((g) => [g.id, g.businessId]));
      setMemberOf({
        businessId: capped,
        member: mine.value.some(
          (m) => isLivePassState(m.passState) && bizOf.get(m.gymId) === capped,
        ),
      });
    })();
    return () => {
      alive = false;
    };
  }, [capped, profileReady, authUserId]);
  const isMember =
    memberOf && memberOf.businessId === capped ? memberOf.member : true;
  // B13 MK-07: Book on this page records book_tap, once per session per class.
  const listingSource = parseListingSource(params.get("src"));
  // Other times: the same class at the same place, straight from the list (no
  // new read), soonest first.
  const openOther = (id: string) =>
    navigate(`/app/marketplace/class?id=${encodeURIComponent(id)}`, {
      replace: true,
    });
  const sessions = useMemo(
    () =>
      c && all
        ? all
            .filter((x) => x.title === c.title && x.businessId === c.businessId)
            .sort(
              (a, b) =>
                a.date.localeCompare(b.date) ||
                a.startTime.localeCompare(b.startTime),
            )
        : [],
    [all, c],
  );
  const others = useMemo(
    () => sessions.filter((x) => x.classId !== classId).slice(0, 3),
    [sessions, classId],
  );

  // PB-O-50: the distance, on the device, when the device has already shared
  // its position (never prompted here).
  const here = useKnownPosition();
  const venueCoords =
    c && c.venueLat != null && c.venueLng != null
      ? { lat: c.venueLat, lng: c.venueLng }
      : null;
  const distance =
    here && venueCoords ? distanceText(distanceKm(here, venueCoords)) : null;

  // The confirmation's first-visit line: the venue's own (gyms.first_visit).
  const gymId = c?.gymId ?? live?.gymId ?? null;
  const [firstVisit, setFirstVisit] = useState<{
    gymId: string;
    text: string | null;
  } | null>(null);
  useEffect(() => {
    if (!gymId) return;
    let on = true;
    void fetchVenue(gymId).then((r) => {
      if (on)
        setFirstVisit({
          gymId,
          text: r.ok ? firstVisitText(r.value?.firstVisit) : null,
        });
    });
    return () => {
      on = false;
    };
  }, [gymId]);

  // B9: Confirm asks for the venue's terms first when any wait (the terms
  // sheet replaces the booking sheet), then books; "Agree and book" records
  // the acceptances and books.
  const booking = useClassBooking({
    classId: c?.classId ?? null,
    businessId: c?.businessId ?? null,
    userId: authUserId ?? null,
  });
  // CP: a closed or paused business takes no new bookings or waitlist places; a booking already made stays.
  const bizStatus = useBusinessStatus(c?.businessId);
  // Round F2 AB4: my_booking_pauses for this class's business.
  const bookingPause = useBookingPause(c?.businessId, !!authUserId);
  const settle = async (r: BookOutcome, fromSheet: boolean) => {
    if (r.kind === "terms") {
      setPopup(null);
      return;
    }
    if (r.kind === "error") {
      if (!r.message) return;
      // ATXS0: paused after 3 no-shows; the page's sentence replaces Book.
      if (r.code === "ATXS0") bookingPause.reload();
      // A refusal from the sheet stays in the sheet; one after the terms
      // (the sheet is gone) shows on the page.
      if (fromSheet) setSheetError(r.message);
      else setError(r.message);
      await load();
      return;
    }
    setError(null);
    setSheetError(null);
    setNote(null);
    setPopup(null);
    await load();
    setDone(true);
  };
  const book = async () => {
    if (!c || !authUserId || booking.busy) return;
    setSheetError(null);
    await settle(await booking.start(), true);
  };
  const agree = async () => {
    await settle(await booking.agree(), false);
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
        ? t("Booking cancelled. It was free to cancel.")
        : t("Booking cancelled. It was outside the free-cancellation window, so the studio may charge for it."),
    );
    await load();
  };

  const waitlist = async (join: boolean) => {
    if (!c || busy) return;
    setBusy(true);
    const r = join
      ? await joinClassWaitlist(c.classId)
      : await leaveClassWaitlist(c.classId);
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

  const caps: React.CSSProperties = {
    margin: 0,
    fontSize: textPx(10.5),
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: m.faint,
  };
  const body: React.CSSProperties = {
    margin: "6px 0 0",
    fontSize: textPx(13),
    lineHeight: linePx(19.5),
    color: m.ink2,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  };

  // The back row and "CLASS" (the page's own header; 4 under the top inset).
  const header = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginInlineStart: -7,
        marginTop: -20,
      }}
    >
      <button
        type="button"
        onClick={back}
        aria-label={t("Back")}
        className="tap market-focus"
        style={{
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: m.ink2,
          background: "none",
          border: 0,
          padding: 0,
          borderRadius: 999,
        }}
      >
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="rtl:-scale-x-100"
          style={NO_ICON_SCALE}
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <div
        style={{
          fontSize: textPx(10.5),
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: m.faint,
        }}
      >
        {t("Class")}
      </div>
    </div>
  );

  // On web: the header, then the loading skeleton or the missing card in the body.
  if (web && (all === null || !c)) {
    return (
      <div aria-busy={all === null || undefined} style={{ lineHeight: "normal", color: m.ink }}>
        <style>{FOCUS_CSS}</style>
        <VenueWebHeader rail={rail} kicker={t("Class")} title="" onBack={back} />
        <div style={{ padding: `24px ${rail ? 24 : 32}px` }}>
          {all === null ? (
            <MarketSkeleton radius={20} height={275} rows={3} label={tk("Loading the class")} />
          ) : loadFailed ? (
            <MarketError thing={tk("this class")} onRetry={retry} />
          ) : live?.cancelledAt ? (
            <MarketEmptyCard title={tk("This class was cancelled by the venue.")} body={live.cancelReason ?? undefined} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }} />
          ) : (
            <MarketEmptyCard title={tk("This class isn't available any more.")} />
          )}
        </div>
      </div>
    );
  }
  // D-04 loading: the page's shapes (title, venue, time card, instructor).
  if (all === null) {
    return (
      <div style={{ lineHeight: "normal", color: m.ink }}>
        <style>{FOCUS_CSS}</style>
        {header}
        <div
          aria-hidden
          className="animate-skeleton-pulse"
          style={{
            marginTop: 6,
            height: 30,
            width: "55%",
            borderRadius: 10,
            background: m.soft,
          }}
        />
        <div
          aria-hidden
          className="animate-skeleton-pulse"
          style={{
            marginTop: 6,
            height: 16,
            width: "40%",
            borderRadius: 8,
            background: m.soft,
          }}
        />
        <MarketSkeleton
          radius={20}
          height={275}
          rows={3}
          label={tk("Loading the class")}
          style={{ marginTop: 14 }}
        />
        <MarketSkeleton
          radius={18}
          height={72}
          rows={2}
          label={tk("Loading the instructor")}
          style={{ marginTop: 12 }}
        />
      </div>
    );
  }

  if (!c) {
    return (
      <div style={{ lineHeight: "normal", color: m.ink }}>
        <style>{FOCUS_CSS}</style>
        {header}
        <div style={{ marginTop: 14 }}>
          {loadFailed ? (
            // D-04 error / offline, with Retry.
            <MarketError thing={tk("this class")} onRetry={retry} />
          ) : live?.cancelledAt ? (
            // B9 (CL-03): a cancelled class leaves directory_classes; its
            // page says so, with the venue's reason when it gave one (verbatim).
            <div data-class-cancelled="">
              <MarketEmptyCard
                title={tk("This class was cancelled by the venue.")}
                body={live.cancelReason ?? undefined}
                style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
              />
            </div>
          ) : (
            <MarketEmptyCard title={tk("This class isn't available any more.")} />
          )}
        </div>
      </div>
    );
  }

  const mine = booked.has(c.classId);
  const free = !c.priceValue;
  const priceText = free ? t("Free") : c.price;
  // "Full" is class_seats_left() (it counts live waitlist offers); the view's
  // own count is the fallback when that read failed.
  const seatsLeft = viewerSpotsLeft(
    live?.seatsLeft ?? c.spotsRemaining,
    c.centiumSpotsLeft,
    isMember,
  );
  const cap = Math.max(0, c.maxCapacity);
  const left = Math.min(cap, seatsLeft);
  const taken = cap - left;
  const isFull = left <= 0;
  const full = isFull && !mine;
  const position = mine ? null : (live?.waitlistPosition ?? null);
  const windowHours = live?.windowHours ?? 12;
  // CL-05: "Bookings open 14 days ahead." (or the day they open), shown
  // until the member holds the booking.
  const windowLine =
    live?.rules && !mine
      ? bookingWindowLine(live.rules, live.startsAt ?? c.startsAt ?? null)
      : null;
  const level = levelLabel(c.level);
  const bring = whatToBringLine(c.whatToBring);
  const about = c.about?.trim() || c.notes?.trim() || null;
  const address = c.venueAddress?.trim() || c.location;
  const late = live?.startsAt
    ? isLateCancellation(live.startsAt, windowHours)
    : false;
  const range = range12(c.startTime, c.endTime);
  const when = `${shortDate(c.date)} · ${range}`;
  const manyTimes = sessions.length > 1;
  const flash = (text: string) => {
    setCopied(text);
    setTimeout(() => setCopied(null), 1600);
  };
  const sc = seatColours(m, dark);
  const tone = seatTone(left);
  const seats = seatLayout(cap, taken);
  const listed = !!(c.instructorId && c.instructorName);
  const venueTo = gymId
    ? `/app/marketplace/gym?id=${encodeURIComponent(gymId)}`
    : `/app/marketplace/business?id=${encodeURIComponent(c.businessId)}`;

  const dateLine: React.CSSProperties = {
    fontSize: textPx(11),
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: m.faint,
  };
  const dangerLink: React.CSSProperties = {
    alignSelf: "center",
    height: 44,
    padding: "0 12px",
    margin: "-6px 0",
    background: "none",
    border: 0,
    font: "inherit",
    fontSize: textPx(12.5),
    fontWeight: 700,
    color: m.high,
    cursor: "pointer",
  };
  // Everything pinned in the CTA's place sits on one --card panel (radius 20, 0.5px --hair, padding 12, gap 10, the sheet shadow) so it reads over the page.
  // On web the states sit inside the booking panel, which draws the card.
  const panel: React.CSSProperties = web ? { display: "flex", flexDirection: "column", gap: 12, lineHeight: "normal" } : {
    borderRadius: 20,
    background: m.card,
    border: `0.5px solid ${m.hair}`,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    boxShadow: "var(--shadow-sheet)",
    lineHeight: "normal",
  };
  const offStyle = (off: boolean): React.CSSProperties =>
    off ? { opacity: 0.4, cursor: "default" } : {};

  const overlays = (
    <>
      {/* S3: Directions to the venue's coordinates when it has them, else
          to the address; Copy copies the address. */}
      <DirectionsMenu
        open={dirOpen}
        onClose={() => setDirOpen(false)}
        anchor={dirAnchor}
        address={address}
        coords={venueCoords}
        onCopied={flash}
      />

      {/* C-MO.4.3.2 classSheet: the booking sheet. */}
      <PurchaseSheet
        open={popup === "sheet"}
        onClose={() => setPopup(null)}
        title={t("Book {name}", { name: c.title })}
        summary={
          <ClassTicketSummary
            title={c.title}
            place={sheetPlace(c)}
            when={sheetWhen(c)}
            booked={t("{n} of {total} booked", { n: taken, total: cap })}
            pct={cap > 0 ? (taken / cap) * 100 : 0}
            price={priceText}
          />
        }
        cashHint={free ? null : t("Pay at the front desk before class")}
        ctaLabel={free ? t("Confirm booking") : confirmLabel(priceText)}
        busy={booking.busy}
        disabled={!online}
        error={sheetError}
        note={!online ? <MarketOffline loaded /> : null}
        onConfirm={() => void book()}
      />

      {/* OURS-class-terms (B9, ATXE4): the venue's waiver, class terms and
          house rules, each agreed, then booked. */}
      <ClassTermsSheet
        docs={booking.terms}
        businessName={c.businessName}
        busy={booking.busy}
        online={online}
        error={booking.termsError}
        onAgree={() => void agree()}
        onClose={booking.closeTerms}
      />

      {/* C-MO.4.3.2 classDone: the confirmation page. book_class() has
          already added the class to the Calendar (15-minute alert). */}
      <BookingDone
        open={done}
        title={t("You're booked")}
        body={doneBody(
          c.title,
          firstVisit && firstVisit.gymId === gymId ? firstVisit.text : null,
        )}
        rows={[
          { k: t("Class"), v: c.title },
          { k: t("When"), v: doneWhen(c) },
          { k: tx("Payment", "how it is paid"), v: paymentLine(priceText, free) },
        ]}
        bookingsTab="upcoming"
        extra={
          <span
            data-calendar-pill=""
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: textPx(12),
              fontWeight: 700,
              color: m.tealink,
              background: m.tealbg,
              borderRadius: 999,
              padding: "4px 10px",
            }}
          >
            <svg
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              style={NO_ICON_SCALE}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18m-12 6 2 2 4-4" />
            </svg>
            {t("Added to your calendar")}
          </span>
        }
        onDone={() => setDone(false)}
      />

      {/* Cancel confirmation: BR-14 warned before cancel_class_booking(). */}
      <CentredPopup
        open={popup === "cancel"}
        onClose={() => setPopup(null)}
        title={t("Cancel booking?")}
        geometry="ours"
        body={
          <>
            <span className="block">{`${c.title} · ${when}`}</span>
            <span
              className="mt-1.5 block"
              style={late ? { fontWeight: 600, color: m.high } : undefined}
            >
              {late
                ? tn(windowHours, "It starts in under {n} hour, so this isn't a free cancellation. The studio may charge for it.", "It starts in under {n} hours, so this isn't a free cancellation. The studio may charge for it.")
                : cancellationLine(windowHours)}
            </span>
          </>
        }
        cta={{
          label: t("Cancel booking"),
          loading: busy,
          disabled: !online,
          onClick: () => void cancel(),
        }}
      />

      {/* Other times: every session of this class, the current one marked
          and not tappable; a row opens that session (replace); scrim /
          Escape close. Six rows show, then it scrolls. */}
      <CentredPopup
        open={popup === "times"}
        onClose={() => setPopup(null)}
        title={t("Other times")}
        geometry="ours"
        bodyWeight={400}
        body={
          <span className="block text-[12.5px] leading-[18.8px] text-charcoal-faint">{t("{name} at {place}", { name: c.title, place: venueOf(c) })}</span>
        }
      >
        <ul
          className="m-0 p-0 list-none flex flex-col gap-2 overflow-y-auto max-h-[328px] text-start"
          data-other-times=""
        >
          {sessions.map((s) => {
            const current = s.classId === c.classId;
            const n = current ? left : s.spotsRemaining;
            const inner = (
              <>
                <span
                  style={{
                    fontSize: textPx(13),
                    lineHeight: linePx(19.5),
                    fontWeight: 700,
                    color: m.ink,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {`${shortDate(s.date)} · ${time12(s.startTime)}`}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: textPx(11),
                    fontWeight: 600,
                    color: n <= 0 ? m.high : m.tealink,
                  }}
                >
                  {spotsText(n)}
                </span>
              </>
            );
            const row: React.CSSProperties = {
              width: "100%",
              height: 48,
              padding: "0 14px",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              boxSizing: "border-box",
            };
            return (
              <li key={s.classId}>
                {current ? (
                  <div
                    aria-current="true"
                    style={{
                      ...row,
                      background: m.pale,
                      border: `1.5px solid ${m.accent}`,
                    }}
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
                    className="tap market-focus"
                    style={{
                      ...row,
                      background: m.card,
                      border: `0.5px solid ${m.hair}`,
                      font: "inherit",
                      textAlign: "start",
                      cursor: "pointer",
                    }}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => setPopup(null)}
          className="market-focus"
          style={{
            marginTop: 8,
            width: "100%",
            height: 48,
            background: "none",
            border: 0,
            font: "inherit",
            fontSize: textPx(14),
            fontWeight: 700,
            color: m.accent,
            cursor: "pointer",
          }}
        >
          {t("Close")}
        </button>
      </CentredPopup>
    </>
  );

  const pinned = (
    <>
      {mine ? (
        // Booked: a teal block in the CTA's place (--tealbg, radius 16,
        // padding 14): a 36 --card disc with the tick, "You're booked" 14 / 800
        // --tealink, the time 12 --ink2; then "Cancel booking" in --high and
        // BR-14's line.
        <PinnedSlot>
          <div style={panel}>
            <div
              data-booked-block=""
              style={{
                borderRadius: 16,
                background: m.tealbg,
                padding: 14,
                display: "flex",
                alignItems: "center",
                gap: 12,
                lineHeight: "normal",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: m.card,
                  color: m.tealink,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width={17}
                  height={17}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={NO_ICON_SCALE}
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: textPx(14),
                    fontWeight: 800,
                    color: m.tealink,
                  }}
                >
                  {t("You're booked")}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: textPx(12),
                    color: m.ink2,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {when}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => !(busy || !online) && setPopup("cancel")}
              aria-disabled={busy || !online || undefined}
              className="market-focus"
              style={{ ...dangerLink, ...offStyle(busy || !online) }}
            >
              {t("Cancel booking")}
            </button>
            <p
              style={{
                margin: "-6px 0 0",
                textAlign: "center",
                fontSize: textPx(11.5),
                color: m.faint,
                lineHeight: "normal",
              }}
            >
              {cancellationLine(windowHours)}
            </p>
          </div>
        </PinnedSlot>
      ) : position !== null ? (
        // Waitlist: Other times stay; a --pale block with a 40 --card disc
        // "#3", "You're #3 on the waitlist." 14 / 800 --accent then 13 --ink2;
        // "Leave waitlist" in --high.
        <PinnedSlot>
          <div style={panel}>
            {others.length > 0 && (
              <OtherTimes others={others} onOpen={openOther} m={m} />
            )}
            <div
              data-waitlist-block=""
              style={{
                borderRadius: 16,
                background: m.pale,
                padding: 14,
                display: "flex",
                alignItems: "center",
                gap: 12,
                lineHeight: "normal",
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: m.card,
                  color: m.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: textPx(14),
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                #{position}
              </span>
              <p
                style={{
                  margin: 0,
                  minWidth: 0,
                  fontSize: textPx(13),
                  lineHeight: 1.45,
                  color: m.ink2,
                }}
              >
                <span
                  style={{
                    fontSize: textPx(14),
                    fontWeight: 800,
                    color: m.accent,
                  }}
                >
                  {t("You're #{n} on the waitlist.", { n: position })}
                </span>{" "}
                {t("We'll notify you if a spot opens.")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => !(busy || !online) && void waitlist(false)}
              aria-disabled={busy || !online || undefined}
              className="market-focus"
              style={{ ...dangerLink, ...offStyle(busy || !online) }}
            >
              {t("Leave waitlist")}
            </button>
          </div>
        </PinnedSlot>
      ) : !takesNewActivity(bizStatus) ? (
        <PinnedSlot>
          <BusinessClosedNote status={bizStatus} className="" />
        </PinnedSlot>
      ) : bookingPause.pause ? (
        // Round F2 AB4: new bookings here are paused after 3 no-shows; the
        // sentence replaces Book (and Join waitlist, whose offer books through
        // book_class and would be refused).
        <PinnedSlot>
          <BookingPausedNote pause={bookingPause.pause} gym={c.businessName || null} />
        </PinnedSlot>
      ) : full ? (
        // Full: Other times (up to three) and "Join waitlist" (BR-10), on a
        // --card panel (radius 20, 0.5px --hair).
        <PinnedSlot>
          <div style={panel}>
            {others.length > 0 && (
              <OtherTimes others={others} onOpen={openOther} m={m} />
            )}
            <button
              type="button"
              onClick={() =>
                !(busy || !authUserId || !online) && void waitlist(true)
              }
              aria-disabled={busy || !authUserId || !online || undefined}
              className="market-focus"
              style={{
                // WC-EX Class Web: Join waitlist is the panel's 44 primary (#AEA1DC, 15/24 700).
                height: web ? 44 : 52,
                borderRadius: web ? 12 : 16,
                border: web ? 0 : `1.5px solid ${m.fill}`,
                background: web ? "#AEA1DC" : m.card,
                font: "inherit",
                fontSize: web ? 15 : textPx(15),
                fontWeight: web ? 700 : 800,
                color: web ? "#FFFFFF" : m.accent,
                cursor: "pointer",
                ...offStyle(busy || !authUserId || !online),
              }}
            >
              {t("Join waitlist")}
            </button>
          </div>
        </PinnedSlot>
      ) : (
        // "Book · $12": 52, radius 16, --fill, 15 / 800 --onfill; off signed
        // out and offline.
        <PinnedSlot>
          <button
            type="button"
            data-book-cta=""
            onClick={() => {
              if (!authUserId || !online) return;
              recordListingEvent({
                businessId: c.businessId,
                kind: "book_tap",
                source: listingSource,
                itemId: c.classId,
              });
              setSheetError(null);
              setPopup("sheet");
            }}
            aria-disabled={!authUserId || !online || undefined}
            className="market-focus"
            {...press.handlers}
            style={{
              height: 52,
              borderRadius: 16,
              border: 0,
              background: m.fill,
              color: m.onfill,
              font: "inherit",
              fontSize: textPx(15),
              fontWeight: 800,
              cursor: "pointer",
              ...(!authUserId || !online
                ? { opacity: 0.4, cursor: "default" }
                : press.style),
            }}
          >
            {t("Book · {price}", { price: priceText })}
          </button>
        </PinnedSlot>
      )}
    </>
  );

  // Addendum A, WC-EX.2 (WC-EX Class Web): from 1024px the header (back,
  // CLASS, the title, the venue link), then the left 8 (the time card beside
  // the seat panel, the instructor, About · Level · What to bring) and the
  // right 4 (the booking panel in the pinned CTA's place, Location); 5 | 3
  // and one column inside on the rail. The panel's states are the pinned
  // ones, rendered in place (PinnedInline); open: the price, Book and the
  // booking lines.
  if (web) {
    const open = !mine && position === null && takesNewActivity(bizStatus) && !bookingPause.pause && !full;
    const bookOff = !authUserId || !online;
    const one = rail ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))";
    const aboutRows = [
      about ? { h: t("About this class"), b: about, span: 2 } : null,
      level ? { h: t("Level"), b: level, span: 1 } : null,
      bring ? { h: t("What to bring"), b: bring, span: 1 } : null,
    ].filter((x): x is { h: string; b: string; span: number } => !!x);
    return (
      <div data-class-web="" style={{ lineHeight: "normal", color: m.ink }}>
        <style>{FOCUS_CSS}</style>
        <VenueWebHeader
          rail={rail}
          kicker={t("Class")}
          title={c.title}
          onBack={back}
          after={
            <Link to={venueTo} className="market-focus" style={{ flexShrink: 0, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#7D67D9", textDecoration: "none", whiteSpace: "nowrap" }}>
              {venueOf(c)}
            </Link>
          }
        />
        <VenueWebBody
          rail={rail}
          left={
            <>
              <div style={{ display: "grid", gridTemplateColumns: one, gap: 16, alignItems: "stretch" }}>
                <div data-time-card="" style={{ borderRadius: 20, border: `0.5px solid ${WEB_HAIR}`, background: m.card, padding: 20, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: 12, lineHeight: "16px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: WEB_FAINT }}>{longDate(c.date)}</div>
                  <div style={{ marginTop: 6, fontSize: 34, lineHeight: "40px", fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", textWrap: "balance" }}>{range}</div>
                  <div aria-hidden style={{ margin: "12px auto 0", width: "64%", height: 4, borderRadius: 999, background: "#A79AD5" }} />
                  <div style={{ marginTop: 6, fontSize: 13, lineHeight: "20px", color: WEB_FAINT }}>{durationText(c.startTime, c.endTime)}</div>
                  {manyTimes && (
                    <button
                      type="button"
                      onClick={() => setPopup("times")}
                      aria-haspopup="dialog"
                      className="market-focus"
                      style={{ alignSelf: "center", marginTop: 6, padding: 0, border: 0, background: "none", font: "inherit", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#5F5093", cursor: "pointer" }}
                    >
                      {t("Other times")}
                    </button>
                  )}
                </div>
                <div data-seat-panel={tone} style={{ borderRadius: 20, padding: 20, background: tone === "almost" ? "#E6F1EF" : "#EEEAF8", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  {tone !== "open" && (
                    <div style={{ marginBottom: 12, fontSize: 15, lineHeight: "22px", fontWeight: 700, color: tone === "almost" ? "#2F5F58" : "#7D6BB5" }}>{tone === "almost" ? t("Almost full") : t("Class full")}</div>
                  )}
                  {cap > 0 &&
                    (seats.kind === "dots" ? (
                      <div aria-hidden data-seats="dots" style={{ display: "grid", gridTemplateColumns: `repeat(${seats.cols},1fr)`, rowGap: 10, justifyItems: "center" }}>
                        {seats.seats.map((x, i) => (
                          <span key={i} style={{ width: 18, height: 18, borderRadius: 999, boxSizing: "border-box", background: x ? "#AEA1DC" : "#E6F1EF", border: x ? "none" : "1.5px solid #4F8F8A" }} />
                        ))}
                      </div>
                    ) : (
                      <div aria-hidden data-seats="bar" style={{ display: "flex", gap: 2 }}>
                        {seats.seats.map((x, i) => (
                          <span key={i} style={{ flex: 1, height: 10, borderRadius: 2, boxSizing: "border-box", background: x ? "#AEA1DC" : "#E6F1EF", border: `1px solid ${x ? "#AEA1DC" : "#4F8F8A"}` }} />
                        ))}
                      </div>
                    ))}
                  <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 22, lineHeight: "30px", fontWeight: 700, color: "#7D67D9", fontVariantNumeric: "tabular-nums" }}>{t("{n} of {total}", { n: left, total: cap })}</span>
                    <span style={{ fontSize: 15, lineHeight: "24px", color: WEB_INK2 }}>{t("spots left")}</span>
                  </div>
                </div>
              </div>
              {listed ? (
                <InstructorCard
                  listed
                  id={c.instructorId!}
                  name={c.instructorName!}
                  photoUrl={c.instructorAvatarUrl ?? null}
                  specialty={c.instructorSpecialty ?? t("Instructor")}
                  rating={c.instructorRating ?? null}
                  reviewCount={c.instructorReviewCount ?? 0}
                  hiredViaCentium={hiredViaCentium(c)}
                  to={`/app/professionals/${encodeURIComponent(c.instructorId!)}`}
                  web
                />
              ) : (
                <InstructorCard listed={false} web />
              )}
              <MarketOffline loaded />
              {online && loadFailed && <MarketError thing={tk("this class")} onRetry={() => void load()} />}
              {error && <ConfirmationStrip tone="error" text={error} still />}
              {note && <ConfirmationStrip tone="neutral" text={note} />}
              {aboutRows.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: one, gap: "16px 24px" }}>
                  {aboutRows.map((a) => (
                    <WebTextSection key={a.h} label={a.h} style={{ gridColumn: `span ${rail ? 1 : a.span}` }}>
                      {a.b}
                    </WebTextSection>
                  ))}
                </div>
              )}
              {c.playlistUrl && (
                <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <WebCaps>{t("Music")}</WebCaps>
                  <MusicSection moment="workout" provider={{ url: c.playlistUrl, heading: t("{name}'s playlist", { name: c.businessName }) }} />
                </section>
              )}
              {copied && <ConfirmationStrip tone="teal" text={copied} />}
            </>
          }
          right={
            <>
              <div data-booking-panel="" style={{ borderRadius: 20, border: `0.5px solid ${WEB_HAIR}`, background: m.card, padding: 16, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 8px 24px rgba(36,31,27,0.06)" }}>
                {open ? (
                  <>
                    <p style={{ margin: 0, display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: 6 }}>
                      <span style={{ fontSize: 28, lineHeight: "36px", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{priceText}</span>
                      {!free && <span style={{ fontSize: 15, lineHeight: "24px", color: WEB_FAINT }}>{t("Pay at the front desk before class")}</span>}
                    </p>
                    <WebPanelCta
                      label={t("Book · {price}", { price: priceText })}
                      disabled={bookOff}
                      onClick={() => {
                        if (bookOff) return;
                        recordListingEvent({ businessId: c.businessId, kind: "book_tap", source: listingSource, itemId: c.classId });
                        setSheetError(null);
                        setPopup("sheet");
                      }}
                    />
                    <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: WEB_FAINT }}>{[windowLine, cancellationLine(windowHours)].filter(Boolean).join(" ")}</p>
                    <ClassPremiumLines businessId={c.businessId} startsAt={live?.startsAt ?? c.startsAt ?? null} windowDays={live?.rules?.bookingWindowDays ?? null} waitlist={false} />
                  </>
                ) : (
                  <PinnedInline.Provider value>
                    {pinned}
                    {!mine && <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: WEB_FAINT }}>{[windowLine, cancellationLine(windowHours)].filter(Boolean).join(" ")}</p>}
                    {!mine && <ClassPremiumLines businessId={c.businessId} startsAt={live?.startsAt ?? c.startsAt ?? null} windowDays={live?.rules?.bookingWindowDays ?? null} waitlist={full || position !== null} />}
                  </PinnedInline.Provider>
                )}
              </div>
              <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <WebCaps>{t("Location")}</WebCaps>
                <WebMapCard
                  height={110}
                  address={address || null}
                  label={address ? t("Directions to {address}", { address }) : t("Directions")}
                  onOpen={
                    address || venueCoords
                      ? (el) => {
                          setDirAnchor(el as HTMLButtonElement);
                          setDirOpen(true);
                        }
                      : undefined
                  }
                >
                  {distance && <div style={{ fontSize: 13, lineHeight: "20px", color: WEB_FAINT }}>{t("{distance} away", { distance })}</div>}
                </WebMapCard>
              </section>
            </>
          }
        />
        {overlays}
      </div>
    );
  }
  return (
    <div style={{ lineHeight: "normal", color: m.ink }}>
      <style>{FOCUS_CSS}</style>
      <CompactHeader
        title={c.title}
        onBack={back}
        shown={compactShown}
        hairline
        headerRef={setHeaderEl}
      />
      {header}
      <h1
        ref={setNameEl}
        style={{
          margin: "6px 0 0",
          fontSize: textPx(24),
          lineHeight: linePx(30),
          fontWeight: 800,
          overflowWrap: "anywhere",
        }}
      >
        {c.title}
      </h1>
      <Link
        to={venueTo}
        className="market-focus hit"
        style={{
          display: "block",
          width: "fit-content",
          marginTop: 2,
          fontSize: textPx(13),
          fontWeight: 600,
          color: m.accent,
          textDecoration: "none",
        }}
      >
        {venueOf(c)}
      </Link>

      {/* The time card and the seat panel. */}
      <div
        data-time-card=""
        style={{
          marginTop: 14,
          borderRadius: 20,
          border: `0.5px solid ${m.hair}`,
          background: m.card,
          padding: "18px 16px 16px",
          textAlign: "center",
        }}
      >
        {manyTimes ? (
          <button
            type="button"
            onClick={() => setPopup("times")}
            aria-haspopup="dialog"
            aria-label={t("{date}. Other times", { date: longDate(c.date) })}
            className="tap market-focus"
            style={{
              ...dateLine,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: 0,
              padding: 0,
              font: "inherit",
              fontSize: textPx(11),
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {longDate(c.date)}
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              style={NO_ICON_SCALE}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        ) : (
          <div style={dateLine}>{longDate(c.date)}</div>
        )}
        <div
          style={{
            marginTop: 4,
            fontSize: textPx(34),
            lineHeight: linePx(40),
            fontWeight: 700,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            textWrap: "balance",
          }}
        >
          {range}
        </div>
        <div
          aria-hidden
          style={{
            margin: "12px auto 0",
            width: "64%",
            height: 4,
            borderRadius: 999,
            background: m.segactive,
          }}
        />
        <div style={{ marginTop: 6, fontSize: textPx(11.5), color: m.faint }}>
          {durationText(c.startTime, c.endTime)}
        </div>
        <div
          data-seat-panel={tone}
          style={{
            marginTop: 18,
            borderRadius: 16,
            padding: 20,
            background: tone === "almost" ? sc.almost : sc.open,
          }}
        >
          {tone !== "open" && (
            <div
              style={{
                marginBottom: 12,
                fontSize: textPx(13),
                fontWeight: 700,
                color: tone === "almost" ? sc.almostInk : m.ink2,
              }}
            >
              {tone === "almost" ? t("Almost full") : t("Class full")}
            </div>
          )}
          {cap > 0 &&
            (seats.kind === "dots" ? (
              <div
                aria-hidden
                data-seats="dots"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${seats.cols},minmax(0,1fr))`,
                  rowGap: 10,
                  justifyItems: "center",
                }}
              >
                {seats.seats.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      width: 17,
                      height: 17,
                      borderRadius: 999,
                      boxSizing: "border-box",
                      background: t ? sc.taken : sc.freeBg,
                      border: `1.5px solid ${t ? sc.taken : sc.freeRing}`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div
                aria-hidden
                data-seats="bar"
                style={{ display: "flex", gap: 2 }}
              >
                {seats.seats.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      flex: 1,
                      height: 10,
                      borderRadius: 2,
                      boxSizing: "border-box",
                      background: t ? sc.taken : sc.freeBg,
                      border: `1px solid ${t ? sc.taken : sc.freeRing}`,
                    }}
                  />
                ))}
              </div>
            ))}
          <div
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: textPx(20),
                fontWeight: 700,
                color: sc.fig,
                fontVariantNumeric: "tabular-nums",
              }}
            >{t("{n} of {total}", { n: left, total: cap })}</span>
            <span
              style={{ fontSize: textPx(14), fontWeight: 400, color: m.ink2 }}
            >
              {t("spots left")}
            </span>
          </div>
        </div>
      </div>

      {/* The Team-only rule (instructorRule.ts). */}
      {listed ? (
        <InstructorCard
          listed
          id={c.instructorId!}
          name={c.instructorName!}
          photoUrl={c.instructorAvatarUrl ?? null}
          specialty={c.instructorSpecialty ?? t("Instructor")}
          rating={c.instructorRating ?? null}
          reviewCount={c.instructorReviewCount ?? 0}
          hiredViaCentium={hiredViaCentium(c)}
          to={`/app/professionals/${encodeURIComponent(c.instructorId!)}`}
          style={{ marginTop: 12 }}
        />
      ) : (
        <InstructorCard listed={false} style={{ marginTop: 12 }} />
      )}

      {/* The page's strips: offline, a failed refresh, a refusal, a note. */}
      <MarketOffline loaded style={{ marginTop: 12 }} />
      {online && loadFailed && (
        <MarketError
          thing={tk("this class")}
          onRetry={() => void load()}
          style={{ marginTop: 12 }}
        />
      )}
      {error && (
        <ConfirmationStrip
          tone="error"
          text={error}
          still
          style={{ marginTop: 12 }}
        />
      )}
      {note && (
        <ConfirmationStrip
          tone="neutral"
          text={note}
          style={{ marginTop: 12 }}
        />
      )}

      {about && (
        <>
          <h2 style={{ ...caps, marginTop: 18 }}>{t("About this class")}</h2>
          <p style={body}>{about}</p>
        </>
      )}
      {/* Round E: the gym's playlist for this class, and the member's own
          workout music beside it when they have one. The gym sets it, so it
          goes under the gym's name (the instructor may change). Nothing shows
          when the class has none. */}
      {c.playlistUrl && (
        <>
          <h2 style={{ ...caps, marginTop: 18 }}>{t("Music")}</h2>
          <MusicSection moment="workout" provider={{ url: c.playlistUrl, heading: t("{name}'s playlist", { name: c.businessName }) }} style={{ marginTop: 8 }} />
        </>
      )}
      {level && (
        <>
          <h2 style={{ ...caps, marginTop: 18 }}>{t("Level")}</h2>
          <p style={body} data-class-level="">
            {level}
          </p>
        </>
      )}
      {bring && (
        <>
          <h2 style={{ ...caps, marginTop: 18 }}>{t("What to bring")}</h2>
          <p style={body} data-what-to-bring="">
            {bring}
          </p>
        </>
      )}
      {/* BR-14's window and the booking window (CL-05), from class_booking_rules(). */}
      <p
        style={{
          margin: "14px 0 0",
          fontSize: textPx(12),
          lineHeight: linePx(18),
          color: m.faint,
        }}
      >
        {cancellationLine(windowHours)}
      </p>
      {windowLine && (
        <p
          style={{
            margin: 0,
            fontSize: textPx(12),
            lineHeight: linePx(18),
            color: m.faint,
          }}
          data-booking-window=""
        >
          {windowLine}
        </p>
      )}
      {/* Round G2: Premium's early booking and waitlist priority (only with the switch on). */}
      {!mine && (
        <ClassPremiumLines businessId={c.businessId} startsAt={live?.startsAt ?? c.startsAt ?? null} windowDays={live?.rules?.bookingWindowDays ?? null} waitlist={full || position !== null} />
      )}

      {/* Location: the venue's address and coordinates (PB-O-50); opens Directions. */}
      <h2 style={{ ...caps, marginTop: 18 }}>{t("Location")}</h2>
      <div style={{ marginTop: 8 }}>
        <MapCard
          address={[address, distance].filter(Boolean).join(" · ") || null}
          onOpen={
            address || venueCoords
              ? (e) => {
                  setDirAnchor(e.currentTarget);
                  setDirOpen(true);
                }
              : undefined
          }
        />
      </div>
      {copied && (
        <ConfirmationStrip
          tone="teal"
          text={copied}
          style={{ marginTop: 12 }}
        />
      )}

      {/* Room for whatever is pinned over the bottom (the shell keeps 112 for the navbar). */}
      <div
        aria-hidden
        style={{
          height: mine ? 170 : position !== null ? 200 : full ? 160 : 68,
        }}
      />

      {pinned}

      {overlays}
    </div>
  );
}

const spotsText = (n: number) =>
  n <= 0 ? t("Full") : tn(n, "{n} spot", "{n} spots");

/** Other times (full / waitlist): the caps label and up to three chips (the time 12 / 700, the spots 10.5 / 600 --tealink). */
function OtherTimes({
  others,
  onOpen,
  m,
}: {
  others: MarketplaceClass[];
  onOpen: (id: string) => void;
  m: MarketPalette;
}) {
  return (
    <>
      <h2
        style={{
          margin: 0,
          fontSize: textPx(10.5),
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: m.faint,
        }}
      >
        {t("Other times")}
      </h2>
      <div style={{ display: "flex", gap: 8 }}>
        {others.map((o) => (
          <button
            key={o.classId}
            type="button"
            onClick={() => onOpen(o.classId)}
            className="tap market-focus"
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 44,
              borderRadius: 14,
              border: `0.5px solid ${m.hair}`,
              background: m.card,
              padding: "8px 4px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontSize: textPx(12),
                fontWeight: 700,
                color: m.ink,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {shortDate(o.date).split(",")[0]} {time12(o.startTime)}
            </span>
            <span
              style={{
                fontSize: textPx(10.5),
                fontWeight: 600,
                color: o.isFull ? m.high : m.tealink,
              }}
            >
              {o.isFull ? t("Full") : spotsText(o.spotsRemaining)}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

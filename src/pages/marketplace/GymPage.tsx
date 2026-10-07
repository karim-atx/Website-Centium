import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  BadgeCheck,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  Copy,
  MessageCircle,
  Navigation,
  Phone,
  QrCode,
  Star,
  Wallet,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { CtaButton } from "../../components/ui/PinnedCta";
import { BrandMark } from "../../components/ui/ThemedMark";
import { initials } from "../../components/professionals/typeColour";
import { MembershipPass } from "../../components/marketplace/MembershipPass";
import { MemberTag } from "../../components/marketplace/MemberTag";
import { GymReviews } from "../../components/marketplace/GymReviews";
import { startVenueThread } from "../../services/messaging";
import {
  fetchBusinessOwner,
  fetchMyGymMemberships,
  fetchPlansFor,
  fetchReviewSummary,
  fetchVenue,
  type ReviewSummary,
  purchaseGymMembership,
  type GymMembership,
  type Venue,
  type VenuePlan,
} from "../../services/venues";
import { addDaysIso, currentMembership, memberTag, PERIOD, planSaving, sortPlans } from "../../services/venues/venueLogic";
import { bookClass, fetchGymClassesThisWeek, type GymClass } from "../../services/marketplace";
import { formatPrice } from "../../utils/price";
import { DetailHero, DetailLabel, MapCard } from "./venueParts";

// MO1.4.2.1 Gym page, with its tabs (About, Classes, Memberships MO1.4.2.2,
// Reviews MO1.4.2.3), Directions (MO1.4.2.4), Call (MO1.4.2.5), membership
// checkout (MO1.4.2.2.1), the confirmed screen and pass (MO1.4.2.2.2, .2.4,
// .2.5), the member state (MO1.4.2.2.3) and Book a class (MO1.4.2.1.1).
// Opened by a gym card on Explore › Gyms (/app/marketplace/gym?id=…).
//
// WIRED TO BACKEND STAGE 4a / 4b / 4c (Database docs/HANDOVER_API.md):
// the venue is a public.gyms row (address, coordinates, phones, entry
// methods); plans are its business's membership_plans; buying one is
// purchase_gym_membership() (a PENDING cash membership — BR-04, nothing moves
// money; the amber "Pay on your first visit" tag shows until the gym marks it
// paid); the member state and the pass come from my_gym_memberships(), whose
// pass_state is the one derived truth (never re-derived here); this week's
// classes are business_classes.gym_id, booked through book_class().
//
// NOT BUILT, AND WHY (nothing here is faked):
// - Cover photo, logo upload, opening hours, amenities: no columns in 4a.
// - Reviews (4d) are GymReviews.tsx; the rating pill reads
//   gym_review_summary(). Message (4d) starts the normal thread with the
//   venue's own thread (start_venue_thread: one per member and venue,
//   titled with the venue, separate from any direct chat with the owner) and opens it in
//   Messages; MO1.4.2.6's gym-styled empty thread (suggested questions,
//   "Usually replies within an hour") isn't built: the thread view is shared
//   and no reply-time data exists.
// - Distance: the app has no location for the viewer on this page.
// - A start date at checkout: purchase_gym_membership() takes none (a
//   membership starts the day it's bought), so the field shows today, fixed.
// - Whish Money: on the enum since stage 5 but not wired (a 'whish' purchase
//   would stay pending like cash), so it's drawn, not choosable, as the
//   frame draws the option and the class booking popup does.
// - Plan features ("Full gym access 24/7"), "Popular", a joining fee and
//   renewal: membership_plans has name, price and billing only, and a
//   membership has an expiry, not a renewal. Yearly "Save N%" is computed
//   against twelve months of the cheapest monthly plan (the frame's numbers).
// - Cancelling a membership: no member-side function in 4b.

type Tab = "about" | "classes" | "memberships" | "reviews";
type Dir = "apple" | "google" | "copy";

const isIOS = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

/** Local calendar date as YYYY-MM-DD. */
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** "Thu, Oct 1, 2026" (MO1.4.2.2.1 Start date). */
const longDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

export function GymPage({ gymId }: { gymId: string }) {
  const { profileReady, user } = useApp();
  const navigate = useNavigate();
  const back = useBack("/app/marketplace?tab=gyms");
  const [gym, setGym] = useState<Venue | null | undefined>(undefined);
  const [plans, setPlans] = useState<VenuePlan[]>([]);
  const [memberships, setMemberships] = useState<GymMembership[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("about");
  const [dirAnchor, setDirAnchor] = useState<HTMLButtonElement | null>(null);
  const [dirOpen, setDirOpen] = useState(false);
  const [callAnchor, setCallAnchor] = useState<HTMLButtonElement | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [view, setView] = useState<"page" | "confirmed">("page");
  const [passOpen, setPassOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [week, setWeek] = useState<GymClass[] | null>(null);
  const [weekError, setWeekError] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    const r = await fetchReviewSummary(gymId);
    if (r.ok) setSummary(r.value);
  }, [gymId]);

  const loadMemberships = useCallback(async () => {
    const r = await fetchMyGymMemberships();
    if (r.ok) setMemberships(r.value);
    return r;
  }, []);

  useEffect(() => {
    if (!profileReady) return;
    let live = true;
    void (async () => {
      const [venue] = await Promise.all([fetchVenue(gymId), loadMemberships(), loadSummary()]);
      if (!live) return;
      if (!venue.ok) {
        setError(venue.message);
        setGym(null);
        return;
      }
      setGym(venue.value);
      if (venue.value?.businessId) {
        void fetchBusinessOwner(venue.value.businessId).then((o) => live && setOwner(o));
        const p = await fetchPlansFor([venue.value.businessId]);
        if (!live) return;
        if (p.ok) {
          const sorted = sortPlans(p.value);
          setPlans(sorted);
          setPlanId((cur) => cur ?? sorted[0]?.id ?? null);
        } else setError(p.message);
      }
    })();
    return () => {
      live = false;
    };
  }, [profileReady, gymId, loadMemberships, loadSummary]);

  const mine = useMemo(() => currentMembership(memberships, gymId), [memberships, gymId]);
  const plan = plans.find((p) => p.id === planId) ?? null;

  const openBook = async () => {
    setBookOpen(true);
    setBookError(null);
    setWeek(null);
    setWeekError(null);
    const today = todayIso();
    const r = await fetchGymClassesThisWeek(gymId, today, addDaysIso(today, 6));
    if (!r.ok) {
      setWeekError(r.message);
      setWeek([]);
      return;
    }
    // A class earlier today has started; book_class() would refuse it (ATX86).
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const upcoming = r.value.filter((c) => c.date > today || c.startTime > hhmm);
    setWeek(upcoming);
    setClassId(upcoming.find((c) => c.seatsLeft > 0)?.classId ?? null);
  };

  if (gym === undefined) {
    return (
      <div aria-busy="true">
        <DetailHero height={240} onBack={back} />
        <div className="flex flex-col gap-3 pt-14">
          <div className="h-[30px] w-1/2 rounded-xl bg-cream-soft animate-pulse" />
          <div className="h-[42px] rounded-xl bg-cream-soft animate-pulse" />
          <div className="h-[50px] rounded-2xl bg-cream-soft animate-pulse" />
        </div>
      </div>
    );
  }
  if (!gym) {
    return (
      <div>
        <DetailHero height={240} onBack={back} />
        <p role={error ? "alert" : undefined} className={`mt-6 text-center text-[13px] ${error ? "font-semibold text-status-high" : "text-charcoal-faint"}`}>
          {error ?? "This gym isn't listed on Explore right now."}
        </p>
      </div>
    );
  }

  // MO1.4.2.2.2: the confirmed screen, in place of the page until Done.
  if (view === "confirmed" && mine) {
    return (
      <div className="flex flex-col items-center text-center">
        <BrandMark width={70} height={76} className="mt-1.5" />
        <h1 className="mt-3 mb-0 text-[23px] font-extrabold leading-[1.25] tracking-[-0.02em] text-th-5f5093 dark:text-primary-dark">Welcome to {gym.name}</h1>
        <p className="mt-1.5 mb-0 text-[13px] text-charcoal-soft">Your membership starts today.</p>
        <div className="mt-[17px] w-full">
          <MembershipPass membership={mine} gymLocation={gym.location} memberName={user.firstName} />
        </div>
        <div aria-hidden style={{ height: 60 }} />
        <PinnedCta
          primary={{
            label: "Done",
            onClick: () => setView("page"),
            className: "!bg-th-9a8cd6 !text-white dark:!bg-primary-fill dark:!text-on-primary-fill",
          }}
        />
      </div>
    );
  }

  const hasCoords = gym.lat !== null && gym.lng !== null;
  const dest = hasCoords ? `${gym.lat},${gym.lng}` : gym.location;
  const copy = (text: string, note: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(note);
        setTimeout(() => setCopied(null), 1600);
      },
      () => undefined
    );
  };
  const directions = (d: Dir) => {
    if (d === "copy") return copy(gym.location, "Address copied");
    const q = encodeURIComponent(dest);
    const url = d === "apple" ? `https://maps.apple.com/?daddr=${q}` : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  // MO1.4.2.5: a number hands off to the phone's dialer (tel:); Copy number
  // copies the first (the frame draws one Copy row).
  const call = (v: string) => {
    if (v === "copy") return copy(gym.phones[0], "Number copied");
    const phone = gym.phones[Number(v)];
    if (phone) window.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
  };

  // MO1.4.2.1 #5: three outline buttons, 42 tall, gap 8, radius 12, 1 px
  // primary, 13/700 primary.accent with a 15/1.75 icon.
  const action = (label: string, Icon: typeof Phone, onClick: ((e: React.MouseEvent<HTMLButtonElement>) => void) | null) => (
    <button
      type="button"
      onClick={onClick ?? undefined}
      disabled={!onClick}
      aria-haspopup={label === "Message" ? undefined : "menu"}
      className="tap flex-1 min-w-0 h-[42px] rounded-xl border border-primary dark:border-primary-dark/50 inline-flex items-center justify-center gap-1.5 text-[13px] font-bold text-th-7d67d9 dark:text-primary-dark disabled:opacity-40"
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden />
      {label}
    </button>
  );

  const tag = mine ? memberTag(mine.passState) : null;
  const priceOf = (p: VenuePlan) => formatPrice(p.price) || "$0";
  const buyable = !!gym.businessId;
  const ctaClass = "!bg-th-9a8cd6 !text-white dark:!bg-primary-fill dark:!text-on-primary-fill";
  const passCta = { label: "Show membership pass", icon: <QrCode size={16} strokeWidth={1.75} aria-hidden />, onClick: () => setPassOpen(true), className: ctaClass };

  // The pinned CTA per state (MO1.4.2.1 §11-12, MO1.4.2.2 #12, MO1.4.2.2.3
  // #8, MO1.4.2.2.1 note "Paid: … the CTA becomes Book a class"): a
  // non-member is sent to the plans; a paid member books a class; a member
  // whose membership isn't valid yet (the amber tag) shows their pass.
  const cta =
    tab === "about"
      ? mine
        ? mine.passValid
          ? { label: "Book a class", icon: <CalendarPlus size={16} strokeWidth={1.75} aria-hidden />, onClick: () => void openBook(), className: ctaClass }
          : passCta
        : { label: "View memberships", icon: <CalendarPlus size={16} strokeWidth={1.75} aria-hidden />, onClick: () => setTab("memberships"), className: ctaClass }
      : tab === "memberships"
      ? mine
        ? passCta
        : plan && buyable
        ? {
            label: `Book membership · ${priceOf(plan)}`,
            icon: <BadgeCheck size={16} strokeWidth={1.75} aria-hidden />,
            onClick: () => {
              setCheckoutError(null);
              setCheckoutOpen(true);
            },
            className: ctaClass,
          }
        : null
      : null;

  return (
    <div>
      <DetailHero height={240} onBack={back}>
        {/* MO1.4.2.1 #2: the logo, a 64 r18 tile with a 3 pt white ring,
            overlapping the hero's foot (y 212). 4a stores no logo: the gym's
            initials, 20/800 white on #241F1B as drawn. */}
        <span className="absolute left-4 -bottom-9 w-[70px] h-[70px] rounded-[21px] bg-cream-card p-[3px]">
          <span className="w-full h-full rounded-[18px] bg-charcoal dark:bg-cream-soft flex items-center justify-center text-[20px] font-extrabold text-white dark:text-charcoal">
            {initials(gym.name)}
          </span>
        </span>
      </DetailHero>

      {/* MO1.4.2.1 #3: the name 22/800 with the Member tag on the right; the
          place 12.5/400 text.muted. */}
      <div className="mt-[46px] flex items-start gap-2.5">
        <h1 className="m-0 flex-1 min-w-0 text-[22px] font-extrabold leading-[1.25] tracking-[-0.02em] text-charcoal">{gym.name}</h1>
        {tag && <MemberTag label={tag.label} tone={tag.tone} className="mt-1" />}
      </div>
      {gym.location && <p className="mt-1 text-[12.5px] text-charcoal-faint">{gym.location}</p>}
      {/* MO1.4.2.1 #4: the rating pill, 24 tall: #FBF3E2 with a 1 px #D9A441
          edge, Star 11 gold, "4.0 · 3 reviews" 11.5/700 #9A7424 (fixed in
          every theme; dark: gold-pale / #CAB082). From gym_review_summary(),
          which leaves redacted reviews out. */}
      {summary && summary.total > 0 && (
        <span className="mt-2 inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border border-[#D9A441] bg-[#FBF3E2] dark:bg-gold-pale text-[11.5px] font-bold text-[#9A7424] dark:text-[#CAB082] tabular-nums">
          <Star size={11} strokeWidth={1.5} className="fill-[#D9A441] text-[#D9A441]" aria-hidden />
          {summary.average.toFixed(1)} · {summary.total} {summary.total === 1 ? "review" : "reviews"}
        </span>
      )}

      <div className="mt-[14px] flex gap-2">
        {action("Directions", Navigation, dest ? (e) => { setDirAnchor(e.currentTarget); setDirOpen(true); } : null)}
        {action("Call", Phone, gym.phones.length > 0 ? (e) => { setCallAnchor(e.currentTarget); setCallOpen(true); } : null)}
        {/* MO1.4.2.6 (4d): a customer may cold-message the owner of an
            active business with a visible venue; a minor may not, and a
            hidden venue or inactive business takes no new conversation. The
            doc's error shows under the row. */}
        {action(
          "Message",
          MessageCircle,
          owner && !msgBusy
            ? async () => {
                setMsgBusy(true);
                setMsgError(null);
                const r = await startVenueThread(gym.id);
                if (!r.ok) {
                  setMsgBusy(false);
                  setMsgError(r.message);
                  return;
                }
                navigate("/app/messages", { state: { threadId: r.threadId } });
              }
            : null
        )}
      </div>
      {msgError && (
        <p role="alert" className="mt-2 mb-0 text-[12px] font-semibold text-status-high">
          {msgError}
        </p>
      )}

      {/* MO1.4.2.1 #6: the gym page's segmented tabs, 38 tall in a 50 track,
          labels 12/700. Classes opens Explore › Classes (interaction 6). */}
      <SegmentedTabs
        className="mt-4"
        size="compact"
        labelSize={12}
        items={[
          { key: "about", label: "About" },
          { key: "classes", label: "Classes" },
          { key: "memberships", label: "Memberships", weight: 1.4 },
          { key: "reviews", label: "Reviews" },
        ]}
        activeKey={tab}
        onChange={(k) => (k === "classes" ? navigate("/app/marketplace") : setTab(k as Tab))}
      />

      {error && (
        <p role="alert" className="mt-3 mb-0 text-[12px] font-semibold text-status-high">
          {error}
        </p>
      )}

      {tab === "about" && (
        <div className="mt-4 flex flex-col">
          {gym.bio && <p className="m-0 text-[14px] leading-[1.6] text-charcoal-soft whitespace-pre-wrap [overflow-wrap:anywhere]">{gym.bio}</p>}
          {(gym.location || hasCoords) && (
            <>
              <DetailLabel className={gym.bio ? "mt-[22px]" : ""}>Location</DetailLabel>
              <div className="mt-2">
                <MapCard address={gym.location} />
              </div>
            </>
          )}
        </div>
      )}

      {tab === "memberships" &&
        (mine ? (
          // The member's Memberships tab (not drawn): their plan, its tag
          // and dates, and the pass CTA (MO1.4.2.2.3's).
          <div className="mt-4 rounded-[18px] border-[1.5px] border-charcoal/10 bg-cream-card px-4 py-3.5 flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-charcoal truncate">{mine.planName}</span>
              <span className="block text-[11.5px] text-charcoal-faint tabular-nums">
                {formatPrice(mine.priceAgreed) || "$0"} · {mine.expiresOn ? `until ${new Date(`${mine.expiresOn}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "no end date"}
              </span>
            </span>
            {tag && <MemberTag label={tag.label} tone={tag.tone} />}
          </div>
        ) : !buyable ? (
          <Empty icon={<BadgeCheck size={26} strokeWidth={1.75} />} title="No memberships yet" line="This gym doesn't sell memberships on Centium yet." />
        ) : plans.length === 0 ? (
          <Empty icon={<BadgeCheck size={26} strokeWidth={1.75} />} title="No memberships yet" line="Plans from this gym will show here." />
        ) : (
          <div className="mt-4 flex flex-col">
            {/* MO1.4.2.2 #7: 13/400 text.secondary. The frame's "start on the
                date you pick" isn't so: a membership starts the day it's
                bought. */}
            <p className="m-0 text-[13px] leading-[1.5] text-charcoal-soft">Choose a membership. Access starts on the day you book.</p>
            <div role="radiogroup" aria-label="Memberships" className="mt-2.5 flex flex-col gap-2.5">
              {plans.map((p) => {
                const on = p.id === planId;
                const save = planSaving(p, plans);
                return (
                  // MO1.4.2.2 #8–10: 358 wide, padding 14 16, r18, 1.5 px
                  // rgba(36,31,27,.1) edge; the selected one #7D67D9 with a
                  // soft ring. Radio 18, name 15/700, price 17/800 with its
                  // unit 11.5/400; a "Save N%" line 12.5/400 by a dot.
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPlanId(p.id)}
                    className={`tap w-full text-start rounded-[18px] bg-cream-card px-4 py-3.5 border-[1.5px] ${
                      on ? "border-th-7d67d9 dark:border-primary-dark ring-[3px] ring-primary-pale" : "border-charcoal/10"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className={`w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 ${
                          on ? "bg-th-9a8cd6 text-white dark:bg-primary-fill dark:text-on-primary-fill" : "border-[1.5px] border-charcoal/[0.18]"
                        }`}
                      >
                        {on && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="flex-1 min-w-0 text-[15px] font-bold text-charcoal truncate">{p.name}</span>
                      <span className="shrink-0 text-[17px] font-extrabold text-charcoal tabular-nums">
                        {priceOf(p)}
                        <span className="text-[11.5px] font-normal text-charcoal-faint">/{PERIOD[p.billing]}</span>
                      </span>
                    </span>
                    {save !== null && (
                      <span className="mt-2 ms-7 flex items-center gap-2 text-[12.5px] text-charcoal-soft">
                        <span aria-hidden className="w-[5px] h-[5px] rounded-full bg-th-7d67d9 dark:bg-primary-dark" />
                        Save {save}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* MO1.4.2.2 #11, 12/400 text.muted: cash only until stage 5,
                and no renewal (a membership expires). */}
            <p className="mt-3 mb-0 text-[12px] leading-[1.5] text-charcoal-faint">Pay in cash at the gym on your first visit. Whish Money is coming soon.</p>
          </div>
        ))}

      {tab === "reviews" && <GymReviews gymId={gym.id} gymName={gym.name} summary={summary} onChanged={() => void loadSummary()} />}

      {copied && (
        <p role="status" className="mt-3 text-center text-[12px] font-semibold text-charcoal-soft">
          {copied}
        </p>
      )}

      {cta && (
        <>
          <div aria-hidden style={{ height: 60 }} />
          <PinnedCta primary={cta} />
        </>
      )}

      {/* MO1.4.2.4: Directions opens the ⋮ menu under the button: Apple Maps
          (iPhone only), Google Maps, Copy address (BR-08; no Waze). The
          destination is the venue's coordinates, else its address. */}
      <PopupMenu<Dir>
        open={dirOpen}
        onClose={() => setDirOpen(false)}
        anchor={dirAnchor}
        align="left"
        width={220}
        options={[
          ...(isIOS() ? [{ value: "apple" as const, label: "Apple Maps", icon: <Navigation size={15} strokeWidth={1.75} /> }] : []),
          { value: "google" as const, label: "Google Maps", icon: <Navigation size={15} strokeWidth={1.75} /> },
          ...(gym.location ? [{ value: "copy" as const, label: "Copy address", note: gym.location, icon: <Copy size={15} strokeWidth={1.75} /> }] : []),
        ]}
        onSelect={directions}
      />

      {/* MO1.4.2.5: the gym's numbers (public_phones, in order) and Copy
          number. 4a stores no label per number ("Reception"), so each row is
          the number itself. */}
      <PopupMenu<string>
        open={callOpen}
        onClose={() => setCallOpen(false)}
        anchor={callAnchor}
        align="left"
        width={220}
        options={[
          ...gym.phones.map((p, i) => ({ value: String(i), label: p, icon: <Phone size={16} strokeWidth={1.75} /> })),
          ...(gym.phones.length > 0 ? [{ value: "copy", label: "Copy number", icon: <Copy size={16} strokeWidth={1.75} /> }] : []),
        ]}
        onSelect={call}
      />

      {/* MO1.4.2.2.1: the checkout sheet (Lavender-header sheet). */}
      <BottomSheet
        open={checkoutOpen && !!plan}
        onClose={() => !busy && setCheckoutOpen(false)}
        title={`Join ${gym.name}`}
        footer={
          plan && (
            <CtaButton
              size="page"
              label={`Book membership · ${priceOf(plan)}`}
              icon={<BadgeCheck size={16} strokeWidth={1.75} aria-hidden />}
              loading={busy}
              className={ctaClass}
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                const r = await purchaseGymMembership(gym.id, plan.id);
                if (!r.ok) {
                  setBusy(false);
                  setCheckoutError(r.message);
                  // ATX83: they already hold one; show it.
                  if (r.code === "ATX83") await loadMemberships();
                  return;
                }
                await loadMemberships();
                setBusy(false);
                setCheckoutOpen(false);
                setView("confirmed");
              }}
            />
          )
        }
      >
        {plan && (
          <div className="flex flex-col">
            {/* #14–16: the summary card, a 44 r12 logo tile, the name 14.5/700,
                the plan 12/400 muted, the price 15/800. */}
            <div className="rounded-2xl border border-charcoal/[0.08] bg-cream-card p-3.5 flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-charcoal dark:bg-cream-soft flex items-center justify-center shrink-0 text-[14px] font-extrabold text-white dark:text-charcoal" aria-hidden>
                {initials(gym.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-bold text-charcoal truncate">{gym.name}</span>
                <span className="block text-[12px] text-charcoal-faint">{plan.name} membership</span>
              </span>
              <span className="shrink-0 text-[15px] font-extrabold text-charcoal tabular-nums">{priceOf(plan)}</span>
            </div>

            <DetailLabel className="mt-[22px]">Start date</DetailLabel>
            {/* Drawn as a date field; purchase_gym_membership() starts a
                membership today and takes no date, so it is fixed. */}
            <div aria-disabled="true" className="mt-2.5 h-[46px] rounded-xl bg-cream-soft px-3.5 flex items-center gap-2.5 text-charcoal">
              <CalendarDays size={16} strokeWidth={1.75} className="text-charcoal-faint" aria-hidden />
              <span className="flex-1 text-[15px] font-medium">{longDate(new Date())}</span>
              <ChevronDown size={16} strokeWidth={1.75} className="text-charcoal-faint opacity-40" aria-hidden />
            </div>

            <DetailLabel className="mt-[22px]">Payment</DetailLabel>
            <div className="mt-2.5 flex flex-col gap-2" role="radiogroup" aria-label="Payment">
              {[
                { key: "whish", Icon: Wallet, name: "Whish Money", hint: "Pay now in the app", on: false, off: true },
                { key: "cash", Icon: Banknote, name: "Cash at the gym", hint: "Pay on your first visit", on: true, off: false },
              ].map((o) => (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={o.on}
                  disabled={o.off}
                  className={`w-full rounded-[14px] px-3 py-2.5 flex items-center gap-3 text-start bg-cream-card disabled:opacity-40 ${
                    o.on ? "border-[1.5px] border-th-7d67d9 dark:border-primary-dark ring-[3px] ring-primary-pale" : "border border-charcoal/[0.10]"
                  }`}
                >
                  <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0 text-th-7d67d9 dark:text-primary-dark" aria-hidden>
                    <o.Icon size={16} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-charcoal">{o.name}</span>
                    <span className="block text-[12px] text-charcoal-faint">{o.hint}</span>
                  </span>
                  <span
                    aria-hidden
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      o.on ? "bg-th-9a8cd6 text-white dark:bg-primary-fill dark:text-on-primary-fill" : "border-[1.5px] border-charcoal/[0.18]"
                    }`}
                  >
                    {o.on && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
              ))}
            </div>

            <DetailLabel className="mt-[22px]">Total</DetailLabel>
            <div className="mt-2.5 rounded-2xl border border-charcoal/[0.08] bg-cream-card p-3.5 flex flex-col gap-2 text-[13.5px] text-charcoal tabular-nums">
              <span className="flex justify-between gap-3">
                <span>{plan.name} membership</span>
                <span>${plan.price.toFixed(2)}</span>
              </span>
              <span className="h-px bg-charcoal/[0.08]" aria-hidden />
              <span className="flex justify-between gap-3 font-extrabold">
                <span>Total</span>
                <span>${plan.price.toFixed(2)}</span>
              </span>
            </div>
            <p className="mt-3 mb-0 text-[12px] leading-[1.5] text-charcoal-faint">
              Pay at the gym on your first visit. Your pass works once the gym marks it paid.
            </p>
            {checkoutError && (
              <p role="alert" className="mt-3 mb-0 text-[12px] font-semibold text-status-high">
                {checkoutError}
              </p>
            )}
          </div>
        )}
      </BottomSheet>

      {/* MO1.4.2.2.3: Show membership pass opens the same adaptive pass as a
          centred popup. */}
      <CentredPopup open={passOpen && !!mine} onClose={() => setPassOpen(false)} title={gym.name} maxWidth={390}>
        {mine && <MembershipPass membership={mine} gymLocation={gym.location} memberName={user.firstName} />}
        <button type="button" onClick={() => setPassOpen(false)} className="tap mt-2 w-full h-11 text-[14px] font-bold text-th-7d67d9 dark:text-primary-dark">
          Done
        </button>
      </CentredPopup>

      {/* MO1.4.2.1.1: Book a class (no ×; outside dismisses): this week's
          classes at this venue. Classes carry their own price (book_class()
          copies it), so the frame's "Included" pill shows the price. */}
      <CentredPopup
        open={bookOpen}
        onClose={() => !busy && setBookOpen(false)}
        title="Book a class"
        icon={<CalendarPlus size={22} strokeWidth={1.75} />}
        body={`${gym.name} · this week's classes`}
        bodyWeight={400}
      >
        <div className="text-start">
          <DetailLabel>This week</DetailLabel>
          {week === null ? (
            <div className="mt-2.5 h-[66px] rounded-2xl bg-cream-soft animate-pulse" aria-busy="true" />
          ) : week.length === 0 ? (
            <p className={`mt-2.5 mb-0 text-[12.5px] ${weekError ? "font-semibold text-status-high" : "text-charcoal-faint"}`} role={weekError ? "alert" : undefined}>
              {weekError ?? "No classes here this week."}
            </p>
          ) : (
            <div role="radiogroup" aria-label="This week" className="mt-2.5 flex flex-col gap-2">
              {week.map((c) => {
                const on = c.classId === classId;
                const full = c.seatsLeft <= 0;
                return (
                  <button
                    key={c.classId}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={full}
                    onClick={() => setClassId(c.classId)}
                    className={`tap w-full rounded-2xl bg-cream-card p-2.5 flex items-center gap-3 text-start disabled:opacity-40 ${
                      on ? "border-[1.5px] border-th-7d67d9 dark:border-primary-dark ring-[3px] ring-primary-pale" : "border border-charcoal/[0.08]"
                    }`}
                  >
                    <span className="w-[39px] h-9 rounded-[10px] bg-primary-pale flex flex-col items-center justify-center shrink-0" aria-hidden>
                      <span className="text-[10px] font-extrabold uppercase leading-none text-th-7d67d9 dark:text-primary-dark">
                        {new Date(`${c.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span className="mt-0.5 text-[13px] font-extrabold leading-none text-charcoal tabular-nums">{c.startTime}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-bold text-charcoal truncate">{c.title}</span>
                      <span className="block text-[12px] text-charcoal-faint">
                        {full ? "Full" : `${c.seatsLeft} ${c.seatsLeft === 1 ? "spot" : "spots"} left`}
                      </span>
                    </span>
                    <MemberTag label={c.price} tone="member" />
                  </button>
                );
              })}
            </div>
          )}
          {bookError && (
            <p role="alert" className="mt-2.5 mb-0 text-[12px] font-semibold text-status-high">
              {bookError}
            </p>
          )}
        </div>
        {week && week.length > 0 && (
          <CtaButton
            size="page"
            label="Confirm booking"
            loading={busy}
            disabled={!classId}
            className={`mt-5 ${ctaClass}`}
            onClick={async () => {
              if (!classId || busy) return;
              setBusy(true);
              const r = await bookClass(classId);
              setBusy(false);
              if (!r.ok) {
                setBookError(r.message);
                return;
              }
              setBookOpen(false);
              // MO1.4.2.1.1 interaction 10 → MO1.4.4.2 on the class page.
              navigate(`/app/marketplace/class?id=${encodeURIComponent(classId)}&booked=1`);
            }}
          />
        )}
        {/* "See all classes" under the CTA, 14/700 primary.accent → MO1.4. */}
        <button
          type="button"
          onClick={() => navigate("/app/marketplace")}
          className="tap mt-2 w-full h-9 text-[14px] font-bold text-th-7d67d9 dark:text-primary-dark"
        >
          See all classes
        </button>
      </CentredPopup>
    </div>
  );
}

/** Foundations › Empty state, as Explore's MO1.4.3 block. */
function Empty({ icon, title, line }: { icon: React.ReactNode; title: string; line: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2.5 px-6 pt-10">
      <span className="w-14 h-14 rounded-[18px] bg-primary-pale flex items-center justify-center text-th-7d67d9 dark:text-primary-dark">{icon}</span>
      <p className="m-0 text-[15px] font-bold text-charcoal">{title}</p>
      <p className="m-0 text-[12.5px] font-medium text-charcoal-faint leading-[1.55] max-w-[260px]">{line}</p>
    </div>
  );
}

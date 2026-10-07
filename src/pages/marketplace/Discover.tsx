import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { useIsDark } from "../../hooks/useIsDark";
import { initials } from "../../components/professionals/typeColour";
import { useApp } from "../../context/AppContext";
import { BUSINESS_TYPES, typeLabel } from "./venueTypes";
import {
  bookClass,
  cancelBooking,
  fetchMarketplaceClasses,
  fetchMarketplaceVenues,
  fetchMyBookedClassIds,
  type MarketplaceClass,
  type MarketplaceVenue,
} from "../../services/marketplace";
import { CalendarDays, Search, Store, Dumbbell, Check, Info, ChevronRight } from "lucide-react";

// Marketplace discovery: real classes, real venues, real bookings.
//
// WHAT THIS REPLACED. The browse screen listed `mockGyms` and `mockClasses`
// — invented venues with invented star ratings and offers — and the category
// pages listed `mockMarketplaceListings`, more of the same. None of it was
// bookable and none of it was real; a "4.7" next to a gym that does not exist
// is a claim about a business, and the app was making several.
//
// THE VIEWS DECIDE WHAT IS VISIBLE, not this screen. marketplace_classes is
// already filtered to listed businesses and to classes that have not happened
// yet, so there is no date check and no listing check here — writing one would
// be a second copy of a rule the database owns.
//
// MO1.4 – MO1.4.3 (R14, existing data only): one header (Marketplace's);
// Classes / Businesses / Gyms as segmented tabs; FO3 sub-tabs for price and,
// on Businesses, the type; class cards with a date block, a price tag and an
// inline Book (the class page needs a backend, B24); empty states in the
// Foundations block. No distances (venues have no coordinates, B25), no
// logos, covers or ratings (B26, B27).
//
// Decision 23 (kept list): one price rail (the class-type rail is gone; the
// search matches the type instead), a borderless search, a 24-hour date block
// that carries the date for a class a week or more out, the booked state in
// the Book slot with a centred confirm to cancel, and Businesses rows that
// open the business's page (bio, classes, perk and listings moved there).
//
// GYMS ARE EMPTY AND THAT IS A STATE, NOT A BUG. The gyms table has no rows
// until real partnerships exist, so the section says so plainly. Filling it
// with placeholders is exactly what this screen is replacing.

const priceCeilings = [
  { label: "Any price", value: null },
  { label: "Free", value: 0 },
  { label: "Under $15", value: 15 },
  { label: "Under $30", value: 30 },
];

type Tab = "classes" | "businesses" | "gyms";
const TABS: { key: Tab; label: string }[] = [
  { key: "classes", label: "Classes" },
  { key: "businesses", label: "Businesses" },
  { key: "gyms", label: "Gyms" },
];

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

/** A class 7 or more days out, whose weekday alone would not say which week. */
const farOff = (iso: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${iso}T00:00:00`).getTime() - today.getTime() >= 7 * 86_400_000;
};

/**
 * The date block's top line (decision 23, item 45): the weekday ("SAT"), or
 * for a class a week or more away the date ("OCT 18"), since the weekday alone
 * would not say which week. Upper-cased by the block's style.
 */
const blockDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return farOff(iso)
    ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : d.toLocaleDateString("en-US", { weekday: "short" });
};

export default function Discover() {
  const { authUserId, profileReady } = useApp();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<MarketplaceClass[]>([]);
  const [venues, setVenues] = useState<MarketplaceVenue[]>([]);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  // The tab lives in the URL, so coming back from a business's page (item 43)
  // lands on Businesses again rather than on Classes.
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "businesses" ? "businesses" : params.get("tab") === "gyms" ? "gyms" : "classes";
  const setTab = (t: Tab) => setParams(t === "classes" ? {} : { tab: t }, { replace: true });
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [infoFor, setInfoFor] = useState<MarketplaceClass | null>(null);
  // Item 77: a booked class's slot asks before it cancels.
  const [cancelFor, setCancelFor] = useState<MarketplaceClass | null>(null);
  const dark = useIsDark();

  // One loader for all three reads, so a refresh after a booking cannot leave
  // the list and the spot counts describing different moments.
  const load = async () => {
    const [cls, vns, mine] = await Promise.all([
      fetchMarketplaceClasses(),
      fetchMarketplaceVenues(),
      fetchMyBookedClassIds(),
    ]);
    setLoading(false);
    if (!cls.ok) {
      // A failed read keeps whatever is on screen — the rule every hydration
      // in this app follows. An empty marketplace and an unreachable server
      // look identical once rendered.
      setError(cls.message);
      return;
    }
    setError(null);
    setClasses(cls.classes);
    setBooked(mine);
    if (vns.ok) setVenues(vns.venues);
  };

  useEffect(() => {
    if (!profileReady) return;
    let cancelled = false;
    void (async () => {
      const [cls, vns, mine] = await Promise.all([
        fetchMarketplaceClasses(),
        fetchMarketplaceVenues(),
        fetchMyBookedClassIds(),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (!cls.ok) {
        setError(cls.message);
        return;
      }
      setError(null);
      setClasses(cls.classes);
      setBooked(mine);
      if (vns.ok) setVenues(vns.venues);
    })();
    return () => {
      cancelled = true;
    };
  }, [profileReady, authUserId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return classes.filter((c) => {
      // A free class has a null price and passes every ceiling including
      // "Free"; a priced one is compared against the ceiling.
      if (maxPrice !== null && (c.priceValue ?? 0) > maxPrice) return false;
      if (!q) return true;
      // Title, business, location and the class type (decision 23, item 31:
      // the type rail is gone, so typing "yoga" finds the yoga classes).
      return [c.title, c.businessName, c.location ?? "", c.classType ?? ""].some((f) => f.toLowerCase().includes(q));
    });
  }, [classes, query, maxPrice]);

  const businesses = venues.filter((v) => v.kind === "business");
  const gyms = venues.filter((v) => v.kind === "gym");
  // MO1.4.1's sub-tabs, plus any other business type actually listed, except
  // a gym (decision 23, item 29: gyms have their own tab; a gym-type business
  // still shows under All).
  const businessTypes = useMemo(() => {
    const present = [...new Set(businesses.map((b) => b.venueType))].filter(
      (t) => t !== "gym" && !BUSINESS_TYPES.some((x) => x.key === t)
    );
    return [...BUSINESS_TYPES, ...present.map((t) => ({ key: t, label: typeLabel(t) }))];
  }, [businesses]);
  const shownBusinesses = businessType ? businesses.filter((b) => b.venueType === businessType) : businesses;

  const book = async (c: MarketplaceClass) => {
    if (!authUserId || busyId) return;
    setBusyId(c.classId);
    const result = booked.has(c.classId)
      ? await cancelBooking(c.classId, authUserId)
      : await bookClass(c.classId, authUserId);
    setBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    // Re-read rather than adjusting the count locally: spots_remaining is the
    // view's arithmetic over every booking, and guessing it here would be
    // wrong the moment anyone else booked the same class.
    await load();
  };

  /** MO1.4's FO3 sub-tabs: a 40 pt rail (#F4F3F9 in light) of 32 pt tabs. */
  const subTabs = (
    items: { key: string; label: string }[],
    activeKey: string,
    onChange: (k: string) => void,
    light: { activeFill: string; activeInk: string; idleFill: string; idleInk: string },
    label: string
  ) => (
    <div className="mb-3" role="group" aria-label={label}>
      <SegmentedTabs
        scroll
        items={items}
        activeKey={activeKey}
        onChange={onChange}
        labelSize={12}
        tabHeight={32}
        // Foundations › FO3 sub-tabs: natural width, 12 each side, radius 9,
        // inactive 600 (frame check; were min 86, 16, 12 and 700).
        idleWeight={600}
        scrollTabPadding="0 12px"
        scrollMinWidth={0}
        tabRadius={9}
        trackStyle={{ padding: 4, gap: 4, borderRadius: 12, ...(dark ? {} : { background: "rgb(var(--th-f4f3f9))" }) }}
        light={light}
      />
    </div>
  );

  return (
    <div className="mb-6">
      {/* SIMPLE FILTERS, NO NEW INFRASTRUCTURE. A text match and a price
          ceiling, applied in memory over a list the view has already bounded.
          Decision 23 (item 30): the field is borderless as drawn (MO1.4 #3:
          padding 0 14, Search 16, gap 8, so the text starts at 38). */}
      <div className="relative mb-3.5">
        <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search classes, places or a location"
          className="w-full h-[46px] rounded-[14px] bg-cream-soft pl-[38px] pr-[14px] text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* MO1.4: the three kinds as segmented tabs, 40 in a 52 track (B21). */}
      <SegmentedTabs
        className="mb-2.5"
        items={TABS}
        activeKey={tab}
        onChange={(k) => setTab(k as Tab)}
        labelSize={13}
        tabHeight={40}
      />

      {/* Decision 23 (item 78): a failed read or booking is a plain 12/600
          danger line under the tabs (MO1.4 §4 Error), no box. */}
      {error && (
        <p role="alert" className="mb-2.5 text-[12px] font-semibold text-status-high">
          {error}
        </p>
      )}

      {tab === "classes" && (
        <>
          {/* One rail, as drawn (decision 23, item 31: the class-type rail is
              gone and the search matches the type). Item 75: the active price
              takes the primary fill like the other sub-tab rails. */}
          {subTabs(
            priceCeilings.map((p) => ({ key: String(p.value), label: p.label })),
            String(maxPrice),
            (k) => setMaxPrice(k === "null" ? null : Number(k)),
            { activeFill: "rgb(var(--c-primary-fill))", activeInk: "rgb(var(--c-on-primary-fill))", idleFill: "transparent", idleInk: "rgb(var(--c-charcoal-soft))" },
            "Price"
          )}

          {/* 14 from the sub-tabs to the first card (frame check; the 12
              margin above collapses into it). */}
          <div className="space-y-2.5 mt-[14px]">
            {filtered.map((c) => {
              const mine = booked.has(c.classId);
              const free = !c.priceValue;
              return (
                <div key={c.classId} className="rounded-[18px] bg-cream-card border border-charcoal/[0.08] p-3 animate-fade-slide-up">
                  <div className="flex gap-3">
                    {/* MO1.4's date block, 56 × 50 (measured from the frame,
                        2x: 112 × 100), centred on the card. Decision 23 (item
                        76): the frame's 24-hour time on one line ("08:00",
                        14/800); item 45: the top line reads the date ("OCT
                        18") for a class a week or more away. */}
                    <span className="w-14 h-[50px] shrink-0 self-center rounded-[14px] bg-primary-pale flex flex-col items-center justify-center">
                      {/* The weekday (new since R1) is the frame's #7D67D9. */}
                      <span className="text-[10.5px] font-extrabold uppercase text-th-7d67d9 dark:text-primary-dark whitespace-nowrap">
                        {blockDay(c.date)}
                      </span>
                      <span className="text-[14px] font-extrabold text-charcoal tabular-nums leading-tight">{c.startTime}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-charcoal truncate">{c.title}</p>
                      {/* MO1.4 #6: the venue alone, then the place; the date
                          block carries the day (or date) and time. */}
                      <p className="text-[12px] font-semibold text-primary-dark truncate">{c.businessName}</p>
                      {c.location && <p className="text-[11.5px] text-charcoal-faint truncate">{c.location}</p>}
                      {/* Frame check (measured, the table gives no values):
                          row 6 under the place line; tag 20 tall, 8.5 each
                          side, 10.5/700; spots 11; 6 between them. */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {/* Decision 23 (item 15): the frame's #E4F0EE /
                            #2F5F58 (secondary.tint.2 / its teal ink); dark
                            keeps the teal tokens. */}
                        <span className="h-5 inline-flex items-center text-[10.5px] font-bold rounded-full px-[8.5px] bg-th-e4f0ee text-th-2f5f58 dark:bg-teal-pale dark:text-teal-deep-text">
                          {free ? "Free" : c.price}
                        </span>
                        {/* STRAIGHT FROM THE VIEW. spots_remaining is computed
                            over every booking server-side. */}
                        <span className={`text-[11px] ${c.isFull ? "text-status-high font-semibold" : "text-charcoal-faint"}`}>
                          {c.isFull ? "Full" : `${c.spotsRemaining} ${c.spotsRemaining === 1 ? "spot" : "spots"} left`}
                        </span>
                        {/* What the card no longer draws (MO1.4): the end time, the
                            class type and the notes stay one tap away in the
                            Info popup (decision 1; revision round, item 8). */}
                        {(c.notes || c.classType || c.endTime) && (
                          <button
                            type="button"
                            onClick={() => setInfoFor(c)}
                            aria-haspopup="dialog"
                            aria-label="Class details"
                            className="tap w-8 h-8 -my-1 flex items-center justify-center text-charcoal-faint"
                          >
                            <Info size={15} strokeWidth={1.75} aria-hidden />
                          </button>
                        )}
                        {mine ? (
                          // Decision 23 (item 77): booked, in the Book slot
                          // (58 × 30, r10) in the teal check style of the
                          // class page's booked note (MO1.4.4.3, measured:
                          // #E7F2F0 fill, 1 px #C1D5D2, #3C6B65 ink), so the
                          // card stays 117. A tap asks before it cancels.
                          // Full is not a reason to disable a booking
                          // somebody already holds (B24).
                          <button
                            type="button"
                            onClick={() => setCancelFor(c)}
                            disabled={busyId === c.classId || !authUserId}
                            aria-haspopup="dialog"
                            aria-label={`Booked: ${c.title}. Cancel booking`}
                            className="tap ml-auto h-[30px] px-2.5 rounded-[10px] border inline-flex items-center gap-1 text-[12px] font-bold bg-th-e7f2f0 border-th-c1d5d2 text-th-3c6b65 dark:bg-teal-pale dark:border-teal-dark/50 dark:text-teal-deep-text disabled:opacity-50"
                          >
                            {busyId === c.classId ? (
                              "…"
                            ) : (
                              <>
                                <Check size={13} strokeWidth={2.4} aria-hidden /> Booked
                              </>
                            )}
                          </button>
                        ) : (
                          // MO1.4: Book is a rounded rectangle, radius 10,
                          // 58 × 30 (measured from the frame, 2x): a 1 px
                          // #AEA1DC outline, 12/700 #7D67D9 label.
                          <button
                            type="button"
                            onClick={() => void book(c)}
                            disabled={busyId === c.classId || c.isFull || !authUserId}
                            className="tap ml-auto h-[30px] px-[14px] rounded-[10px] border border-primary dark:border-primary-dark/50 text-[12px] font-bold text-th-7d67d9 dark:text-primary-dark disabled:opacity-50"
                          >
                            {busyId === c.classId ? "…" : c.isFull ? "Full" : "Book"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* MO1.4.3: no classes, or none matching the filters, in the
                same empty-state block (own copy). */}
            {filtered.length === 0 && !loading && (
              classes.length === 0 ? (
                <EmptyState icon={<CalendarDays size={24} strokeWidth={1.75} />} title="No classes yet" body="Classes from gyms and studios near you will show here." />
              ) : (
                <EmptyState
                  icon={<CalendarDays size={24} strokeWidth={1.75} />}
                  title="No classes match"
                  body="No classes match those filters. Try another price or search."
                />
              )
            )}
          </div>
        </>
      )}

      {tab === "businesses" && (
        <>
          {subTabs(
            [{ key: "", label: "All" }, ...businessTypes],
            businessType ?? "",
            (k) => setBusinessType(k || null),
            { activeFill: "rgb(var(--c-primary-fill))", activeInk: "rgb(var(--c-on-primary-fill))", idleFill: "transparent", idleInk: "rgb(var(--c-charcoal-soft))" },
            "Business type"
          )}
          <div className="space-y-2.5 mt-[14px]">
            {shownBusinesses.map((v) => (
              // Decision 23 (items 43 and 46): the row opens the business's
              // page (MO1.4.1 interactions 12–16, the frame's ChevronRight
              // 16/1.75), where its bio, upcoming classes, perk and listings
              // now live, so the row keeps the drawn 81.
              <button
                key={v.venueId}
                type="button"
                onClick={() => navigate(`/app/marketplace/business?id=${encodeURIComponent(v.venueId)}`)}
                className="tap w-full text-left rounded-[18px] bg-cream-card border border-charcoal/[0.08] p-3 flex items-center gap-3 animate-fade-slide-up"
              >
                {/* No logos yet (B26): initials in the primary tint, as the
                    frame draws a store without one. The tile and the type
                    line are new since R1, so they take the frame's #7D67D9
                    (frame check); the tile centres on the row as drawn. */}
                <span className="w-12 h-12 rounded-[14px] bg-primary-pale flex items-center justify-center shrink-0 text-[15px] font-extrabold text-th-7d67d9 dark:text-primary-dark">
                  {initials(v.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-charcoal truncate">{v.name}</span>
                  <span className="block text-[12px] font-semibold text-th-7d67d9 dark:text-primary-dark truncate">{typeLabel(v.venueType)}</span>
                  {v.location && <span className="block text-[11.5px] text-charcoal-faint truncate">{v.location}</span>}
                </span>
                <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-charcoal-faint" aria-hidden />
              </button>
            ))}
            {shownBusinesses.length === 0 && !loading && (
              businesses.length === 0 ? (
                <EmptyState icon={<Store size={24} strokeWidth={1.75} />} title="No businesses yet" body="Shops and studios near you will show here." />
              ) : (
                // Frame check: the filtered-empty case in MO1.4.3's block
                // (was a centred card from before the redesign).
                <EmptyState icon={<Store size={24} strokeWidth={1.75} />} title="None of this kind yet" body="Try another type, or All." />
              )
            )}
          </div>
        </>
      )}

      {tab === "gyms" && (
        <div className="space-y-2.5 mt-[14px]">
          {gyms.map((v) => (
            <div key={v.venueId} className="rounded-[18px] bg-cream-card border border-charcoal/[0.08] overflow-hidden animate-fade-slide-up">
              {/* No cover photos yet: the primary tint with the gym's initials,
                  as MO1.4.2 draws a gym without one. 84 tall of the 172 card
                  (measured from the frame, unverified). */}
              <div className="h-[84px] bg-primary-pale flex items-center justify-center">
                <span className="w-11 h-11 rounded-[12px] bg-cream-card flex items-center justify-center text-[14px] font-extrabold text-th-7d67d9 dark:text-primary-dark">
                  {initials(v.name)}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-[15px] font-bold text-charcoal truncate">{v.name}</p>
                {v.location && <p className="text-[11.5px] text-charcoal-faint truncate">{v.location}</p>}
                {v.bio && <p className="text-xs text-charcoal-soft mt-1 leading-relaxed line-clamp-2">{v.bio}</p>}
                {/* Directly under the place line, as the frame's price line (frame check). */}
                {v.perk && <p className="text-[12.5px] font-bold text-primary-dark">{v.perk}</p>}
              </div>
            </div>
          ))}
          {/* THE HONEST EMPTY STATE. The gyms table has no rows until real
              partnerships exist; this says that rather than inventing three. */}
          {gyms.length === 0 && !loading && (
            <EmptyState icon={<Dumbbell size={24} strokeWidth={1.75} />} title="No gyms yet" body="Gyms near you will show here." />
          )}
        </div>
      )}

      {/* MO1.4 §4 Loading: skeleton blocks where the cards will be, in
          surface.soft at each card's radius (class card 117, gym card 172;
          a business row is its 48 tile plus padding). */}
      {loading && (
        <div className="space-y-2.5 mt-[14px]" aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="animate-pulse rounded-[18px] bg-cream-soft"
              style={{ height: tab === "gyms" ? 172 : tab === "businesses" ? 81 : 117 }}
            />
          ))}
        </div>
      )}

      {/* Class details (revision round, item 8): what the MO1.4 card leaves
          out, in the shared centred popup. */}
      <CentredPopup
        open={!!infoFor}
        onClose={() => setInfoFor(null)}
        title={infoFor?.title ?? ""}
        icon={<Info size={22} strokeWidth={1.75} />}
        body={infoFor?.businessName}
      >
        {infoFor && (
          <dl className="mt-3 space-y-2 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-charcoal-faint">Time</dt>
              {/* 24-hour, as the card's date block now reads (decision 23,
                  item 76) and as the class page draws it ("08:00 to 09:00"). */}
              <dd className="font-semibold text-charcoal text-end tabular-nums">
                {dateLabel(infoFor.date)} · {infoFor.startTime} to {infoFor.endTime}
              </dd>
            </div>
            {infoFor.classType && (
              <div className="flex justify-between gap-3">
                <dt className="text-charcoal-faint">Type</dt>
                <dd className="font-semibold text-charcoal text-end">{infoFor.classType}</dd>
              </div>
            )}
            {infoFor.notes && <dd className="text-charcoal-soft leading-relaxed pt-1">{infoFor.notes}</dd>}
          </dl>
        )}
      </CentredPopup>

      {/* Decision 23 (item 77): "Cancel booking?" in the shared centred
          popup; tapping outside (or Escape) keeps the booking. */}
      <CentredPopup
        open={!!cancelFor}
        onClose={() => setCancelFor(null)}
        title="Cancel booking?"
        icon={<CalendarDays size={22} strokeWidth={1.75} />}
        body={cancelFor ? `${cancelFor.title} · ${dateLabel(cancelFor.date)} · ${cancelFor.startTime} to ${cancelFor.endTime}` : undefined}
        cta={{
          label: "Cancel booking",
          loading: !!cancelFor && busyId === cancelFor.classId,
          onClick: () => {
            const c = cancelFor;
            if (!c) return;
            void book(c).then(() => setCancelFor(null));
          },
        }}
      />
    </div>
  );
}

/**
 * Foundations' empty-state block (MO1.4.3): padding 56 24 0, gap 10; a 56 pt
 * primary-tint tile (Foundations › Empty state), a title and a line.
 */
function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    // 42 here plus the list's 14 = the block's 56 from the rail above (frame check).
    <div className="flex flex-col items-center text-center gap-2.5 px-6 pt-[42px] pb-0">
      <span className="w-14 h-14 rounded-[18px] bg-primary-pale flex items-center justify-center text-th-7d67d9 dark:text-primary-dark">{icon}</span>
      <p className="text-[16px] font-extrabold text-charcoal">{title}</p>
      <p className="text-[13px] text-charcoal-faint leading-[1.55]">{body}</p>
    </div>
  );
}

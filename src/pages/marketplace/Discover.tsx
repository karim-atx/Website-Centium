import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { useIsDark } from "../../hooks/useIsDark";
import { initials } from "../../components/professionals/typeColour";
import { fmt12 } from "../../components/calendar/calendarTime";
import { useApp } from "../../context/AppContext";
import {
  bookClass,
  cancelBooking,
  fetchMarketplaceClasses,
  fetchMarketplaceVenues,
  fetchMyBookedClassIds,
  type MarketplaceClass,
  type MarketplaceVenue,
} from "../../services/marketplace";
import { CalendarDays, Search, Store, Dumbbell, Check, Info } from "lucide-react";

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

/** MO1.4.1's sub-tabs, keyed by the business_type enum. */
const BUSINESS_TYPES: { key: string; label: string }[] = [
  { key: "clothing_store", label: "Clothing" },
  { key: "equipment_seller", label: "Equipment" },
  { key: "supplement_store", label: "Supplements" },
  { key: "meal_prep_service", label: "Meal prep" },
  { key: "wellness_service", label: "Wellness" },
];
const OTHER_TYPES: Record<string, string> = { gym: "Gym", store: "Store" };
const typeLabel = (t: string) =>
  BUSINESS_TYPES.find((x) => x.key === t)?.label ?? OTHER_TYPES[t] ?? t.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

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

export default function Discover() {
  const { authUserId, profileReady } = useApp();

  const [classes, setClasses] = useState<MarketplaceClass[]>([]);
  const [venues, setVenues] = useState<MarketplaceVenue[]>([]);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [classType, setClassType] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("classes");
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [infoFor, setInfoFor] = useState<MarketplaceClass | null>(null);
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

  // The class types actually present, rather than a hardcoded list that could
  // offer a filter matching nothing.
  const types = useMemo(
    () => [...new Set(classes.map((c) => c.classType).filter((t): t is string => !!t))].sort(),
    [classes]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return classes.filter((c) => {
      if (classType && c.classType !== classType) return false;
      // A free class has a null price and passes every ceiling including
      // "Free"; a priced one is compared against the ceiling.
      if (maxPrice !== null && (c.priceValue ?? 0) > maxPrice) return false;
      if (!q) return true;
      // Title, business and location — the three things somebody would type.
      return [c.title, c.businessName, c.location ?? ""].some((f) => f.toLowerCase().includes(q));
    });
  }, [classes, query, classType, maxPrice]);

  const businesses = venues.filter((v) => v.kind === "business");
  const gyms = venues.filter((v) => v.kind === "gym");
  // MO1.4.1's sub-tabs, plus any other business type actually listed (a
  // business can be a gym, which the frame's list leaves out).
  const businessTypes = useMemo(() => {
    const present = [...new Set(businesses.map((b) => b.venueType))].filter((t) => !BUSINESS_TYPES.some((x) => x.key === t));
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
        trackStyle={{ padding: 4, gap: 4, borderRadius: 12, ...(dark ? {} : { background: "#F4F3F9" }) }}
        light={light}
      />
    </div>
  );

  return (
    <div className="mb-6">
      {error && (
        <p className="mb-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">
          {error}
        </p>
      )}

      {/* SIMPLE FILTERS, NO NEW INFRASTRUCTURE. A text match, the class types
          actually present, and a price ceiling — all applied in memory over a
          list the view has already bounded. */}
      <div className="relative mb-3.5">
        <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search classes, places or a location"
          className="w-full h-[46px] rounded-[14px] bg-cream-soft border border-charcoal/10 pl-10 pr-4 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
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

      {tab === "classes" && (
        <>
          {/* The price ceilings keep their teal (decision 15); the class
              types, kept though not drawn (B23), sit in a second row. */}
          {subTabs(
            priceCeilings.map((p) => ({ key: String(p.value), label: p.label })),
            String(maxPrice),
            (k) => setMaxPrice(k === "null" ? null : Number(k)),
            { activeFill: "rgb(var(--c-teal-fill))", activeInk: "rgb(var(--c-on-primary-fill))", idleFill: "transparent", idleInk: "rgb(var(--c-charcoal-soft))" },
            "Price"
          )}
          {types.length > 0 &&
            subTabs(
              [{ key: "", label: "All types" }, ...types.map((t) => ({ key: t, label: t }))],
              classType ?? "",
              (k) => setClassType(k || null),
              { activeFill: "rgb(var(--c-primary-fill))", activeInk: "rgb(var(--c-on-primary-fill))", idleFill: "transparent", idleInk: "rgb(var(--c-charcoal-soft))" },
              "Class type"
            )}

          <div className="space-y-2.5 mt-1">
            {filtered.map((c) => {
              const mine = booked.has(c.classId);
              const free = !c.priceValue;
              return (
                <div key={c.classId} className="rounded-[18px] bg-cream-card border border-charcoal/[0.08] p-3 animate-fade-slide-up">
                  <div className="flex gap-3">
                    {/* MO1.4's date block: weekday and start time, 56 wide
                        (measured from the frame, 2x: 112 px). */}
                    <span className="w-14 shrink-0 self-start rounded-[14px] bg-primary-pale flex flex-col items-center justify-center py-2.5">
                      <span className="text-[10.5px] font-extrabold uppercase text-primary-dark">
                        {new Date(`${c.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span className="text-[14px] font-extrabold text-charcoal tabular-nums leading-tight">{fmt12(c.startTime).split(" ")[0]}</span>
                      <span className="text-[9.5px] font-bold text-charcoal-faint leading-none">{fmt12(c.startTime).split(" ")[1]}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-charcoal truncate">{c.title}</p>
                      {/* MO1.4 #6: the venue alone, then the place; the date
                          block carries the day and time. A class a week or
                          more away keeps its date on the place line, since
                          the weekday alone would not say which week. */}
                      <p className="text-[12px] font-semibold text-primary-dark truncate">{c.businessName}</p>
                      {(c.location || farOff(c.date)) && (
                        <p className="text-[11.5px] text-charcoal-faint truncate">
                          {[farOff(c.date) ? dateLabel(c.date) : null, c.location].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[12px] font-bold rounded-full px-2.5 py-0.5 bg-teal-pale text-teal-dark dark:text-teal-deep-text">
                          {free ? "Free" : c.price}
                        </span>
                        {/* STRAIGHT FROM THE VIEW. spots_remaining is computed
                            over every booking server-side. */}
                        <span className={`text-[11.5px] ${c.isFull ? "text-status-high font-semibold" : "text-charcoal-faint"}`}>
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
                        {!mine && (
                          // MO1.4: Book is a rounded rectangle, radius 10
                          // (measured from the frame, 2x), 32 tall.
                          <button
                            type="button"
                            onClick={() => void book(c)}
                            disabled={busyId === c.classId || c.isFull || !authUserId}
                            className="tap ml-auto h-8 px-4 rounded-[10px] border border-primary-dark/50 text-[12.5px] font-bold text-primary-dark disabled:opacity-50"
                          >
                            {busyId === c.classId ? "…" : c.isFull ? "Full" : "Book"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Booked: cancelling stays on the card (B24). Full is not a
                      reason to disable a booking somebody already holds. */}
                  {mine && (
                    <Button
                      size="sm"
                      fullWidth
                      variant="outline"
                      className="mt-2.5"
                      disabled={busyId === c.classId || !authUserId}
                      onClick={() => void book(c)}
                    >
                      {busyId === c.classId ? (
                        "…"
                      ) : (
                        <>
                          <Check size={13} /> Booked · tap to cancel
                        </>
                      )}
                    </Button>
                  )}
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
                  body="No classes match those filters. Try another price, type or search."
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
          <div className="space-y-2.5 mt-1">
            {shownBusinesses.map((v) => (
              <div key={v.venueId} className="rounded-[18px] bg-cream-card border border-charcoal/[0.08] p-3 flex gap-3 animate-fade-slide-up">
                {/* No logos yet (B26): initials in the primary tint, as the
                    frame draws a store without one. */}
                <span className="w-12 h-12 rounded-[14px] bg-primary-pale flex items-center justify-center shrink-0 text-[15px] font-extrabold text-primary-dark">
                  {initials(v.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-charcoal truncate">{v.name}</p>
                  <p className="text-[12px] font-semibold text-primary-dark truncate">{typeLabel(v.venueType)}</p>
                  {v.location && <p className="text-[11.5px] text-charcoal-faint truncate">{v.location}</p>}
                  {/* Kept though not drawn (B26): bio, upcoming classes, perk. */}
                  {v.bio && <p className="text-xs text-charcoal-soft mt-1 leading-relaxed line-clamp-2">{v.bio}</p>}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    <span className="text-[11.5px] text-charcoal-faint">
                      {v.upcomingClassCount > 0
                        ? `${v.upcomingClassCount} upcoming ${v.upcomingClassCount === 1 ? "class" : "classes"}`
                        : "No upcoming classes"}
                    </span>
                    {v.perk && (
                      <span className="text-[10px] font-bold text-primary-dark bg-primary-pale rounded-full px-2 py-0.5 leading-snug">{v.perk}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {shownBusinesses.length === 0 && !loading && (
              businesses.length === 0 ? (
                <EmptyState icon={<Store size={24} strokeWidth={1.75} />} title="No businesses yet" body="Shops and studios near you will show here." />
              ) : (
                <Card className="text-center py-8">
                  <p className="text-sm text-charcoal-faint">None of this kind yet.</p>
                </Card>
              )
            )}
          </div>
        </>
      )}

      {tab === "gyms" && (
        <div className="space-y-2.5 mt-1">
          {gyms.map((v) => (
            <div key={v.venueId} className="rounded-[18px] bg-cream-card border border-charcoal/[0.08] overflow-hidden animate-fade-slide-up">
              {/* No cover photos yet: the primary tint with the gym's initials,
                  as MO1.4.2 draws a gym without one. 84 tall of the 172 card
                  (measured from the frame, unverified). */}
              <div className="h-[84px] bg-primary-pale flex items-center justify-center">
                <span className="w-11 h-11 rounded-[12px] bg-cream-card flex items-center justify-center text-[14px] font-extrabold text-primary-dark">
                  {initials(v.name)}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-[15px] font-bold text-charcoal truncate">{v.name}</p>
                {v.location && <p className="text-[11.5px] text-charcoal-faint truncate">{v.location}</p>}
                {v.bio && <p className="text-xs text-charcoal-soft mt-1 leading-relaxed line-clamp-2">{v.bio}</p>}
                {v.perk && <p className="text-[12.5px] font-bold text-primary-dark mt-1">{v.perk}</p>}
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
        <div className="space-y-2.5 mt-1" aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="animate-pulse rounded-[18px] bg-cream-soft"
              style={{ height: tab === "gyms" ? 172 : tab === "businesses" ? 72 : 117 }}
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
              <dd className="font-semibold text-charcoal text-end tabular-nums">
                {dateLabel(infoFor.date)} · {fmt12(infoFor.startTime)}–{fmt12(infoFor.endTime)}
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
    </div>
  );
}

/**
 * Foundations' empty-state block (MO1.4.3): padding 56 24 0, gap 10; a 56 pt
 * primary-tint tile (Foundations › Empty state), a title and a line.
 */
function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2.5 px-6 pt-14 pb-0">
      <span className="w-14 h-14 rounded-2xl bg-primary-pale flex items-center justify-center text-primary-dark">{icon}</span>
      <p className="text-[16px] font-extrabold text-charcoal">{title}</p>
      <p className="text-[13px] text-charcoal-faint max-w-[260px] leading-relaxed">{body}</p>
    </div>
  );
}

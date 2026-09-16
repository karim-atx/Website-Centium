import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
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
import { Search, MapPin, Users, Clock, Store, Dumbbell, Check } from "lucide-react";
import clsx from "clsx";

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
// GYMS ARE EMPTY AND THAT IS A STATE, NOT A BUG. The gyms table has no rows
// until real partnerships exist, so the section says so plainly. Filling it
// with placeholders is exactly what this screen is replacing.

const priceCeilings = [
  { label: "Any price", value: null },
  { label: "Free", value: 0 },
  { label: "Under $15", value: 15 },
  { label: "Under $30", value: 30 },
];

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

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

  return (
    <div>
      <div className="mb-4">
        <p className="text-[19px] font-bold tracking-[-0.03em] text-charcoal">Explore</p>
        <p className="mt-[3px] text-[11px] text-charcoal-tertiary">
          Classes and places near you
        </p>
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">
          {error}
        </p>
      )}

      {/* SIMPLE FILTERS, NO NEW INFRASTRUCTURE. A text match, the class types
          actually present, and a price ceiling — all applied in memory over a
          list the view has already bounded. */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search classes, places or a location"
          className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 pl-9 pr-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {types.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setClassType(null)}
            className={clsx(
              "tap rounded-full px-3 py-1.5 text-xs font-semibold",
              classType === null ? "bg-primary text-white" : "bg-cream-soft text-charcoal-soft"
            )}
          >
            All types
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setClassType((c) => (c === t ? null : t))}
              className={clsx(
                "tap rounded-full px-3 py-1.5 text-xs font-semibold",
                classType === t ? "bg-primary text-white" : "bg-cream-soft text-charcoal-soft"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {priceCeilings.map((p) => (
          <button
            key={p.label}
            onClick={() => setMaxPrice(p.value)}
            className={clsx(
              "tap rounded-full px-3 py-1.5 text-xs font-semibold",
              maxPrice === p.value ? "bg-teal text-white" : "bg-cream-soft text-charcoal-soft"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="mb-2.5 text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Classes</p>
      <div className="space-y-2.5 mb-6">
        {filtered.map((c) => {
          const mine = booked.has(c.classId);
          return (
            <Card key={c.classId} className="animate-fade-slide-up">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
                  <Dumbbell size={18} className="text-primary-dark" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal truncate">{c.title}</p>
                  <p className="text-xs text-primary-dark font-medium truncate">
                    {c.businessName}
                    {c.classType ? ` · ${c.classType}` : ""}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-charcoal-faint mt-1">
                    <Clock size={11} /> {dateLabel(c.date)} · {c.startTime}–{c.endTime}
                  </p>
                  {c.location && (
                    <p className="flex items-center gap-1 text-xs text-charcoal-faint mt-0.5">
                      <MapPin size={11} /> {c.location}
                    </p>
                  )}
                  {/* STRAIGHT FROM THE VIEW. spots_remaining is computed over
                      every booking server-side, so it is right even while
                      somebody else is booking the same class. */}
                  <p className="flex items-center gap-1 text-xs mt-0.5">
                    <Users size={11} className="text-charcoal-faint" />
                    <span className={c.isFull ? "text-status-high font-semibold" : "text-charcoal-faint"}>
                      {/* Pluralised on the CAPACITY, not the remainder: the
                          phrase is "1 of 2 places left", and keying it off the
                          remainder produced "1 of 2 place left". */}
                      {c.isFull
                        ? "Full"
                        : `${c.spotsRemaining} of ${c.maxCapacity} ${
                            c.maxCapacity === 1 ? "place" : "places"
                          } left`}
                    </span>
                  </p>
                </div>
                {c.price && (
                  <span className="text-xs font-bold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1 shrink-0">
                    {c.price}
                  </span>
                )}
              </div>

              {c.notes && <p className="text-xs text-charcoal-faint mt-2 italic">{c.notes}</p>}

              <div className="mt-2.5">
                <Button
                  size="sm"
                  fullWidth
                  variant={mine ? "outline" : "primary"}
                  // Full is not a reason to disable a booking somebody already
                  // holds — cancelling is exactly what they would want to do.
                  disabled={busyId === c.classId || (!mine && c.isFull) || !authUserId}
                  onClick={() => void book(c)}
                >
                  {busyId === c.classId ? (
                    "…"
                  ) : mine ? (
                    <>
                      <Check size={13} /> Booked — tap to cancel
                    </>
                  ) : c.isFull ? (
                    "Full"
                  ) : (
                    "Book a place"
                  )}
                </Button>
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 && !loading && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">
              {classes.length === 0
                ? "No classes scheduled yet — businesses add them from their own dashboard."
                : "No classes match those filters."}
            </p>
          </Card>
        )}
      </div>

      <p className="mb-2.5 text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
        Businesses
      </p>
      <div className="space-y-2.5 mb-6">
        {businesses.map((v) => (
          <Card key={v.venueId} className="flex items-start gap-3 animate-fade-slide-up">
            <span className="w-11 h-11 rounded-2xl bg-teal-pale flex items-center justify-center shrink-0">
              <Store size={18} className="text-teal-dark" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-charcoal truncate">{v.name}</p>
              {v.location && (
                <p className="flex items-center gap-1 text-xs text-charcoal-faint mt-0.5">
                  <MapPin size={11} /> {v.location}
                </p>
              )}
              {v.bio && <p className="text-xs text-charcoal-soft mt-1 leading-relaxed">{v.bio}</p>}
              <p className="text-xs text-charcoal-faint mt-1">
                {v.upcomingClassCount > 0
                  ? `${v.upcomingClassCount} upcoming ${
                      v.upcomingClassCount === 1 ? "class" : "classes"
                    }`
                  : "No upcoming classes"}
              </p>
            </div>
            {v.perk && (
              <span className="text-[10px] font-bold text-primary-dark bg-primary-pale rounded-full px-2 py-1 shrink-0 max-w-[38%] text-center leading-snug">
                {v.perk}
              </span>
            )}
          </Card>
        ))}
        {businesses.length === 0 && !loading && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">No businesses listed yet.</p>
          </Card>
        )}
      </div>

      <p className="mb-2.5 text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Gyms</p>
      <div className="space-y-2.5">
        {gyms.map((v) => (
          <Card key={v.venueId} className="flex items-start gap-3 animate-fade-slide-up">
            <span className="w-11 h-11 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
              <Dumbbell size={18} className="text-primary-dark" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-charcoal truncate">{v.name}</p>
              {v.location && (
                <p className="flex items-center gap-1 text-xs text-charcoal-faint mt-0.5">
                  <MapPin size={11} /> {v.location}
                </p>
              )}
              {v.bio && <p className="text-xs text-charcoal-soft mt-1 leading-relaxed">{v.bio}</p>}
            </div>
            {v.perk && (
              <span className="text-[10px] font-bold text-primary-dark bg-primary-pale rounded-full px-2 py-1 shrink-0 max-w-[38%] text-center leading-snug">
                {v.perk}
              </span>
            )}
          </Card>
        ))}
        {/* THE HONEST EMPTY STATE. The gyms table has no rows until real
            partnerships exist; this says that rather than inventing three. */}
        {gyms.length === 0 && !loading && (
          <Card className="text-center py-8">
            <p className="text-sm font-semibold text-charcoal">No gyms listed yet</p>
            <p className="text-xs text-charcoal-faint mt-1 leading-relaxed max-w-xs mx-auto">
              Gym partnerships are on the way. When one joins Centium, it'll show up here.
            </p>
          </Card>
        )}
      </div>

      {loading && (
        <Card className="text-center py-8 mt-2.5">
          <p className="text-sm text-charcoal-faint">Loading…</p>
        </Card>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Users, Clock, ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { VenueSwitcher } from "../../components/marketplace/VenueSwitcher";
import { VenueFigures } from "../../components/marketplace/VenueFigures";
import { VenueHoursCard } from "../../components/marketplace/VenueHoursCard";
import { VenueImagesCard } from "../../components/marketplace/VenueImagesCard";
import { VenueMembersRoster } from "../../components/marketplace/VenueMembersRoster";
import { ClassRosterSheet } from "../../components/marketplace/ClassRosterSheet";
import { useMyVenues } from "../../hooks/useMyVenues";
import { fetchVenueClasses, type VenueClassLite } from "../../services/venues/console";
import { dayMonthYear } from "../../services/venues/venueLogic";

// The venue console (backend stage A4): my_venues() → venue_dashboard(id) →
// venue_members(id), venue_class_roster(class_id) per class, opening hours,
// and the logo / cover. One page so it works for every insider: the owner
// (who may be a business OR a professional account — the seeded Flex Fitness
// owner is a coach) and the professionals the business employs, who get the
// same page read-only. Reached from More → Venues.
//
// NOT YET MATCHED TO THE BUSINESS UI BOARD: built from the business console's
// existing cards, chips, sheets and sizes because the board wasn't available.

export default function BusinessVenueTab() {
  const { venues, selected, select, isOwner, loading, error, reload } = useMyVenues();
  const [classes, setClasses] = useState<{ gymId: string; value: VenueClassLite[] } | null>(null);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [roster, setRoster] = useState<VenueClassLite | null>(null);
  const gymId = selected?.gymId ?? null;

  useEffect(() => {
    if (!gymId) return;
    let cancelled = false;
    void (async () => {
      // Today on this device's calendar (not UTC's), so tonight's classes stay listed.
      const now = new Date();
      const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
      const r = await fetchVenueClasses(gymId, today);
      if (cancelled) return;
      if (!r.ok) {
        setClassesError(r.message);
        return;
      }
      setClassesError(null);
      setClasses({ gymId, value: r.value });
    })();
    return () => {
      cancelled = true;
    };
  }, [gymId]);

  const venueClasses = classes?.gymId === gymId ? classes.value : null;

  return (
    <div>
      <PageHeader title="Venues" subtitle={isOwner || !selected ? "Your venues on Centium" : "Venues you work at"} showBack />

      {error && <p className="mb-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">{error}</p>}

      {!loading && venues.length === 0 && !error && (
        <Card className="text-center py-8">
          <p className="text-sm text-charcoal-faint">You don't run or work at a venue on Centium yet.</p>
        </Card>
      )}

      <VenueSwitcher venues={venues} selected={selected} onSelect={select} isOwner={isOwner} />

      {selected && (
        <>
          <VenueFigures gymId={selected.gymId} />
          <VenueHoursCard gymId={selected.gymId} timezone={selected.timezone} isOwner={isOwner} onTimezoneSaved={reload} />
          {isOwner && <VenueImagesCard gymId={selected.gymId} businessId={selected.businessId} venueName={selected.name} />}
          <VenueMembersRoster gymId={selected.gymId} />

          <p className="section-label text-charcoal-faint mb-2.5">Upcoming classes</p>
          {classesError && <p className="mb-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">{classesError}</p>}
          <div className="space-y-2.5 mb-6">
            {venueClasses?.map((c) => (
              <Card key={c.id} interactive onClick={() => setRoster(c)} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-charcoal truncate">{c.title}</p>
                  <p className="flex items-center gap-1 text-xs text-charcoal-faint mt-0.5">
                    <Clock size={11} /> {dayMonthYear(c.date)} · {c.startTime}–{c.endTime}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-primary-dark shrink-0">
                  <Users size={13} /> Roster <ChevronRight size={14} className="text-charcoal-faint" />
                </span>
              </Card>
            ))}
            {venueClasses && venueClasses.length === 0 && (
              <Card className="text-center py-8">
                <p className="text-sm text-charcoal-faint">No upcoming classes at this venue.</p>
              </Card>
            )}
          </div>
        </>
      )}

      <ClassRosterSheet classId={roster?.id ?? null} title={roster?.title ?? ""} onClose={() => setRoster(null)} />
    </div>
  );
}

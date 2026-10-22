import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase/client";
import { fetchClassCentium, fetchFeaturedClassIds } from "../../../services/business-market/listing";

// The live "Open spots (Classes)" facts the old Marketplace › Spots tab
// showed (PLAN §3.4), now on the B-MA.6 session cards: per class the
// bookings that came through Centium (business_class_bookings.source,
// B13 MK-04), the classes in a live featured week (MK-06), and whether the
// business listing itself is on Explore (business_profiles.active). The
// class's own centium_spots / listed_on_explore come with the schedule
// (useSchedule's business_classes columns). Every read is a plain select;
// a failed one leaves its part empty (the cards then show no Centium line).

export interface CentiumFacts {
  /** classId → bookings from Centium; null until read (or when it can't be). */
  fromCentium: Map<string, number> | null;
  featured: Set<string>;
  /** business_profiles.active; null until read. */
  listingActive: boolean | null;
}

export function useCentium(businessId: string | null, classIds: string[]): CentiumFacts {
  const key = classIds.join(",");
  const [fromCentium, setFromCentium] = useState<Map<string, number> | null>(null);
  const [featured, setFeatured] = useState<Set<string>>(new Set());
  const [listingActive, setListingActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    void fetchClassCentium(key.split(",")).then((r) => {
      if (!alive || !r.ok) return;
      setFromCentium(new Map([...r.value.entries()].map(([id, c]) => [id, c.centiumBooked])));
    });
    return () => {
      alive = false;
    };
  }, [key]);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    void fetchFeaturedClassIds(businessId).then((ids) => alive && setFeatured(ids));
    void supabase
      .from("business_profiles")
      .select("active")
      .eq("id", businessId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (alive && !error && data) setListingActive(!!(data as { active: boolean | null }).active);
      });
    return () => {
      alive = false;
    };
  }, [businessId]);

  return { fromCentium, featured, listingActive };
}

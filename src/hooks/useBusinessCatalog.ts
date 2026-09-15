import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  createClass,
  deleteClass,
  fetchMyClasses,
  type BusinessClassRow,
  type ClassDraft,
} from "../services/business-classes";
import {
  createOffering,
  deleteOffering,
  fetchMyOfferings,
  type Offering,
  type OfferingCategory,
} from "../services/business-offerings";
import {
  createDiscount,
  deleteDiscount,
  fetchMyDiscounts,
  type Discount,
} from "../services/business-discounts";
import {
  createPlan,
  deletePlan,
  fetchMyPlans,
  updatePlan,
  type MembershipPlanRow,
  type PlanDraft,
} from "../services/membership-plans";

// The four business-owned catalog collections: classes, offerings, discounts
// and membership plans.
//
// ONE FILE BECAUSE THEY SHARE A GATE, NOT BECAUSE THEY ARE THE SAME. Every one
// of these tables carries `business_id` in the payload rather than deriving it
// from auth.uid(), so every one of them needs the real business_profiles.id
// first, and every one of them is unwritable until the owner has saved their
// listing at least once. Four copies of that gate would drift, and the first
// thing to drift would be the difference between "no business profile yet" and
// "the read failed" — which look identical on screen and are not the same.
//
// WHERE THEY ACTUALLY DIFFER, which is the part worth being explicit about:
//   classes      create + delete. A professional_id foreign key, three check
//                constraints, and a second read path for the professional
//                being assigned (see services/business-classes).
//   offerings    create + delete. A category enum, and a separate public
//                cross-business read used by the client's Explore.
//   discounts    create + delete. One content column. Nothing else.
//   plans        create + UPDATE + delete — the only one of the four with a
//                real edit path in the UI (BusinessGymTab's "Edit Plan").
// Checked against each screen rather than inferred from the shared schema
// shape: three of the four offer no edit at all, so no updateX is built for
// them even though the grant would allow one.

/** What every catalog hook returns, whatever it holds. */
interface CatalogBase {
  /** The real business_profiles.id, or null when this account has no listing row yet. */
  businessId: string | null;
  loading: boolean;
  /** The most recent read or write failure, or null. */
  error: string | null;
}

/**
 * Shared hydration: resolve, load, and never blank what is already on screen.
 *
 * A FAILED READ KEEPS THE LIST. An empty catalog and an unreachable server
 * look exactly alike once rendered, and only one of them is a state a business
 * should be invited to act on.
 */
function useHydrated<T>(
  load: (userId: string) => Promise<
    { ok: true; businessId: string | null; items: T[] } | { ok: false; message: string }
  >
) {
  const { authUserId, profileReady } = useApp();
  const [items, setItems] = useState<T[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void (async () => {
      const result = await load(authUserId);
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setBusinessId(result.businessId);
      setItems(result.items);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady, load]);

  return { items, setItems, businessId, loading, error, setError };
}

export interface UseBusinessClasses extends CatalogBase {
  classes: BusinessClassRow[];
  add: (draft: ClassDraft) => Promise<boolean>;
  remove: (classId: string) => Promise<void>;
}

export function useBusinessClasses(): UseBusinessClasses {
  const load = useCallback(
    (userId: string) =>
      fetchMyClasses(userId).then((r) =>
        r.ok ? ({ ok: true, businessId: r.businessId, items: r.classes } as const) : r
      ),
    []
  );
  const { items, setItems, businessId, loading, error, setError } = useHydrated<BusinessClassRow>(load);

  const add = async (draft: ClassDraft) => {
    if (!businessId) {
      setError("Set up your business profile before scheduling classes.");
      return false;
    }
    const result = await createClass(businessId, draft);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setError(null);
    // Re-sorted on insert rather than appended: the list is ordered by date
    // and time, and a class scheduled for next Tuesday does not belong at the
    // bottom just because it was typed last.
    setItems((prev) =>
      [...prev, result.created].sort(
        (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
      )
    );
    return true;
  };

  const remove = async (classId: string) => {
    const result = await deleteClass(classId);
    if (!result.ok) {
      setError(result.message ?? "Couldn't delete the class.");
      return;
    }
    setError(null);
    setItems((prev) => prev.filter((c) => c.id !== classId));
  };

  return { classes: items, businessId, loading, error, add, remove };
}

export interface UseBusinessOfferings extends CatalogBase {
  offerings: Offering[];
  add: (draft: {
    title: string;
    category: OfferingCategory;
    price: string;
    description: string;
  }) => Promise<boolean>;
  remove: (offeringId: string) => Promise<void>;
}

export function useBusinessOfferings(): UseBusinessOfferings {
  const load = useCallback(
    (userId: string) =>
      fetchMyOfferings(userId).then((r) =>
        r.ok ? ({ ok: true, businessId: r.businessId, items: r.offerings } as const) : r
      ),
    []
  );
  const { items, setItems, businessId, loading, error, setError } = useHydrated<Offering>(load);

  const add: UseBusinessOfferings["add"] = async (draft) => {
    if (!businessId) {
      setError("Set up your business profile before publishing listings.");
      return false;
    }
    const result = await createOffering(businessId, draft);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setError(null);
    // Newest first, matching the read's ordering.
    setItems((prev) => [result.offering, ...prev]);
    return true;
  };

  const remove = async (offeringId: string) => {
    const result = await deleteOffering(offeringId);
    if (!result.ok) {
      setError(result.message ?? "Couldn't remove the listing.");
      return;
    }
    setError(null);
    setItems((prev) => prev.filter((o) => o.id !== offeringId));
  };

  return { offerings: items, businessId, loading, error, add, remove };
}

export interface UseBusinessDiscounts extends CatalogBase {
  discounts: Discount[];
  add: (label: string) => Promise<boolean>;
  remove: (discountId: string) => Promise<void>;
}

export function useBusinessDiscounts(): UseBusinessDiscounts {
  const load = useCallback(
    (userId: string) =>
      fetchMyDiscounts(userId).then((r) =>
        r.ok ? ({ ok: true, businessId: r.businessId, items: r.discounts } as const) : r
      ),
    []
  );
  const { items, setItems, businessId, loading, error, setError } = useHydrated<Discount>(load);

  const add = async (label: string) => {
    if (!businessId) {
      setError("Set up your business profile before adding discounts.");
      return false;
    }
    const result = await createDiscount(businessId, label);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setError(null);
    setItems((prev) => [...prev, result.discount]);
    return true;
  };

  const remove = async (discountId: string) => {
    const result = await deleteDiscount(discountId);
    if (!result.ok) {
      setError(result.message ?? "Couldn't remove the discount.");
      return;
    }
    setError(null);
    setItems((prev) => prev.filter((d) => d.id !== discountId));
  };

  return { discounts: items, businessId, loading, error, add, remove };
}

export interface UseMembershipPlans extends CatalogBase {
  plans: MembershipPlanRow[];
  add: (draft: PlanDraft) => Promise<boolean>;
  edit: (planId: string, draft: PlanDraft) => Promise<boolean>;
  remove: (planId: string) => Promise<void>;
}

export function useMembershipPlans(): UseMembershipPlans {
  const load = useCallback(
    (userId: string) =>
      fetchMyPlans(userId).then((r) =>
        r.ok ? ({ ok: true, businessId: r.businessId, items: r.plans } as const) : r
      ),
    []
  );
  const { items, setItems, businessId, loading, error, setError } = useHydrated<MembershipPlanRow>(load);

  const add = async (draft: PlanDraft) => {
    if (!businessId) {
      setError("Set up your business profile before adding plans.");
      return false;
    }
    const result = await createPlan(businessId, draft);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setError(null);
    setItems((prev) => [...prev, result.plan]);
    return true;
  };

  // The one edit path across the four. The row that replaces the old one comes
  // from the response, not from the draft: the price is stored as numeric and
  // comes back formatted, so what the list shows is what the column holds.
  const edit = async (planId: string, draft: PlanDraft) => {
    const result = await updatePlan(planId, draft);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setError(null);
    setItems((prev) => prev.map((p) => (p.id === planId ? result.plan : p)));
    return true;
  };

  const remove = async (planId: string) => {
    const result = await deletePlan(planId);
    if (!result.ok) {
      setError(result.message ?? "Couldn't delete the plan.");
      return;
    }
    setError(null);
    setItems((prev) => prev.filter((p) => p.id !== planId));
  };

  return { plans: items, businessId, loading, error, add, edit, remove };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { fetchMyClasses } from "../../../services/business-classes";
import {
  createPlan,
  deletePlan,
  duplicatePlan,
  fetchOfferedPlanTypes,
  setPlanStatus,
  setPlanVisible,
  fetchMembersByPlanName,
  fetchMyPlans,
  updatePlan,
  type MembershipPlanRow,
  type PlanDbStatus,
  type PlanDraft,
  type PlanKind,
  type PlanMember,
} from "../../../services/membership-plans";
import { fetchPlanFigures } from "../../../services/business-analytics";
import { todayLocal } from "../../../utils/date";
import { sharedNames } from "./planModel";

/**
 * "This period" for the plan rows' sold / used line (OP1-022 row 16, OP1-036
 * row 3). UNSPECIFIED in the handover (Q5): the calendar month to date.
 */
export function planPeriod(today: string): { from: string; to: string } {
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

/**
 * The last read, kept for this session so the plan page opens at once from the
 * list (and the list from the page) while a fresh read runs. Per account.
 */
let cache: {
  userId: string;
  plans: MembershipPlanRow[];
  businessId: string | null;
  classTypes: string[] | null;
  members: Map<string, PlanMember[]> | null | undefined;
  offered: PlanKind[] | null;
  sold: Map<string, number> | null;
} | null = null;

export type WriteOutcome = { ok: true; plan: MembershipPlanRow } | { ok: false; message: string };
export type DeleteOutcome = { ok: true } | { ok: false; message: string; inUse?: boolean };

/**
 * Everything the plan screens read (OP1-022 / 037 / 041): the business's
 * membership_plans rows, the plan types its business type is offered
 * (plan_types_for_business_type, V6-47), whether it runs classes (Class pack,
 * Drop-in, Includes and Limit only then),
 * its class types (the Includes menu), and the active members per plan from
 * the venue readers. A failed read keeps what is on screen.
 */
export function usePlans() {
  const { authUserId, profileReady } = useApp();
  const warm = cache && cache.userId === authUserId ? cache : null;
  const [plans, setPlans] = useState<MembershipPlanRow[]>(warm?.plans ?? []);
  const [businessId, setBusinessId] = useState<string | null>(warm?.businessId ?? null);
  const [loading, setLoading] = useState(!warm);
  const [error, setError] = useState<string | null>(null);
  const [classTypes, setClassTypes] = useState<string[] | null>(warm?.classTypes ?? null);
  const [members, setMembers] = useState<Map<string, PlanMember[]> | null | undefined>(warm?.members);
  const [offered, setOffered] = useState<PlanKind[] | null>(warm?.offered ?? null);
  /** B15 business_plan_figures: new sales this period by plan id; null while unknown or unreadable. */
  const [sold, setSold] = useState<Map<string, number> | null>(warm?.sold ?? null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void (async () => {
      const [r, cls] = await Promise.all([fetchMyPlans(authUserId), fetchMyClasses(authUserId)]);
      if (cancelled) return;
      setLoading(false);
      if (cls.ok) {
        const types = [...new Set(cls.classes.map((c) => (c.classType || c.title || "").trim()).filter(Boolean))];
        setClassTypes(types);
      }
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setError(null);
      setBusinessId(r.businessId);
      setPlans(r.plans);
      if (r.businessId) {
        const period = planPeriod(todayLocal());
        const [m, o, f] = await Promise.all([fetchMembersByPlanName(r.businessId), fetchOfferedPlanTypes(r.businessId), fetchPlanFigures(r.businessId, period.from, period.to)]);
        if (cancelled) return;
        setMembers(m);
        setOffered(o.types);
        if (f.ok) setSold(new Map(f.value.map((x) => [x.planId, x.sold])));
      } else {
        setMembers(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady, tick]);

  // Keep the session copy current with every change on screen.
  useEffect(() => {
    if (authUserId && !loading) cache = { userId: authUserId, plans, businessId, classTypes, members, offered, sold };
  }, [authUserId, loading, plans, businessId, classTypes, members, offered, sold]);

  const reload = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);

  /** Active members per plan, by plan id; null while unknown or unreadable. */
  const membersOf = useMemo(() => {
    const dup = sharedNames(plans);
    return (plan: MembershipPlanRow): PlanMember[] | null => {
      if (!members || dup.has(plan.name)) return null;
      return members.get(plan.name) ?? [];
    };
  }, [plans, members]);

  /** Active member counts by plan name, for the figures line. */
  const counts = useMemo(() => {
    if (!members) return null;
    const m = new Map<string, number>();
    for (const p of plans) {
      const list = membersOf(p);
      if (list) m.set(p.name, list.length);
    }
    return m;
  }, [plans, members, membersOf]);

  const add = async (draft: PlanDraft): Promise<WriteOutcome> => {
    if (!businessId) return { ok: false, message: "Save your business profile first to start adding plans." };
    const r = await createPlan(businessId, draft);
    if (!r.ok) return r;
    setPlans((prev) => [...prev, r.plan]);
    return r;
  };

  // Closes only on a write that landed (kept from BusinessGymTab): the row
  // that replaces the old one is the response, not the draft.
  const edit = async (planId: string, draft: PlanDraft): Promise<WriteOutcome> => {
    const r = await updatePlan(planId, draft);
    if (!r.ok) return r;
    setPlans((prev) => prev.map((p) => (p.id === planId ? r.plan : p)));
    return r;
  };

  const remove = async (planId: string): Promise<DeleteOutcome> => {
    const r = await deletePlan(planId);
    if (!r.ok) return { ok: false, message: r.message ?? "Couldn't delete the plan. Try again.", inUse: r.inUse };
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    return { ok: true };
  };

  const replace = (r: WriteOutcome): WriteOutcome => {
    if (r.ok) setPlans((prev) => prev.map((p) => (p.id === r.plan.id ? r.plan : p)));
    return r;
  };
  /** Pause / resume / archive / restore (B7 status). */
  const setStatus = async (planId: string, status: PlanDbStatus) => replace(await setPlanStatus(planId, status));
  /** Hide from Explore / show (B7 visible_on_explore). */
  const setVisible = async (planId: string, visible: boolean) => replace(await setPlanVisible(planId, visible));
  /** Duplicate as hidden (OP1-050). */
  const duplicate = async (plan: MembershipPlanRow): Promise<WriteOutcome> => {
    if (!businessId) return { ok: false, message: "Couldn't duplicate the plan. Try again." };
    const r = await duplicatePlan(businessId, plan);
    if (r.ok) setPlans((prev) => [...prev, r.plan]);
    return r;
  };

  /** The earliest start among active members (OP1-032 early data), or null. */
  const firstStarted = useMemo(() => {
    if (!members) return null;
    let min: string | null = null;
    for (const list of members.values()) for (const m of list) if (m.startedOn && (!min || m.startedOn < min)) min = m.startedOn;
    return min;
  }, [members]);

  const runsClasses = (classTypes?.length ?? 0) > 0;
  const totalMembers = counts ? [...counts.values()].reduce((a, b) => a + b, 0) : null;

  return {
    plans,
    businessId,
    loading,
    error,
    reload,
    add,
    edit,
    remove,
    setStatus,
    setVisible,
    duplicate,
    /** plan_types_for_business_type for this business (null: unknown, offer every type). */
    offered,
    classTypes: classTypes ?? [],
    runsClasses,
    membersLoaded: members !== undefined,
    membersOf,
    /** New sales this period (B15), or null when unknown. */
    soldOf: (planId: string): number | null => (sold ? sold.get(planId) ?? 0 : null),
    counts,
    totalMembers,
    firstStarted,
  };
}

export type PlansData = ReturnType<typeof usePlans>;

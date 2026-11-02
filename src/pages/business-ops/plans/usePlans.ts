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
import { sharedNames, type CardFigures } from "./planModel";
import { t } from "../../../i18n/core";

/** This calendar month to date: the card's "sold this month" (bizPlans "21 sold this month"). */
export function monthToDate(today: string): { from: string; to: string } {
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

type Figure = { active: number; sold: number };

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
  month: Map<string, Figure> | null;
  today: Map<string, number> | null;
} | null = null;

export type WriteOutcome = { ok: true; plan: MembershipPlanRow } | { ok: false; message: string };
export type DeleteOutcome = { ok: true } | { ok: false; message: string; inUse?: boolean };

/** One active member with the plan it holds (the list's "Active members"). */
export type ActiveMember = PlanMember & { planName: string };

/**
 * Everything the plan screens read: the business's membership_plans rows, the
 * plan types its business type is offered (plan_types_for_business_type), its
 * class types (whether it runs classes, the Includes menu), the active
 * members per plan from the venue readers, and business_plan_figures (B15
 * MB-04) for this month and today (active holders and new sales per plan id;
 * the Day passes tab's "Sold today", PLAN §3.4). A failed read keeps what is
 * on screen.
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
  const [month, setMonth] = useState<Map<string, Figure> | null>(warm?.month ?? null);
  const [today, setToday] = useState<Map<string, number> | null>(warm?.today ?? null);
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
        const day = todayLocal();
        const period = monthToDate(day);
        const [m, o, f, t] = await Promise.all([
          fetchMembersByPlanName(r.businessId),
          fetchOfferedPlanTypes(r.businessId),
          fetchPlanFigures(r.businessId, period.from, period.to),
          fetchPlanFigures(r.businessId, day, day),
        ]);
        if (cancelled) return;
        setMembers(m);
        setOffered(o.types);
        setMonth(f.ok ? new Map(f.value.map((x) => [x.planId, { active: x.activeNow, sold: x.sold }])) : null);
        setToday(t.ok ? new Map(t.value.map((x) => [x.planId, x.sold])) : null);
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
    if (authUserId && !loading) cache = { userId: authUserId, plans, businessId, classTypes, members, offered, month, today };
  }, [authUserId, loading, plans, businessId, classTypes, members, offered, month, today]);

  const reload = useCallback(() => {
    setLoading(true);
    setTick((n) => n + 1);
  }, []);

  /** Active members of one plan; null while unknown or unreadable (or when two plans share its name). */
  const membersOf = useMemo(() => {
    const dup = sharedNames(plans);
    return (plan: MembershipPlanRow): PlanMember[] | null => {
      if (!members || dup.has(plan.name)) return null;
      return members.get(plan.name) ?? [];
    };
  }, [plans, members]);

  /** Every active member across the plans (venue_members), with the plan it holds; null when unreadable. */
  const allMembers = useMemo((): ActiveMember[] | null => {
    if (!members) return null;
    const out: ActiveMember[] = [];
    for (const [planName, list] of members) for (const m of list) out.push({ ...m, planName });
    return out;
  }, [members]);

  /** A card's figures: business_plan_figures first, the venue members as the fallback for the active count. */
  const figuresOf = useCallback(
    (plan: MembershipPlanRow): CardFigures => {
      const f = month?.get(plan.id);
      const listed = membersOf(plan);
      return {
        active: f ? f.active : listed ? listed.length : null,
        soldMonth: month ? (f?.sold ?? 0) : null,
        soldToday: today ? (today.get(plan.id) ?? 0) : null,
      };
    },
    [month, today, membersOf]
  );

  const add = async (draft: PlanDraft): Promise<WriteOutcome> => {
    if (!businessId) return { ok: false, message: t("Save your business profile first to start adding plans.") };
    const r = await createPlan(businessId, draft);
    if (!r.ok) return r;
    setPlans((prev) => [...prev, r.plan]);
    return r;
  };

  // Closes only on a write that landed: the row that replaces the old one is the response, not the draft.
  const edit = async (planId: string, draft: PlanDraft): Promise<WriteOutcome> => {
    const r = await updatePlan(planId, draft);
    if (!r.ok) return r;
    setPlans((prev) => prev.map((p) => (p.id === planId ? r.plan : p)));
    return r;
  };

  const remove = async (planId: string): Promise<DeleteOutcome> => {
    const r = await deletePlan(planId);
    if (!r.ok) return { ok: false, message: r.message ?? t("Couldn't delete the plan. Try again."), inUse: r.inUse };
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    return { ok: true };
  };

  const replace = (r: WriteOutcome): WriteOutcome => {
    if (r.ok) setPlans((prev) => prev.map((p) => (p.id === r.plan.id ? r.plan : p)));
    return r;
  };
  /** Pause / resume / archive / restore (status). */
  const setStatus = async (planId: string, status: PlanDbStatus) => replace(await setPlanStatus(planId, status));
  /** Hide from Explore / show (visible_on_explore). */
  const setVisible = async (planId: string, visible: boolean) => replace(await setPlanVisible(planId, visible));
  /** Duplicate as hidden. */
  const duplicate = async (plan: MembershipPlanRow): Promise<WriteOutcome> => {
    if (!businessId) return { ok: false, message: t("Couldn't duplicate the plan. Try again.") };
    const r = await duplicatePlan(businessId, plan);
    if (r.ok) setPlans((prev) => [...prev, r.plan]);
    return r;
  };

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
    runsClasses: (classTypes?.length ?? 0) > 0,
    membersLoaded: members !== undefined,
    membersOf,
    allMembers,
    figuresOf,
  };
}

export type PlansData = ReturnType<typeof usePlans>;

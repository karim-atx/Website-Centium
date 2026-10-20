import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { professionalRole } from "../connected-professional";
import { todayLocal } from "../../utils/date";
import type { CarePlanItem, CarePlanItemKind } from "./logic";

// Release 3 · CU16 (DB-6): the client's own care plan, read-only. RLS:
// care_plans_select_client (published plans naming the client),
// care_plan_items_select_client (visible_to_client items of those plans),
// follow_ups_select (the plan's follow-ups). Nothing here writes.

export type { CarePlanItem, CarePlanItemKind } from "./logic";

export interface CarePlanFollowUp {
  dueOn: string;
  note: string | null;
  status: "planned" | "booked";
  /** The booked appointment, when the client can read it. */
  event: { day: string; start: string | null; end: string | null; allDay: boolean } | null;
}

export interface MyCarePlan {
  id: string;
  title: string;
  professionalId: string;
  professionalName: string;
  /** Specialty as written, else the type's label. */
  professionalRole: string | null;
  roleIsSpecialty: boolean;
  publishedAt: string;
  items: CarePlanItem[];
  nextFollowUp: CarePlanFollowUp | null;
}

export type CarePlanResult = { ok: true; plan: MyCarePlan | null } | { ok: false; message: string };

const failed = (e: unknown): CarePlanResult => ({
  ok: false,
  message: isOffline(e) ? OFFLINE_MESSAGE : "Couldn't load your care plan.",
});

/**
 * The client's current care plan: the most recently published active one.
 * `plan: null` means the client has none (the Health row is then not drawn).
 */
export async function getMyCarePlan(): Promise<CarePlanResult> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const me = auth.user?.id;
    if (!me) return { ok: true, plan: null };

    const { data: plans, error } = await supabase
      .from("care_plans")
      .select("id, title, professional_id, published_at")
      .eq("client_id", me)
      .eq("status", "active")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(1);
    if (error) return failed(error);
    const plan = plans?.[0];
    if (!plan || !plan.published_at) return { ok: true, plan: null };

    const today = todayLocal();
    const [itemsRes, followRes, proRes, nameRes] = await Promise.all([
      supabase
        .from("care_plan_items")
        .select("id, kind, body, metric, threshold_low, threshold_high, position")
        .eq("care_plan_id", plan.id)
        .eq("visible_to_client", true)
        .order("position"),
      supabase
        .from("follow_ups")
        .select("due_on, note, status, calendar_event_id")
        .eq("care_plan_id", plan.id)
        .in("status", ["planned", "booked"])
        .gte("due_on", today)
        .order("due_on")
        .limit(1),
      supabase
        .from("connected_professional_summary")
        .select("first_name, professional_subtype, specialty")
        .eq("id", plan.professional_id)
        .maybeSingle(),
      supabase.from("related_profile_summary").select("first_name").eq("id", plan.professional_id).maybeSingle(),
    ]);
    if (itemsRes.error) return failed(itemsRes.error);
    if (followRes.error) return failed(followRes.error);

    const f = followRes.data?.[0];
    let nextFollowUp: CarePlanFollowUp | null = null;
    if (f) {
      let event: CarePlanFollowUp["event"] = null;
      if (f.status === "booked" && f.calendar_event_id) {
        const { data: ev } = await supabase
          .from("calendar_events")
          .select("event_date, start_time, end_time, all_day")
          .eq("id", f.calendar_event_id)
          .maybeSingle();
        if (ev?.event_date) event = { day: ev.event_date, start: ev.start_time, end: ev.end_time, allDay: !!ev.all_day };
      }
      nextFollowUp = { dueOn: f.due_on, note: f.note, status: f.status as "planned" | "booked", event };
    }

    const pro = proRes.data;
    const specialty = pro?.specialty?.trim() || null;
    return {
      ok: true,
      plan: {
        id: plan.id,
        title: plan.title,
        professionalId: plan.professional_id,
        professionalName: pro?.first_name?.trim() || nameRes.data?.first_name?.trim() || "Your professional",
        professionalRole: pro ? professionalRole({ specialty: pro.specialty, subtype: pro.professional_subtype }) : null,
        roleIsSpecialty: !!specialty,
        publishedAt: plan.published_at,
        items: (itemsRes.data ?? []).map((i) => ({
          id: i.id,
          kind: i.kind as CarePlanItemKind,
          body: i.body,
          metric: i.metric,
          thresholdLow: i.threshold_low,
          thresholdHigh: i.threshold_high,
          position: i.position,
        })),
        nextFollowUp,
      },
    };
  } catch (e) {
    return failed(e);
  }
}

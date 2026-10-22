// Market + Share 3.0 · W2 · My bookings' reads (C-MO.4.5). DB4 my_bookings
// (optional, PLAN §2.2) hasn't landed, so the tabs are composed client-side
// from the live readers, each through its own RLS:
// - Memberships: my_gym_memberships() (services/venues, with its offline pass
//   copy) and my_hires() (services/hires);
// - Upcoming / Past: my_class_schedule (self-scoping view), the classes'
//   venue and cancellation (business_classes, readable to a booker through
//   has_class_booking) and the venues' names (gyms, public), plus the
//   member's professional sessions (appointments with a staff_id and no
//   business: request_professional_booking's rows, appointments_select
//   client_id = auth.uid()), named from public_professional_directory.
// No writes here. Ending a membership stays services/venues
// endMyGymMembership (D-46).

import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline } from "../../services/network-error";
import { fetchMyGymMemberships, type GymMembership } from "../../services/venues";
import { fetchMyHires, type MyHire } from "../../services/hires";
import { typeLabel } from "../../components/pro/profile/typeLabel";
import type { ProfessionalSubtype } from "../../types";
import type { ClassInput, SessionInput } from "./myBookingsModel";

export type Loaded<T> = { ok: true; value: T } | { ok: false; offline: boolean };

type Q = PromiseLike<{ data: unknown[] | null; error: PostgrestError | null }>;
interface Sel {
  select: (c: string) => Sel & Q;
  in: (col: string, v: string[]) => Sel & Q;
  eq: (col: string, v: string) => Sel & Q;
  is: (col: string, v: null) => Sel & Q;
  not: (col: string, op: string, v: null) => Sel & Q;
}
const db = supabase as unknown as { from: (t: string) => Sel };

export interface MembershipsData {
  gyms: GymMembership[];
  hires: MyHire[];
  /** Professional id → "Personal trainer" (null when the directory doesn't list them). */
  hireTypes: Map<string, string>;
  /** Set when the gym rows are the device's offline copy. */
  cachedAt: string | null;
}

async function professionalNames(ids: string[]): Promise<Map<string, { first: string; type: string | null }>> {
  const out = new Map<string, { first: string; type: string | null }>();
  const uniq = [...new Set(ids)];
  if (uniq.length === 0) return out;
  const r = await db.from("public_professional_directory").select("profile_id, first_name, professional_subtype").in("profile_id", uniq);
  if (r.error) return out;
  for (const p of (r.data ?? []) as { profile_id: string; first_name: string | null; professional_subtype: ProfessionalSubtype | null }[]) {
    out.set(p.profile_id, { first: p.first_name ?? "", type: p.professional_subtype ? typeLabel(p.professional_subtype) : null });
  }
  return out;
}

export async function loadMemberships(): Promise<Loaded<MembershipsData>> {
  const [g, h] = await Promise.all([fetchMyGymMemberships(), fetchMyHires()]);
  if (!g.ok) return { ok: false, offline: typeof navigator !== "undefined" && navigator.onLine === false };
  const hires = h.ok ? h.hires.filter((x) => x.status !== "cancelled" || !!x.confirmedAt) : [];
  const names = await professionalNames(hires.map((x) => x.professionalId));
  const hireTypes = new Map<string, string>();
  for (const [id, n] of names) if (n.type) hireTypes.set(id, n.type);
  return { ok: true, value: { gyms: g.value, hires, hireTypes, cachedAt: g.value.find((m) => m.cachedAt)?.cachedAt ?? null } };
}

export interface ScheduleData {
  classes: ClassInput[];
  sessions: SessionInput[];
}

export async function loadSchedule(): Promise<Loaded<ScheduleData>> {
  try {
    const sched = await db
      .from("my_class_schedule")
      .select("booking_id, class_id, title, event_date, start_time, end_time, business_name");
    if (sched.error) return { ok: false, offline: isOffline(sched.error) };
    const rows = (sched.data ?? []) as { booking_id: string; class_id: string; title: string; event_date: string; start_time: string | null; end_time: string | null; business_name: string | null }[];
    const classIds = [...new Set(rows.map((r) => r.class_id))];
    const meta = new Map<string, { gymId: string | null; cancelledAt: string | null }>();
    const gymName = new Map<string, string>();
    if (classIds.length) {
      const c = await db.from("business_classes").select("id, gym_id, cancelled_at").in("id", classIds);
      if (!c.error) for (const x of (c.data ?? []) as { id: string; gym_id: string | null; cancelled_at: string | null }[]) meta.set(x.id, { gymId: x.gym_id, cancelledAt: x.cancelled_at });
      const gymIds = [...new Set([...meta.values()].map((m) => m.gymId).filter((x): x is string => !!x))];
      if (gymIds.length) {
        const gy = await db.from("gyms").select("id, name").in("id", gymIds);
        if (!gy.error) for (const x of (gy.data ?? []) as { id: string; name: string }[]) gymName.set(x.id, x.name);
      }
    }
    const classes: ClassInput[] = rows.map((r) => {
      const m = meta.get(r.class_id);
      return {
        bookingId: r.booking_id,
        classId: r.class_id,
        title: r.title,
        place: (m?.gymId && gymName.get(m.gymId)) || r.business_name || "Class",
        eventDate: r.event_date,
        startTime: r.start_time,
        endTime: r.end_time,
        cancelledAt: m?.cancelledAt ?? null,
      };
    });

    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    let sessions: SessionInput[] = [];
    if (uid) {
      const a = await db
        .from("appointments")
        .select("id, service_name, starts_at, ends_at, status, price_agreed, staff_id")
        .eq("client_id", uid)
        .is("business_id", null)
        .not("staff_id", "is", null);
      if (a.error) return { ok: false, offline: isOffline(a.error) };
      const appts = (a.data ?? []) as { id: string; service_name: string; starts_at: string; ends_at: string; status: string; price_agreed: number | string; staff_id: string | null }[];
      const names = await professionalNames(appts.map((x) => x.staff_id).filter((x): x is string => !!x));
      sessions = appts.map((x) => {
        const n = x.staff_id ? names.get(x.staff_id) : undefined;
        const first = n?.first || "Your professional";
        return {
          id: x.id,
          serviceName: x.service_name,
          professionalId: x.staff_id,
          who: n?.type ? `${first} · ${n.type}` : first,
          startsAt: x.starts_at,
          endsAt: x.ends_at,
          status: x.status,
          price: Number(x.price_agreed) || 0,
        };
      });
    }
    return { ok: true, value: { classes, sessions } };
  } catch (e) {
    return { ok: false, offline: isOffline(e) };
  }
}

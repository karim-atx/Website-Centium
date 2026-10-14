import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import type { PaymentRecord, PayMethod, PayStatus, PlanLite } from "./model";

export * from "./model";

// Revenue and payments (AN14): the reader. What a business has recorded as
// paid today lives on two tables (BACKEND_REQUIREMENTS-v6 §4.1, "cash
// today"):
//   - gym_memberships, read through venue_members(gym) for every venue the
//     caller is an insider of (my_venues). That reader gives the price, the
//     payment status and method, start and end, but NOT paid_at: a paid
//     membership's date is not shared with Analytics yet, so it is marked
//     `paidUndated` and never placed in a period.
//   - business_class_bookings with business_classes (owner SELECT policy):
//     price_agreed, payment_status, payment_method, paid_at, created_at.
// Marking paid uses the existing mark-paid functions, the only "it was paid"
// entry points (HANDOVER_API Stage 5): mark_gym_membership_paid(id) and
// mark_class_booking_paid(id, reference).
//
// B8 (business_payments, refunds, attempts, centium_charges) is probed once:
// until the table exists (42P01 / PGRST205) the screens keep their pending
// states (Whish "Soon", Failed hidden, no undo, no reminders).

export type Result<T> =
  { ok: true; value: T } | { ok: false; message: string; code?: string };

type Res<T> = PromiseLike<{ data: T | null; error: PostgrestError | null }>;
type Rpc = <T>(fn: string, args?: Record<string, unknown>) => Res<T>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

type Sel = {
  eq: (c: string, v: string) => Res<Record<string, unknown>[]>;
  in: (c: string, v: string[]) => Res<Record<string, unknown>[]>;
  limit: (n: number) => Res<Record<string, unknown>[]>;
};
const db = supabase as unknown as {
  from: (t: string) => { select: (c: string) => Sel };
};

const fail = <T>(error: PostgrestError, fallback: string): Result<T> => ({
  ok: false,
  code: error.code,
  message: isOffline(error) ? OFFLINE_MESSAGE : fallback,
});

const LOAD_FAIL = "Couldn't load revenue.";

interface VenueRow {
  gym_id: string;
  business_id: string;
  name: string;
}
interface MemberRow {
  membership_id: string;
  member_first_name: string | null;
  member_is_minor: boolean | null;
  plan_name: string | null;
  status: string;
  payment_method: PayMethod;
  payment_status: PayStatus;
  price_agreed: number | string | null;
  started_on: string | null;
  expires_on: string | null;
  joined_at: string;
  total_count: number | string;
}

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

export interface RevenueData {
  records: PaymentRecord[];
  plans: PlanLite[];
  venues: { id: string; name: string }[];
  /** B8's ledger is on the server (business_payments answers). */
  ledger: boolean;
}

async function membershipsOf(gymId: string): Promise<Result<PaymentRecord[]>> {
  const out: PaymentRecord[] = [];
  for (let offset = 0; offset < 5000; offset += 200) {
    const { data, error } = await rpc<MemberRow[]>("venue_members", {
      p_gym_id: gymId,
      p_status: null,
      p_limit: 200,
      p_offset: offset,
    });
    if (error) return fail(error, LOAD_FAIL);
    const rows = data ?? [];
    for (const m of rows) {
      const paid = m.payment_status === "paid";
      out.push({
        key: `membership:${m.membership_id}`,
        kind: "membership",
        id: m.membership_id,
        gymId,
        amount: num(m.price_agreed),
        status: m.payment_status,
        method: m.payment_method,
        paidAt: null,
        paidUndated: paid,
        createdAt: m.joined_at,
        dueOn: m.started_on,
        who: m.member_first_name,
        isMinor: !!m.member_is_minor,
        item: m.plan_name ?? "Membership",
        membershipStatus: m.status,
        startedOn: m.started_on,
        expiresOn: m.expires_on,
      });
    }
    const total = Number(rows[0]?.total_count ?? 0);
    if (rows.length < 200 || offset + 200 >= total) break;
  }
  return { ok: true, value: out };
}

async function bookingsOf(
  businessId: string,
): Promise<Result<PaymentRecord[]>> {
  const cls = await db
    .from("business_classes")
    .select("id, title, event_date, gym_id")
    .eq("business_id", businessId);
  if (cls.error) return fail(cls.error, LOAD_FAIL);
  const classes = new Map((cls.data ?? []).map((c) => [c.id as string, c]));
  const ids = [...classes.keys()];
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const r = await db
      .from("business_class_bookings")
      .select(
        "id, business_class_id, client_id, payment_method, payment_status, price_agreed, paid_at, created_at",
      )
      .in("business_class_id", ids.slice(i, i + 150));
    if (r.error) return fail(r.error, LOAD_FAIL);
    rows.push(...(r.data ?? []));
  }
  // First names from the public summary (as the team and class services read them).
  const people = [...new Set(rows.map((r) => r.client_id as string))];
  const names = new Map<string, string | null>();
  for (let i = 0; i < people.length; i += 150) {
    const r = await db
      .from("public_profile_summary")
      .select("id, first_name")
      .in("id", people.slice(i, i + 150));
    if (r.error) return fail(r.error, LOAD_FAIL);
    for (const p of r.data ?? [])
      names.set(p.id as string, (p.first_name as string | null) ?? null);
  }
  return {
    ok: true,
    value: rows.map((b) => {
      const c = classes.get(b.business_class_id as string);
      return {
        key: `class:${b.id as string}`,
        kind: "class" as const,
        id: b.id as string,
        gymId: (c?.gym_id as string | null) ?? null,
        amount: num(b.price_agreed),
        status: b.payment_status as PayStatus,
        method: b.payment_method as PayMethod,
        paidAt: (b.paid_at as string | null) ?? null,
        paidUndated: false,
        createdAt: b.created_at as string,
        dueOn: (c?.event_date as string | null) ?? null,
        who: names.get(b.client_id as string) ?? null,
        isMinor: false,
        item: (c?.title as string | null) ?? "Class",
        membershipStatus: null,
        startedOn: null,
        expiresOn: null,
      };
    }),
  };
}

let ledgerKnown: boolean | null = null;
/** Is B8's business_payments ledger on the server? Asked once per session. */
export async function hasLedger(): Promise<boolean> {
  if (ledgerKnown !== null) return ledgerKnown;
  const r = await db.from("business_payments").select("id").limit(1);
  if (r.error && ["42P01", "PGRST205", "PGRST202"].includes(r.error.code))
    ledgerKnown = false;
  else ledgerKnown = !r.error;
  return ledgerKnown;
}

/** Everything the Revenue screens read, for one business. */
export async function fetchRevenue(
  businessId: string,
): Promise<Result<RevenueData>> {
  const v = await rpc<VenueRow[]>("my_venues");
  if (v.error) return fail(v.error, LOAD_FAIL);
  const venues = (v.data ?? []).filter((x) => x.business_id === businessId);
  const records: PaymentRecord[] = [];
  for (const venue of venues) {
    const m = await membershipsOf(venue.gym_id);
    if (!m.ok) return m;
    records.push(...m.value);
  }
  const b = await bookingsOf(businessId);
  if (!b.ok) return b;
  // An unpaid booking at a venue carries the person's first name and minor
  // flag in venue_pending_payments (the console's own reader); the public
  // summary leaves most clients' names out.
  const named = new Map<string, { who: string | null; minor: boolean }>();
  for (const venue of venues) {
    const pp = await rpc<{ kind: string; id: string; person_first_name: string | null; person_is_minor: boolean | null }[]>("venue_pending_payments", { p_gym_id: venue.gym_id });
    if (pp.error) return fail(pp.error, LOAD_FAIL);
    for (const x of pp.data ?? []) if (x.kind === "class") named.set(x.id, { who: x.person_first_name, minor: !!x.person_is_minor });
  }
  records.push(
    ...b.value.map((r) => {
      const n = named.get(r.id);
      return n ? { ...r, who: r.who ?? n.who, isMinor: n.minor } : r;
    })
  );
  const p = await db
    .from("membership_plans")
    .select("id, name, price, billing")
    .eq("business_id", businessId);
  if (p.error) return fail(p.error, LOAD_FAIL);
  const plans = (p.data ?? []).map((x) => ({
    id: x.id as string,
    name: x.name as string,
    price: Number(x.price),
    billing: String(x.billing),
  }));
  const ledger = await hasLedger();
  return {
    ok: true,
    value: {
      records,
      plans,
      venues: venues.map((x) => ({ id: x.gym_id, name: x.name })),
      ledger,
    },
  };
}

/** Mark Paid at the desk: the existing functions, nothing else (Stage 5). */
export async function markPaid(rec: PaymentRecord): Promise<Result<true>> {
  const { error } =
    rec.kind === "membership"
      ? await rpc<null>("mark_gym_membership_paid", { p_membership_id: rec.id })
      : await rpc<null>("mark_class_booking_paid", {
          p_booking_id: rec.id,
          p_reference: null,
        });
  if (error) {
    console.error("[revenue] Could not mark paid:", error.message);
    return {
      ok: false,
      code: error.code,
      message: "Couldn't record the payment. Try again.",
    };
  }
  return { ok: true, value: true };
}

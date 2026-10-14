import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import {
  describePaymentRefusal,
  type MoneyOwedFilter,
  type MoneyOwedRow,
  type MoneyOwedSort,
  type PayKind,
  type PaymentRecord,
  type PayMethod,
  type PayStatus,
  type PlanLite,
} from "./model";
import { fetchAllRenewalsDue } from "../front-desk";
import type { RenewalDue } from "../front-desk/frontDeskLogic";

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
// states (Whish "Soon", Failed hidden). B8 RV-02 (money_owed,
// unmark_payment_paid, send_payment_reminder) is decided by each call's own
// answer: a missing function (PGRST202 / 42883) comes back `pending` and the
// Money owed screens keep the client-side list, with no Undo and no reminders.

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; code?: string; pending?: boolean };

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
  /** B7 MB-05: venue_renewals_due(gym, 30) across the venues. */
  renewalsDue: RenewalDue[];
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
  const due = await fetchAllRenewalsDue(
    venues.map((x) => ({ gymId: x.gym_id, name: x.name })),
    30,
  );
  if (!due.ok) return due;
  const ledger = await hasLedger();
  return {
    ok: true,
    value: {
      records,
      plans,
      venues: venues.map((x) => ({ id: x.gym_id, name: x.name })),
      ledger,
      renewalsDue: due.value,
    },
  };
}

/** Mark Paid at the desk: the existing functions, nothing else (Stage 5). */
export async function markPaid(rec: {
  kind: PayKind;
  id: string;
}): Promise<Result<true>> {
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

// ---------- B8 RV-02: money owed, undo, reminders ----------

/** The function is not on this database yet (the stage has not shipped there). */
const isMissingFunction = (e: { code?: string }) =>
  e.code === "PGRST202" || e.code === "42883";

const OWED_FAIL = "Couldn't load money owed.";

export interface MoneyOwedPage {
  rows: MoneyOwedRow[];
  total: number;
  /** The caller lacks the revenue permission (ATX09): shown as an empty list. */
  denied: boolean;
}

/**
 * money_owed(business, sort, filter, limit, offset): business-wide, masked
 * labels, server-side days overdue. Needs the revenue permission; without it
 * the answer is an empty, `denied` page rather than an error.
 */
export async function fetchMoneyOwed(
  businessId: string,
  opts: {
    sort?: MoneyOwedSort;
    filter?: MoneyOwedFilter;
    limit?: number;
    offset?: number;
  } = {},
): Promise<Result<MoneyOwedPage>> {
  const { data, error } = await rpc<MoneyOwedRow[]>("money_owed", {
    p_business_id: businessId,
    p_sort: opts.sort ?? "overdue",
    p_filter: opts.filter ?? "all",
    p_limit: opts.limit ?? 50,
    p_offset: opts.offset ?? 0,
  });
  if (error) {
    if (isMissingFunction(error))
      return { ok: false, pending: true, code: error.code, message: "" };
    if (error.code === "ATX09")
      return { ok: true, value: { rows: [], total: 0, denied: true } };
    console.error("[revenue] Could not read money owed:", error.message);
    return fail(error, OWED_FAIL);
  }
  const rows = data ?? [];
  return {
    ok: true,
    value: { rows, total: Number(rows[0]?.total_count ?? 0), denied: false },
  };
}

/** Every page of money_owed for one sort and filter (the screens sum the total). */
export async function fetchAllMoneyOwed(
  businessId: string,
  sort: MoneyOwedSort,
  filter: MoneyOwedFilter,
): Promise<Result<MoneyOwedPage>> {
  const rows: MoneyOwedRow[] = [];
  for (let offset = 0; offset < 5000; offset += 200) {
    const r = await fetchMoneyOwed(businessId, { sort, filter, limit: 200, offset });
    if (!r.ok || r.value.denied) return r;
    rows.push(...r.value.rows);
    if (r.value.rows.length < 200 || rows.length >= r.value.total) break;
  }
  return { ok: true, value: { rows, total: rows.length, denied: false } };
}

/** Undo of Mark as paid (AN14-048): audited, needs revenue; 22023 when it is not paid. */
export async function unmarkPaymentPaid(
  paymentId: string,
  note?: string | null,
): Promise<Result<true>> {
  const { error } = await rpc<string>("unmark_payment_paid", {
    p_payment_id: paymentId,
    p_note: note ?? null,
  });
  if (error) {
    if (isMissingFunction(error))
      return { ok: false, pending: true, code: error.code, message: "Undo isn't available yet." };
    console.error("[revenue] Could not undo mark paid:", error.message);
    return {
      ok: false,
      code: error.code,
      message: isOffline(error) ? OFFLINE_MESSAGE : describePaymentRefusal(error, "unmark"),
    };
  }
  return { ok: true, value: true };
}

/**
 * Send reminder / Follow up (AN14-044 S2, AN14-049): the server sends a fixed
 * payment_reminder card from the business into the member's thread and logs
 * it (money_owed's reminders_sent). Returns the message id.
 */
export async function sendPaymentReminder(
  paymentId: string,
): Promise<Result<string>> {
  const { data, error } = await rpc<string>("send_payment_reminder", {
    p_payment_id: paymentId,
  });
  if (error) {
    if (isMissingFunction(error))
      return { ok: false, pending: true, code: error.code, message: "Reminders aren't available yet." };
    console.error("[revenue] Could not send a payment reminder:", error.message);
    return {
      ok: false,
      code: error.code,
      message: isOffline(error) ? OFFLINE_MESSAGE : describePaymentRefusal(error, "remind"),
    };
  }
  return { ok: true, value: String(data) };
}

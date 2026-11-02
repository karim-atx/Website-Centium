import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import {
  describePaymentRefusal,
  dayIn,
  describeRefundRefusal,
  type LedgerStatus,
  type OwedSourceKind,
  type PlanReaderRow,
  type StreamReaderRow,
  type TxReaderRow,
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
import { t, tk } from "../../i18n/core";

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
// B8 RV-01 (recorded_revenue_by_stream / _by_plan, transactions_page) and
// RV-04 (record_refund) follow the same rule (bottom of this file): the
// records read here stay the fallback for Overview, Streams and Transactions
// only while those functions are missing.

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; code?: string; pending?: boolean };

type Res<T> = PromiseLike<{ data: T | null; error: PostgrestError | null }>;
type Rpc = <T>(fn: string, args?: Record<string, unknown>) => Res<T>;
const rpc = (supabase as unknown as { rpc: (...a: unknown[]) => unknown }).rpc.bind(supabase) as unknown as Rpc;

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

// Messages stay English here (screens compare against OFFLINE_MESSAGE) and
// show through t() on the screen.
const LOAD_FAIL = tk("Couldn't load revenue.");

interface VenueRow {
  gym_id: string;
  business_id: string;
  name: string;
}
interface MemberRow {
  membership_id: string;
  /** Q-05: masked unless shared. */
  member_label: string | null;
  member_is_minor: boolean | null;
  plan_name: string | null;
  status: string;
  payment_method: PayMethod;
  payment_status: PayStatus;
  price_agreed: number | string | null;
  started_on: string | null;
  expires_on: string | null;
  joined_at: string;
  /** CN (20261203000000): granted by a member code. Absent on an older stack. */
  granted?: boolean | null;
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

// CN (Batch 2): a membership granted by a member code arrives with
// venue_members' `granted` set (price 0.00, cash, paid on the row, but never
// a sale). The record carries `granted`, and the model leaves it out of every
// money figure (dated / undatedPaid / transactions / recurringMonthly), never
// marks it paid-undated, and keeps it in activeMembers() (a grant is still a
// member) and in renewals(), where the screens label it and count it at
// venue_renewals_due.renewal_price (251ab70): renewing one charges
// the plan price. The recorded figures come from business_payments, which
// skips grants too.
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
      const granted = m.granted === true;
      const paid = m.payment_status === "paid" && !granted;
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
        who: m.member_label,
        isMinor: !!m.member_is_minor,
        item: m.plan_name ?? t("Membership"),
        membershipStatus: m.status,
        startedOn: m.started_on,
        expiresOn: m.expires_on,
        granted,
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
        item: (c?.title as string | null) ?? t("Class"),
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
    const pp = await rpc<{ kind: string; id: string; person_label: string | null; person_is_minor: boolean | null }[]>("venue_pending_payments", { p_gym_id: venue.gym_id });
    if (pp.error) return fail(pp.error, LOAD_FAIL);
    for (const x of pp.data ?? []) if (x.kind === "class") named.set(x.id, { who: x.person_label, minor: !!x.person_is_minor });
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

/**
 * Mark Paid at the desk: the existing functions, nothing else (Stage 5). A
 * class booking may carry a reference (OURS-OP1-class-roster row 10;
 * mark_class_booking_paid p_reference, a second call corrects it).
 */
export async function markPaid(
  rec: {
    kind: PayKind;
    id: string;
  },
  reference: string | null = null
): Promise<Result<true>> {
  const { error } =
    rec.kind === "membership"
      ? await rpc<null>("mark_gym_membership_paid", { p_membership_id: rec.id })
      : await rpc<null>("mark_class_booking_paid", {
          p_booking_id: rec.id,
          p_reference: reference?.trim() || null,
        });
  if (error) {
    console.error("[revenue] Could not mark paid:", error.message);
    return {
      ok: false,
      code: error.code,
      message: tk("Couldn't record the payment. Try again."),
    };
  }
  return { ok: true, value: true };
}

// ---------- B8 RV-02: money owed, undo, reminders ----------

/** The function is not on this database yet (the stage has not shipped there). */
const isMissingFunction = (e: { code?: string }) =>
  e.code === "PGRST202" || e.code === "42883";

const OWED_FAIL = tk("Couldn't load money owed.");

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
    /** "cash" / "whish" (venue_payment_method); null = every method. An unknown one is refused (22023). */
    method?: string | null;
    limit?: number;
    offset?: number;
  } = {},
): Promise<Result<MoneyOwedPage>> {
  const { data, error } = await rpc<MoneyOwedRow[]>("money_owed", {
    p_business_id: businessId,
    p_sort: opts.sort ?? "overdue",
    p_filter: opts.filter ?? "all",
    p_method: opts.method ?? null,
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
  method: string | null = null,
): Promise<Result<MoneyOwedPage>> {
  const rows: MoneyOwedRow[] = [];
  for (let offset = 0; offset < 5000; offset += 200) {
    const r = await fetchMoneyOwed(businessId, { sort, filter, method, limit: 200, offset });
    if (!r.ok || r.value.denied) return r;
    rows.push(...r.value.rows);
    if (r.value.rows.length < 200 || rows.length >= r.value.total) break;
  }
  return { ok: true, value: { rows, total: rows.length, denied: false } };
}

// ---------------------------------------------------------------------------
// B8 RV-05 payment settings and RV-03 retries (HANDOVER_API "B7 + B8 catch-up")
// ---------------------------------------------------------------------------

export interface PaymentSettings {
  cashEnabled: boolean;
  whishEnabled: boolean;
}

/**
 * business_payment_settings (readable with 'revenue'). Null when there is no
 * row, the table is missing, or the seat can't read it: the page then keeps
 * its defaults (cash on, Whish off), which is also the server's default.
 */
export async function fetchPaymentSettings(businessId: string): Promise<PaymentSettings | null> {
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: unknown; error: PostgrestError | null }> } } };
  })
    .from("business_payment_settings")
    .select("cash_enabled, whish_enabled")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as { cash_enabled: boolean; whish_enabled: boolean };
  return { cashEnabled: !!r.cash_enabled, whishEnabled: !!r.whish_enabled };
}

/**
 * retry_payment(id), RV-03: needs revenue. Cash is refused (nothing to
 * retry); ATX02 means a retry is already running. Only reachable once Whish
 * is live: the failed list is empty until then.
 */
export async function retryPayment(paymentId: string): Promise<Result<true>> {
  const { error } = await rpc<string>("retry_payment", { p_payment_id: paymentId });
  if (error) {
    if (error.code === "ATX02") return { ok: false, code: error.code, message: tk("Already retrying.") };
    return fail(error, tk("Couldn't start the retry. Try again."));
  }
  return { ok: true, value: true };
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
      return { ok: false, pending: true, code: error.code, message: tk("Undo isn't available yet.") };
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
      return { ok: false, pending: true, code: error.code, message: tk("Reminders aren't available yet.") };
    console.error("[revenue] Could not send a payment reminder:", error.message);
    return {
      ok: false,
      code: error.code,
      message: isOffline(error) ? OFFLINE_MESSAGE : describePaymentRefusal(error, "remind"),
    };
  }
  return { ok: true, value: String(data) };
}

// ---------- B8 RV-01: recorded revenue readers ----------
//
// recorded_revenue_by_stream, recorded_revenue_by_plan and transactions_page
// all need the revenue permission (business_can). Each call decides its own
// state, as money_owed does: ATX09 → an empty, `denied` answer (not an
// error); a missing function (PGRST202 / 42883) → `pending`, and the screens
// keep the records' sums. Dates go as the business-local days the readers
// take (YYYY-MM-DD); null is all time.

const REV_FAIL = tk("Couldn't load revenue.");
const TX_FAIL = tk("Couldn't load transactions.");

export interface ReaderPage<T> {
  rows: T[];
  /** transactions_page's total_count (the reader rows' length elsewhere). */
  total: number;
  /** The caller lacks the revenue permission (ATX09): shown as empty. */
  denied: boolean;
}

async function readerCall<T extends object>(
  fn: string,
  args: Record<string, unknown>,
  failText: string,
): Promise<Result<ReaderPage<T>>> {
  const { data, error } = await rpc<T[]>(fn, args);
  if (error) {
    if (isMissingFunction(error)) return { ok: false, pending: true, code: error.code, message: "" };
    if (error.code === "ATX09") return { ok: true, value: { rows: [], total: 0, denied: true } };
    console.error(`[revenue] Could not read ${fn}:`, error.message);
    return fail(error, failText);
  }
  const rows = data ?? [];
  const head = rows[0] as { total_count?: unknown } | undefined;
  const total = head && head.total_count !== undefined ? Number(head.total_count) : rows.length;
  return { ok: true, value: { rows, total, denied: false } };
}

/** recorded_revenue_by_stream(business, from, to): per price type, net of refunds. */
export function fetchRevenueByStream(
  businessId: string,
  from: string | null,
  to: string | null,
): Promise<Result<ReaderPage<StreamReaderRow>>> {
  return readerCall<StreamReaderRow>(
    "recorded_revenue_by_stream",
    { p_business_id: businessId, p_from: from, p_to: to },
    REV_FAIL,
  );
}

/** recorded_revenue_by_plan(business, from, to): per plan; the null plan holds class bookings and other income. */
export function fetchRevenueByPlan(
  businessId: string,
  from: string | null,
  to: string | null,
): Promise<Result<ReaderPage<PlanReaderRow>>> {
  return readerCall<PlanReaderRow>(
    "recorded_revenue_by_plan",
    { p_business_id: businessId, p_from: from, p_to: to },
    REV_FAIL,
  );
}

export interface TxQuery {
  from: string | null;
  to: string | null;
  /** business_payment_status; null = every status. Unknown → 22023. */
  status?: LedgerStatus | null;
  /** venue_payment_method; null = every method. Unknown → 22023. */
  method?: PayMethod | null;
  /** A shared first name, member number, amount ("15") or provider reference. */
  search?: string | null;
}

/** transactions_page: one page, newest first (paid_at, else recorded_at), refunded and pending rows included. */
export function fetchTransactions(
  businessId: string,
  q: TxQuery,
  limit = 50,
  offset = 0,
): Promise<Result<ReaderPage<TxReaderRow>>> {
  const search = q.search?.trim() ? q.search.trim() : null;
  return readerCall<TxReaderRow>(
    "transactions_page",
    {
      p_business_id: businessId,
      p_from: q.from,
      p_to: q.to,
      p_status: q.status ?? null,
      p_method: q.method ?? null,
      p_search: search,
      p_limit: limit,
      p_offset: offset,
    },
    TX_FAIL,
  );
}

/** Every page of transactions_page for one query (200 a page, the reader's cap). */
export async function fetchAllTransactions(
  businessId: string,
  q: TxQuery,
): Promise<Result<ReaderPage<TxReaderRow>>> {
  const rows: TxReaderRow[] = [];
  let total = 0;
  for (let offset = 0; offset < 10000; offset += 200) {
    const r = await fetchTransactions(businessId, q, 200, offset);
    if (!r.ok || r.value.denied) return r;
    rows.push(...r.value.rows);
    total = r.value.total;
    if (r.value.rows.length < 200 || rows.length >= total) break;
  }
  return { ok: true, value: { rows, total, denied: false } };
}

/** The first day money was recorded as paid (all time): transactions_page's oldest paid row. */
export async function fetchFirstPaidDay(businessId: string): Promise<Result<string | null>> {
  const head = await fetchTransactions(businessId, { from: null, to: null, status: "paid" }, 1, 0);
  if (!head.ok) return head;
  if (head.value.denied || head.value.total === 0) return { ok: true, value: null };
  if (head.value.total === 1) return { ok: true, value: head.value.rows[0]?.paid_on ?? null };
  const last = await fetchTransactions(businessId, { from: null, to: null, status: "paid" }, 1, head.value.total - 1);
  if (!last.ok) return last;
  return { ok: true, value: last.value.rows[0]?.paid_on ?? head.value.rows[0]?.paid_on ?? null };
}

// ---------- One payment, for the Transactions detail ----------

export interface RefundEntry {
  id: string;
  amount: number;
  reason: string | null;
  at: string;
  /** The business's own day of `at`. */
  on: string;
}

export interface LedgerPayment {
  id: string;
  sourceKind: OwedSourceKind;
  sourceId: string;
  personId: string | null;
  label: string;
  priceType: string;
  amount: number;
  refunded: number;
  method: PayMethod;
  status: LedgerStatus;
  dueOn: string | null;
  paidAt: string | null;
  /** The business's own day of paid_at (as the readers' paid_on). */
  paidOn: string | null;
  recordedAt: string;
  gymId: string | null;
  refunds: RefundEntry[];
}

/**
 * One business_payments row (the revenue SELECT policy), its refunds
 * (business_refunds, same policy) and the person's label as the readers give
 * it (business_person_label; "Guest" without an account). Null when the row
 * is not visible (gone, or no revenue permission).
 */
export async function fetchLedgerPayment(
  businessId: string,
  paymentId: string,
): Promise<Result<LedgerPayment | null>> {
  const p = await db
    .from("business_payments")
    .select("id, business_id, gym_id, source_kind, source_id, payer_id, price_type, amount, method, status, due_on, paid_at, recorded_at")
    .eq("id", paymentId);
  if (p.error) {
    console.error("[revenue] Could not read the payment:", p.error.message);
    return fail(p.error, tk("Couldn't load this payment."));
  }
  const row = (p.data ?? []).find((x) => x.business_id === businessId);
  if (!row) return { ok: true, value: null };
  const r = await db
    .from("business_refunds")
    .select("id, amount, reason, at")
    .eq("payment_id", paymentId);
  if (r.error) {
    console.error("[revenue] Could not read refunds:", r.error.message);
    return fail(r.error, tk("Couldn't load this payment."));
  }
  // The readers date in the business's timezone (UTC when unset): the detail does too.
  const b = await db.from("business_profiles").select("timezone").eq("id", businessId);
  const tz = (!b.error && (b.data?.[0]?.timezone as string | null)) || "UTC";
  const refunds = (r.data ?? [])
    .map((x) => ({
      id: x.id as string,
      amount: Number(x.amount),
      reason: (x.reason as string | null) ?? null,
      at: x.at as string,
      on: dayIn(x.at as string, tz),
    }))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const payer = (row.payer_id as string | null) ?? null;
  let label = "Guest";
  if (payer) {
    const l = await rpc<string>("business_person_label", {
      p_business_id: businessId,
      p_person_id: payer,
    });
    if (l.error) {
      console.error("[revenue] Could not read the person's label:", l.error.message);
      return fail(l.error, tk("Couldn't load this payment."));
    }
    label = String(l.data ?? "Member");
  }
  return {
    ok: true,
    value: {
      id: row.id as string,
      sourceKind: row.source_kind as OwedSourceKind,
      sourceId: row.source_id as string,
      personId: payer,
      label,
      priceType: row.price_type as string,
      amount: Number(row.amount),
      refunded: refunds.reduce((s, x) => s + x.amount, 0),
      method: row.method as PayMethod,
      status: row.status as LedgerStatus,
      dueOn: (row.due_on as string | null) ?? null,
      paidAt: (row.paid_at as string | null) ?? null,
      paidOn: row.paid_at ? dayIn(row.paid_at as string, tz) : null,
      recordedAt: row.recorded_at as string,
      gymId: (row.gym_id as string | null) ?? null,
      refunds,
    },
  };
}

// ---------- B8 RV-04: refunds ----------

/**
 * record_refund(payment, amount, reason): records money given back (Centium
 * does not move it). Needs revenue; refuses a never-paid payment and an
 * amount over what is left (22023, naming the figures). Reaching the full
 * amount moves the payment to 'refunded' on the server.
 */
export async function recordRefund(
  paymentId: string,
  amount: number,
  reason: string | null,
): Promise<Result<string>> {
  const { data, error } = await rpc<string>("record_refund", {
    p_payment_id: paymentId,
    p_amount: amount,
    p_reason: reason?.trim() ? reason.trim() : null,
  });
  if (error) {
    if (isMissingFunction(error))
      return { ok: false, pending: true, code: error.code, message: tk("Refunds aren't available yet.") };
    console.error("[revenue] Could not record a refund:", error.message);
    return {
      ok: false,
      code: error.code,
      message: isOffline(error) ? OFFLINE_MESSAGE : describeRefundRefusal(error),
    };
  }
  return { ok: true, value: String(data) };
}

/** Where each ledger row came from (business_payments.source_kind / source_id), for its plan name or class title. */
export async function fetchPaymentSources(
  ids: string[],
): Promise<Result<Map<string, { sourceKind: string; sourceId: string }>>> {
  const out = new Map<string, { sourceKind: string; sourceId: string }>();
  for (let i = 0; i < ids.length; i += 150) {
    const r = await db
      .from("business_payments")
      .select("id, source_kind, source_id")
      .in("id", ids.slice(i, i + 150));
    if (r.error) return fail(r.error, TX_FAIL);
    for (const x of r.data ?? [])
      out.set(x.id as string, { sourceKind: x.source_kind as string, sourceId: x.source_id as string });
  }
  return { ok: true, value: out };
}

/** One of a person's paid ledger payments (business_payments, status paid). */
export interface PaidEntry {
  id: string;
  amount: number;
  method: PayMethod;
  dueOn: string | null;
  /** The business's own day of paid_at. */
  paidOn: string;
}

/**
 * AN14-044 B1 / AN14-068 row 4: a person's latest paid payments at this
 * business (business_payments payer_id, status 'paid', newest paid_at first;
 * the revenue SELECT policy). Days in the business's timezone.
 */
export async function fetchPaidHistory(
  businessId: string,
  personId: string,
  limit = 3,
): Promise<Result<PaidEntry[]>> {
  const loose = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => {
            eq: (c: string, v: string) => {
              order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Res<Record<string, unknown>[]> };
            };
          };
        };
      };
    };
  };
  const p = await loose
    .from("business_payments")
    .select("id, amount, method, due_on, paid_at")
    .eq("business_id", businessId)
    .eq("payer_id", personId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(limit);
  if (p.error) {
    console.error("[revenue] Could not read the paid history:", p.error.message);
    return fail(p.error, tk("Couldn't load the recent payments."));
  }
  const b = await db.from("business_profiles").select("timezone").eq("id", businessId);
  const tz = (!b.error && (b.data?.[0]?.timezone as string | null)) || "UTC";
  return {
    ok: true,
    value: (p.data ?? [])
      .filter((x) => !!x.paid_at)
      .map((x) => ({
        id: x.id as string,
        amount: Number(x.amount),
        method: x.method as PayMethod,
        dueOn: (x.due_on as string | null) ?? null,
        paidOn: dayIn(x.paid_at as string, tz),
      })),
  };
}

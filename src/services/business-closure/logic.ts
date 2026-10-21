// CP (Database 20261130000000): a business is closed, never deleted.
//
// Closed (business_profiles.closed_at, close_business(), permanent) stops
// everything. Paused (deactivated_at, set_business_paused(), the owner's
// reversible switch) stops NEW business only: business_accepts(id, kind) is
// the one answer, 'new' or 'existing'. A trigger on nine tables raises ATXAB
// with "This business is closed/paused and is not taking new activity.
// Existing records are unaffected.":
//   'new' (refused paused or closed): appointments, business_members,
//     business_member_codes, business_join_requests, desk_sales,
//     store_orders, gym_memberships;
//   'existing' (refused only closed): gym_check_ins (a member walking in),
//     business_employees (staff invites: a paused business may still hire).
// The words below are that message, worded for each screen; the check-in and
// staff-invite words exist for the closed state only. Reviews are not gated.
//
// Pure, so node:test loads it.

export const BUSINESS_CLOSED_CODE = "ATXAB";

export type ClosureState = "closed" | "paused";

/** Which state the trigger named. Anything that doesn't say paused reads as closed (the trigger's own fallback). */
export function closureStateOf(serverMessage: string | null | undefined): ClosureState {
  return /\bis paused\b/i.test(serverMessage ?? "") ? "paused" : "closed";
}

export function isBusinessClosedError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === BUSINESS_CLOSED_CODE;
}

/** One screen's words for the two states. */
export interface ClosureWords {
  closed: string;
  paused: string;
}

/** The screen's sentence for an ATXAB refusal. */
export function closureMessage(words: ClosureWords, serverMessage: string | null | undefined): string {
  return words[closureStateOf(serverMessage)];
}

/** The console's words: the business's own people, owner or staff. */
const consoleWords = (doing: string): ClosureWords => ({
  closed: `This business is closed, so it can't ${doing}. Existing records are unaffected.`,
  paused: `This business is deactivated, so it can't ${doing} until it's reactivated.`,
});

// The client's side: booking or buying from the business.
export const CLOSED_BOOK_APPOINTMENT: ClosureWords = {
  closed: "This business has closed and isn't taking new bookings.",
  paused: "This business isn't taking bookings right now.",
};
export const CLOSED_BUY_MEMBERSHIP: ClosureWords = {
  closed: "This business has closed and isn't selling memberships.",
  paused: "This business isn't selling memberships right now.",
};
export const CLOSED_PLACE_ORDER: ClosureWords = {
  closed: "This store has closed and isn't taking new orders.",
  paused: "This store isn't taking orders right now.",
};
export const CLOSED_REDEEM_CODE: ClosureWords = {
  closed: "This business has closed, so this code can't be used.",
  paused: "This business isn't taking new members right now, so this code can't be used yet.",
};

// The console's side: 'new' activity, refused paused or closed.
export const CLOSED_ADD_APPOINTMENT = consoleWords("take new appointments");
export const CLOSED_SELL_DAY_PASS = consoleWords("sell day passes");
export const CLOSED_RENEW_MEMBERSHIP = consoleWords("renew memberships");
export const CLOSED_INVITE_MEMBER = consoleWords("invite members");
export const CLOSED_MEMBER_CODE = consoleWords("create member codes");

// 'existing' activity, refused only when closed: a paused business still
// checks its members in and still hires. The trigger never names "paused"
// here, so both states read the closed words.
const closedOnly = (doing: string): ClosureWords => {
  const w = consoleWords(doing);
  return { closed: w.closed, paused: w.closed };
};
export const CLOSED_CHECK_IN = closedOnly("check people in");
export const CLOSED_INVITE_STAFF = closedOnly("invite staff");
export const CLOSED_APPROVE_JOIN = closedOnly("take on new staff");

// ---------------------------------------------------------------------------
// The public pages: whether a business takes NEW activity (bookings, sales,
// memberships), as the viewer can tell. business_accepts(id, 'new')
// (authenticated only) is the one answer; closed_at and deactivated_at say
// which, but a client can read the row only while it is listed
// (business_profiles_select_public: active OR insider), and both states
// unlist it. So a client usually learns "not open" without "which".

export type BusinessStatus =
  /** business_accepts(id, 'new') said yes. */
  | "open"
  | "closed"
  | "paused"
  /** Not open, and the row isn't readable to say why (or the business doesn't exist). */
  | "unavailable"
  /** Couldn't ask (signed out, offline): the page behaves as before and the server still refuses. */
  | "unknown";

export function businessStatusOf(isOpen: boolean | null, row: { closed_at: string | null; deactivated_at: string | null } | null): BusinessStatus {
  if (isOpen === true) return "open";
  if (row?.closed_at) return "closed";
  if (row?.deactivated_at) return "paused";
  return isOpen === false ? "unavailable" : "unknown";
}

/** Whether a page offers new bookings and sales. Unknown keeps them (the server is the gate). */
export function takesNewActivity(status: BusinessStatus): boolean {
  return status === "open" || status === "unknown";
}

/** The calm line a public page shows instead of buy and book. Null while it takes activity. */
export function closedLine(status: BusinessStatus, what: "bookings" | "orders"): string | null {
  if (takesNewActivity(status)) return null;
  if (status === "closed") return "This business has closed. Anything you've already booked or bought stays in your account.";
  return what === "orders" ? "This store isn't taking orders right now." : "This business isn't taking bookings right now.";
}

/** close_business()'s optional reason, trimmed (the server also stores a blank as null). */
export const CLOSURE_REASON_MAX = 500;
export function closureReason(text: string): string | null {
  const t = text.trim().slice(0, CLOSURE_REASON_MAX);
  return t ? t : null;
}

/** The close confirm's deliberate step: the business's name typed back, ignoring case and outer spaces. */
export function closeNameMatches(typed: string, businessName: string): boolean {
  const want = businessName.trim().toLowerCase();
  return want.length > 0 && typed.trim().toLowerCase() === want;
}

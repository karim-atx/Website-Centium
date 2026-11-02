import { t, tk } from "../../../i18n/core";
// Release 3 · W6 MO22 v5: which tab a professional's conversation sits in, its
// section and its quiet status line. Pure, so it is tested without a browser.
//
// - Groups: kind "group" (plus the professional's broadcast lists, as rows).
// - Businesses (decision 1): kind "business" (staff business threads merged in
//   by withBusinessThreads, and an owner's member threads) and gym or studio
//   chats (venue). Shown only when there is at least one.
// - Clients: a direct chat with a connected client (professional_clients,
//   not disconnected). Centium Support, a colleague and a deleted account also
//   land here: they are not enquiries, and calls follow thread_allows_calls.
// - Enquiries: every other direct chat, i.e. people who are not clients yet.

/** The MessageThread fields this model reads (services/messaging), kept structural so the node tests stay DOM-free. */
export interface ThreadLike {
  id: string;
  kind: "peer" | "official_support" | "group" | "business";
  venue: { memberSide: boolean } | null;
  participantId: string | null;
  participantName: string;
  otherRole: string | null;
  lastMessageId: string | null;
  lastMessageSenderId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
}
type MessageThread = ThreadLike;

export type ProTab = "clients" | "groups" | "enquiries" | "businesses";
export const PRO_TABS: ProTab[] = ["clients", "groups", "enquiries", "businesses"];
export const TAB_LABEL: Record<ProTab, string> = { clients: tk("Clients"), groups: tk("Groups"), enquiries: tk("Enquiries"), businesses: tk("Businesses") };

/** professional_subtype values other_role can carry: a colleague, not an enquiry. */
const PRO_ROLES = new Set(["trainer", "dietitian", "physiotherapist", "doctor", "nutritionist", "coach_instructor", "other"]);

export function tabOf(t: Pick<MessageThread, "kind" | "venue" | "participantId" | "otherRole">, clientIds: ReadonlySet<string>): ProTab {
  if (t.kind === "group") return "groups";
  if (t.kind === "business" || t.venue) return "businesses";
  if (t.kind === "official_support") return "clients";
  if (!t.participantId) return "clients";
  if (clientIds.has(t.participantId)) return "clients";
  if (t.otherRole && (PRO_ROLES.has(t.otherRole) || t.otherRole === "official" || t.otherRole === "gym")) return "clients";
  return "enquiries";
}

/** An enquiry is waiting for you while their newest message is unread. */
export function enquiryWaiting(t: Pick<MessageThread, "lastMessageId" | "lastMessageSenderId" | "unreadCount">, me: string | null): boolean {
  return !!t.lastMessageId && t.lastMessageSenderId !== me && t.unreadCount > 0;
}

export type Dot = "good" | "hi" | "chT" | "gold" | "prDark" | "chF" | "sky";
export interface Status {
  label: string;
  dot: Dot;
}

/** gen/r18.js stCol18: the dot colour by status word. */
export function dotFor(label: string): Dot {
  return label === "Needs attention" ? "hi" : label === "Paused" ? "chT" : label === "New" ? "gold" : label === "Plans sent" ? "prDark" : label === "Active" ? "good" : "chF";
}

/**
 * An enquiry's quiet line: "New" while waiting, "Plans sent" when my newest
 * message is a plans card, "Replied" when my newest message is anything else;
 * nothing when their message was read and not answered yet (no claim).
 */
export function enquiryStatus(
  th: Pick<MessageThread, "lastMessageId" | "lastMessageSenderId" | "unreadCount">,
  me: string | null,
  cardKinds: Readonly<Record<string, string>>
): Status | null {
  if (enquiryWaiting(th, me)) return { label: t("New"), dot: "gold" };
  if (th.lastMessageId && th.lastMessageSenderId === me) {
    return cardKinds[th.lastMessageId] === "plans_offer" ? { label: t("Plans sent"), dot: "prDark" } : { label: t("Replied"), dot: "chF" };
  }
  return null;
}

export interface Summary {
  unread: number;
  newEnquiries: number;
  latest: { name: string; preview: string; at: string; unread: boolean } | null;
  hasAny: boolean;
}

/**
 * The More hero's numbers (MO1 v7): unread across every conversation, enquiries
 * waiting, and the newest message someone else sent in a client chat or an
 * enquiry.
 */
export function summarise(threads: MessageThread[], clientIds: ReadonlySet<string>, me: string | null): Summary {
  let unread = 0;
  let newEnquiries = 0;
  let latest: MessageThread | null = null;
  for (const t of threads) {
    unread += t.unreadCount;
    const tab = tabOf(t, clientIds);
    if (tab === "enquiries" && enquiryWaiting(t, me)) newEnquiries += 1;
    const incoming = !!t.lastMessageId && !!t.lastMessageAt && t.lastMessageSenderId !== me && t.kind === "peer";
    if ((tab === "clients" || tab === "enquiries") && incoming && (!latest || (t.lastMessageAt ?? "") > (latest.lastMessageAt ?? ""))) latest = t;
  }
  return {
    unread,
    newEnquiries,
    latest: latest
      ? { name: latest.participantName, preview: latest.lastMessagePreview ?? "", at: latest.lastMessageAt!, unread: latest.unreadCount > 0 }
      : null,
    hasAny: threads.length > 0,
  };
}

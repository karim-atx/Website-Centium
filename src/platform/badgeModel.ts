// The app icon's badge, as the server computes it for every push
// (public.push_badge_count, Database 20261226430000): the unread inbox
// (notifications with read_at null, at most 99) plus my_unread_message_count()
// (my_conversations()'s unread_count summed, at most 99: messages, not
// threads, muted threads included), at most 99 in all. The website counts the
// same two things, so a push and an open app never disagree.

const CAP = 99;
const whole = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

export function badgeCount(unreadInbox: number, unreadMessages: number): number {
  return Math.min(CAP, Math.min(CAP, whole(unreadInbox)) + Math.min(CAP, whole(unreadMessages)));
}

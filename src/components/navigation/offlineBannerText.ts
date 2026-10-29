/**
 * The offline banner's line (Round D O2). It names what the device queues,
 * because those logs do save later and nothing else does. Add to
 * QUEUED_WHILE_OFFLINE as the queue grows; the sentence follows.
 */
export const QUEUED_WHILE_OFFLINE: readonly string[] = [
  "water, weight and blood pressure logs",
  "food entries",
  "habit ticks",
  "finished workouts",
  "messages",
];

/** "a", "a and b", "a, b and c". */
function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The banner's body, under its "You're offline" title. */
export function offlineBannerDetail(queued: readonly string[] = QUEUED_WHILE_OFFLINE): string {
  if (queued.length === 0) return "Changes need a connection.";
  const list = joinList(queued);
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} save when you reconnect. Other changes need a connection.`;
}

/** The whole sentence, title included. */
export function offlineBannerText(queued: readonly string[] = QUEUED_WHILE_OFFLINE): string {
  return `You're offline. ${offlineBannerDetail(queued)}`;
}

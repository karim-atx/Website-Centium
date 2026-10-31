import { t, tk } from "../../i18n/core";

/**
 * The offline banner's line (Round D O2). It names what the device queues,
 * because those logs do save later and nothing else does. Add to
 * QUEUED_WHILE_OFFLINE as the queue grows; the sentence follows.
 */
export const QUEUED_WHILE_OFFLINE: readonly string[] = [
  tk("water, weight and blood pressure logs"),
  tk("food entries"),
  tk("habit ticks"),
  tk("finished workouts"),
  tk("messages"),
];

/** "a", "a and b", "a, b and c" (each item and the joiners in the app's language). */
function joinList(items: readonly string[]): string {
  const words = items.map((s) => t(s));
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(t(", "))}${t(" and ")}${words[words.length - 1]}`;
}

/** The banner's body, under its "You're offline" title. */
export function offlineBannerDetail(queued: readonly string[] = QUEUED_WHILE_OFFLINE): string {
  if (queued.length === 0) return t("Changes need a connection.");
  const list = joinList(queued);
  return t("{list} save when you reconnect. Other changes need a connection.", { list: `${list.charAt(0).toUpperCase()}${list.slice(1)}` });
}

/** The whole sentence, title included. */
export function offlineBannerText(queued: readonly string[] = QUEUED_WHILE_OFFLINE): string {
  return t("You're offline. {detail}", { detail: offlineBannerDetail(queued) });
}

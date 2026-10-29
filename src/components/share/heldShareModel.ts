// Round D · DV: a share card the word lists held, as its owner sees it
// (HANDOVER_API "DV · A held share card, for its owner", Database
// 20261222030000; PLAN.md D-S21). Pure: the hub notice, the options sheet,
// the held-card sheet and the client page's wins all read these words.
//
// my_shared_items() gives each card a state (live, held_for_review,
// removal_requested, removed), a short held_reason in the image rejections'
// vocabulary (contact_details, not_relevant, not_allowed_content, other) and
// link_live, whether /s/{id} answers. The matched word is never sent, so it
// is never shown. While the link is paused the app hands out no link.

export type SharedItemState = "live" | "held_for_review" | "removal_requested" | "removed";
export const SHARED_ITEM_STATES: SharedItemState[] = ["live", "held_for_review", "removal_requested", "removed"];

/** Anything unknown reads as live: the database decides what the link does (link_live). */
export const readItemState = (v: unknown): SharedItemState => (SHARED_ITEM_STATES as unknown[]).includes(v) ? (v as SharedItemState) : "live";

export const HELD_REASONS = ["contact_details", "not_relevant", "not_allowed_content", "other"] as const;
export type HeldReason = (typeof HELD_REASONS)[number];

/** Anything unknown (or a held card with no reason yet) reads as "other". */
export const readHeldReason = (v: unknown): HeldReason => ((HELD_REASONS as readonly unknown[]).includes(v) ? (v as HeldReason) : "other");

/**
 * The reason in a few words (D-S21's table, on the database's categories):
 * contact details and links are contact_details; spam and selling are
 * not_relevant; everything else the lists hold is not_allowed_content.
 */
const REASON_WORDS: Record<HeldReason, string> = {
  contact_details: "It shows contact details",
  not_relevant: "It looks like advertising",
  not_allowed_content: "It may break our community guidelines",
  other: "It's being checked",
};

export const heldReasonWords = (reason: unknown): string => REASON_WORDS[readHeldReason(reason)];

export const HELD_TITLE = "Held for review.";
export const HELD_CHIP = "Held for review";

/** D-S21's note after "Held for review." (the Community guidelines link follows it). */
export const heldNoteLine = (reason: unknown): string => `${heldReasonWords(reason)}. Only you can see this card until our team checks it, usually within a day.`;

/** The paused link button and the line under it. */
export const PAUSED_LINK_LABEL = "Copy link (works once approved)";
export const PAUSED_LINE = "The link and QR are paused while our team reviews the card.";
export const REMOVED_LINE = "This card was removed. Its link no longer works.";

export interface ItemAllows {
  /** The public link (and its QR) can be handed out. */
  link: boolean;
  /** Another export of the same card may start (no while held or removed). */
  share: boolean;
  /** The state's chip, or null when live. */
  chip: { label: string; tone: "gold" | "soft" } | null;
  /** The line under a paused or removed link, or null. */
  line: string | null;
}

/**
 * What a card in this state allows. linkLive is the database's own answer
 * (shared_item_public's rule) and always wins for the link: a card is never
 * linked while it says false, whatever the state.
 */
export function itemAllows(state: SharedItemState, linkLive: boolean): ItemAllows {
  switch (state) {
    case "held_for_review":
      return { link: false, share: false, chip: { label: HELD_CHIP, tone: "gold" }, line: PAUSED_LINE };
    case "removed":
      return { link: false, share: false, chip: { label: "Removed", tone: "soft" }, line: REMOVED_LINE };
    case "removal_requested":
      return { link: linkLive, share: false, chip: { label: "Removal asked", tone: "gold" }, line: linkLive ? null : PAUSED_LINE };
    case "live":
      return { link: linkLive, share: true, chip: null, line: linkLive ? null : PAUSED_LINE };
  }
}

/** The hub notice pro.share.held (kind update, payload shared_item_id and reason). */
export function heldNoticeText(reason: unknown): { title: string; line: string } {
  return { title: "Your shared card is held for review", line: `${heldReasonWords(reason)}. Its link is paused until our team checks it.` };
}

/** Which of several exports of one card the owner sees: a hold first, then the newest. */
export function strongestState<T extends { state: SharedItemState; createdAt: string }>(items: T[]): T | null {
  const rank: Record<SharedItemState, number> = { held_for_review: 3, removal_requested: 2, live: 1, removed: 0 };
  return items.reduce<T | null>((best, it) => {
    if (!best) return it;
    if (rank[it.state] !== rank[best.state]) return rank[it.state] > rank[best.state] ? it : best;
    return it.createdAt > best.createdAt ? it : best;
  }, null);
}

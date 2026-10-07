// A3, the chat side of hiring (A3-chat): the pure part of ./chat.ts, tested
// without a database (chatLogic.test.ts).
//
// Contract: "post_plans_card" under "Stage A3" in ../Database/docs/HANDOVER_API.md,
// migration 20261101010000_hire_chat_cards.sql.

/** post_plans_card() puts at most five plans in one card (more is refused, 22023). */
export const PLANS_PER_CARD = 5;

/**
 * The plans a card offers when the professional has more than five active:
 * the first five by position, then creation (the order post_plans_card itself
 * writes them in), inactive ones left out.
 */
export function firstOfferablePlanIds(
  plans: { id: string; active: boolean; position: number; createdAt: string }[]
): string[] {
  return plans
    .filter((p) => p.active)
    .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
    .slice(0, PLANS_PER_CARD)
    .map((p) => p.id);
}

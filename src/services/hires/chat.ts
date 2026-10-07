import { fetchMyPlans, postPlansCard, type PlansCardResult } from "./index";
import { firstOfferablePlanIds } from "./chatLogic";

// A3, the chat side of hiring (A3-chat): the one thing the conversation's
// "Offer plans" button needs on top of ./index.ts's postPlansCard.
//
// post_plans_card(thread, null) means ALL of the caller's active plans, and
// the function REFUSES (22023) rather than trims when there are more than
// five. The chat only offers the button in a direct, non-venue thread, so a
// 22023 there is the five-plan cap, never the venue refusal (which shares the
// code): this asks again with the first five, in the professional's own order
// (position, then creation, the order the card itself uses).

export async function offerPlansInChat(threadId: string, userId: string): Promise<PlansCardResult> {
  const first = await postPlansCard(threadId, null);
  if (first.ok || first.code !== "22023") return first;
  const mine = await fetchMyPlans(userId);
  if (!mine.ok) return first;
  const ids = firstOfferablePlanIds(mine.plans);
  return ids.length > 0 ? postPlansCard(threadId, ids) : first;
}

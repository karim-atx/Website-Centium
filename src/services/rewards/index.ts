// A reward the user has actually earned, for the MO8.1 Explore reward row.
//
// THERE IS NO SOURCE YET, so this always answers null and the row stays
// hidden. The handover frame's "Your 21-day streak unlocked a reward / 10% off
// your next membership at partner gyms" is example data and must never be
// shown: it names a discount, a partner and an entitlement that do not exist.
//
// FUTURE DATA SOURCE: partner offers, i.e. business_discounts rows
// (services/business-discounts) joined to an eligibility rule the user has met
// (for example a streak length, from services/streaks), resolved server-side
// so the client never decides who qualifies. When that exists, return the
// earned offer here: `title` names what unlocked it ("Your 21-day streak
// unlocked a reward") and `detail` the real offer label from the row.

export interface EarnedReward {
  /** What earned it, e.g. "Your 21-day streak unlocked a reward". */
  title: string;
  /** The real offer, from the partner's row. */
  detail: string;
}

/** The reward to show this user on Explore, or null when there is none. */
export function rewardForUser(): EarnedReward | null {
  return null;
}

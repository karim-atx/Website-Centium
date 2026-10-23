import type { BusinessRole } from "./types";

// Pure (no client import), so pages and tests can use it without Supabase.
/**
 * Whether a role uses a seat: instructor and trainer do; front_desk, manager,
 * staff and shop_assistant don't (B6 follow-up 20261120060000, Q-09). A mirror
 * of role_uses_seat(role) for drawing the grid without a round trip per
 * person; the database stays the authority (the cap trigger and
 * my_business_seat_capacity both call role_uses_seat). Use it only where the
 * server hasn't answered: menus before a person exists, and invitations
 * (employee_credentials returns uses_seat for accepted employees).
 */
export const roleUsesSeat = (role: BusinessRole): boolean => role === "instructor" || role === "trainer";

/**
 * The seat rule (Database #38, 20261213190000; HANDOVER_API "A Centium hire is
 * seat-free"): business_seats_used() counts accepted, seat-using roles whose
 * source isn't 'hire'. A professional HIRED through Centium uses no seat (the
 * hiring fee replaces it); one added in the free existing-team window uses a
 * seat ("free" is the fee), and so does an instructor or trainer with no
 * professional account. my_business_seat_capacity, business_attention, the
 * invite checks and the cap all delegate to that one function.
 *
 * Per person: employee_credentials.uses_seat answers role_uses_seat(role)
 * alone, so it can't tell a hire apart; my_team's documented `source` can.
 * A hire is never a seat; otherwise the server's flag, else the role rule.
 */
export function seatAnswer(serverFlag: boolean | null | undefined, source: string | null | undefined): boolean | null {
  if (source === "hire") return false;
  return typeof serverFlag === "boolean" ? serverFlag : null;
}

/** A person's seat answer: the server's (seatAnswer) when known, else the role rule. */
export const personUsesSeat = (p: { role: BusinessRole; usesSeat?: boolean | null }): boolean =>
  typeof p.usesSeat === "boolean" ? p.usesSeat : roleUsesSeat(p.role);

const SUBTYPE: Record<string, string> = {
  trainer: "Personal trainer",
  dietitian: "Dietitian",
  physiotherapist: "Physiotherapist",
  doctor: "Doctor",
};
const GROUP: Record<string, string> = { fitness: "Fitness", clinical: "Clinical", nutrition: "Nutrition" };

/**
 * The person's profession for the team list and person page (shown next to the
 * role, which is an access level). "Other" is never printed: the discipline
 * they typed, else their closest group; null when nothing is known.
 */
export function professionLabel(p: { subtype?: string | null; otherDiscipline?: string | null; closestGroup?: string | null }): string | null {
  if (p.subtype && SUBTYPE[p.subtype]) return SUBTYPE[p.subtype];
  if (p.subtype === "other" && p.otherDiscipline?.trim()) return p.otherDiscipline.trim();
  if (p.closestGroup && GROUP[p.closestGroup]) return GROUP[p.closestGroup];
  return null;
}

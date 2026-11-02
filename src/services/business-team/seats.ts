import type { BusinessRole } from "./types";
import { t, tk } from "../../i18n/core";

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
 * Per person: employee_credentials.uses_seat asks that same test (Database
 * PR #39 correction 1: source <> 'hire' and role_uses_seat(role), pinned to
 * business_seats_used() by assert_seat_rule_is_one_rule), so the client takes
 * the server's flag as it stands (team.ts); the my_team source workaround is
 * gone.
 */

/** A person's seat answer: the server's (employee_credentials.uses_seat) when known, else the role rule. */
export const personUsesSeat = (p: { role: BusinessRole; usesSeat?: boolean | null }): boolean =>
  typeof p.usesSeat === "boolean" ? p.usesSeat : roleUsesSeat(p.role);

const SUBTYPE: Record<string, string> = {
  trainer: tk("Personal trainer"),
  dietitian: tk("Dietitian"),
  physiotherapist: tk("Physiotherapist"),
  doctor: tk("Doctor"),
};
const GROUP: Record<string, string> = { fitness: tk("Fitness"), clinical: tk("Clinical"), nutrition: tk("Nutrition") };

/**
 * The person's profession for the team list and person page (shown next to the
 * role, which is an access level). "Other" is never printed: the discipline
 * they typed, else their closest group; null when nothing is known.
 */
export function professionLabel(p: { subtype?: string | null; otherDiscipline?: string | null; closestGroup?: string | null }): string | null {
  if (p.subtype && SUBTYPE[p.subtype]) return t(SUBTYPE[p.subtype]);
  if (p.subtype === "other" && p.otherDiscipline?.trim()) return p.otherDiscipline.trim();
  if (p.closestGroup && GROUP[p.closestGroup]) return t(GROUP[p.closestGroup]);
  return null;
}

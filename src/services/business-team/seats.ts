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
 * A person's seat answer: the server's uses_seat when the reader returned it, else the role rule.
 * awaiting Database (#38 follow-up): business_seats_used() and the cap trigger now leave out
 * anybody with a professional account (every Team professional is seat-free), but
 * employee_credentials.uses_seat and my_business_seat_capacity.seats_invited still answer
 * role_uses_seat(role) alone, so a Team professional instructor still reads "uses a seat" here.
 * The client keeps reading the server's flag (it can't tell a professional account apart).
 */
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

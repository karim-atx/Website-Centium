import type { BusinessRole } from "./team";

// Pure (no client import), so pages and tests can use it without Supabase.
/**
 * Whether a role uses a seat: instructor and trainer do; front_desk, manager,
 * staff and shop_assistant don't (B6 follow-up 20261120060000, Q-09). A mirror
 * of role_uses_seat(role) for drawing the grid without a round trip per
 * person; the database stays the authority (the cap trigger and
 * my_business_seat_capacity both call role_uses_seat).
 */
export const roleUsesSeat = (role: BusinessRole): boolean => role === "instructor" || role === "trainer";

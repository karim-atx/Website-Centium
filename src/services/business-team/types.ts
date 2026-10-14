// The team's row shapes, kept free of Supabase so pure modules and their
// node tests (business-team/teamLogic, seats) can import them without
// pulling the client in. team.ts re-exports them.

export type BusinessRole = "instructor" | "trainer" | "front_desk" | "manager" | "staff" | "shop_assistant";

export interface TeamPerson {
  /** business_employees.id (set_employee_terms takes it). */
  employmentId: string;
  professionalId: string;
  name: string;
  avatarUrl: string | null;
  role: BusinessRole;
  permissions: string[];
  /** business_employees.created_at: when they were invited or approved. */
  invitedAt: string;
  /** null = invited, not accepted (B0): no seat, no access. */
  acceptedAt: string | null;
  /** null = not agreed (not zero). */
  payRate: number | null;
  inviteMessage: string | null;
  /**
   * What the person is (B6 follow-up: employee_credentials gains
   * professional_subtype, other_discipline, closest_group, uses_seat).
   * Accepted employees only; null for an invitation or a non-professional.
   */
  subtype: string | null;
  otherDiscipline: string | null;
  closestGroup: string | null;
  /** The server's seat answer (role_uses_seat); null when the reader didn't return the person. */
  usesSeat: boolean | null;
}

export interface ClassSession {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM:SS
  end: string;
  capacity: number;
  professionalId: string | null;
}

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
  /** The seat answer (seats.ts seatAnswer: employee_credentials.uses_seat, false for a Centium hire); null when unknown. */
  usesSeat: boolean | null;
  /**
   * Batch 2 CO: the invitation's window (expires_at, revoked_at, sent_at,
   * resent_count), read with the team. Null or absent = not known (the read
   * fell back to the columns without them, or they accepted): no expiry and
   * no withdrawn state is shown rather than guessed.
   */
  invite?: InviteWindow | null;
}

/** A team invitation's window (business_employees, migration 20261201000000). */
export interface InviteWindow {
  expiresAt: string | null;
  revokedAt: string | null;
  sentAt: string | null;
  resentCount: number;
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

/**
 * What a professional shows the public (OP1-132 C1, C2, C5; OP1-124 9c),
 * read by team.ts fetchPublicDetails. Here so pure modules can take the type.
 */
export interface PublicDetails {
  /** profiles.professional_subtype, through the directory view. */
  subtype: string | null;
  specialty: string | null;
  bio: string | null;
  experience: { title: string; organisation: string | null; startMonth: string | null; endMonth: string | null }[];
}

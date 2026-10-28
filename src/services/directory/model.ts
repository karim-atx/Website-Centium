// The client-facing directory listing (public_professional_directory), as a
// type only: no Supabase import, so pure models (services/nearby/model) and
// their node:test files can use it. services/directory re-exports it.

import type { Enums } from "../../../lib/supabase/database.types";

export interface DirectoryListing {
  /** profiles.id — the real account, and what ProfessionalDetail routes on. */
  profileId: string;
  name: string;
  avatarUrl: string | null;
  subtype: Enums<"professional_subtype"> | null;
  specialty: string | null;
  location: string | null;
  bio: string | null;
  monthlyRate: number | null;
  consultationRate: number | null;
  paymentModalities: Enums<"payment_modality">[];
  /** From professional_rating_summary, via the view. Null until reviewed. */
  averageRating: number | null;
  reviewCount: number;
  /** The CV's one-line headline. */
  headline: string | null;
  skills: string[];
  /**
   * At least one licence verified by the review team and still shown (not
   * expired, or shown after expiry by choice). The view computes it with the
   * database's own verified rule; nothing here re-derives it.
   */
  hasVerifiedLicence: boolean;
}

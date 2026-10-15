// Pure types (no runtime imports), so node tests and pure models can use them without pulling the Supabase client into the test project.

export interface BusinessClassRow {
  id: string;
  title: string;
  classType: string;
  /** `YYYY-MM-DD`, from the `event_date` column. */
  date: string;
  /** `HH:MM`, trimmed from the `time` column's `HH:MM:SS`. */
  startTime: string;
  endTime: string;
  maxCapacity: number;
  professionalId: string | null;
  notes: string | null;
  /** Formatted for display, empty when the column is null. */
  price: string;
  paymentType: string | null;
  /** business_classes.cancellation_hours (null = the venue default, else 12). */
  cancellationHours?: number | null;
  /** B9 EX-01 details (writable): about (≤1000), level, what to bring (≤10 × 60), cover URL (class-covers). */
  about?: string | null;
  level?: "all_levels" | "beginner" | "intermediate" | "advanced" | null;
  whatToBring?: string[];
  coverUrl?: string | null;
  /** B9 read-only: the repeating series this class belongs to, edited on its own, cancelled. */
  seriesId?: string | null;
  seriesException?: boolean;
  cancelledAt?: string | null;
  cancelReason?: string | null;
}

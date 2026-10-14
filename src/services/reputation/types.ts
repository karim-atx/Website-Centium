// Pure types (no runtime imports), so node tests and pure models can use them without pulling the Supabase client into the test project.

export interface BizReview {
  id: string;
  gymId: string;
  gymName: string;
  /** Null when redacted. */
  rating: number | null;
  body: string | null;
  /** A first name; null for a minor, a hidden name, or a redacted review. */
  authorName: string | null;
  authorIsMember: boolean;
  createdAt: string;
  redacted: boolean;
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
}

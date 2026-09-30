// A licence's review status, as its owner sees it.
//
// THE SAME RULE AS licence_is_verified() IN THE DATABASE, applied to the rows
// RLS lets the professional read. Verified means an APPROVED review whose
// document_path snapshot equals the licence's live document_path, so replacing
// the file un-verifies the licence by itself, and a stale approval can never
// vouch for a document nobody reviewed. Everything else is decided by the most
// recent review of the CURRENT document: rejected with a reason, or pending.

export type LicenceStatus =
  | { kind: "none" }
  | { kind: "pending" }
  | { kind: "verified" }
  | { kind: "rejected"; reason: string };

export interface LicenceReviewRow {
  id: string;
  licenceId: string;
  documentPath: string;
  submittedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

export function licenceStatus(
  licence: { id: string; documentPath: string | null },
  reviews: LicenceReviewRow[]
): LicenceStatus {
  if (!licence.documentPath) return { kind: "none" };
  const current = reviews.filter(
    (r) => r.licenceId === licence.id && r.documentPath === licence.documentPath
  );
  if (current.some((r) => r.approvedAt)) return { kind: "verified" };
  // Newest first, id as the tiebreak: two uploads in one transaction share a
  // submitted_at, the same case the admin functions order by id for.
  const latest = [...current].sort(
    (a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id)
  )[0];
  if (latest?.rejectedAt) {
    return { kind: "rejected", reason: latest.rejectionReason?.trim() || "Not approved." };
  }
  // A document with no review row yet is still waiting for one: the row is
  // opened by a trigger on the same write, so this is only ever momentary.
  return { kind: "pending" };
}

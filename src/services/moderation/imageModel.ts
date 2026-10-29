// my_image_approvals() rows (Round C Release 2). Pure.

export type ApprovalStatus = "pending" | "approved" | "rejected" | "withdrawn";

export interface ImageApproval {
  id: string;
  surface: string;
  recordId: string;
  stagingPath: string;
  status: ApprovalStatus;
  uploadedAt: string;
  decidedAt: string | null;
  reasonCategory: string | null;
  publishedAt: string | null;
}

const STATUSES: readonly ApprovalStatus[] = ["pending", "approved", "rejected", "withdrawn"];

export function parseApprovals(data: unknown): ImageApproval[] {
  if (!Array.isArray(data)) return [];
  const out: ImageApproval[] = [];
  for (const raw of data) {
    const r = raw as Record<string, unknown>;
    if (typeof r.approval_id !== "string" || typeof r.staging_path !== "string" || typeof r.uploaded_at !== "string") continue;
    const status = STATUSES.find((s) => s === r.status);
    if (!status) continue;
    out.push({
      id: r.approval_id,
      surface: String(r.surface ?? ""),
      recordId: String(r.record_id ?? ""),
      stagingPath: r.staging_path,
      status,
      uploadedAt: r.uploaded_at,
      decidedAt: typeof r.decided_at === "string" ? r.decided_at : null,
      reasonCategory: typeof r.reason_category === "string" ? r.reason_category : null,
      publishedAt: typeof r.published_at === "string" ? r.published_at : null,
    });
  }
  return out;
}

/**
 * What the owner should see about a record's image: the newest submission
 * that isn't withdrawn. An approved one that hasn't been published yet still
 * reads as waiting (the copy takes a few minutes); once published, nothing.
 */
export function latestApproval(list: readonly ImageApproval[]): ImageApproval | null {
  const newest = [...list].filter((a) => a.status !== "withdrawn").sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
  if (!newest) return null;
  if (newest.status === "approved") return newest.publishedAt ? null : { ...newest, status: "pending" };
  return newest;
}

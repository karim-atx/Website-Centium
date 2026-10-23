// Market + Share 3.0 · Release 2 live updates: the P-MA.7 hub's list is the
// console's own rows (professional_notifications) and the member inbox's
// professional kinds (rows with `memberKind`), newest first.

interface HubRow {
  memberKind?: string | null;
  createdAt: string;
}

const newestFirst = (a: HubRow, b: HubRow) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);

/**
 * The hub's rows with the member-inbox half replaced by `memberRows` (a fresh
 * my_notifications read): the console's rows stay as they are, the member
 * rows shown before are dropped, and the result is newest first.
 */
export function withMemberRows<T extends HubRow>(list: readonly T[], memberRows: readonly T[]): T[] {
  return [...list.filter((n) => !n.memberKind), ...memberRows].sort(newestFirst);
}

// Round G2 · EG: the counted directory calls, without Supabase (eg.ts binds
// them to the client), so node:test reads them directly. Only the four
// counted functions are ever called; there is no view to fall back to.

export type DirErr = { code?: string; message: string; details?: string | null; hint?: string | null };
export type DirRead<T> = { data: T | null; error: DirErr | null };
export type DirectoryFn = "directory_professionals" | "directory_professional_cv" | "directory_venues" | "directory_classes";
export type Rpc = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: DirErr | null }>;

/** One counted call; its error (ATX02 included) is returned to the reader as is. */
export async function callDirectory<T>(rpc: Rpc, fn: DirectoryFn, args: Record<string, unknown>): Promise<DirRead<T>> {
  try {
    const r = await rpc(fn, args);
    return { data: (r.data ?? null) as T | null, error: r.error };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
  }
}

/** Above this many ids, one call for the whole directory is cheaper than one each. */
export const BY_ID_LIMIT = 8;

/**
 * directory_professionals rows for these profile ids: one call each for a
 * few, or one call for the whole directory filtered here for many (each call
 * counts).
 */
export async function readProfessionalsByIds<T extends { profile_id?: string | null }>(rpc: Rpc, ids: string[]): Promise<DirRead<T[]>> {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (uniq.length === 0) return { data: [], error: null };
  if (uniq.length > BY_ID_LIMIT) {
    const all = await callDirectory<T[]>(rpc, "directory_professionals", { p_profile_id: null });
    const want = new Set(uniq);
    return all.error ? all : { data: (all.data ?? []).filter((r) => !!r.profile_id && want.has(r.profile_id)), error: null };
  }
  const each = await Promise.all(uniq.map((id) => callDirectory<T[]>(rpc, "directory_professionals", { p_profile_id: id })));
  const failed = each.find((r) => r.error);
  if (failed) return failed;
  return { data: each.flatMap((r) => r.data ?? []), error: null };
}

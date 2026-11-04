// Claims read from a Supabase access token, without verifying it: only to
// tell sessions apart on this device, never to grant anything.

/** The `session_id` claim of an access token, or null. */
export function jwtSessionId(accessToken: string | null | undefined): string | null {
  const part = accessToken?.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const claim = (JSON.parse(json) as { session_id?: unknown }).session_id;
    return typeof claim === "string" && claim ? claim : null;
  } catch {
    return null;
  }
}

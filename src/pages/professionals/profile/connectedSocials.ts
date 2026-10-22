import { supabase } from "../../../../lib/supabase/client";

// Market + Share 3.0 · W5 · D-27: a professional's social handles (Instagram,
// Facebook, X) are shown ONLY to their connected clients.
//
// The ONLY client-readable source of these columns today is the public
// directory view (public_professional_directory exposes instagram, facebook,
// x and website to anyone: DB7 removes them from public readers).
// connected_professional_summary, the connected client's own reader, carries
// none of them, so an unlisted professional's handles can't be read at all.
// This read is therefore made ONLY after the live connection check
// (services/connected-professional `isActiveClientOf`) has answered true, so
// a non-connected viewer's network never carries a contact column from this
// page; every other read on the page selects no contact column. Website is
// never read (D-27: no website on the profile).
// Backend gap (reported): a connected-only reader for the social handles
// (e.g. on connected_professional_summary) before DB7 drops them from the view.

export interface SocialHandles {
  instagram: string | null;
  facebook: string | null;
  x: string | null;
}

/** The handles of a professional the caller is an active client of (the caller checks first). Null on any failure. */
export async function fetchConnectedSocials(professionalId: string): Promise<SocialHandles | null> {
  const { data, error } = await supabase
    .from("public_professional_directory")
    .select("instagram, facebook, x")
    .eq("profile_id", professionalId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as Record<string, string | null>;
  return { instagram: row.instagram ?? null, facebook: row.facebook ?? null, x: row.x ?? null };
}

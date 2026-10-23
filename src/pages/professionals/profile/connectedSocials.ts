import { marketRpc } from "../../../services/market/rpc";
import { str } from "../../../services/market/parse";

// Market + Share 3.0 · W5 · D-27: a professional's social handles (Instagram,
// Facebook, X) are shown ONLY to their connected clients.
//
// Contract (Database 20261211000000, HANDOVER_API Release 1 "Privacy"):
// professional_social_handles(p_professional_id) → (website, instagram,
// facebook, x), to connected clients only: ATX96 when the caller has no
// ACTIVE professional_clients row with that professional, ATX97 when the
// caller is under 18. public_professional_directory no longer carries these
// columns for anyone. The page still asks only after the live connection
// check (services/connected-professional `isActiveClientOf`) has answered
// true; either refusal, or any other failure, shows nothing. Website is
// never shown (D-27: no website on the profile), so it is not kept here.

export interface SocialHandles {
  instagram: string | null;
  facebook: string | null;
  x: string | null;
}

/** The handles of a professional the caller is an active client of. Null on any failure (ATX96, ATX97 included). */
export async function fetchConnectedSocials(professionalId: string): Promise<SocialHandles | null> {
  const r = await marketRpc("professional_social_handles", { p_professional_id: professionalId }, "Couldn't load the social links.", (data) => {
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null | undefined;
    return row && typeof row === "object" ? { instagram: str(row.instagram), facebook: str(row.facebook), x: str(row.x) } : null;
  });
  return r.ok ? r.value : null;
}

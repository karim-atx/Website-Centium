import { supabase } from "../../../lib/supabase/client";
import type { Enums } from "../../../lib/supabase/database.types";
import { professionalRole } from "../connected-professional";

// Who can see your cycle (HE1.10.b.3): the role line under each connected
// professional's name ("Coach", "Physiotherapist", "Nutritionist" on the
// board). The grants themselves are read and written through the same hook
// as Profile › Connected professionals (components/professionals/
// useSharingGrants); this only adds what that screen does not show, each
// professional's subtype and specialty, from the relationship-scoped
// connected_professional_summary view (the one the Connected professional
// sheet already reads). A failed read leaves the role line empty rather than
// blocking the switches.

export interface ProRole {
  subtype: Enums<"professional_subtype"> | null;
  role: string | null;
}

export async function fetchProfessionalRoles(ids: string[]): Promise<Record<string, ProRole>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("connected_professional_summary")
    .select("id, professional_subtype, specialty")
    .in("id", ids);
  if (error || !data) return {};
  const out: Record<string, ProRole> = {};
  for (const r of data) {
    if (!r.id) continue;
    out[r.id] = {
      subtype: r.professional_subtype,
      role: professionalRole({ subtype: r.professional_subtype, specialty: r.specialty }),
    };
  }
  return out;
}

/**
 * The avatar tint and role ink per type (HE1.10.b.3 #9-#21): Coach #F6EEDC /
 * #8A6A3E, Physiotherapist #E7E2F6 / #5F5093, Nutritionist #E1EFEC / #3C6B65
 * (dark #93C1B9). The board names a "Coach": the app's trainer subtype. Dark
 * tints are derived (* in the table): each hue at about 18% on the #1C1F28
 * card with the ink lifted past 4.5:1 (purple #303141 / #C3B3FB and teal
 * #293339 / #93C1B9 as typeColour.ts draws them; gold #3A3226 / #E2B65C).
 * Doctors share the teal family and "other" the purple one, as in MO1.2.
 */
export function roleColours(subtype: ProRole["subtype"], dark: boolean): { tint: string; ink: string } {
  if (subtype === "trainer") return dark ? { tint: "#3A3226", ink: "#E2B65C" } : { tint: "#F6EEDC", ink: "#8A6A3E" };
  if (subtype === "dietitian" || subtype === "doctor")
    return dark ? { tint: "rgb(var(--th-293339))", ink: "rgb(var(--th-93c1b9))" } : { tint: "rgb(var(--th-e1efec))", ink: "rgb(var(--th-3c6b65))" };
  return dark ? { tint: "rgb(var(--th-303141))", ink: "rgb(var(--th-c3b3fb))" } : { tint: "rgb(var(--th-e7e2f6))", ink: "rgb(var(--th-5f5093))" };
}

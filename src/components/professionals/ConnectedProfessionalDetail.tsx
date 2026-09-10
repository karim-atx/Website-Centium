import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import {
  fetchConnectedProfessional,
  type ConnectedProfessional,
} from "../../services/connected-professional";
import type { Enums } from "../../../lib/supabase/database.types";

/**
 * Bio and specialty for the professional whose sharing sheet is open.
 *
 * WHY THE SHEET NEEDED THIS. Tapping a connected professional opened their
 * data-sharing controls and nothing else — a client could decide what health
 * data to share with someone whose name was the only thing they could see.
 *
 * READS THE CONNECTED VIEW, NOT THE PUBLIC DIRECTORY. `professional_profiles`
 * is own-row under RLS, so this detail is unreadable without
 * `connected_professional_summary`, and the directory would only have covered
 * professionals who advertise. See the migration for why connection is the
 * basis for access.
 *
 * RENDERS NOTHING WHEN THERE IS NOTHING TO SHOW, which is the case today for
 * most accounts: a professional can exist without ever writing a bio, and the
 * view returns nulls rather than a row of placeholders. An empty card, a
 * skeleton or an "About" heading over blank space would each state that
 * something is there — the same failure as printing 0 kcal for a diary nobody
 * has filled in. Silence is the honest rendering of an absence.
 */
// Keyed on the database enum rather than the app's ProfessionalType, which is
// the narrower of the two — see the README follow-up on those being
// unreconciled. Typing it as a total Record is what caught `doctor` missing
// here, and is why this will not silently render a blank chip if a sixth
// subtype is ever added.
const subtypeLabel: Record<Enums<"professional_subtype">, string> = {
  trainer: "Personal trainer",
  physiotherapist: "Physiotherapist",
  dietitian: "Dietitian",
  doctor: "Doctor",
  other: "Health professional",
};

export const ConnectedProfessionalDetail: React.FC<{ professionalId: string }> = ({
  professionalId,
}) => {
  const [professional, setProfessional] = useState<ConnectedProfessional | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchConnectedProfessional(professionalId).then((result) => {
      if (cancelled) return;
      // A failure is deliberately not surfaced here. This is supporting detail
      // beside a control the client came to use; an error banner over their
      // sharing switches would make a missing bio look like a problem with
      // their consent settings. The service logs it.
      if (result.ok) setProfessional(result.professional);
    });
    return () => {
      cancelled = true;
    };
  }, [professionalId]);

  if (!professional) return null;

  const { bio, specialty, subtype, location } = professional;
  // The subtype alone is not worth a block: it is already implied by where the
  // client is standing, and rendering "Health professional" over a sharing
  // sheet tells them nothing they did not know.
  const role = specialty?.trim() || (subtype ? subtypeLabel[subtype] : null);
  const hasBio = !!bio?.trim();
  if (!hasBio && !specialty?.trim() && !location?.trim()) return null;

  return (
    <div className="mb-5 pb-5 border-b border-charcoal/[0.06]">
      {(role || location?.trim()) && (
        <div className="flex items-center gap-2 mb-2">
          {role && (
            <span className="text-[11px] font-semibold text-primary-dark bg-primary-pale rounded-full px-2.5 py-1">
              {role}
            </span>
          )}
          {location?.trim() && (
            <span className="flex items-center gap-1 text-[11px] text-charcoal-faint">
              <MapPin size={11} /> {location.trim()}
            </span>
          )}
        </div>
      )}
      {hasBio && (
        <p className="text-[12.5px] leading-relaxed text-charcoal-soft whitespace-pre-line">
          {bio!.trim()}
        </p>
      )}
    </div>
  );
};

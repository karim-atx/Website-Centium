import { useNavigate } from "react-router-dom";
import { VerifiedCheck } from "../cv/CvBadges";
import type { DirectoryListing } from "../../services/directory";
import { ProfessionalCard } from "../market/ProfessionalCard";
import { listingCard, typeLabel } from "../../pages/professionals/profile/profileModel";
import { t } from "../../i18n/core";

/**
 * Market + Share 3.0 · W5 (C-MO.4.9 `proDir`): a live directory listing as the
 * shared ProfessionalCard, so the list and the map's floating card show the
 * one identity the handover draws everywhere (52 avatar, name 15 / 800,
 * specialty 12, the rating line with the gold star, the chevron; "From $X").
 * The old MO1.2 card (type-colour pills, bio, View Profile) is gone.
 *
 * Kept live features: the Verified check by the name (a credential the
 * Centium team checked), "New" until three reviews count toward an average,
 * and the map's distance line (`distance`, computed on the device: it takes
 * the place of the area on the rating line; null = not on the map nearby).
 * The "Hired via Centium" line needs DB10's work count, so it is hidden here
 * (never "No Centium work yet" on a guess). D-27: the listing carries no
 * phone, email, social link or website, and neither does the card.
 */
export const DirectoryCard: React.FC<{
  listing: DirectoryListing;
  distance?: string | null;
  className?: string;
  /** Kept for the map card's call; the handover card has no bio. */
  hideBio?: boolean;
  /** The card's place in a ranked list, for assistive tech. */
  rank?: number;
}> = ({ listing: p, distance, className, rank }) => {
  const navigate = useNavigate();
  const place = distance === undefined ? undefined : (distance ?? t("Not on the map nearby"));
  return (
    <ProfessionalCard
      pro={listingCard(p, typeLabel(p.subtype), place)}
      rank={rank}
      hideHired
      nameAdornment={p.hasVerifiedLicence ? <VerifiedCheck size={15} /> : undefined}
      onPress={() => navigate(`/app/professionals/${p.profileId}`)}
      className={className}
    />
  );
};

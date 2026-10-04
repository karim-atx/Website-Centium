import { useNavigate } from "react-router-dom";
import { MapPin, UserCheck } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { VerifiedCheck } from "../cv/CvBadges";
import type { DirectoryListing } from "../../services/directory";
import type { ProfessionalType } from "../../types";
import { professionalTypeIcon } from "../../utils/icons";

import { SUBTYPE_LABELS } from "./subtypeLabels";
import { RatingBadge } from "./RatingBadge";

const subtypeLabel = (s: DirectoryListing["subtype"]): string => (s ? SUBTYPE_LABELS[s] : "Professional");

const listingIcon = (s: DirectoryListing["subtype"]) =>
  s && s in professionalTypeIcon ? professionalTypeIcon[s as ProfessionalType] : UserCheck;

/**
 * A professional in the directory, shared by the list and the map so the two
 * open the same card. `distance` is the map's line ("about 3 km away · near
 * Hamra"), computed on the device; the list view passes nothing, and null
 * means not on the map near here (no area shared, or outside what was searched).
 *
 * The rating is professional_rating_summary's, through the directory view:
 * an average once three reviews count towards it, "New" before that.
 */
export const DirectoryCard: React.FC<{ listing: DirectoryListing; distance?: string | null }> = ({ listing: p, distance }) => {
  const navigate = useNavigate();
  return (
    <Card className="animate-fade-slide-up">
      <div className="flex items-start gap-3.5 mb-3">
        <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0 overflow-hidden">
          {p.avatarUrl ? (
            <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            (() => {
              const Icon = listingIcon(p.subtype);
              return <Icon size={19} className="text-primary-dark" />;
            })()
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-[5px] min-w-0">
            <span className="font-semibold text-charcoal text-sm truncate">{p.name}</span>
            {p.hasVerifiedLicence && <VerifiedCheck size={16} />}
          </p>
          {p.headline && (
            <p className="text-[12.5px] font-semibold text-primary-deep-text line-clamp-2 break-words">{p.headline}</p>
          )}
          {(p.specialty || p.subtype) && (
            <p className="text-xs text-primary-dark font-medium truncate">{p.specialty ?? subtypeLabel(p.subtype)}</p>
          )}
          <RatingBadge average={p.averageRating} count={p.reviewCount} className="mt-0.5 mb-0.5" />
          {(p.location || p.monthlyRate != null) && (
            <p className="text-xs text-charcoal-faint truncate">
              {[p.location, p.monthlyRate != null ? `$${p.monthlyRate}/mo` : null].filter(Boolean).join(" · ")}
            </p>
          )}
          {distance !== undefined && (
            <p className="flex items-center gap-1 text-xs font-semibold text-charcoal-soft mt-0.5">
              <MapPin size={12} className="shrink-0" aria-hidden />
              {distance ?? "Not on the map nearby"}
            </p>
          )}
        </div>
      </div>
      {p.bio && <p className="text-xs text-charcoal-soft mb-3.5 leading-relaxed">{p.bio}</p>}
      <Button size="sm" fullWidth onClick={() => navigate(`/app/professionals/${p.profileId}`)}>
        View Profile
      </Button>
    </Card>
  );
};

import { useNavigate } from "react-router-dom";
import { ChevronRight, MapPin, Wallet } from "lucide-react";
import { VerifiedCheck } from "../cv/CvBadges";
import type { DirectoryListing } from "../../services/directory";
import { useIsDark } from "../../hooks/useIsDark";
import { SUBTYPE_SINGULAR } from "./subtypeLabels";
import { initials, typeColours } from "./typeColour";

/** "Personal Trainer": the frame's type line, from the singular label. */
const typeLabel = (s: DirectoryListing["subtype"]): string =>
  s ? SUBTYPE_SINGULAR[s].replace(/\b\w/g, (c) => c.toUpperCase()) : "Professional";

/**
 * A professional in the directory, shared by the list and the map's floating
 * card so the two open the same card.
 *
 * MO1.2: photo or initials in the type's pill colour; name, headline and type
 * in the type colours; the area and price pills; the bio; a tinted
 * full-width "View Profile" (#EAE6F7 / #E1EFEC, measured). Handover-complete
 * pass: the rating pill and the map's distance pill are gone (neither card
 * draws them; the rating stays on the profile). The Verified mark by the name
 * stays (a safety signal: a credential the Centium team checked); its meaning
 * is the mark's own tooltip and accessible name.
 * No monthly rate, no price pill (B5).
 */
export const DirectoryCard: React.FC<{
  listing: DirectoryListing;
  className?: string;
  /** MO1.2.2's floating map card leaves the bio out. */
  hideBio?: boolean;
}> = ({ listing: p, className = "", hideBio }) => {
  const navigate = useNavigate();
  const dark = useIsDark();
  const t = typeColours(p.subtype, dark);
  const pill = "inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[11px] font-semibold max-w-full";
  const open = () => navigate(`/app/professionals/${p.profileId}`);
  // MO1.2 interactions #11–14: a tap anywhere on the card opens the profile.
  // The card itself is not a button (it holds one); View Profile stays the
  // keyboard and screen-reader path to the same place.
  return (
    <div
      onClick={open}
      className={`cursor-pointer rounded-[20px] bg-cream-card border border-charcoal/[0.08] p-4 animate-fade-slide-up ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <span
          className="w-[52px] h-[52px] rounded-full flex items-center justify-center shrink-0 overflow-hidden text-[18px] font-bold"
          style={{ background: t.pill, color: t.deep }}
        >
          {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" /> : initials(p.name)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-[5px] min-w-0">
            <span className="text-[15px] font-bold truncate" style={{ color: t.deep }}>
              {p.name}
            </span>
            {p.hasVerifiedLicence && <VerifiedCheck size={16} />}
          </p>
          {p.headline && (
            <p className="text-[12.5px] font-semibold line-clamp-2 break-words" style={{ color: t.main }}>
              {p.headline}
            </p>
          )}
          <p className="text-[11.5px] font-medium truncate" style={{ color: t.main }}>
            {p.specialty ?? typeLabel(p.subtype)}
          </p>
        </div>
      </div>

      {(p.location || p.monthlyRate != null) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {p.location && (
            <span className={pill} style={{ background: t.pill, color: t.deep }}>
              {/* Pill icons in the type's main colour, the text in its deep (sampled on MO1.2). */}
              <MapPin size={12} strokeWidth={1.75} className="shrink-0" aria-hidden style={{ color: t.main }} />
              <span className="truncate">{p.location}</span>
            </span>
          )}
          {p.monthlyRate != null && (
            <span className={pill} style={{ background: t.pill, color: t.deep }}>
              <Wallet size={12} strokeWidth={1.75} className="shrink-0" aria-hidden style={{ color: t.main }} />${p.monthlyRate}/mo
            </span>
          )}
        </div>
      )}

      {p.bio && !hideBio && <p className="text-[13px] text-charcoal-soft leading-relaxed mt-3 break-words">{p.bio}</p>}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
        // MO1.2: 40 tall, r12 (measured on the frame; the 224 card fits it).
        className="tap mt-3.5 w-full h-10 rounded-xl flex items-center justify-center gap-1 text-[13.5px] font-bold"
        style={{ background: t.button, color: t.deep }}
      >
        View Profile <ChevronRight size={14} aria-hidden />
      </button>
    </div>
  );
};

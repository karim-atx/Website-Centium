import { useNavigate } from "react-router-dom";
import { ChevronRight, MapPin, Navigation, Star, Wallet } from "lucide-react";
import { VerifiedCheck } from "../cv/CvBadges";
import type { DirectoryListing } from "../../services/directory";
import { useIsDark } from "../../hooks/useIsDark";
import { SUBTYPE_SINGULAR } from "./subtypeLabels";
import { ratingLabel, reviewCountLabel } from "../../services/professional-reviews/rules";
import { goldPill, initials, pinGround, typeColours } from "./typeColour";
import { AvatarPlaceholder } from "../icons/PartBIcons";

/** "Personal Trainer": the frame's type line, from the singular label. */
const typeLabel = (s: DirectoryListing["subtype"]): string =>
  s ? SUBTYPE_SINGULAR[s].replace(/\b\w/g, (c) => c.toUpperCase()) : "Professional";

/**
 * A professional in the directory, shared by the list and the map's floating
 * card so the two open the same card. `distance` is the map's line ("about
 * 3 km away · near Hamra"), computed on the device; the list passes nothing,
 * and null means not on the map near here (no area shared, or outside what
 * was searched).
 *
 * MO1.2: photo or initials in the type's pill colour; name, headline and type
 * in the type colours; the area and price pills; the bio; a tinted
 * full-width "View Profile" (#EAE6F7 / #E1EFEC, measured). Restore round 2
 * (user, 2026-10-07): the rating pill and the map's distance pill are back, as
 * on main, in the card's own pill row (24 tall, 11/600, the type's pill
 * colours; the rating as Foundations' gold reviews pill: an average once
 * three reviews count towards it, "New" before that, from
 * professional_rating_summary through the directory view). The Verified mark by the name
 * stays (a safety signal: a credential the Centium team checked); its meaning
 * is the mark's own tooltip and accessible name.
 * The price pill shows when the professional set a monthly rate (MO1.2 #22).
 * v6 MO1.2: literal sizes, 0.5px hairline, the handover's dark column.
 */
export const DirectoryCard: React.FC<{
  listing: DirectoryListing;
  distance?: string | null;
  className?: string;
  /** MO1.2.2's floating map card leaves the bio out. */
  hideBio?: boolean;
}> = ({ listing: p, distance, className = "", hideBio }) => {
  const navigate = useNavigate();
  const dark = useIsDark();
  const t = typeColours(p.subtype, dark);
  const gold = goldPill(dark);
  const rating = ratingLabel(p.averageRating, p.reviewCount);
  // v6 MO1.2 #20 / #22 / #33 / #35: 24 tall, padding 0 9, icon gap 5,
  // 11/16.5 600, the type family's pill and deep ink.
  const pill = "inline-flex items-center gap-[5px] h-6 px-[9px] rounded-full text-[11px] leading-[16.5px] font-semibold max-w-full";
  const open = () => navigate(`/app/professionals/${p.profileId}`);
  // MO1.2 S4: a tap anywhere on the card opens the profile. The card itself
  // is not a button (it holds one); View Profile stays the keyboard and
  // screen-reader path to the same place.
  return (
    <div
      onClick={open}
      data-directory-card=""
      // MO1.2 #14: pad 16, r20, cream-card, 0.5px #241F1B@8% / #F5F3FA@8%.
      className={`cursor-pointer rounded-[20px] bg-cream-card border-[0.5px] border-hair-08 p-4 animate-fade-slide-up ${className}`}
    >
      <div className="flex items-start gap-[13px]">
        {/* #15 / #16 / #28 / #41: 52 round on #E7E2F6 (purple) / #E1EEEB
            (teal), dark the family pill (#303141 / #293339, the drawn
            #E7E2F6* is a light leak). Photo, else initials 18/27 700 in the
            deep ink when a name exists, else the person glyph (PB4 People:
            initials when a name exists). */}
        <span
          data-avatar=""
          className="w-[52px] h-[52px] rounded-full flex items-center justify-center shrink-0 overflow-hidden text-[18px] leading-[27px] font-bold"
          style={{ background: pinGround(p.subtype, dark), color: t.deep }}
        >
          {p.avatarUrl ? (
            <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : p.name.trim() ? (
            initials(p.name)
          ) : (
            <AvatarPlaceholder size={52} />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-[5px] min-w-0">
            {/* #17 / #30: 15/20 700, deep (#5F5093 / #C3B3FB; #3C6B65 / #93C1B9). */}
            <span className="text-[15px] leading-[20px] font-bold truncate" style={{ color: t.deep }}>
              {p.name}
            </span>
            {/* K5: a credential checked by Centium (KEEP-SAFETY). */}
            {p.hasVerifiedLicence && <VerifiedCheck size={16} />}
          </p>
          {p.headline && (
            // #18 / #31: 12.5/17 600 in the family main.
            <p className="text-[12.5px] leading-[17px] font-semibold line-clamp-2 break-words" style={{ color: t.main }}>
              {p.headline}
            </p>
          )}
          {/* #19 / #32: 11.5/16 500 at 0.9. */}
          <p className="text-[11.5px] leading-[16px] font-medium truncate" style={{ color: t.main, opacity: 0.9 }}>
            {p.specialty ?? typeLabel(p.subtype)}
          </p>
        </div>
      </div>

      {/* Pills 6 apart (#20). The gold reviews pill (K4) is on every card. */}
      <div className="flex flex-wrap gap-1.5 mt-3">
          {p.location && (
            <span className={pill} style={{ background: t.pill, color: t.deep }}>
              {/* #21 / #34: MapPin 12 in the family main. */}
              <MapPin size={12} strokeWidth={1.75} className="shrink-0" aria-hidden style={{ color: t.main }} />
              <span className="truncate">{p.location}</span>
            </span>
          )}
          {/* K4: Foundations › gold reviews pill (#FBF3E2 / 1 px #D9A441 /
              #9A7424, Star #D9A441; dark border and star #E0B360), at #20's
              24 / 0 9 and 700. */}
          <span
            className={`${pill} !font-bold`}
            style={{ background: gold.bg, border: `1px solid ${gold.border}`, color: gold.ink }}
            aria-label={
              rating.kind === "average"
                ? `Rated ${rating.value}, ${reviewCountLabel(rating.count)}`
                : p.reviewCount > 0
                  ? `New, ${reviewCountLabel(p.reviewCount)}`
                  : "New, no rating yet"
            }
          >
            <Star size={12} className="shrink-0" aria-hidden style={{ fill: gold.star, color: gold.star }} />
            {rating.kind === "average" ? `${rating.value} · ${reviewCountLabel(rating.count)}` : "New"}
          </span>
          {p.monthlyRate != null && (
            // #22 / #35: the price pill as the area pill, Wallet 12.
            <span className={pill} style={{ background: t.pill, color: t.deep }}>
              <Wallet size={12} strokeWidth={1.75} className="shrink-0" aria-hidden style={{ color: t.main }} />${p.monthlyRate}/mo
            </span>
          )}
          {distance !== undefined && (
            // K6: the map card's distance pill, styled as #20.
            <span className={pill} style={{ background: t.pill, color: t.deep }}>
              <Navigation size={11} strokeWidth={1.75} className="shrink-0" aria-hidden style={{ color: t.main }} />
              <span className="truncate">{distance ?? "Not on the map nearby"}</span>
            </span>
          )}
      </div>

      {/* #24 / #37 / #47: 12.5/20 400 charcoal-soft, 10 under the pills. */}
      {p.bio && !hideBio && <p className="text-[12.5px] leading-[20px] text-charcoal-soft mt-2.5 break-words">{p.bio}</p>}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
        // #25 / #38: 40 tall, r12, 12 above, 13/19.5 700; #EAE6F7 / #E1EFEC
        // with the deep ink (dark: the family pill). Chevron 14, gap 6.
        className="tap mt-3 w-full h-10 rounded-xl flex items-center justify-center gap-1.5 text-[13px] leading-[19.5px] font-bold"
        style={{ background: t.button, color: t.deep }}
      >
        View Profile <ChevronRight size={14} aria-hidden />
      </button>
    </div>
  );
};

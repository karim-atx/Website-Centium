import React from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx, linePx } from "../../theme/textSize";
import { NO_ICON_SCALE } from "../pro/proInk";
import { SEGMENT_STEPS, marketPalette } from "../../theme/marketTokens";
import { hexAlpha, liftInk } from "./marketColor";
import { hiredText, identityStep, initialsOf, placeOf, ratingLine, type ProfessionalCardData } from "./peopleModel";

export type { ProfessionalCardData };
import { FOCUS_CSS, usePress } from "./usePress";
import { isRtl } from "../../i18n/core";

// Market + Share 3.0 · ProfessionalCard (HANDOVER §4 C-MO.4.9 "Directory",
// §5: one identity everywhere; Client Professional Screens lines 36–47 and
// the `dir` / `pr` script). D-27: a professional's public card carries NO
// phone, email, social link or website; the props have no field for them.
//
// The directory card: radius 18, --card, border 0.5px --hair, padding 14 16;
// a row (gap 12, centred): the 52 avatar (initials 16 / 800 on the step tint,
// or the photo), name 15 / 20 800, specialty 12 --ink2, the rating line
// 11.5 --faint with an 11 star in --gold (gap 4, margin-top 1); a chevron 16
// stroke 1.75 --faint. The footer (margin-top 10, padding-top 10, border-top
// 0.5px --div, space-between, gap 10): the hired badge 11.5 / 700 with the
// ticket-check icon 13 (gap 5) in --tealink ("Hired via Centium · N roles")
// or --faint ("No Centium work yet"); "From $X" 12 / 700 --accent.
// The profile chip (C-MO.4.9 header, line 62) is `HiredBadge variant="chip"`:
// radius 10, padding 6 10, 12 / 700, icon 14, gap 6, --tealbg / --tealink or
// --soft / --faint.
// The avatar's colour is fixed per person (a hash of the id over steps 1–4),
// so the same professional looks the same in every list.

/** lucide ticket-check, as the screen files draw it. */
export const TicketCheck: React.FC<{ size: number; color?: string }> = ({ size, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block", flex: "none", ...NO_ICON_SCALE }}>
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const Star: React.FC<{ size: number }> = ({ size }) => {
  const dark = useIsDark();
  const gold = marketPalette(dark).gold;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={gold} stroke={gold} strokeWidth={1.5} strokeLinejoin="round" aria-hidden style={{ display: "block", flex: "none", ...NO_ICON_SCALE }}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
};

export const MarketAvatar: React.FC<{ id: string; name: string; photoUrl?: string | null; size: number; fontSize: number }> = ({ id, name, photoUrl, size, fontSize }) => {
  const dark = useIsDark();
  const [tint, ink] = SEGMENT_STEPS[identityStep(id) - 1];
  if (photoUrl) return <img src={photoUrl} alt="" style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", flexShrink: 0, display: "block" }} />;
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: dark ? hexAlpha(ink, 0.16) : tint,
        color: dark ? liftInk(ink) : ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: textPx(fontSize),
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {initialsOf(name)}
    </span>
  );
};

export const HiredBadge: React.FC<{ roles: number; variant?: "line" | "chip" }> = ({ roles, variant = "line" }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const hired = roles > 0;
  if (variant === "chip") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, lineHeight: "normal", borderRadius: 10, background: hired ? m.tealbg : m.soft, padding: "6px 10px", fontSize: textPx(12), fontWeight: 700, color: hired ? m.tealink : m.faint }}>
        <TicketCheck size={14} />
        {hiredText(roles)}
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, lineHeight: "normal", fontSize: textPx(11.5), fontWeight: 700, color: hired ? m.tealink : m.faint, minWidth: 0 }}>
      <TicketCheck size={13} />
      {hiredText(roles)}
    </span>
  );
};

export interface ProfessionalCardProps {
  pro: ProfessionalCardData;
  /** The card's place in the ranked list (best match first), for assistive tech. */
  rank?: number;
  onPress: () => void;
  className?: string;
  style?: React.CSSProperties;
  /**
   * W5 (optional): hide the hired line while the Centium work count is
   * unknown (DB10 pending), so "No Centium work yet" is never claimed on a
   * guess. The footer goes too when there is no price either. Unset keeps the
   * line.
   */
  hideHired?: boolean;
  /** W5 (optional): a mark after the name (the live Verified check). */
  nameAdornment?: React.ReactNode;
}

export const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ pro, rank, onPress, className, style, hideHired, nameAdornment }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const press = usePress();
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <button
        type="button"
        onClick={onPress}
        {...press.handlers}
        aria-label={`${rank ? `${rank}. ` : ""}${pro.name}, ${pro.specialty}. ${ratingLine(pro.rating, pro.reviewCount, placeOf(pro))}${hideHired ? "" : `. ${hiredText(pro.hiredViaCentiumCount)}`}${pro.fromPrice ? `. ${pro.fromPrice}` : ""}`}
        className={`market-focus ${className ?? ""}`}
        style={{ display: "block", width: "100%", textAlign: "start", font: "inherit", lineHeight: "normal", cursor: "pointer", borderRadius: 18, background: m.card, border: `0.5px solid ${m.hair}`, padding: "14px 16px", color: m.ink, ...press.style, ...style }}
      >
        <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <MarketAvatar id={pro.id} name={pro.name} photoUrl={pro.photoUrl} size={52} fontSize={16} />
          <span style={{ flex: 1, minWidth: 0 }}>
            {nameAdornment ? (
              <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                <span style={{ fontSize: textPx(15), fontWeight: 800, lineHeight: linePx(20), minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pro.name}</span>
                {nameAdornment}
              </span>
            ) : (
              <span style={{ display: "block", fontSize: textPx(15), fontWeight: 800, lineHeight: linePx(20) }}>{pro.name}</span>
            )}
            <span style={{ display: "block", fontSize: textPx(12), color: m.ink2 }}>{pro.specialty}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: textPx(11.5), color: m.faint, marginTop: 1 }}>
              <Star size={11} />
              {ratingLine(pro.rating, pro.reviewCount, placeOf(pro))}
            </span>
          </span>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={m.faint} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", ...(isRtl() ? { transform: "scaleX(-1)" } : NO_ICON_SCALE) }}>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
        {hideHired && !pro.fromPrice ? null : (
          <span style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 10, borderTop: `0.5px solid ${m.div}` }}>
            {hideHired ? <span aria-hidden /> : <HiredBadge roles={pro.hiredViaCentiumCount} />}
            {pro.fromPrice ? <span style={{ fontSize: textPx(12), fontWeight: 700, color: m.accent, flexShrink: 0 }}>{pro.fromPrice}</span> : null}
          </span>
        )}
      </button>
    </>
  );
};

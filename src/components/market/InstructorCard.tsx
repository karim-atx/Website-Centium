import React from "react";
import { Link } from "react-router-dom";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx, linePx } from "../../theme/textSize";
import { NO_ICON_SCALE } from "../pro/proInk";
import { marketPalette } from "../../theme/marketTokens";
import { MarketAvatar, TicketCheck } from "./ProfessionalCard";
import { ratingLine } from "./peopleModel";
import { FOCUS_CSS, usePress } from "./usePress";
import { isRtl, t } from "../../i18n/core";

// Market + Share 3.0 · InstructorCard (HANDOVER §4 C-MO.4 "Class detail", §5;
// Client Explore Screens lines 303–316):
// - listed: a link to the instructor's profile (C-MO.4.9), aria-label "Open
//   {name}'s profile"; a centred row (gap 12), radius 18, border 0.5px
//   --hair, --card, padding 12 14; the 48 avatar (initials 15 / 800);
//   "INSTRUCTOR" 10 / 700 0.1em --faint; the name 14.5 / 20 800; specialty and
//   rating 12 --ink2 ("Cycling and HIIT · 4.8 · 38 reviews"); "Hired via
//   Centium" 11 / 700 --tealink with the ticket-check 12 (gap 4, margin-top 3,
//   only for a Team hire); a chevron 16 stroke 2 --faint;
// - unlisted (not on the Team, or "No instructor named"): the same row on
//   --soft with no border and no link; the avatar a 48 circle outlined 1.5px
//   dashed --border with the lucide user 20 stroke 1.75 --tert;
//   "INSTRUCTOR"; "Instructor not listed" 14.5 / 20 700 --ink2.

export type InstructorCardProps =
  | {
      listed: true;
      id: string;
      name: string;
      photoUrl?: string | null;
      specialty: string;
      rating?: number | null;
      reviewCount?: number;
      /** A Team hire through Centium (shows "Hired via Centium"). */
      hiredViaCentium?: boolean;
      /** The profile route (C-MO.4.9). */
      to: string;
      className?: string;
      style?: React.CSSProperties;
      /**
       * Website viewport (WC-EX.2, WC-EX Class Web): padding 12 16, gap 14; INSTRUCTOR 11/16, the name 15/22
       * 800, the line 13/20 with "Hired via Centium" beside it (13/20 700, the 14 ticket, 12 apart). Unset, as before.
       */
      web?: boolean;
    }
  | { listed: false; className?: string; style?: React.CSSProperties; web?: boolean };

export const InstructorCard: React.FC<InstructorCardProps> = (props) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const press = usePress();
  const web = !!props.web;
  const caps: React.CSSProperties = web
    ? { display: "block", fontSize: 11, lineHeight: "16px", fontWeight: 700, letterSpacing: "0.1em", color: m.faint }
    : { display: "block", fontSize: textPx(10), fontWeight: 700, letterSpacing: "0.1em", color: m.faint };
  const row: React.CSSProperties = web
    ? { lineHeight: "normal", display: "flex", alignItems: "center", gap: 14, borderRadius: 18, padding: "12px 16px" }
    : { lineHeight: "normal", display: "flex", alignItems: "center", gap: 12, borderRadius: 18, padding: "12px 14px" };

  if (!props.listed) {
    return (
      <div className={props.className} style={{ ...row, background: m.soft, ...props.style }}>
        <span
          aria-hidden
          style={{ width: 48, height: 48, borderRadius: 999, border: `1.5px dashed ${m.border}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", color: m.tert, flexShrink: 0 }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", ...NO_ICON_SCALE }}>
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={caps}>{t("INSTRUCTOR")}</span>
          <span style={web ? { display: "block", fontSize: 15, fontWeight: 700, lineHeight: "22px", color: m.ink2 } : { display: "block", fontSize: textPx(14.5), fontWeight: 700, lineHeight: linePx(20), color: m.ink2 }}>{t("Instructor not listed")}</span>
        </div>
      </div>
    );
  }

  const p = props;
  const detail = p.rating != null && (p.reviewCount ?? 0) > 0 ? `${p.specialty} · ${ratingLine(p.rating, p.reviewCount ?? 0)}` : p.specialty;
  return (
    <>
      <style>{FOCUS_CSS}</style>
      <Link
        to={p.to}
        aria-label={t("Open {name}'s profile", { name: p.name })}
        {...press.handlers}
        className={`market-focus ${p.className ?? ""}`}
        style={{ ...row, border: `0.5px solid ${m.hair}`, background: m.card, color: m.ink, textDecoration: "none", cursor: "pointer", ...press.style, ...p.style }}
      >
        <MarketAvatar id={p.id} name={p.name} photoUrl={p.photoUrl} size={48} fontSize={15} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={caps}>{t("INSTRUCTOR")}</span>
          <span style={web ? { display: "block", fontSize: 15, fontWeight: 800, lineHeight: "22px" } : { display: "block", fontSize: textPx(14.5), fontWeight: 800, lineHeight: linePx(20) }}>{p.name}</span>
          {web ? (
            <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, lineHeight: "20px", color: m.ink2 }}>{detail}</span>
              {p.hiredViaCentium ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: m.tealink }}>
                  <TicketCheck size={14} />
                  {t("Hired via Centium")}
                </span>
              ) : null}
            </span>
          ) : (
            <span style={{ display: "block", fontSize: textPx(12), color: m.ink2 }}>{detail}</span>
          )}
          {!web && p.hiredViaCentium ? (
            <span style={{ marginTop: 3, display: "inline-flex", alignItems: "center", gap: 4, fontSize: textPx(11), fontWeight: 700, color: m.tealink }}>
              <TicketCheck size={12} />
              {t("Hired via Centium")}
            </span>
          ) : null}
        </span>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={m.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", ...(isRtl() ? { transform: "scaleX(-1)" } : NO_ICON_SCALE) }}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Link>
    </>
  );
};

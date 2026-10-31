import React from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Home, MapPin, Phone, Video, type LucideIcon } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx, linePx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { CvView } from "../../../components/cv/CvView";
import type { PublicCv } from "../../../services/professional-cv";
import { PointsLeaf } from "../../../components/market/PointsFigure";
import { formatPoints, offerProgress } from "../../../components/market/pointsModel";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { WEEKDAY_LETTERS } from "../../../services/public-pro";
import { dayText, teachesTitle, weekdayCaps, type ProfileOffer, type TeachesAtRow } from "../../../services/pro-profile/model";
import { time12Split } from "../../../utils/time12";
import { Caps, Chevron, PressButton } from "./parts";
import { PlaylistCard } from "../../../components/music/PlaylistCard";
import { providerHeading } from "../../../services/music/whichMusic";
import type { SocialLink } from "./profileModel";

// Market + Share 3.0 · W5 · C-MO.4.9 `proAbout` "About · point offers"
// (Client Professional Screens lines 73–104). Literal values:
// - the bio 13 / 19.5 --ink2 (margin-top 16);
// - specialties (margin-top 12, wrap, gap 6): padding 5 10, radius 999,
//   --pale / --pdark 11.5 / 700;
// - "Point offers" (margin-top 18, space-between, baseline): the caps label
//   and "You have" 12 --faint with the balance 14 / 700 --ink and the leaf
//   5.6 × 10 (gap 3); the cards (margin-top 8, gap 10): relative, radius 18,
//   --card, 0.5px --hair, padding 12 14 14, gap 12; the headline 14 / 20 700,
//   "Ends {date}" 11.5 --faint (margin-top 1); right (align-self flex-end):
//   the cost 17 / 700 tabular + the 6.7 × 12 leaf, the note 11 / 15 ("You can
//   redeem" --tealink 700, "N to go" --faint 500); the bottom 2px line (--div
//   track, --teal at 100% or --fill at the share);
// - "Teaches at" (margin-top 18) and its card (margin-top 8, radius 18,
//   --card, 0.5px --hair): rows padding 11 14, gap 12, a 0.5px --div rule
//   between; the 52 time tile (radius 10, --pale, padding 6 0: the time
//   13 / 800, the day 9.5 / 700 --faint), the class 13.5 / 700, the gym
//   11.5 / 600 --accent, the chevron.
// Times are 12-hour (D-03: "6:30 PM" with the meridiem under the time beside
// the day), dates month first (D-02: "Ends Dec 31, 2026").
// The point offers are public_offers('professional', id) (Database PR #39);
// with none (or Teaches at, which has no reader) the section is left out
// (the board draws no empty state for them), never sample rows.
//
// KEPT LIVE FEATURES under About (PLAN §3.2): the CV (CvView: headline,
// qualifications, experience …), Where and Availability this week (the
// session types' places and professional_open_slots, as the Release 3 MO3
// sections), and, for a CONNECTED client only (D-27), the professional's
// social links. Their own sections use the caps label and the board's card.

export interface WhereRow {
  /** "business": a workplace from professional_workplaces (W7-9). */
  icon: "place" | "business" | "online" | "home" | "phone";
  title: string;
  line: string;
}

export interface Availability {
  state: "ready" | "blocked" | "none" | "error";
  /** Sessions that fit each day, Monday first. */
  week?: number[];
  blockedLine?: string;
}

const ICONS: Record<WhereRow["icon"], LucideIcon> = { place: MapPin, business: Building2, online: Video, home: Home, phone: Phone };

export const AboutTab: React.FC<{
  bio: string | null;
  specialties: string[];
  socials: SocialLink[];
  cv: PublicCv | null;
  skills: string[];
  firstName: string;
  where: WhereRow[] | null;
  availability: Availability | null;
  offers: ProfileOffer[];
  balance: number;
  teaches: TeachesAtRow[];
  today: string;
  /** The kept relationship blocks (client code card, the data-sharing line). */
  footer?: React.ReactNode;
  /** Round E: the professional's playlist, under the bio and specialties. */
  playlistUrl?: string | null;
}> = ({ bio, specialties, socials, cv, skills, firstName, where, availability, offers, balance, teaches, today, footer, playlistUrl }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const card: React.CSSProperties = { borderRadius: 18, background: m.card, border: `0.5px solid ${m.hair}`, color: m.ink };

  return (
    <div style={{ lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      {bio ? <p style={{ margin: "16px 0 0", fontSize: textPx(13), lineHeight: linePx(19.5), color: m.ink2, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{bio}</p> : null}

      {specialties.length > 0 && (
        <ul aria-label="Specialties" style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {specialties.map((s) => (
            <li key={s} style={{ padding: "5px 10px", borderRadius: 999, background: m.pale, color: m.pdark, fontSize: textPx(11.5), fontWeight: 700 }}>
              {s}
            </li>
          ))}
        </ul>
      )}

      {playlistUrl && (
        <section aria-label="Music" style={{ marginTop: 18 }}>
          <Caps>Music</Caps>
          <PlaylistCard url={playlistUrl} heading={providerHeading(firstName)} style={{ marginTop: 8 }} />
        </section>
      )}

      {socials.length > 0 && (
        <section aria-label="Social" style={{ marginTop: 18 }}>
          <Caps>Social</Caps>
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {socials.map((s) => (
              <li key={s.kind}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.label} ${s.text} (opens in a new tab)`}
                  className="hit market-focus"
                  style={{ display: "inline-flex", padding: "5px 10px", borderRadius: 999, background: m.pale, color: m.pdark, fontSize: textPx(11.5), fontWeight: 700, textDecoration: "none" }}
                >
                  {s.label} {s.text}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cv ? (
        <div style={{ marginTop: 18 }}>
          <CvView cv={cv} skills={skills} accent={{ label: m.accent, pillBg: m.pale, pillInk: m.pdark }} />
        </div>
      ) : null}

      {where && (
        <section aria-label="Where" style={{ marginTop: 18 }}>
          <Caps>Where</Caps>
          {where.length === 0 ? (
            <p style={{ margin: "8px 0 0", fontSize: textPx(12.5), color: m.faint }}>{firstName || "They"} hasn't said where they work yet.</p>
          ) : (
            <div style={{ ...card, marginTop: 8, overflow: "hidden" }}>
              {where.map((w, i) => {
                const Icon = ICONS[w.icon];
                return (
                  <div key={`${w.icon}${i}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderTop: i ? `0.5px solid ${m.div}` : 0 }}>
                    <span aria-hidden style={{ width: 52, height: 43, flexShrink: 0, borderRadius: 10, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", color: m.accent }}>
                      <Icon size={18} strokeWidth={1.75} style={NO_ICON_SCALE} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: textPx(13.5), fontWeight: 700, overflowWrap: "anywhere" }}>{w.title}</div>
                      <div style={{ fontSize: textPx(11.5), color: m.faint }}>{w.line}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {availability && (
        <section aria-label="Availability this week" style={{ marginTop: 18 }}>
          <Caps>Availability this week</Caps>
          {availability.state === "ready" && availability.week ? (
            <div role="list" aria-label="Open sessions this week" style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
              {availability.week.map((n, i) => (
                <span
                  key={i}
                  role="listitem"
                  aria-label={`${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i]}: ${n} open`}
                  style={{ textAlign: "center", borderRadius: 10, padding: "8px 0", background: n ? m.pale : m.soft }}
                >
                  <span aria-hidden style={{ display: "block", fontSize: textPx(10), fontWeight: 700, color: m.faint }}>
                    {WEEKDAY_LETTERS[i]}
                  </span>
                  <span aria-hidden style={{ display: "block", fontSize: textPx(13), fontWeight: 800, color: n ? m.pdark : m.tert, fontVariantNumeric: "tabular-nums" }}>
                    {n}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p style={{ margin: "8px 0 0", fontSize: textPx(12.5), color: m.faint }}>
              {availability.state === "blocked" ? availability.blockedLine : availability.state === "none" ? "No session types to book yet." : "Couldn't load open times."}
            </p>
          )}
        </section>
      )}

      {offers.length > 0 && (
        <section aria-label="Point offers" style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <Caps>Point offers</Caps>
            <span style={{ display: "inline-flex", alignItems: "baseline", gap: 3, fontSize: textPx(12), color: m.faint, whiteSpace: "nowrap" }}>
              You have <span style={{ fontSize: textPx(14), fontWeight: 700, color: m.ink, fontVariantNumeric: "tabular-nums" }}>{formatPoints(balance)}</span>
              <PointsLeaf height={10} />
            </span>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            {offers.map((o) => {
              const p = offerProgress(balance, o.pointsCost);
              return (
                <PressButton
                  key={o.id}
                  onClick={() => navigate(`/app/marketplace/rewards/${encodeURIComponent(o.id)}`)}
                  aria-label={`${o.headline}. ${formatPoints(o.pointsCost)} points. ${p.note}`}
                  style={{ ...card, position: "relative", overflow: "hidden", width: "100%", textAlign: "start", font: "inherit", lineHeight: "normal", cursor: "pointer", padding: "12px 14px 14px", display: "flex", gap: 12 }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: textPx(14), lineHeight: linePx(20), fontWeight: 700, overflowWrap: "anywhere" }}>{o.headline}</span>
                    {o.endsOn ? <span style={{ display: "block", fontSize: textPx(11.5), color: m.faint, marginTop: 1 }}>Ends {dayText(o.endsOn)}</span> : null}
                  </span>
                  <span style={{ alignSelf: "flex-end", textAlign: "end", flexShrink: 0 }}>
                    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 3, whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: textPx(17), fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatPoints(o.pointsCost)}</span>
                      <PointsLeaf height={12} />
                    </span>
                    <span style={{ display: "block", fontSize: textPx(11), lineHeight: linePx(15), color: p.can ? m.tealink : m.faint, fontWeight: p.can ? 700 : 500 }}>{p.note}</span>
                  </span>
                  <span aria-hidden style={{ position: "absolute", insetInlineStart: 0, insetInlineEnd: 0, bottom: 0, height: 2, background: m.div }} />
                  <span aria-hidden style={{ position: "absolute", insetInlineStart: 0, bottom: 0, height: 2, width: `${p.pct}%`, background: p.can ? m.teal : m.fill }} />
                </PressButton>
              );
            })}
          </div>
        </section>
      )}

      {teaches.length > 0 && (
        <section aria-label="Teaches at" style={{ marginTop: 18 }}>
          <Caps>Teaches at</Caps>
          <div style={{ ...card, marginTop: 8, overflow: "hidden" }}>
            {teaches.map((c, i) => {
              const t = time12Split(c.startTime);
              const open = c.businessId ? () => navigate(`/app/marketplace/gym?id=${encodeURIComponent(c.businessId!)}`) : undefined;
              const inner = (
                <>
                  <span style={{ width: 52, flexShrink: 0, textAlign: "center", borderRadius: 10, background: m.pale, padding: "6px 0" }}>
                    <span style={{ display: "block", fontSize: textPx(13), fontWeight: 800, color: m.ink, fontVariantNumeric: "tabular-nums" }}>{t?.time ?? ""}</span>
                    <span style={{ display: "block", fontSize: textPx(9.5), fontWeight: 700, color: m.faint }}>{[t?.meridiem, weekdayCaps(c.weekday)].filter(Boolean).join(" ")}</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: textPx(13.5), fontWeight: 700, overflowWrap: "anywhere" }}>{teachesTitle(c, today)}</span>
                    <span style={{ display: "block", fontSize: textPx(11.5), color: m.accent, fontWeight: 600 }}>{c.businessName}</span>
                  </span>
                  {open ? <Chevron color={m.faint} /> : null}
                </>
              );
              const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderTop: i ? `0.5px solid ${m.div}` : 0, width: "100%", textAlign: "start", font: "inherit", color: m.ink, lineHeight: "normal" };
              return open ? (
                <button key={`${c.seriesId ?? c.title}${i}`} type="button" onClick={open} className="market-focus" style={{ ...row, background: "none", borderInlineStart: 0, borderInlineEnd: 0, borderBottom: 0, cursor: "pointer" }}>
                  {inner}
                </button>
              ) : (
                <div key={`${c.seriesId ?? c.title}${i}`} style={row}>
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {footer}
    </div>
  );
};

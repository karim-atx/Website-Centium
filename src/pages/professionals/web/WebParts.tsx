import type React from "react";
import { Star } from "lucide-react";
import { initials } from "../../../components/professionals/typeColour";
import { GOLD, type Fam } from "./prWebStyles";
import { t } from "../../../i18n/core";

// Website viewport v1, WC-PR Professionals: the small parts the web page
// repeats (WC-PR Professionals Web v3, literal values).

/** A round avatar: the photo, else the initials on the family's pin ground in its deep ink. */
export const PrAvatar: React.FC<{ name: string; photoUrl?: string | null; fam: Fam; size: number; fontSize: number; ground?: string; ink?: string }> = ({ name, photoUrl, fam, size, fontSize, ground, ink }) => (
  <span
    aria-hidden
    className="grid place-items-center overflow-hidden"
    style={{ width: size, height: size, borderRadius: 999, flex: "none", fontSize, fontWeight: 700, background: ground ?? fam.pin, color: ink ?? fam.deep }}
  >
    {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" /> : initials(name)}
  </span>
);

const STAR_D =
  "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z";

/** The reference's five stars (`stars(n, size)`): #D9A441 outline 1.5, filled up to n, 1px apart. */
export const PrStars: React.FC<{ n: number; size?: number; gap?: number }> = ({ n, size = 14, gap = 1 }) => (
  <span role="img" aria-label={t("{n} out of 5 stars", { n })} style={{ display: "flex", gap, flex: "none" }}>
    {Array.from({ length: 5 }, (_, i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ display: "block" }}>
        <path d={STAR_D} fill={i < n ? "#D9A441" : "none"} stroke="#D9A441" strokeWidth={1.5} />
      </svg>
    ))}
  </span>
);

/** A filled 13 star in the gold (the rating pills and the map rows). */
export const GoldStar: React.FC<{ size?: number }> = ({ size = 13 }) => <Star size={size} color={GOLD.star} fill={GOLD.star} strokeWidth={2} aria-hidden style={{ flex: "none" }} />;

/** A family pill (height 26 or 28, 13 600, the 13 icon in the family's main). */
export const PrPill: React.FC<{ icon: React.ReactNode; height: 26 | 28; bg: string; ink: string; children: React.ReactNode }> = ({ icon, height, bg, ink, children }) => (
  <span
    className="inline-flex items-center whitespace-nowrap"
    style={{ height, padding: height === 28 ? "0 12px" : "0 10px", borderRadius: 999, gap: 5, fontSize: 13, fontWeight: 600, background: bg, color: ink, maxWidth: "100%" }}
  >
    {icon}
    <span className="truncate">{children}</span>
  </span>
);

/** The reference's empty card: the 56 tile (r16 #F0EDF9, a 26 icon at 1.5 in #7D6BB5), the title 17/24 700 and its line 15/24. */
export const PrEmpty: React.FC<{ icon: React.ReactNode; title: string; body?: string | null; bg?: string; border?: string; tile?: string; bodyInk?: string; maxW?: number; children?: React.ReactNode; gapTitle?: number }> = ({
  icon,
  title,
  body,
  bg = "#F5F5F6",
  border,
  tile = "#F0EDF9",
  bodyInk = "#8C8378",
  maxW = 320,
  children,
  gapTitle = 12,
}) => (
  <div role="status" className="flex flex-col items-center justify-center text-center" style={{ flex: "none", borderRadius: 20, background: bg, border, padding: "40px 24px" }}>
    <span className="grid place-items-center" style={{ width: 56, height: 56, borderRadius: 16, background: tile }}>
      {icon}
    </span>
    <p style={{ margin: `${gapTitle}px 0 0`, fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{title}</p>
    {body ? <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "24px", color: bodyInk, maxWidth: maxW }}>{body}</p> : null}
    {children}
  </div>
);

import type React from "react";
import type { DirectoryListing } from "../../../services/directory";
import { typeFamily } from "../../../components/professionals/typeColour";
import { ratingLabel, reviewCountLabel } from "../../../services/professional-reviews/rules";
import { t, tx } from "../../../i18n/core";

// Website viewport v1, WC-PR Professionals (WC-PR Professionals Web v3): the
// shared literal values of the web page, its parts and their hover / focus
// rules. Not a component module, so the parts' files export only components.

export const PR_WEB_CSS = `
.pr-web-press { transition: transform .15s cubic-bezier(0.22,1,0.36,1); }
.pr-web-press:hover { transform: scale(0.98); }
.pr-web-press:active { transform: scale(0.96); }
.pr-web-hover:hover { background: #FAFAFB !important; }
.pr-web-row:hover { background: #FAF8FE !important; }
.pr-web-back:hover { background: #F5F5F6; }
.pr-web-seg:hover { color: #241F1B !important; }
.pr-web-link:hover { text-decoration: underline; }
.pr-web-press:focus-visible, .pr-web-hover:focus-visible, .pr-web-row:focus-visible, .pr-web-back:focus-visible, .pr-web-seg:focus-visible, .pr-web-link:focus-visible, .pr-web-focus:focus-visible { outline: 2px solid #AEA1DC; outline-offset: 2px; }
.pr-web-noscroll { scrollbar-width: none; }
.pr-web-noscroll::-webkit-scrollbar { display: none; }
.pr-web-clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
`;

/** The reference's FAM: the type families' main, deep, pill and pin (MO1.2's type colours). */
export interface Fam {
  main: string;
  deep: string;
  pill: string;
  pin: string;
}

const FAM: Record<"purple" | "teal" | "other", Fam> = {
  purple: { main: "#7D6BB5", deep: "#5F5093", pill: "#F0EDF9", pin: "#E7E2F6" },
  teal: { main: "#4F7F78", deep: "#3C6B65", pill: "#E7F2F0", pin: "#E1EEEB" },
  other: { main: "#5B4A9E", deep: "#463A80", pill: "#E9E5F6", pin: "#E9E5F6" },
};

/** A professional's family colours from their subtype (trainer / physio purple, dietitian / doctor teal, others). */
export const famOf = (subtype: DirectoryListing["subtype"] | string | null | undefined): Fam => FAM[typeFamily(subtype)];

/** The caps label (13/20 700, .14em). */
export const prCaps: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" };

/** The 0.5px card border of the reference. */
export const HAIR = "0.5px solid rgba(36,31,27,0.1)";
export const RULE = "1px solid rgba(36,31,27,0.06)";

/** The gold rating pill (#FBF3E2, 1px #D9A441, #9A7424). */
export const GOLD = { bg: "#FBF3E2", border: "#D9A441", ink: "#9A7424", star: "#D9A441" } as const;

/** The primary 44 button (#9A8CD6, r12, 15/24 600) and the secondary (#F0EDF9 / #5F5093). */
export const prPrimary: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: "none",
  background: "#9A8CD6",
  color: "#FFFFFF",
  fontFamily: "inherit",
  fontSize: 15,
  lineHeight: "24px",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
export const prSecondary: React.CSSProperties = { ...prPrimary, background: "#F0EDF9", color: "#5F5093" };

/** The card's rating text: "4.8 · 23 reviews" once three reviews count, else "New" (the live rule). */
export function ratingText(average: number | null, count: number): string {
  const r = ratingLabel(average, count);
  return r.kind === "average" ? `${r.value} · ${reviewCountLabel(r.count)}` : t("New");
}

/** The short rating of a map row: "4.8", else "New". */
export function ratingShort(average: number | null, count: number): string {
  const r = ratingLabel(average, count);
  return r.kind === "average" ? r.value : t("New");
}

const money = (n: number): string => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** The price pill: the monthly rate as "$120/mo", else the session rate as "From $60"; null when neither is set. */
export function pricePill(monthly: number | null | undefined, session: number | null | undefined): string | null {
  if (monthly != null && Number.isFinite(monthly) && monthly > 0) return `${money(monthly)}${t("/mo")}`;
  if (session != null && Number.isFinite(session) && session > 0) return t("From {price}", { price: money(session) });
  return null;
}

/** The work-mode pill (Release B's work_mode): null while unknown or unset. */
export function workModeLabel(mode: "in_person" | "online" | "both" | null | undefined): string | null {
  if (mode === "in_person") return t("In person");
  if (mode === "online") return tx("Online", "session format");
  if (mode === "both") return t("In person and online");
  return null;
}

/** The month and year of a review's date ("Oct 2026"), in the app's language. */
export function monthYear(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(locale, { month: "short", year: "numeric" });
}

/** The web route of a professional, keeping the List / Map choice. */
export const proHref = (id: string, view: "list" | "map" = "list"): string => `/app/professionals/${encodeURIComponent(id)}${view === "map" ? "?view=map" : ""}`;

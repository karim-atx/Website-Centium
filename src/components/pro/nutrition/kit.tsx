import React from "react";
import { AlertCircle, AlertTriangle, ChevronLeft, Plus, Search, X, type LucideIcon } from "lucide-react";
import { textPx } from "../../../theme/textSize";
import { INK, NO_ICON_SCALE } from "../proInk";
import type { DietaryNeeds } from "../../../services/pro/clientPage";
import { allergenLabel, restrictionLabel } from "./nuFormat";
import type { ConflictRow } from "./nutritionModel";

/**
 * Release 3 · W5 the NU screens' shared pieces, literal from the board
 * (source/gen ui.js, r6b.js, r6c.js, r7.js, r10.js):
 * - NuHead (ui.js head19): back 36 (44 hit), eyebrow 10.5 / 600 caps 0.11em
 *   text.faint, title 19 / 700 -0.03em, the right slot;
 * - SearchRow (r6c field + sqBtn6): field 40 r12 soft with a 1px 10% border
 *   (primary when typed), search 15 / 2; square 40 r12;
 * - DietStrip (r7 dietStrip7): r14 surface.raised, 1px 6%, pad 9 10, title
 *   10.5 / 700 caps 0.08em, tags allergy / restriction / preference
 *   (allergyTag7 / restrTag7 / prefTag7), from the client's structured
 *   allergies and dietary_restrictions only;
 * - Flag (r7 flagA7 / flagR7): 10.5, 800 red with the triangle 11 / 2.4, or
 *   700 gold ink with the circle 11 / 2.2, m-left 6;
 * - NuFab (r10 fab10 at FINAL_PLAN's position): 56 round, primary fill, plus
 *   22 / 2, 104 above the bottom and 20 in from the LEFT, with the client
 *   Diary button's shadow and classes (pages/food/Food.tsx).
 */


export const NuHead: React.FC<{ title: string; eyebrow?: string; onBack?: () => void; right?: React.ReactNode }> = ({ title, eyebrow, onBack, right }) => (
  <div className="flex items-start justify-between" style={{ gap: 12, marginBottom: 13 }}>
    <div className="flex items-start min-w-0" style={{ gap: 10 }}>
      {onBack && (
        <button type="button" onClick={onBack} aria-label="Back" className="tap flex items-center justify-center shrink-0 relative before:absolute before:-inset-1 before:content-['']" style={{ width: 36, height: 36, marginInlineStart: -6, marginTop: 2 }}>
          <ChevronLeft size={18} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
        </button>
      )}
      <div className="min-w-0">
        {eyebrow && (
          <p style={{ fontSize: textPx(10.5), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.11em", color: INK.chF, marginBottom: 2, overflowWrap: "anywhere" }}>{eyebrow}</p>
        )}
        <h1 style={{ fontSize: textPx(19), lineHeight: 1.5, fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch, marginTop: onBack && !eyebrow ? 5 : 0, overflowWrap: "anywhere" }}>{title}</h1>
      </div>
    </div>
    {right}
  </div>
);

export const SquareButton: React.FC<{ icon: LucideIcon; label: string; onClick: (el: HTMLElement) => void; on?: boolean; expanded?: boolean }> = ({ icon: Icon, label, onClick, on, expanded }) => (
  <button
    type="button"
    onClick={(e) => onClick(e.currentTarget)}
    aria-label={label}
    aria-expanded={expanded}
    className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-[2px] before:content-['']"
    style={{ width: 40, height: 40, borderRadius: 12, background: on ? INK.prPale : INK.soft, border: `1px solid ${on ? INK.pr : INK.b10}` }}
  >
    <Icon size={16} strokeWidth={1.75} aria-hidden style={{ color: on ? INK.prDeep : INK.chS }} />
  </button>
);

export const SearchField: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean; height?: number; radius?: number }> = ({ value, onChange, placeholder, autoFocus, height = 40, radius = 12 }) => (
  <label className="flex-1 min-w-0 flex items-center" style={{ minHeight: height, borderRadius: radius, background: INK.soft, border: `1px solid ${value ? INK.pr : INK.b10}`, paddingBlock: "0", paddingInline: "12px 4px", gap: 8 }}>
    <Search size={15} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
    <input
      type="search"
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-faint"
      style={{ fontSize: textPx(14), color: INK.ch }}
    />
    {value && (
      <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="tap flex items-center justify-center" style={{ width: 36, height: 36 }}>
        <X size={16} strokeWidth={1.75} aria-hidden style={{ color: INK.chF }} />
      </button>
    )}
  </label>
);

export const AllergyTag: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center whitespace-nowrap" style={{ gap: 4, borderRadius: 8, padding: "4px 8px", fontSize: textPx(11.5), fontWeight: 800, background: INK.hiBg, color: INK.hi }}>
    <AlertTriangle size={12} strokeWidth={2.4} aria-hidden style={NO_ICON_SCALE} />
    {label}
  </span>
);
export const RestrictionTag: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center whitespace-nowrap" style={{ gap: 4, borderRadius: 8, padding: "4px 8px", fontSize: textPx(11.5), fontWeight: 700, background: INK.goldPale, color: INK.goldInk }}>
    <AlertCircle size={12} strokeWidth={2.2} aria-hidden style={NO_ICON_SCALE} />
    {label}
  </span>
);
export const PreferenceTag: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center whitespace-nowrap" style={{ borderRadius: 8, padding: "4px 8px", fontSize: textPx(11.5), fontWeight: 700, background: INK.soft, color: INK.chS }}>
    {label}
  </span>
);

/** One inline flag for a row, from its food_conflicts rows (the worst one). */
export const Flag: React.FC<{ row: ConflictRow | null; onClick?: () => void }> = ({ row, onClick }) => {
  if (!row || row.kind === "allergies_unknown") return null;
  const red = row.kind === "allergy_confirmed";
  const text =
    row.kind === "allergy_confirmed"
      ? `${allergenLabel(row.allergen ?? "")} allergy`
      : row.kind === "allergy_check"
        ? "Check this"
        : row.kind === "restriction"
          ? `Not ${restrictionLabel(row.restriction ?? "").toLowerCase()}`
          : restrictionLabel(row.restriction ?? "");
  const Icon = red ? AlertTriangle : AlertCircle;
  const style: React.CSSProperties = { gap: 3, marginInlineStart: 6, fontSize: textPx(10.5), fontWeight: red ? 800 : 700, color: red ? INK.hi : row.kind === "preference" ? INK.chF : INK.goldInk, whiteSpace: "nowrap" };
  const inner = (
    <>
      {row.kind !== "preference" && <Icon size={11} strokeWidth={red ? 2.4 : 2.2} aria-hidden style={NO_ICON_SCALE} />}
      {text}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="tap inline-flex items-center align-middle relative before:absolute before:-inset-2 before:content-['']" style={style}>
      {inner}
    </button>
  ) : (
    <span className="inline-flex items-center align-middle" style={style}>
      {inner}
    </span>
  );
};

/** NU2 / NU6 "{client_name}'s dietary needs" strip. */
export const DietStrip: React.FC<{ name: string; needs: DietaryNeeds | null; shared: boolean; allergiesShared: boolean; loading: boolean }> = ({ name, needs, shared, allergiesShared, loading }) => {
  const restrictions = (needs?.restrictions ?? []).filter((r) => r.kind !== "preference");
  const prefs = (needs?.restrictions ?? []).filter((r) => r.kind === "preference");
  const allergies = needs?.allergies ?? [];
  const none = !!needs && !allergies.length && !restrictions.length && !prefs.length;
  return (
    <div role="region" aria-label="Dietary needs" style={{ borderRadius: 14, background: INK.raised, border: `1px solid ${INK.b06}`, padding: "9px 10px", marginBottom: 12 }}>
      <p style={{ fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: INK.chF, marginBottom: 6, overflowWrap: "anywhere" }}>{`${name}'s dietary needs`}</p>
      {!shared ? (
        <p style={{ fontSize: textPx(12), color: INK.chS }}>{`${name.split(" ")[0]} hasn't shared allergies or dietary needs with you.`}</p>
      ) : loading ? (
        <div aria-hidden style={{ height: 24, borderRadius: 8, background: INK.soft, width: "60%" }} />
      ) : none ? (
        <p style={{ fontSize: textPx(12), color: INK.chS }}>{`${name.split(" ")[0]} has no allergies or dietary needs recorded.`}</p>
      ) : (
        <div className="flex flex-wrap" style={{ gap: 5 }}>
          {allergies.map((a) => (
            <AllergyTag key={a.allergen} label={`Allergy: ${allergenLabel(a.allergen)}`} />
          ))}
          {restrictions.map((r) => (
            <RestrictionTag key={r.restriction} label={restrictionLabel(r.restriction)} />
          ))}
          {prefs.map((r) => (
            <PreferenceTag key={r.restriction} label={restrictionLabel(r.restriction)} />
          ))}
        </div>
      )}
      {shared && !allergiesShared && !loading && (
        <p style={{ marginTop: 6, fontSize: textPx(11), color: INK.chF }}>Allergies aren't shared, so they can't be checked.</p>
      )}
    </div>
  );
};

/**
 * The "+" of NU (HANDOVER NU round 9 and FINAL_PLAN W5): 56 round, 20 in from
 * the LEFT, 104 up, the same size, style and height as the client Diary
 * button (pages/food/Food.tsx). The NU1 frames draw it bottom right; the
 * plan's bottom left wins (reported).
 */
export const NuFab: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="tap fixed bottom-[calc(env(safe-area-inset-bottom)+104px+var(--active-bar,0px))] start-[calc(var(--app-gutter)+20px)] z-30 w-14 h-14 rounded-full bg-primary-fill text-on-primary-fill shadow-fab dark:shadow-none flex items-center justify-center"
  >
    <Plus size={22} strokeWidth={2} aria-hidden />
  </button>
);

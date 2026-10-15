import { CircleAlert, TriangleAlert } from "lucide-react";
import { textPx } from "../../theme/textSize";
import type { FoodBadge, addNotice } from "../../services/nutrition/clientNutritionModel";

const TONE = {
  red: { bg: "rgb(var(--c-status-high-bg))", ink: "rgb(var(--c-status-high))" },
  amber: { bg: "rgb(var(--c-gold-pale))", ink: "rgb(var(--c-team-gold-ink))" },
  soft: { bg: "rgb(var(--c-cream-soft))", ink: "rgb(var(--c-charcoal-soft))" },
} as const;

/**
 * Release 3 · CU13 diary flag (gen/r23.js meal23): the client's own "Not
 * compatible" badge style (9 / 700 caps, r9999, 2 × 6), coloured by
 * food_conflicts kind: a confirmed allergy red ("Allergy: peanuts", its
 * severity in the label for assistive tech), "Check this" and a restriction
 * amber, a preference soft. A keyword match never gets a severity
 * (clientNutritionModel.badgeFor).
 */
export function FoodConflictBadge({ badge }: { badge: FoodBadge }) {
  const t = TONE[badge.tone];
  return (
    <span
      // The same classes as the client's own "Not compatible" badge (so Larger text treats both alike).
      className="text-[9px] font-bold uppercase rounded-full px-1.5 py-0.5 shrink-0 whitespace-nowrap"
      aria-label={badge.kind === "allergy_confirmed" && badge.severity ? `${badge.text}, ${badge.severity}` : undefined}
      style={{ background: t.bg, color: t.ink }}
    >
      {badge.text}
    </span>
  );
}

/** Add Food: what food_conflicts says about the picked food. Red blocks; amber lets the client add anyway. */
export function FoodConflictNotice({ notice }: { notice: NonNullable<ReturnType<typeof addNotice>> }) {
  const t = TONE[notice.tone];
  const Icon = notice.tone === "red" ? TriangleAlert : CircleAlert;
  return (
    <div role={notice.blocks ? "alert" : "status"} className="flex items-start" style={{ gap: 8, borderRadius: 12, padding: "10px 12px", marginBottom: 10, background: t.bg, color: t.ink }}>
      {notice.tone !== "soft" && <Icon size={14} strokeWidth={notice.tone === "red" ? 2.4 : 2.2} className="shrink-0" style={{ marginTop: 2 }} aria-hidden />}
      <div className="min-w-0">
        <p style={{ margin: 0, fontSize: textPx(13), fontWeight: 800 }}>{notice.title}</p>
        <p style={{ margin: "2px 0 0", fontSize: textPx(12), lineHeight: 1.45, fontWeight: 500 }}>{notice.body}</p>
      </div>
    </div>
  );
}

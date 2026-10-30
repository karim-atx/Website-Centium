import React, { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Lock, Send, ShieldCheck, UtensilsCrossed } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { CtaButton } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { fmtDay, ALLERGEN_LABEL } from "./clientFormat";
import { fetchDietaryNeeds, type DietaryNeeds } from "../../../services/pro/clientPage";
import { dietLabel } from "../../../utils/dietaryRestrictions";
import type { UseClientAccess } from "../../../hooks/useClientAccess";

/**
 * Release 3 · DietaryNeedsCard (CL2 v3, source gen/r7.js dietCard7), on
 * structured data only (decision Safety: allergies from the `allergies`
 * table with their severity, restrictions from `dietary_restrictions`; never
 * keyword guesses).
 *
 * Shared: card, 1px status.high at 22% (dark 28%) with a 3px status.high
 * left edge, r20, pad 12 14; "Dietary needs" 13 / 800 with the utensils 14;
 * the teal "Shared · updated {date}" 10.5 / 700; tags (gap 6, m-top 10):
 * allergy 11.5 / 800 on status.high bg with the triangle, restriction 11.5 /
 * 700 on gold pale with the circle, preference 11.5 / 700 on soft. The full
 * card (Care plan) adds the detail lines 12: allergen in status.high 700 ·
 * severity.
 * Not shared: plain card, the lock, "{name} hasn't shared allergies or
 * dietary needs with you." 12.5 / 1.5 text.soft and "Ask {name} to share"
 * (request_client_access for Allergies and dietary needs).
 *
 * Gate: allergies need Allergies and dietary needs; restrictions read with
 * that or Food diary (phase one of the consent move, DB-3).
 */

const SEVERITY: Record<string, string> = { mild: "Mild", moderate: "Moderate", severe: "Severe" };
const restrictionLabel = dietLabel;

export const DietaryNeedsCard: React.FC<{
  clientId: string;
  firstName: string;
  access: UseClientAccess;
  compact?: boolean;
  onAsk: () => void;
  asked?: boolean;
}> = ({ clientId, firstName, access, compact, onAsk, asked }) => {
  const { authUserId } = useApp();
  const dark = useIsDark();
  const allergiesShared = access.has("allergies_dietary");
  const restrictionsShared = allergiesShared || access.has("food_diary");
  const [needs, setNeeds] = useState<{ data: DietaryNeeds | null; error: boolean } | null>(null);

  useEffect(() => {
    if (!authUserId || !restrictionsShared) return;
    let live = true;
    void fetchDietaryNeeds(clientId, allergiesShared).then((r) => live && setNeeds(r.ok ? { data: r.data, error: false } : { data: null, error: true }));
    return () => {
      live = false;
    };
  }, [authUserId, clientId, allergiesShared, restrictionsShared]);

  const title = (
    <p className="flex items-center" style={{ gap: 6, fontSize: textPx(13), fontWeight: 800, color: INK.ch }}>
      <UtensilsCrossed size={14} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
      Dietary needs
    </p>
  );

  if (access.loading) return null;
  if (!restrictionsShared) {
    return (
      <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "14px 16px", marginBottom: 12 }}>
        <div className="flex items-center justify-between" style={{ gap: 8 }}>
          {title}
          <Lock size={13} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
        </div>
        <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.5, marginTop: 6 }}>{`${firstName} hasn't shared allergies or dietary needs with you.`}</p>
        <div className="flex" style={{ marginTop: 10 }}>
          <CtaButton size="base" variant="secondary" icon={<Send size={15} />} label={asked ? "Asked" : `Ask ${firstName} to share`} disabled={asked} onClick={onAsk} />
        </div>
      </div>
    );
  }

  const d = needs?.data;
  const restrictions = (d?.restrictions ?? []).filter((r) => r.kind !== "preference");
  const prefs = (d?.restrictions ?? []).filter((r) => r.kind === "preference");
  const allergies = d?.allergies ?? [];
  const updated = [...allergies.map((a) => a.updatedAt), ...(d?.restrictions ?? []).map((r) => r.createdAt)].sort().pop() ?? null;
  const none = !!d && !allergies.length && !restrictions.length && !prefs.length;
  const teal = dark ? "#B2D4CF" : "rgb(var(--c-teal-dark))";

  return (
    <div
      role="region"
      aria-label="Dietary needs"
      style={{
        background: INK.card,
        border: `1px solid ${none ? INK.bCard : dark ? "rgba(240,154,142,0.28)" : "rgba(192,57,43,0.22)"}`,
        borderInlineStart: none ? `1px solid ${INK.bCard}` : `3px solid ${INK.hi}`,
        borderRadius: 20,
        padding: "12px 14px",
        marginBottom: 12,
      }}
    >
      <div className="flex items-center justify-between flex-wrap" style={{ gap: 8 }}>
        {title}
        <span className="inline-flex items-center whitespace-nowrap" style={{ gap: 4, fontSize: textPx(10.5), fontWeight: 700, color: teal }}>
          <ShieldCheck size={11} strokeWidth={2} aria-hidden />
          {updated ? `Shared · updated ${fmtDay(updated)}` : "Shared"}
        </span>
      </div>
      {!needs ? (
        <div aria-hidden style={{ height: 26, marginTop: 10, borderRadius: 8, background: INK.soft, width: "60%" }} />
      ) : needs.error ? (
        <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 8 }}>Couldn't load dietary needs.</p>
      ) : none ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chS, marginTop: 6 }}>{`${firstName} has no allergies or dietary needs recorded.`}</p>
      ) : (
        <>
          <div className="flex flex-wrap" style={{ gap: 6, marginTop: 10 }}>
            {allergies.map((a) => (
              <span key={a.allergen} className="inline-flex items-center whitespace-nowrap" style={{ gap: 4, borderRadius: 8, padding: "4px 8px", fontSize: textPx(11.5), fontWeight: 800, background: INK.hiBg, color: INK.hi }}>
                <AlertTriangle size={12} strokeWidth={2.4} aria-hidden />
                {`Allergy: ${ALLERGEN_LABEL[a.allergen] ?? a.allergen}`}
              </span>
            ))}
            {restrictions.map((r) => (
              <span key={r.restriction} className="inline-flex items-center whitespace-nowrap" style={{ gap: 4, borderRadius: 8, padding: "4px 8px", fontSize: textPx(11.5), fontWeight: 700, background: INK.goldPale, color: INK.goldInk }}>
                <AlertCircle size={12} strokeWidth={2.2} aria-hidden />
                {restrictionLabel(r.restriction)}
              </span>
            ))}
            {prefs.map((r) => (
              <span key={r.restriction} className="inline-flex items-center whitespace-nowrap" style={{ borderRadius: 8, padding: "4px 8px", fontSize: textPx(11.5), fontWeight: 700, background: INK.soft, color: INK.chS }}>
                {restrictionLabel(r.restriction)}
              </span>
            ))}
          </div>
          {!compact && allergies.length > 0 && (
            <div className="flex flex-col" style={{ marginTop: 10, borderTop: `1px solid ${INK.b06}`, paddingTop: 8, gap: 4 }}>
              {allergies.map((a) => (
                <p key={a.allergen} style={{ fontSize: textPx(12), color: INK.ch }}>
                  <b style={{ color: INK.hi }}>{ALLERGEN_LABEL[a.allergen] ?? a.allergen}</b>
                  {` · ${SEVERITY[a.severity] ?? a.severity}${a.note ? `, ${a.note}` : ""}`}
                </p>
              ))}
            </div>
          )}
          {!allergiesShared && (
            <p className="flex items-center" style={{ gap: 6, marginTop: 8, fontSize: textPx(11), color: INK.chF }}>
              <Lock size={11} strokeWidth={2} aria-hidden />
              Allergies aren't shared, so only dietary restrictions show.
            </p>
          )}
        </>
      )}
    </div>
  );
};

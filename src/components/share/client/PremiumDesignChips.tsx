import React from "react";
import { Lock } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { marketPalette } from "../../../theme/marketTokens";
import { textPx, linePx } from "../../../theme/textSize";
import { usePremium } from "../../../services/premium/hooks";
import { PREMIUM_DESIGNS, designAccess, type PremiumDesign } from "../../../services/premium/g4";
import { askLocked } from "../../premium/g3/useG3";
import { useG4Available, useShareDesigns } from "../../premium/g4/useG4";
import { PremiumLabel } from "../../premium/PremiumAskHost";
import { PREMIUM_BACKGROUND, PREMIUM_SWATCH, type PremiumBackground } from "./premiumDesigns";
import { t, tx } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G4 · the three Premium share-card designs as more chips in the share
// sheet's Background row (after Centium, the pattern and Your photo, which
// stay free), drawn as those chips are. Only with the Premium switch on and
// member_share_card_designs() listing them: nothing at all while it's off,
// loading, or on a Database without G4. A locked design carries the Premium
// label and opens the prompt instead of being chosen.

const NAME: Record<PremiumDesign, () => string> = {
  bold: () => tx("Bold", "share card design"),
  gradient: () => t("Gradient"),
  premium_badge: () => t("Premium badge"),
};

export const PremiumDesignChips: React.FC<{ background: string; onPick: (bg: PremiumBackground) => void }> = ({ background, onPick }) => {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const g4 = useG4Available();
  const rows = useShareDesigns();
  const { premium } = usePremium();
  if (!g4) return null;
  const shown = PREMIUM_DESIGNS.map((key) => ({ key, access: designAccess(key, { premiumOn: premium?.premiumOn === true, rows }) })).filter((x) => x.access !== "hidden");
  return (
    <>
      {shown.map(({ key, access }) => {
        const bg = PREMIUM_BACKGROUND[key];
        const locked = access === "locked";
        const a = !locked && background === bg;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={a}
            data-g4-design={key}
            onClick={() => (locked ? askLocked("share_designs") : onPick(bg))}
            className="tap inline-flex items-center"
            style={{
              gap: 6,
              borderRadius: 999,
              paddingBlock: "5px",
              paddingInline: "6px 10px",
              fontSize: textPx(11),
              lineHeight: linePx(14),
              fontWeight: a ? 700 : 600,
              border: `1px solid ${a ? m.fill : m.border}`,
              background: a ? m.fill : m.card,
              color: a ? m.onfill : m.ink2,
            }}
          >
            <span aria-hidden style={{ width: 14, height: 14, borderRadius: 999, background: PREMIUM_SWATCH[bg], boxShadow: "0 0 0 1px rgba(36,31,27,0.1)", flex: "none" }} />
            {NAME[key]()}
            {locked && (
              <>
                <Lock size={11} aria-hidden />
                <PremiumLabel />
              </>
            )}
          </button>
        );
      })}
    </>
  );
};

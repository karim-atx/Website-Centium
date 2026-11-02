import { useNavigate } from "react-router-dom";
import { Camera, ChevronRight } from "lucide-react";
import { usePremium } from "../../../services/premium/hooks";
import { useHideNumbers } from "../../../hooks/useHideNumbers";
import { askLocked } from "../../../components/premium/g3/useG3";
import { useG4Available } from "../../../components/premium/g4/useG4";
import { PremiumLabel } from "../../../components/premium/PremiumAskHost";
import { photosVisible } from "../../../services/premium/g4";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G4 · on Workout › Metrics, under Body measurements: the way into the
// member's own progress photos. NOTHING in recovery-sensitive mode (or while
// it is still loading: useHideNumbers is true then), with the switch off, or
// on a Database without G4. A free member sees the Premium label and the
// prompt; with Premium it opens the photos.

export function ProgressPhotosEntry({ className = "" }: { className?: string }) {
  const g4 = useG4Available();
  const hideNumbers = useHideNumbers();
  const { premium } = usePremium();
  const navigate = useNavigate();
  if (!photosVisible({ premiumOn: premium?.premiumOn === true, g4, hideNumbers })) return null;
  const locked = !premium?.premium;
  return (
    <button
      type="button"
      data-g4="progress-photos"
      onClick={() => (locked ? askLocked("progress_photos") : navigate("/app/workout/progress-photos"))}
      className={`tap w-full flex items-center gap-3 rounded-2xl bg-cream-card px-4 py-3 text-start shadow-soft ${className}`}
    >
      <span className="w-9 h-9 rounded-xl bg-primary-pale flex items-center justify-center shrink-0">
        <Camera size={17} aria-hidden className="text-primary-deep-text" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13.5px] font-bold text-charcoal">{t("Progress photos")}</span>
        <span className="block text-[11.5px] text-charcoal-faint">{t("Private to you. Compare two side by side.")}</span>
      </span>
      {locked ? <PremiumLabel className="shrink-0" /> : <ChevronRight size={16} aria-hidden className="shrink-0 text-charcoal-faint rtl:-scale-x-100" />}
    </button>
  );
}

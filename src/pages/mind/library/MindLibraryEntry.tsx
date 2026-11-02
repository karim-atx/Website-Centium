import { useNavigate } from "react-router-dom";
import { ChevronRight, Library } from "lucide-react";
import { useG3Available } from "../../../components/premium/g3/useG3";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G3 · on Meditation: the way into the meditation library. Nothing at
// all while the switch is off or loading, so Meditation's breathing,
// stretching and yoga stay exactly as they are.

export function MindLibraryEntry({ className = "" }: { className?: string }) {
  const on = useG3Available();
  const navigate = useNavigate();
  if (!on) return null;
  return (
    <button
      type="button"
      data-g3="mind-library"
      onClick={() => navigate("/app/mind/library")}
      className={`tap w-full flex items-center gap-3 rounded-2xl bg-cream-card px-4 py-3 text-start shadow-soft ${className}`}
    >
      <span className="w-9 h-9 rounded-xl bg-primary-pale flex items-center justify-center shrink-0">
        <Library size={17} aria-hidden className="text-primary-deep-text" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13.5px] font-bold text-charcoal">{t("Meditation library")}</span>
        <span className="block text-[11.5px] text-charcoal-faint">{t("Guided sessions and breathing")}</span>
      </span>
      <ChevronRight size={16} aria-hidden className="shrink-0 text-charcoal-faint rtl:-scale-x-100" />
    </button>
  );
}

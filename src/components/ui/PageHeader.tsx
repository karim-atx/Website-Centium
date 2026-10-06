import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** A subtitle colour other than the faint grey (MO1.2.1.1: the professional's type colour). */
  subtitleColor?: string;
  right?: React.ReactNode;
  // V4: pages reached from More (Mind/Professionals/Explore) have no other
  // way back except the bottom nav — show an explicit back chevron instead.
  showBack?: boolean;
  // QA 12.0: "The title and button going back to Mind should have the same
  // style as [PageHeader]" — Mind's Habits/Journal are tab-state, not
  // routes, so their back action needs to switch tabs instead of the
  // default browser-history navigate(-1).
  onBack?: () => void;
  // Design refinement §5.4: a 10.5px/600 uppercase line above the title
  // (Home's date, a professional's name) — optional, screen-specific.
  eyebrow?: string;
  // Mobile v5.1 C-02: a Settings sub-page title is 24/700 on a 36 pt line
  // (MO1.8.4 – MO1.8.8: header 350 × 36), one step under the 27/700 of a
  // top-level page. Used only by the Settings sub-pages.
  sub?: boolean;
  // MO1.8 family: the back chevron's 36 pt button sits 6 from the title
  // (header "gap 6px"; the title box measures x 58), not 10. Off by default.
  tightBack?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, subtitleColor, right, showBack, onBack, eyebrow, sub, tightBack }) => {
  const back = useBack();
  const { language, t } = useApp();
  const BackIcon = language === "ar" ? ChevronRight : ChevronLeft;
  return (
    <div className="flex items-start justify-between mb-5 animate-fade-slide-up">
      <div className={`flex items-start ${tightBack ? "gap-1.5" : "gap-2.5"}`}>
        {showBack && (
          // V5 (QA 5.0): plain arrow by default, circular outline only on
          // hover — was always-visible before, inconsistent with the
          // hover-only back buttons already used on Settings/Subscription.
          <button
            onClick={onBack ?? back}
            aria-label={t("Back")}
            // `sub` (Settings sub-pages only): no top nudge, so the chevron
            // sits at the 36 pt title line's centre (MO1.8.4 to MO1.8.8).
            className={`tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-card hover:shadow-soft shrink-0 ${sub ? "" : "mt-0.5"} transition-colors`}
          >
            <BackIcon size={18} />
          </button>
        )}
        <div>
          {eyebrow && (
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-charcoal-faint mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className={`font-display ${sub ? "text-[24px] leading-[1.5]" : "text-[27px]"} font-bold tracking-[-0.022em] text-charcoal`}>{title}</h1>
          {subtitle && (
            <p className={`text-[13px] font-medium mt-1.5 ${subtitleColor ? "" : "text-charcoal-faint"}`} style={subtitleColor ? { color: subtitleColor } : undefined}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right}
    </div>
  );
};

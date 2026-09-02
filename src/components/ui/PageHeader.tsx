import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../../context/AppContext";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
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
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, right, showBack, onBack, eyebrow }) => {
  const navigate = useNavigate();
  const { language, t } = useApp();
  const BackIcon = language === "ar" ? ChevronRight : ChevronLeft;
  return (
    <div className="flex items-start justify-between mb-5 animate-fade-slide-up">
      <div className="flex items-start gap-2.5">
        {showBack && (
          // V5 (QA 5.0): plain arrow by default, circular outline only on
          // hover — was always-visible before, inconsistent with the
          // hover-only back buttons already used on Settings/Subscription.
          <button
            onClick={onBack ?? (() => navigate(-1))}
            aria-label={t("Back")}
            className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-card hover:shadow-soft shrink-0 mt-0.5 transition-colors"
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
          <h1 className="font-display text-[27px] font-bold tracking-[-0.022em] text-charcoal">{title}</h1>
          {subtitle && <p className="text-[13px] font-medium text-charcoal-faint mt-1.5">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
};

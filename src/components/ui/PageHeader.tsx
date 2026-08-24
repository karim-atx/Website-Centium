import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  // V4: pages reached from More (Mind/Professionals/Explore) have no other
  // way back except the bottom nav — show an explicit back chevron instead.
  showBack?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, right, showBack }) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-start justify-between mb-5 animate-fade-slide-up">
      <div className="flex items-start gap-2.5">
        {showBack && (
          // V5 (QA 5.0): plain arrow by default, circular outline only on
          // hover — was always-visible before, inconsistent with the
          // hover-only back buttons already used on Settings/Subscription.
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-card hover:shadow-soft shrink-0 mt-0.5 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-charcoal">{title}</h1>
          {subtitle && <p className="text-charcoal-soft text-sm mt-1">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
};

import React from "react";
import { ChevronLeft } from "lucide-react";

interface OnboardingShellProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export const OnboardingShell: React.FC<OnboardingShellProps> = ({
  title,
  subtitle,
  onBack,
  children,
  footer,
}) => {
  return (
    <div className="flex-1 flex flex-col animate-fade-slide-up">
      {onBack && (
        <button
          onClick={onBack}
          className="tap w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft mb-4"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <h1 className="font-display text-2xl font-semibold text-charcoal mb-2">{title}</h1>
      {subtitle && <p className="text-charcoal-soft text-sm mb-6">{subtitle}</p>}
      <div className="flex-1">{children}</div>
      <div className="mt-8">{footer}</div>
    </div>
  );
};

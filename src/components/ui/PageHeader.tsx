import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, right }) => {
  return (
    <div className="flex items-start justify-between mb-5 animate-fade-slide-up">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-charcoal">{title}</h1>
        {subtitle && <p className="text-charcoal-soft text-sm mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
};

import React from "react";
import clsx from "clsx";

export const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  tone?: "primary" | "teal";
  className?: string;
}> = ({ icon, title, description, tone = "primary", className }) => (
  <div className={clsx("rounded-3xl bg-cream-card p-6 sm:p-7 shadow-soft", className)}>
    <div
      className={clsx(
        "w-11 h-11 rounded-2xl flex items-center justify-center mb-5",
        tone === "primary" ? "bg-primary-pale text-primary-dark" : "bg-teal-pale text-teal-dark"
      )}
    >
      {icon}
    </div>
    <h3 className="font-display font-bold text-charcoal text-lg mb-1.5">{title}</h3>
    <p className="text-sm text-charcoal-soft leading-relaxed">{description}</p>
  </div>
);

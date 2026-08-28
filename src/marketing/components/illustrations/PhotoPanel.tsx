import React from "react";
import clsx from "clsx";

/** Abstract stand-in for real photography (no real photos exist yet outside
 *  the two founder portraits) - soft blurred fields in the brand palette
 *  with a small line icon hinting at the subject, in the same restrained
 *  illustration language as BlobBackdrop. Swap for a real photo crop once
 *  one exists. */
export const PhotoPanel: React.FC<{ icon: React.ReactNode; tone?: "primary" | "teal"; className?: string }> = ({
  icon,
  tone = "primary",
  className,
}) => (
  <div className={clsx("relative overflow-hidden", className)}>
    <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id={`photo-blur-${tone}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="40" />
        </filter>
      </defs>
      <rect width="400" height="300" fill={tone === "primary" ? "#F8F6FD" : "#F3F8F7"} />
      <circle cx="110" cy="90" r="130" fill={tone === "primary" ? "#EAE5F7" : "#DCEEEC"} filter={`url(#photo-blur-${tone})`} />
      <circle cx="320" cy="230" r="150" fill={tone === "primary" ? "#D9CEF2" : "#C7E4E0"} filter={`url(#photo-blur-${tone})`} opacity="0.8" />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center">
      <span className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center", tone === "primary" ? "bg-white/70 text-mkt-accent" : "bg-white/70 text-mkt-teal")}>
        {icon}
      </span>
    </div>
  </div>
);

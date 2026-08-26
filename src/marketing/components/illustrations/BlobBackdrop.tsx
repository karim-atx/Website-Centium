import React from "react";

/** Soft blurred field shapes used behind section content for quiet depth. */
export const BlobBackdrop: React.FC<{ className?: string; flip?: boolean }> = ({ className, flip }) => (
  <svg
    viewBox="0 0 800 600"
    className={`pointer-events-none select-none ${className ?? ""}`}
    aria-hidden="true"
    style={flip ? { transform: "scaleX(-1)" } : undefined}
  >
    <defs>
      <filter id="blob-blur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="60" />
      </filter>
    </defs>
    <circle cx="180" cy="160" r="220" fill="rgb(var(--c-primary-pale))" filter="url(#blob-blur)" />
    <circle cx="620" cy="440" r="240" fill="rgb(var(--c-teal-pale))" filter="url(#blob-blur)" />
  </svg>
);

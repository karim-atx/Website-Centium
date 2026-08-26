import React from "react";

// Abstract composition built around the Centium mark: soft blurred field
// shapes behind it, small "orbiting" bubbles feeding into the ring to
// suggest scattered tools converging into one hub. Colors reference the
// theme CSS variables directly so it adapts with light/dark automatically.
export const HeroIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 560 560"
    fill="none"
    className={className}
    role="img"
    aria-label="Abstract illustration of the Centium mark, a ring drawing scattered elements together"
  >
    <defs>
      <filter id="hero-blur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="38" />
      </filter>
      <linearGradient id="hero-ring-fade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgb(var(--c-primary))" />
        <stop offset="100%" stopColor="rgb(var(--c-primary-dark))" />
      </linearGradient>
    </defs>

    {/* soft field shapes */}
    <circle cx="140" cy="150" r="150" fill="rgb(var(--c-primary-pale))" opacity="0.9" filter="url(#hero-blur)" />
    <circle cx="430" cy="410" r="170" fill="rgb(var(--c-teal-pale))" opacity="0.9" filter="url(#hero-blur)" />

    {/* connector arcs feeding into the ring */}
    <path
      d="M92 140 Q190 200 236 268"
      stroke="rgb(var(--c-primary))"
      strokeWidth="2"
      strokeDasharray="2 8"
      strokeLinecap="round"
      opacity="0.45"
    />
    <path
      d="M486 168 Q400 220 356 274"
      stroke="rgb(var(--c-teal-dark))"
      strokeWidth="2"
      strokeDasharray="2 8"
      strokeLinecap="round"
      opacity="0.45"
    />
    <path
      d="M470 430 Q390 380 352 336"
      stroke="rgb(var(--c-primary))"
      strokeWidth="2"
      strokeDasharray="2 8"
      strokeLinecap="round"
      opacity="0.4"
    />

    {/* orbiting bubbles */}
    <circle cx="92" cy="140" r="15" fill="rgb(var(--c-primary))" opacity="0.75" />
    <circle cx="486" cy="168" r="10" fill="rgb(var(--c-teal))" opacity="0.8" />
    <circle cx="470" cy="430" r="19" fill="rgb(var(--c-primary-light))" opacity="0.65" />
    <circle cx="112" cy="440" r="12" fill="rgb(var(--c-teal-dark))" opacity="0.55" />
    <circle cx="70" cy="330" r="7" fill="rgb(var(--c-primary))" opacity="0.5" />
    <circle cx="500" cy="300" r="6" fill="rgb(var(--c-teal))" opacity="0.6" />

    {/* the mark, centered and enlarged */}
    <g transform="translate(150,150) scale(2.6)">
      <path
        d="M39.06 80.07A32 32 0 1 1 70.58 74.51"
        stroke="url(#hero-ring-fade)"
        strokeWidth="22"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M55.47 65.04 Q73.55 73.78 66.4 95.1 Q55.69 80.28 55.47 65.04 Z" fill="rgb(var(--c-teal))" />
      <path
        d="M55.47 65.04 Q65.09 76.86 66.4 95.1"
        stroke="rgb(var(--c-teal-dark))"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </g>
  </svg>
);

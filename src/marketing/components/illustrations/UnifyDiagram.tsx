import React from "react";
import { Utensils, Dumbbell, HeartPulse, Sparkles, Users } from "lucide-react";
import { CentiumLogo } from "../../../components/ui/CentiumLogo";

const W = 640;
const H = 380;

const tiles: { Icon: React.ElementType; x: number; y: number; rotate: number; tone: "primary" | "teal" }[] = [
  { Icon: Utensils, x: 60, y: 50, rotate: -8, tone: "primary" },
  { Icon: Dumbbell, x: 220, y: 22, rotate: 6, tone: "teal" },
  { Icon: HeartPulse, x: 28, y: 175, rotate: 5, tone: "primary" },
  { Icon: Sparkles, x: 112, y: 285, rotate: -7, tone: "teal" },
  { Icon: Users, x: 262, y: 335, rotate: 8, tone: "primary" },
];

const ring = { x: 520, y: 190 };

const paths = [
  "M60 50 Q300 40 486 172",
  "M220 22 Q380 10 486 158",
  "M28 175 Q280 150 476 190",
  "M112 285 Q320 300 476 222",
  "M262 335 Q400 320 494 240",
];

/** Illustrates the Purpose statement: scattered health tools converging into one hub. */
export const UnifyDiagram: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`relative w-full ${className ?? ""}`} style={{ aspectRatio: `${W} / ${H}` }}>
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" aria-hidden="true">
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={i % 2 === 0 ? "rgb(var(--c-primary))" : "rgb(var(--c-teal-dark))"}
          strokeWidth="2"
          strokeDasharray="2 8"
          strokeLinecap="round"
          opacity="0.4"
        />
      ))}
    </svg>

    {tiles.map(({ Icon, x, y, rotate, tone }, i) => (
      <div
        key={i}
        className="absolute w-12 h-12 rounded-2xl bg-cream-card shadow-soft ring-1 ring-charcoal/5 flex items-center justify-center"
        style={{
          left: `${(x / W) * 100}%`,
          top: `${(y / H) * 100}%`,
          transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        }}
      >
        <Icon size={20} className={tone === "primary" ? "text-primary-dark" : "text-teal-dark"} aria-hidden="true" />
      </div>
    ))}

    <div
      className="absolute w-32 h-32 rounded-[2.5rem] bg-cream-card shadow-lift flex items-center justify-center"
      style={{
        left: `${(ring.x / W) * 100}%`,
        top: `${(ring.y / H) * 100}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <CentiumLogo size={68} />
    </div>
  </div>
);

import React from "react";
import { Dumbbell, ShoppingBag, Stethoscope, Building2 } from "lucide-react";
import { CentiumLogo } from "../../../components/ui/CentiumLogo";

const W = 640;
const H = 380;

const nodes: { Icon: React.ElementType; label: string; x: number; y: number; tone: "primary" | "teal" }[] = [
  { Icon: Dumbbell, label: "Gyms", x: 70, y: 70, tone: "primary" },
  { Icon: ShoppingBag, label: "Stores", x: 60, y: 260, tone: "teal" },
  { Icon: Stethoscope, label: "Professionals", x: 300, y: 30, tone: "teal" },
  { Icon: Building2, label: "Businesses", x: 300, y: 340, tone: "primary" },
];

const hub = { x: 500, y: 190 };

const paths = [
  "M70 70 Q280 60 468 175",
  "M60 260 Q280 260 468 205",
  "M300 30 Q420 40 484 160",
  "M300 340 Q420 320 484 220",
];

/** Illustrates the B2B network: gyms, stores, professionals and businesses linking into one hub. */
export const NetworkDiagram: React.FC<{ className?: string }> = ({ className }) => (
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

    {nodes.map(({ Icon, label, x, y, tone }, i) => (
      <div
        key={i}
        className="absolute flex flex-col items-center gap-1.5"
        style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, transform: "translate(-50%, -50%)" }}
      >
        <div className="w-12 h-12 rounded-2xl bg-cream-card shadow-soft ring-1 ring-charcoal/5 flex items-center justify-center">
          <Icon size={20} className={tone === "primary" ? "text-primary-dark" : "text-teal-dark"} aria-hidden="true" />
        </div>
        <span className="text-[11px] font-medium text-charcoal-soft whitespace-nowrap">{label}</span>
      </div>
    ))}

    <div
      className="absolute w-32 h-32 rounded-[2.5rem] bg-cream-card shadow-lift flex items-center justify-center"
      style={{ left: `${(hub.x / W) * 100}%`, top: `${(hub.y / H) * 100}%`, transform: "translate(-50%, -50%)" }}
    >
      <CentiumLogo size={68} />
    </div>
  </div>
);

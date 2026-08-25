import React, { useState } from "react";
import { Button } from "../../components/ui/Button";
import { CentiumLogo } from "../../components/ui/CentiumLogo";

// V8 (QA 8.0): "an animation that involves the logo when pressing get
// started" — the logo punches forward with a pulsing ring behind it while
// the rest of the screen fades, then the real step transition fires once
// the animation has had time to read.
const LAUNCH_MS = 500;

export const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const [launching, setLaunching] = useState(false);

  const handleGetStarted = () => {
    if (launching) return;
    setLaunching(true);
    setTimeout(onNext, LAUNCH_MS);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-slide-up">
      <div className="relative w-20 h-20 mb-8">
        {launching && (
          <span className="absolute inset-0 rounded-[1.75rem] bg-sohati/40 animate-logo-launch-ring" />
        )}
        <div
          className={`relative w-20 h-20 rounded-[1.75rem] bg-white shadow-lift flex items-center justify-center ${
            launching ? "animate-logo-launch" : ""
          }`}
        >
          <CentiumLogo size={44} />
        </div>
      </div>
      <div className={launching ? "animate-welcome-fade-out" : ""}>
        <h1 className="font-display text-4xl font-semibold text-charcoal leading-tight mb-4">
          Your health.
          <br />
          All in one place.
        </h1>
        <p className="text-charcoal-soft text-base leading-relaxed max-w-xs mb-12">
          Food, fitness, health metrics and everything in between — built around you.
        </p>
        <Button size="lg" fullWidth onClick={handleGetStarted}>
          Get Started
        </Button>
        <p className="text-charcoal-faint text-xs mt-6">
          CENTIUM · a prototype for the Lebanese market
        </p>
      </div>
    </div>
  );
};

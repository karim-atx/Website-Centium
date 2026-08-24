import React from "react";
import { Button } from "../../components/ui/Button";
import { CentiumLogo } from "../../components/ui/CentiumLogo";

export const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-slide-up">
      <div className="w-20 h-20 rounded-[1.75rem] bg-white shadow-lift flex items-center justify-center mb-8">
        <CentiumLogo size={44} />
      </div>
      <h1 className="font-display text-4xl font-semibold text-charcoal leading-tight mb-4">
        Your health.
        <br />
        All in one place.
      </h1>
      <p className="text-charcoal-soft text-base leading-relaxed max-w-xs mb-12">
        Food, fitness, health metrics and everything in between — built around you.
      </p>
      <Button size="lg" fullWidth onClick={onNext}>
        Get Started
      </Button>
      <p className="text-charcoal-faint text-xs mt-6">
        CENTIUM · a prototype for the Lebanese market
      </p>
    </div>
  );
};

import React from "react";
import { AlertTriangle } from "lucide-react";

export const LegalNotice: React.FC = () => (
  <div className="rounded-2xl bg-gold-pale border border-gold/30 px-5 py-4 flex items-start gap-3">
    <AlertTriangle size={18} className="text-gold shrink-0 mt-0.5" />
    <p className="text-sm text-charcoal-soft leading-relaxed">
      This page is a structural placeholder, not a real legal document. It has not been drafted or reviewed by
      a lawyer and must not be relied on or published as-is. Replace this content with counsel-reviewed
      language before this product handles any real user data.
    </p>
  </div>
);

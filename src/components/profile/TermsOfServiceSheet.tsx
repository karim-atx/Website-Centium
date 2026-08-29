import React from "react";
import { BottomSheet } from "../ui/BottomSheet";

// V9 (QA 9.0): "In the general tabs I would like a button for terms and
// services... Should be applicable in the other professional and business
// UI as well" — one shared sheet, reused by Settings.tsx for every account
// type, covering the concepts specific to each (client tracking, professional
// services/certification, business listings/marketplace) in one document.
const sections: { heading: string; body: string }[] = [
  {
    heading: "1. Acceptance of terms",
    body:
      "By creating an account or using Centium, you agree to these Terms of Service. If you do not agree, please do not use the app.",
  },
  {
    heading: "2. Not medical advice",
    body:
      "Centium provides health, fitness and nutrition tracking tools for informational purposes only. Nothing in the app constitutes medical advice, diagnosis or treatment. Always consult a qualified healthcare professional before making changes to your diet, exercise or medication routine.",
  },
  {
    heading: "3. Your data",
    body:
      "Health metrics, biomarkers, workouts, and food logs you enter (or sync from a connected device) are used to power the app's features and, where you explicitly grant access, shared with professionals or businesses you connect with. You can revoke that access at any time from Professionals or Settings.",
  },
  {
    heading: "4. Professional & business listings",
    body:
      "Professionals and businesses on Centium are independent third parties, not Centium employees. Centium verifies submitted certifications on a best-effort basis but does not guarantee the accuracy of any credential, listing, or service. Any hiring, purchase, or membership you complete through the app is an agreement between you and that professional or business.",
  },
  {
    heading: "5. Payments & subscriptions",
    body:
      "Centium Premium, professional hiring fees, gym memberships/classes, and marketplace purchases may recur on the schedule you select. You can review or cancel active plans from Centium Premium, Explore, or the relevant detail screen at any time.",
  },
  {
    heading: "6. Community content",
    body:
      "Content you post to the Forum or share with other users must be respectful, accurate to your own experience, and free of medical claims you're not qualified to make. Centium may remove content that violates these terms.",
  },
  {
    heading: "7. Changes to these terms",
    body:
      "Centium may update these terms as the app evolves. Continued use of the app after an update constitutes acceptance of the revised terms.",
  },
];

export const TermsOfServiceSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <BottomSheet open={open} onClose={onClose} title="Terms of Service">
    <div className="space-y-4 animate-fade-slide-up">
      <p className="text-[11px] text-charcoal-faint">
        Prototype terms for demonstration purposes — not a legally binding document.
      </p>
      {sections.map((s) => (
        <div key={s.heading}>
          <p className="text-sm font-semibold text-charcoal mb-1">{s.heading}</p>
          <p className="text-xs text-charcoal-soft leading-relaxed">{s.body}</p>
        </div>
      ))}
    </div>
  </BottomSheet>
);

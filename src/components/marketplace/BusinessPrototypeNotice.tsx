import React from "react";

/**
 * Tells a business owner that these screens are not wired to anything.
 *
 * WHY THIS EXISTS. Every other prototype surface in this app says so on screen
 * — CartSheet's "Prototype checkout for demo purposes — no payment will be
 * processed", GymDetailSheet's "Prototype payment — no real charge is made",
 * and the three on Subscription. The business account type had nine
 * data-bearing screens saying nothing at all, while offering to edit a public
 * profile, a team, class schedules, pricing and offerings. All of it is
 * usePersistentState: it never leaves the browser. BusinessAnalyticsTab then
 * charts figures derived from that same local state, which is the most
 * convincing of the nine and the least real.
 *
 * That silence is the same class of error this repo has removed three times —
 * confirmHire's fake payment, the "prototype — no real call" modals, the dead
 * Privacy switches. The difference is that those were removed; these screens
 * are wanted, so they are disclosed instead until they are wired.
 *
 * THE WORDING AND THE CLASSES ARE COPIED, NOT INVENTED. Same
 * `text-[11px] text-charcoal-faint text-center`, same "Prototype … — …" shape,
 * so a user who has seen the checkout notice recognises this one. The tables
 * behind these screens all exist (business_profiles, business_employees,
 * business_classes, business_offerings, business_discounts, membership_plans)
 * with RLS and policies already in place — what is missing is only the client
 * wiring, so this notice is temporary by design. Delete it per screen as each
 * one starts reading and writing real rows.
 */
export const BusinessPrototypeNotice: React.FC = () => (
  <p className="text-[11px] text-charcoal-faint text-center mb-4">
    Prototype business tools — changes are saved on this device only.
  </p>
);

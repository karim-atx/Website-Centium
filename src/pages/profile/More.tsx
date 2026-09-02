import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { useApp } from "../../context/AppContext";
import { ReferralSheet } from "../../components/profile/ReferralSheet";
import { PaymentsSheet } from "../../components/profile/PaymentsSheet";
import { Sparkles, Users, Store, User as UserIcon, Crown, ChevronRight, Settings, HeartPulse, MessageCircle, MessageSquare, CalendarDays, Building2, Gift, Banknote } from "lucide-react";

export default function More() {
  const navigate = useNavigate();
  const { user } = useApp();
  const isProfessional = user.accountType === "professional";
  const isBusiness = user.accountType === "business";
  const [referralOpen, setReferralOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);

  // Profile shifted to the top per QA — first widget in the More list.
  // V6 (QA 6.0): Mind and the client-facing "browse professionals" directory
  // don't apply to a professional or business account, so they're removed
  // for those account types; Meal Plans and Health Metrics (their
  // bottom-nav doesn't have room for every tab) are added for professionals.
  // V8 (QA 8.0): Certification moved into My Profile — professionals already
  // reach it from there now, so it's no longer duplicated here.
  // Design refinement §6.7: the six per-item icon-well hues (a colour per
  // row purely for decoration) are gone — every row now sits in one
  // grouped list with a neutral well, matching §5.5. "Centium" stays the
  // one deliberate colour, as a separate upsell row below the list.
  const items = [
    // V9 (QA 9.0): "Business profile and profile should be merged into just
    // business profile" — business accounts no longer get a separate
    // generic "Profile" entry; "Business Profile" below covers it.
    !isBusiness && { icon: UserIcon, label: "Profile", desc: "Your account & settings", to: "/app/profile" },
    !isProfessional && !isBusiness && { icon: Sparkles, label: "Mind", desc: "Habits, journal & meditation", to: "/app/mind" },
    // V9 (QA 9.0): "Copy the calendar tab found in the Professional's UI
    // here in a button found in the More's page" — client-side calendar,
    // syncing events a connected professional/gym adds that involve them.
    !isProfessional && !isBusiness && { icon: CalendarDays, label: "Calendar", desc: "Your events, synced with your professional & gym", to: "/app/calendar" },
    !isProfessional && !isBusiness && { icon: Users, label: "Professionals", desc: "Trainers, dietitians & doctors", to: "/app/professionals" },
    // V9 (QA 9.0): "Make a new button, under professionals in more called
    // forum that acts like a hub for all clients to share information
    // publicly."
    // QA 11.0: renamed from "Forum" — the destination now has two tabs,
    // Forum and Courses.
    !isProfessional && !isBusiness && { icon: MessageSquare, label: "Community", desc: "Forum discussions & fitness courses", to: "/app/forum" },
    isProfessional && { icon: MessageCircle, label: "Messages", desc: "Chat with your clients", to: "/app/professionals/messages" },
    isProfessional && { icon: HeartPulse, label: "Health Metrics", desc: "Client health data & clinical notes", to: "/app/professionals/health-metrics" },
    // QA 12.0: "a button called payments, whereby the professional can add
    // what his monthly rate is to be hired, alongside other types like
    // consultations... payment modality (cash, card or whish)."
    isProfessional && { icon: Banknote, label: "Payments", desc: "Your rates & accepted payment methods", onClick: () => setPaymentsOpen(true) },
    isBusiness && { icon: Building2, label: "Business Profile", desc: "Name, bio, location & reviews", to: "/app/business/profile" },
    // V9 (QA 9.0): "Add the messages tab in the More tab" + "Copy the
    // calendar tab... in a button found in the More's page" — Messages
    // moved out of the bottom nav to make room for Operations there.
    isBusiness && { icon: MessageCircle, label: "Messages", desc: "Chat with clients & affiliated professionals", to: "/app/business/messages" },
    isBusiness && { icon: CalendarDays, label: "Calendar", desc: "Schedule clients to professionals & classes", to: "/app/business/calendar" },
    // V9 (QA 9.0): "Remove the explore button on in the More tab" (Business
    // UI only — Client/Professional keep theirs).
    !isBusiness && { icon: Store, label: "Explore", desc: "Gyms, classes & the marketplace", to: "/app/marketplace" },
    // QA 11.0: "Put a referral tab in the tab you see fits most" (Client
    // UI) + "Apply the same referral program found in the client UI"
    // (Professional/Business) — one sheet, reachable from every account
    // type's More page.
    { icon: Gift, label: "Referral", desc: "Share your code, earn rewards", onClick: () => setReferralOpen(true) },
    { icon: Settings, label: "Settings", desc: "Appearance, notifications & more", to: "/app/settings" },
  ].filter(Boolean) as { icon: typeof Sparkles; label: string; desc: string; to?: string; onClick?: () => void }[];

  return (
    <div>
      <PageHeader title="More" />

      <Card padded={false} className="divide-y divide-charcoal/[0.04] mb-3">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => (item.onClick ? item.onClick() : navigate(item.to!))}
            className="tap w-full flex items-center justify-between gap-3.5 px-4 py-3.5 text-left animate-fade-slide-up"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-cream-soft flex items-center justify-center text-charcoal-soft shrink-0">
                <item.icon size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal">{item.label}</p>
                <p className="text-xs text-charcoal-faint">{item.desc}</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-charcoal-faint shrink-0" />
          </button>
        ))}
      </Card>

      <button
        onClick={() => navigate("/app/subscription")}
        className="tap w-full flex items-center justify-between gap-3.5 rounded-[22px] px-4 py-3.5 text-left"
        // Literal #241F1B — not the theme-reactive `charcoal` token, which in
        // dark mode holds a near-white TEXT value rather than a fill colour
        // and would invert this into the one bright card among dark ones.
        style={{ background: "#241F1B" }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(174,161,220,0.24)" }}
          >
            <Crown size={16} style={{ color: "#C8BFE9" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Centium</p>
            <p className="text-xs text-white/60">Unlock premium features</p>
          </div>
        </div>
        <ChevronRight size={15} className="text-white/60 shrink-0" />
      </button>

      <ReferralSheet open={referralOpen} onClose={() => setReferralOpen(false)} />
      {isProfessional && <PaymentsSheet open={paymentsOpen} onClose={() => setPaymentsOpen(false)} />}
    </div>
  );
}

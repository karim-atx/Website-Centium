import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { useApp } from "../../context/AppContext";
import { Sparkles, Users, Store, User as UserIcon, Crown, ChevronRight, Settings, HeartPulse, MessageCircle, MessageSquare, CalendarDays, Building2 } from "lucide-react";

export default function More() {
  const navigate = useNavigate();
  const { user } = useApp();
  const isProfessional = user.accountType === "professional";
  const isBusiness = user.accountType === "business";

  // Profile shifted to the top per QA — first widget in the More list.
  // V6 (QA 6.0): Mind and the client-facing "browse professionals" directory
  // don't apply to a professional or business account, so they're removed
  // for those account types; Meal Plans and Health Metrics (their
  // bottom-nav doesn't have room for every tab) are added for professionals.
  // V8 (QA 8.0): Certification moved into My Profile — professionals already
  // reach it from there now, so it's no longer duplicated here.
  const items = [
    // V9 (QA 9.0): "Business profile and profile should be merged into just
    // business profile" — business accounts no longer get a separate
    // generic "Profile" entry; "Business Profile" below covers it.
    !isBusiness && { icon: UserIcon, label: "Profile", desc: "Your account & settings", to: "/app/profile", bg: "#EAF4F2", color: "#6F9993" },
    !isProfessional && !isBusiness && { icon: Sparkles, label: "Mind", desc: "Habits, journal & meditation", to: "/app/mind", bg: "#F1E0EB", color: "#9C4F7C" },
    // V9 (QA 9.0): "Copy the calendar tab found in the Professional's UI
    // here in a button found in the More's page" — client-side calendar,
    // syncing events a connected professional/gym adds that involve them.
    !isProfessional && !isBusiness && { icon: CalendarDays, label: "Calendar", desc: "Your events, synced with your professional & gym", to: "/app/calendar", bg: "#DCEAF8", color: "#4C8FD1" },
    !isProfessional && !isBusiness && { icon: Users, label: "Professionals", desc: "Trainers, dietitians & doctors", to: "/app/professionals", bg: "#F0EDF9", color: "#7D6BB5" },
    // V9 (QA 9.0): "Make a new button, under professionals in more called
    // forum that acts like a hub for all clients to share information
    // publicly."
    !isProfessional && !isBusiness && { icon: MessageSquare, label: "Forum", desc: "Share & learn from other clients", to: "/app/forum", bg: "#F1E0EB", color: "#9C4F7C" },
    isProfessional && { icon: MessageCircle, label: "Messages", desc: "Chat with your clients", to: "/app/professionals/messages", bg: "#EAF4F2", color: "#6F9993" },
    isProfessional && { icon: HeartPulse, label: "Health Metrics", desc: "Client health data & clinical notes", to: "/app/professionals/health-metrics", bg: "#F1E0EB", color: "#9C4F7C" },
    isBusiness && { icon: Building2, label: "Business Profile", desc: "Name, bio, location & reviews", to: "/app/business/profile", bg: "#DCEAF8", color: "#4C8FD1" },
    // V9 (QA 9.0): "Add the messages tab in the More tab" + "Copy the
    // calendar tab... in a button found in the More's page" — Messages
    // moved out of the bottom nav to make room for Operations there.
    isBusiness && { icon: MessageCircle, label: "Messages", desc: "Chat with clients & affiliated professionals", to: "/app/business/messages", bg: "#EAF4F2", color: "#6F9993" },
    isBusiness && { icon: CalendarDays, label: "Calendar", desc: "Schedule clients to professionals & classes", to: "/app/business/calendar", bg: "#DCEAF8", color: "#4C8FD1" },
    // V9 (QA 9.0): "Remove the explore button on in the More tab" (Business
    // UI only — Client/Professional keep theirs).
    !isBusiness && { icon: Store, label: "Explore", desc: "Gyms, classes & the marketplace", to: "/app/marketplace", bg: "#F6E9C9", color: "#D9A441" },
    { icon: Settings, label: "Settings", desc: "Appearance, notifications & more", to: "/app/settings", bg: "#DCEAF8", color: "#4C8FD1" },
    { icon: Crown, label: "Centium", desc: "Unlock premium features", to: "/app/subscription", bg: "rgb(var(--c-charcoal))", color: "rgb(var(--c-cream))" },
  ].filter(Boolean) as { icon: typeof Sparkles; label: string; desc: string; to: string; bg: string; color: string }[];

  return (
    <div>
      <PageHeader title="More" />

      <div className="space-y-2.5">
        {items.map((item) => (
          <Card
            key={item.label}
            interactive
            onClick={() => navigate(item.to)}
            className="flex items-center justify-between animate-fade-slide-up"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: item.bg }}>
                <item.icon size={19} style={{ color: item.color }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-charcoal">{item.label}</p>
                <p className="text-xs text-charcoal-faint">{item.desc}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-charcoal-faint" />
          </Card>
        ))}
      </div>
    </div>
  );
}

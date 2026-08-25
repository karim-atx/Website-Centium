import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { useApp } from "../../context/AppContext";
import { Sparkles, Users, Store, User as UserIcon, Crown, ChevronRight, Settings, HeartPulse, MessageCircle, CalendarDays, Building2 } from "lucide-react";

export default function More() {
  const navigate = useNavigate();
  const { user } = useApp();
  const isProfessional = user.accountType === "professional";
  const isBusiness = user.accountType === "business";
  const isGymBusiness = isBusiness && user.businessType === "gym";

  // Profile shifted to the top per QA — first widget in the More list.
  // V6 (QA 6.0): Mind and the client-facing "browse professionals" directory
  // don't apply to a professional or business account, so they're removed
  // for those account types; Meal Plans and Health Metrics (their
  // bottom-nav doesn't have room for every tab) are added for professionals.
  // V8 (QA 8.0): Certification moved into My Profile — professionals already
  // reach it from there now, so it's no longer duplicated here.
  const items = [
    { icon: UserIcon, label: "Profile", desc: "Your account & settings", to: "/profile", bg: "#EAF4F2", color: "#6F9993" },
    !isProfessional && !isBusiness && { icon: Sparkles, label: "Mind", desc: "Habits, journal & meditation", to: "/mind", bg: "#F1E0EB", color: "#9C4F7C" },
    !isProfessional && !isBusiness && { icon: Users, label: "Professionals", desc: "Trainers, dietitians & doctors", to: "/professionals", bg: "#F0EDF9", color: "#7D6BB5" },
    isProfessional && { icon: MessageCircle, label: "Messages", desc: "Chat with your clients", to: "/professionals/messages", bg: "#EAF4F2", color: "#6F9993" },
    isProfessional && { icon: HeartPulse, label: "Health Metrics", desc: "Client health data & clinical notes", to: "/professionals/health-metrics", bg: "#F1E0EB", color: "#9C4F7C" },
    isBusiness && { icon: Building2, label: "Business Profile", desc: "Name, bio, location & reviews", to: "/business/profile", bg: "#DCEAF8", color: "#4C8FD1" },
    isGymBusiness && { icon: Users, label: "Employees", desc: "Affiliate professionals via your business ID", to: "/business/employees", bg: "#F0EDF9", color: "#7D6BB5" },
    isGymBusiness && { icon: CalendarDays, label: "Classes", desc: "Schedule classes for affiliated professionals", to: "/business/classes", bg: "#F1E0EB", color: "#9C4F7C" },
    { icon: Store, label: "Explore", desc: "Gyms, classes & the marketplace", to: "/marketplace", bg: "#F6E9C9", color: "#D9A441" },
    { icon: Settings, label: "Settings", desc: "Appearance, notifications & more", to: "/settings", bg: "#DCEAF8", color: "#4C8FD1" },
    { icon: Crown, label: "Centium", desc: "Unlock premium features", to: "/subscription", bg: "rgb(var(--c-charcoal))", color: "rgb(var(--c-cream))" },
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

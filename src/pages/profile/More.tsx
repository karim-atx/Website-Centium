import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Sparkles, Users, Store, User as UserIcon, Crown, ChevronRight, Settings } from "lucide-react";

export default function More() {
  const navigate = useNavigate();

  // Profile shifted to the top per QA — first widget in the More list.
  const items = [
    { icon: UserIcon, label: "Profile", desc: "Your account & settings", to: "/profile", bg: "#EAF4F2", color: "#6F9993" },
    { icon: Sparkles, label: "Mind", desc: "Habits, journal & meditation", to: "/mind", bg: "#F1E0EB", color: "#9C4F7C" },
    { icon: Users, label: "Professionals", desc: "Trainers, dietitians & doctors", to: "/professionals", bg: "#F0EDF9", color: "#7D6BB5" },
    { icon: Store, label: "Explore", desc: "Gyms, classes & the marketplace", to: "/marketplace", bg: "#F6E9C9", color: "#D9A441" },
    { icon: Settings, label: "Settings", desc: "Appearance, notifications & more", to: "/settings", bg: "#DCEAF8", color: "#4C8FD1" },
    { icon: Crown, label: "Centium", desc: "Unlock premium features", to: "/subscription", bg: "rgb(var(--c-charcoal))", color: "rgb(var(--c-cream))" },
  ];

  return (
    <div>
      <PageHeader title="More" />

      <div className="space-y-2.5">
        {items.map((item) => (
          <Card key={item.label} interactive onClick={() => navigate(item.to)} className="flex items-center justify-between animate-fade-slide-up">
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

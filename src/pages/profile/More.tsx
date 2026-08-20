import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { Sparkles, Users, Store, User as UserIcon, Crown, ChevronRight, Check } from "lucide-react";
import clsx from "clsx";

export default function More() {
  const navigate = useNavigate();
  const { habits, toggleHabit } = useApp();

  const items = [
    { icon: Sparkles, label: "Mind", desc: "Habits, journal & meditation", to: "/mind", bg: "#F1E0EB", color: "#9C4F7C" },
    { icon: Users, label: "Professionals", desc: "Trainers, dietitians & doctors", to: "/professionals", bg: "#DCEFE5", color: "#1B6B52" },
    { icon: Store, label: "Explore", desc: "Gyms, classes & the marketplace", to: "/marketplace", bg: "#F6E9C9", color: "#D9A441" },
    { icon: UserIcon, label: "Profile", desc: "Your account & settings", to: "/profile", bg: "#FCE6DD", color: "#E97452" },
    { icon: Crown, label: "Sohati+", desc: "Unlock premium features", to: "/subscription", bg: "#241F1B", color: "#FBF6EE" },
  ];

  return (
    <div>
      <PageHeader title="More" />

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
        Today's habits
      </p>
      <Card padded={false} className="mb-6 divide-y divide-charcoal/[0.04] animate-fade-slide-up">
        {habits.map((h) => (
          <button
            key={h.id}
            onClick={() => toggleHabit(h.id)}
            className="tap w-full flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span>{h.emoji}</span>
              <span className={clsx("text-sm", h.done ? "text-charcoal-faint line-through" : "text-charcoal font-medium")}>
                {h.label}
              </span>
            </div>
            <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center border-2", h.done ? "bg-sohati border-sohati" : "border-charcoal/15")}>
              {h.done && <Check size={11} className="text-white" strokeWidth={3} />}
            </div>
          </button>
        ))}
      </Card>

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

import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import {
  Target,
  Users,
  HeartPulse,
  Lock,
  Bell,
  Crown,
  Globe,
  HelpCircle,
  ChevronRight,
} from "lucide-react";

const goalLabels: Record<string, string> = {
  lose_weight: "Lose weight",
  build_muscle: "Build muscle",
  get_stronger: "Get stronger",
  improve_nutrition: "Improve nutrition",
  improve_fitness: "Improve fitness",
  improve_health: "Improve overall health",
  track_health: "Track my health",
  live_healthier: "Live healthier",
};

export default function Profile() {
  const { user } = useApp();
  const navigate = useNavigate();

  const sections = [
    { icon: Target, label: "Goals", onClick: undefined },
    { icon: Users, label: "Connected professionals", onClick: () => navigate("/professionals") },
    { icon: HeartPulse, label: "Health data", onClick: () => navigate("/health") },
    { icon: Lock, label: "Privacy", onClick: undefined },
    { icon: Bell, label: "Notifications", onClick: undefined },
    { icon: Crown, label: "Subscription", onClick: () => navigate("/subscription") },
    { icon: Globe, label: "Language", onClick: undefined },
    { icon: HelpCircle, label: "Help", onClick: undefined },
  ];

  return (
    <div>
      <PageHeader title="My Profile" />

      <div className="flex items-center gap-4 mb-6 animate-fade-slide-up">
        <div className="w-16 h-16 rounded-full bg-ember-pale flex items-center justify-center text-2xl font-bold text-ember-dark">
          {user.firstName.charAt(0)}
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-charcoal">{user.firstName}</h2>
          <p className="text-sm text-sohati-dark font-medium">
            {user.goals.map((g) => goalLabels[g]).join(" · ")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="text-center animate-fade-slide-up">
          <p className="text-lg font-bold text-charcoal">{user.weightKg}</p>
          <p className="text-[11px] text-charcoal-faint">kg</p>
        </Card>
        <Card className="text-center animate-fade-slide-up">
          <p className="text-lg font-bold text-charcoal">{user.heightCm}</p>
          <p className="text-[11px] text-charcoal-faint">cm</p>
        </Card>
        <Card className="text-center animate-fade-slide-up">
          <p className="text-lg font-bold text-charcoal">{user.age}</p>
          <p className="text-[11px] text-charcoal-faint">years</p>
        </Card>
      </div>

      <Card padded={false} className="divide-y divide-charcoal/[0.04] animate-fade-slide-up">
        {sections.map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            className="tap w-full flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <s.icon size={17} className="text-charcoal-soft" />
              <span className="text-sm font-medium text-charcoal">{s.label}</span>
            </div>
            <ChevronRight size={16} className="text-charcoal-faint" />
          </button>
        ))}
      </Card>
    </div>
  );
}

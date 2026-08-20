import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { EditableValue } from "../../components/ui/EditableValue";
import { GoalsEditSheet } from "../../components/profile/GoalsEditSheet";
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
  Settings,
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

const accountTypeLabel: Record<string, string> = {
  customer: "Customer",
  professional: "Professional",
  business: "Business",
};

export default function Profile() {
  const { user, updateProfile } = useApp();
  const navigate = useNavigate();
  const [goalsOpen, setGoalsOpen] = useState(false);

  const sections = [
    { icon: Target, label: "Goals", onClick: () => setGoalsOpen(true) },
    { icon: Users, label: "Connected professionals", onClick: () => navigate("/professionals") },
    { icon: HeartPulse, label: "Health data", onClick: () => navigate("/health") },
    { icon: Settings, label: "Settings", onClick: () => navigate("/settings") },
    { icon: Lock, label: "Privacy", onClick: () => navigate("/settings") },
    { icon: Bell, label: "Notifications", onClick: () => navigate("/settings") },
    { icon: Crown, label: "Subscription", onClick: () => navigate("/subscription") },
    { icon: Globe, label: "Language", onClick: () => navigate("/settings") },
    { icon: HelpCircle, label: "Help", onClick: () => navigate("/settings") },
  ];

  return (
    <div>
      <PageHeader title="My Profile" />

      <div className="flex items-center gap-4 mb-2 animate-fade-slide-up">
        <div className="w-16 h-16 rounded-full bg-ember-pale flex items-center justify-center text-2xl font-bold text-ember-dark">
          {user.firstName.charAt(0)}
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-charcoal">{user.firstName}</h2>
          <p className="text-sm text-sohati-dark font-medium">
            {user.goals.map((g) => goalLabels[g]).join(" · ")}
          </p>
          <span className="inline-block text-[10px] font-bold text-charcoal-soft bg-cream-soft rounded-full px-2 py-0.5 mt-1">
            {accountTypeLabel[user.accountType]}
            {user.customerSubtype ? ` · ${user.customerSubtype}` : ""}
            {user.professionalSubtype ? ` · ${user.professionalSubtype}` : ""}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6 mt-4">
        <Card className="text-center animate-fade-slide-up">
          <EditableValue
            value={user.weightKg}
            onSave={(v) => updateProfile({ weightKg: v })}
            className="text-lg font-bold text-charcoal"
          />
          <p className="text-[11px] text-charcoal-faint">kg</p>
        </Card>
        <Card className="text-center animate-fade-slide-up">
          <EditableValue
            value={user.heightCm}
            decimals={0}
            onSave={(v) => updateProfile({ heightCm: v })}
            className="text-lg font-bold text-charcoal"
          />
          <p className="text-[11px] text-charcoal-faint">cm</p>
        </Card>
        <Card className="text-center animate-fade-slide-up">
          <EditableValue
            value={user.age}
            decimals={0}
            onSave={(v) => updateProfile({ age: v })}
            className="text-lg font-bold text-charcoal"
          />
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

      <GoalsEditSheet open={goalsOpen} onClose={() => setGoalsOpen(false)} />
    </div>
  );
}

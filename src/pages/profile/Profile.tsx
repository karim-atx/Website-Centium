import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { EditableValue } from "../../components/ui/EditableValue";
import { GoalsEditSheet } from "../../components/profile/GoalsEditSheet";
import { useApp } from "../../context/AppContext";
import { mockProfessionals } from "../../data/mockProfessionals";
import { professionalTypeIcon } from "../../utils/icons";
import {
  Target,
  HeartPulse,
  Lock,
  Bell,
  Crown,
  Globe,
  HelpCircle,
  ChevronRight,
  Settings,
  LogOut,
} from "lucide-react";

const accountTypeLabel: Record<string, string> = {
  customer: "Customer",
  professional: "Professional",
  business: "Business",
};

export default function Profile() {
  const { user, updateProfile, signOut } = useApp();
  const navigate = useNavigate();
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const handleSignOut = () => {
    if (!confirmSignOut) {
      setConfirmSignOut(true);
      setTimeout(() => setConfirmSignOut(false), 3000);
      return;
    }
    signOut();
    navigate("/onboarding");
  };

  const connectedProfessionals = mockProfessionals.filter((p) => p.connected);

  const sections = [
    { icon: Target, label: "Goals", onClick: () => setGoalsOpen(true) },
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

      {connectedProfessionals.length > 0 && (
        <div className="mb-6 animate-fade-slide-up">
          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">
            Connected professionals
          </p>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {connectedProfessionals.map((p) => {
              const Icon = professionalTypeIcon[p.type];
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/professionals/${p.id}`)}
                  className="tap shrink-0 flex items-center gap-2.5 bg-cream-card rounded-2xl pl-2.5 pr-4 py-2.5 shadow-soft"
                >
                  <span className="w-9 h-9 rounded-full bg-sohati-pale flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-sohati-dark" />
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-charcoal whitespace-nowrap">{p.name}</p>
                    <p className="text-[10px] text-charcoal-faint whitespace-nowrap">{p.specialty}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

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

      <button
        onClick={handleSignOut}
        className="tap w-full flex items-center justify-center gap-2 rounded-2xl border border-ember/30 text-ember-dark text-sm font-semibold py-3.5 mt-5"
      >
        <LogOut size={15} />
        {confirmSignOut ? "Tap again to confirm sign out" : "Sign Out"}
      </button>

      <GoalsEditSheet open={goalsOpen} onClose={() => setGoalsOpen(false)} />
    </div>
  );
}

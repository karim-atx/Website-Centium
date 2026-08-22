import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";
import { AddClientSheet } from "../../components/professionals/AddClientSheet";
import { ClientDetailSheet } from "../../components/professionals/ClientDetailSheet";
import type { ProfessionalClient } from "../../types";
import { ChevronRight, LogOut, Plus, Users } from "lucide-react";
import { PERSON_ICON } from "../../utils/icons";

const specialtyLabel: Record<string, string> = {
  trainer: "Personal Trainer",
  physiotherapist: "Physiotherapist",
  dietitian: "Dietitian",
  other: "Health Professional",
};

export default function ProfessionalDashboard() {
  const { user, professionalClients, signOut } = useApp();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [activeClient, setActiveClient] = useState<ProfessionalClient | null>(null);
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

  return (
    <div>
      <PageHeader
        title="My Clients"
        subtitle={`${specialtyLabel[user.professionalSubtype ?? "other"]} dashboard`}
        right={
          <button
            onClick={() => setAddOpen(true)}
            className="tap w-10 h-10 rounded-full bg-sohati text-white flex items-center justify-center shadow-soft"
          >
            <Plus size={18} />
          </button>
        }
      />

      <Card className="mb-6 bg-gradient-to-br from-sohati to-sohati-dark !text-white animate-fade-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold">{professionalClients.length} active clients</p>
            <p className="text-xs text-white/70">Tap a client to view their shared data</p>
          </div>
        </div>
      </Card>

      <div className="space-y-2.5 mb-6">
        {professionalClients.map((c) => (
          <Card key={c.id} interactive onClick={() => setActiveClient(c)} className="flex items-center justify-between animate-fade-slide-up">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-full bg-sohati-pale flex items-center justify-center shrink-0">
                <PERSON_ICON size={17} className="text-sohati-dark" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-charcoal truncate">{c.name}</p>
                <p className="text-xs text-charcoal-faint">Client since {c.joinedAt}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
          </Card>
        ))}
        {professionalClients.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">No clients yet — add your first one.</p>
          </Card>
        )}
      </div>

      <Button variant="outline" fullWidth onClick={() => setAddOpen(true)} className="mb-6">
        <Plus size={15} /> Add Client
      </Button>

      <button
        onClick={handleSignOut}
        className="tap w-full flex items-center justify-center gap-2 rounded-2xl border border-ember/30 text-ember-dark text-sm font-semibold py-3.5"
      >
        <LogOut size={15} />
        {confirmSignOut ? "Tap again to confirm sign out" : "Sign Out"}
      </button>

      <AddClientSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <ClientDetailSheet
        open={!!activeClient}
        onClose={() => setActiveClient(null)}
        client={activeClient}
        professionalSubtype={user.professionalSubtype}
      />
    </div>
  );
}

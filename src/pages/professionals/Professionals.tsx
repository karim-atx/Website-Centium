import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { Button } from "../../components/ui/Button";
import { mockProfessionals } from "../../data/mockProfessionals";
import { useApp } from "../../context/AppContext";
import type { ProfessionalType } from "../../types";
import { Star, ShieldCheck } from "lucide-react";
import ProfessionalDashboard from "./ProfessionalDashboard";
import { professionalTypeIcon } from "../../utils/icons";

const typeLabels: Record<ProfessionalType, string> = {
  trainer: "Personal Trainers",
  dietitian: "Dietitians",
  physiotherapist: "Physiotherapists",
  doctor: "Doctors / GPs",
};

export default function Professionals() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [type, setType] = useState<ProfessionalType | null>(null);

  const connected = mockProfessionals.find((p) => p.connected);
  const filtered = type ? mockProfessionals.filter((p) => p.type === type) : mockProfessionals;

  // Professionals get an entirely different dashboard here (client roster,
  // not a directory to browse) — separate UI per QA, not just a banner.
  if (user.accountType === "professional") {
    return <ProfessionalDashboard />;
  }

  return (
    <div>
      <PageHeader title="Professionals" subtitle="Trainers, dietitians, physiotherapists & doctors" showBack />

      {connected && (
        <Card
          interactive
          onClick={() => navigate(`/professionals/${connected.id}`)}
          className="mb-6 bg-gradient-to-br from-sohati to-sohati-dark !text-white animate-fade-slide-up"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              {(() => {
                const Icon = professionalTypeIcon[connected.type];
                return <Icon size={22} className="text-white" />;
              })()}
            </span>
            <div>
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">My Dietitian</p>
              <p className="font-display font-semibold text-lg">{connected.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/80">
            <ShieldCheck size={13} /> Client since August 2026
          </div>
        </Card>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-5">
        <Chip active={type === null} onClick={() => setType(null)}>
          All
        </Chip>
        {(Object.keys(typeLabels) as ProfessionalType[]).map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(t)}>
            {typeLabels[t]}
          </Chip>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((p) => (
          <Card key={p.id} className="animate-fade-slide-up">
            <div className="flex items-start gap-3.5 mb-3">
              <span className="w-11 h-11 rounded-full bg-sohati-pale flex items-center justify-center shrink-0">
                {(() => {
                  const Icon = professionalTypeIcon[p.type];
                  return <Icon size={19} className="text-sohati-dark" />;
                })()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-charcoal text-sm">{p.name}</p>
                  <span className="flex items-center gap-1 text-xs font-bold text-gold shrink-0">
                    <Star size={12} className="fill-gold" /> {p.rating}
                  </span>
                </div>
                <p className="text-xs text-sohati-dark font-medium">{p.specialty}</p>
                <p className="text-xs text-charcoal-faint">{p.location} · {p.reviews} reviews</p>
              </div>
            </div>
            <p className="text-xs text-charcoal-soft mb-3.5 leading-relaxed">{p.bio}</p>
            <Button size="sm" fullWidth variant={p.connected ? "secondary" : "primary"} onClick={() => navigate(`/professionals/${p.id}`)}>
              {p.connected ? "View Profile" : "View Profile"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

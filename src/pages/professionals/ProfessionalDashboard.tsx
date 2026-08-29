import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { AddClientSheet } from "../../components/professionals/AddClientSheet";
import { ClientDetailSheet } from "../../components/professionals/ClientDetailSheet";
import type { ProfessionalClient } from "../../types";
import { ChevronRight, Plus, Users, Search } from "lucide-react";
import { PERSON_ICON } from "../../utils/icons";

export default function ProfessionalDashboard() {
  const { user, professionalClients } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [activeClient, setActiveClient] = useState<ProfessionalClient | null>(null);
  // V9 (QA 9.0): "a grey search minimalistic logo that when pressed allows
  // you to search clients"
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleClients = professionalClients.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="My Clients"
        subtitle={user.firstName}
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search clients"
              className="tap w-10 h-10 rounded-full bg-cream-card text-charcoal-soft flex items-center justify-center shadow-soft"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-soft"
            >
              <Plus size={18} />
            </button>
          </div>
        }
      />

      {searchOpen && (
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          className="w-full rounded-2xl bg-cream-soft px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4 animate-fade-slide-up"
        />
      )}

      <Card className="mb-6 bg-gradient-to-br from-primary to-primary-dark !text-white animate-fade-slide-up">
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
        {visibleClients.map((c) => (
          <Card key={c.id} interactive onClick={() => setActiveClient(c)} className="flex items-center justify-between animate-fade-slide-up">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                <PERSON_ICON size={17} className="text-primary-dark" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-charcoal truncate">
                  {c.prefix ? `${c.prefix} ` : ""}
                  {c.name}
                </p>
                <p className="text-xs text-charcoal-faint">Client since {c.joinedAt}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
          </Card>
        ))}
        {visibleClients.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">
              {professionalClients.length === 0 ? "No clients yet — add your first one." : "No clients match your search."}
            </p>
          </Card>
        )}
      </div>

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

import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { AddClientSheet } from "../../components/professionals/AddClientSheet";
import { ClientDetailSheet } from "../../components/professionals/ClientDetailSheet";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { ChevronRight, Plus, Search, HeartPulse, TrendingDown, TrendingUp, Inbox, Check, X, HeartHandshake } from "lucide-react";
import { PERSON_ICON } from "../../utils/icons";
import clsx from "clsx";

const activityLevelLabel: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Lightly active",
  moderate: "Moderately active",
  very_active: "Very active",
  athlete: "Athlete",
};

export default function ProfessionalDashboard() {
  const { user, professionalClients, pendingClientRequests, acceptClientRequest, rejectClientRequest } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  // Holds just the id, not a snapshot of the whole client object — a
  // snapshot would go stale the moment anything about the client (e.g.
  // the recovery-sensitive toggle) changes while the sheet is still open,
  // since updates land in `professionalClients` and never touch a copy
  // held in local state.
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const activeClient = professionalClients.find((c) => c.id === activeClientId) ?? null;
  // QA 12.0: "Between the search and plus logo should be an inbox logo
  // that shows new clients that hire the professional upon successful
  // payment... accept or reject."
  const [inboxOpen, setInboxOpen] = useState(false);
  // V9 (QA 9.0): "a grey search minimalistic logo that when pressed allows
  // you to search clients"
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleClients = professionalClients.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  // Design refinement §6.10: the hero answers "who needs me today" instead
  // of just restating the roster size. `workoutLoggedToday` is a tri-state
  // (true/false/undefined) — trained, didn't train, or no data yet — which
  // maps directly onto the doc's 3-segment roster track.
  const total = professionalClients.length;
  const trained = professionalClients.filter((c) => c.workoutLoggedToday === true).length;
  const notTrained = professionalClients.filter((c) => c.workoutLoggedToday === false).length;
  const noData = total - trained - notTrained;
  const missingClient = professionalClients.find((c) => c.workoutLoggedToday === false);
  const sharedCount = professionalClients.filter((c) => Object.values(c.access).some(Boolean)).length;
  const programCount = professionalClients.filter((c) => c.assignedProgramName).length;

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
              className="tap w-10 h-10 rounded-full bg-cream-card border border-charcoal/[0.11] text-charcoal-soft flex items-center justify-center"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => setInboxOpen(true)}
              aria-label="New client requests"
              className="tap relative w-10 h-10 rounded-full bg-cream-card border border-charcoal/[0.11] text-charcoal-soft flex items-center justify-center"
            >
              <Inbox size={16} />
              {pendingClientRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-status-high text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingClientRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center"
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

      {total > 0 && (
        // Literal #7D6BB5 (not the theme-reactive primary-dark token, which
        // in dark mode holds a light "readable text on dark ground" value
        // rather than a fill colour) — a fixed hero accent, same approach
        // as StreaksBar's gradient.
        <Card className="mb-6 !text-white animate-fade-slide-up" style={{ background: "#7D6BB5" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/70 mb-1.5">
            Today
          </p>
          <p className="text-[44px] font-extrabold leading-none tracking-[-0.03em] tabular-nums mb-1">
            {trained} <span className="text-base font-semibold text-white/70">of {total} trained</span>
          </p>
          <p className="text-xs text-white/80 mb-3.5">
            {missingClient
              ? `${missingClient.prefix ? `${missingClient.prefix} ` : ""}${missingClient.name} hasn't logged a workout today`
              : total === trained
              ? "Everyone has trained today"
              : "No workouts logged yet today"}
          </p>
          <div className="flex h-1.5 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-white" style={{ flex: trained || 0.0001 }} />
            <div className="h-full bg-white/40" style={{ flex: notTrained || 0.0001 }} />
            <div className="h-full bg-white/15" style={{ flex: noData || 0.0001 }} />
          </div>
          <div className="flex items-center gap-4 text-xs text-white/80 pt-3 border-t border-white/15">
            <span>{sharedCount} sharing data</span>
            <span>{programCount} on a program</span>
          </div>
        </Card>
      )}

      <div className="space-y-2.5 mb-6">
        {visibleClients.map((c) => {
          const shared = c.access.healthMetrics;
          return (
            <Card key={c.id} interactive onClick={() => setActiveClientId(c.id)} className="animate-fade-slide-up">
              <div className="flex items-center gap-3 min-w-0 mb-2.5">
                <span className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                  <PERSON_ICON size={17} className="text-primary-dark" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-charcoal truncate">
                      {c.prefix ? `${c.prefix} ` : ""}
                      {c.name}
                    </p>
                    {shared && <HeartPulse size={12} className="text-primary-dark shrink-0" />}
                    {/* QA 12.0: "it should show a small status badge in the
                        professional dashboard for that specific client.
                        The badge should be informative, not diagnostic.
                        Avoid labels such as 'ED patient,' 'high-risk,' or
                        'non-compliant.'" */}
                    {c.recoverySensitive && (
                      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-primary-dark bg-primary-pale rounded-full px-1.5 py-0.5 shrink-0">
                        <HeartHandshake size={9} /> Recovery-sensitive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-charcoal-faint truncate">
                    Client since {c.joinedAt} · {activityLevelLabel[c.activityLevel] ?? c.activityLevel}
                    {c.assignedProgramName ? ` · ${c.assignedProgramName}` : ""}
                  </p>
                </div>
                <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
              </div>
              {/* QA 12.0: "remove from the nutritionist's primary
                  dashboard: Large calorie totals... Weight-loss progress...
                  Red/green compliance colors, punitive missed-log
                  indicators" for a recovery-sensitive client — replaced
                  with a neutral meal-logged/not-yet line, no numbers. */}
              {c.recoverySensitive ? (
                <div className="pt-2.5 border-t border-charcoal/[0.06] text-[11px] text-charcoal-faint">
                  {c.access.foodDiary ? "Meals logged today" : "Not sharing food diary"}
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2.5 border-t border-charcoal/[0.06]">
                  <div className="flex items-center gap-3.5 text-[11px] text-charcoal-faint">
                    <span className="flex items-center gap-1">
                      {c.lastWeightKg}kg
                      {c.weightTrend !== 0 && (
                        <span className={clsx("flex items-center", c.weightTrend <= 0 ? "text-primary-dark" : "text-teal-dark")}>
                          {c.weightTrend <= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                          {Math.abs(c.weightTrend)}kg
                        </span>
                      )}
                    </span>
                    <span>{c.lastCaloriesKcal.toLocaleString()} kcal yesterday</span>
                  </div>
                  <span
                    className={clsx(
                      "text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 shrink-0",
                      c.workoutLoggedToday ? "bg-primary-pale text-primary-deep-text" : "bg-cream-soft text-charcoal-faint"
                    )}
                  >
                    {c.workoutLoggedToday ? "Trained" : "No workout"}
                  </span>
                </div>
              )}
            </Card>
          );
        })}
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
        onClose={() => setActiveClientId(null)}
        client={activeClient}
        professionalSubtype={user.professionalSubtype}
      />

      <BottomSheet open={inboxOpen} onClose={() => setInboxOpen(false)} title="New client requests">
        <div className="space-y-3 animate-fade-slide-up">
          {pendingClientRequests.length === 0 && (
            <p className="text-sm text-charcoal-faint text-center py-6">
              No new requests. Clients who hire you after paying will show up here.
            </p>
          )}
          {pendingClientRequests.map((req) => (
            <Card key={req.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-charcoal">{req.name}</p>
                <p className="text-xs text-charcoal-faint">Hired you · {req.requestedAt}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => rejectClientRequest(req.id)}
                  aria-label={`Reject ${req.name}`}
                  className="tap w-9 h-9 rounded-full bg-cream-soft text-charcoal-faint flex items-center justify-center"
                >
                  <X size={15} />
                </button>
                <button
                  onClick={() => acceptClientRequest(req.id)}
                  aria-label={`Accept ${req.name}`}
                  className="tap w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center"
                >
                  <Check size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

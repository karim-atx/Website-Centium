import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { HeartPulse, ChevronDown, ChevronUp, Scale, Moon, Footprints } from "lucide-react";

// QA 13.0: comorbidities/previous surgeries/medications are no longer
// typed by the professional here — they're synced read-only from what the
// client themselves added in their own Health tab (see `medicalHistory`
// below). Only fields the client doesn't enter stay professional-editable.
const noteFields: { key: "currentInjuries" | "personalityType"; label: string; placeholder: string }[] = [
  { key: "currentInjuries", label: "Current injuries", placeholder: "e.g. lower back strain" },
  { key: "personalityType", label: "Personality type", placeholder: "e.g. motivated by accountability" },
];

// V6 (QA 6.0): tracks every client's health metrics — the auto-synced
// summary already shared from the client's Health page, plus manual fields
// only the professional can add (comorbidities, surgeries, medications,
// injuries, personality type).
export default function HealthMetricsTab() {
  const { professionalClients, clientHealthNotes, updateClientHealthNote } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title="Health Metrics" subtitle="Auto-synced data plus your own clinical notes" showBack />

      <div className="space-y-2.5">
        {professionalClients.map((c) => {
          const expanded = expandedId === c.id;
          const note = clientHealthNotes[c.id] ?? {};
          return (
            <Card key={c.id} padded={false} className="overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : c.id)}
                className="tap w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                    <HeartPulse size={17} className="text-primary-dark" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-charcoal truncate">{c.name}</p>
                    <p className="text-xs text-charcoal-faint">
                      {c.access.healthMetrics ? "Sharing health data" : "Not sharing health data"}
                    </p>
                  </div>
                </div>
                {expanded ? <ChevronUp size={16} className="text-charcoal-faint shrink-0" /> : <ChevronDown size={16} className="text-charcoal-faint shrink-0" />}
              </button>

              {expanded && (
                <div className="border-t border-charcoal/[0.06] px-4 py-4 space-y-4">
                  {c.access.healthMetrics && c.healthSummary ? (
                    <div>
                      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
                        Auto-synced
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-cream-soft rounded-xl py-2.5">
                          <Scale size={13} className="mx-auto mb-1 text-charcoal-soft" />
                          <p className="text-sm font-bold text-charcoal">{c.lastWeightKg}kg</p>
                        </div>
                        <div className="bg-cream-soft rounded-xl py-2.5">
                          <HeartPulse size={13} className="mx-auto mb-1 text-charcoal-soft" />
                          <p className="text-sm font-bold text-charcoal">{c.healthSummary.bodyFatPct}%</p>
                        </div>
                        <div className="bg-cream-soft rounded-xl py-2.5">
                          <Moon size={13} className="mx-auto mb-1 text-charcoal-soft" />
                          <p className="text-sm font-bold text-charcoal">{c.healthSummary.sleepHours}h</p>
                        </div>
                        <div className="bg-cream-soft rounded-xl py-2.5">
                          <Footprints size={13} className="mx-auto mb-1 text-charcoal-soft" />
                          <p className="text-sm font-bold text-charcoal">
                            {Math.round(c.healthSummary.stepsAvg / 1000)}k
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-charcoal-faint">No auto-synced health data shared yet.</p>
                  )}

                  {/* QA 13.0: "Anything added by the client in the health
                      tab from past comorbidities, previous surgeries,
                      medications in the Client UI health tab should also
                      appear here." */}
                  <div>
                    <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
                      Synced from client's Health tab
                    </p>
                    {c.medicalHistory &&
                    (c.medicalHistory.comorbidities.length ||
                      c.medicalHistory.surgeries.length ||
                      c.medicalHistory.medications.length) ? (
                      <div className="space-y-2.5">
                        {c.medicalHistory.comorbidities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {c.medicalHistory.comorbidities.map((cm) => (
                              <span key={cm} className="text-[11px] font-semibold rounded-full px-2.5 py-1 bg-teal-pale text-teal-dark">
                                {cm}
                              </span>
                            ))}
                          </div>
                        )}
                        {c.medicalHistory.surgeries.map((s) => (
                          <div key={s.id} className="rounded-xl px-3 py-2 bg-berry/10 text-berry">
                            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Surgery</p>
                            <p className="text-sm font-medium">
                              {s.name} <span className="text-xs font-normal opacity-80">· {s.date}</span>
                            </p>
                          </div>
                        ))}
                        {c.medicalHistory.medications.map((m) => (
                          <div key={m.id} className="rounded-xl px-3 py-2 bg-primary-pale text-primary-dark">
                            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Medication</p>
                            <p className="text-sm font-medium">
                              {m.name} <span className="text-xs font-normal opacity-80">· {m.dose} · {m.route}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-charcoal-faint">Nothing shared from the client's Health tab yet.</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
                      Clinical notes
                    </p>
                    <div className="space-y-3">
                      {noteFields.map((f) => (
                        <label key={f.key} className="block">
                          <span className="text-xs font-semibold text-charcoal-soft mb-1 block">{f.label}</span>
                          <input
                            value={note[f.key] ?? ""}
                            onChange={(e) => updateClientHealthNote(c.id, { [f.key]: e.target.value })}
                            placeholder={f.placeholder}
                            className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {professionalClients.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-sm text-charcoal-faint">No clients yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

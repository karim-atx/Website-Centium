import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { HealthDisclaimer } from "../../components/ui/HealthDisclaimer";
import { fetchClinicalSources, groupSources, type SourceGroup } from "../../services/sources";

/**
 * Sources and guidelines (/app/health/sources): every source in the
 * database's clinical_sources table, grouped by the feature it informs, each
 * as a link with its organisation and, when known, its publication year.
 *
 * THE SAME FULL LIST FOR EVERYONE: nothing is filtered or hidden by who is
 * signed in, their settings or any mode they have on.
 */
export default function HealthSources() {
  const navigate = useNavigate();
  const [state, setState] = useState<{ kind: "loading" } | { kind: "error" } | { kind: "ready"; groups: SourceGroup[] }>({
    kind: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    void fetchClinicalSources().then((r) => {
      if (!cancelled) setState(r.ok ? { kind: "ready", groups: groupSources(r.sources) } : { kind: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pb-8">
      <PageHeader title="Sources and guidelines" showBack onBack={() => navigate("/app/health")} />
      <HealthDisclaimer className="!text-left mb-4" />

      {state.kind === "loading" && <p className="text-[13px] text-charcoal-faint">Loading…</p>}
      {state.kind === "error" && <p className="text-[13px] text-charcoal-faint">Couldn't load the sources. Please try again.</p>}
      {state.kind === "ready" &&
        state.groups.map((g) => (
          <section key={g.feature} className="mb-5" aria-labelledby={`sources-${g.feature}`}>
            <h2
              id={`sources-${g.feature}`}
              className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-charcoal-soft"
            >
              {g.heading}
            </h2>
            <ul className="rounded-[18px] bg-cream-card border border-charcoal/[0.08] overflow-hidden">
              {g.sources.map((s, i) => (
                <li key={s.key} className={i > 0 ? "border-t border-charcoal/[0.06]" : ""}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tap flex items-start justify-between gap-3 px-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-primary-deep-text leading-[1.4] [overflow-wrap:anywhere]">{s.title}</span>
                      <span className="block mt-0.5 text-[11.5px] text-charcoal-soft">
                        {s.organisation}
                        {s.year !== null && ` · ${s.year}`}
                      </span>
                    </span>
                    <ExternalLink size={14} className="text-charcoal-faint shrink-0 mt-0.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

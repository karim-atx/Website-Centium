import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { HEALTH_DISCLAIMER } from "../../../services/legal/disclaimer";
import { fetchClinicalSources, groupSources, type SourceGroup } from "../../../services/sources";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { t } from "../../../i18n/core";
import { HealthWebBody, HealthWebHeader } from "./HealthWebKit";
import { safeHref } from "../../../utils/safeHref";

// Website viewport v1 · WC-HE.G Sources and guidelines (WC-HE Health Web v5,
// screens "guidelines" and "guidelines-empty"): the disclaimer (15/24
// #5B5349, at most 72ch), then the groups in two columns (one at the rail),
// each a 13/20 700 .14em caps heading over a card of links (title 15/22 600
// #5F5093, organisation and year 13/20 #5B5349, ExternalLink 16). The list
// is the mobile page's (HealthSources.tsx): the same full list for everyone.

export default function HealthSourcesWeb() {
  const { rail } = useWebLayout();
  const [state, setState] = useState<{ kind: "loading" } | { kind: "error" } | { kind: "ready"; groups: SourceGroup[] }>({ kind: "loading" });

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
    <div className="flex flex-col bg-white" style={{ minHeight: "100dvh" }} data-web-page="health-sources">
      <HealthWebHeader title={t("Sources and guidelines")} back />
      <HealthWebBody gap={20}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#5B5349", maxWidth: "72ch" }}>{t(HEALTH_DISCLAIMER)}</p>
        {state.kind === "loading" && <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{t("Loading…")}</p>}
        {state.kind === "error" && (
          <div className="grid place-items-center" style={{ padding: "40px 24px", borderRadius: 20, background: "#F5F5F6" }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{t("Couldn't load the sources. Please try again.")}</p>
          </div>
        )}
        {state.kind === "ready" && (
          <div style={{ columns: rail ? 1 : 2, columnGap: 24 }}>
            {state.groups.map((g) => (
              <section key={g.feature} style={{ breakInside: "avoid", marginBottom: 20 }} aria-labelledby={`sources-${g.feature}`}>
                <h2 id={`sources-${g.feature}`} className="uppercase" style={{ margin: "0 0 8px", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".14em", color: "#5B5349" }}>
                  {t(g.heading)}
                </h2>
                <ul className="overflow-hidden" style={{ margin: 0, padding: 0, listStyle: "none", borderRadius: 18, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)" }}>
                  {g.sources.map((s, i) => (
                    <li key={s.key} style={{ borderTop: i ? "0.5px solid rgba(36,31,27,0.06)" : undefined }}>
                      <a
                        href={safeHref(s.url) ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start justify-between hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                        style={{ gap: 12, padding: "12px 16px", textDecoration: "none" }}
                      >
                        <span className="min-w-0">
                          <span className="block [overflow-wrap:anywhere]" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#5F5093" }}>
                            {s.title}
                          </span>
                          <span className="block" style={{ marginTop: 2, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
                            {s.organisation}
                            {s.year !== null && ` · ${s.year}`}
                          </span>
                        </span>
                        <ExternalLink size={16} className="shrink-0 rtl:-scale-x-100" style={{ marginTop: 3, color: "#71685E" }} aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </HealthWebBody>
    </div>
  );
}

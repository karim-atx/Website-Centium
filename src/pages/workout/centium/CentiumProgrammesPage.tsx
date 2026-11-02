import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { useIsDark } from "../../../hooks/useIsDark";
import { useG3 } from "../../../components/premium/g3/useG3";
import { G3Body, G3Route } from "../../../components/premium/g3/parts";
import { PremiumLabel } from "../../../components/premium/PremiumAskHost";
import { fetchCentiumProgrammes } from "../../../services/premium/g3Calls";
import { textPx } from "../../../theme/textSize";
import { coachColor } from "../coachColors";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G3 · /app/workout/programmes: Centium's ready-made programmes
// (centium_programmes()), each with who it's for, its length and its free
// preview. A free member sees every programme; past the preview it's Premium
// (the label). The route doesn't exist while the switch is off.

export default function CentiumProgrammesPage() {
  return (
    <G3Route fallback="/app/workout">
      <ProgrammesList />
    </G3Route>
  );
}

function ProgrammesList() {
  const dark = useIsDark();
  const navigate = useNavigate();
  const { state, reload } = useG3(fetchCentiumProgrammes, "programmes");
  return (
    <div className="animate-fade-slide-up pb-8">
      <PageHeader title={t("Centium programmes")} subtitle={t("Ready-made programmes from Centium")} showBack />
      <G3Body state={state} onRetry={reload}>
        {(list) => (
          <div className="flex flex-col" style={{ gap: 10 }}>
            {list.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/app/workout/programmes/${encodeURIComponent(p.slug)}`)}
                className="tap w-full text-start bg-cream-card border border-charcoal/[0.08]"
                style={{ borderRadius: 16, padding: "14px 14px 12px" }}
              >
                <span className="flex items-center justify-between" style={{ gap: 8 }}>
                  <span className="min-w-0" style={{ fontSize: textPx(15), fontWeight: 700, color: "rgb(var(--c-charcoal))", overflowWrap: "anywhere" }}>
                    {p.title}
                  </span>
                  <ChevronRight size={16} aria-hidden className="shrink-0 rtl:-scale-x-100" style={{ color: coachColor("faint", dark) }} />
                </span>
                <span className="block" style={{ marginTop: 4, fontSize: textPx(12.5), lineHeight: 1.45, color: "rgb(var(--c-charcoal-soft))" }}>
                  {p.description}
                </span>
                <span className="block" style={{ marginTop: 6, fontSize: textPx(11.5), color: coachColor("faint", dark) }}>
                  {p.lengthText}
                </span>
                <span className="flex items-center flex-wrap" style={{ marginTop: 8, gap: 6 }}>
                  <span style={{ fontSize: textPx(11.5), fontWeight: 700, color: "rgb(var(--c-status-good))" }}>{p.freePreview}</span>
                  {p.locked && <PremiumLabel />}
                </span>
              </button>
            ))}
          </div>
        )}
      </G3Body>
    </div>
  );
}

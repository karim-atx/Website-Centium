import { useG3 } from "../premium/g3/useG3";
import { LockedRow } from "../premium/g3/parts";
import { useG4Available } from "../premium/g4/useG4";
import { fetchCycleInsights } from "../../services/premium/g4Calls";
import { insightsView, phaseName } from "../../services/premium/g4";
import { CapsLabel, CycleCard, type } from "./cycleUi";
import { t } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G4 · at the top of the cycle tracker's Insights tab: the member's
// phase today and what it tends to mean (my_cycle_insights(): phase,
// cycle_day, insights [{title, body}] in the member's language).
//
// - AN EMPTY LIST SHOWS NOTHING AT ALL: no card, no "coming soon". The copy
//   is loaded by the Database after Karim approves it.
// - A free member sees the locked row with the Premium label (the prompt).
// - Nothing while the switch is off, loading, or on a Database without G4.

export function PhaseInsightsCard() {
  const g4 = useG4Available();
  const r = useG3(fetchCycleInsights, "cycle-insights", g4);
  const view = insightsView(r.state);
  if (view.kind === "none") return null;
  if (view.kind === "locked") return <LockedRow feature="cycle_insights" title={t("Phase insights")} className="mb-3" />;
  // note: health wording (Database copy, Karim-approved): the insight titles and bodies below.
  const { phase, cycleDay, insights } = view.value;
  const name = phaseName(phase);
  return (
    <CycleCard style={{ marginTop: 4, marginBottom: 12 }} ariaLabel={t("Phase insights")}>
      <div data-g4="cycle-insights">
        <CapsLabel>{t("Phase insights")}</CapsLabel>
        {(name || cycleDay !== null) && (
          <p className="text-charcoal" style={type(14, 20, 700, { marginTop: 6 })}>
            {name && cycleDay !== null ? t("{phase} · day {n}", { phase: name, n: cycleDay }) : name ?? t("Day {n} of your cycle", { n: cycleDay ?? 0 })}
          </p>
        )}
        <ul className="flex flex-col" style={{ gap: 10, marginTop: 10 }}>
          {insights.map((i, n) => (
            <li key={n}>
              {/* note: health wording (Database copy, Karim-approved) */}
              <p className="text-charcoal" style={type(13, 18, 700)}>
                {i.title}
              </p>
              <p className="text-charcoal-soft" style={type(12.5, 18, 400, { marginTop: 2 })}>
                {i.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </CycleCard>
  );
}

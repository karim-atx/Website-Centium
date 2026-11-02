import { useG3 } from "../premium/g3/useG3";
import { LockedRow } from "../premium/g3/parts";
import { useG4Available } from "../premium/g4/useG4";
import { fetchCycleInsights } from "../../services/premium/g4Calls";
import { insightAreaLabel, insightsView, phaseName } from "../../services/premium/g4";
import { CapsLabel, CycleCard, type } from "./cycleUi";
import { t } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G4 · at the top of the cycle tracker's Insights tab: the member's
// phase today and what it tends to mean (my_cycle_insights(): phase,
// cycle_day, insights [{key, area, title, body}] and the note {key, body};
// the Database's copy, English for now, shown as data).
//
// The display rules (insightsView, G fixes):
// - an empty list and no note (not tracking, insights turned off, pregnant,
//   no copy loaded): NOTHING AT ALL, no card, no "coming soon";
// - only the note (not predictable yet, hormonal contraception, no phase):
//   just the note, for every member, with no Premium label;
// - otherwise the four insights, each labelled with its area (Training,
//   Food, Sleep, Mood), and the note under them;
// - a free member (ATXQ1) sees the locked card with the Premium label (the prompt);
// - nothing while the switch is off (ATXQ0), loading, or on a Database without G4.

export function PhaseInsightsCard() {
  const g4 = useG4Available();
  const r = useG3(fetchCycleInsights, "cycle-insights", g4);
  const view = insightsView(r.state);
  if (view.kind === "none") return null;
  if (view.kind === "locked") return <LockedRow feature="cycle_insights" title={t("Phase insights")} className="mb-3" />;
  if (view.kind === "note") {
    return (
      <CycleCard style={{ marginTop: 4, marginBottom: 12 }} ariaLabel={t("Phase insights")}>
        {/* note: health wording (Database copy, Karim-approved): the note below. */}
        <p data-g4="cycle-insights-note" className="text-charcoal-soft" style={type(12.5, 18, 400)}>
          {view.note.body}
        </p>
      </CycleCard>
    );
  }
  // note: health wording (Database copy, Karim-approved): the insight titles, bodies and the note below.
  const { phase, cycleDay, insights, note } = view.value;
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
          {insights.map((i, n) => {
            const area = insightAreaLabel(i.area);
            return (
              <li key={i.key ?? n} data-g4-area={i.area ?? undefined}>
                {area && (
                  <p className="text-charcoal-faint" style={type(11, 15, 700)}>
                    {area}
                  </p>
                )}
                {/* note: health wording (Database copy, Karim-approved) */}
                <p className="text-charcoal" style={type(13, 18, 700, area ? { marginTop: 2 } : undefined)}>
                  {i.title}
                </p>
                <p className="text-charcoal-soft" style={type(12.5, 18, 400, { marginTop: 2 })}>
                  {i.body}
                </p>
              </li>
            );
          })}
        </ul>
        {/* note: health wording (Database copy, Karim-approved): the note under the insights. */}
        {note && (
          <p data-g4="cycle-insights-note" className="text-charcoal-faint" style={type(12, 17, 400, { marginTop: 12 })}>
            {note.body}
          </p>
        )}
      </div>
    </CycleCard>
  );
}

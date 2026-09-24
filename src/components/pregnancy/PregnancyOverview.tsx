import React from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { PregnancyRing, TrimesterBar, PREGNANCY_COLOR } from "./PregnancyRing";
import { KickCounter } from "./KickCounter";
import { ContractionTimer } from "./ContractionTimer";
import { dueLabel, gestationOn, type Pregnancy } from "../../services/pregnancy";
import * as G from "../../services/pregnancy/guidance";
import { useNavigate } from "react-router-dom";
import { Apple, ChevronRight, Dumbbell, HeartPulse, Plus } from "lucide-react";

// The pregnancy overview, in place of the cycle ring.
//
// THE SAME LOG SHEET, NOT A SECOND ONE. Symptoms and mood in pregnancy are
// logged through the cycle tracker's LogDaySheet, which already writes
// cycle_day_logs — a parallel pregnancy symptom list would split one person's
// symptoms across two tables and two vocabularies.
//
// THE GUIDANCE IS NOT REPEATED HERE. Eating, moving and health each have a
// card in their own tab, and this screen links to them — the same sentences
// rendered twice in two places is exactly how two versions of a clinical fact
// start to exist.
//
// THE COUNTER AND THE TIMER APPEAR WHEN THEY ARE USEFUL, not from week 0. A
// kick counter in the first trimester counts movements that cannot be felt
// yet, and a contraction timer on screen for eight months is a piece of
// furniture rather than a tool. Both weeks live in the guidance module with
// the rest of the numbers a reviewer reads.

const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const PregnancyOverview: React.FC<{
  pregnancy: Pregnancy;
  onLogDay: () => void;
}> = ({ pregnancy, onLogDay }) => {
  const navigate = useNavigate();
  const g = gestationOn(todayISO(), pregnancy);

  if (!g) {
    // The database's own basis check makes this unreachable; if it is ever
    // reached, nothing is shown rather than a gestation counted from an
    // assumption.
    return (
      <Card className="mt-4 text-center py-7">
        <p className="text-[12.5px] text-charcoal-soft">
          This pregnancy has no start date recorded, so there's nothing to count from.
        </p>
      </Card>
    );
  }

  return (
    <div className="mt-4">
      <PregnancyRing
        week={g.week}
        headline={`Week ${g.week}`}
        subline={`Day ${g.day} · trimester ${g.trimester}`}
        footline={dueLabel(g)}
      />

      {/* THE DATING IS WRONG, SAID PLAINLY. Past 42 weeks the number on the
          ring is an arithmetic result, not a fact about a pregnancy. */}
      {g.implausible && (
        <p className="mt-2 text-[11px] leading-relaxed text-center text-status-high font-semibold px-3">
          These dates give a week that doesn't look right. Check the date you entered, or ask your
          provider for the dating from your scan.
        </p>
      )}

      <div className="mt-3.5">
        <TrimesterBar active={g.trimester} />
      </div>

      <div className="mt-4 flex justify-center">
        <Button variant="secondary" size="sm" onClick={onLogDay}>
          <Plus size={13} /> Log today
        </Button>
      </div>

      <div className="mt-4">
        {g.week >= G.KICKS_FROM_WEEK && <KickCounter pregnancyId={pregnancy.id} />}
        {g.week >= G.CONTRACTIONS_FROM_WEEK && <ContractionTimer pregnancyId={pregnancy.id} />}

        <Card className="mb-3">
          <p className="text-[13px] font-bold text-charcoal mb-2">Guidance for week {g.week}</p>
          {(
            [
              [HeartPulse, "Pregnancy health", "/app/health"],
              [Apple, "Eating for pregnancy", "/app/food"],
              [Dumbbell, "Moving in pregnancy", "/app/workout"],
            ] as const
          ).map(([Icon, label, to]) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="tap w-full flex items-center gap-2.5 py-2 text-left"
            >
              <Icon size={15} style={{ color: PREGNANCY_COLOR }} className="shrink-0" />
              <span className="flex-1 text-[12.5px] font-semibold text-charcoal">{label}</span>
              <ChevronRight size={15} className="text-charcoal-faint shrink-0" />
            </button>
          ))}
          <p className="mt-1.5 text-[10px] font-semibold text-charcoal-faint">{G.PROVIDER_FIRST}</p>
        </Card>
      </div>

      <p className="mt-1 text-[10px] leading-[1.45] text-charcoal-faint text-center px-2">
        {G.PROVIDER_FIRST_LONG}
      </p>
    </div>
  );
};

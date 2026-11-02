import React from "react";
import { Card } from "../ui/Card";
import { CapsLabel, CycleCard, type } from "../cycle/cycleUi";
import { PregnancyRing, TrimesterBar, PREGNANCY_COLOR } from "./PregnancyRing";
import { KickCounter } from "./KickCounter";
import { ContractionTimer } from "./ContractionTimer";
import { dueLabel, gestationOn, type Pregnancy } from "../../services/pregnancy";
import * as G from "../../services/pregnancy/guidance";
import { useNavigate } from "react-router-dom";
import { Apple, ChevronRight, Dumbbell, HeartPulse, Plus } from "lucide-react";
import { t, tk } from "../../i18n/core";

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
  /**
   * The cycle page's hero card (HE1.10 #8-#9, K1): the PregnancyRing sits in
   * it at the ring's 160. Unset keeps the ring on the page.
   */
  hero?: (children: React.ReactNode, opts?: { label?: string }) => React.ReactNode;
}> = ({ pregnancy, onLogDay, hero }) => {
  const navigate = useNavigate();
  const g = gestationOn(todayISO(), pregnancy);

  if (!g) {
    // The database's own basis check makes this unreachable; if it is ever
    // reached, nothing is shown rather than a gestation counted from an
    // assumption.
    return (
      <Card className="mt-4 text-center py-7">
        <p className="text-[12.5px] text-charcoal-soft">
          {t("This pregnancy has no start date recorded, so there's nothing to count from.")}
        </p>
      </Card>
    );
  }

  return (
    <div className={hero ? undefined : "mt-4"}>
      {(() => {
        const ring = (
          <PregnancyRing
            week={g.week}
            headline={t("Week {n}", { n: g.week })}
            subline={t("Day {day} · trimester {trimester}", { day: g.day, trimester: g.trimester })}
            footline={dueLabel(g)}
          />
        );
        return hero ? hero(<div className="mx-auto" style={{ width: 160 }}>{ring}</div>, { label: t("Pregnancy") }) : ring;
      })()}

      {/* THE DATING IS WRONG, SAID PLAINLY. Past 42 weeks the number on the
          ring is an arithmetic result, not a fact about a pregnancy. */}
      {g.implausible && (
        <p className="mt-2 text-[11px] leading-relaxed text-center text-status-high font-semibold px-3">
          {t("These dates give a week that doesn't look right. Check the date you entered, or ask your provider for the dating from your scan.")}
        </p>
      )}

      <div className="mt-3.5">
        <TrimesterBar active={g.trimester} />
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={onLogDay}
          className="tap inline-flex items-center bg-th-efecf9 dark:bg-th-303141 text-primary-dark"
          style={{ height: 40, borderRadius: 12, padding: "0 16px", gap: 6, ...type(13, 19.5, 700) }}
        >
          <Plus size={14} aria-hidden /> {t("Log today")}
        </button>
      </div>

      <div className="mt-4">
        {g.week >= G.KICKS_FROM_WEEK && <KickCounter pregnancyId={pregnancy.id} />}
        {g.week >= G.CONTRACTIONS_FROM_WEEK && <ContractionTimer pregnancyId={pregnancy.id} />}

        <CycleCard style={{ marginBottom: 12 }}>
          <CapsLabel style={{ marginBottom: 6 }}>{t("Guidance for week {n}", { n: g.week })}</CapsLabel>
          {(
            [
              [HeartPulse, tk("Pregnancy health"), "/app/health"],
              [Apple, tk("Eating for pregnancy"), "/app/food"],
              [Dumbbell, tk("Moving in pregnancy"), "/app/workout"],
            ] as const
          ).map(([Icon, label, to]) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="tap w-full flex items-center gap-2.5 py-2 text-start"
            >
              <Icon size={15} style={{ color: PREGNANCY_COLOR }} className="shrink-0" />
              <span className="flex-1 text-[12.5px] font-semibold text-charcoal">{t(label)}</span>
              <ChevronRight size={15} className="text-charcoal-faint shrink-0 rtl:-scale-x-100" />
            </button>
          ))}
          <p className="mt-1.5 text-[10px] font-semibold text-charcoal-faint">{t(G.PROVIDER_FIRST)}</p>
        </CycleCard>
      </div>

      <p className="mt-1 text-[10px] leading-[1.45] text-charcoal-faint text-center px-2">
        {G.PROVIDER_FIRST_LONG}
      </p>
    </div>
  );
};

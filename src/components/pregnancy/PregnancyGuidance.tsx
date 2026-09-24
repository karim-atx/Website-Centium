import React, { useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { gestationOn, type Pregnancy } from "../../services/pregnancy";
import {
  expectedGainByWeek,
  gainRangeFor,
  gainSoFar,
  gainVerdict,
} from "../../services/pregnancy/weight";
import * as G from "../../services/pregnancy/guidance";
import { PREGNANCY_COLOR } from "./PregnancyRing";
import { AlertTriangle } from "lucide-react";

// The week-by-week guidance, one card per tab.
//
// EVERY SENTENCE AND EVERY NUMBER COMES FROM services/pregnancy/guidance,
// imported as `G` so a reader can see at a glance that no screen writes its
// own version — the same contract services/cycle/guidance has, and the reason
// a clinical reviewer has one file to read rather than five components.
//
// EVERY CARD CARRIES G.PROVIDER_FIRST. Not as a footnote on the page: on each
// card, because these get read one at a time from three different tabs.

const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const ProviderLine: React.FC = () => (
  <p className="mt-3 text-[10px] leading-[1.45] font-semibold text-charcoal-faint">
    {G.PROVIDER_FIRST}
  </p>
);

const Bullets: React.FC<{ items: readonly string[]; color?: string }> = ({ items, color }) => (
  <ul className="space-y-1">
    {items.map((t) => (
      <li key={t} className="flex gap-2 text-[11.5px] leading-snug text-charcoal-soft">
        <span
          className="mt-[6px] w-1 h-1 rounded-full shrink-0"
          style={{ background: color ?? PREGNANCY_COLOR }}
        />
        <span>{t}</span>
      </li>
    ))}
  </ul>
);

// ---------------------------------------------------------------------------
// Nutrition
// ---------------------------------------------------------------------------

/**
 * The Food tab's pregnancy card.
 *
 * "APPLY TO MY TARGETS" WRITES NOTHING UNTIL IT IS PRESSED, and pressing it
 * again takes the number straight back out. The trimester figure moving from
 * 340 to 450 does NOT silently re-apply: the card offers the new figure and
 * the user presses again, because an app that changes somebody's calorie
 * target because a date passed is prescribing.
 */
export const PregnancyNutritionCard: React.FC<{ pregnancy: Pregnancy }> = ({ pregnancy }) => {
  const { nutritionGoal, setNutritionGoal } = useApp();
  const g = gestationOn(todayISO(), pregnancy);
  if (!g) return null;

  const offered = G.EXTRA_KCAL_BY_TRIMESTER[g.trimester];
  const applied = nutritionGoal.pregnancyKcal ?? 0;
  const matches = applied === offered;

  return (
    <Card className="mb-3">
      <p className="text-[13px] font-bold text-charcoal">Eating for pregnancy</p>
      <p className="mt-0.5 text-[11px] text-charcoal-faint">
        Week {g.week} · trimester {g.trimester}
      </p>

      <p className="mt-2.5 text-[11.5px] leading-relaxed text-charcoal-soft">
        {G.ENERGY_EXPLAINER}
      </p>

      <div className="mt-3 rounded-xl px-3.5 py-3" style={{ background: "rgba(184,115,90,0.10)" }}>
        {offered === 0 ? (
          <p className="text-[11.5px] leading-relaxed text-charcoal">
            {G.APPLY_TARGETS_FIRST_TRIMESTER}
          </p>
        ) : (
          <>
            <p className="text-[15px] font-extrabold text-charcoal tabular-nums">
              +{offered} kcal a day
            </p>
            <p className="mt-1 text-[10.5px] leading-[1.45] text-charcoal-soft">
              {G.APPLY_TARGETS_EXPLAINER}
            </p>
            {applied > 0 && (
              <p className="mt-1.5 text-[11px] font-semibold" style={{ color: PREGNANCY_COLOR }}>
                {G.APPLY_TARGETS_APPLIED(applied)}
              </p>
            )}
            <div className="flex gap-2 mt-2.5">
              {!matches && (
                <Button
                  size="sm"
                  onClick={() => setNutritionGoal({ ...nutritionGoal, pregnancyKcal: offered })}
                >
                  {G.APPLY_TARGETS_CTA}
                </Button>
              )}
              {applied > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setNutritionGoal({ ...nutritionGoal, pregnancyKcal: 0 })}
                >
                  {G.APPLY_TARGETS_UNDO}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <p className="mt-3.5 text-[11px] font-bold text-charcoal mb-1.5">Every day</p>
      <ul className="space-y-1.5">
        {G.NUTRIENTS.map((n) => (
          <li key={n.name} className="flex items-start justify-between gap-3">
            <span className="text-[11.5px] text-charcoal-soft">
              {n.name}
              {n.note && (
                <span className="block text-[10px] leading-snug text-charcoal-faint">{n.note}</span>
              )}
            </span>
            <span className="text-[11.5px] font-bold text-charcoal tabular-nums shrink-0">
              {n.amount}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3.5 text-[11px] font-bold text-charcoal mb-1.5">Limit or avoid</p>
      <Bullets items={G.NUTRITION_LIMITS} />

      <ProviderLine />
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Workout
// ---------------------------------------------------------------------------

export const PregnancyWorkoutCard: React.FC<{ pregnancy: Pregnancy }> = ({ pregnancy }) => {
  const g = gestationOn(todayISO(), pregnancy);
  if (!g) return null;

  return (
    <Card className="mb-3">
      <p className="text-[13px] font-bold text-charcoal">Moving in pregnancy</p>
      <p className="mt-0.5 text-[11px] text-charcoal-faint">
        Week {g.week} · trimester {g.trimester}
      </p>

      <p className="mt-2.5 text-[14px] font-extrabold text-charcoal">{G.EXERCISE_HEADLINE}</p>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-charcoal-soft">{G.TALK_TEST}</p>

      <p className="mt-3.5 text-[11px] font-bold text-charcoal mb-1.5">Good choices</p>
      <Bullets items={G.EXERCISE_GOOD} />

      <p className="mt-3 text-[11px] font-bold text-charcoal mb-1.5">
        If they were already part of your routine
      </p>
      <Bullets items={G.EXERCISE_IF_ALREADY} />
      <p className="mt-1 text-[10.5px] leading-[1.45] text-charcoal-faint">
        {G.EXERCISE_IF_ALREADY_NOTE}
      </p>

      <p className="mt-3 text-[11px] font-bold text-charcoal mb-1.5">Avoid</p>
      <Bullets items={G.EXERCISE_AVOID} />

      <div className="mt-3.5 rounded-xl bg-status-high-bg px-3.5 py-3">
        <p className="text-[11.5px] font-bold text-charcoal mb-1.5">{G.EXERCISE_STOP_TITLE}</p>
        <Bullets items={G.EXERCISE_STOP_SIGNS} color="rgb(var(--c-status-high))" />
      </div>

      <ProviderLine />
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

/**
 * The Health tab's pregnancy card.
 *
 * THE WEIGHT BAND IS DRAWN FROM REAL WEIGH-INS OR NOT AT ALL. It needs a
 * height and a weight logged before the pregnancy started; without either,
 * G.WEIGHT_GAIN_NEEDS_DATA asks for them rather than the card substituting a
 * default body and drawing somebody else's range.
 */
export const PregnancyHealthCard: React.FC<{ pregnancy: Pregnancy }> = ({ pregnancy }) => {
  const { user, weightByDate } = useApp();
  const [signsOpen, setSignsOpen] = useState(false);
  const g = gestationOn(todayISO(), pregnancy);
  if (!g) return null;

  // THE WEIGHT BEFORE THE PREGNANCY, which is the last one logged on or before
  // the LMP — not the earliest on record and not today's. A weigh-in from
  // three years ago is not a pre-pregnancy weight, so the search stops at the
  // LMP and returns nothing if nothing was logged by then.
  const lmp = pregnancy.lmpDate;
  const dates = Object.keys(weightByDate).sort();
  const preDate = lmp ? [...dates].reverse().find((d) => d <= lmp) : undefined;
  const preKg = preDate ? weightByDate[preDate] : null;
  const latestDate = dates[dates.length - 1];
  const latestKg = latestDate ? weightByDate[latestDate] : (user.weightKg ?? null);

  const range = gainRangeFor(user.heightCm ?? null, preKg ?? null);
  const expected = range ? expectedGainByWeek(range, g.week) : null;
  const actual = gainSoFar(preKg ?? null, latestKg);
  const verdict = actual !== null && expected ? gainVerdict(actual, expected) : null;

  return (
    <Card className="mb-3">
      <p className="text-[13px] font-bold text-charcoal">Pregnancy health</p>
      <p className="mt-0.5 text-[11px] text-charcoal-faint">
        Week {g.week} · trimester {g.trimester}
      </p>

      {/* --- weight gain --- */}
      <p className="mt-3 text-[11px] font-bold text-charcoal mb-1.5">Weight gain</p>
      {!range || !expected ? (
        <p className="text-[11.5px] leading-relaxed text-charcoal-soft">
          {G.WEIGHT_GAIN_NEEDS_DATA}
        </p>
      ) : (
        <>
          <p className="text-[11.5px] text-charcoal-soft">
            Pre-pregnancy BMI {range.bmi} ({range.range.label}) · {range.minKg}–{range.maxKg} kg
            recommended in total
          </p>
          <div className="mt-2 rounded-xl bg-cream-soft px-3.5 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[10.5px] text-charcoal-faint">Expected by week {g.week}</span>
              <span className="text-[11.5px] font-bold text-charcoal tabular-nums">
                {expected.minKg}–{expected.maxKg} kg
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-[10.5px] text-charcoal-faint">So far</span>
              {/* A DASH, NOT A ZERO, when there is no current weight — an
                  unlogged weight is not a gain of nothing. */}
              <span className="text-[11.5px] font-bold text-charcoal tabular-nums">
                {actual !== null ? `${actual > 0 ? "+" : ""}${actual} kg` : "—"}
              </span>
            </div>
            {verdict && (
              <p className="mt-1.5 text-[10.5px] text-charcoal-soft">
                {verdict === "within"
                  ? "Within the expected range for this week."
                  : verdict === "below"
                    ? "Below the expected range for this week."
                    : "Above the expected range for this week."}
              </p>
            )}
          </div>
          <p className="mt-1.5 text-[10.5px] leading-[1.45] text-charcoal-faint">
            {G.WEIGHT_GAIN_SINGLETON_NOTE}
          </p>
        </>
      )}

      {/* --- appointments --- */}
      <p className="mt-3.5 text-[11px] font-bold text-charcoal mb-1.5">Coming up</p>
      <Bullets items={[G.GLUCOSE_SCREENING, G.VACCINES]} />

      {/* --- the urgent signs --- */}
      <div className="mt-3.5 rounded-xl bg-status-high-bg px-3.5 py-3">
        <button
          onClick={() => setSignsOpen((v) => !v)}
          aria-expanded={signsOpen}
          className="tap w-full flex items-center gap-2 text-left"
        >
          <AlertTriangle size={14} className="text-status-high shrink-0" />
          <span className="flex-1 text-[11.5px] font-bold text-charcoal">{G.URGENT_TITLE}</span>
          <span className="text-[11px] font-semibold text-charcoal-faint">
            {signsOpen ? "Hide" : "Show"}
          </span>
        </button>
        {signsOpen && (
          <div className="mt-2.5">
            <Bullets items={G.URGENT_SIGNS} color="rgb(var(--c-status-high))" />
            <p className="mt-2 text-[11px] font-bold text-charcoal">{G.URGENT_ACTION}</p>
          </div>
        )}
      </div>

      <ProviderLine />
    </Card>
  );
};

import { useEffect, useState } from "react";
import type React from "react";
import { ChevronRight } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { textPx } from "../../theme/textSize";
import { useOnline } from "../../hooks/useOnline";
import { fetchMyMealPlan, type MyMealPlan } from "../../services/nutrition/client";
import { initials, mealPlanLines, planDay } from "../../services/nutrition/clientNutritionModel";
import { mealLabels } from "../../services/nutrition";
import type { MealType } from "../../types";
import { MusicSection } from "../music/MusicSection";
import { providerHeading } from "../../services/music/whichMusic";

/** The professional's initials in the board's teal avatar (gen/ui.js avatar, tone teal). */
export function ProAvatar({ name, size }: { name: string | null; size: number }) {
  return (
    <span
      aria-hidden
      className="flex items-center justify-center shrink-0 rounded-full"
      style={{ width: size, height: size, background: "rgb(var(--c-teal-pale))", color: "rgb(var(--c-team-teal-ink))", fontSize: textPx(Math.round(size * 0.33)), fontWeight: 800 }}
    >
      {initials(name)}
    </span>
  );
}

const SLOT_ORDER = ["breakfast", "snack", "lunch", "dinner"];

/**
 * Release 3 · CU3 "Meal plan from {pro}" (gen/r23.js goals23, o.plan): under
 * the Plan card, the client's current meal_plan_assignments row and its days
 * from meal_plan_detail. The card is the panel's own card and title; the row
 * is a 28 teal avatar, the name "{plan}, week {n}" 13.5 / 700, the line
 * "Ends {date} · {n} meals on {weekday}" 11 / muted, and ChevronRight 14 / 2,
 * opening the plan's days (read only). Nothing renders without a current
 * plan; a failed read says so with Retry. Recovery-sensitive mode hides the
 * calories in the sheet, as the diary does.
 */
export function MealPlanCard({ userId, today, card, title, hideNumbers }: { userId: string; today: string; card: React.CSSProperties; title: React.CSSProperties; hideNumbers?: boolean }) {
  const online = useOnline();
  const [state, setState] = useState<{ status: "loading" } | { status: "error"; offline: boolean } | { status: "ok"; plan: MyMealPlan | null }>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchMyMealPlan(userId, today).then((r) => {
      if (!live) return;
      setState(r.ok ? { status: "ok", plan: r.data } : { status: "error", offline: r.offline });
    });
    return () => {
      live = false;
    };
  }, [userId, today, tick]);

  if (state.status === "loading" || (state.status === "ok" && !state.plan)) return null;
  if (state.status === "error") {
    return (
      <section style={card} role="alert">
        <div className="flex items-center justify-between" style={{ gap: 10 }}>
          <span style={{ fontSize: textPx(12.5), fontWeight: 600, color: "rgb(var(--c-charcoal-soft))" }}>
            {state.offline || !online ? "You're offline. Your meal plan will load when you reconnect." : "Couldn't load your meal plan."}
          </span>
          <button
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              setTick((t) => t + 1);
            }}
            className="tap relative shrink-0 text-primary-deep-text before:absolute before:-inset-[12px] before:content-['']"
            style={{ fontSize: textPx(11), fontWeight: 700 }}
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  const plan = state.plan!;
  const lines = mealPlanLines(plan, plan.rows, today);
  const who = plan.professionalName || "your professional";
  const d = planDay(plan.startsOn, today, plan.daysCount);
  const days = [...new Set(plan.rows.map((r) => r.dayIndex))].sort((a, b) => a - b);

  return (
    <section style={card}>
      <p style={{ ...title, marginBottom: 10 }}>Meal plan from {who}</p>
      <button type="button" onClick={() => setOpen(true)} className="tap w-full flex items-center text-start" style={{ gap: 10, minHeight: 44 }}>
        <ProAvatar name={plan.professionalName} size={28} />
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>
            {lines.title}
          </span>
          <span className="block" style={{ fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))" }}>
            {lines.sub}
          </span>
        </span>
        <ChevronRight size={14} strokeWidth={2} className="shrink-0 text-charcoal-faint" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={plan.name} size="tall">
        <div className="flex flex-col" style={{ gap: 12 }}>
          {/* Round E: the professional's playlist for the plan, beside the
              member's own cooking favourite when they have one; otherwise
              the favourite or "Play your music". */}
          <MusicSection moment="cooking" provider={{ url: plan.playlistUrl, heading: providerHeading(plan.professionalName) }} />
          {days.length === 0 && (
            <p style={{ margin: 0, fontSize: textPx(13), color: "rgb(var(--c-charcoal-soft))" }}>No meals in this plan yet.</p>
          )}
          {days.map((day) => {
            const rows = plan.rows.filter((r) => r.dayIndex === day);
            const label = rows[0]?.dayLabel || `Day ${day}`;
            const isToday = d.started && d.dayIndex === day;
            const slots = SLOT_ORDER.filter((s) => rows.some((r) => r.slot === s));
            return (
              <div key={day} className="rounded-[14px]" style={{ padding: "11px 14px", background: "rgb(var(--c-cream-soft))" }}>
                <p className="flex items-center" style={{ margin: "0 0 6px", gap: 8, fontSize: textPx(13), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>
                  {label}
                  {isToday && (
                    <span className="rounded-full" style={{ padding: "2px 8px", fontSize: textPx(10), fontWeight: 700, textTransform: "uppercase", background: "rgb(var(--c-primary-pale))", color: "rgb(var(--c-primary-deep-text))" }}>
                      Today
                    </span>
                  )}
                </p>
                {slots.map((s) => (
                  <div key={s} style={{ marginTop: 4 }}>
                    <p style={{ margin: 0, fontSize: textPx(11), fontWeight: 700, color: "rgb(var(--c-charcoal-muted))" }}>{mealLabels[s as MealType] ?? s}</p>
                    {rows
                      .filter((r) => r.slot === s)
                      .sort((a, b) => a.position - b.position)
                      .map((r) => (
                        <p key={`${s}-${r.position}`} className="flex justify-between" style={{ margin: "2px 0 0", gap: 10, fontSize: textPx(12.5), color: "rgb(var(--c-charcoal))" }}>
                          <span className="min-w-0">{r.name}</span>
                          {!hideNumbers && r.calories != null && <span className="shrink-0 tabular-nums" style={{ color: "rgb(var(--c-charcoal-soft))" }}>{Math.round(r.calories)} kcal</span>}
                        </p>
                      ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </BottomSheet>
    </section>
  );
}

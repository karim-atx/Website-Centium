import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, Check, ChevronRight } from "lucide-react";
import { PageHeader } from "../ui/PageHeader";
import { HealthDisclaimer } from "../ui/HealthDisclaimer";
import { PersonalReminderSheet } from "../reminders/PersonalReminderSheet";
import { useApp } from "../../context/AppContext";
import { SCREENING_COPY, bmiOf, screeningLastChecked, screeningRows } from "../../services/health-checks/screening";
import {
  PREGNANCY_CHECKS_COPY,
  PREGNANCY_SCHEDULE,
  pregnancyChecksDone,
  pregnancyComingUp,
} from "../../services/pregnancy/checks";
import { gestationOn } from "../../services/pregnancy/weeks";
import * as PG from "../../services/pregnancy/guidance";
import { localDayOf, todayLocal } from "../../utils/date";

function showDay(day: string): string {
  const d = new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)));
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const card = "rounded-[18px] bg-cream-card border border-charcoal/[0.08]";

/**
 * Health checks for everyone, or the blood tests usually offered in
 * pregnancy while a pregnancy is being tracked (Task Y). Everything here is
 * worked out on the device from the profile, the pregnancy's dates and the
 * user's own results; nothing is stored.
 *
 * NEVER MENTIONS OR REVEALS the other plan this screen can show: nothing here
 * reads or names that setting.
 */
export function GeneralPlan() {
  const navigate = useNavigate();
  const { user, bloodMarkers, bloodPressure, pregnancy, recoverySensitive, recoveryModePending } = useApp();
  const [reminderOpen, setReminderOpen] = useState(false);
  const latestBpDay = bloodPressure[0] ? localDayOf(bloodPressure[0].recordedAt) : null;
  const gestation = pregnancy ? gestationOn(todayLocal(), pregnancy) : null;
  // Not known yet counts as on: nothing body-size related may show by mistake.
  const recovery = recoverySensitive || recoveryModePending;

  const reminderLink = (
    <button
      onClick={() => setReminderOpen(true)}
      className={`tap w-full flex items-center justify-between px-4 py-3.5 mb-4 text-left ${card}`}
    >
      <span className="flex items-center gap-2.5 text-[13px] font-semibold text-charcoal">
        <Bell size={16} className="text-primary-dark" />
        Set a personal reminder
      </span>
      <ChevronRight size={16} className="text-charcoal-faint" />
    </button>
  );

  if (pregnancy && gestation && !gestation.implausible) {
    const done = pregnancyChecksDone(bloodMarkers, pregnancy);
    const next = pregnancyComingUp(gestation.week, done);
    return (
      <div className="pb-8">
        <PageHeader title={PREGNANCY_CHECKS_COPY.heading} showBack onBack={() => navigate("/app/health")} />
        <p className="text-[12.5px] leading-[1.5] text-charcoal-soft mb-1">{PREGNANCY_CHECKS_COPY.intro}</p>
        <p className="text-[11px] text-charcoal-soft mb-4">{PG.PROVIDER_FIRST}</p>

        {next && (
          <div className={`px-4 py-3.5 mb-4 ${card}`}>
            <p className="text-[11px] font-bold uppercase tracking-[.12em] text-charcoal-soft">Coming up</p>
            <p className="mt-1 text-[13px] font-semibold text-charcoal">
              {PREGNANCY_CHECKS_COPY.comingUp(next.weekLabel, next.short)}
            </p>
          </div>
        )}

        <section className={`mb-2 overflow-hidden ${card}`}>
          {PREGNANCY_SCHEDULE.map((c, i) => (
            <div key={c.id} className={`px-4 py-3 ${i > 0 ? "border-t border-charcoal/[0.06]" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-bold text-charcoal min-w-0">{c.when}</p>
                {done.has(c.id) && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#1D6355] dark:text-[#86D3C2] whitespace-nowrap">
                    <Check size={13} aria-hidden /> {PREGNANCY_CHECKS_COPY.done}
                  </span>
                )}
                {c.id === "every" && (
                  <span className="text-[11px] text-charcoal-soft whitespace-nowrap tabular-nums">
                    {latestBpDay ? SCREENING_COPY.lastChecked(showDay(latestBpDay)) : SCREENING_COPY.notYet}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11.5px] leading-[1.45] text-charcoal-soft">
                {recovery && c.whatRecoverySensitive ? c.whatRecoverySensitive : c.what}
              </p>
            </div>
          ))}
        </section>
        <p className="text-[11px] text-charcoal-soft mb-4">{PREGNANCY_CHECKS_COPY.contacts}</p>

        {/* The pregnancy warning signs stay on screen beside the schedule and
            the flags: pre-eclampsia can show symptoms before a reading does. */}
        <div className="rounded-[18px] bg-status-high-bg px-4 py-3.5 mb-4">
          <p className="flex items-center gap-2 text-[12px] font-bold text-charcoal">
            <AlertTriangle size={14} className="text-status-high shrink-0" />
            {PG.URGENT_TITLE}
          </p>
          <ul className="mt-2 space-y-1 list-disc pl-5 text-[11.5px] leading-[1.45] text-charcoal-soft">
            {PG.URGENT_SIGNS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] font-bold text-charcoal">{PG.URGENT_ACTION}</p>
        </div>

        {reminderLink}
        <HealthDisclaimer className="mt-2" />
        <PersonalReminderSheet open={reminderOpen} onClose={() => setReminderOpen(false)} />
      </div>
    );
  }

  const rows = screeningRows({
    age: user.age,
    sex: user.sex,
    bmi: bmiOf(user.heightCm, user.weightKg),
    recoverySensitive: recovery,
  });

  return (
    <div className="pb-8">
      <PageHeader title={SCREENING_COPY.heading} showBack onBack={() => navigate("/app/health")} />
      <p className="text-[12.5px] leading-[1.5] text-charcoal-soft mb-4">{SCREENING_COPY.intro}</p>

      {rows.length > 0 && (
        <section className={`mb-4 overflow-hidden ${card}`}>
          {rows.map((r, i) => {
            const last = screeningLastChecked(r, { latestBpDay, markers: bloodMarkers });
            return (
              <div key={r.id} className={`px-4 py-3 ${i > 0 ? "border-t border-charcoal/[0.06]" : ""}`}>
                <p className="text-[13px] leading-[1.4] text-charcoal">
                  <span className="font-bold">{r.title}</span>
                  <span className="text-charcoal-soft"> · {r.frequency}</span>
                </p>
                <p className="mt-0.5 text-[11.5px] leading-[1.45] text-charcoal-soft">{r.who}</p>
                {last !== undefined && (
                  <p className="mt-0.5 text-[11px] text-charcoal-soft tabular-nums">
                    {last ? SCREENING_COPY.lastChecked(showDay(last)) : SCREENING_COPY.notYet}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {reminderLink}
      <HealthDisclaimer className="mt-2" />
      <PersonalReminderSheet open={reminderOpen} onClose={() => setReminderOpen(false)} />
    </div>
  );
}

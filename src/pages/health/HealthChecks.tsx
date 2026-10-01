import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Bell, ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { Button } from "../../components/ui/Button";
import { WarningSignsCard } from "../../components/health-checks/WarningSignsCard";
import { CheckInSheet } from "../../components/health-checks/CheckInSheet";
import { PersonalReminderSheet } from "../../components/reminders/PersonalReminderSheet";
import { useApp } from "../../context/AppContext";
import { useHealthChecks } from "../../context/healthChecksStore";
import { COPY, PHASES, type Phase } from "../../services/health-checks/guidance";
import { checkInDue, lastChecked, planRowsFor } from "../../services/health-checks/plan";
import { localDayOf, todayLocal } from "../../utils/date";

const WARNING_ID = "warning-signs";

function showDay(day: string | null): string {
  if (!day) return "Not yet";
  const d = new Date(Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)));
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/**
 * The monitoring plan. A NEUTRAL ROUTE (/app/health/checks) with a neutral
 * title: nothing in the URL, the tab or the page heading says what the mode
 * is for. Shown only while the mode is available and on; otherwise it sends
 * the user back to Health without saying why.
 */
export default function HealthChecks() {
  const navigate = useNavigate();
  const { user, bloodMarkers, bloodPressure, myTimezone } = useApp();
  const checks = useHealthChecks();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const { refresh } = checks;

  // Read the setting fresh on every visit.
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!checks.available || checks.on === false) return <Navigate to="/app/health" replace />;
  if (checks.on === null) {
    return (
      <div className="pb-8">
        <PageHeader title={COPY.planTitle} showBack onBack={() => navigate("/app/health")} />
        <p className="text-[13px] text-charcoal-faint">Loading…</p>
      </div>
    );
  }

  const today = todayLocal();
  const lastCheckIn = checks.checkIns[checks.checkIns.length - 1]?.date ?? null;
  const latestBpDay = bloodPressure[0] ? localDayOf(bloodPressure[0].recordedAt) : null;
  const rows = planRowsFor(checks.phase, user.sex);
  const due = checkInDue(lastCheckIn, checks.phase, checks.stoppedOn, today);
  const young = typeof user.age === "number" && user.age >= 18 && user.age <= 20;

  const showWarningSigns = () =>
    document.getElementById(WARNING_ID)?.scrollIntoView({ block: "start" });

  return (
    <div className="pb-8">
      <PageHeader title={COPY.planTitle} showBack onBack={() => navigate("/app/health")} />

      {(young || user.sex === "female") && (
        <div className="space-y-2 mb-4">
          {young && <p className="rounded-xl bg-primary-pale px-3.5 py-3 text-[12px] leading-[1.5] text-charcoal">{COPY.cautionYoung}</p>}
          {user.sex === "female" && (
            <p className="rounded-xl bg-primary-pale px-3.5 py-3 text-[12px] leading-[1.5] text-charcoal">{COPY.cautionWomen}</p>
          )}
        </div>
      )}

      <SegmentedTabs
        className="mb-2"
        items={PHASES.map((p) => ({ key: p.value, label: p.label }))}
        activeKey={checks.phase ?? ""}
        onChange={(k) => checks.setPhase(k as Phase)}
      />
      <p className="text-[11px] text-charcoal-faint mb-4">Kept on this device only.</p>

      {due && (
        <div className="rounded-[18px] bg-cream-card border border-charcoal/[0.08] px-4 py-3.5 mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-charcoal">Mood check-in</p>
            <p className="text-[11.5px] text-charcoal-faint">Four short questions.</p>
          </div>
          <Button size="sm" onClick={() => setCheckInOpen(true)}>
            Start
          </Button>
        </div>
      )}

      <section className="rounded-[18px] bg-cream-card border border-charcoal/[0.08] mb-4 overflow-hidden">
        {rows.map((r, i) => (
          <div key={r.id} className={`px-4 py-3 ${i > 0 ? "border-t border-charcoal/[0.06]" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13px] font-bold text-charcoal min-w-0">{r.check}</p>
              <p className="text-[11px] text-charcoal-soft whitespace-nowrap tabular-nums">
                {showDay(lastChecked(r, { latestBpDay, markers: bloodMarkers, lastCheckIn }))}
              </p>
            </div>
            <p className="mt-0.5 text-[11.5px] text-charcoal-soft leading-[1.4]">{r.looksFor}</p>
            <p className="mt-1 text-[11.5px] text-charcoal-soft leading-[1.4]">{r.timing}</p>
          </div>
        ))}
        <p className="px-4 py-2.5 border-t border-charcoal/[0.06] text-[10.5px] text-charcoal-faint">
          Right-hand dates show when each was last checked, from your own records.
        </p>
      </section>

      {!due && (
        <button
          onClick={() => setCheckInOpen(true)}
          className="tap w-full flex items-center justify-between rounded-[18px] bg-cream-card border border-charcoal/[0.08] px-4 py-3.5 mb-4 text-left"
        >
          <span className="text-[13px] font-semibold text-charcoal">Mood check-in</span>
          <ChevronRight size={16} className="text-charcoal-faint" />
        </button>
      )}

      <WarningSignsCard id={WARNING_ID} timezone={myTimezone?.timezone ?? null} />

      <button
        onClick={() => setReminderOpen(true)}
        className="tap w-full flex items-center justify-between rounded-[18px] bg-cream-card border border-charcoal/[0.08] px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-2.5 text-[13px] font-semibold text-charcoal">
          <Bell size={16} className="text-primary-dark" />
          Set a personal reminder
        </span>
        <ChevronRight size={16} className="text-charcoal-faint" />
      </button>

      <CheckInSheet
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        onSave={(answers) => checks.addCheckIn({ date: todayLocal(), answers })}
        onShowWarningSigns={() => window.setTimeout(showWarningSigns, 250)}
      />
      <PersonalReminderSheet open={reminderOpen} onClose={() => setReminderOpen(false)} />
    </div>
  );
}

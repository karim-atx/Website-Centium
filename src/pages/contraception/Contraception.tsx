import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { MethodSetupSheet } from "../../components/contraception/MethodSetupSheet";
import { PillPack } from "../../components/contraception/PillPack";
import { ReminderSettings } from "../../components/contraception/ReminderSettings";
import {
  endPlan,
  isDevice,
  isPill,
  logEvent,
  nextEvent,
  type EventKind,
  type Method,
} from "../../services/contraception";
import * as G from "../../services/contraception/guidance";
import { ChevronLeft, Info, Plus } from "lucide-react";

// The contraception tracker.
//
// ONE CLOCK FOR THE WHOLE SCREEN, AND IT IS THE USER'S — which means this
// screen does NOT read my_contraception_status(), and that decision is the
// opposite of the cycle tracker's, so it needs its reason written down.
//
// The function computes everything from Postgres's `current_date`. That is
// UTC, and it does not read cycle_settings.timezone, so for the hours where
// the user's local date and UTC differ it answers about a different day. Two
// things went visibly wrong when this screen took it at its word, at 00:42 in
// UTC+3:
//
//   - the pack grid put the "today" ring on day 10 and the pill the user had
//     just logged on day 11, because an event is stored under the user's own
//     date;
//   - a ring inserted today came back as "Put a new ring in — in 1 day",
//     because inserted_on was in the future by the function's reckoning and
//     the modulo wrapped to the last day of the ring-free week.
//
// ./schedule.ts is pure, unit-tested against the same constraint branches, and
// computes on the date the user is actually living in, so every number here
// comes from it. The function remains the right thing for the reminder queue
// to act on; it is not yet the right thing to show somebody.
//
// The gap is the function's to close — the timezone column exists and it does
// not read it. Until it does, this screen writes the browser's zone into that
// column (see below) so the queue at least has it.
//
// EVERY SENTENCE COMES FROM services/contraception/guidance, imported as `G`,
// including the one about a missed pill — which is a pointer to the leaflet
// and a pharmacist, deliberately, and not a rules table.

const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const PILL_CHOICES: readonly EventKind[] = ["pill_taken", "pill_late", "pill_missed"];

export default function Contraception() {
  const navigate = useNavigate();
  const {
    authUserId,
    contraceptionPlan,
    contraceptionPlanLoaded,
    contraceptionEvents,
    reloadContraception,
    cycleSettings,
    saveCycleSettingsAndReload,
  } = useApp();

  const [setupOpen, setSetupOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();
  const plan = contraceptionPlan;

  // THE BROWSER'S ZONE, WRITTEN ONCE, because it is the only place that knows
  // it and the reminder queue is scheduled from it. Not a preference the user
  // picked, so it is not a setting — it is corrected whenever it is wrong, and
  // the guard keeps that to one write rather than one per render.
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const syncedZone = useRef(false);
  useEffect(() => {
    if (!cycleSettings || syncedZone.current) return;
    if (!zone || cycleSettings.timezone === zone) return;
    syncedZone.current = true;
    void saveCycleSettingsAndReload({ timezone: zone });
  }, [cycleSettings, zone, saveCycleSettingsAndReload]);

  const log = async (event: EventKind) => {
    if (!authUserId) return;
    setBusy(true);
    setError(null);
    const result = await logEvent(authUserId, plan?.id ?? null, event, today);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    reloadContraception();
  };

  // --- nothing set up yet ----------------------------------------------------
  if (contraceptionPlanLoaded && !plan) {
    return (
      <div className="animate-fade-slide-up">
        <BackRow onBack={() => navigate(-1)} />
        <Card className="text-center py-8">
          <p className="text-[15px] font-bold text-charcoal mb-1.5">{G.SETUP_TITLE}</p>
          <p className="text-[12.5px] text-charcoal-soft leading-relaxed px-2 mb-4">
            {G.SETUP_BODY}
          </p>
          <Button onClick={() => setSetupOpen(true)}>
            <Plus size={14} /> Choose a method
          </Button>
        </Card>
        <p className="mt-3 text-[10.5px] leading-[1.45] text-charcoal-faint text-center px-3">
          {G.NOT_A_PRESCRIBER}
        </p>
        <MethodSetupSheet
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
          plan={null}
          onSaved={reloadContraception}
        />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="animate-fade-slide-up">
        <BackRow onBack={() => navigate(-1)} />
        <Card className="text-center py-8">
          <p className="text-sm text-charcoal-faint">Loading…</p>
        </Card>
      </div>
    );
  }

const next = nextEvent(plan, today);

  const pillToday = contraceptionEvents.find(
    (e) => e.occurredOn === today && PILL_CHOICES.includes(e.event)
  );

  return (
    <div className="animate-fade-slide-up">
      <BackRow onBack={() => navigate(-1)} />

      {error && (
        <p className="mb-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {error}
        </p>
      )}

      <Card className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-charcoal">{G.METHOD_LABEL[plan.method]}</p>
          <p className="text-[11px] text-charcoal-faint">
            Since{" "}
            {new Date(`${plan.startedOn}T00:00:00`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={() => setSetupOpen(true)}
          className="tap shrink-0 text-[11.5px] font-semibold text-primary-dark"
        >
          {G.CHANGE_METHOD}
        </button>
      </Card>

      {/* --- the pill --------------------------------------------------- */}
      {isPill(plan.method) && (
        <>
          <Card className="mb-3">
            <p className="text-[11px] font-bold text-charcoal mb-2.5">{G.PACK_TITLE}</p>
            <PillPack plan={plan} today={today} events={contraceptionEvents} />
            <p className="mt-2.5 text-[10px] text-charcoal-faint">{G.PACK_LEGEND}</p>
          </Card>

          <Card className="mb-3">
            <p className="text-[11px] font-bold text-charcoal mb-2">{G.TODAY_TITLE}</p>
            <div className="flex gap-2">
              {PILL_CHOICES.map((e) => {
                const on = pillToday?.event === e;
                return (
                  <button
                    key={e}
                    disabled={busy}
                    onClick={() => void log(e)}
                    className={`tap flex-1 rounded-xl py-2.5 text-[12px] font-semibold disabled:opacity-50 ${
                      on ? "bg-primary text-white" : "bg-cream-soft text-charcoal-soft"
                    }`}
                  >
                    {G.EVENT_LABEL[e]}
                  </button>
                );
              })}
            </div>
            {!pillToday && (
              <p className="mt-2 text-[10.5px] text-charcoal-faint">{G.TODAY_UNLOGGED}</p>
            )}
          </Card>

          {/* THE ONLY THING THIS APP SAYS ABOUT A MISSED PILL. Shown once the
              user marks one missed or late — not as a general warning, and
              never followed by rules of its own. */}
          {(pillToday?.event === "pill_missed" || pillToday?.event === "pill_late") && (
            <Card className="mb-3">
              <div className="flex gap-2.5">
                <Info size={15} className="text-primary-dark shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-charcoal">{G.MISSED_PILL_TITLE}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-charcoal-soft">
                    {G.MISSED_PILL_BODY}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* --- everything with a next date -------------------------------- */}
      {next && (
        <Card className="mb-3">
          <p className="text-[11px] font-bold text-charcoal mb-1">{G.NEXT_TITLE}</p>
          <p className="text-[14px] font-extrabold text-charcoal">{next.label}</p>
          <p className="text-[11.5px] text-charcoal-soft">
            {new Date(`${next.date}T00:00:00`).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {" · "}
            {next.daysUntil === 0
              ? G.NEXT_TODAY
              : next.daysUntil < 0
                ? G.NEXT_OVERDUE(Math.abs(next.daysUntil))
                : G.NEXT_IN(next.daysUntil)}
          </p>
          {isDevice(plan.method) && (
            <p className="mt-1.5 text-[10.5px] leading-[1.45] text-charcoal-faint">
              {G.DEVICE_NOTE}
            </p>
          )}

          {/* Logging what actually happened, for the methods that have events. */}
          {!isPill(plan.method) && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {eventsFor(plan.method).map((e) => (
                <button
                  key={e}
                  disabled={busy}
                  onClick={() => void log(e)}
                  className="tap rounded-full bg-cream-soft px-3 py-1.5 text-[11.5px] font-semibold text-charcoal-soft disabled:opacity-50"
                >
                  {G.EVENT_LABEL[e]}
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* --- reminders --------------------------------------------------- */}
      <ReminderSettings plan={plan} />

      {/* --- history ----------------------------------------------------- */}
      <Card className="mb-3">
        <p className="text-[11px] font-bold text-charcoal mb-2">{G.HISTORY_TITLE}</p>
        {contraceptionEvents.length === 0 ? (
          <p className="text-[11.5px] text-charcoal-soft">{G.HISTORY_EMPTY}</p>
        ) : (
          <div className="space-y-1">
            {contraceptionEvents.slice(0, 30).map((e) => (
              <div key={e.id} className="flex items-center justify-between text-[11.5px]">
                <span className="text-charcoal-soft">
                  {new Date(`${e.occurredOn}T00:00:00`).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="font-semibold text-charcoal">{G.EVENT_LABEL[e.event]}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <button
        onClick={() => setStopOpen(true)}
        className="tap w-full py-3 text-[12.5px] font-semibold text-status-high"
      >
        {G.STOP_TITLE}
      </button>

      <MethodSetupSheet
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        plan={plan}
        onSaved={reloadContraception}
      />

      <BottomSheet open={stopOpen} onClose={() => setStopOpen(false)} title={G.STOP_TITLE}>
        <div className="animate-fade-slide-up">
          <p className="text-[12px] leading-relaxed text-charcoal-soft mb-4">{G.STOP_BODY}</p>
          <div className="flex gap-2">
            <Button fullWidth variant="secondary" onClick={() => setStopOpen(false)}>
              Keep tracking
            </Button>
            <Button
              fullWidth
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const result = await endPlan(plan.id, today);
                setBusy(false);
                setStopOpen(false);
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                reloadContraception();
              }}
            >
              {G.STOP_CONFIRM}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

/** The events worth offering for a method. Pills have their own row above. */
function eventsFor(method: Method): EventKind[] {
  switch (method) {
    case "ring":
      return ["ring_inserted", "ring_removed"];
    case "patch":
      return ["patch_applied", "patch_removed"];
    case "injection":
      return ["injection_given"];
    case "implant":
    case "iud_hormonal":
    case "iud_copper":
      return ["device_inserted", "device_removed"];
    default:
      return [];
  }
}

function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="tap flex items-center gap-1 mb-2 text-[12px] font-semibold text-charcoal-soft"
    >
      <ChevronLeft size={15} /> Back
    </button>
  );
}

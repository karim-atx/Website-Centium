import React, { useState } from "react";
import { CalendarClock, CircleDot, Pill, Shield, Square, Syringe, type LucideIcon } from "lucide-react";
import { FixedHeader } from "../../components/ui/FixedHeader";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { Toast } from "../../components/ui/Toast";
import { useApp } from "../../context/AppContext";
import { MethodSetupSheet } from "../../components/contraception/MethodSetupSheet";
import { PillPack } from "../../components/contraception/PillPack";
import { ReminderSettings } from "../../components/contraception/ReminderSettings";
import { endPlan, isDevice, isPill, logEvent, type EventKind, type Method } from "../../services/contraception";
import * as G from "../../services/contraception/guidance";
import { useBack } from "../../hooks/useBack";
import { clock12 } from "../../utils/time12";
import {
  CycleHelp,
  CycleRow,
  CycleSection,
  CycleTitleRow,
  OptionButton,
  PopupButtons,
  Skeleton,
  rowRule,
  type,
  useCycleMode,
} from "../../components/cycle/cycleUi";
import { appLocale } from "../../i18n/format";
import { getLanguage, t } from "../../i18n/core";

// HE1.10.b.2, the contraception tracker, in the open Settings layout.
//
// ONE SOURCE OF TRUTH FOR TODAY, AND IT IS `my_contraception_status()`.
// The pack day, the pack phase, whether today's pill is logged and what comes
// next are all its answers, shown as they stand (Database-Atraxia
// 20260925010000 made it compute on the user's own date via cycle_today()).
// schedule.ts keeps only the pack GRID, which the function does not return.
//
// EVERY SENTENCE COMES FROM services/contraception/guidance, imported as `G`,
// including the one about a missed pill, which is a pointer to the leaflet
// and a pharmacist, deliberately, and not a rules table. That box shows only
// once the user marks the day Missed or Late (V6-15), never as a general
// warning.
//
// Back pops; with nothing to pop it goes to Cycle tracking › Settings
// (HE1.10.b, V6-79).

const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const PILL_CHOICES: readonly EventKind[] = ["pill_taken", "pill_late", "pill_missed"];

/** The tile glyph per method (#8: Pill for pills; the others UNSPECIFIED, proposal recorded). */
const METHOD_ICON = (m: Method): LucideIcon =>
  isPill(m) ? Pill : m === "ring" ? CircleDot : m === "patch" ? Square : m === "injection" ? Syringe : isDevice(m) ? Shield : Pill;

/** "Sep 25, 2026". */
const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  if (getLanguage() === "ar") return d.toLocaleDateString(appLocale(), { month: "short", day: "numeric", year: "numeric" });
  return `${d.toLocaleDateString(appLocale("en-US"), { month: "short" })} ${d.getDate()}, ${d.getFullYear()}`;
};
/** "Mon, Oct 5". */
const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(appLocale("en-US"), { weekday: "short", month: "short", day: "numeric" });
};

export default function Contraception() {
  const back = useBack("/app/cycle?tab=settings");
  const { authUserId, contraceptionPlan, contraceptionPlanLoaded, contraceptionStatus, contraceptionEvents, reloadContraception, reloadCycle } = useApp();
  const { dark, hc } = useCycleMode();

  const [setupOpen, setSetupOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const today = todayISO();
  /** The pack day being logged: today unless a past pack day was tapped (S2). */
  const [logDay, setLogDay] = useState<string>(today);
  const plan = contraceptionPlan;

  /**
   * A PLAN CHANGE RELOADS THE CYCLE TOO: my_cycle_prediction() asks
   * contraception_is_hormonal(), so starting or stopping a pill changes the
   * overview's phase, fertile window and hormone illustration.
   */
  const planChanged = () => {
    reloadContraception();
    reloadCycle();
  };

  const log = async (event: EventKind) => {
    if (!authUserId) return;
    setBusy(true);
    const result = await logEvent(authUserId, plan?.id ?? null, event, logDay, logDay === today ? { occurredAt: new Date().toISOString() } : undefined);
    setBusy(false);
    if (!result.ok) {
      // K5: log fails → toast (handover shared state).
      setToast(G.SAVE_FAILED);
      return;
    }
    reloadContraception();
  };

  const header = (
    <FixedHeader paddingBottom={10}>
      <CycleTitleRow title={G.PAGE_TITLE} onBack={back} sub />
    </FixedHeader>
  );

  const page = (children: React.ReactNode) => (
    <div className="animate-fade-slide-up" style={{ paddingBottom: 96 }} data-contraception-page="">
      {header}
      {children}
      <MethodSetupSheet open={setupOpen} onClose={() => setSetupOpen(false)} plan={plan ?? null} onSaved={planChanged} />
      <Toast open={toast !== null} message={toast ? t(toast) : ""} onExpire={() => setToast(null)} />
    </div>
  );

  // --- nothing set up yet (K3) -----------------------------------------------
  if (contraceptionPlanLoaded && !plan) {
    return page(
      <>
        <CycleSection label={G.YOUR_METHOD} style={{ marginTop: 8.5 }}>
          <CycleRow icon={Pill} title={G.SETUP_TITLE} subtitle={G.SETUP_BODY} onClick={() => setSetupOpen(true)} last />
        </CycleSection>
        <p className="text-center text-charcoal-faint" style={type(10.5, 15.8, 400, { marginTop: 12 })}>
          {G.NOT_A_PRESCRIBER}
        </p>
      </>
    );
  }

  // --- loading (O1): the grid as skeletons -----------------------------------
  if (!plan) {
    return page(
      <div aria-busy="true" aria-label={t("Loading")} style={{ marginTop: 20 }}>
        <Skeleton width="60%" height={14} />
        <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", rowGap: 8, marginTop: 20 }}>
          {Array.from({ length: 28 }, (_, i) => (
            <span key={i} className="flex justify-center">
              <Skeleton width={24} height={24} radius={12} />
            </span>
          ))}
        </div>
      </div>
    );
  }

  // THE FUNCTION'S ANSWER, LABEL AND ALL: no second opinion is computed.
  const next = contraceptionStatus?.nextEventOn
    ? {
        label: G.NEXT_KIND_LABEL[contraceptionStatus.nextEventKind ?? ""] ?? G.NEXT_TITLE,
        date: contraceptionStatus.nextEventOn,
        daysUntil: contraceptionStatus.daysUntil ?? 0,
      }
    : null;

  // WHICH of the three, which the function does not say: the row itself.
  const pillOnDay = contraceptionEvents.find((e) => e.occurredOn === logDay && PILL_CHOICES.includes(e.event));

  return page(
    <>
      <CycleSection label={G.YOUR_METHOD} style={{ marginTop: 8.5 }}>
        <CycleRow
          icon={METHOD_ICON(plan.method)}
          title={G.METHOD_LABEL[plan.method]}
          subtitle={G.STARTED_ON(shortDate(plan.startedOn))}
          trailing={
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              className="tap shrink-0 text-primary-dark text-end"
              style={{ maxWidth: 101, minHeight: 44, ...type(13, 19.5, 700) }}
            >
              {G.CHANGE_METHOD}
            </button>
          }
          last
        />
      </CycleSection>

      {/* --- the pill --------------------------------------------------- */}
      {isPill(plan.method) && (
        <>
          <CycleSection label={G.PACK_TITLE} style={{ marginTop: 32 }}>
            <div style={{ marginTop: 8 }}>
              <PillPack
                plan={plan}
                today={today}
                packDay={contraceptionStatus?.packDay ?? null}
                events={contraceptionEvents}
                selected={logDay}
                onSelectDay={(d) => setLogDay(d === logDay ? today : d)}
              />
            </div>
            <CycleHelp style={{ marginTop: 2 }}>{G.PACK_LEGEND}</CycleHelp>
          </CycleSection>

          <CycleSection label={logDay === today ? G.TODAY_TITLE : dayLabel(logDay)} style={{ marginTop: 32 }}>
            <div className="flex items-center" style={{ gap: 8, marginTop: 12 }}>
              <p className="flex-1 min-w-0 text-charcoal-soft" style={type(13.5, 20.3, 400)}>
                {!pillOnDay ? G.TODAY_UNLOGGED : null}
              </p>
              <div className="flex shrink-0" role="radiogroup" aria-label={logDay === today ? G.TODAY_TITLE : dayLabel(logDay)} style={{ gap: 6 }}>
                {PILL_CHOICES.map((e) => (
                  <OptionButton key={e} role="radio" size="sheet" selected={pillOnDay?.event === e} disabled={busy} onClick={() => void log(e)} style={{ minHeight: 34 }}>
                    {G.EVENT_LABEL[e]}
                  </OptionButton>
                ))}
              </div>
            </div>
            {/* THE ONLY THING THIS APP SAYS ABOUT A MISSED PILL (#22-#24). */}
            {(pillOnDay?.event === "pill_missed" || pillOnDay?.event === "pill_late") && (
              <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 14, background: dark ? "rgb(169 145 254 / 0.12)" : "rgb(var(--c-fill-pinned) / 0.12)" }}>
                <p className="text-charcoal" style={type(13, 19.5, 700)}>
                  {G.MISSED_PILL_TITLE}
                </p>
                <p className="text-charcoal-soft" style={type(12, 18, 400, { marginTop: 2 })}>
                  {G.MISSED_PILL_BODY}
                </p>
              </div>
            )}
          </CycleSection>
        </>
      )}

      {/* --- everything with a next date (K1) ----------------------------- */}
      {next && (
        <CycleSection label={G.NEXT_TITLE} style={{ marginTop: 32 }}>
          <CycleRow
            icon={CalendarClock}
            title={next.label}
            subtitle={`${dayLabel(next.date)} ${new Date(`${next.date}T00:00:00`).getFullYear()} · ${
              next.daysUntil === 0 ? G.NEXT_TODAY : next.daysUntil < 0 ? G.NEXT_OVERDUE(Math.abs(next.daysUntil)) : G.NEXT_IN(next.daysUntil)
            }`}
            last
          />
          {isDevice(plan.method) && <CycleHelp>{G.DEVICE_NOTE}</CycleHelp>}
          {!isPill(plan.method) && eventsFor(plan.method).length > 0 && (
            <div className="flex flex-wrap" style={{ gap: 6, marginTop: 10 }}>
              {eventsFor(plan.method).map((e) => (
                <OptionButton key={e} size="sheet" selected={false} disabled={busy} onClick={() => void log(e)}>
                  {G.EVENT_LABEL[e]}
                </OptionButton>
              ))}
            </div>
          )}
        </CycleSection>
      )}

      {/* --- reminders --------------------------------------------------- */}
      <ReminderSettings plan={plan} onError={(m) => setToast(m)} />

      {/* --- history ----------------------------------------------------- */}
      <CycleSection label={G.HISTORY_TITLE} style={{ marginTop: 32 }}>
        {contraceptionEvents.length === 0 ? (
          <CycleHelp style={{ marginTop: 12 }}>{G.HISTORY_EMPTY}</CycleHelp>
        ) : (
          <ul>
            {contraceptionEvents.slice(0, 30).map((e, i, all) => (
              <li key={e.id} className="relative flex items-center" style={{ gap: 14, padding: "12px 0" }}>
                <span className="flex-1 min-w-0 text-charcoal" style={type(14, 19, 600)}>
                  {G.EVENT_LABEL[e.event]}
                </span>
                <span className="shrink-0 text-charcoal-faint" style={type(12, 18, 400)}>
                  {dayLabel(e.occurredOn)}
                  {e.occurredAt ? ` · ${clock12(e.occurredAt)}` : ""}
                </span>
                {i < all.length - 1 && (
                  <span aria-hidden className="absolute bottom-0 end-0" style={{ insetInlineStart: 50, height: 1, background: rowRule(hc) }} />
                )}
              </li>
            ))}
          </ul>
        )}
      </CycleSection>

      <button
        type="button"
        onClick={() => setStopOpen(true)}
        className="tap w-full text-status-high"
        style={{ marginTop: 22, minHeight: 44, ...type(13, 19.5, 700) }}
      >
        {G.STOP_TITLE}
      </button>
      <p className="text-center text-charcoal-faint" style={type(10.5, 15.8, 400, { marginTop: 12 })}>
        {G.NOT_A_PRESCRIBER}
      </p>

      {/* OURS-contraception-stop-confirm: centred popup (342 r22 pad 20, our
          own popups' shared rule X-01), the repo STOP_* copy verbatim; Keep /
          Stop tracking (#C0392B). A failure stays in the popup. */}
      <CentredPopup
        open={stopOpen}
        onClose={() => {
          if (!busy) {
            setStopOpen(false);
            setStopError(null);
          }
        }}
        title={G.STOP_TITLE}
        geometry="ours"
        align="start"
      >
        <p className="text-charcoal-soft" style={type(13, 19.5, 400, { marginTop: -6 })}>
          {G.STOP_BODY}
        </p>
        {stopError && (
          <p role="alert" className="text-status-high" style={type(11.5, 17.3, 600, { marginTop: 10 })}>
            {stopError}
          </p>
        )}
        <div style={{ marginTop: 16 }}>
          <PopupButtons
            cancel={G.STOP_KEEP}
            onCancel={() => {
              setStopOpen(false);
              setStopError(null);
            }}
            confirm={G.STOP_CONFIRM}
            destructive
            busy={busy}
            onConfirm={async () => {
              setBusy(true);
              setStopError(null);
              const result = await endPlan(plan.id, today);
              setBusy(false);
              if (!result.ok) {
                setStopError(G.SAVE_FAILED);
                return;
              }
              setStopOpen(false);
              planChanged();
            }}
          />
        </div>
      </CentredPopup>
    </>
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
